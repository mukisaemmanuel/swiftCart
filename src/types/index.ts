export type UserRole =
  | 'BUYER'
  | 'SELLER'
  | 'ADMIN'
  | 'SUPER_ADMIN'
  | 'buyer'
  | 'seller'
  | 'admin'
  | 'super_admin';

export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export interface NotificationPreferences {
  orderUpdates: boolean;
  sellerNewOrders: boolean;
  promotions: boolean;
  pushEnabled: boolean;
}

export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;
  avatarUrl?: string;
  password?: string;
  notificationPreferences?: NotificationPreferences;
}

export type SellerApplicationStatus =
  | 'INVITED'
  | 'DOCUMENTS_SUBMITTED'
  | 'VERIFIED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PENDING_REVIEW'
  | 'PENDING'; // backwards compatible

export interface DirectSellerIntakeInput {
  fullName: string;
  shopName: string;
  phoneNumber: string;
  category: ProductCategory;
  location: string;
  adminNotes?: string;
}

export interface SellerInviteToken {
  token: string;
  applicationId: string;
  phone: string;
  storeName: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  isUsed: boolean;
  usedAt?: string;
}

export interface SellerKYCDocuments {
  nationalIdUrl: string;
  nationalIdBackUrl?: string;
  businessCertUrl?: string;
  proofOfFinancialUrl: string;
  tinNumber?: string;
  ninNumber: string;
  entityType: 'sole_proprietorship' | 'registered_company' | 'individual';
  payoutType: 'momo' | 'airtel' | 'bank';
  accountName: string;
  accountNumber: string;
  bankName?: string;
}

export interface SellerApplication {
  id: string;
  full_name?: string;
  applicantName: string;
  shop_name?: string;
  storeName: string;
  phone_number?: string;
  phone: string;
  email: string;
  businessType?: string;
  category?: ProductCategory;
  location?: string;
  district: string;
  address: string;
  description: string;
  status: SellerApplicationStatus;
  submittedAt: string;
  created_at?: string;
  updated_at?: string;
  invite_token?: string;
  inviteToken?: string;
  token_expires_at?: string;
  inviteExpiresAt?: string;
  token_used?: boolean;
  tokenUsed?: boolean;
  kyc_documents?: SellerKYCDocuments;
  kycDocuments?: SellerKYCDocuments;
  rejection_reason?: string;
  reviewNotes?: string;
  admin_notes?: string;
  adminNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  details: string;
  targetId?: string;
  targetType?: 'USER' | 'SELLER' | 'PRODUCT' | 'ORDER' | 'SYSTEM';
  timestamp: string;
  ipAddress?: string;
}

export interface PlatformFinancialMetrics {
  totalGrossVolumeUGX: number;
  totalEscrowHeldUGX: number;
  totalSettledPayoutsUGX: number;
  platformCommissionsUGX: number;
  momoVolumeUGX: number;
  airtelVolumeUGX: number;
  cardVolumeUGX: number;
  activeMerchantsCount: number;
  totalTransactionsCount: number;
}

export type SellerStatus = 'pending' | 'approved' | 'rejected';

export type VerificationDocumentType =
  | 'national_id'
  | 'business_registration'
  | 'trading_license'
  | 'passport';

export interface BusiaZone {
  id: string;
  name: string;
  district: string;
  subCountyOrTown: string;
  description: string;
  landmarks: string[];
  deliveryTime: string;
  badgeColor?: string;
}

export interface Seller {
  id: string;
  userId: string;
  storeName: string;
  slug: string;
  phone: string;
  email?: string;
  isPhoneVerified: boolean;
  isVerified: boolean; // Verified seller badge after document review
  verificationDocumentUrl?: string;
  verificationDocumentType?: VerificationDocumentType;
  verificationNotes?: string;
  verificationUploadedAt?: string;
  district: string;
  city?: string;
  address: string;
  localZone?: string;
  availableZones?: string[];
  bio: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  status: SellerStatus;
  verificationStatus?: string;
  rating: number;
  reviewCount: number;
  totalSalesUGX?: number;
  availableBalanceUGX?: number;
  escrowBalanceUGX?: number;
  momoNumber?: string;
  momoNetwork?: 'MTN' | 'Airtel';
  tinNumber?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order_status' | 'new_order' | 'seller_verification' | 'system' | 'product_qc';
  read: boolean;
  orderId?: string;
  createdAt: string;
}

export type ProductCategory =
  | 'Phones & Tablets'
  | 'Electronics & Audio'
  | 'Supermarket & Groceries'
  | 'Fashion & Apparel'
  | 'Home & Appliances'
  | 'Health & Beauty'
  | 'Computing & IT'
  | 'Sports & Outdoors';

export type ProductStatus = 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface ProductVariant {
  id: string;
  productId?: string;
  variantName: string; // e.g. "Size: M", "Color: Onyx Black", "Storage: 256GB"
  sku: string;
  additionalPrice: number; // Additional price in UGX (0 if base price)
  stockQuantity: number;
}

export interface ProductImageItem {
  id: string;
  productId?: string;
  imageUrl: string;
  isPrimary: boolean;
  displayOrder: number;
}

export interface ProductSpecification {
  name: string;
  value: string;
}

