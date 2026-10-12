# Schéma de la base de données — Diagramme des relations

```mermaid
erDiagram
    auth_users ||--|| profiles : "1 profil par utilisateur"
    auth_users ||--|| user_roles : "1 rôle par utilisateur"
    auth_users ||--o{ carts : "possède"
    auth_users ||--o{ addresses : "possède"
    auth_users ||--o{ favorites : "possède"
    auth_users ||--o{ orders : "passe"
    auth_users ||--o{ admin_audit_log : "effectue"

    categories ||--o{ products : "contient"
    products ||--o{ product_variants : "décline en"
    products ||--o{ product_images : "illustré par"
    products ||--o{ favorites : "favori de"
    products ||--o{ collection_products : "dans"
    collections ||--o{ collection_products : "contient"

    carts ||--o{ cart_items : "contient"
    product_variants ||--o{ cart_items : "dans"
    product_variants ||--o{ stock_reservations : "réservé dans"

    orders ||--o{ order_items : "contient"
    orders ||--o{ order_status_history : "historique"
    orders ||--o{ payments : "payé par"
    orders ||--o{ shipments : "expédié via"
    orders ||--o{ stock_reservations : "réserve"
    orders }o--|| promotions : "optionnellement"

    products ||--o{ order_items : "instantané dans"
    product_variants ||--o{ order_items : "instantané dans"

    shipping_zones ||--o{ shipping_rates : "tarifs de"
    shipping_zones ||--o{ shipments : "zone de"

    profiles {
        uuid id PK
        text email
        text full_name
        text phone
        text avatar_url
        timestamptz created_at
        timestamptz updated_at
    }

    user_roles {
        uuid user_id PK
        app_role role
        timestamptz created_at
        timestamptz updated_at
    }

    categories {
        uuid id PK
        text name
        text slug UK
        text description
        int sort_order
        boolean is_active
    }

    products {
        uuid id PK
        text name
        text slug UK
        text description
        bigint price
        text currency
        uuid category_id FK
        boolean is_archived
        boolean is_featured
    }

    product_variants {
        uuid id PK
        uuid product_id FK
        text size
        text color
        text sku UK
        int stock
        bigint price
    }

    product_images {
        uuid id PK
        uuid product_id FK
        text url
        text alt_text
        int sort_order
        boolean is_primary
    }

    collections {
        uuid id PK
        text name
        text slug UK
        text description
        text image_url
        boolean is_active
    }

    collection_products {
        uuid collection_id PK FK
        uuid product_id PK FK
        int sort_order
    }

    carts {
        uuid id PK
        uuid user_id FK
        text status
    }

    cart_items {
        uuid id PK
        uuid cart_id FK
        uuid variant_id FK
        int quantity
        bigint unit_price
    }

    addresses {
        uuid id PK
        uuid user_id FK
        text label
        text first_name
        text last_name
        text line1
        text city
        text country
        boolean is_default
    }

    favorites {
        uuid id PK
        uuid user_id FK
        uuid product_id FK
    }

    contact_messages {
        uuid id PK
        text name
        text email
        text subject
        text message
        boolean is_read
    }

    store_settings {
        uuid id PK
        text store_name
        text email
        text phone
        text address
        text currency
        jsonb social_links
        text legal_mentions
        text cgv
        text privacy_policy
    }

    promotions {
        uuid id PK
        text code UK
        text discount_type
        bigint discount_value
        int max_uses
        int used_count
        boolean is_active
    }

    orders {
        uuid id PK
        text order_number UK
        uuid user_id FK
        text guest_token
        order_status status
        bigint subtotal
        bigint shipping_total
        bigint discount_total
        bigint total
        text currency
    }

    order_items {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        uuid variant_id FK
        text product_name
        bigint unit_price
        int quantity
        text size
        text color
        bigint line_total
    }

    order_status_history {
        uuid id PK
        uuid order_id FK
        order_status status
        uuid changed_by FK
        text note
    }

    payments {
        uuid id PK
        uuid order_id FK
        text provider
        payment_method method
        text provider_reference
        text idempotency_key UK
        bigint amount
        payment_status status
        jsonb raw_event
    }

    shipping_zones {
        uuid id PK
        text name
        text[] countries
        boolean is_active
    }

    shipping_rates {
        uuid id PK
        uuid zone_id FK
        text name
        int min_weight_g
        int max_weight_g
        bigint price
    }

    shipments {
        uuid id PK
        uuid order_id FK
        uuid zone_id FK
        text carrier
        text tracking_number
        shipment_status status
    }

    stock_reservations {
        uuid id PK
        uuid variant_id FK
        uuid order_id FK
        int quantity
        timestamptz expires_at
    }

    admin_audit_log {
        uuid id PK
        uuid admin_id FK
        text action
        text table_name
        text record_id
        jsonb old_values
        jsonb new_values
    }
```
