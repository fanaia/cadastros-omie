# ADR-002 — Dependência da capability de Configurações

- Status: aceito
- Data: 2026-09-01

## Decisão

`cadastros-omie` consome a capability versionada de `configuracoes-omie` para autorizar e resolver conexões. Não armazena `app_key`, `app_secret` ou credenciais derivadas.

## Consequências

- Toda chamada começa com `omieConnectionId` autorizado.
- Indisponibilidade ou suspensão afeta somente a conexão correspondente.
- Consumer contract entre os módulos é gate para integração real.
- A UI pode selecionar bases autorizadas, mas não concede acesso.
