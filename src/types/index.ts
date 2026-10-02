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

export interface SellerApplication {
  id: string;
  applicantName: string;
  email: string;
  phone: string;
  storeName: string;
  businessType: string;
  district: string;
  address: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
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
  logoUrl?: string;
  bannerUrl?: string;
  status: SellerStatus;
  rating: number;
  reviewCount: number;
  momoNumber?: string;
  momoNetwork?: 'MTN' | 'Airtel';
  tinNumber?: string;
  createdAt: string;
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
  type: 'order_status' | 'new_order' | 'seller_verification' | 'system';
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

export interface Product {
  id: string;
  sellerId: string;
  sellerStoreName: string;
  sellerDistrict?: string;
  localZone?: string; // Specific Busia Area zone (e.g. 'busitema', 'dabani', 'sibanga', 'busia_town', etc.)
  availableZones?: string[]; // Multiple local zones eligible for fast local delivery
  title: string;
  slug: string;
  description: string;
  priceUGX: number;
  originalPriceUGX?: number;
  category: ProductCategory;
  subcategory?: string;
  stockQuantity: number;
  images: string[];
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
}

export interface SellerPackage {
  sellerId: string;
  sellerStoreName: string;
  items: CartItem[];
  subtotalUGX: number;
  deliveryFeeUGX: number;
  totalUGX: number;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';

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
  divisionOrTown: string;
  streetAddress: string;
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
  riderDetails?: RiderHandoverDetails;
  trackingHistory: OrderTrackingStep[];
  createdAt: string;
  updatedAt?: string;
}

export interface RiderHandoverDetails {
  riderName: string;
  riderNIN: string;
  riderPhone: string;
  plateNumber: string;
  stageOrCompany?: string;
  handoverOTP: string;
  isOTPVerified: boolean;
  dispatchedAt: string;
}

export type EscrowState = 'HELD' | 'RELEASED' | 'REFUNDED';

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

