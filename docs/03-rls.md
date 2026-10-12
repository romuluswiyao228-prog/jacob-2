# Politiques RLS — Documentation

## Vue d'ensemble

RLS (Row Level Security) est activé sur **100 % des tables**. Aucune table
n'est accessible sans politique explicite.

### Rôles

| Rôle | Description |
|---|---|
| `anon` | Utilisateur non authentifié (visiteur du site) |
| `authenticated` | Utilisateur connecté (client ou admin) |
| `service_role` | Edge Functions uniquement (bypass RLS) |

### Fonction `is_admin()`

SECURITY DEFINER, search_path fixé (`public, pg_temp`). Vérifie si
l'utilisateur courant a le rôle `owner` dans `user_roles`.

---

## Tables publiques (catalogue)

### categories
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Public (anon + authenticated) | `is_active = true` |
| SELECT | Admin | `is_admin()` |
| INSERT / UPDATE / DELETE | Admin | `is_admin()` |

### products
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Public | `is_archived = false` |
| SELECT | Admin | `is_admin()` |
| INSERT / UPDATE / DELETE | Admin | `is_admin()` |

**Justification** : les produits archivés ne sont pas visibles publiquement pour ne pas casser l'historique des commandes tout en masquant les produits obsolètes.

### product_variants
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Public | produit parent non archivé |
| SELECT | Admin | `is_admin()` |
| INSERT / UPDATE / DELETE | Admin | `is_admin()` |

### product_images
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Public | produit parent non archivé |
| SELECT | Admin | `is_admin()` |
| INSERT / UPDATE / DELETE | Admin | `is_admin()` |

### collections
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Public | `is_active = true` |
| SELECT | Admin | `is_admin()` |
| INSERT / UPDATE / DELETE | Admin | `is_admin()` |

### collection_products
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Public | `true` (jointure, pas de données sensibles) |
| INSERT / UPDATE / DELETE | Admin | `is_admin()` |

### store_settings
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Public | `true` (coordonnées et textes légaux publics) |
| UPDATE | Admin | `is_admin()` |
| INSERT / DELETE | — | Non autorisé (une seule ligne gérée par seed) |

---

## Tables utilisateur

### profiles
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Propriétaire ou Admin | `auth.uid() = id` ou `is_admin()` |
| INSERT | Propriétaire | `auth.uid() = id` (aussi via trigger) |
| UPDATE | Propriétaire | `auth.uid() = id` |
| DELETE | — | Non autorisé (cycle de vie géré par auth.users) |

### user_roles
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Propriétaire ou Admin | `auth.uid() = user_id` ou `is_admin()` |
| INSERT / UPDATE / DELETE | — | **Aucune écriture depuis le client** |

**Justification** : les rôles sont gérés uniquement par le trigger `handle_new_user()` (customer à l'inscription), le script manuel `create_owner.sql` (owner), et le `service_role`. Aucun client ne peut s'attribuer le rôle owner.

### carts
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Propriétaire ou Admin | `auth.uid() = user_id` ou `is_admin()` |
| INSERT / UPDATE / DELETE | Propriétaire | `auth.uid() = user_id` |

### cart_items
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Propriétaire (via panier parent) ou Admin | `carts.user_id = auth.uid()` ou `is_admin()` |
| INSERT / UPDATE / DELETE | Propriétaire (via panier parent) | `carts.user_id = auth.uid()` |

### addresses
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Propriétaire ou Admin | `auth.uid() = user_id` ou `is_admin()` |
| INSERT / UPDATE / DELETE | Propriétaire | `auth.uid() = user_id` |

### favorites
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Propriétaire ou Admin | `auth.uid() = user_id` ou `is_admin()` |
| INSERT / DELETE | Propriétaire | `auth.uid() = user_id` |

### contact_messages
| Opération | Accès | Condition |
|---|---|---|
| INSERT | Public (anon + authenticated) | `true` (avec limitation de débit à la phase 8) |
| SELECT | Admin | `is_admin()` |
| UPDATE / DELETE | Admin | `is_admin()` |

### promotions
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Public | `is_active = true` |
| SELECT | Admin | `is_admin()` |
| INSERT / UPDATE / DELETE | Admin | `is_admin()` |

---

## Tables de commandes

### orders
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Propriétaire ou Admin | `auth.uid() = user_id` ou `is_admin()` |
| INSERT / UPDATE / DELETE | Admin | `is_admin()` (création via Edge Function en phase 4) |

**Justification** : les invités n'ont aucun accès direct aux tables de commandes. L'accès se fera via Edge Function avec `guest_token` (phases suivantes). Le client ne peut pas modifier le statut, les totaux ou les montants d'une commande.

### order_items
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Propriétaire (via commande parent) ou Admin | `orders.user_id = auth.uid()` ou `is_admin()` |
| INSERT / UPDATE / DELETE | Admin | `is_admin()` |

### order_status_history
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Propriétaire (via commande parent) ou Admin | `orders.user_id = auth.uid()` ou `is_admin()` |
| INSERT | Admin | `is_admin()` |

### payments
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Propriétaire (via commande parent) ou Admin | `orders.user_id = auth.uid()` ou `is_admin()` |
| INSERT / UPDATE / DELETE | — | **Aucune écriture depuis le client** (service_role uniquement) |

**Justification** : les écritures de paiement restent réservées au `service_role` côté Edge Functions. Aucune colonne de numéro de carte ni de CVV dans la table.

### shipping_zones
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Public | `is_active = true` |
| SELECT | Admin | `is_admin()` |
| INSERT / UPDATE / DELETE | Admin | `is_admin()` |

### shipping_rates
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Public | zone parent active |
| SELECT | Admin | `is_admin()` |
| INSERT / UPDATE / DELETE | Admin | `is_admin()` |

### shipments
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Propriétaire (via commande parent) ou Admin | `orders.user_id = auth.uid()` ou `is_admin()` |
| INSERT / UPDATE / DELETE | Admin | `is_admin()` |

### stock_reservations
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Admin | `is_admin()` |
| INSERT / UPDATE / DELETE | — | **Aucun accès client** (service_role uniquement) |

### admin_audit_log
| Opération | Accès | Condition |
|---|---|---|
| SELECT | Admin | `is_admin()` |
| INSERT / UPDATE / DELETE | — | **Aucun accès client** (service_role uniquement) |

---

## Stockage (Storage)

### Bucket `product-images`
| Opération | Accès | Condition |
|---|---|---|
| SELECT (lecture) | Public | `bucket_id = 'product-images'` |
| INSERT / UPDATE / DELETE | Admin | `is_admin()` |

### Bucket `store-assets`
| Opération | Accès | Condition |
|---|---|---|
| SELECT (lecture) | Public | `bucket_id = 'store-assets'` |
| INSERT / UPDATE / DELETE | Admin | `is_admin()` |
