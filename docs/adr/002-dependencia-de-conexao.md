# ADR-002 — Dependência da capability de Configurações

- Status: aceito
- Data: 2026-09-01

## Decisão

`cadastros-omie` mantém seu próprio adapter Omie de domínio e consome o contrato versionado de `configuracoes-omie` para autorizar a conexão e obter material efêmero de execução no backend. Não persiste `app_key`, `app_secret` ou credenciais derivadas e não usa a capacidade nativa `core.integrations.omie`.

## Consequências

- Toda chamada começa com `omieConnectionId` autorizado.
- Indisponibilidade ou suspensão afeta somente a conexão correspondente.
- Consumer contract entre os módulos é gate para integração real.
- A UI pode selecionar bases autorizadas, mas não concede acesso.
- Mapeamentos, catálogo de operações e reconciliação de Cadastros pertencem a este side-car.
