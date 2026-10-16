# OrderPulse

> Painel unificado de pedidos de mÃºltiplos marketplaces â€” **VTEX, Mercado Livre, Magento e Tray** â€” com status normalizado, filtros compartilhÃ¡veis por URL, indicadores e visÃ£o de saÃºde da integraÃ§Ã£o com o ERP.

![DemonstraÃ§Ã£o do OrderPulse](docs/demo.gif)

Quem vende em vÃ¡rios canais acompanha pedidos em telas diferentes, cada uma com seu vocabulÃ¡rio de status. O OrderPulse junta tudo numa lista sÃ³ e mostra, para o time de integraÃ§Ã£o, quais pedidos nÃ£o entraram no ERP â€” com o payload original e um botÃ£o de reprocessar.

O backend Ã© mockado (dados gerados com seed fixa), mas o front Ã© de produÃ§Ã£o: estado de servidor com cache, tabela virtualizada, grÃ¡ficos acessÃ­veis, tema claro/escuro, testes unitÃ¡rios, de componente e E2E.

## Funcionalidades

| Tela | O que faz |
|------|-----------|
| **Dashboard** | KPIs (pedidos, receita, ticket mÃ©dio, taxa de falha) com variaÃ§Ã£o vs. perÃ­odo anterior, sÃ©rie diÃ¡ria (pedidos ou receita), pedidos por canal e taxa de falha por canal. PerÃ­odos de 7, 30 e 90 dias. Todo grÃ¡fico tem visÃ£o em tabela. |
| **Pedidos** | PaginaÃ§Ã£o, ordenaÃ§Ã£o e busca no servidor (nÂº do pedido, cliente, e-mail, SKU). Filtros combinÃ¡veis de canal, status, perÃ­odo e faixa de valor â€” tudo na URL. AtÃ© 1.000 linhas por pÃ¡gina com virtualizaÃ§Ã£o. |
| **Detalhe** | Itens, totais, cliente, entrega, status original do marketplace e linha do tempo normalizada. "Voltar" preserva os filtros. |
| **Falhas de integraÃ§Ã£o** | Pedidos que nÃ£o sincronizaram com o ERP, tipo de erro (transitÃ³rio Ã— dados), payload bruto do marketplace e reprocessamento otimista (reverte se o ERP recusar). |

| | |
|---|---|
| ![Pedidos](docs/screenshots/orders.png) | ![Detalhe do pedido](docs/screenshots/order-detail.png) |
| ![Falhas de integraÃ§Ã£o](docs/screenshots/payload.png) | ![Dashboard no tema escuro](docs/screenshots/dashboard-dark.png) |

## NormalizaÃ§Ã£o de status

O coraÃ§Ã£o do domÃ­nio: cada marketplace descreve o ciclo do pedido de um jeito, e nem sempre sÃ³ no campo `status`. A camada anticorrupÃ§Ã£o (`src/features/orders/mappers/`) converte o payload bruto para `pending | paid | invoiced | shipped | delivered | canceled` â€” a UI nunca vÃª o formato do marketplace (exceto no visualizador de payload, de propÃ³sito).

| Normalizado | VTEX | Mercado Livre | Magento | Tray |
|---|---|---|---|---|
| `pending` | `order-created`, `payment-pending` | `payment_required`, `payment_in_process` | `pending`, `pending_payment`, `holded` | `AGUARDANDO PAGAMENTO` (e status customizados) |
| `paid` | `payment-approved`, `ready-for-handling`, `handling` | `paid` + shipment `pending/handling` | `processing` sem invoice | `PAGAMENTO APROVADO`, `EM SEPARAÃ‡ÃƒO` |
| `invoiced` | `invoiced` sem tracking | `paid` + nota fiscal anexada | `processing` com invoice | `NOTA FISCAL EMITIDA`, `A ENVIAR` |
| `shipped` | `invoiced` + `courierStatus: shipped` | shipment `shipped` | `processing` com shipment, `complete` | `ENVIADO` |
| `delivered` | `invoiced` + `courierStatus: delivered` | shipment `delivered` | `delivered` (status customizado) | `ENTREGUE`, `FINALIZADO` |
| `canceled` | `cancellation-requested`, `canceled` | `cancelled` (pedido ou shipment) | `canceled`, `closed` | `CANCELADO`, `CANCELADO AUT` |

