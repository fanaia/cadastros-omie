import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useOonApi } from "@oondemand/oon-core-front";

type Requirement = { name: string; configured: boolean; detail: string };
type EntityOption = { id: string; label: string };
type Configuration = {
  connectionId: string;
  entities: string[];
  sampleSize: number;
  lastTestAt?: string;
  lastTestOutcome: string;
  lastCorrelationId?: string;
  lastTestSummary?: string;
};
type Bootstrap = {
  requirements: Requirement[];
  ready: boolean;
  configuration: Configuration | null;
  availableEntities: EntityOption[];
  configurationService: { url: string | null; appInstanceId: string | null; environment: string | null };
};
type TestResult = { entity: string; label: string; ok: boolean; count?: number; durationMs?: number; code?: string; message?: string };

const colors = { ink: "#172033", muted: "#617083", line: "#dfe5ec", canvas: "#f5f7fa", blue: "#155eef", green: "#137a4b", amber: "#9a6700", red: "#b42318" };
const card: CSSProperties = { background: "#fff", border: `1px solid ${colors.line}`, borderRadius: 16, padding: 22, boxShadow: "0 8px 24px rgba(23,32,51,.06)" };
const input: CSSProperties = { width: "100%", border: "1px solid #c7d0dc", borderRadius: 10, padding: "11px 12px", color: colors.ink, background: "#fff", fontSize: 15 };

function messageFrom(error: unknown) {
  const candidate = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
  return candidate.response?.data?.error?.message || candidate.message || "Não foi possível concluir a operação.";
}

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: ok ? colors.green : colors.amber, fontWeight: 750, fontSize: 13 }}><span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 99, background: ok ? "#27ae72" : "#f2b84b" }} />{children}</span>;
}

function Button({ secondary = false, busy = false, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean; busy?: boolean }) {
  return <button {...props} disabled={busy || props.disabled} style={{ border: secondary ? `1px solid ${colors.line}` : 0, borderRadius: 10, padding: "11px 16px", background: secondary ? "#fff" : colors.blue, color: secondary ? colors.ink : "#fff", fontWeight: 750, cursor: busy || props.disabled ? "not-allowed" : "pointer", opacity: busy || props.disabled ? .65 : 1 }}>{busy ? "Processando…" : children}</button>;
}

