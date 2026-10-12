export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  currency: string;
  category_id: string | null;
  is_archived: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
}

export interface ProductWithImage extends Product {
  primary_image: ProductImage | null;
  category: { name: string; slug: string } | null;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  currency: string;
  social_links: Record<string, string>;
  legal_mentions: string | null;
  cgv: string | null;
  privacy_policy: string | null;
  about_text: string | null;
  announcement_text: string | null;
  whatsapp_number: string | null;
}

export interface PublicStoreSettings {
  store_name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  currency: string;
  social_links: Record<string, string>;
  about_text: string | null;
  announcement_text: string | null;
  whatsapp_number: string | null;
}

export interface BestSeller {
  product_id: string;
  total_sold: number;
  name: string;
  slug: string;
  price: number;
  currency: string;
  is_featured: boolean;
}
