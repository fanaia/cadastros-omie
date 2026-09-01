# Fluxo de trabalho para Agents

1. **Descobrir:** leia `AGENTS.md`, manifesto documental e `CAPABILITIES.md`.
2. **Classificar:** separe contrato do Core, domínio da Central e recurso exclusivo da plataforma.
3. **Escolher extensão:** manifesto → validation/trigger/hook/mapping → renderer/rota pequena → código customizado somente se necessário.
4. **Implementar:** use exports públicos; preserve segurança, tenant, auditoria e idempotência.
5. **Executar local:** `npm run dev`, sem cadastro ou conexão com a plataforma.
6. **Validar:** docs check, conformance, testes, typecheck e provas específicas do projeto.
7. **Relatar:** arquivos, contratos usados, riscos, limitações e evidências.

Prompt operacional:

> Atualize os três pacotes OonCore para a linha 0.5.x, preserve o domínio e o AGENTS.md do projeto, sincronize `.ooncore`, consulte os contratos públicos de back e front, use apenas extensões suportadas, execute os gates e homologue em `127.0.0.1` sem conexão com a plataforma. Não crie autenticação, ativação, RBAC, CRUD, shell ou infraestrutura paralelos.
