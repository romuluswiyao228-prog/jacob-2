export interface ProductCardVariant {
  id: string;
  size: string | null;
  color: string | null;
  sku?: string;
  stock: number;
  price?: number | null;
  currency?: string;
}

export interface ProductCardData {
  id: string;
  slug?: string;
  name: string;
  reference: string;
  price: number;
  currency?: string;
  originalPrice?: number | null;
  image: string;
  imageAlt?: string;
  secondaryImage?: string | null;
  sizes?: string[];
  colors?: string[];
  badge?: "new" | "sale" | "soldout" | null;
  isSoldOut?: boolean;
  isFavorite?: boolean;
  variants?: ProductCardVariant[];
  createdAt?: string;
}

export interface ProductCardProps {
  product: ProductCardData;
  onSizeSelect?: (productId: string, size: string) => void;
  selectedSize?: string;
  onToggleFavorite?: (productId: string) => void;
  revealDelay?: number;
}
