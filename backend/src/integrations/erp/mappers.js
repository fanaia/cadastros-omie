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
    documentMasked: taxId.length > 4 ? `${"•".repeat(Math.min(taxId.length - 4, 10))}${taxId.slice(-4)}` : taxId,
    email: source.email ?? null,
    phone: source.telefone1_numero ?? source.telefone1_ddd ?? null,
    isCustomer: source.cliente !== "N",
    isSupplier: source.fornecedor === "S",
    active: source.inativo !== "S",
    syncState: "Sincronizado",
    syncedAt: new Date(),
  };
}

function toProjectProjection(source = {}, connectionId) {
  return {
    omieConnectionId: connectionId,
    externalId: source.codigo ?? source.codigo_projeto ?? null,
    integrationCode: source.codInt ?? source.codigo_integracao ?? null,
    name: source.nome ?? source.descricao ?? null,
    active: source.inativo !== "S",
    syncState: "Sincronizado",
    syncedAt: new Date(),
  };
}

function toCategoryProjection(source = {}, connectionId) {
  return {
    omieConnectionId: connectionId,
    externalId: source.codigo ?? source.codigo_categoria ?? null,
    parentExternalId: source.categoria_superior ?? null,
    description: source.descricao ?? source.nome ?? null,
    nature: source.tipo ?? source.natureza ?? null,
    categoryType: source.tipo_categoria ?? null,
    dreCode: source.codigo_dre ?? null,
    active: source.inativo !== "S",
    syncState: "Sincronizado",
    syncedAt: new Date(),
  };
}

function toDepartmentProjection(source = {}, connectionId) {
  return {
    omieConnectionId: connectionId,
    externalId: source.codigo ?? source.codigo_departamento ?? null,
    description: source.descricao ?? source.nome ?? null,
    active: source.inativo !== "S",
    syncState: "Sincronizado",
    syncedAt: new Date(),
  };
}

module.exports = { toCategoryProjection, toDepartmentProjection, toPartnerProjection, toProjectProjection };
