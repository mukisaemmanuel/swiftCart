export type UserRole = 'buyer' | 'seller' | 'admin';

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
  createdAt: string;
  avatarUrl?: string;
  notificationPreferences?: NotificationPreferences;
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

export type PaymentMethod = 'mobile_money';
export type PaymentProvider = 'mtn_momo' | 'airtel_money';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

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
  trackingHistory: OrderTrackingStep[];
  createdAt: string;
  updatedAt?: string;
}
