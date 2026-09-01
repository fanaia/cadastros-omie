# Bootstrap e teste operacional de sincronização

## Objetivo

Entregar o primeiro uso do app **Cadastros Omie** exclusivamente neste repositório. O app não guarda `app_key` ou `app_secret`: ele seleciona uma conexão autorizada do app Configurações, resolve material efêmero no backend e executa testes somente leitura pelo adapter local.

## Jornada do usuário

1. A página **Inicialização** verifica as variáveis de implantação e a disponibilidade do serviço de Configurações.
2. O administrador informa o identificador da conexão autorizada, escolhe os cadastros que deseja validar e define o tamanho da amostra.
3. O backend persiste somente conexão, escopo e parâmetros operacionais; nenhuma credencial Omie é aceita pela rota.
4. O usuário executa **Testar sincronização**.
5. O app consulta até uma página de cada entidade selecionada, sem gravar projeções, e mostra contagens, duração, protocolo e erros sanitizados.
6. Após todos os testes selecionados passarem, o bootstrap fica pronto para o incremento posterior de sincronização efetiva.

## Variáveis de implantação

| Variável | Obrigatória | Uso | Exposição na UI |
|---|---:|---|---|
| `OMIE_CONFIG_SERVICE_URL` | sim | URL HTTPS do app Configurações | URL pública normalizada |
| `OMIE_CONFIG_RESOLVER_SHARED_SECRET` | sim | Assina a resolução backend-to-backend | somente `configurada`/`ausente` |
| `OMIE_CONFIG_APP_INSTANCE_ID` | sim | Seleciona a instância licenciada do app Configurações | identificador operacional |
| `APP_INSTANCE_ID` | sim | Isolamento da instância licenciada | identificador operacional |
| `APP_ENVIRONMENT` | sim | Isolamento entre ambientes | nome do ambiente |

O navegador não configura nem recebe o segredo compartilhado. Quando ele está ausente, o teste falha fechado e a página informa qual requisito de implantação deve ser corrigido.

## Contratos do app

| Método | Rota | Permissão | Finalidade |
|---|---|---|---|
| `GET` | `/api/cadastros/bootstrap` | `cadastros.partner.read.connection` | Estado do primeiro uso e requisitos |
| `PUT` | `/api/cadastros/bootstrap` | `cadastros.partner.sync.connection` | Salvar conexão, entidades e tamanho da amostra |
| `POST` | `/api/cadastros/sync/test` | permissão de sync por entidade | Executar teste read-only e multibase |

## Escopo do teste

Entidades disponíveis: clientes/fornecedores, categorias, departamentos e projetos. O teste usa apenas operações `*.list` da allowlist existente, força uma amostra pequena e nunca persiste dados funcionais.

## Segurança e isolamento

- `modules.omie` permanece `false`; o adapter do app é a única saída para a API Omie.
- O backend ignora contexto recebido do navegador e deriva tenant/ator da sessão autenticada.
- A chamada ao app Configurações é assinada com HMAC, timestamp de curta duração e contexto completo.
- Credenciais efêmeras existem apenas em memória durante a chamada e não aparecem na resposta do teste.
- Erros são normalizados para código, mensagem segura e protocolo; payloads do provedor não são registrados.
- Não há escrita em projeções nesta etapa. Sincronização efetiva, reprocessamento e conflitos continuam em sub-issues próprios.

## Critérios de aceite

- Página de Inicialização substitui a experiência de CRUD para o primeiro uso.
- Configuração persiste sem credenciais e respeita conexão/tenant/instância/ambiente.
- Teste de sincronização apresenta resultado por entidade e não produz mutação.
- Nenhuma alteração ocorre na Plataforma, no OonCore ou em outros módulos.
