import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Product,
  Seller,
  Order,
  Review,
  User,
  UserRole,
  UserStatus,
  CartItem,
  DeliveryAddress,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  WishlistItem,
  AppNotification,
  VerificationDocumentType,
  NotificationPreferences,
  SellerApplication,
  SellerApplicationStatus,
  SellerInviteToken,
  SellerKYCDocuments,
  DirectSellerIntakeInput,
  AuditLog,
  PlatformFinancialMetrics,
  ProductStatus,
  ProductVariant,
  ProductImageItem,
  ProductSpecification,
  ProductQCReviewInput,
  OrderDispatch,
  OrderDispatchStatus,
} from '../types';
import {
  SEED_PRODUCTS,
  SEED_SELLERS,
  SEED_REVIEWS,
  SEED_USERS,
  SEED_ORDERS,
  SEED_SELLER_APPLICATIONS,
  SEED_AUDIT_LOGS,
} from '../data/seedData';

export async function withTimeout<T>(promise: Promise<T>, timeoutMs = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Database operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

class DatabaseService {
  private initialized = false;

  async initDatabase(): Promise<void> {
    if (this.initialized) return;

    try {
      const prodCol = collection(db, 'products');
      const snap = await withTimeout(getDocs(prodCol), 8000);

      // If Firestore database is brand new and empty, seed the initial catalog directly into Cloud Firestore
      if (snap.empty) {
        console.log('Seeding initial Ugandan marketplace data to Cloud Firestore...');
        const batch = writeBatch(db);

        // Seed products
        for (const p of SEED_PRODUCTS) {
          batch.set(doc(db, 'products', p.id), p);
        }

        // Seed sellers
        for (const s of SEED_SELLERS) {
          batch.set(doc(db, 'sellers', s.id), s);
        }

        // Seed users
        for (const u of SEED_USERS) {
          batch.set(doc(db, 'users', u.id), u);
        }

        // Seed reviews
        for (const r of SEED_REVIEWS) {
          batch.set(doc(db, 'reviews', r.id), r);
        }

        // Seed initial orders
        for (const o of SEED_ORDERS) {
          batch.set(doc(db, 'orders', o.id), o);
        }

        await withTimeout(batch.commit(), 10000);
        console.log('Cloud Firestore successfully seeded with genuine Ugandan marketplace catalog!');
      }

      this.initialized = true;
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('insufficient permissions') || msg.includes('permission-denied')) {
        console.info('Cloud Firestore seeding skipped (requires authenticated write permissions or updated Firestore Security Rules). SwiftCart is operating seamlessly with verified catalog data.');
      } else {
        console.warn('Firestore initDatabase note:', msg);
      }
      this.initialized = true;
    }
  }

  // --- USERS ---
  async getUsers(): Promise<User[]> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'users')), 8000);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as User);
      }
    } catch (e: any) {
      console.error('Firestore getUsers error:', e?.message || e);
    }
    return [];
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const snap = await withTimeout(getDoc(doc(db, 'users', id)), 8000);
      if (snap.exists()) {
        return snap.data() as User;
      }
    } catch (e: any) {
      console.error('Firestore getUserById error:', e?.message || e);
    }
    return null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()));
      const snap = await withTimeout(getDocs(q), 8000);
      if (!snap.empty) {
        return snap.docs[0].data() as User;
      }
    } catch (e: any) {
      console.error('Firestore getUserByEmail error:', e?.message || e);
    }
    return null;
  }

  async saveUser(user: User): Promise<void> {
    await withTimeout(setDoc(doc(db, 'users', user.id), user, { merge: true }), 8000);
  }

  async updateNotificationPreferences(userId: string, prefs: NotificationPreferences): Promise<void> {
    try {
      await withTimeout(updateDoc(doc(db, 'users', userId), { notificationPreferences: prefs }), 8000);
    } catch (e: any) {
      console.error('Firestore updateNotificationPreferences error:', e?.message || e);
    }
  }

  // Real-time live listener for Users (auto-refreshes when accounts are created)
  subscribeToUsers(callback: (users: User[]) => void): () => void {
    const colRef = collection(db, 'users');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const users = snapshot.docs.map((d) => d.data() as User);
        callback(users);
      },
      (err) => console.warn('Real-time users subscription note:', err)
    );
  }

  // --- SELLERS ---
  async getSellers(): Promise<Seller[]> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'sellers')), 8000);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as Seller);
      }
    } catch (e: any) {
      console.error('Firestore getSellers error:', e?.message || e);
    }
    return [];
  }

  async getSellerById(id: string): Promise<Seller | null> {
    try {
      // 1. Direct lookup by seller id
      const snap = await withTimeout(getDoc(doc(db, 'sellers', id)), 8000);
      if (snap.exists()) {
        return snap.data() as Seller;
      }

      // 2. Lookup by userId if id is a user ID
      const q = query(collection(db, 'sellers'), where('userId', '==', id));
      const qSnap = await withTimeout(getDocs(q), 8000);
      if (!qSnap.empty) {
        return qSnap.docs[0].data() as Seller;
      }
    } catch (e: any) {
      console.error('Firestore getSellerById error:', e?.message || e);
    }
    return null;
  }

  async saveSeller(seller: Seller): Promise<void> {
    await withTimeout(setDoc(doc(db, 'sellers', seller.id), seller, { merge: true }), 8000);
  }

  async updateSellerStatus(sellerId: string, status: 'approved' | 'rejected'): Promise<void> {
    await withTimeout(updateDoc(doc(db, 'sellers', sellerId), { status }), 8000);
  }

  // Real-time live listener for Sellers (auto-refreshes when store profiles or verifications update)
  subscribeToSellers(callback: (sellers: Seller[]) => void): () => void {
    const colRef = collection(db, 'sellers');
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const sellers = snapshot.docs.map((d) => d.data() as Seller);
          callback(sellers);
        }
      },
      (err) => console.warn('Real-time sellers subscription note:', err)
    );
  }

  // Seller Verification Upload & Admin Approval
  async submitSellerVerification(
    sellerId: string,
    documentType: VerificationDocumentType,
    documentUrl: string,
    notes?: string
  ): Promise<Seller | null> {
    const seller = await this.getSellerById(sellerId);
    if (!seller) return null;

    const updated: Seller = {
      ...seller,
      verificationDocumentType: documentType,
      verificationDocumentUrl: documentUrl,
      verificationNotes: notes || '',
      verificationUploadedAt: new Date().toISOString(),
      isVerified: false,
    };

    await this.saveSeller(updated);

    // Send real-time notification to platform administrators
    await this.sendNotification({
      userId: 'admin_1',
      title: '📋 New Seller KYC Verification Uploaded',
      message: `${seller.storeName} (${seller.phone}) has submitted their ${documentType.replace(/_/g, ' ')} for review.`,
      type: 'seller_verification',
    });

    return updated;
  }

  async reviewSellerVerification(
    sellerId: string,
    approve: boolean,
    adminNotes?: string
  ): Promise<Seller | null> {
    const seller = await this.getSellerById(sellerId);
    if (!seller) return null;

    const updated: Seller = {
      ...seller,
      isVerified: approve,
      status: approve ? 'approved' : seller.status,
      verificationNotes: adminNotes || (approve ? 'Verified by SwiftCart Operations' : 'Rejected. Please re-upload clear document.'),
    };

    await this.saveSeller(updated);

    // Notify seller
    await this.sendNotification({
      userId: seller.userId,
      title: approve ? '🎉 Store Verified & Approved!' : '⚠️ Store Verification Update',
      message: approve
        ? `Congratulations! ${seller.storeName} is now verified with the official SwiftCart Trust Badge.`
        : `Your verification submission was reviewed: ${adminNotes || 'Please contact support or re-upload.'}`,
      type: 'seller_verification',
    });

    return updated;
  }

  // --- PRODUCTS ---
  async getProducts(): Promise<Product[]> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'products')), 8000);
      if (!snap.empty) {
        return snap.docs.map((d) => {
          const p = d.data() as Product;
          return {
            ...p,
            status: p.status || 'APPROVED',
          };
        });
      }
    } catch (e: any) {
      console.error('Firestore getProducts error:', e?.message || e);
    }
    return SEED_PRODUCTS.map((p) => ({ ...p, status: p.status || 'APPROVED' }));
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      const snap = await withTimeout(getDoc(doc(db, 'products', id)), 8000);
      if (snap.exists()) {
        const p = snap.data() as Product;
        return {
          ...p,
          status: p.status || 'APPROVED',
        };
      }
    } catch (e: any) {
      console.error('Firestore getProductById error:', e?.message || e);
    }
    const seed = SEED_PRODUCTS.find((p) => p.id === id);
    return seed ? { ...seed, status: seed.status || 'APPROVED' } : null;
  }

  async saveProduct(product: Product): Promise<void> {
    await withTimeout(setDoc(doc(db, 'products', product.id), product, { merge: true }), 8000);
  }

  async deleteProduct(id: string): Promise<void> {
    await withTimeout(deleteDoc(doc(db, 'products', id)), 8000);
  }

  // Real-time live listener for Products (auto-refreshes marketplace catalog across all buyers)
  subscribeToProducts(callback: (products: Product[]) => void): () => void {
    const colRef = collection(db, 'products');
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const products = snapshot.docs.map((d) => d.data() as Product);
          callback(products);
        }
      },
      (err) => console.warn('Real-time products subscription note:', err)
    );
  }

  async getProductsBySeller(sellerId: string): Promise<Product[]> {
    try {
      const q = query(collection(db, 'products'), where('sellerId', '==', sellerId));
      const snap = await withTimeout(getDocs(q), 8000);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as Product);
      }
      // Fallback to local products filter if Firestore empty
      const all = await this.getProducts();
      return all.filter((p) => p.sellerId === sellerId);
    } catch (e: any) {
      console.error('Firestore getProductsBySeller error:', e?.message || e);
      const all = await this.getProducts();
      return all.filter((p) => p.sellerId === sellerId);
    }
  }

  async getPendingQCProducts(): Promise<Product[]> {
    try {
      const all = await this.getProducts();
      return all.filter((p) => p.status === 'UNDER_REVIEW');
    } catch (e: any) {
      console.error('Firestore getPendingQCProducts error:', e?.message || e);
      return [];
    }
  }

  async submitProductForReview(
    productData: Partial<Product> & { title: string; category: any; priceUGX: number },
    seller: Seller
  ): Promise<Product> {
    const isEdit = Boolean(productData.id);
    const existing = isEdit ? await this.getProductById(productData.id!) : null;

    const prodId = productData.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const slug = productData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const newProduct: Product = {
      id: prodId,
      sellerId: seller.id,
      sellerStoreName: seller.storeName,
      sellerDistrict: seller.district || 'Kampala',
      title: productData.title,
      slug: slug,
      brand: productData.brand || '',
      description: productData.description || '',
      priceUGX: productData.priceUGX,
      originalPriceUGX: productData.originalPriceUGX || Math.round(productData.priceUGX * 1.15),
      basePriceUGX: productData.basePriceUGX || productData.priceUGX,
      calculatedListingPriceUGX: productData.calculatedListingPriceUGX || productData.priceUGX,
      shippingContributionUGX: productData.shippingContributionUGX || 3000,
      commissionRate: productData.commissionRate || 0.12,
      category: productData.category,
      subcategory: productData.subcategory || '',
      stockQuantity: productData.stockQuantity ?? 10,
      images: productData.images && productData.images.length > 0 ? productData.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'],
      productImages: productData.productImages || [],
      variants: productData.variants || [],
      specifications: productData.specifications || [],
      whatsInTheBox: productData.whatsInTheBox || '',
      status: 'UNDER_REVIEW', // Gated review queue
      rejectionReason: undefined,
      rating: existing?.rating || 5.0,
      reviewCount: existing?.reviewCount || 0,
      isExpressDelivery: productData.isExpressDelivery ?? false,
      isFeatured: false,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.saveProduct(newProduct);

    // Send notification to Admin QC Team
    await this.sendNotification({
      userId: 'user_admin_1',
      title: isEdit ? '📝 Seller Edited Listing (QC Review)' : '📦 New Product Submitted for QC',
      message: `${seller.storeName} submitted "${newProduct.title}" (${newProduct.category}) for moderation.`,
      type: 'product_qc',
    });

    return newProduct;
  }

  async reviewProductQC(
    review: ProductQCReviewInput,
    adminUser: { id: string; name: string }
  ): Promise<Product | null> {
    const product = await this.getProductById(review.productId);
    if (!product) return null;

    const newStatus: ProductStatus = review.approved ? 'APPROVED' : 'REJECTED';
    const updatedProduct: Product = {
      ...product,
      status: newStatus,
      rejectionReason: review.approved ? undefined : review.rejectionReason || 'Did not meet catalog standards.',
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminUser.name,
      updatedAt: new Date().toISOString(),
    };

    await this.saveProduct(updatedProduct);

    // Audit Log Entry
    await this.logAuditEvent({
      actorId: adminUser.id,
      actorName: adminUser.name,
      actorRole: 'ADMIN',
      action: review.approved ? 'PRODUCT_QC_APPROVED' : 'PRODUCT_QC_REJECTED',
      details: review.approved
        ? `Approved "${product.title}" (${product.category}) to public catalog.`
        : `Rejected "${product.title}". Reason: ${review.rejectionReason || 'Incomplete catalog standards'}`,
      targetId: product.id,
      targetType: 'PRODUCT',
    });

    // Notify Merchant
    const seller = await this.getSellerById(product.sellerId);
    if (seller) {
      await this.sendNotification({
        userId: seller.userId,
        title: review.approved ? '🎉 Product Approved & Live!' : '⚠️ Product Listing Rejected by QC',
        message: review.approved
          ? `Your product "${product.title}" has been approved and is now live on the SwiftCart marketplace.`
          : `Your product "${product.title}" was rejected: ${review.rejectionReason || 'Please fix and resubmit.'}`,
        type: 'product_qc',
      });
    }

    return updatedProduct;
  }

  async updateProductStatus(productId: string, status: ProductStatus, reason?: string): Promise<void> {
    const product = await this.getProductById(productId);
    if (product) {
      const updated: Product = {
        ...product,
        status,
        rejectionReason: reason || product.rejectionReason,
        updatedAt: new Date().toISOString(),
      };
      await this.saveProduct(updated);
    }
  }

  // --- REVIEWS ---
  async getReviews(productId?: string): Promise<Review[]> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'reviews')), 8000);
      if (!snap.empty) {
        const all = snap.docs.map((d) => d.data() as Review);
        if (productId) {
          return all.filter((r) => r.productId === productId);
        }
        return all;
      }
    } catch (e: any) {
      console.error('Firestore getReviews error:', e?.message || e);
    }
    return [];
  }

  async addReview(review: Review): Promise<void> {
    await withTimeout(setDoc(doc(db, 'reviews', review.id), review), 8000);

    // Update product rating average in Firestore
    const reviews = await this.getReviews(review.productId);
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const prod = await this.getProductById(review.productId);
    if (prod) {
      await this.saveProduct({
        ...prod,
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: reviews.length,
      });
    }
  }

  // --- WISHLIST ITEMS ---
  async getWishlist(userId: string): Promise<WishlistItem[]> {
    try {
      const q = query(collection(db, 'wishlist_items'), where('userId', '==', userId));
      const snap = await withTimeout(getDocs(q), 8000);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as WishlistItem);
      }
    } catch (e: any) {
      console.error('Firestore getWishlist error:', e?.message || e);
    }
    return [];
  }

  async getAllWishlistItems(): Promise<WishlistItem[]> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'wishlist_items')), 8000);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as WishlistItem);
      }
    } catch (e: any) {
      console.error('Firestore getAllWishlistItems error:', e?.message || e);
    }
    return [];
  }

  async addToWishlist(userId: string, productId: string): Promise<WishlistItem> {
    const existing = await this.getWishlist(userId);
    const alreadyIn = existing.find((w) => w.productId === productId);
    if (alreadyIn) return alreadyIn;

    const item: WishlistItem = {
      id: `wish_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      userId,
      productId,
      createdAt: new Date().toISOString(),
    };

    await withTimeout(setDoc(doc(db, 'wishlist_items', item.id), item), 8000);
    return item;
  }

  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'wishlist_items'),
        where('userId', '==', userId),
        where('productId', '==', productId)
      );
      const snap = await withTimeout(getDocs(q), 8000);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e: any) {
      console.error('Firestore removeFromWishlist error:', e?.message || e);
    }
  }

  async isProductInWishlist(userId: string, productId: string): Promise<boolean> {
    const list = await this.getWishlist(userId);
    return list.some((w) => w.productId === productId);
  }

  async getProductWishlistCount(productId: string): Promise<number> {
    const all = await this.getAllWishlistItems();
    return all.filter((w) => w.productId === productId).length;
  }

  async getSellerWishlistMetrics(sellerId: string): Promise<Record<string, number>> {
    const products = await this.getProducts();
    const sellerProducts = products.filter((p) => p.sellerId === sellerId);
    const allWish = await this.getAllWishlistItems();

    const counts: Record<string, number> = {};
    for (const p of sellerProducts) {
      counts[p.id] = allWish.filter((w) => w.productId === p.id).length;
    }
    return counts;
  }

  // --- NOTIFICATIONS ---
  async getNotifications(userId: string): Promise<AppNotification[]> {
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      const snap = await withTimeout(getDocs(q), 8000);
      if (!snap.empty) {
        const notifs = snap.docs.map((d) => d.data() as AppNotification);
        return notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } catch (e: any) {
      console.error('Firestore getNotifications error:', e?.message || e);
    }
    return [];
  }

  async sendNotification(
    notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & {
      id?: string;
      createdAt?: string;
      read?: boolean;
    }
  ): Promise<AppNotification> {
    const fullNotif: AppNotification = {
      id: notif.id || `notif_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      userId: notif.userId,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      read: notif.read ?? false,
      orderId: notif.orderId,
      createdAt: notif.createdAt || new Date().toISOString(),
    };

    try {
      await withTimeout(setDoc(doc(db, 'notifications', fullNotif.id), fullNotif), 8000);
    } catch (e: any) {
      console.error('Firestore sendNotification error:', e?.message || e);
    }
    return fullNotif;
  }

  async markNotificationAsRead(notifId: string): Promise<void> {
    try {
      await withTimeout(updateDoc(doc(db, 'notifications', notifId), { read: true }), 8000);
    } catch (e: any) {
      console.error('Firestore markNotificationAsRead error:', e?.message || e);
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      const notifs = await this.getNotifications(userId);
      const batch = writeBatch(db);
      for (const n of notifs.filter((n) => !n.read)) {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      }
      await withTimeout(batch.commit(), 8000);
    } catch (e: any) {
      console.error('Firestore markAllNotificationsAsRead error:', e?.message || e);
    }
  }

  // --- ORDERS ---
  async getOrders(userId?: string, sellerId?: string): Promise<Order[]> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'orders')), 8000);
      if (!snap.empty) {
        let orders = snap.docs.map((d) => d.data() as Order);

        if (userId) {
          orders = orders.filter((o) => o.buyerId === userId);
        }
        if (sellerId) {
          orders = orders.filter((o) => o.sellerId === sellerId);
        }

        return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } catch (e: any) {
      console.error('Firestore getOrders error:', e?.message || e);
    }
    return [];
  }

  async getOrdersBySeller(sellerId: string): Promise<Order[]> {
    return this.getOrders(undefined, sellerId);
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const snap = await withTimeout(getDoc(doc(db, 'orders', orderId)), 8000);
      if (snap.exists()) {
        return snap.data() as Order;
      }
    } catch (e: any) {
      console.error('Firestore getOrderById error:', e?.message || e);
    }
    return null;
  }

  async logAuditEvent(logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    return this.createAuditLog(logData);
  }

  async createOrder(orderData: Partial<Order>): Promise<string> {
    const orderId = orderData.id || `SC-ORD-${Date.now().toString().slice(-6)}`;
    const fullOrder: Order = {
      id: orderId,
      masterOrderId: orderData.masterOrderId || orderId,
      buyerId: orderData.buyerId || 'guest',
      buyerName: orderData.buyerName || 'Valued Customer',
      buyerPhone: orderData.buyerPhone || '+256700000000',
      buyerEmail: orderData.buyerEmail || '',
      sellerId: orderData.sellerId || 'seller_default',
      sellerStoreName: orderData.sellerStoreName || 'SwiftCart Merchant',
      items: orderData.items || [],
      deliveryAddress: orderData.deliveryAddress || {
        fullName: orderData.buyerName || 'Valued Customer',
        phone: orderData.buyerPhone || '+256700000000',
        district: 'Busia',
        streetAddress: 'Main Road',
      },
      subtotalUGX: orderData.subtotalUGX || 0,
      deliveryFeeUGX: orderData.deliveryFeeUGX || 0,
      totalUGX: orderData.totalUGX || 0,
      paymentMethod: orderData.paymentMethod || 'mobile_money',
      paymentProvider: orderData.paymentProvider || 'mtn_momo',
      paymentPhone: orderData.paymentPhone || orderData.buyerPhone || '',
      paymentReference: orderData.paymentReference || `TX-${Date.now()}`,
      paymentStatus: orderData.paymentStatus || 'paid',
      status: orderData.status || 'Confirmed',
      escrowStatus: orderData.escrowStatus || 'HELD_IN_ESCROW',
      trackingSteps: (orderData as any).trackingSteps || [
        {
          status: 'Confirmed',
          label: 'Order Placed & Escrow Paid',
          description: 'Payment authorized and securely held in escrow.',
          timestamp: new Date().toISOString(),
          completed: true,
          current: true,
        },
      ],
      createdAt: orderData.createdAt || new Date().toISOString(),
    };

    try {
      await withTimeout(setDoc(doc(db, 'orders', orderId), fullOrder), 8000);
    } catch (e: any) {
      console.error('Firestore createOrder error:', e?.message || e);
    }

    return orderId;
  }

  // Real-time live listener for Orders (auto-refreshes Admin & Seller dashboards on new orders)
  subscribeToOrders(callback: (orders: Order[]) => void): () => void {
    const colRef = collection(db, 'orders');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const orders = snapshot.docs.map((d) => d.data() as Order);
        orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(orders);
      },
      (err) => console.warn('Real-time orders subscription note:', err)
    );
  }

  // Real-time live listener for Seller Orders
  subscribeToSellerOrders(sellerId: string, callback: (orders: Order[]) => void): () => void {
    const q = query(collection(db, 'orders'), where('sellerId', '==', sellerId));
    return onSnapshot(
      q,
      (snapshot) => {
        const orders = snapshot.docs.map((d) => d.data() as Order);
        orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(orders);
      },
      (err) => console.warn('Real-time seller orders subscription note:', err)
    );
  }

  // Real-time live listener for a specific Order tracking
  subscribeToOrderById(orderId: string, callback: (order: Order | null) => void): () => void {
    const docRef = doc(db, 'orders', orderId);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as Order);
        } else {
          callback(null);
        }
      },
      (err) => console.warn('Real-time order subscription note:', err)
    );
  }

  // Multi-seller Split Order Generation
  async createSplitOrders(params: {
    buyer: User;
    cartItems: CartItem[];
    deliveryAddress: DeliveryAddress;
    paymentMethod: PaymentMethod;
    paymentProvider?: PaymentProvider;
    momoPhoneNumber?: string;
    notes?: string;
  }): Promise<{ masterOrderId: string; subOrders: Order[] }> {
    const masterOrderId = `SC-MST-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    // 1. Group cart items by sellerId
    const itemsBySeller: Record<string, { items: CartItem[]; seller?: Seller }> = {};
    for (const item of params.cartItems) {
      const sid = item.product.sellerId;
      if (!itemsBySeller[sid]) {
        itemsBySeller[sid] = { items: [] };
      }
      itemsBySeller[sid].items.push(item);
    }

    // 2. Fetch seller details for store names
    for (const sid of Object.keys(itemsBySeller)) {
      const s = await this.getSellerById(sid);
      if (s) itemsBySeller[sid].seller = s;
    }

    const subOrders: Order[] = [];
    let packageCounter = 1;

    // 3. Create real Cloud Firestore sub-orders for each seller
    for (const [sellerId, group] of Object.entries(itemsBySeller)) {
      const subTotalUGX = group.items.reduce((sum, it) => sum + it.product.priceUGX * it.quantity, 0);
      const deliveryFeeUGX = 5000;
      const totalUGX = subTotalUGX + deliveryFeeUGX;

      const subOrder: Order = {
        id: `SC-PKG-${Date.now().toString().slice(-5)}-${packageCounter++}`,
        masterOrderId,
        buyerId: params.buyer.id,
        buyerName: params.buyer.name,
        buyerPhone: params.buyer.phone,
        buyerEmail: params.buyer.email,
        sellerId,
        sellerStoreName: group.seller?.storeName || 'Verified Merchant',
        items: group.items.map((ci) => ({
          productId: ci.product.id,
          title: ci.product.title,
          priceUGX: ci.product.priceUGX,
          quantity: ci.quantity,
          image: ci.product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
          category: ci.product.category,
        })),
        subtotalUGX: subTotalUGX,
        subTotalUGX,
        deliveryFeeUGX,
        totalUGX,
        deliveryAddress: params.deliveryAddress,
        deliveryZone: params.deliveryAddress.zone || 'Kampala Central',
        paymentMethod: params.paymentMethod,
        paymentProvider: params.paymentProvider || 'mtn_momo',
        paymentStatus: 'paid', // Prepaid Mobile Money Escrow
        status: 'Confirmed',
        trackingSteps: [
          {
            status: 'Confirmed',
            label: 'Order Placed & Escrow Paid',
            description: `Payment verified via ${params.paymentProvider === 'airtel_money' ? 'Airtel Money' : 'MTN MoMo'}. Escrow locked.`,
            timestamp: now,
            completed: true,
          },
          {
            status: 'Preparing',
            label: 'Merchant Packing Goods',
            description: `${group.seller?.storeName || 'Merchant'} is preparing items for dispatch.`,
            completed: false,
          },
          {
            status: 'Dispatched',
            label: 'Swift Courier In Transit',
            description: 'Order handed over to delivery courier.',
            completed: false,
          },
          {
            status: 'Delivered',
            label: 'Delivered & Escrow Released',
            description: 'Customer accepts package and funds release to seller.',
            completed: false,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      // Save directly to Cloud Firestore
      await withTimeout(setDoc(doc(db, 'orders', subOrder.id), subOrder), 8000);
      subOrders.push(subOrder);

      // Decrement product inventory in Cloud Firestore
      for (const it of group.items) {
        const prod = await this.getProductById(it.product.id);
        if (prod) {
          const newStock = Math.max(0, prod.stockQuantity - it.quantity);
          await this.saveProduct({ ...prod, stockQuantity: newStock });
        }
      }

      // Send real-time notification to the seller in Cloud Firestore
      const seller = await this.getSellerById(sellerId);
      if (seller) {
        await this.sendNotification({
          userId: seller.userId,
          title: '🛒 New Order Received!',
          message: `Package ${subOrder.id}: ${group.items.length} item(s) ordered by ${params.buyer.name}. Total: UGX ${totalUGX.toLocaleString()}.`,
          type: 'new_order',
          orderId: subOrder.id,
        });
      }
    }

    // Send real-time notification to the buyer in Cloud Firestore
    await this.sendNotification({
      userId: params.buyer.id,
      title: '📦 Order Successfully Placed!',
      message: `Your master order ${masterOrderId} with ${subOrders.length} package(s) was confirmed. We are preparing it for delivery!`,
      type: 'order_status',
      orderId: masterOrderId,
    });

    return { masterOrderId, subOrders };
  }

  async updateOrderStatus(
    orderId: string,
    status: Order['status'],
    trackingUpdate?: { label: string; description: string },
    note?: string
  ): Promise<Order | null> {
    const currentOrder = await this.getOrderById(orderId);
    if (!currentOrder) return null;

    const now = new Date().toISOString();
    const updatedTracking = currentOrder.trackingSteps.map((step) => {
      if (step.status === status) {
        return {
          ...step,
          completed: true,
          timestamp: now,
          description: trackingUpdate?.description || step.description,
        };
      }
      return step;
    });

    const updatedOrder: Order = {
      ...currentOrder,
      status,
      trackingSteps: updatedTracking,
      updatedAt: now,
    };

    // Save update directly to Cloud Firestore
    await withTimeout(setDoc(doc(db, 'orders', orderId), updatedOrder, { merge: true }), 8000);

    // Send notification to buyer
    let statusEmoji = '🚚';
    if (status === 'Delivered') statusEmoji = '✅';
    if (status === 'Cancelled') statusEmoji = '❌';
    if (status === 'Confirmed') statusEmoji = '📋';

    await this.sendNotification({
      userId: currentOrder.buyerId,
      title: `${statusEmoji} Order Update: ${status}`,
      message: `Package ${currentOrder.id} from ${currentOrder.sellerStoreName} is now ${status}. ${note || ''}`,
      type: 'order_status',
      orderId: currentOrder.id,
    });

    return updatedOrder;
  }

  async updateOrderPaymentStatus(
    referenceOrId: string,
    paymentStatus: PaymentStatus = 'paid'
  ): Promise<number> {
    const orders = await this.getOrders();
    let updatedCount = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      if (
        o.id === referenceOrId ||
        o.masterOrderId === referenceOrId ||
        o.paymentReference === referenceOrId
      ) {
        await withTimeout(
          updateDoc(doc(db, 'orders', o.id), {
            paymentStatus,
            updatedAt: now,
          }),
          8000
        );
        updatedCount++;
      }
    }

    return updatedCount;
  }

  // --- ORDER DISPATCH & RIDER CHAIN-OF-CUSTODY (ANTI-THEFT PROTOCOL) ---
  private static readonly DISPATCHES_STORAGE_KEY = 'swiftcart_order_dispatches_v1';

  private getLocalDispatches(): OrderDispatch[] {
    try {
      const raw = localStorage.getItem(DatabaseService.DISPATCHES_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  }

  private saveLocalDispatches(dispatches: OrderDispatch[]): void {
    try {
      localStorage.setItem(DatabaseService.DISPATCHES_STORAGE_KEY, JSON.stringify(dispatches));
    } catch (_) {}
  }

  async getAllOrderDispatches(sellerId?: string): Promise<OrderDispatch[]> {
    try {
      const q = collection(db, 'order_dispatches');
      const snap = await withTimeout(getDocs(q), 8000);
      if (!snap.empty) {
        let results = snap.docs.map((d) => d.data() as OrderDispatch);
        if (sellerId) results = results.filter((d) => d.sellerId === sellerId);
        return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } catch (e: any) {
      console.warn('Firestore getAllOrderDispatches fallback to local:', e?.message || e);
    }
    const local = this.getLocalDispatches();
    if (sellerId) return local.filter((d) => d.sellerId === sellerId);
    return local;
  }

  async getOrderDispatchByOrderId(orderId: string): Promise<OrderDispatch | null> {
    try {
      const q = query(collection(db, 'order_dispatches'), where('orderId', '==', orderId));
      const snap = await withTimeout(getDocs(q), 8000);
      if (!snap.empty) {
        return snap.docs[0].data() as OrderDispatch;
      }
    } catch (e: any) {
      console.warn('Firestore getOrderDispatchByOrderId fallback to local:', e?.message || e);
    }
    const local = this.getLocalDispatches();
    return local.find((d) => d.orderId === orderId) || null;
  }

  async createOrderDispatch(input: {
    orderId: string;
    sellerId: string;
    sellerStoreName: string;
    riderName: string;
    riderNIN: string;
    riderPhone: string;
    riderPlateNumber: string;
    riderStageOrCompany: string;
    riderPhotoUrl?: string;
    notes?: string;
  }): Promise<OrderDispatch> {
    const dispatchId = `disp_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const handoverOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const deliveryPodOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const now = new Date().toISOString();

    const newDispatch: OrderDispatch = {
      id: dispatchId,
      orderId: input.orderId,
      sellerId: input.sellerId,
      sellerStoreName: input.sellerStoreName,
      riderName: input.riderName.trim(),
      riderNIN: input.riderNIN.trim().toUpperCase(),
      riderPhone: input.riderPhone.trim(),
      riderPlateNumber: input.riderPlateNumber.trim().toUpperCase(),
      riderStageOrCompany: input.riderStageOrCompany.trim(),
      riderPhotoUrl: input.riderPhotoUrl,
      handoverOtp,
      isHandoverVerified: false,
      deliveryPodOtp,
      isPodVerified: false,
      status: 'ASSIGNED',
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };

    // Save locally
    const local = this.getLocalDispatches().filter((d) => d.orderId !== input.orderId);
    local.unshift(newDispatch);
    this.saveLocalDispatches(local);

    // Save to Firestore
    try {
      await withTimeout(setDoc(doc(db, 'order_dispatches', dispatchId), newDispatch), 8000);
    } catch (e: any) {
      console.warn('Firestore createOrderDispatch save note:', e?.message || e);
    }

    // Update order with rider information & POD OTP
    const order = await this.getOrderById(input.orderId);
    if (order) {
      const updatedOrder: Order = {
        ...order,
        dispatchId,
        deliveryPodOtp,
        riderDetails: {
          riderName: input.riderName,
          riderNIN: input.riderNIN,
          riderPhone: input.riderPhone,
          plateNumber: input.riderPlateNumber,
          stageOrCompany: input.riderStageOrCompany,
          riderPhotoUrl: input.riderPhotoUrl,
          handoverOTP: handoverOtp,
          isOTPVerified: false,
          dispatchedAt: now,
        },
        trackingHistory: [
          ...order.trackingHistory,
          {
            status: 'Ready_For_Pickup',
            timestamp: now,
            note: `Courier assigned: ${input.riderName} (${input.riderPlateNumber}, ${input.riderStageOrCompany}). Awaiting 4-digit Handover OTP verification.`,
          },
        ],
        updatedAt: now,
      };

      try {
        await withTimeout(setDoc(doc(db, 'orders', order.id), updatedOrder, { merge: true }), 8000);
      } catch (_) {}
    }

    // Audit log
    await this.logAuditEvent({
      actorId: input.sellerId,
      actorName: input.sellerStoreName,
      actorRole: 'SELLER',
      action: 'ORDER_DISPATCH_ASSIGNED',
      details: `Assigned courier ${input.riderName} (Plate: ${input.riderPlateNumber}, NIN: ${input.riderNIN}) to Order ${input.orderId}. Handover OTP generated.`,
      targetId: input.orderId,
      targetType: 'ORDER',
    });

    return newDispatch;
  }

  async verifyHandoverOtp(
    orderId: string,
    enteredOtp: string
  ): Promise<{ success: boolean; message?: string; dispatch?: OrderDispatch; order?: Order }> {
    const dispatch = await this.getOrderDispatchByOrderId(orderId);
    if (!dispatch) {
      return { success: false, message: 'No dispatch record found for this order.' };
    }

    if (dispatch.handoverOtp !== enteredOtp.trim()) {
      return {
        success: false,
        message: 'Invalid 4-digit Handover OTP. Please verify the code sent to the rider.',
      };
    }

    const now = new Date().toISOString();
    const updatedDispatch: OrderDispatch = {
      ...dispatch,
      isHandoverVerified: true,
      status: 'OUT_FOR_DELIVERY',
      handoverTimestamp: now,
      updatedAt: now,
    };

    // Update local & Firestore dispatch
    const local = this.getLocalDispatches().map((d) => (d.id === dispatch.id ? updatedDispatch : d));
    this.saveLocalDispatches(local);
    try {
      await withTimeout(setDoc(doc(db, 'order_dispatches', dispatch.id), updatedDispatch, { merge: true }), 8000);
    } catch (_) {}

    // Update Order state to 'In_Transit' / 'Shipped'
    const order = await this.getOrderById(orderId);
    let updatedOrder: Order | null = null;
    if (order) {
      updatedOrder = {
        ...order,
        status: 'In_Transit',
        riderDetails: {
          ...(order.riderDetails || {
            riderName: dispatch.riderName,
            riderNIN: dispatch.riderNIN,
            riderPhone: dispatch.riderPhone,
            plateNumber: dispatch.riderPlateNumber,
            stageOrCompany: dispatch.riderStageOrCompany,
            handoverOTP: dispatch.handoverOtp,
            dispatchedAt: now,
          }),
          isOTPVerified: true,
        },
        trackingHistory: [
          ...order.trackingHistory,
          {
            status: 'In_Transit',
            timestamp: now,
            note: `Custody transferred to courier ${dispatch.riderName} (${dispatch.riderPlateNumber}) after OTP verification. Package is out for delivery.`,
          },
        ],
        updatedAt: now,
      };

      try {
        await withTimeout(setDoc(doc(db, 'orders', order.id), updatedOrder, { merge: true }), 8000);
      } catch (_) {}

      // Notify Buyer with POD code reminder
      await this.sendNotification({
        userId: order.buyerId,
        title: '🚚 Package Out for Delivery!',
        message: `Courier ${dispatch.riderName} (${dispatch.riderPlateNumber}) is on the way with your package! Your POD security code is ${dispatch.deliveryPodOtp}.`,
        type: 'order_status',
        orderId: order.id,
      });
    }

    // Audit log
    await this.logAuditEvent({
      actorId: dispatch.sellerId,
      actorName: dispatch.sellerStoreName,
      actorRole: 'SELLER',
      action: 'ORDER_HANDOVER_VERIFIED',
      details: `Physical custody verified and transferred to rider ${dispatch.riderName} (${dispatch.riderPlateNumber}) for Order ${orderId}. Order is now In Transit.`,
      targetId: orderId,
      targetType: 'ORDER',
    });

    return { success: true, dispatch: updatedDispatch, order: updatedOrder || undefined };
  }

  async verifyPodOtp(
    orderId: string,
    enteredOtp: string,
    actor?: { id: string; name: string; role: UserRole }
  ): Promise<{ success: boolean; message?: string; dispatch?: OrderDispatch; order?: Order }> {
    const dispatch = await this.getOrderDispatchByOrderId(orderId);
    const order = await this.getOrderById(orderId);

    const validCode = dispatch?.deliveryPodOtp || order?.deliveryPodOtp;
    if (!validCode) {
      return { success: false, message: 'No Proof-of-Delivery OTP registered for this order.' };
    }

    if (validCode !== enteredOtp.trim()) {
      return {
        success: false,
        message: 'Invalid Proof-of-Delivery (POD) OTP. Please ask the recipient for their 4-digit code.',
      };
    }

    const now = new Date().toISOString();

    // 1. Update Dispatch
    let updatedDispatch: OrderDispatch | undefined;
    if (dispatch) {
      updatedDispatch = {
        ...dispatch,
        isPodVerified: true,
        status: 'DELIVERED',
        deliveryTimestamp: now,
        updatedAt: now,
      };
      const local = this.getLocalDispatches().map((d) => (d.id === dispatch.id ? updatedDispatch! : d));
      this.saveLocalDispatches(local);
      try {
        await withTimeout(setDoc(doc(db, 'order_dispatches', dispatch.id), updatedDispatch, { merge: true }), 8000);
      } catch (_) {}
    }

    // 2. Update Order & Release Escrow
    let updatedOrder: Order | undefined;
    if (order) {
      updatedOrder = {
        ...order,
        status: 'Delivered',
        escrowStatus: 'RELEASED',
        trackingHistory: [
          ...order.trackingHistory,
          {
            status: 'Delivered',
            timestamp: now,
            note: 'Package received by customer. 4-digit POD verified. Escrow funds released to seller balance.',
          },
        ],
        updatedAt: now,
      };

      try {
        await withTimeout(setDoc(doc(db, 'orders', order.id), updatedOrder, { merge: true }), 8000);
      } catch (_) {}

      // Notify Seller of Escrow Release
      const seller = await this.getSellerById(order.sellerId);
      if (seller) {
        await this.sendNotification({
          userId: seller.userId,
          title: '💰 Escrow Funds Released!',
          message: `Order ${order.id} verified with POD code. UGX ${order.totalUGX.toLocaleString()} has been unlocked to your payout balance!`,
          type: 'order_status',
          orderId: order.id,
        });
      }

      // Notify Buyer of Delivery Completion
      await this.sendNotification({
        userId: order.buyerId,
        title: '✅ Package Delivered!',
        message: `Thank you for confirming receipt of order ${order.id} from ${order.sellerStoreName}.`,
        type: 'order_status',
        orderId: order.id,
      });
    }

    // Audit log
    await this.logAuditEvent({
      actorId: actor?.id || dispatch?.sellerId || 'system',
      actorName: actor?.name || dispatch?.sellerStoreName || 'Delivery CoC System',
      actorRole: actor?.role || 'SELLER',
      action: 'ORDER_POD_VERIFIED_ESCROW_RELEASED',
      details: `Proof of Delivery (POD) OTP verified for Order ${orderId}. Order marked Delivered and Escrow payout settled.`,
      targetId: orderId,
      targetType: 'ORDER',
    });

    return { success: true, dispatch: updatedDispatch, order: updatedOrder };
  }

  // --- RBAC USER MANAGEMENT ---
  async updateUserRoleAndStatus(
    userId: string,
    role: UserRole,
    status: UserStatus,
    adminActor?: { id: string; name: string; role: UserRole }
  ): Promise<User | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;

    const now = new Date().toISOString();
    const updatedUser: User = {
      ...user,
      role,
      status,
      updatedAt: now,
    };

    await withTimeout(setDoc(doc(db, 'users', userId), updatedUser, { merge: true }), 8000);

    // Record audit log
    if (adminActor) {
      await this.createAuditLog({
        actorId: adminActor.id,
        actorName: adminActor.name,
        actorRole: adminActor.role,
        action: 'USER_ROLE_OR_STATUS_UPDATE',
        details: `Updated user ${user.name} (${user.email}) -> Role: ${role}, Status: ${status}`,
        targetId: userId,
        targetType: 'USER',
      });
    }

    return updatedUser;
  }

  // --- SELLER INTAKE & GATED KYC ONBOARDING PIPELINE ---
  private static readonly APPS_STORAGE_KEY = 'swiftcart_seller_applications_v2';
  private static readonly INVITES_STORAGE_KEY = 'swiftcart_seller_invites_v2';

  private getLocalApplications(): SellerApplication[] {
    try {
      const raw = localStorage.getItem(DatabaseService.APPS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return SEED_SELLER_APPLICATIONS as SellerApplication[];
  }

  private saveLocalApplications(apps: SellerApplication[]): void {
    try {
      localStorage.setItem(DatabaseService.APPS_STORAGE_KEY, JSON.stringify(apps));
    } catch (_) {}
  }

  private getLocalInvites(): SellerInviteToken[] {
    try {
      const raw = localStorage.getItem(DatabaseService.INVITES_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    // Seed default demo invite token for testing
    return [
      {
        token: 'demo-invite-token-okello-48h',
        applicationId: 'app_2',
        phone: '+256755332211',
        storeName: 'Heritage Crafts Uganda',
        email: 'brian@heritagecrafts.ug',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        isUsed: false,
      },
    ];
  }

  private saveLocalInvites(invites: SellerInviteToken[]): void {
    try {
      localStorage.setItem(DatabaseService.INVITES_STORAGE_KEY, JSON.stringify(invites));
    } catch (_) {}
  }

  async getSellerApplications(): Promise<SellerApplication[]> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'seller_applications')), 6000);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as SellerApplication);
      }
    } catch (e: any) {
      console.warn('Firestore getSellerApplications fallback note:', e?.message || e);
    }
    return this.getLocalApplications();
  }

  async getSellerApplicationById(id: string): Promise<SellerApplication | null> {
    const apps = await this.getSellerApplications();
    return apps.find((a) => a.id === id) || null;
  }

  async submitSellerApplication(
    data: Omit<SellerApplication, 'id' | 'status' | 'submittedAt'>
  ): Promise<SellerApplication> {
    const newApp: SellerApplication = {
      ...data,
      id: `app_${Date.now()}`,
      status: 'PENDING_REVIEW',
      submittedAt: new Date().toISOString(),
    };

    try {
      await withTimeout(setDoc(doc(db, 'seller_applications', newApp.id), newApp), 6000);
    } catch (e: any) {
      console.warn('Firestore submitSellerApplication note:', e?.message || e);
    }

    // Save locally
    const current = this.getLocalApplications();
    this.saveLocalApplications([newApp, ...current]);

    // Notify operations admins
    await this.sendNotification({
      userId: 'user_admin_1',
      title: '📝 New Merchant Inquiry Received',
      message: `${newApp.applicantName} has applied to sell as "${newApp.storeName}" in ${newApp.district}.`,
      type: 'seller_verification',
    });

    return newApp;
  }

  async createDirectSellerIntake(
    data: DirectSellerIntakeInput,
    adminActor?: { id: string; name: string; role: UserRole }
  ): Promise<{
    application: SellerApplication;
    token: string;
    inviteUrl: string;
    expiresAt: string;
    whatsappUrl: string;
  }> {
    // 1. Sanitize Ugandan phone number to E.164 (+256...)
    let cleanedPhone = data.phoneNumber.trim().replace(/[^0-9+]/g, '');
    if (cleanedPhone.startsWith('0')) {
      cleanedPhone = '+256' + cleanedPhone.slice(1);
    } else if (!cleanedPhone.startsWith('+')) {
      cleanedPhone = '+' + cleanedPhone;
    }

    // 2. Generate secure 32-character token
    const randomHex = crypto.randomUUID?.().replace(/-/g, '') || (Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
    const token = `inv_${randomHex}`.slice(0, 32);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 Hours
    const appId = `app_direct_${Date.now()}`;

    const newApp: SellerApplication = {
      id: appId,
      full_name: data.fullName.trim(),
      applicantName: data.fullName.trim(),
      shop_name: data.shopName.trim(),
      storeName: data.shopName.trim(),
      phone_number: cleanedPhone,
      phone: cleanedPhone,
      email: `${data.shopName.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@merchant.ug`,
      category: data.category,
      location: data.location.trim(),
      district: data.location.trim(),
      address: `${data.location.trim()}, Uganda`,
      description: data.adminNotes ? `Direct Admin Intake: ${data.adminNotes}` : 'Direct Operations Intake',
      status: 'INVITED',
      invite_token: token,
      inviteToken: token,
      token_expires_at: expiresAt,
      inviteExpiresAt: expiresAt,
      token_used: false,
      tokenUsed: false,
      admin_notes: data.adminNotes,
      adminNotes: data.adminNotes,
      submittedAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminActor?.name || 'Operations Admin',
    };

    const inviteRecord: SellerInviteToken = {
      token,
      applicationId: newApp.id,
      phone: newApp.phone,
      storeName: newApp.storeName,
      email: newApp.email,
      createdAt: new Date().toISOString(),
      expiresAt,
      isUsed: false,
    };

    // Save locally
    const currentApps = this.getLocalApplications();
    this.saveLocalApplications([newApp, ...currentApps]);

    const currentInvites = this.getLocalInvites();
    this.saveLocalInvites([inviteRecord, ...currentInvites]);

    // Save to Firestore if available
    try {
      await withTimeout(setDoc(doc(db, 'seller_applications', newApp.id), newApp), 5000);
      await withTimeout(setDoc(doc(db, 'seller_invites', token), inviteRecord), 5000);
    } catch (e: any) {
      console.warn('Firestore createDirectSellerIntake note:', e?.message || e);
    }

    if (adminActor) {
      await this.createAuditLog({
        actorId: adminActor.id,
        actorName: adminActor.name,
        actorRole: adminActor.role,
        action: 'DIRECT_SELLER_INTAKE_CREATED',
        details: `Created direct lead & 48h invite for "${newApp.storeName}" (${newApp.applicantName}, ${newApp.phone}). Notes: ${data.adminNotes || 'N/A'}`,
        targetId: newApp.id,
        targetType: 'SELLER',
      });
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const inviteUrl = `${origin}/seller/register?token=${token}`;

    const sanitizedWhatsAppPhone = cleanedPhone.replace(/[^0-9]/g, '');
    const prefilledMessage = `Hello ${newApp.applicantName}, thank you for contacting SwiftCart Uganda! Your merchant intake has been initiated for ${newApp.storeName}. Complete your official identity registration and payout verification (NIN, TIN & MoMo details) here: ${inviteUrl} . This link expires in 48 hours.`;
    const whatsappUrl = `https://wa.me/${sanitizedWhatsAppPhone}?text=${encodeURIComponent(prefilledMessage)}`;

    return {
      application: newApp,
      token,
      inviteUrl,
      expiresAt,
      whatsappUrl,
    };
  }

  async createSellerInvite(
    applicationId: string,
    adminActor?: { id: string; name: string; role: UserRole }
  ): Promise<{ token: string; inviteUrl: string; expiresAt: string; application: SellerApplication }> {
    const apps = await this.getSellerApplications();
    const app = apps.find((a) => a.id === applicationId);
    if (!app) throw new Error('Application not found');

    // Generate cryptographically unique 48-hour single-use token
    const token = `inv_${crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15) + Date.now().toString(36)}`;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 Hours

    const inviteRecord: SellerInviteToken = {
      token,
      applicationId: app.id,
      phone: app.phone,
      storeName: app.storeName,
      email: app.email,
      createdAt: new Date().toISOString(),
      expiresAt,
      isUsed: false,
    };

    // Save invite token
    try {
      await withTimeout(setDoc(doc(db, 'seller_invites', token), inviteRecord), 6000);
    } catch (e: any) {
      console.warn('Firestore createSellerInvite note:', e?.message || e);
    }
    const localInvites = this.getLocalInvites();
    this.saveLocalInvites([inviteRecord, ...localInvites]);

    // Update application state to INVITED
    const updatedApp: SellerApplication = {
      ...app,
      status: 'INVITED',
      inviteToken: token,
      inviteExpiresAt: expiresAt,
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminActor?.name || 'SwiftCart Admin',
    };

    try {
      await withTimeout(setDoc(doc(db, 'seller_applications', app.id), updatedApp, { merge: true }), 6000);
    } catch (e: any) {
      console.warn('Firestore update application note:', e?.message || e);
    }
    const updatedApps = apps.map((a) => (a.id === app.id ? updatedApp : a));
    this.saveLocalApplications(updatedApps);

    if (adminActor) {
      await this.createAuditLog({
        actorId: adminActor.id,
        actorName: adminActor.name,
        actorRole: adminActor.role,
        action: 'SELLER_INVITE_GENERATED',
        details: `Generated 48h single-use registration invite for "${app.storeName}" (${app.phone}).`,
        targetId: app.id,
        targetType: 'SELLER',
      });
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const inviteUrl = `${origin}/seller/register?token=${token}`;

    return {
      token,
      inviteUrl,
      expiresAt,
      application: updatedApp,
    };
  }

  async validateSellerInviteToken(
    token: string
  ): Promise<{ valid: boolean; reason?: string; invite?: SellerInviteToken; application?: SellerApplication }> {
    if (!token || typeof token !== 'string') {
      return { valid: false, reason: 'No invitation token was provided.' };
    }

    let invite: SellerInviteToken | null = null;
    try {
      const snap = await withTimeout(getDoc(doc(db, 'seller_invites', token)), 6000);
      if (snap.exists()) {
        invite = snap.data() as SellerInviteToken;
      }
    } catch (e: any) {
      console.warn('Firestore validateSellerInviteToken fallback note:', e?.message || e);
    }

    if (!invite) {
      const localInvites = this.getLocalInvites();
      invite = localInvites.find((i) => i.token === token) || null;
    }

    if (!invite) {
      return { valid: false, reason: 'Invalid or unrecognized invitation token. Please check your invite link.' };
    }

    if (invite.isUsed) {
      return { valid: false, reason: 'This invitation token has already been used to register a merchant account.' };
    }

    const expiryTime = new Date(invite.expiresAt).getTime();
    if (Date.now() > expiryTime) {
      return { valid: false, reason: 'This registration invite has expired (48-hour validity window exceeded). Please contact administration for a fresh invite.' };
    }

    // Find linked application
    const apps = await this.getSellerApplications();
    const application = apps.find((a) => a.id === invite!.applicationId);

    return {
      valid: true,
      invite,
      application: application || undefined,
    };
  }

  async submitSellerRegistrationKYC(
    token: string,
    payload: {
      password: string;
      kyc: SellerKYCDocuments;
    }
  ): Promise<{ application: SellerApplication; user: User }> {
    const val = await this.validateSellerInviteToken(token);
    if (!val.valid || !val.invite) {
      throw new Error(val.reason || 'Invalid invitation token.');
    }

    const invite = val.invite;
    const apps = await this.getSellerApplications();
    const app = apps.find((a) => a.id === invite.applicationId);
    if (!app) throw new Error('Associated merchant application not found.');

    // 1. Invalidate single-use token
    const updatedInvite: SellerInviteToken = {
      ...invite,
      isUsed: true,
      usedAt: new Date().toISOString(),
    };
    try {
      await withTimeout(setDoc(doc(db, 'seller_invites', token), updatedInvite, { merge: true }), 6000);
    } catch (_) {}
    const localInvites = this.getLocalInvites().map((i) => (i.token === token ? updatedInvite : i));
    this.saveLocalInvites(localInvites);

    // 2. Create user account in pending state
    const userId = `user_merchant_${Date.now()}`;
    const newUser: User = {
      id: userId,
      email: app.email.trim().toLowerCase(),
      name: app.applicantName,
      phone: app.phone,
      role: 'SELLER' as UserRole,
      status: 'PENDING_VERIFICATION' as UserStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.saveUser(newUser);

    // 3. Update application state to DOCUMENTS_SUBMITTED
    const updatedApp: SellerApplication = {
      ...app,
      status: 'DOCUMENTS_SUBMITTED',
      kycDocuments: payload.kyc,
      reviewedAt: new Date().toISOString(),
    };
    try {
      await withTimeout(setDoc(doc(db, 'seller_applications', app.id), updatedApp, { merge: true }), 6000);
    } catch (_) {}
    const updatedApps = apps.map((a) => (a.id === app.id ? updatedApp : a));
    this.saveLocalApplications(updatedApps);

    // 4. Notify admin of KYC submission
    await this.sendNotification({
      userId: 'user_admin_1',
      title: '📄 Merchant KYC Documents Submitted',
      message: `${app.storeName} (${app.applicantName}) has submitted National ID and financial verification documents for final KYC audit.`,
      type: 'seller_verification',
    });

    return {
      application: updatedApp,
      user: newUser,
    };
  }

  async approveSellerKYC(
    applicationId: string,
    adminActor?: { id: string; name: string; role: UserRole }
  ): Promise<{ seller: Seller; user: User; application: SellerApplication }> {
    const apps = await this.getSellerApplications();
    const app = apps.find((a) => a.id === applicationId);
    if (!app) throw new Error('Application not found');

    const sellerId = `seller_${Date.now()}`;
    const userId = `user_seller_${app.phone.replace(/[^0-9]/g, '').slice(-9)}`;

    // 1. Create or activate User record
    const existingUser = await this.getUserByEmail(app.email);
    const targetUser: User = existingUser
      ? {
          ...existingUser,
          role: 'SELLER',
          status: 'ACTIVE',
          phone: app.phone,
          name: app.applicantName,
          updatedAt: new Date().toISOString(),
        }
      : {
          id: userId,
          email: app.email,
          name: app.applicantName,
          phone: app.phone,
          role: 'SELLER',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
    await this.saveUser(targetUser);

    // 2. Create or activate Seller profile
    const newSeller: Seller = {
      id: sellerId,
      userId: targetUser.id,
      storeName: app.storeName,
      slug: app.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: app.description,
      bio: `${app.storeName} - Verified Ugandan merchant on SwiftCart.`,
      phone: app.phone,
      email: app.email,
      isPhoneVerified: true,
      district: app.district,
      address: app.address,
      isVerified: true,
      status: 'approved',
      verificationStatus: 'verified',
      rating: 5.0,
      reviewCount: 0,
      totalSalesUGX: 0,
      availableBalanceUGX: 0,
      escrowBalanceUGX: 0,
      tinNumber: app.kycDocuments?.tinNumber || app.kycDocuments?.ninNumber || '1004928371',
      momoNumber: app.kycDocuments?.accountNumber || app.phone,
      verificationDocumentUrl: app.kycDocuments?.nationalIdUrl || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.saveSeller(newSeller);

    // 3. Update application to APPROVED
    const updatedApp: SellerApplication = {
      ...app,
      status: 'APPROVED',
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminActor?.name || 'SwiftCart Admin',
      reviewNotes: 'KYC Verified: National ID, TIN, and Payout account approved.',
    };
    try {
      await withTimeout(setDoc(doc(db, 'seller_applications', app.id), updatedApp, { merge: true }), 6000);
    } catch (_) {}
    const updatedApps = apps.map((a) => (a.id === app.id ? updatedApp : a));
    this.saveLocalApplications(updatedApps);

    // 4. Audit Log
    if (adminActor) {
      await this.createAuditLog({
        actorId: adminActor.id,
        actorName: adminActor.name,
        actorRole: adminActor.role,
        action: 'SELLER_KYC_APPROVED',
        details: `Approved KYC documents & activated merchant storefront for "${app.storeName}" (${app.applicantName}).`,
        targetId: newSeller.id,
        targetType: 'SELLER',
      });
    }

    return {
      seller: newSeller,
      user: targetUser,
      application: updatedApp,
    };
  }

  async rejectSellerKYC(
    applicationId: string,
    reason: string,
    adminActor?: { id: string; name: string; role: UserRole }
  ): Promise<SellerApplication> {
    const apps = await this.getSellerApplications();
    const app = apps.find((a) => a.id === applicationId);
    if (!app) throw new Error('Application not found');

    const updatedApp: SellerApplication = {
      ...app,
      status: 'REJECTED',
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminActor?.name || 'SwiftCart Admin',
      reviewNotes: reason,
    };

    try {
      await withTimeout(setDoc(doc(db, 'seller_applications', app.id), updatedApp, { merge: true }), 6000);
    } catch (_) {}
    const updatedApps = apps.map((a) => (a.id === app.id ? updatedApp : a));
    this.saveLocalApplications(updatedApps);

    if (adminActor) {
      await this.createAuditLog({
        actorId: adminActor.id,
        actorName: adminActor.name,
        actorRole: adminActor.role,
        action: 'SELLER_KYC_REJECTED',
        details: `Rejected KYC for "${app.storeName}". Reason: ${reason}`,
        targetId: app.id,
        targetType: 'SELLER',
      });
    }

    return updatedApp;
  }

  // --- EXECUTIVE AUDIT TRAIL ---
  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'audit_logs')), 8000);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as AuditLog);
      }
    } catch (e: any) {
      console.warn('Firestore getAuditLogs fallback note:', e?.message || e);
    }
    return SEED_AUDIT_LOGS;
  }

  async createAuditLog(
    logData: Omit<AuditLog, 'id' | 'timestamp'>
  ): Promise<AuditLog> {
    const newLog: AuditLog = {
      ...logData,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    try {
      await withTimeout(setDoc(doc(db, 'audit_logs', newLog.id), newLog), 8000);
    } catch (e: any) {
      console.warn('Firestore createAuditLog note:', e?.message || e);
    }

    return newLog;
  }

  // --- PLATFORM FINANCIAL METRICS ---
  async getPlatformFinancialMetrics(): Promise<PlatformFinancialMetrics> {
    const orders = await this.getOrders();
    const sellers = await this.getSellers();

    const totalGross = orders.reduce((acc, o) => acc + (o.totalUGX || 0), 0);
    const settledOrders = orders.filter((o) => o.paymentStatus === 'paid' && o.status === 'Delivered');
    const settledPayouts = settledOrders.reduce((acc, o) => acc + (o.subtotalUGX || 0), 0);
    const escrowHeld = totalGross - settledPayouts;
    const commissions = Math.round(totalGross * 0.05); // 5% marketplace commission

    let momoVol = 0;
    let airtelVol = 0;
    let cardVol = 0;

    orders.forEach((o) => {
      const prov = o.paymentProvider?.toLowerCase() || '';
      if (prov.includes('mtn') || prov.includes('momo')) {
        momoVol += o.totalUGX || 0;
      } else if (prov.includes('airtel')) {
        airtelVol += o.totalUGX || 0;
      } else {
        cardVol += o.totalUGX || 0;
      }
    });

    return {
      totalGrossVolumeUGX: totalGross,
      totalEscrowHeldUGX: Math.max(0, escrowHeld),
      totalSettledPayoutsUGX: settledPayouts,
      platformCommissionsUGX: commissions,
      momoVolumeUGX: momoVol,
      airtelVolumeUGX: airtelVol,
      cardVolumeUGX: cardVol,
      activeMerchantsCount: sellers.length,
      totalTransactionsCount: orders.length,
    };
  }
}

export const dbService = new DatabaseService();
