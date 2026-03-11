import express, { Request, Response } from "express";
import pino from "pino";

const app = express();
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
    },
  },
});

const PORT = parseInt(process.env.PORT || "3004");
const MAX_RETRY_ATTEMPTS = parseInt(process.env.RETRY_MAX_ATTEMPTS || "3");
const RETRY_BACKOFF_MS = parseInt(process.env.RETRY_BACKOFF_MS || "1000");

interface WebhookRegistration {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  createdAt: string;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  payload: Record<string, unknown>;
  attempts: number;
  lastAttempt: string;
  status: "pending" | "success" | "failed";
  responseCode?: number;
}

const webhooks: Map<string, WebhookRegistration> = new Map();
const deliveries: Map<string, WebhookDelivery[]> = new Map();

app.use(express.json());

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

async function deliverWithRetry(
  registration: WebhookRegistration,
  payload: Record<string, unknown>
): Promise<{ success: boolean; attempts: number; responseCode?: number }> {
  const deliveryId = generateId();
  const delivery: WebhookDelivery = {
    id: deliveryId,
    webhookId: registration.id,
    payload,
    attempts: 0,
    lastAttempt: new Date().toISOString(),
    status: "pending",
  };

  if (!deliveries.has(registration.id)) {
    deliveries.set(registration.id, []);
  }
  deliveries.get(registration.id)!.push(delivery);

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    delivery.attempts = attempt;
    delivery.lastAttempt = new Date().toISOString();

    try {
      const response = await fetch(registration.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-ID": registration.id,
          "X-Event-ID": deliveryId,
        },
        body: JSON.stringify({
          id: deliveryId,
          timestamp: new Date().toISOString(),
          events: registration.events,
          data: payload,
        }),
      });

      delivery.responseCode = response.status;

      if (response.ok) {
        delivery.status = "success";
        logger.info({
          msg: "Webhook delivered",
          webhookId: registration.id,
          deliveryId,
          attempt,
          status: response.status,
        });
        return { success: true, attempts: attempt, responseCode: response.status };
      }

      logger.warn({
        msg: "Webhook delivery failed",
        webhookId: registration.id,
        deliveryId,
        attempt,
        status: response.status,
      });
    } catch (error) {
      logger.error({
        err: error,
        msg: "Webhook delivery error",
        webhookId: registration.id,
        deliveryId,
        attempt,
      });
    }

    if (attempt < MAX_RETRY_ATTEMPTS) {
      const backoffMs = RETRY_BACKOFF_MS * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  delivery.status = "failed";
  logger.error({
    msg: "Webhook delivery failed after all retries",
    webhookId: registration.id,
    deliveryId,
    attempts: MAX_RETRY_ATTEMPTS,
  });

  return { success: false, attempts: MAX_RETRY_ATTEMPTS };
}

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "webhook-service",
    registeredWebhooks: webhooks.size,
    timestamp: new Date().toISOString(),
  });
});

app.post("/webhooks/register", (req: Request, res: Response) => {
  const { url, events, secret } = req.body;

  if (!url || !events || !Array.isArray(events)) {
    return res.status(400).json({
      error: "url and events array required",
    });
  }

  const id = generateId();
  const registration: WebhookRegistration = {
    id,
    url,
    events,
    secret,
    createdAt: new Date().toISOString(),
  };

  webhooks.set(id, registration);

  logger.info({
    msg: "Webhook registered",
    id,
    url,
    events,
  });

  res.json({
    success: true,
    id,
    message: "Webhook registered successfully",
  });
});

app.get("/webhooks", (req: Request, res: Response) => {
  const registrations = Array.from(webhooks.values()).map(r => ({
    id: r.id,
    url: r.url,
    events: r.events,
    createdAt: r.createdAt,
  }));

  res.json({
    webhooks: registrations,
    count: registrations.length,
  });
});

app.get("/webhooks/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const registration = webhooks.get(id);

  if (!registration) {
    return res.status(404).json({ error: "Webhook not found" });
  }

  const webhookDeliveries = deliveries.get(id) || [];

  res.json({
    registration: {
      id: registration.id,
      url: registration.url,
      events: registration.events,
      createdAt: registration.createdAt,
    },
    deliveries: webhookDeliveries.slice(-50),
    deliveryCount: webhookDeliveries.length,
  });
});

app.delete("/webhooks/:id", (req: Request, res: Response) => {
  const { id } = req.params;

  if (!webhooks.has(id)) {
    return res.status(404).json({ error: "Webhook not found" });
  }

  webhooks.delete(id);
  deliveries.delete(id);

  logger.info({ msg: "Webhook deleted", id });

  res.json({ success: true, message: "Webhook deleted" });
});

app.post("/webhooks/:id/test", async (req: Request, res: Response) => {
  const { id } = req.params;
  const registration = webhooks.get(id);

  if (!registration) {
    return res.status(404).json({ error: "Webhook not found" });
  }

  const result = await deliverWithRetry(registration, {
    test: true,
    message: "This is a test webhook",
  });

  res.json({
    success: result.success,
    attempts: result.attempts,
    responseCode: result.responseCode,
  });
});

app.post("/trigger", async (req: Request, res: Response) => {
  const { eventType, payload } = req.body;

  if (!eventType || !payload) {
    return res.status(400).json({
      error: "eventType and payload required",
    });
  }

  const matchingWebhooks = Array.from(webhooks.values()).filter(w =>
    w.events.includes(eventType) || w.events.includes("*")
  );

  if (matchingWebhooks.length === 0) {
    return res.json({
      message: "No webhooks registered for this event",
      delivered: 0,
    });
  }

  const results = await Promise.all(
    matchingWebhooks.map(w => deliverWithRetry(w, payload))
  );

  const successful = results.filter(r => r.success).length;

  res.json({
    delivered: successful,
    failed: matchingWebhooks.length - successful,
    results: matchingWebhooks.map((w, i) => ({
      webhookId: w.id,
      url: w.url,
      ...results[i],
    })),
  });
});

app.listen(PORT, () => {
  logger.info({ msg: "Webhook service started", port: PORT });
});

export default app;
