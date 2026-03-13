export interface KYTResponse {
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE';
  cluster: { name: string; category: string };
  screened_at: string;
}

export async function screenAddress(address: string): Promise<KYTResponse> {
  if (process.env.CHAINALYSIS_API_KEY) {
    console.log(`Screening ${address} — integration point for Chainalysis API`);
  } else {
    console.log(`Screening ${address} — stub mode. Set CHAINALYSIS_API_KEY for live screening.`);
  }

  return {
    risk: 'LOW',
    cluster: { name: 'Unknown', category: 'unidentified' },
    screened_at: new Date().toISOString()
  };
}
