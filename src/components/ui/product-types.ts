export interface ProductCardData {
  id: string;
  name: string;
  reference: string;
  price: number;
  originalPrice?: number | null;
  image: string;
  imageAlt?: string;
  sizes: string[];
  badge?: "new" | "sale" | "soldout" | null;
  isSoldOut?: boolean;
}

export interface ProductCardProps {
  product: ProductCardData;
  onSizeSelect?: (productId: string, size: string) => void;
  selectedSize?: string;
}
