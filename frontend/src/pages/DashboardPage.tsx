import { useCallback, useEffect, useState } from "react";
import { useOonApi } from "@oondemand/oon-core-front/hooks";
import { Badge, Card, Empty, Notice, Page, StatGrid, errorMessage, toneFor } from "../components/Ui";
import type { Overview } from "../types";
export function DashboardPage() {
  const { http } = useOonApi(); const [data, setData] = useState<Overview | null>(null); const [error, setError] = useState("");
  const load = useCallback(async () => { try { setData((await http.get<Overview>("/cadastros/overview")).data); } catch (reason) { setError(errorMessage(reason)); } }, [http]);
  useEffect(() => { void load(); }, [load]);
  return <Page eyebrow="Cadastros compartilhados" title="Uma visão confiável de todas as bases" description="Localize clientes, fornecedores e auxiliares com origem explícita, sincronização rastreável e o Omie como fonte de verdade.">
    {error && <Notice tone="error">{error}</Notice>}
    <StatGrid items={[{ label: "Clientes e fornecedores", value: data?.totals.partners ?? "—" }, { label: "Categorias", value: data?.totals.categories ?? "—" }, { label: "Departamentos", value: data?.totals.departments ?? "—" }, { label: "Projetos", value: data?.totals.projects ?? "—" }, { label: "Exceções", value: data?.totals.errors ?? "—", tone: data?.totals.errors ? "danger" : "success" }]} />
    <div className="oon-grid"><Card className="oon-span-8" title="Bases sincronizadas" description="Situação da última atualização por conexão.">
      {!data?.connections.length ? <Empty title="Sincronização ainda não configurada" description="Abra Sincronização e informe uma conexão autorizada." /> : <div className="oon-list">{data.connections.map(row => <article className="oon-list-item" key={row.connectionId}><div><strong>{row.connectionId}</strong><small>{row.entities.length} tipos selecionados</small></div><div><small>Resultado</small><Badge tone={toneFor(row.lastSyncOutcome)}>{row.lastSyncOutcome}</Badge></div><div><small>Última execução</small><strong>{row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString("pt-BR") : "Nunca"}</strong></div><small>{row.lastSyncSummary || "Aguardando primeira sincronização"}</small></article>)}</div>}
    </Card><Card className="oon-span-4" title="Fila de atenção" description="Registros que exigem reconciliação.">{!data?.recentErrors.length ? <Empty title="Sem exceções" description="Nenhum conflito ou erro pendente." /> : <div className="oon-list">{data.recentErrors.map((row, index) => <article key={index}><Badge tone="danger">{row.code || "Erro"}</Badge><strong>{row.name}</strong><small>{row.entity} • {row.connectionId}</small></article>)}</div>}</Card></div>
  </Page>;
}
