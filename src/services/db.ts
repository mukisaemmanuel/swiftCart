import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Product,
  Seller,
  Order,
  Review,
  User,
  CartItem,
  DeliveryAddress,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  WishlistItem,
  AppNotification,
  VerificationDocumentType,
  NotificationPreferences,
} from '../types';
import {
  SEED_PRODUCTS,
  SEED_SELLERS,
  SEED_REVIEWS,
  SEED_USERS,
  SEED_ORDERS,
} from '../data/seedData';

const LS_PRODUCTS_KEY = 'swiftcart_products_v1';
const LS_SELLERS_KEY = 'swiftcart_sellers_v1';
const LS_ORDERS_KEY = 'swiftcart_orders_v1';
const LS_REVIEWS_KEY = 'swiftcart_reviews_v1';
const LS_USERS_KEY = 'swiftcart_users_v1';
const LS_WISHLIST_KEY = 'swiftcart_wishlist_v1';
const LS_NOTIFICATIONS_KEY = 'swiftcart_notifications_v1';

class DatabaseService {
  private initialized = false;

  async initDatabase(): Promise<void> {
    if (this.initialized) return;

    try {
      const prodCol = collection(db, 'products');
      const snap = await getDocs(prodCol);

      if (snap.empty) {
        for (const p of SEED_PRODUCTS) {
          await setDoc(doc(db, 'products', p.id), p);
        }
        for (const s of SEED_SELLERS) {
          await setDoc(doc(db, 'sellers', s.id), s);
        }
        for (const r of SEED_REVIEWS) {
          await setDoc(doc(db, 'reviews', r.id), r);
        }
        for (const u of SEED_USERS) {
          await setDoc(doc(db, 'users', u.id), u);
        }
        for (const o of SEED_ORDERS) {
          await setDoc(doc(db, 'orders', o.id), o);
        }
      }
      this.initialized = true;
    } catch (err) {
      console.warn('Firestore fallback to local storage:', err);
      if (!localStorage.getItem(LS_PRODUCTS_KEY)) {
        localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(SEED_PRODUCTS));
      }
      if (!localStorage.getItem(LS_SELLERS_KEY)) {
        localStorage.setItem(LS_SELLERS_KEY, JSON.stringify(SEED_SELLERS));
      }
      if (!localStorage.getItem(LS_REVIEWS_KEY)) {
        localStorage.setItem(LS_REVIEWS_KEY, JSON.stringify(SEED_REVIEWS));
      }
      if (!localStorage.getItem(LS_USERS_KEY)) {
        localStorage.setItem(LS_USERS_KEY, JSON.stringify(SEED_USERS));
      }
      if (!localStorage.getItem(LS_ORDERS_KEY)) {
        localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(SEED_ORDERS));
      }
      this.initialized = true;
    }

    if (!localStorage.getItem(LS_ORDERS_KEY)) {
      localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(SEED_ORDERS));
    }

    // Seed sample wishlist & notifications if empty
    if (!localStorage.getItem(LS_WISHLIST_KEY)) {
      const initialWishlist: WishlistItem[] = [
        {
          id: 'wish_1',
          userId: 'user_buyer_1',
          productId: 'prod_1',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'wish_2',
          userId: 'user_buyer_1',
          productId: 'prod_3',
          createdAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem(LS_WISHLIST_KEY, JSON.stringify(initialWishlist));
    }

    if (!localStorage.getItem(LS_NOTIFICATIONS_KEY)) {
      const initialNotifs: AppNotification[] = [
        {
          id: 'notif_welcome',
          userId: 'user_buyer_1',
          title: '⚡ Welcome to SwiftCart Uganda!',
          message: 'Enjoy same-day express delivery across Busia, Busitema, Jinja and seamless Mobile Money payments.',
          type: 'system',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem(LS_NOTIFICATIONS_KEY, JSON.stringify(initialNotifs));
    }
  }

  // --- USERS ---
  async getUsers(): Promise<User[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as User);
      }
    } catch (e) {
      console.warn('Users fetch fallback:', e);
    }
    const local = localStorage.getItem(LS_USERS_KEY);
    return local ? JSON.parse(local) : SEED_USERS;
  }

  async saveUser(user: User): Promise<void> {
    try {
      await setDoc(doc(db, 'users', user.id), user);
    } catch (e) {
      console.warn('Saving user fallback:', e);
    }
    const users = await this.getUsers();
    const updated = [...users.filter((u) => u.id !== user.id), user];
    localStorage.setItem(LS_USERS_KEY, JSON.stringify(updated));
  }

  async updateNotificationPreferences(userId: string, prefs: NotificationPreferences): Promise<void> {
    const users = await this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const updated: User = { ...user, notificationPreferences: prefs };
    await this.saveUser(updated);
  }

  // --- SELLERS ---
  async getSellers(): Promise<Seller[]> {
    try {
      const snap = await getDocs(collection(db, 'sellers'));
      if (!snap.empty) {
        const firestoreSellers = snap.docs.map((d) => d.data() as Seller);
        return firestoreSellers.map((fs) => {
          if (!fs.localZone) {
            const seed = SEED_SELLERS.find((ss) => ss.id === fs.id);
            if (seed) {
              return {
                ...fs,
                localZone: seed.localZone,
                availableZones: seed.availableZones,
                district: seed.district,
                storeName: seed.storeName,
              };
            }
          }
          return fs;
        });
      }
    } catch (e) {
      console.warn('Failed fetching sellers from firestore:', e);
    }
    const local = localStorage.getItem(LS_SELLERS_KEY);
    let sellers: Seller[] = local ? JSON.parse(local) : SEED_SELLERS;
    if (sellers.length === 0 || !sellers.some((s) => s.localZone)) {
      sellers = SEED_SELLERS;
      localStorage.setItem(LS_SELLERS_KEY, JSON.stringify(sellers));
    }
    return sellers;
  }

  async getSellerById(id: string): Promise<Seller | null> {
    const sellers = await this.getSellers();
    return sellers.find((s) => s.id === id || s.userId === id) || null;
  }

  async saveSeller(seller: Seller): Promise<void> {
    try {
      await setDoc(doc(db, 'sellers', seller.id), seller);
    } catch (e) {
      console.warn('Error saving seller fallback:', e);
    }
    const sellers = await this.getSellers();
    const index = sellers.findIndex((s) => s.id === seller.id);
    if (index >= 0) {
      sellers[index] = seller;
    } else {
      sellers.push(seller);
    }
    localStorage.setItem(LS_SELLERS_KEY, JSON.stringify(sellers));
  }

  async updateSellerStatus(sellerId: string, status: 'approved' | 'rejected'): Promise<void> {
    try {
      await updateDoc(doc(db, 'sellers', sellerId), { status });
    } catch (e) {
      console.warn('Fallback seller status update:', e);
    }
    const sellers = await this.getSellers();
    const updated = sellers.map((s) => (s.id === sellerId ? { ...s, status } : s));
    localStorage.setItem(LS_SELLERS_KEY, JSON.stringify(updated));
  }

  // Seller Verification Upload & Admin Approval
  async submitSellerVerification(
    sellerId: string,
    docUrl: string,
    docType: VerificationDocumentType,
    notes?: string
  ): Promise<Seller | null> {
    const seller = await this.getSellerById(sellerId);
    if (!seller) return null;

    const updated: Seller = {
      ...seller,
      verificationDocumentUrl: docUrl,
      verificationDocumentType: docType,
      verificationNotes: notes || 'Document submitted for administrative verification.',
      verificationUploadedAt: new Date().toISOString(),
      isVerified: false,
    };

    await this.saveSeller(updated);

    // Notify admins of verification request
    await this.sendNotification({
      userId: 'user_admin_1',
      title: '📄 New Seller Verification Request',
      message: `${seller.storeName} has uploaded a ${docType.replace('_', ' ')} for review.`,
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
      status: approve ? 'approved' : 'rejected',
      verificationNotes:
        adminNotes ||
        (approve
          ? 'Verification documents approved by SwiftCart Compliance Team.'
          : 'Verification rejected. Please re-upload clear government issued documentation.'),
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
      const snap = await getDocs(collection(db, 'products'));
      if (!snap.empty) {
        const firestoreProds = snap.docs.map((d) => d.data() as Product);
        return firestoreProds.map((fp) => {
          if (!fp.localZone) {
            const seed = SEED_PRODUCTS.find((sp) => sp.id === fp.id);
            if (seed) {
              return {
                ...fp,
                localZone: seed.localZone,
                availableZones: seed.availableZones,
                sellerDistrict: seed.sellerDistrict || 'Busia',
                sellerStoreName: seed.sellerStoreName,
              };
            }
          }
          return fp;
        });
      }
    } catch (e) {
      console.warn('Failed fetching products:', e);
    }
    const local = localStorage.getItem(LS_PRODUCTS_KEY);
    let prods: Product[] = local ? JSON.parse(local) : SEED_PRODUCTS;
    if (prods.length === 0 || !prods.some((p) => p.localZone)) {
      prods = SEED_PRODUCTS;
      localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(prods));
    }
    return prods;
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      const snap = await getDoc(doc(db, 'products', id));
      if (snap.exists()) {
        return snap.data() as Product;
      }
    } catch (e) {
      console.warn('Fallback getProductById:', e);
    }
    const prods = await this.getProducts();
    return prods.find((p) => p.id === id) || null;
  }

  async saveProduct(product: Product): Promise<void> {
    try {
      await setDoc(doc(db, 'products', product.id), product);
    } catch (e) {
      console.warn('Saving product fallback:', e);
    }
    const prods = await this.getProducts();
    const index = prods.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      prods[index] = product;
    } else {
      prods.unshift(product);
    }
    localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(prods));
  }

  async deleteProduct(productId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (e) {
      console.warn('Delete product fallback:', e);
    }
    const prods = await this.getProducts();
    const updated = prods.filter((p) => p.id !== productId);
    localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(updated));
  }

  // --- REVIEWS ---
  async getReviews(productId?: string): Promise<Review[]> {
    try {
      const snap = await getDocs(collection(db, 'reviews'));
      let list = snap.docs.map((d) => d.data() as Review);
      if (list.length === 0) {
        const local = localStorage.getItem(LS_REVIEWS_KEY);
        list = local ? JSON.parse(local) : SEED_REVIEWS;
      }
      if (productId) {
        return list.filter((r) => r.productId === productId);
      }
      return list;
    } catch (e) {
      const local = localStorage.getItem(LS_REVIEWS_KEY);
      const list: Review[] = local ? JSON.parse(local) : SEED_REVIEWS;
      return productId ? list.filter((r) => r.productId === productId) : list;
    }
  }

  async addReview(review: Review): Promise<void> {
    try {
      await setDoc(doc(db, 'reviews', review.id), review);
    } catch (e) {
      console.warn('Review save fallback:', e);
    }
    const reviews = await this.getReviews();
    reviews.unshift(review);
    localStorage.setItem(LS_REVIEWS_KEY, JSON.stringify(reviews));

    const product = await this.getProductById(review.productId);
    if (product) {
      const prodReviews = reviews.filter((r) => r.productId === review.productId);
      const avg = prodReviews.reduce((acc, cur) => acc + cur.rating, 0) / prodReviews.length;
      const updated = {
        ...product,
        rating: Number(avg.toFixed(1)),
        reviewCount: prodReviews.length,
      };
      await this.saveProduct(updated);
    }
  }

  // --- WISHLIST ITEMS ---
  async getWishlist(userId: string): Promise<WishlistItem[]> {
    try {
      const snap = await getDocs(collection(db, 'wishlist_items'));
      if (!snap.empty) {
        const all = snap.docs.map((d) => d.data() as WishlistItem);
        return all.filter((w) => w.userId === userId);
      }
    } catch (e) {
      console.warn('Wishlist fallback:', e);
    }
    const local = localStorage.getItem(LS_WISHLIST_KEY);
    const all: WishlistItem[] = local ? JSON.parse(local) : [];
    return all.filter((w) => w.userId === userId);
  }

  async getAllWishlistItems(): Promise<WishlistItem[]> {
    try {
      const snap = await getDocs(collection(db, 'wishlist_items'));
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as WishlistItem);
      }
    } catch (e) {
      console.warn('All wishlist fallback:', e);
    }
    const local = localStorage.getItem(LS_WISHLIST_KEY);
    return local ? JSON.parse(local) : [];
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

    try {
      await setDoc(doc(db, 'wishlist_items', item.id), item);
    } catch (e) {
      console.warn('Firestore wishlist save fallback:', e);
    }

    const local = localStorage.getItem(LS_WISHLIST_KEY);
    const all: WishlistItem[] = local ? JSON.parse(local) : [];
    all.push(item);
    localStorage.setItem(LS_WISHLIST_KEY, JSON.stringify(all));

    return item;
  }

  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    const local = localStorage.getItem(LS_WISHLIST_KEY);
    let all: WishlistItem[] = local ? JSON.parse(local) : [];
    const target = all.find((w) => w.userId === userId && w.productId === productId);

    if (target) {
      try {
        await deleteDoc(doc(db, 'wishlist_items', target.id));
      } catch (e) {
        console.warn('Delete wishlist doc fallback:', e);
      }
    }

    all = all.filter((w) => !(w.userId === userId && w.productId === productId));
    localStorage.setItem(LS_WISHLIST_KEY, JSON.stringify(all));
  }

  async isProductInWishlist(userId: string, productId: string): Promise<boolean> {
    const list = await this.getWishlist(userId);
    return list.some((w) => w.productId === productId);
  }

  // Get wishlist popularity metrics for sellers
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

  // --- NOTIFICATIONS & PUSH ---
  async getNotifications(userId: string): Promise<AppNotification[]> {
    try {
      const snap = await getDocs(collection(db, 'notifications'));
      if (!snap.empty) {
        const notifs = snap.docs.map((d) => d.data() as AppNotification);
        return notifs
          .filter((n) => n.userId === userId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } catch (e) {
      console.warn('Notifications fetch fallback:', e);
    }
    const local = localStorage.getItem(LS_NOTIFICATIONS_KEY);
    const notifs: AppNotification[] = local ? JSON.parse(local) : [];
    return notifs
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async sendNotification(
    data: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
  ): Promise<AppNotification> {
    const notif: AppNotification = {
      ...data,
      id: `notif_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'notifications', notif.id), notif);
    } catch (e) {
      console.warn('Save notif fallback:', e);
    }

    const local = localStorage.getItem(LS_NOTIFICATIONS_KEY);
    const all: AppNotification[] = local ? JSON.parse(local) : [];
    all.unshift(notif);
    localStorage.setItem(LS_NOTIFICATIONS_KEY, JSON.stringify(all));

    // Trigger browser Web Push notification if permission is granted
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(notif.title, {
            body: notif.message,
            icon: '/favicon.ico',
          });
        } catch {
          // Ignore push error in non-service worker or restricted iframe
        }
      }
    }

    return notif;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      console.warn('Mark notif read fallback:', e);
    }
    const local = localStorage.getItem(LS_NOTIFICATIONS_KEY);
    if (local) {
      const all: AppNotification[] = JSON.parse(local);
      const updated = all.map((n) => (n.id === id ? { ...n, read: true } : n));
      localStorage.setItem(LS_NOTIFICATIONS_KEY, JSON.stringify(updated));
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const local = localStorage.getItem(LS_NOTIFICATIONS_KEY);
    if (local) {
      const all: AppNotification[] = JSON.parse(local);
      const updated = all.map((n) => (n.userId === userId ? { ...n, read: true } : n));
      localStorage.setItem(LS_NOTIFICATIONS_KEY, JSON.stringify(updated));
    }
  }

  // --- ORDERS & MULTI-VENDOR SPLITTING ---
  async getOrders(): Promise<Order[]> {
    try {
      const snap = await getDocs(collection(db, 'orders'));
      if (!snap.empty) {
        const orders = snap.docs.map((d) => d.data() as Order);
        return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } catch (e) {
      console.warn('Failed fetching orders:', e);
    }
    const local = localStorage.getItem(LS_ORDERS_KEY);
    let orders: Order[] = local ? JSON.parse(local) : SEED_ORDERS;
    if (orders.length === 0) {
      orders = SEED_ORDERS;
      localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(orders));
    }
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createSplitOrders(params: {
    buyer: User;
    deliveryAddress: DeliveryAddress;
    cartItems: CartItem[];
    paymentMethod: PaymentMethod;
    paymentProvider?: PaymentProvider;
    paymentPhone?: string;
    paymentReference?: string;
    paymentStatus?: PaymentStatus;
  }): Promise<{ masterOrderId: string; subOrders: Order[] }> {
    const masterOrderId = `SWIFT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const sellerGroups = new Map<string, { sellerStoreName: string; items: CartItem[] }>();

    for (const item of params.cartItems) {
      const sId = item.product.sellerId;
      if (!sellerGroups.has(sId)) {
        sellerGroups.set(sId, {
          sellerStoreName: item.product.sellerStoreName,
          items: [],
        });
      }
      sellerGroups.get(sId)!.items.push(item);
    }

    const subOrders: Order[] = [];
    let packageIndex = 1;

    for (const [sellerId, group] of sellerGroups.entries()) {
      const subtotalUGX = group.items.reduce(
        (sum, it) => sum + it.product.priceUGX * it.quantity,
        0
      );
      const deliveryFeeUGX = 5000;
      const totalUGX = subtotalUGX + deliveryFeeUGX;

      const orderId = `${masterOrderId}-PKG${packageIndex}`;
      packageIndex++;

      const subOrder: Order = {
        id: orderId,
        masterOrderId,
        buyerId: params.buyer.id,
        buyerName: params.buyer.name,
        buyerPhone: params.buyer.phone || params.deliveryAddress.phone,
        buyerEmail: params.buyer.email,
        deliveryAddress: params.deliveryAddress,
        sellerId,
        sellerStoreName: group.sellerStoreName,
        items: group.items.map((i) => ({
          productId: i.product.id,
          title: i.product.title,
          priceUGX: i.product.priceUGX,
          quantity: i.quantity,
          image: i.product.images[0] || '',
          category: i.product.category,
        })),
        subtotalUGX,
        deliveryFeeUGX,
        totalUGX,
        paymentMethod: params.paymentMethod,
        paymentProvider: params.paymentProvider,
        paymentPhone: params.paymentPhone,
        paymentReference: params.paymentReference,
        paymentStatus: params.paymentStatus || 'paid',
        status: 'Pending',
        trackingHistory: [
          {
            status: 'Pending',
            timestamp: now,
            note: 'Order placed by buyer and sent to seller for fulfillment.',
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      try {
        await setDoc(doc(db, 'orders', subOrder.id), subOrder);
      } catch (err) {
        console.warn('Order save fallback:', err);
      }
      subOrders.push(subOrder);

      // Decrement stock for products
      for (const it of group.items) {
        const prod = await this.getProductById(it.product.id);
        if (prod) {
          const newStock = Math.max(0, prod.stockQuantity - it.quantity);
          await this.saveProduct({ ...prod, stockQuantity: newStock });
        }
      }

      // Notify seller of new order!
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

    // Buyer notification for order placement
    await this.sendNotification({
      userId: params.buyer.id,
      title: '📦 Order Successfully Placed!',
      message: `Your master order ${masterOrderId} with ${subOrders.length} package(s) was confirmed. We are preparing it for delivery!`,
      type: 'order_status',
      orderId: masterOrderId,
    });

    const existingOrders = await this.getOrders();
    const updatedOrders = [...subOrders, ...existingOrders];
    localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(updatedOrders));

    return { masterOrderId, subOrders };
  }

  async updateOrderStatus(
    orderId: string,
    status: Order['status'],
    note?: string,
    paymentStatus?: PaymentStatus
  ): Promise<Order | null> {
    const orders = await this.getOrders();
    const orderIndex = orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) return null;

    const currentOrder = orders[orderIndex];
    const now = new Date().toISOString();
    const trackingHistory = [
      ...currentOrder.trackingHistory,
      {
        status,
        timestamp: now,
        note: note || `Order updated to ${status}.`,
      },
    ];

    const updatedOrder: Order = {
      ...currentOrder,
      status,
      ...(paymentStatus ? { paymentStatus } : {}),
      trackingHistory,
      updatedAt: now,
    };

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status,
        ...(paymentStatus ? { paymentStatus } : {}),
        trackingHistory,
        updatedAt: now,
      });
    } catch (err) {
      console.warn('Update order status fallback:', err);
    }

    orders[orderIndex] = updatedOrder;
    localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(orders));

    // Send push / in-app notification to buyer
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
        o.paymentStatus = paymentStatus;
        o.updatedAt = now;
        try {
          await updateDoc(doc(db, 'orders', o.id), {
            paymentStatus,
            updatedAt: now,
          });
        } catch {
          // localStorage fallback
        }
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(orders));
    }
    return updatedCount;
  }
}

export const dbService = new DatabaseService();
