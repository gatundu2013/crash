export interface ProvablyFairResultsResp {
  provablyFairOutcome: {
    clientSeedDetails: {
      seed: string;
      username: string;
    }[];
    clientSeed: string | null;
    serverSeed: string | null;
    hashedServerSeed: string | null;
    gameHash: string | null;
    rawMultiplier: number | null;
    decimal: number | null;
    finalMultiplier: number | null;
  };
  roundCount: number;
  createdAt: Date;
}
