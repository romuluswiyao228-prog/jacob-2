# Carte des pages et navigation — JACOB DE JESUS

| Route | Page | Accès | Données lues |
|---|---|---|---|
| `/` | Accueil | Public | Produits vedettes, catégories, collections, store_settings |
| `/catalogue` | Catalogue | Public | products, product_variants, categories, collections |
| `/catalogue/:categorySlug` | Catégorie | Public | products (filtrés par catégorie), categories |
| `/produit/:slug` | Fiche produit | Public | products, product_variants, product_images, categories, collections |
| `/panier` | Panier | Public (client ou invité) | cart_items + cart (si connecté) |
| `/commande` | Tunnel de commande | Client connecté | addresses, shipping_zones, shipping_rates, promotions |
| `/commande/confirmation/:orderNumber` | Confirmation | Client / invité (avec token) | orders, order_items, payments, shipments |
| `/compte` | Compte — profil | Client connecté | profiles, user_roles |
| `/compte/commandes` | Historique des commandes | Client connecté | orders, order_items, shipments, payments |
| `/compte/adresses` | Adresses | Client connecté | addresses |
| `/compte/favoris` | Favoris | Client connecté | favorites, products |
| `/trouve-ton-style` | Trouve ton style | Public | categories, products (selon quiz) |
| `/notre-boutique` | Notre boutique | Public | store_settings, collections |
| `/contact` | Contact | Public | store_settings (coordonnées) |
| `/mentions-legales` | Mentions légales | Public | store_settings (textes légaux) |
| `/cgv` | CGV | Public | store_settings |
| `/politique-confidentialite` | Politique de confidentialité | Public | store_settings |
| `/404` | Page introuvable | Public | — |
| `/admin` | Tableau de bord admin | Admin | orders (stats), products (stats), store_settings |
| `/admin/produits` | Gestion du catalogue | Admin | products, product_variants, product_images, categories |
| `/admin/produits/:id` | Détail / édition produit | Admin | products, product_variants, product_images |
| `/admin/categories` | Gestion des catégories | Admin | categories |
| `/admin/collections` | Gestion des collections | Admin | collections, collection_products |
| `/admin/commandes` | Liste des commandes | Admin | orders, order_items, payments, shipments |
| `/admin/commandes/:id` | Détail commande | Admin | orders, order_items, payments, shipments, order_status_history |
| `/admin/clients` | Liste des clients | Admin | profiles, orders |
| `/admin/paiements` | Paiements | Admin | payments, orders |
| `/admin/stock` | Gestion du stock | Admin | product_variants, stock_reservations |
| `/admin/livraison` | Zones et tarifs | Admin | shipping_zones, shipping_rates, shipments |
| `/admin/promotions` | Promotions | Admin | promotions |
| `/admin/messages` | Messages de contact | Admin | contact_messages |
| `/admin/parametres` | Réglages de la boutique | Admin | store_settings |
| `/admin/journal` | Journal d'audit | Admin | admin_audit_log |
