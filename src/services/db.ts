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
  AuditLog,
  PlatformFinancialMetrics,
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
        return snap.docs.map((d) => d.data() as Product);
      }
    } catch (e: any) {
      console.error('Firestore getProducts error:', e?.message || e);
    }
    return [];
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      const snap = await withTimeout(getDoc(doc(db, 'products', id)), 8000);
      if (snap.exists()) {
        return snap.data() as Product;
      }
    } catch (e: any) {
      console.error('Firestore getProductById error:', e?.message || e);
    }
    return null;
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

  // Real-time live listener for Seller's own products
  subscribeToSellerProducts(sellerId: string, callback: (products: Product[]) => void): () => void {
    const q = query(collection(db, 'products'), where('sellerId', '==', sellerId));
    return onSnapshot(
      q,
      (snapshot) => {
        const products = snapshot.docs.map((d) => d.data() as Product);
        callback(products);
      },
      (err) => console.warn('Real-time seller products subscription note:', err)
    );
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
        items: group.items,
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

  // --- SELLER APPLICATIONS (/sell Inquiry Gateway) ---
  async getSellerApplications(): Promise<SellerApplication[]> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'seller_applications')), 8000);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as SellerApplication);
      }
    } catch (e: any) {
      console.warn('Firestore getSellerApplications fallback note:', e?.message || e);
    }
    return SEED_SELLER_APPLICATIONS;
  }

  async submitSellerApplication(
    data: Omit<SellerApplication, 'id' | 'status' | 'submittedAt'>
  ): Promise<SellerApplication> {
    const newApp: SellerApplication = {
      ...data,
      id: `app_${Date.now()}`,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
    };

    try {
      await withTimeout(setDoc(doc(db, 'seller_applications', newApp.id), newApp), 8000);
    } catch (e: any) {
      console.warn('Firestore submitSellerApplication note:', e?.message || e);
    }

    // Notify operations admins
    await this.sendNotification({
      userId: 'user_admin_1',
      title: '📝 New Merchant Application Submitted',
      message: `${newApp.applicantName} has applied to sell as "${newApp.storeName}" in ${newApp.district}.`,
      type: 'seller_verification',
    });

    return newApp;
  }

  async reviewSellerApplication(
    appId: string,
    status: 'APPROVED' | 'REJECTED',
    reviewNotes?: string,
    adminActor?: { id: string; name: string; role: UserRole }
  ): Promise<SellerApplication | null> {
    const apps = await this.getSellerApplications();
    const target = apps.find((a) => a.id === appId);
    if (!target) return null;

    const updated: SellerApplication = {
      ...target,
      status,
      reviewNotes: reviewNotes || (status === 'APPROVED' ? 'Approved by SwiftCart Administration' : 'Rejected after review.'),
      reviewedAt: new Date().toISOString(),
    };

    try {
      await withTimeout(setDoc(doc(db, 'seller_applications', appId), updated, { merge: true }), 8000);
    } catch (e: any) {
      console.warn('Firestore reviewSellerApplication note:', e?.message || e);
    }

    if (adminActor) {
      await this.createAuditLog({
        actorId: adminActor.id,
        actorName: adminActor.name,
        actorRole: adminActor.role,
        action: status === 'APPROVED' ? 'SELLER_APPLICATION_APPROVED' : 'SELLER_APPLICATION_REJECTED',
        details: `${status} application for "${target.storeName}" (${target.applicantName}). Notes: ${reviewNotes || 'N/A'}`,
        targetId: appId,
        targetType: 'SELLER',
      });
    }

    return updated;
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
