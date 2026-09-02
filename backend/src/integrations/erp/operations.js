const OPERATIONS = Object.freeze({
  "partner.list": Object.freeze({ endpoint: "https://app.omie.com.br/api/v1/geral/clientes/", call: "ListarClientes", timeoutMs: 20000, mutation: false }),
  "partner.get": Object.freeze({ endpoint: "https://app.omie.com.br/api/v1/geral/clientes/", call: "ConsultarCliente", timeoutMs: 15000, mutation: false }),
  "partner.upsert": Object.freeze({ endpoint: "https://app.omie.com.br/api/v1/geral/clientes/", call: "UpsertCliente", timeoutMs: 20000, mutation: true }),
  "project.list": Object.freeze({ endpoint: "https://app.omie.com.br/api/v1/geral/projetos/", call: "ListarProjetos", timeoutMs: 20000, mutation: false }),
  "project.upsert": Object.freeze({ endpoint: "https://app.omie.com.br/api/v1/geral/projetos/", call: "UpsertProjeto", timeoutMs: 20000, mutation: true }),
  "category.list": Object.freeze({ endpoint: "https://app.omie.com.br/api/v1/geral/categorias/", call: "ListarCategorias", timeoutMs: 20000, mutation: false }),
  "department.list": Object.freeze({ endpoint: "https://app.omie.com.br/api/v1/geral/departamentos/", call: "ListarDepartamentos", timeoutMs: 20000, mutation: false }),
});

function getOperation(operationId) {
  const operation = OPERATIONS[operationId];
  if (!operation) {
    const error = new Error(`Operação não permitida: ${operationId}`);
    error.code = "OPERATION_NOT_ALLOWED";
    throw error;
  }
  return operation;
}

module.exports = { OPERATIONS, getOperation };
