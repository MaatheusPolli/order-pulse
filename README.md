# OrderPulse

> Painel unificado de pedidos de múltiplos marketplaces — **VTEX, Mercado Livre, Magento e Tray** — com status normalizado, filtros compartilháveis por URL, indicadores e visão de saúde da integração com o ERP.

![Demonstração do OrderPulse](docs/demo.gif)

Quem vende em vários canais acompanha pedidos em telas diferentes, cada uma com seu vocabulário de status. O OrderPulse junta tudo numa lista só e mostra, para o time de integração, quais pedidos não entraram no ERP — com o payload original e um botão de reprocessar.

O backend é mockado (dados gerados com seed fixa), mas o front é de produção: estado de servidor com cache, tabela virtualizada, gráficos acessíveis, tema claro/escuro, testes unitários, de componente e E2E.

## Funcionalidades

| Tela | O que faz |
|------|-----------|
| **Dashboard** | KPIs (pedidos, receita, ticket médio, taxa de falha) com variação vs. período anterior, série diária (pedidos ou receita), pedidos por canal e taxa de falha por canal. Períodos de 7, 30 e 90 dias. Todo gráfico tem visão em tabela. |
| **Pedidos** | Paginação, ordenação e busca no servidor (nº do pedido, cliente, e-mail, SKU). Filtros combináveis de canal, status, período e faixa de valor — tudo na URL. Até 1.000 linhas por página com virtualização. |
| **Detalhe** | Itens, totais, cliente, entrega, status original do marketplace e linha do tempo normalizada. "Voltar" preserva os filtros. |
| **Falhas de integração** | Pedidos que não sincronizaram com o ERP, tipo de erro (transitório × dados), payload bruto do marketplace e reprocessamento otimista (reverte se o ERP recusar). |

| | |
|---|---|
| ![Pedidos](docs/screenshots/orders.png) | ![Detalhe do pedido](docs/screenshots/order-detail.png) |
| ![Falhas de integração](docs/screenshots/payload.png) | ![Dashboard no tema escuro](docs/screenshots/dashboard-dark.png) |

## Normalização de status

O coração do domínio: cada marketplace descreve o ciclo do pedido de um jeito, e nem sempre só no campo `status`. A camada anticorrupção (`src/features/orders/mappers/`) converte o payload bruto para `pending | paid | invoiced | shipped | delivered | canceled` — a UI nunca vê o formato do marketplace (exceto no visualizador de payload, de propósito).

| Normalizado | VTEX | Mercado Livre | Magento | Tray |
|---|---|---|---|---|
| `pending` | `order-created`, `payment-pending` | `payment_required`, `payment_in_process` | `pending`, `pending_payment`, `holded` | `AGUARDANDO PAGAMENTO` (e status customizados) |
| `paid` | `payment-approved`, `ready-for-handling`, `handling` | `paid` + shipment `pending/handling` | `processing` sem invoice | `PAGAMENTO APROVADO`, `EM SEPARAÇÃO` |
| `invoiced` | `invoiced` sem tracking | `paid` + nota fiscal anexada | `processing` com invoice | `NOTA FISCAL EMITIDA`, `A ENVIAR` |
| `shipped` | `invoiced` + `courierStatus: shipped` | shipment `shipped` | `processing` com shipment, `complete` | `ENVIADO` |
| `delivered` | `invoiced` + `courierStatus: delivered` | shipment `delivered` | `delivered` (status customizado) | `ENTREGUE`, `FINALIZADO` |
| `canceled` | `cancellation-requested`, `canceled` | `cancelled` (pedido ou shipment) | `canceled`, `closed` | `CANCELADO`, `CANCELADO AUT` |

Outros detalhes que os mappers resolvem: VTEX em centavos, Mercado Livre e Magento em reais (float), Tray com números **como string** e data/hora locais em campos separados; Magento com datas UTC sem fuso e histórico em ordem inversa. Internamente, todo valor monetário é inteiro em centavos e toda data é ISO UTC. O status original é preservado em `rawStatus`.

## Arquitetura

```
src/
├── pages/                 rotas (lazy) — Dashboard, Pedidos, Detalhe, Falhas
├── features/              cada domínio é autocontido
│   ├── orders/            api (query/keys), mappers por canal, hooks, componentes, tipos
│   ├── integration-failures/
│   └── analytics/
├── shared/                só o que é genuinamente reutilizável: ui/, lib/, hooks/, types/
└── mocks/                 handlers MSW (demo estática)
mock-server/src/
├── data/generator.ts      pedidos no formato bruto de cada canal (faker, seed fixa)
├── data/db.ts             "banco" em memória: filtro, ordenação, paginação, métricas, reprocesso
└── routes/                Fastify
```

- **Estado de servidor com TanStack Query** — query keys centralizadas e tipadas (`orders.keys.ts`), `keepPreviousData` na paginação, detalhe renderizado instantaneamente a partir do cache da listagem, mutation otimista com rollback no reprocessar.
- **Estado de UI na URL** — filtros, ordenação e paginação são query params (`useUrlFilters`). O mesmo formato é usado na query string da API: um link compartilhado reproduz exatamente a consulta, e "voltar" funciona.
- **Um contrato, três consumidores** — o `db.ts` do mock server é usado pelo Fastify (dev), pelos handlers MSW nos testes e pelo service worker na demo publicada.
- **Tabela** — TanStack Table (ordenação manual no servidor) + TanStack Virtual acima de 100 linhas, mantendo `<table>` semântica (linhas espaçadoras, `aria-rowindex`, `aria-sort`).
- **Code splitting por rota** — Recharts só é baixado no dashboard.

