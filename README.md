# Vita — Gestão financeira da saúde

Prévia privada com interfaces de profissional da saúde e contador. A seleção de interface é demonstrativa e não substitui autenticação e autorização por papéis. O acesso publicado deve permanecer restrito ao proprietário até a implementação de convites e vínculos de usuário por cliente.

## Recursos

Painéis derivados dos lançamentos por competência, visão anual, documentos em R2 com metadados em D1, cadastro PF/PJ, solicitações, conversa persistente, plano de contas, lançamentos com débito/crédito, importação CSV e conciliação, balancete, DRE, balanço de trabalho e fechamento mensal com bloqueio de lançamentos.

Os dados iniciais são exemplos em `lib/vita-data.ts`; alterações são persistidas em D1. Documentos iniciais não são fabricados. Demonstrações contábeis são relatórios de trabalho, sem saldos iniciais externos nem certificação fiscal. Não há emissão oficial de guias/notas ou integração bancária.

## Desenvolvimento

- `npm run dev`: prévia local.
- `npm run build`: gera o Worker e os arquivos públicos.
- `npm run db:generate`: gera migrações do schema.
- Aplicar as migrações locais após o build, usando Wrangler e `.wrangler/state`.
- `npx tsc --noEmit`: verificação de tipos.

O ambiente publicado usa autenticação fornecida por Sites. Localmente, acesse `/signin-with-chatgpt?return_to=/` para habilitar a identidade de desenvolvimento. Cabeçalhos de identidade são verificados nas rotas de dados. Não tornar o site público sem implementar autorização individual de clientes.

## Importação

CSV UTF-8, separado por ponto e vírgula ou vírgula, com colunas `data`, `descrição`, `valor`, `tipo`. Data AAAA-MM-DD; valor positivo; tipo Receita ou Despesa. Até 500 linhas por importação. A assinatura do arquivo evita duplicação ao reenviar o mesmo conteúdo.

## Verificação

Verificados localmente: acesso anônimo rejeitado; cadastro de cliente; validação de valor; persistência de lançamento e mensagem; bloqueio e reabertura de competência; integridade de upload/download. Compilação e tipos verificados. Inspeção visual automatizada não executada. A ferramenta opcional WebMCP de navegação não foi validada em um contexto de navegador compatível disponível.
