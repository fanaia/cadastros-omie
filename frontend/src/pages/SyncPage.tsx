import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useOonApi } from "@oondemand/oon-core-front/hooks";
import { Badge, Button, Card, Empty, Field, Notice, Page, errorMessage, toneFor } from "../components/Ui";
import type { ConnectionConfig, SyncRun } from "../types";

const ENTITIES = [
  { id: "partners", label: "Clientes e fornecedores" },
  { id: "categories", label: "Categorias" },
  { id: "departments", label: "Departamentos" },
  { id: "projects", label: "Projetos" },
];
const OUTCOME_LABELS: Record<string, string> = {
  not_tested: "Não executada",
  success: "Concluída",
  partial: "Parcial",
  failure: "Falhou",
};
type Bootstrap = {
  requirements: Array<{ name: string; configured: boolean; detail: string }>;
  configurations: ConnectionConfig[];
};

export function SyncPage() {
  const { http } = useOonApi();
  const [data, setData] = useState<Bootstrap | null>(null);
  const [pairingCode, setPairingCode] = useState("");
  const [entities, setEntities] = useState(ENTITIES.map(item => item.id));
  const [pageSize, setPageSize] = useState(50);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const load = useCallback(async () => {
    setData((await http.get<Bootstrap>("/cadastros/bootstrap")).data);
  }, [http]);
  useEffect(() => {
    void load().catch(reason => setNotice({ tone: "error", text: errorMessage(reason) }));
  }, [load]);

  async function bind(event: FormEvent) {
    event.preventDefault();
    setBusy("bind");
    setNotice(null);
    try {
      const response = await http.put<{ binding: { connectionId: string }; message: string }>(
        "/cadastros/resolver-bindings",
        { pairingCode },
      );
      await http.put("/cadastros/bootstrap", {
        connectionId: response.data.binding.connectionId,
        entities,
        sampleSize: pageSize,
      });
      setPairingCode("");
      await load();
      setNotice({ tone: "success", text: response.data.message + " A base está pronta para a primeira sincronização." });
    } catch (reason) {
      setNotice({ tone: "error", text: errorMessage(reason) });
    } finally {
      setBusy("");
    }
  }
  async function run(id: string) {
    setBusy(id);
    setNotice(null);
    try {
      const result = (await http.post<SyncRun>("/cadastros/sync/run", { connectionId: id })).data;
      await load();
      const failures = result.results.filter(item => !item.ok);
      const detail = failures.length
        ? " Falhas: " + failures.map(item => item.entity + " (" + (item.code || "SYNC_FAILED") + ")").join(", ") + "."
        : "";
      setNotice({
        tone: result.outcome === "success" ? "success" : result.outcome === "partial" ? "info" : "error",
        text: result.summary + "." + detail + " Protocolo " + result.correlationId + ".",
      });
    } catch (reason) {
      setNotice({ tone: "error", text: errorMessage(reason) });
    } finally {
      setBusy("");
    }
  }

  return <Page
    eyebrow="Central de sincronização"
    title="Controle explícito por base"
    description="Vincule uma base autorizada por Configurações Omie e acompanhe o resultado real de cada cadastro."
  >
    {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
    <div className="oon-grid">
      <Card className="oon-span-8" title="Bases configuradas" description="Cada execução informa sucesso, falha ou resultado parcial por entidade.">
        {!data?.configurations.length
          ? <Empty title="Nenhuma base vinculada" description="Gere o código em Configurações Omie e use o formulário ao lado." />
          : <div className="oon-list">{data.configurations.map(row => {
              const failed = (row.lastResults || []).filter(item => !item.ok);
              return <article className="oon-list-item" key={row.connectionId}>
                <div>
                  <strong>{row.connectionId}</strong>
                  <small>{row.entities.join(" • ")}</small>
                  <small>{row.bindingConfigured ? "Vínculo protegido configurado" : "Vínculo pendente"}</small>
                  {failed.length > 0 && <small>{failed.map(item => item.entity + ": " + (item.code || "SYNC_FAILED")).join(" • ")}</small>}
                </div>
                <Badge tone={toneFor(row.lastSyncOutcome)}>{OUTCOME_LABELS[row.lastSyncOutcome] || row.lastSyncOutcome}</Badge>
                <div>
                  <small>Última execução</small>
                  <strong>{row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString("pt-BR") : "Nunca"}</strong>
                  {row.lastCorrelationId && <small>Protocolo {row.lastCorrelationId}</small>}
                </div>
                <Button disabled={!row.bindingConfigured} busy={busy === row.connectionId} onClick={() => run(row.connectionId)}>Sincronizar</Button>
              </article>;
            })}</div>}
      </Card>
      <Card className="oon-span-4" title="Vincular Configurações Omie" description="Gere o código na aba Consumidores do módulo Configurações.">
        <form onSubmit={bind}>
          <Field label="Código de vínculo" hint="O segredo será cifrado e removido das respostas seguintes.">
            <textarea required rows={5} value={pairingCode} onChange={event => setPairingCode(event.target.value)} placeholder='{"schemaVersion":1,...}' />
          </Field>
          <Field label="Registros por página">
            <input type="number" min={1} max={100} value={pageSize} onChange={event => setPageSize(Number(event.target.value))} />
          </Field>
          <div className="oon-checks">{ENTITIES.map(item => <label className="oon-check" key={item.id}>
            <input type="checkbox" checked={entities.includes(item.id)} onChange={event => setEntities(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} /> {item.label}
          </label>)}</div>
          <Button type="submit" busy={busy === "bind"} disabled={!entities.length || !pairingCode.trim()}>Vincular base</Button>
        </form>
      </Card>
    </div>
    <Card title="Pré-requisitos do ambiente">
      <div className="oon-checks">{data?.requirements.map(item => <article className="oon-check" key={item.name}>
        <Badge tone={item.configured ? "success" : "danger"}>{item.configured ? "Configurado" : "Pendente"}</Badge>
        <strong>{item.name}</strong>
        <p>{item.detail}</p>
      </article>)}</div>
    </Card>
  </Page>;
}
