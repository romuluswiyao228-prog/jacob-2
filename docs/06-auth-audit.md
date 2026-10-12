# Audit de sécurité — Authentification et rôles (Phase 2, Étape 2.1)

## Périmètre
Relire les migrations de la phase 1 et vérifier l'absence de vecteurs
d'élévation de privilège ou de contournement de rôle.

## Vérifications

### 1. handle_new_user() — rôle en dur, jamais depuis user_metadata

**Ligne 74** : `VALUES (NEW.id, 'customer'::app_role)` — le rôle est
hardcodé `'customer'`. La fonction ne lit JAMAIS `raw_user_meta_data`
pour décider d'un rôle. La seule utilisation de `raw_user_meta_data`
(ligne 69) concerne `full_name` pour le profil, pas le rôle.

**Verdict** : conforme. Un utilisateur qui met `role = 'owner'` dans
ses métadonnées d'inscription reste `customer`.

### 2. is_admin() — SECURITY DEFINER, search_path fixé, lit user_roles uniquement

**Lignes 26-38** : `SECURITY DEFINER`, `SET search_path = public, pg_temp`,
lit uniquement `public.user_roles` avec `auth.uid()`. Aucune entrée
utilisateur n'influence le résultat.

**Migration 011** : REVOKE FROM PUBLIC, GRANT à authenticated.
**Migration 012** : REVOKE FROM authenticated → casse les politiques RLS.
**Migration 013** : restaure GRANT à authenticated (correction appliquée).

**Verdict** : conforme. La fonction ne peut pas être contournée.

### 3. user_roles — aucune politique d'écriture client

**Migration 005, lignes 65-68** : seule une politique SELECT existe
(`auth.uid() = user_id OR is_admin()`). Aucune politique INSERT, UPDATE
ou DELETE. Les rôles sont gérés par :
- `handle_new_user()` (trigger, crée `customer`)
- `create_owner.sql` (script manuel, service_role)
- `service_role` (Edge Functions)

**Verdict** : conforme. Aucun client ne peut écrire dans user_roles.

### 4. Aucune fonction n'accepte un rôle ou user_id client

- `is_admin()` : aucun paramètre, utilise `auth.uid()`.
- `handle_new_user()` : trigger, pas d'entrée client.
- `next_order_number()` : aucun paramètre, aucune logique de rôle.

**Verdict** : conforme.

### 5. create_owner.sql — pas de protection anti-double owner

**Problème trouvé** : le script ne vérifie pas s'il existe déjà un
owner avant d'en attribuer un nouveau. Il n'écrit pas non plus dans
`admin_audit_log`.

**Correction** : migration 014 — script révisé avec garde anti-double
owner et insertion dans admin_audit_log.

### 6. Profils — colonnes modifiables

**Migration 005, ligne 56** : `update_own_profile` permet à
l'utilisateur de modifier toute sa ligne. RLS contrôle quelles lignes,
mais pas quelles colonnes. Un client pourrait tenter de modifier `email`
ou `created_at`.

**Correction** : migration 014 — ajout d'un trigger `protect_profile_columns`
qui empêche la modification de `id`, `email`, `created_at`, `updated_at`
depuis le client (seul le service_role peut les modifier).

## Résumé

| Point | Statut | Action |
|---|---|---|
| handle_new_user rôle en dur | Conforme | — |
| is_admin SECURITY DEFINER + search_path | Conforme | — |
| is_admin executable par authenticated | Corrigé (migration 013) | — |
| user_roles sans écriture client | Conforme | — |
| Aucune fonction avec rôle/user_id client | Conforme | — |
| create_owner.sql anti-double + audit log | Non conforme | Migration 014 |
| Profils — colonnes protégées | Non conforme | Migration 014 |