Outros detalhes que os mappers resolvem: VTEX em centavos, Mercado Livre e Magento em reais (float), Tray com nÃºmeros **como string** e data/hora locais em campos separados; Magento com datas UTC sem fuso e histÃ³rico em ordem inversa. Internamente, todo valor monetÃ¡rio Ã© inteiro em centavos e toda data Ã© ISO UTC. O status original Ã© preservado em `rawStatus`.

## Arquitetura

```
src/
â”œâ”€â”€ pages/                 rotas (lazy) â€” Dashboard, Pedidos, Detalhe, Falhas
â”œâ”€â”€ features/              cada domÃ­nio Ã© autocontido
â”‚   â”œâ”€â”€ orders/            api (query/keys), mappers por canal, hooks, componentes, tipos
â”‚   â”œâ”€â”€ integration-failures/
â”‚   â””â”€â”€ analytics/
â”œâ”€â”€ shared/                sÃ³ o que Ã© genuinamente reutilizÃ¡vel: ui/, lib/, hooks/, types/
â””â”€â”€ mocks/                 handlers MSW (demo estÃ¡tica)
mock-server/src/
â”œâ”€â”€ data/generator.ts      pedidos no formato bruto de cada canal (faker, seed fixa)
â”œâ”€â”€ data/db.ts             "banco" em memÃ³ria: filtro, ordenaÃ§Ã£o, paginaÃ§Ã£o, mÃ©tricas, reprocesso
â””â”€â”€ routes/                Fastify
```

- **Estado de servidor com TanStack Query** â€” query keys centralizadas e tipadas (`orders.keys.ts`), `keepPreviousData` na paginaÃ§Ã£o, detalhe renderizado instantaneamente a partir do cache da listagem, mutation otimista com rollback no reprocessar.
- **Estado de UI na URL** â€” filtros, ordenaÃ§Ã£o e paginaÃ§Ã£o sÃ£o query params (`useUrlFilters`). O mesmo formato Ã© usado na query string da API: um link compartilhado reproduz exatamente a consulta, e "voltar" funciona.
- **Um contrato, trÃªs consumidores** â€” o `db.ts` do mock server Ã© usado pelo Fastify (dev), pelos handlers MSW nos testes e pelo service worker na demo publicada.
- **Tabela** â€” TanStack Table (ordenaÃ§Ã£o manual no servidor) + TanStack Virtual acima de 100 linhas, mantendo `<table>` semÃ¢ntica (linhas espaÃ§adoras, `aria-rowindex`, `aria-sort`).
- **Code splitting por rota** â€” Recharts sÃ³ Ã© baixado no dashboard.

## Rodando localmente

PrÃ©-requisitos: **Node.js 22+** e npm. NÃ£o Ã© preciso banco de dados, credenciais nem arquivo `.env`.

```bash
git clone https://github.com/MaatheusPolli/order-pulse.git
cd order-pulse
npm install
npm run dev        # Vite em http://localhost:5173 + mock server Fastify em :3333
```

Alternativa sem servidor: `npm run dev:msw` sobe sÃ³ o Vite, com a API rodando no service worker do navegador (igual Ã  demo publicada).

Os dados sÃ£o gerados na inicializaÃ§Ã£o com seed fixa, com data de referÃªncia em 30/09/2026: todo mundo vÃª os mesmos 1.500 pedidos. Reprocessamentos ficam em memÃ³ria e somem ao reiniciar o servidor ou recarregar a demo.

### VariÃ¡veis de ambiente (opcionais)

| VariÃ¡vel | PadrÃ£o | Uso |
|---|---|---|
| `PORT` | `3333` | porta do mock server Fastify |
| `MOCK_LATENCY` | `350` | latÃªncia artificial do mock server em ms (`0` desliga) |
| `VITE_API_URL` | `/api` | URL base da API consumida pelo front |
| `VITE_BASE` | `/` | caminho base do build (ex.: `/order-pulse/` no GitHub Pages) |

| Script | |
|---|---|
| `npm run build` / `npm run build:demo` | build de produÃ§Ã£o / build com API mockada no navegador |
| `npm run lint`, `npm run typecheck` | ESLint (sem `any`) e TypeScript estrito |
| `npm test`, `npm run test:coverage` | Vitest + Testing Library + MSW |
| `npm run test:e2e` | Playwright (faz o build de demo e sobe o preview) |
| `npm run analyze:size` | mede o bundle inicial e falha acima de 200 KB gzip |

