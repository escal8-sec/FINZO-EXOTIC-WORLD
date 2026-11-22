import { Product, ProductVariant } from '../types';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return inrFormatter.format(safe);
}

export function getEffectiveProductPrice(
  product: Pick<Product, 'price' | 'discountedPrice'>,
  variant?: Pick<ProductVariant, 'price'>
): { currentPrice: number; originalPrice?: number; hasDiscount: boolean } {
  const baseVariantPrice = variant ? variant.price : product.price;
  const hasDiscount =
    typeof product.discountedPrice === 'number' &&
    product.discountedPrice >= 0 &&
    product.discountedPrice < product.price &&
    product.price > 0;

  if (!hasDiscount) {
    return {
      currentPrice: Math.round(baseVariantPrice),
      hasDiscount: false,
    };
  }

  const ratio = (product.discountedPrice as number) / product.price;
  const discountedVariantPrice = variant
    ? Math.round(baseVariantPrice * ratio)
    : Math.round(product.discountedPrice as number);

  return {
    currentPrice: discountedVariantPrice,
    originalPrice: Math.round(baseVariantPrice),
    hasDiscount: discountedVariantPrice < baseVariantPrice,
  };
}
