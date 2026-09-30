import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { paymentService } from '../services/paymentService';
import { DeliveryAddress, PaymentMethod, PaymentProvider, Order } from '../types';
import { formatUGX, formatUgandaPhoneToInternational } from '../utils/formatters';
import { UGANDA_DISTRICTS } from '../data/seedData';
import {
  X,
  MapPin,
  Truck,
  Phone,
  Store,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  Loader2,
  ArrowRight,
  Package,
  MessageCircle,
  Share2,
  ExternalLink,
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (masterOrderId: string) => void;
  onOpenAuth?: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
  onOpenAuth,
}) => {
  const { items, sellerPackages, totalProductsAmountUGX, totalDeliveryFeeUGX, grandTotalUGX, clearCart } = useCart();
  const { currentUser } = useAuth();

  // Step state: 'details' | 'success'
  const [step, setStep] = useState<'details' | 'success'>('details');

  // Address
  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [district, setDistrict] = useState(UGANDA_DISTRICTS[0] || 'Kampala');
  const [division, setDivision] = useState('Central Division');
  const [streetAddress, setStreetAddress] = useState('Plot 14, Kampala Road');
  const [notes, setNotes] = useState('');

  // GPS Geolocation state
  const [gpsCoordinates, setGpsCoordinates] = useState<{
    latitude: number;
    longitude: number;
    lat?: number;
    lng?: number;
  } | null>(null);
  const [isFetchingGps, setIsFetchingGps] = useState(false);
  const [gpsToast, setGpsToast] = useState<string | null>(null);
  const [gpsSuccess, setGpsSuccess] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_money');
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('mtn_momo');
  const [momoPhone, setMomoPhone] = useState(currentUser?.phone || '');

  // Synchronize with currentUser when logging in
  React.useEffect(() => {
    if (currentUser) {
      if (!fullName) setFullName(currentUser.name);
      if (!phone) setPhone(currentUser.phone);
      if (!momoPhone) setMomoPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdOrders, setCreatedOrders] = useState<Order[]>([]);
  const [createdMasterId, setCreatedMasterId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGetGpsLocation = () => {
    if (!('geolocation' in navigator)) {
      setGpsToast('Could not retrieve GPS. Please type your nearest landmark.');
      setTimeout(() => setGpsToast(null), 5000);
      return;
    }

    setIsFetchingGps(true);
    setGpsToast(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const coords = {
          latitude: lat,
          longitude: lng,
          lat,
          lng,
        };

        setGpsCoordinates(coords);
        setIsFetchingGps(false);
        setGpsSuccess(true);

        const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;

        // Automatically append Google Maps link to notes
        setNotes((prev) => {
          if (prev && prev.includes(mapsLink)) return prev;
          return prev ? `${prev} | GPS Pin: ${mapsLink}` : `GPS Pin: ${mapsLink}`;
        });

        // Update default street address if not already custom
        setStreetAddress((prev) => {
          if (!prev || prev === 'Plot 14, Kampala Road') {
            return `Pinned GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          }
          return prev;
        });
      },
      (error) => {
        console.warn('Geolocation capture failed:', error);
        setIsFetchingGps(false);
        setGpsToast('Could not retrieve GPS. Please type your nearest landmark.');
        setTimeout(() => setGpsToast(null), 5000);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  if (!isOpen) return null;

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentUser) {
      if (onOpenAuth) {
        onClose();
        onOpenAuth();
      } else {
        setErrorMessage('Please sign in to place an order.');
      }
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Your cart is empty.');
      return;
    }

    const deliveryAddress: DeliveryAddress = {
      fullName,
      phone,
      district,
      divisionOrTown: division,
      streetAddress,
      notes,
      ...(gpsCoordinates ? { gpsCoordinates } : {}),
    };

    if (!momoPhone || momoPhone.trim().length < 9) {
      setErrorMessage('Please enter a valid Mobile Money phone number (e.g. 0772 123456 or 0701 445566).');
      return;
    }

    // Direct Live Pesapal v3 Mobile Money USSD Gateway
    setIsProcessing(true);
    setErrorMessage(null);
    const generatedMasterId = `SWIFT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      const pesapalRes = await paymentService.initiatePesapalPayment({
        orderId: generatedMasterId,
        amountUGX: grandTotalUGX,
        customerPhone: momoPhone,
        customerName: fullName,
        customerEmail: currentUser.email || 'buyer@swiftcart.ug',
      });

      if (pesapalRes.success && pesapalRes.redirect_url) {
        // Save pending split orders into database with paymentStatus: 'pending'
        const deliveryAddress: DeliveryAddress = {
          fullName,
          phone,
          district,
          divisionOrTown: division,
          streetAddress,
          notes,
          ...(gpsCoordinates ? { gpsCoordinates } : {}),
        };

        const { masterOrderId, subOrders } = await dbService.createSplitOrders({
          buyer: currentUser,
          deliveryAddress,
          cartItems: items,
          paymentMethod: 'mobile_money',
          paymentProvider,
          paymentPhone: momoPhone,
          paymentReference: pesapalRes.order_tracking_id || generatedMasterId,
          paymentStatus: 'pending',
        });

        clearCart();
        setCreatedMasterId(masterOrderId);
        setCreatedOrders(subOrders);

        // Redirect directly to the live Pesapal gateway for native handset USSD push
        window.location.href = pesapalRes.redirect_url;
        return;
      } else {
        setIsProcessing(false);
        setErrorMessage(
          pesapalRes.error ||
          'Payment gateway connection error. Please try again or check phone number.'
        );
      }
    } catch (pesapalErr) {
      console.error('Pesapal initiation error:', pesapalErr);
      setIsProcessing(false);
      setErrorMessage('Payment gateway connection error. Please try again or check phone number.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 my-4 flex flex-col max-h-[92vh] transition-colors duration-200">
        {/* Header */}
        <div className="bg-linear-to-r from-orange-600 to-amber-600 p-5 text-white flex justify-between items-center shrink-0">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-200 bg-orange-700/50 px-2 py-0.5 rounded-full">
              SwiftCart Checkout
            </span>
            <h3 className="text-xl font-extrabold mt-1">
              {step === 'success'
                ? 'Order Confirmed!'
                : 'Delivery & Payment Details'}
            </h3>
          </div>
          {step !== 'success' && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 font-semibold">
              {errorMessage}
            </div>
          )}

          {step === 'details' && (
            <form onSubmit={handleProceedToPayment} className="space-y-6">
              {!currentUser && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Account Sign In Required</span>
                    </div>
                    <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80">
                      Please sign in or register to place your order and enable real-time delivery tracking.
                    </p>
                  </div>
                  {onOpenAuth && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAuth();
                      }}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shrink-0 transition-all shadow-sm active:scale-95"
                    >
                      Sign In / Register
                    </button>
                  )}
                </div>
              )}

              {/* Multi-Vendor Order Split Summary Banner */}
              <div className="p-4 bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 rounded-2xl">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-950 dark:text-orange-200 mb-2">
                  <Package className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span>
                    Multi-Seller Order Split ({sellerPackages.length}{' '}
                    {sellerPackages.length === 1 ? 'Package' : 'Packages'})
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  To ensure fast fulfillment, your order is automatically divided into separate seller
                  packages:
                </p>
                <div className="space-y-2">
                  {sellerPackages.map((pkg, i) => (
                    <div
                      key={pkg.sellerId}
                      className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-orange-100 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] font-black flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div>
                          <strong className="text-slate-900 dark:text-white">{pkg.sellerStoreName}</strong>
                          <span className="text-slate-400 text-[11px] ml-1.5">
                            ({pkg.items.length} {pkg.items.length === 1 ? 'item' : 'items'})
                          </span>
                        </div>
                      </div>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">
                        {formatUGX(pkg.totalUGX)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400" /> Delivery Address in Uganda
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Recipient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Grace Kyomugisha"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Recipient Phone (For Delivery Rider) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+256 772 123456"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      District / Region *
                    </label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-800"
                    >
                      {UGANDA_DISTRICTS.map((d) => (
                        <option key={d} value={d} className="dark:bg-slate-800">
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Division / Municipality / Town *
                    </label>
                    <input
                      type="text"
                      required
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      placeholder="e.g. Nakawa, Ntinda, Kira"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Street Address / House / Landmark *
                    </label>

                    {/* Styled Pin My Current GPS Location Button */}
                    <button
                      type="button"
                      onClick={handleGetGpsLocation}
                      disabled={isFetchingGps}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-xs ${
                        gpsSuccess
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                          : 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/50 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 active:scale-95'
                      } disabled:opacity-60 cursor-pointer`}
                      title="Capture device GPS for exact courier navigation"
                    >
                      {isFetchingGps ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600 dark:text-orange-400" />
                          <span>Fetching GPS coordinates...</span>
                        </>
                      ) : (
                        <>
                          <span>📍</span>
                          <span>Use My Current Location (GPS)</span>
                        </>
                      )}
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. Plot 15, Near Total Petrol Station, Bukoto"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-800"
                  />

                  {/* Green confirmation badge when GPS location is pinned */}
                  {gpsSuccess && gpsCoordinates && (
                    <div className="flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-bold">
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                        <span>Exact GPS Location Pinned</span>
                        <span className="text-[11px] font-normal text-emerald-700 dark:text-emerald-300">
                          ({gpsCoordinates.latitude.toFixed(5)}, {gpsCoordinates.longitude.toFixed(5)})
                        </span>
                      </div>
                      <a
                        href={`https://maps.google.com/?q=${gpsCoordinates.latitude},${gpsCoordinates.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1"
                      >
                        Preview Pin ↗
                      </a>
                    </div>
                  )}

                  {/* Delivery Notes / Nearest Landmark */}
                  <div className="pt-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Delivery Notes / Nearest Landmark
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Black gate opposite supermarket, call rider upon arrival"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Selector - 100% Prepaid Mobile Money */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-orange-600 dark:text-orange-400" /> Prepaid Mobile Money Payment
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>100% Secure Prepaid Escrow via MTN MoMo & Airtel Money</span>
                  </span>
                </div>

                <div className="p-4 bg-orange-50/40 dark:bg-slate-800/60 border border-orange-200/80 dark:border-slate-700 rounded-2xl space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Select Telecom Network *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentProvider('mtn_momo')}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          paymentProvider === 'mtn_momo'
                            ? 'border-amber-500 bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-400/30'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                        }`}
                      >
                        <span className="text-base">🟡</span>
                        <span>MTN MoMo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentProvider('airtel_money')}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          paymentProvider === 'airtel_money'
                            ? 'border-red-600 bg-red-600 text-white font-black shadow-xs ring-2 ring-red-400/30'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-red-400'
                        }`}
                      >
                        <span className="text-base">🔴</span>
                        <span>Airtel Money</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Money Number (To receive USSD PIN Prompt) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={momoPhone}
                      onChange={(e) => setMomoPhone(e.target.value)}
                      placeholder="e.g. 0772 123456 or 0701 445566"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>100% Secure Prepaid Escrow via MTN MoMo & Airtel Money</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="p-4 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Total Items Subtotal:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatUGX(totalProductsAmountUGX)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Delivery ({sellerPackages.length} packages):</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatUGX(totalDeliveryFeeUGX)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-extrabold text-slate-900 dark:text-white">
                  <span>Grand Total to Pay:</span>
                  <span className="text-orange-600 dark:text-orange-400 text-base">{formatUGX(grandTotalUGX)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting to Pesapal USSD Gateway...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Order & Pay {formatUGX(grandTotalUGX)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step: Order Confirmation Success */}
          {step === 'success' && (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Order Successfully Placed
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                  Thank You for Shopping on SwiftCart!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Master Order ID: <strong className="text-slate-800 dark:text-slate-200">{createdMasterId}</strong>
                </p>
              </div>

              {/* Sub-Orders summary with WhatsApp Dispatch Integration */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Fulfillment Packages ({createdOrders.length})
                  </h4>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Dispatch Ready
                  </span>
                </div>

                <div className="space-y-3">
                  {createdOrders.map((ord) => {
                    const itemTitle = ord.items[0]?.title || 'Items';
                    const itemsSummary =
                      ord.items.length > 1 ? `${itemTitle} (+${ord.items.length - 1} more)` : itemTitle;
                    const addressStr = `${ord.deliveryAddress.streetAddress}, ${ord.deliveryAddress.divisionOrTown}, ${ord.deliveryAddress.district}`;
                    
                    // Seller international phone
                    const cleanSellerPhone = formatUgandaPhoneToInternational(
                      ord.sellerId === 'seller_kampala_tech'
                        ? '0782998877'
                        : ord.sellerId === 'seller_pearl_home'
                        ? '0701445566'
                        : ord.sellerId === 'seller_nakasero_fresh'
                        ? '0774556677'
                        : ord.sellerId === 'seller_owino_trends'
                        ? '0752001122'
                        : '0782998877'
                    );

                    // Customer international phone
                    const cleanBuyerPhone = formatUgandaPhoneToInternational(
                      ord.buyerPhone || ord.deliveryAddress.phone
                    );

                    const coords = ord.deliveryAddress.gpsCoordinates;
                    const lat = coords ? (coords.latitude ?? coords.lat) : undefined;
                    const lng = coords ? (coords.longitude ?? coords.lng) : undefined;
                    const gpsPinText = (lat !== undefined && lng !== undefined)
                      ? ` Delivery Pin: https://maps.google.com/?q=${lat},${lng}`
                      : '';

                    // Formatted WhatsApp message for seller
                    const sellerText = `Hello ${ord.sellerStoreName}, I have placed order *${ord.id}* for ${itemsSummary}. Total: UGX ${ord.totalUGX.toLocaleString()}. Delivery to: ${addressStr}.${gpsPinText}`;
                    const sellerWhatsAppUrl = `https://wa.me/${cleanSellerPhone}?text=${encodeURIComponent(sellerText)}`;

                    // Formatted WhatsApp message for customer receipt
                    const buyerReceiptText = `Hello ${ord.buyerName}, your SwiftCart Uganda order receipt for package *${ord.id}* (${ord.sellerStoreName}): Total: UGX ${ord.totalUGX.toLocaleString()}. Destination: ${addressStr}.${gpsPinText} Payment: ${ord.paymentMethod.toUpperCase()} (${ord.paymentStatus}). Track your order live on SwiftCart.`;
                    const buyerReceiptUrl = `https://wa.me/${cleanBuyerPhone}?text=${encodeURIComponent(buyerReceiptText)}`;

                    return (
                      <div
                        key={ord.id}
                        className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{ord.id}</span>
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                {ord.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <Store className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                              <span>Seller: <strong>{ord.sellerStoreName}</strong></span>
                              <span>•</span>
                              <span>{ord.items.length} item(s)</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {formatUGX(ord.totalUGX)}
                            </span>
                          </div>
                        </div>

                        {/* GPS pin preview if available */}
                        {lat !== undefined && lng !== undefined && (
                          <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-100 dark:border-emerald-800 text-[11px]">
                            <span className="text-emerald-800 dark:text-emerald-200 font-semibold flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-600" />
                              GPS Delivery Pin Attached
                            </span>
                            <a
                              href={`https://maps.google.com/?q=${lat},${lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 dark:text-emerald-300 font-bold hover:underline flex items-center gap-0.5"
                            >
                              <span>Open Map</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        )}

                        {/* WhatsApp Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2">
                          <a
                            href={sellerWhatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-w-[170px] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs"
                            title="Directly alert seller on WhatsApp for immediate packaging"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Notify Seller via WhatsApp</span>
                          </a>

                          <a
                            href={buyerReceiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all text-[11px]"
                            title="Send order receipt copy to your personal WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Send Receipt to WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onOrderSuccess(createdMasterId);
                  }}
                  className="w-full py-3.5 bg-slate-900 dark:bg-orange-600 hover:bg-slate-800 dark:hover:bg-orange-700 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Package className="w-4 h-4 text-amber-400" />
                  <span>Track My Orders Live</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Non-blocking GPS error toast */}
        {gpsToast && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm p-3.5 bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 text-xs font-semibold rounded-2xl shadow-xl border border-slate-700 dark:border-slate-300 backdrop-blur-md flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 dark:text-amber-600 text-sm">📍</span>
              <span>{gpsToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setGpsToast(null)}
              className="text-slate-400 hover:text-white dark:text-slate-500 dark:hover:text-slate-900 text-xs px-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
