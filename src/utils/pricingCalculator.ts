import { ProductCategory } from '../types';

export const CATEGORY_COMMISSION_RATES: Record<ProductCategory, number> = {
  'Phones & Tablets': 0.10, // 10%
  'Electronics & Audio': 0.12, // 12%
  'Supermarket & Groceries': 0.08, // 8%
  'Fashion & Apparel': 0.15, // 15%
  'Home & Appliances': 0.12, // 12%
  'Health & Beauty': 0.15, // 15%
  'Computing & IT': 0.10, // 10%
  'Sports & Outdoors': 0.12, // 12%
};

export const DEFAULT_SHIPPING_CONTRIBUTION_UGX = 3000;

export interface PricingCalculationResult {
  basePriceUGX: number; // What the seller requests to receive
  shippingContributionUGX: number;
  commissionRate: number; // e.g. 0.12
  commissionRatePercent: number; // e.g. 12
  commissionAmountUGX: number;
  listingPriceUGX: number; // Final customer price
  netSellerPayoutUGX: number; // What seller gets upon sale
}

/**
 * Calculates the customer listing price based on:
 * Listing Price = (Base Price + Shipping Contribution) / (1 - Platform Commission Rate)
 */
export function calculateListingPrice(
  basePriceUGX: number,
  category: ProductCategory = 'Phones & Tablets',
  customShippingContribution: number = DEFAULT_SHIPPING_CONTRIBUTION_UGX
): PricingCalculationResult {
  const safeBasePrice = Math.max(0, Number(basePriceUGX) || 0);
  const commissionRate = CATEGORY_COMMISSION_RATES[category] ?? 0.12;
  const shippingFee = safeBasePrice > 0 ? customShippingContribution : 0;

  if (safeBasePrice === 0) {
    return {
      basePriceUGX: 0,
      shippingContributionUGX: 0,
      commissionRate,
      commissionRatePercent: Math.round(commissionRate * 100),
      commissionAmountUGX: 0,
      listingPriceUGX: 0,
      netSellerPayoutUGX: 0,
    };
  }

  // Exact formula
  const rawListingPrice = (safeBasePrice + shippingFee) / (1 - commissionRate);
  
  // Round to nearest 500 UGX increment for professional retail display
  const roundedListingPrice = Math.ceil(rawListingPrice / 500) * 500;
  
  const commissionAmount = Math.round(roundedListingPrice * commissionRate);
  const netSellerPayout = safeBasePrice;

  return {
    basePriceUGX: safeBasePrice,
    shippingContributionUGX: shippingFee,
    commissionRate,
    commissionRatePercent: Math.round(commissionRate * 100),
    commissionAmountUGX: commissionAmount,
    listingPriceUGX: roundedListingPrice,
    netSellerPayoutUGX: netSellerPayout,
  };
}

export const calculatePricing = calculateListingPrice;

/**
 * Reverse calculation: Given a retail listing price, compute estimated seller payout
 */
export function reverseCalculatePayout(
  listingPriceUGX: number,
  category: ProductCategory = 'Phones & Tablets',
  shippingContribution: number = DEFAULT_SHIPPING_CONTRIBUTION_UGX
): {
  basePriceUGX: number;
  commissionAmountUGX: number;
  shippingContributionUGX: number;
} {
  const safePrice = Math.max(0, Number(listingPriceUGX) || 0);
  const commissionRate = CATEGORY_COMMISSION_RATES[category] ?? 0.12;
  const commissionAmount = Math.round(safePrice * commissionRate);
  const shippingFee = safePrice > 0 ? shippingContribution : 0;
  const basePrice = Math.max(0, safePrice - commissionAmount - shippingFee);

  return {
    basePriceUGX: basePrice,
    commissionAmountUGX: commissionAmount,
    shippingContributionUGX: shippingFee,
  };
}

