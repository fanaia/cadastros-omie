# Bootstrap e teste operacional de sincronização

## Objetivo

Entregar o primeiro uso do app **Cadastros Omie** exclusivamente neste repositório. O app não guarda `app_key` ou `app_secret`: ele seleciona uma conexão autorizada do app Configurações, resolve material efêmero no backend e executa testes somente leitura pelo adapter local.

## Jornada do usuário

1. Em **Configurações Omie > Políticas**, o administrador habilita Cadastros para a base.
2. Em **Configurações Omie > Consumidores**, gera um código de vínculo de exibição única.
3. Em **Cadastros Omie > Sincronização**, cola o código, escolhe as entidades e define o tamanho de página.
4. O backend valida módulo, ambiente, conexão e URL HTTPS; cifra o segredo do grant com a proteção fornecida pelo OonCore.
5. O usuário executa **Sincronizar tudo**. O app obtém um lock com prazo renovável, percorre as páginas, atualiza as projeções e registra resultado por entidade, contagem e protocolo.
6. Se alguma entidade falhar, **Reprocessar falhas** repete somente as entidades pendentes e preserva o resultado das demais.
7. Cada comando usa `Idempotency-Key`; uma repetição da mesma solicitação devolve a resposta persistida sem chamar o Omie novamente.
8. Rotacionar ou revogar o grant em Configurações invalida o acesso anterior.

## Variáveis de implantação

| Variável | Obrigatória | Uso | Exposição na UI |
|---|---:|---|---|
| Código de vínculo | sim por base | URL, instância, ambiente, grant e segredo emitidos por Configurações | segredo somente na gravação |
| `INSTANCE_CREDENTIAL_ENCRYPTION_KEY` | automática | Cifra o segredo técnico no banco deste app | somente `configurada`/`ausente` |
| `OMIE_CONFIG_SERVICE_URL` e variáveis relacionadas | não | Compatibilidade local/legada | somente diagnóstico |
| `APP_INSTANCE_ID` | não (legado) | Fallback para runtimes antigos; o OonCore fornece a identidade do deployment/instância | identificador operacional |
| `APP_ENVIRONMENT` | sim | Isolamento entre ambientes | nome do ambiente |

O navegador recebe o segredo apenas no transporte autenticado do cadastro inicial e o backend nunca o devolve. Chamadas posteriores usam HMAC, timestamp curto e grant por base; Configurações mantém nonce de uso único contra replay.

## Contratos do app

| Método | Rota | Permissão | Finalidade |
|---|---|---|---|
| `GET` | `/api/cadastros/bootstrap` | `cadastros.partner.read.connection` | Estado do primeiro uso e requisitos |
| `PUT` | `/api/cadastros/resolver-bindings` | permissão de sync | Cadastrar/rotacionar o vínculo protegido |
| `PUT` | `/api/cadastros/bootstrap` | `cadastros.partner.sync.connection` | Salvar conexão, entidades e tamanho da página |
| `POST` | `/api/cadastros/sync/run` | permissão de sync por entidade | Sincronizar as entidades configuradas com `Idempotency-Key` |
| `POST` | `/api/cadastros/sync/retry` | permissão de sync por entidade | Reprocessar somente as falhas da última execução |
| `GET` | `/api/cadastros/sync/runs` | permissão de leitura | Consultar o histórico sanitizado da base |

## Escopo da sincronização

Entidades disponíveis: clientes/fornecedores, categorias, departamentos e projetos. A sincronização usa apenas operações `*.list` da allowlist existente e persiste projeções locais; o Omie continua sendo a fonte de verdade. O reprocessamento substitui no estado agregado somente o resultado das entidades repetidas.

## Segurança e isolamento

- `modules.omie` permanece `false`; o adapter do app é a única saída para a API Omie.
- O backend ignora contexto recebido do navegador e deriva tenant/ator da sessão autenticada.
- A chamada ao app Configurações é assinada com HMAC, timestamp de curta duração e contexto completo.
- Credenciais efêmeras existem apenas em memória durante a chamada e não aparecem na resposta do teste.
- Erros são normalizados para código, mensagem segura e protocolo; payloads do provedor não são registrados.
- O resultado efetivo por entidade é persistido sem payload Omie e exposto com protocolo sanitizado.
- Um lease renovado a cada página impede duas sincronizações simultâneas da mesma base e permite recuperação automática se um processo for interrompido.
- O histórico não expõe a chave idempotente, credenciais nem payloads do provedor.

## Critérios de aceite

- Página de Inicialização substitui a experiência de CRUD para o primeiro uso.
- Configuração persiste sem credenciais e respeita conexão/tenant/instância/ambiente.
- Sincronização e reprocessamento apresentam resultado por entidade e histórico operacional.
- Nenhuma alteração ocorre na Plataforma, no OonCore ou em outros módulos.