export function CadastrosInitializationPage() {
  const { http } = useOonApi();
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [connectionId, setConnectionId] = useState("");
  const [entities, setEntities] = useState<string[]>([]);
  const [sampleSize, setSampleSize] = useState(10);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const applyBootstrap = useCallback((data: Bootstrap) => {
    setBootstrap(data);
    if (data.configuration) {
      setConnectionId(data.configuration.connectionId);
      setEntities(data.configuration.entities);
      setSampleSize(data.configuration.sampleSize);
    } else if (!entities.length) {
      setEntities(data.availableEntities.map((item) => item.id));
    }
  }, [entities.length]);

  const load = useCallback(async () => {
    try { const { data } = await http.get<Bootstrap>("/cadastros/bootstrap"); applyBootstrap(data); }
    catch (error) { setNotice({ tone: "error", text: messageFrom(error) }); }
    finally { setLoading(false); }
  }, [applyBootstrap, http]);

  useEffect(() => { void load(); }, [load]);

  function toggleEntity(id: string) {
    setEntities((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy("save"); setNotice(null);
    try {
      const { data } = await http.put<Bootstrap>("/cadastros/bootstrap", { connectionId, entities, sampleSize });
      applyBootstrap(data);
      setNotice({ tone: "success", text: "Escopo salvo sem armazenar credenciais Omie. Execute o teste de sincronização." });
    } catch (error) { setNotice({ tone: "error", text: messageFrom(error) }); }
    finally { setBusy(null); }
  }

  async function testSync() {
    setBusy("test"); setNotice(null); setResults([]);
    try {
      const { data } = await http.post<{ ok: boolean; summary: string; correlationId: string; results: TestResult[]; bootstrap: Bootstrap }>("/cadastros/sync/test");
      setResults(data.results);
      applyBootstrap(data.bootstrap);
      setNotice({ tone: data.ok ? "success" : "error", text: `${data.summary}. Protocolo: ${data.correlationId}` });
    } catch (error) { setNotice({ tone: "error", text: messageFrom(error) }); }
    finally { setBusy(null); }
  }

  if (loading) return <div style={{ padding: 32, color: colors.muted }}>Carregando a inicialização…</div>;

  return (
    <main style={{ minHeight: "100%", background: colors.canvas, color: colors.ink, padding: "clamp(18px, 3vw, 38px)" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gap: 22 }}>
        <header style={{ ...card, color: "#fff", border: 0, background: "linear-gradient(135deg,#13305b 0%,#155eef 75%,#60a5fa 100%)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div><p style={{ margin: "0 0 8px", opacity: .78, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", fontSize: 12 }}>Cadastros Omie</p><h1 style={{ margin: 0, fontSize: "clamp(26px,4vw,40px)", lineHeight: 1.12 }}>Inicialização e teste de sincronização</h1><p style={{ margin: "12px 0 0", maxWidth: 720, opacity: .88 }}>Escolha a base, valide os cadastros em modo somente leitura e saiba exatamente o que está pronto antes da primeira sincronização.</p></div>
            <div style={{ minWidth: 190, padding: 18, borderRadius: 14, background: "rgba(255,255,255,.12)" }}><strong style={{ fontSize: 22 }}>{bootstrap?.ready ? "Pronto" : "Em preparação"}</strong><div style={{ opacity: .8, fontSize: 13 }}>estado do primeiro uso</div></div>
          </div>
        </header>

        {notice && <div role="status" style={{ ...card, padding: 16, borderColor: notice.tone === "error" ? "#f3b6b2" : "#a8dec5", color: notice.tone === "error" ? colors.red : colors.green }}>{notice.text}</div>}

        <section style={card} aria-labelledby="requirements-title">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}><div><h2 id="requirements-title" style={{ margin: 0, fontSize: 21 }}>1. Dependências entre apps</h2><p style={{ color: colors.muted, margin: "7px 0 0" }}>Cadastros recebe material efêmero no backend; o navegador nunca recebe chaves do Omie.</p></div><Status ok={Boolean(bootstrap?.requirements.every((item) => item.configured))}>{bootstrap?.requirements.every((item) => item.configured) ? "Ambiente pronto" : "Variáveis pendentes"}</Status></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 18 }}>{bootstrap?.requirements.map((item) => <div key={item.name} style={{ border: `1px solid ${colors.line}`, borderRadius: 12, padding: 14 }}><Status ok={item.configured}>{item.name}</Status><p style={{ color: colors.muted, fontSize: 13, margin: "8px 0 0" }}>{item.detail}</p></div>)}</div>
          {bootstrap?.configurationService.url && <p style={{ color: colors.muted, fontSize: 13, margin: "14px 0 0" }}>Serviço de Configurações: <code>{bootstrap.configurationService.url}</code> • ambiente <strong>{bootstrap.configurationService.environment}</strong></p>}
        </section>

        <form onSubmit={save} style={card}>
          <h2 style={{ margin: 0, fontSize: 21 }}>2. Definir o teste operacional</h2>
          <p style={{ color: colors.muted, margin: "8px 0 20px" }}>Copie o identificador exibido na Inicialização do app Configurações e escolha os cadastros que serão consultados.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            <label style={{ fontWeight: 700 }}>Identificador da conexão<input style={{ ...input, display: "block", marginTop: 7 }} value={connectionId} onChange={(event) => setConnectionId(event.target.value)} placeholder="conn_…" required /></label>
            <label style={{ fontWeight: 700 }}>Registros por amostra<input style={{ ...input, display: "block", marginTop: 7 }} type="number" min={1} max={50} value={sampleSize} onChange={(event) => setSampleSize(Number(event.target.value))} required /></label>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: "20px 0" }}><legend style={{ fontWeight: 750, marginBottom: 10 }}>Cadastros para validar</legend><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>{bootstrap?.availableEntities.map((item) => <label key={item.id} style={{ display: "flex", gap: 10, alignItems: "center", border: `1px solid ${entities.includes(item.id) ? "#8bb0f8" : colors.line}`, borderRadius: 11, padding: 13, background: entities.includes(item.id) ? "#f2f6ff" : "#fff", cursor: "pointer" }}><input type="checkbox" checked={entities.includes(item.id)} onChange={() => toggleEntity(item.id)} /> <span style={{ fontWeight: 650 }}>{item.label}</span></label>)}</div></fieldset>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Button type="submit" busy={busy === "save"}>Salvar escopo</Button><Button type="button" secondary busy={busy === "test"} disabled={!bootstrap?.configuration} onClick={testSync}>Testar sincronização</Button></div>
        </form>

        <section style={card} aria-labelledby="results-title">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}><div><h2 id="results-title" style={{ margin: 0, fontSize: 21 }}>3. Resultado por cadastro</h2><p style={{ color: colors.muted, margin: "7px 0 0" }}>O teste consulta a primeira página e não grava nenhuma projeção.</p></div><Status ok={bootstrap?.configuration?.lastTestOutcome === "success"}>{bootstrap?.configuration?.lastTestSummary || "Teste ainda não executado"}</Status></div>
          {results.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 18 }}>{results.map((result) => <article key={result.entity} style={{ border: `1px solid ${result.ok ? "#a8dec5" : "#f3b6b2"}`, borderRadius: 12, padding: 15 }}><Status ok={result.ok}>{result.ok ? "Consulta validada" : "Requer atenção"}</Status><h3 style={{ margin: "9px 0 6px", fontSize: 16 }}>{result.label}</h3>{result.ok ? <p style={{ margin: 0, color: colors.muted }}>{result.count} registro(s) na resposta • {result.durationMs} ms</p> : <p style={{ margin: 0, color: colors.red }}>{result.message} <small>{result.code}</small></p>}</article>)}</div> : <div style={{ marginTop: 18, padding: 20, borderRadius: 12, background: "#f7f9fc", color: colors.muted }}>Salve o escopo e execute o teste para visualizar saúde, quantidade e duração por cadastro.</div>}
        </section>

        <footer style={{ color: colors.muted, fontSize: 13, padding: "0 4px 12px" }}>Somente leitura • nenhuma credencial persistida neste app • integração nativa Omie desabilitada.</footer>
      </div>
    </main>
  );
}
