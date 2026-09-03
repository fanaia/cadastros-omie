# UX operacional — Cadastros Omie

- Status: aprovado para implementação
- Data: 2026-09-01
- Escopo: manifesto declarativo OonCore 0.5.1

## Problema observado

As projeções estão modeladas, mas a UI atual oferece listas técnicas semelhantes a CRUD. Para o usuário, a tarefa é localizar um cadastro na base correta, validar a origem, entender a situação de sincronização e tratar exceções sem alterar projeções diretamente.

## Princípios

1. A conexão de origem é contexto obrigatório e visível em todas as telas.
2. O estado de sincronização orienta a ação e aparece como badge.
3. Registros com conflito ou erro oferecem entrada direta na análise da ocorrência.
4. Identificação funcional vem antes de ids técnicos e hashes.
5. Projeções continuam somente leitura; escrita pertence a comandos idempotentes ainda bloqueados por homologação.
6. O adapter Omie permanece local ao side-car e `core.integrations.omie` continua desabilitado.
7. A experiência usa grid, filtros, summary e detail modal do OonCore; não recria shell ou CRUD em React.

## Jornada principal

1. **Escolher contexto:** filtrar pela conexão autorizada e pelo tipo de cadastro.
2. **Localizar:** buscar pelo nome, código de integração ou documento mascarado.
3. **Qualificar:** distinguir ativo/inativo e cliente/fornecedor.
4. **Validar:** conferir origem, última sincronização e alteração externa.
5. **Tratar exceção:** abrir diretamente a aba de sincronização quando houver pendência, conflito ou erro.

## Superfícies

| Superfície | Objetivo operacional | Conteúdo prioritário |
| --- | --- | --- |
| Visão geral | orientar consulta e tratamento | jornada, regras de origem e atalhos |
| Parceiros | localizar e qualificar clientes/fornecedores | nome, documento mascarado, papéis, base, estado e última sync |
| Categorias | validar classificação | descrição, natureza, tipo, base e estado |
| Departamentos | validar centro organizacional | descrição, base, ativo e estado |
| Projetos | localizar contexto de negócio | nome, código de integração, base e estado |
| Anexos | rastrear documentos vinculados | origem, arquivo, tipo, base e estado |

## Ações desta entrega

- `Consultar cadastro`: abre o resumo funcional.
- `Analisar sincronização`: fica oculta quando o item está sincronizado e abre diretamente a situação técnica.
- Todos os tipos recebem modal com resumo, dados funcionais, origem e sincronização.

Os comandos reais **Sincronizar tudo** e **Reprocessar falhas** usam endpoints protegidos, idempotência, lock por base e isolamento multibase. O histórico mostra gatilho, horário, resultado e protocolo. A reconciliação de conflitos registro a registro continuará oculta até possuir contrato próprio; não haverá ação fictícia na UI.

## Critérios de aceite

- Todas as coleções exibem base e situação de sincronização.
- Estado de sincronização é badge e possui filtro completo.
- A primeira aba é um resumo operacional.
- Pendência, conflito e erro abrem diretamente na aba de sincronização.
- Campos técnicos ficam em grupos secundários.
- Projeções não ganham edição genérica.
- `ooncore:docs:check`, `ooncore:conformance` e testes permanecem verdes.

