# PromoSnap

Comparador de precos brasileiro. Monitora marketplaces, compara ofertas e mostra historico real de preco.

## Stack

- **Framework:** Next.js 15 (App Router, Server Components, Turbopack)
- **UI:** Tailwind CSS 3 + design system customizado (light sportsbook theme)
- **DB:** PostgreSQL (Neon) via Prisma ORM
- **Cache:** Redis (ioredis) com TTL 5min para buscas
- **Charts:** Recharts
- **Icons:** Lucide React
- **Fonts:** Plus Jakarta Sans (display) + Inter (body)
- **Analytics:** GA4 (via NEXT_PUBLIC_GA_ID)

## Setup Local

```bash
git clone <repo>
cd promosnap
npm install

# Copie e configure variaveis de ambiente
cp .env.example .env.local
# Edite DATABASE_URL, ML_CLIENT_ID, ML_CLIENT_SECRET, etc.

# Gerar Prisma client e criar tabelas
npx prisma generate
npx prisma db push

# Rodar seed (107 produtos reais)
npm run dev
# Em outro terminal ou navegador:
curl -X POST http://localhost:3000/api/admin/seed

# Dev server
npm run dev
```

## Setup Vercel

1. Conecte o repo no Vercel
2. Variaveis de ambiente necessarias:
   - `DATABASE_URL` — string de conexao Neon PostgreSQL
   - `NEXT_PUBLIC_GA_ID` — Google Analytics 4 ID (opcional)
   - `ADMIN_SECRET` — segredo para rotas admin (opcional)
   - `ML_CLIENT_ID` / `ML_CLIENT_SECRET` — credenciais ML OAuth
   - `ML_REDIRECT_URI` — URL de callback OAuth
3. Build command: `prisma generate && next build` (ja configurado)
4. Deploy automatico via push para main

## Setup Neon

1. Crie um projeto em neon.tech
2. Copie a connection string para DATABASE_URL
3. Rode `npx prisma db push` para criar tabelas
4. Rode o seed via POST /api/admin/seed

## Setup ML OAuth

1. Crie app em developers.mercadolivre.com.br
2. Configure ML_CLIENT_ID, ML_CLIENT_SECRET, ML_REDIRECT_URI
3. Acesse /api/auth/ml para iniciar o fluxo OAuth
4. Token eh salvo automaticamente e renovado

## Ingestao

- **Seed:** POST /api/admin/seed — popula banco com 107 produtos reais
- **Ingest manual:** Admin > Ingestao — cole IDs ou URLs do Mercado Livre
- **API:** POST /api/admin/ingest com body { ids: [...] }

## Admin

Acesse /admin para o painel administrativo:
- **Dashboard:** metricas reais (listings, offers, clickouts, fontes)
- **Produtos:** tabela com busca, paginacao, ordenacao
- **Ofertas:** ofertas ativas com score e affiliate URL
- **Fontes:** status de cada marketplace monitorado
- **Jobs:** historico de jobs de ingestao/repricing
- **Ingestao:** ferramenta para ingerir produtos via ID/URL

## Clickout Tracking

Todos os cliques em "Ver Oferta" passam por /api/clickout/[offerId]:
1. Registra o clickout (offerId, source, referrer, userAgent, session)
2. Redireciona 302 para a affiliate URL
3. Fire-and-forget — nao bloqueia o redirect

## Offer Score

Formula (0-100) com pesos:
- **Desconto (35%):** diferenca vs original, vs media 30d, vs media 90d, menor historico
- **Popularidade (25%):** reviews, rating, vendas estimadas
- **Confiabilidade (15%):** confianca da fonte
- **Frescor (15%):** tempo desde ultima atualizacao
- **Bonus (10%):** frete gratis, cupom

Badges automaticos: Oferta Quente (score >= 80), Frete Gratis, Mais Vendido (5k+ vendas), XX% OFF (desconto >= 40%)

## Paginas

| Rota | Descricao |
|------|-----------|
| `/` | Homepage com rails reais (ofertas, menor preco, mais vendidos) |
| `/ofertas` | Grid de ofertas quentes |
| `/menor-preco` | Maior desconto historico |
| `/mais-vendidos` | Produtos mais populares |
| `/busca?q=...` | Busca full-text com filtros, ordenacao, paginacao |
| `/produto/[slug]` | Detalhe: comparador, grafico, similares, share |
| `/categoria/[slug]` | Produtos por categoria |
| `/marca/[slug]` | Produtos por marca |
| `/melhores/[slug]` | Guias curados (smartphones, notebooks, etc.) |
| `/cupons` | Cupons ativos com filtro por fonte |
| `/sobre` | Sobre o PromoSnap |
| `/lojas` | Lojas parceiras |
| `/admin` | Painel administrativo |

## Limitacoes Atuais do ML

- OAuth token expira a cada 6h e precisa refresh
- API publica tem rate limits
- Busca retorna ate 50 resultados por query
- Imagens do ML podem ter CORS em alguns contextos
- Dados de vendas sao estimados (nao oficiais)

## Scripts

```bash
npm run dev          # Dev com Turbopack
npm run build        # Build producao
npm run start        # Start producao
npm run lint         # ESLint
npm run db:generate  # Gerar Prisma client
npm run db:push      # Sync schema com banco
npm run db:seed      # Seed via CLI
npm run db:studio    # Prisma Studio (GUI)
npm run db:migrate   # Criar migration
```

## Proximas Fases

- Integracao real com Amazon, Shopee, Shein (adapters prontos, falta credencial)
- Alertas de preco por email/push
- Jobs automaticos de ingestao e repricing (cron)
- PWA completo com icones e splash screen
- Testes automatizados (unit + e2e)
- Rate limiting nas APIs publicas
- CDN proprio para imagens de produto
- Dashboard de analytics mais detalhado
