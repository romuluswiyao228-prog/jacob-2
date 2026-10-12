# Audit du projet — Phase 1

## État initial

Le dépôt est un starter Node.js vierge : `index.js` (un `console.log`),
`package.json` sans dépendances, `.bolt/config.json` indiquant le template
`node`. Aucun framework frontend, aucune migration, aucune table en base.

Le projet Supabase est provisionné mais vide (0 table, 0 migration).

## Décision

L'application cible étant une boutique e-commerce (JACOB DE JESUS) avec
front-end React/Vite, authentification, catalogue, panier, commandes et
back-office admin, le starter Node actuel n'apporte rien de réutilisable.

## Arborescence cible

```
src/
  features/          — logique métier par domaine (catalog, cart, checkout,
                       account, admin, favorites, contact, style-finder)
  components/         — composants UI partagés (Button, Card, Modal, etc.)
  lib/                — client Supabase, helpers, types générés
  routes/             — pages correspondant à la carte des routes
supabase/
  migrations/         — migrations SQL numérotées (appliquées via MCP)
  seed/               — données initiales et script owner
  tests/              — tests RLS
  functions/          — Edge Functions (phases ultérieures)
docs/                 — documentation de conception (audit, routes, RLS, schéma)
```

## Ce qui doit changer

- Remplacer `index.js` par un projet Vite + React + TypeScript (phase 2).
- Supprimer `package.json` du starter pour le remplacer par celui du projet
  Vite (phase 2). Rien n'est supprimé en phase 1.

## Ce qui reste à configurer

- URL et clés Supabase : déjà provisionnées dans `.env`.
- Aucune clé secrète dans le dépôt (un `.env.example` sera fourni sans secret).