## Rodando localmente

Pré-requisitos: **Node.js 22+** e npm. Não é preciso banco de dados, credenciais nem arquivo `.env`.

```bash
git clone https://github.com/MaatheusPolli/order-pulse.git
cd order-pulse
npm install
npm run dev        # Vite em http://localhost:5173 + mock server Fastify em :3333
```

Alternativa sem servidor: `npm run dev:msw` sobe só o Vite, com a API rodando no service worker do navegador (igual à demo publicada).

Os dados são gerados na inicialização com seed fixa, com data de referência em 30/09/2026: todo mundo vê os mesmos 1.500 pedidos. Reprocessamentos ficam em memória e somem ao reiniciar o servidor ou recarregar a demo.

### Variáveis de ambiente (opcionais)

| Variável | Padrão | Uso |
|---|---|---|
| `PORT` | `3333` | porta do mock server Fastify |
| `MOCK_LATENCY` | `350` | latência artificial do mock server em ms (`0` desliga) |
| `VITE_API_URL` | `/api` | URL base da API consumida pelo front |
| `VITE_BASE` | `/` | caminho base do build (ex.: `/order-pulse/` no GitHub Pages) |

| Script | |
|---|---|
| `npm run build` / `npm run build:demo` | build de produção / build com API mockada no navegador |
| `npm run lint`, `npm run typecheck` | ESLint (sem `any`) e TypeScript estrito |
| `npm test`, `npm run test:coverage` | Vitest + Testing Library + MSW |
| `npm run test:e2e` | Playwright (faz o build de demo e sobe o preview) |
| `npm run analyze:size` | mede o bundle inicial e falha acima de 200 KB gzip |

Prints e GIF: `npm run build:demo && npm run preview`, depois `node scripts/capture-demo.mjs /tmp/frames && python3 scripts/make-gif.py /tmp/frames docs/demo.gif`.

### API do mock

| Método | Rota | |
|---|---|---|
| GET | `/api/orders?page&pageSize&sort&dir&q&channel&status&from&to&minTotal&maxTotal` | envelopes com o payload bruto de cada canal |
| GET | `/api/orders/:id` | um envelope |
| GET | `/api/failures` | pedidos com erro de sincronização |
| POST | `/api/failures/:id/reprocess` | 200 para erros transitórios; 422 para erros de dados; 409 se já sincronizado |
| GET | `/api/metrics?days=7\|30\|90` | KPIs, período anterior, série diária e agregados por canal/status |

## Testes

- **Mappers** — uma fixture por canal no formato real (anonimizada) → `Order` esperado, mais tabelas de todos os status de cada canal.
- **Mock server** — determinismo do gerador, consistência de totais/linha do tempo, filtros, ordenação, reprocessamento e métricas.
- **Componentes/fluxos** (Testing Library + MSW) — skeleton some após carregar, filtro altera a URL e refaz a query, busca com debounce, estados vazio e de erro, virtualização, detalhe e voltar com filtros, reprocessar otimista com sucesso e com rollback (MSW respondendo 500), dashboard e visão em tabela.
- **E2E** (Playwright) — filtrar → detalhe → voltar mantendo filtros; 1.000 linhas com scroll; reprocessar falha; payload; dashboard com tooltip e tema persistido.
- **Acessibilidade** — `axe` em todas as rotas, tema claro e escuro, desktop e mobile, sem violações sérias ou críticas.

A CI (`.github/workflows/ci.yml`) roda lint, typecheck, testes com cobertura, orçamento de bundle, E2E e Lighthouse CI.

## Metas do planejamento

| Meta | Resultado medido |
|---|---|
| Lighthouse ≥ 90 em Performance e Acessibilidade | Dashboard 94/100 · Pedidos 94/100 · Falhas 93/100 (mobile simulado, build de demo com MSW) |
| 1.000 linhas sem travar | virtualização: ~25 linhas no DOM de 1.000 |
| Bundle inicial < 200 KB gzip | 90,7 KB |
| Cobertura ≥ 80% | 97% de linhas (89 testes) |
| E2E dos 3 fluxos principais | 24 testes (fluxos + axe) |

## Deploy

`.github/workflows/deploy.yml` publica o build de demo no GitHub Pages a cada push na `master` (ative **Settings → Pages → Source: GitHub Actions**). A API roda no service worker, então o site é 100% estático; `404.html` faz o fallback de SPA.

## Fora de escopo

Integração real com os marketplaces (exige credenciais) e autenticação (o usuário é simulado). Todos os nomes, documentos e endereços são fictícios.

## Status

Implementado (dashboard, pedidos, detalhe e saúde da integração, com testes unitários, de componente e E2E).

Pendências conhecidas:

- Lighthouse ≥ 90 comprovado
- deploy público no GitHub Pages
- GIF do painel

## Licença

Este projeto usa **licença dupla**. O texto completo está em [LICENSE](LICENSE).

- **Uso pessoal, educacional e não comercial:** livre, nos termos da licença MIT (mantenha o aviso de copyright).
- **Uso comercial:** exige licença comercial. Isso inclui usar em produto ou serviço comercial, vender acesso ou derivados, usar em atividades com fins lucrativos e implantar em empresas.

Contato para licença comercial: ma.polli@hotmail.com
