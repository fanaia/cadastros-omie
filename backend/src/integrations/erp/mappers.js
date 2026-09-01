function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function toPartnerProjection(source = {}, connectionId) {
  const taxId = digits(source.cnpj_cpf);
  return {
    omieConnectionId: connectionId,
    externalId: source.codigo_cliente_omie ?? null,
    integrationCode: source.codigo_cliente_integracao ?? null,
    legalName: source.razao_social ?? null,
    tradeName: source.nome_fantasia ?? null,
    documentLast4: taxId.slice(-4),
    active: source.inativo !== "S",
  };
}

function toProjectProjection(source = {}, connectionId) {
  return {
    omieConnectionId: connectionId,
    externalId: source.codigo ?? source.codigo_projeto ?? null,
    integrationCode: source.codInt ?? source.codigo_integracao ?? null,
    name: source.nome ?? source.descricao ?? null,
    active: source.inativo !== "S",
  };
}

module.exports = { toPartnerProjection, toProjectProjection };
