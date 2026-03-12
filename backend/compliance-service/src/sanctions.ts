export interface SanctionsCheckResult {
  hit: boolean;
  listName?: string;
  details?: Record<string, unknown>;
}

const OFAC_SDN_LIST = [
  "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
  "3JucYFHKE9iB8DqmJ1cKUE1RiXjKft4LkR",
  "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
];

export class SanctionsScreener {
  private apiKey: string | undefined;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.CHAINALYSIS_API_KEY;
    this.baseUrl = process.env.CHAINALYSIS_BASE_URL || "https://api.chainalysis.com/api/kyt/v2";
  }

  async screen(address: string): Promise<SanctionsCheckResult> {
    const normalizedAddress = address.toLowerCase();

    const localHit = this.checkLocalList(normalizedAddress);
    if (localHit) {
      return {
        hit: true,
        listName: "OFAC SDN (Local)",
        details: localHit,
      };
    }

    if (this.apiKey) {
      try {
        const apiResult = await this.screenViaAPI(normalizedAddress);
        if (apiResult.hit) {
          return apiResult;
        }
      } catch (error) {
        console.error("Chainalysis API error:", error);
      }
    }

    return { hit: false };
  }

  private checkLocalList(address: string): Record<string, unknown> | null {
    if (OFAC_SDN_LIST.some(sdn => sdn.toLowerCase() === address)) {
      return {
        list: "OFAC SDN",
        matched: address,
        note: "Local stub - replace with full list in production",
      };
    }
    return null;
  }

  private async screenViaAPI(address: string): Promise<SanctionsCheckResult> {
    if (!this.apiKey) {
      return { hit: false };
    }

    try {
      const response = await fetch(`${this.baseUrl}/entities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Token: this.apiKey,
        },
        body: JSON.stringify({
          addresses: [address],
        }),
      });

      if (!response.ok) {
        throw new Error(`Chainalysis API error: ${response.status}`);
      }

      const data = await response.json() as any;
      
      const screening = data.screeningResults?.[0];
      if (screening?.risk?.score > 50 || screening?.exposure?.level !== "NONE") {
        return {
          hit: true,
          listName: "Chainalysis",
          details: {
            riskScore: screening.risk?.score,
            exposureLevel: screening.exposure?.level,
            alerts: screening.alerts,
          },
        };
      }

      return { hit: false };
    } catch (error) {
      console.error("Sanctions screening API error:", error);
      return { hit: false };
    }
  }

  async batchScreen(addresses: string[]): Promise<Map<string, SanctionsCheckResult>> {
    const results = new Map<string, SanctionsCheckResult>();

    for (const address of addresses) {
      const result = await this.screen(address);
      results.set(address, result);
    }

    return results;
  }
}

export default SanctionsScreener;