Prints e GIF: `npm run build:demo && npm run preview`, depois `node scripts/capture-demo.mjs /tmp/frames && python3 scripts/make-gif.py /tmp/frames docs/demo.gif`.

### API do mock

| MÃ©todo | Rota | |
|---|---|---|
| GET | `/api/orders?page&pageSize&sort&dir&q&channel&status&from&to&minTotal&maxTotal` | envelopes com o payload bruto de cada canal |
| GET | `/api/orders/:id` | um envelope |
| GET | `/api/failures` | pedidos com erro de sincronizaÃ§Ã£o |
| POST | `/api/failures/:id/reprocess` | 200 para erros transitÃ³rios; 422 para erros de dados; 409 se jÃ¡ sincronizado |
| GET | `/api/metrics?days=7\|30\|90` | KPIs, perÃ­odo anterior, sÃ©rie diÃ¡ria e agregados por canal/status |

## Testes

- **Mappers** â€” uma fixture por canal no formato real (anonimizada) â†’ `Order` esperado, mais tabelas de todos os status de cada canal.
- **Mock server** â€” determinismo do gerador, consistÃªncia de totais/linha do tempo, filtros, ordenaÃ§Ã£o, reprocessamento e mÃ©tricas.
- **Componentes/fluxos** (Testing Library + MSW) â€” skeleton some apÃ³s carregar, filtro altera a URL e refaz a query, busca com debounce, estados vazio e de erro, virtualizaÃ§Ã£o, detalhe e voltar com filtros, reprocessar otimista com sucesso e com rollback (MSW respondendo 500), dashboard e visÃ£o em tabela.
- **E2E** (Playwright) â€” filtrar â†’ detalhe â†’ voltar mantendo filtros; 1.000 linhas com scroll; reprocessar falha; payload; dashboard com tooltip e tema persistido.
- **Acessibilidade** â€” `axe` em todas as rotas, tema claro e escuro, desktop e mobile, sem violaÃ§Ãµes sÃ©rias ou crÃ­ticas.

A CI (`.github/workflows/ci.yml`) roda lint, typecheck, testes com cobertura, orÃ§amento de bundle, E2E e Lighthouse CI.

## Metas do planejamento

| Meta | Resultado medido |
|---|---|
| Lighthouse â‰¥ 90 em Performance e Acessibilidade | Dashboard 94/100 Â· Pedidos 94/100 Â· Falhas 93/100 (mobile simulado, build de demo com MSW) |
| 1.000 linhas sem travar | virtualizaÃ§Ã£o: ~25 linhas no DOM de 1.000 |
| Bundle inicial < 200 KB gzip | 90,7 KB |
| Cobertura â‰¥ 80% | 97% de linhas (89 testes) |
| E2E dos 3 fluxos principais | 24 testes (fluxos + axe) |

## Deploy

`.github/workflows/deploy.yml` publica o build de demo no GitHub Pages a cada push na `master` (ative **Settings â†’ Pages â†’ Source: GitHub Actions**). A API roda no service worker, entÃ£o o site Ã© 100% estÃ¡tico; `404.html` faz o fallback de SPA.

## Fora de escopo

IntegraÃ§Ã£o real com os marketplaces (exige credenciais) e autenticaÃ§Ã£o (o usuÃ¡rio Ã© simulado). Todos os nomes, documentos e endereÃ§os sÃ£o fictÃ­cios.

## LicenÃ§a

DistribuÃ­do sob a licenÃ§a [MIT](LICENSE) Â© 2026 Matheus Gasparotto Polli.


## Licença

### Uso Pessoal
Este projeto é licenciado sob a **Licença MIT** para uso pessoal, educacional e não comercial.

### Uso Comercial
Se você deseja usar este projeto comercialmente, deve obter uma licença comercial do autor.

**Uso comercial inclui:**
- Incorporar em um produto comercial
- Oferecer como serviço
- Usar em atividades com fins lucrativos
- Implantação empresarial

**Para obter uma licença comercial:**
Email: ma.polli@hotmail.com
