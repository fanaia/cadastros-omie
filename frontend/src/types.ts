export type SyncEntityResult = { entity: string; ok: boolean; count: number; code?: string };
export type SyncRun = { ok: boolean; outcome: "success" | "partial" | "failure"; summary: string; correlationId: string; results: SyncEntityResult[] };
export type ConnectionConfig = { connectionId: string; entities: string[]; sampleSize: number; bindingConfigured: boolean; lastSyncAt?: string; lastSyncOutcome: string; lastCorrelationId?: string; lastSyncSummary?: string; lastResults?: SyncEntityResult[] };
export type Overview = {
  ready: boolean;
  totals: { partners: number; categories: number; departments: number; projects: number; errors: number };
  connections: ConnectionConfig[];
  recentErrors: Array<{ entity: string; name: string; connectionId: string; code?: string; correlationId?: string }>;
};
export type Partner = { _id: string; omieConnectionId: string; externalId: string; integrationCode?: string; legalName: string; tradeName?: string; documentMasked?: string; email?: string; phone?: string; isCustomer: boolean; isSupplier: boolean; active: boolean; syncState: string; syncedAt?: string; lastErrorCode?: string };
export type Auxiliary = { _id: string; omieConnectionId: string; externalId: string; name?: string; description?: string; nature?: string; categoryType?: string; active: boolean; syncState: string; syncedAt?: string };
export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };
