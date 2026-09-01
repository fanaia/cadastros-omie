# ADR-001 — Fonte de verdade e projeções de cadastros

- Status: aceito
- Data: 2026-09-01

## Decisão

O Omie é a fonte de verdade dos cadastros cobertos por API. `cadastros-omie` mantém projeções locais para experiência, busca, consolidação, pickers, estado de sincronização e extensões Oon+.

DTOs Omie são traduzidos no adapter. Payload bruto não atravessa o domínio nem é persistido sem justificativa explícita.

## Consequências

- Projeções carregam `omieConnectionId`, externalId, integrationCode, hash e estado de sync.
- Alterações locais são intenções até confirmação do Omie.
- Conflitos não são sobrescritos silenciosamente.
- Índices únicos são compostos pela conexão; nunca globais entre bases.
