import express, { Request, Response } from "express";
import { Connection, PublicKey } from "@solana/web3.js";
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

const PORT = parseInt(process.env.PORT || "3002");
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const STABLECOIN_PROGRAM_ID = process.env.STABLECOIN_PROGRAM_ID || "2N19eMKD2xGpjNzfktVCPnkrbGJZAzuDFoH7SJtQiNm9";
const TRANSFER_HOOK_PROGRAM_ID = process.env.TRANSFER_HOOK_PROGRAM_ID || "PQgUt1swYzA9RSAG7gpyTQpk9TtbVReX11ytkeYTJBo";
const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:3004";

const connection = new Connection(RPC_URL, "confirmed");

interface ParsedEvent {
  type: string;
  data: Record<string, unknown>;
  slot: number;
  timestamp: number;
  programId: string;
  signature?: string;
}

const eventCache: ParsedEvent[] = [];
const MAX_CACHE_SIZE = 1000;

app.use(express.json());

async function parseInstruction(
  programId: string,
  data: Buffer
): Promise<ParsedEvent | null> {
  const discriminator = data.slice(0, 8);

  if (programId === STABLECOIN_PROGRAM_ID) {
    if (discriminator.toString("hex") === "5d3c6d2a4c8e4e4a") {
      return { type: "Initialize", data: {}, slot: 0, timestamp: Date.now(), programId };
    }
    if (discriminator.toString("hex") === "6cfbc0f69cca0e8b") {
      return { type: "Mint", data: { amount: "N/A" }, slot: 0, timestamp: Date.now(), programId };
    }
    if (discriminator.toString("hex") === "3fc686d4a0f92cb6") {
      return { type: "Burn", data: {}, slot: 0, timestamp: Date.now(), programId };
    }
    if (discriminator.toString("hex") === "aa1dc7c912be90d5") {
      return { type: "FreezeAccount", data: {}, slot: 0, timestamp: Date.now(), programId };
    }
    if (discriminator.toString("hex") === "b442eb9ccca19c1e") {
      return { type: "ThawAccount", data: {}, slot: 0, timestamp: Date.now(), programId };
    }
    if (discriminator.toString("hex") === "b5acb3b23d7ecb7e") {
      return { type: "Pause", data: {}, slot: 0, timestamp: Date.now(), programId };
    }
    if (discriminator.toString("hex") === "d0caf47bcc0fc3dc") {
      return { type: "Unpause", data: {}, slot: 0, timestamp: Date.now(), programId };
    }
    if (discriminator.toString("hex") === "7c6a7e5bc5c9b7f0") {
      return { type: "AddToBlacklist", data: {}, slot: 0, timestamp: Date.now(), programId };
    }
    if (discriminator.toString("hex") === "5bea6d5de3e0a6c8") {
      return { type: "RemoveFromBlacklist", data: {}, slot: 0, timestamp: Date.now(), programId };
    }
    if (discriminator.toString("hex") === "7a243126ba91b26d") {
      return { type: "Seize", data: {}, slot: 0, timestamp: Date.now(), programId };
    }
  }

  if (programId === TRANSFER_HOOK_PROGRAM_ID) {
    if (discriminator.toString("hex") === "a12a4b1c4c5d9e3f") {
      return { type: "TransferHookExecute", data: {}, slot: 0, timestamp: Date.now(), programId };
    }
  }

  return null;
}

const onLogsCallback = async (logs: any, ctx: any) => {
  try {
    const { logs: logMessages, signature, slot } = logs;

    for (const log of logMessages) {
      const programMatch = log.match(/Program (\w+) invoke/);
      if (programMatch) {
        const programId = programMatch[1];
        if (programId === STABLECOIN_PROGRAM_ID || programId === TRANSFER_HOOK_PROGRAM_ID) {
          logger.info({
            msg: "Program invoked",
            programId,
            signature,
            slot,
          });
        }
      }
    }

    const parsed = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (parsed?.meta?.innerInstructions) {
      for (const inner of parsed.meta.innerInstructions) {
        for (const inst of inner.instructions) {
          if ("programId" in inst && "data" in inst) {
            const programId = inst.programId.toString();
            const data = Buffer.from(inst.data, "base64");
            const event = await parseInstruction(programId, data);

            if (event) {
              event.signature = signature;
              event.slot = slot;
              eventCache.push(event);

              if (eventCache.length > MAX_CACHE_SIZE) {
                eventCache.shift();
              }

              logger.info({
                msg: "Event parsed",
                type: event.type,
                signature,
                slot,
              });

              await deliverWebhook(event);
            }
          }
        }
      }
    }
  } catch (error) {
    logger.error({ err: error, msg: "Error processing logs" });
  }
}

async function deliverWebhook(event: ParsedEvent): Promise<void> {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      logger.warn({
        msg: "Webhook delivery failed",
        status: response.status,
        eventType: event.type,
      });
    }
  } catch (error) {
    logger.error({ err: error, msg: "Webhook delivery error" });
  }
}

let subscriptionId: number | null = null;

async function startIndexing(): Promise<void> {
  logger.info({ msg: "Starting indexer", programs: [STABLECOIN_PROGRAM_ID, TRANSFER_HOOK_PROGRAM_ID] });

  subscriptionId = connection.onLogs(
    [
      new PublicKey(STABLECOIN_PROGRAM_ID),
      new PublicKey(TRANSFER_HOOK_PROGRAM_ID),
    ],
    onLogsCallback,
    "confirmed"
  );

  logger.info({ msg: "Indexer started", subscriptionId });
}

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "indexer",
    subscriptionId,
    eventCount: eventCache.length,
    timestamp: new Date().toISOString(),
  });
});

app.get("/events", (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const type = req.query.type as string | undefined;

  let events = [...eventCache].reverse();

  if (type) {
    events = events.filter(e => e.type === type);
  }

  res.json({
    events: events.slice(offset, offset + limit),
    total: events.length,
    limit,
    offset,
    timestamp: new Date().toISOString(),
  });
});

app.get("/events/:type", (req: Request, res: Response) => {
  const { type } = req.params;
  const events = eventCache.filter(e => e.type === type);

  res.json({
    type,
    count: events.length,
    events,
    timestamp: new Date().toISOString(),
  });
});

app.post("/webhooks/register", (req: Request, res: Response) => {
  logger.info({ msg: "Webhook registration requested", body: req.body });
  res.json({
    success: true,
    message: "Use external webhook service to register",
  });
});

app.listen(PORT, () => {
  logger.info({ msg: "Indexer service started", port: PORT });
  startIndexing().catch(err => logger.error({ err, msg: "Failed to start indexer" }));
});

export default app;
