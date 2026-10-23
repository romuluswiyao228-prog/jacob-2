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
  badge?: "new" | "sale" | "soldout" | null;
  isSoldOut?: boolean;
  isFavorite?: boolean;
}

export interface ProductCardProps {
  product: ProductCardData;
  onSizeSelect?: (productId: string, size: string) => void;
  selectedSize?: string;
  onToggleFavorite?: (productId: string) => void;
}
