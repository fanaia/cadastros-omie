export type ConnectionConfig = { connectionId: string; entities: string[]; sampleSize: number; lastSyncAt?: string; lastSyncOutcome: string; lastCorrelationId?: string; lastSyncSummary?: string };
export type Overview = {
  ready: boolean;
  totals: { partners: number; categories: number; departments: number; projects: number; errors: number };
  connections: ConnectionConfig[];
  recentErrors: Array<{ entity: string; name: string; connectionId: string; code?: string }>;
};
export type Partner = { _id: string; omieConnectionId: string; externalId: string; integrationCode?: string; legalName: string; tradeName?: string; documentMasked?: string; email?: string; phone?: string; isCustomer: boolean; isSupplier: boolean; active: boolean; syncState: string; syncedAt?: string; lastErrorCode?: string };
export type Auxiliary = { _id: string; omieConnectionId: string; externalId: string; name?: string; description?: string; nature?: string; categoryType?: string; active: boolean; syncState: string; syncedAt?: string };
export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };
