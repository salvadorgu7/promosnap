# Architecture Decision Records

## ADR-001: Discovery via Highlights (not /search)

Mercado Livre's `/search` API is restricted and returns 403 for most app credentials. We use the public `/highlights` endpoint to discover trending products, then hydrate each via `/products/{id}/items` for pricing and offer data. This avoids API blocks while still building a real catalog from ML data.

## ADR-002: Origin Tracking (seed vs imported)

Every product carries an `originType` field (`seed`, `imported`, `manual`, `curated`) and an optional `discoverySource` to trace how it entered the catalog. This lets the admin dashboard distinguish real marketplace data from placeholder seeds, and enables quality metrics per origin over time.

## ADR-003: Source Adapter Pattern

All marketplace integrations implement the `SourceAdapter` interface from `lib/adapters/types.ts`. Each adapter exposes `isConfigured()`, `search()`, `getProduct()`, and optional capabilities like `syncFeed()`. This pattern allows adding new sources (Amazon, Shopee, etc.) without modifying core import logic.

## ADR-004: Feature Flags via Environment Variables

Feature flags are simple boolean env vars (`FF_AUTO_DISCOVERY`, `FF_PRICE_ALERTS`, etc.) read at runtime via `lib/config/feature-flags.ts`. We chose env vars over a database-backed system for deployment simplicity on Vercel, where env changes trigger redeployment automatically. A more sophisticated flag system can be added later if segmented rollouts are needed.
