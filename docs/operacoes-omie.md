# Catálogo inicial de operações Omie

Snapshot oficial: 2026-09-01.

| operationId Oon | Call Omie | Tipo | Paridade | MVP |
| --- | --- | --- | --- | --- |
| `registrations.partner.list.v1` | `ListarClientes` | sync/query | A | sim |
| `registrations.partner.get.v1` | `ConsultarCliente` | query | A | sim |
| `registrations.partner.create.v1` | `IncluirCliente` | command | A | após adapter |
| `registrations.partner.update.v1` | `AlterarCliente` | command | A | após adapter |
| `registrations.project.list.v1` | `ListarProjetos` | sync/query | A | sim |
| `registrations.project.create.v1` | `IncluirProjeto` | command | A | após adapter |
| `registrations.project.update.v1` | `AlterarProjeto` | command | A | após adapter |
| `registrations.category.list.v1` | `ListarCategorias` | sync/query | A | sim |
| `registrations.department.list.v1` | `ListarDepartamentos` | sync/query | A | sim |
| `registrations.attachment.list.v1` | `ListarAnexo` | query | A | não |
| `registrations.attachment.create.v1` | `IncluirAnexo` | command | A | não |

Métodos em lote marcados como deprecated na documentação oficial não serão usados em código novo.

Referências: [catálogo oficial](https://developer.omie.com.br/service-list/), [clientes](https://app.omie.com.br/api/v1/geral/clientes/), [projetos](https://app.omie.com.br/api/v1/geral/projetos/), [departamentos](https://app.omie.com.br/api/v1/geral/departamentos/), [categorias](https://app.omie.com.br/api/v1/geral/categorias/) e [anexos](https://app.omie.com.br/api/v1/geral/anexo/).

