function providerError(code, message, statusCode = 502) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

async function postJson(url, { body, headers = {}, timeoutMs = 15000, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") throw providerError("HTTP_TRANSPORT_UNAVAILABLE", "Transporte HTTP indisponível.", 503);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = providerError(payload?.error?.code || "REMOTE_HTTP_ERROR", payload?.error?.message || "O serviço remoto recusou a solicitação.", response.status >= 500 ? 502 : response.status);
      throw error;
    }
    return payload;
  } catch (error) {
    if (error.name === "AbortError") throw providerError("REMOTE_TIMEOUT", "O serviço remoto não respondeu dentro do tempo esperado.", 504);
    if (error.code) throw error;
    throw providerError("REMOTE_UNAVAILABLE", "Não foi possível comunicar com o serviço remoto.", 502);
  } finally { clearTimeout(timeout); }
}

async function omieHttpTransport({ endpoint, timeoutMs, body, correlationId, fetchImpl = globalThis.fetch }) {
  let payload;
  try {
    payload = await postJson(endpoint, {
      body,
      timeoutMs,
      fetchImpl,
      headers: correlationId ? { "x-correlation-id": correlationId } : {},
    });
  } catch (error) {
    if (error.code === "REMOTE_TIMEOUT") throw providerError("OMIE_TIMEOUT", "O Omie não respondeu dentro do tempo esperado.", 504);
    throw providerError("OMIE_HTTP_ERROR", "O Omie recusou a solicitação.", 502);
  }
  if (payload?.faultstring || payload?.faultcode) throw providerError("OMIE_API_ERROR", "O Omie não autorizou ou não conseguiu processar a operação.", 422);
  return payload;
}

module.exports = { omieHttpTransport, postJson };