export interface ProductQCReviewInput {
  productId: string;
  approved: boolean;
  rejectionReason?: string;
  adminNotes?: string;
}

export interface Product {
  id: string;
  sellerId: string;
  sellerStoreName: string;
  sellerDistrict?: string;
  localZone?: string; // Specific Area zone
  availableZones?: string[];
  title: string;
  slug: string;
  brand?: string;
  description: string;
  priceUGX: number; // Final buyer listing price
  originalPriceUGX?: number;
  basePriceUGX?: number; // Net seller payout in UGX
  calculatedListingPriceUGX?: number;
  shippingContributionUGX?: number;
  commissionRate?: number;
  category: ProductCategory;
  subcategory?: string;
  stockQuantity: number;
  images: string[];
  productImages?: ProductImageItem[];
  variants?: ProductVariant[];
  specifications?: ProductSpecification[];
  whatsInTheBox?: string;
  status?: ProductStatus;
  rejectionReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rating: number;
  reviewCount: number;
  isExpressDelivery?: boolean;
  isFeatured?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Review {
  id: string;
  productId: string;
  buyerId: string;
  buyerName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
  verifiedPurchase?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: ProductVariant;
}

export interface SellerPackage {
  sellerId: string;
  sellerStoreName: string;
  items: CartItem[];
  subtotalUGX: number;
  deliveryFeeUGX: number;
  totalUGX: number;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Ready_For_Pickup'
  | 'Shipped'
  | 'In_Transit'
  | 'Delivered'
  | 'Cancelled'
  | 'Disputed';

export type OrderDispatchStatus =
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DISPUTED';

export interface OrderDispatch {
  id: string;
  orderId: string;
  sellerId: string;
  sellerStoreName: string;
  riderName: string;
  riderNIN: string;
  riderPhone: string;
  riderPlateNumber: string;
  riderStageOrCompany: string;
  riderPhotoUrl?: string;
  handoverOtp: string;
  isHandoverVerified: boolean;
  deliveryPodOtp: string;
  isPodVerified: boolean;
  status: OrderDispatchStatus;
  handoverTimestamp?: string;
  deliveryTimestamp?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type PaymentMethod = 'mobile_money' | 'card' | 'bank_transfer' | 'pay_on_delivery';
export type PaymentProvider = 'mtn_momo' | 'airtel_money' | 'visa_mastercard' | 'bank_eft' | 'cash_border';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface PlatformFeatureSettings {
  enableExpressDelivery: boolean;
  enableGeminiAI: boolean;
  enableCardPayments: boolean;
  enableBankTransfer: boolean;
  enablePayOnDelivery: boolean;
  enableBorderCustomsCollection: boolean;
  enableAutomatedKYC: boolean;
  enableInstantSMSReceipts: boolean;
}

export interface DeliveryAddress {
  fullName: string;
  phone: string;
  district: string;
  divisionOrTown?: string;
  subCountyOrTown?: string;
  streetAddress: string;
  zone?: string;
  notes?: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    lat?: number;
    lng?: number;
  };
}

export interface OrderItem {
  productId: string;
  title: string;
  priceUGX: number;
  quantity: number;
  image: string;
  category?: string;
}

export interface OrderTrackingStep {
  status: OrderStatus;
  timestamp: string;
  note: string;
}

export interface Order {
  id: string;
  masterOrderId: string; // Groups sub-orders from the same multi-vendor checkout
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  deliveryAddress: DeliveryAddress;
  sellerId: string;
  sellerStoreName: string;
  items: OrderItem[];
  subtotalUGX: number;
  deliveryFeeUGX: number;
  totalUGX: number;
  paymentMethod: PaymentMethod;
  paymentProvider?: PaymentProvider;
  paymentPhone?: string;
  paymentReference?: string;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  dispatchId?: string;
  deliveryPodOtp?: string;
  escrowStatus?: EscrowState;
  riderDetails?: RiderHandoverDetails;
  trackingHistory?: OrderTrackingStep[];
  trackingSteps?: any[];
  deliveryZone?: string;
  subTotalUGX?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface RiderHandoverDetails {
  riderName: string;
  riderNIN: string;
  riderPhone: string;
  plateNumber: string;
  stageOrCompany?: string;
  riderPhotoUrl?: string;
  handoverOTP: string;
  isOTPVerified: boolean;
  dispatchedAt: string;
}

export type EscrowState = 'HELD' | 'RELEASED' | 'REFUNDED' | 'HELD_IN_ESCROW' | 'DISPUTED';

export interface EscrowLedgerRecord {
  id: string;
  escrowId: string;
  orderId: string;
  buyerPhone: string;
  sellerId: string;
  sellerStoreName: string;
  amountUGX: number;
  commissionUGX: number;
  netPayoutUGX: number;
  courierFeeUGX: number;
  escrowState: EscrowState;
  paymentProvider: 'MTN MoMo' | 'Airtel Money';
  createdAt: string;
  releasedAt?: string;
  overrideReason?: string;
}

export interface CategoryCommissionSetting {
  category: ProductCategory;
  commissionRatePercent: number;
  courierContributionUGX: number;
  payoutSchedule: string;
}

