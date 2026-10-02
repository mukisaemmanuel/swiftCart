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
  KeyRound,
  Building2,
  Globe,
  FileText,
  AlertCircle,
  HelpCircle,
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

  // Step state: 'details' | 'pin_prompt' | 'success'
  const [step, setStep] = useState<'details' | 'pin_prompt' | 'success'>('details');

  // Mobile Money PIN prompt & USSD simulation state
  const [enteredPin, setEnteredPin] = useState('');
  const [pinStatus, setPinStatus] = useState<'idle' | 'verifying' | 'approved' | 'failed'>('idle');
  const [paymentTxId, setPaymentTxId] = useState('');
  const [redirectCountdown, setRedirectCountdown] = useState<number>(2);

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

  // Payment Method Selection
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_money');
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('mtn_momo');
  const [momoPhone, setMomoPhone] = useState(currentUser?.phone || '');

  // Card payment details
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState(currentUser?.name || '');

  // Bank Transfer selection
  const [selectedBank, setSelectedBank] = useState('Stanbic Bank Uganda');

  // Terms and Cross-Border Policy Agreement
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  // Synchronize with currentUser when logging in
  React.useEffect(() => {
    if (currentUser) {
      if (!fullName) setFullName(currentUser.name);
      if (!phone) setPhone(currentUser.phone);
      if (!momoPhone) setMomoPhone(currentUser.phone);
      if (!cardHolder) setCardHolder(currentUser.name);
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

        setNotes((prev) => {
          if (prev && prev.includes(mapsLink)) return prev;
          return prev ? `${prev} | GPS Pin: ${mapsLink}` : `GPS Pin: ${mapsLink}`;
        });

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

    if (!agreedToTerms) {
      setErrorMessage('Please accept the SwiftCart Terms & Conditions and Cross-Border Policy to proceed.');
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

    const generatedMasterId = `SWIFT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // Validate inputs per payment method
    if (paymentMethod === 'mobile_money') {
      if (!momoPhone || momoPhone.trim().length < 9) {
        setErrorMessage('Please enter a valid Mobile Money phone number (e.g. 0772 123456).');
        return;
      }
    } else if (paymentMethod === 'card') {
      if (!cardNumber || cardNumber.replace(/\s/g, '').length < 15) {
        setErrorMessage('Please enter a valid 16-digit card number.');
        return;
      }
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const activeProvider: PaymentProvider =
        paymentMethod === 'mobile_money'
          ? paymentProvider
          : paymentMethod === 'card'
          ? 'visa_mastercard'
          : paymentMethod === 'bank_transfer'
          ? 'bank_eft'
          : 'cash_border';

      const momoRes = await paymentService.initiatePayment({
        orderReference: generatedMasterId,
        amountUGX: grandTotalUGX,
        customerPhone: momoPhone || phone,
        customerName: fullName,
        provider: activeProvider,
        narration: `SwiftCart Order ${generatedMasterId}`,
      });

      setPaymentTxId(momoRes.transactionId);
      setIsProcessing(false);

      if (paymentMethod === 'mobile_money') {
        setStep('pin_prompt');
        setPinStatus('idle');
        setEnteredPin('');
      } else {
        // Direct approval for Card / EFT / Border Cash
        await finalizeOrderCreation(generatedMasterId, deliveryAddress, activeProvider, momoRes.transactionId);
      }
    } catch (err: any) {
      console.error('Payment initiation error:', err);
      setIsProcessing(false);
      setErrorMessage(err?.message || 'Payment initiation error. Please try again.');
    }
  };

  const finalizeOrderCreation = async (
    masterId: string,
    deliveryAddress: DeliveryAddress,
    provider: PaymentProvider,
    txId: string
  ) => {
    try {
      const orderDocs: Order[] = [];

      for (const pkg of sellerPackages) {
        const subOrderId = `${masterId}-${pkg.sellerId.slice(-3).toUpperCase()}`;

        const newOrderData: Omit<Order, 'id'> = {
          masterOrderId: masterId,
          buyerId: currentUser?.id || 'guest',
          buyerName: fullName,
          buyerPhone: phone,
          buyerEmail: currentUser?.email || '',
          deliveryAddress,
          sellerId: pkg.sellerId,
          sellerStoreName: pkg.sellerStoreName,
          items: pkg.items.map((ci) => ({
            productId: ci.product.id,
            title: ci.product.title,
            priceUGX: ci.product.priceUGX,
            quantity: ci.quantity,
            image: ci.product.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
            category: ci.product.category,
          })),
          subtotalUGX: pkg.subtotalUGX,
          deliveryFeeUGX: pkg.deliveryFeeUGX,
          totalUGX: pkg.totalUGX,
          paymentMethod: paymentMethod,
          paymentProvider: provider,
          paymentPhone: momoPhone || phone,
          paymentReference: txId,
          paymentStatus: paymentMethod === 'pay_on_delivery' ? 'pending' : 'paid',
          status: 'Confirmed',
          trackingHistory: [
            {
              status: 'Confirmed',
              timestamp: new Date().toISOString(),
              note: `Payment authorized via ${provider.toUpperCase().replace('_', ' ')}. Seller packaging your order.`,
            },
          ],
          createdAt: new Date().toISOString(),
        };

        const createdId = await dbService.createOrder(newOrderData);
        orderDocs.push({ id: createdId, ...newOrderData });
      }

      setCreatedOrders(orderDocs);
      setCreatedMasterId(masterId);
      clearCart();
      setStep('success');
    } catch (e: any) {
      console.error('Finalize order error:', e);
      setErrorMessage('Failed to register orders in database. Please contact support.');
    }
  };

  const handleConfirmPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (enteredPin.length < 4) {
      setErrorMessage('Please enter your 4-digit Mobile Money PIN to authorize payment.');
      return;
    }

    setErrorMessage(null);
    setPinStatus('verifying');

    try {
      await paymentService.simulatePinEntryApproval(paymentTxId);
      setPinStatus('approved');

      const deliveryAddress: DeliveryAddress = {
        fullName,
        phone,
        district,
        divisionOrTown: division,
        streetAddress,
        notes,
        ...(gpsCoordinates ? { gpsCoordinates } : {}),
      };

      const generatedMasterId = `SWIFT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      await finalizeOrderCreation(generatedMasterId, deliveryAddress, paymentProvider, paymentTxId);
    } catch (err: any) {
      setPinStatus('failed');
      setErrorMessage(err?.message || 'Payment authentication failed. Incorrect PIN.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                {step === 'details' ? 'Secure Multi-Vendor Checkout' : step === 'pin_prompt' ? 'Authorize Payment' : 'Order Placed!'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                100% Buyer Protection & Escrow Guarantee across Uganda & Borders
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Step 1: Details & Payment Method Selection */}
          {step === 'details' && (
            <form onSubmit={handleProceedToPayment} className="space-y-6">
              {/* Packages Summary */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Fulfillment Packages ({sellerPackages.length})
                </span>
                <div className="space-y-1.5">
                  {sellerPackages.map((pkg, i) => (
                    <div
                      key={pkg.sellerId}
                      className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] font-black flex items-center justify-center">
                          {i + 1}
                        </span>
                        <strong className="text-slate-900 dark:text-white">{pkg.sellerStoreName}</strong>
                        <span className="text-slate-400 text-[11px]">({pkg.items.length} items)</span>
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
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-orange-600" /> Delivery Address in Uganda & East Africa
                  </h4>
                  <button
                    type="button"
                    onClick={handleGetGpsLocation}
                    disabled={isFetchingGps}
                    className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {isFetchingGps ? 'Locating GPS...' : '📍 Use Current GPS'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Grace Kyomugisha"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0772 123456"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">District / Region *</label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-2 focus:ring-orange-500"
                    >
                      {UGANDA_DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Town / Division / Street *</label>
                    <input
                      type="text"
                      required
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="e.g. Plot 15, Near Total Petrol Station"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* PAYMENT METHOD SELECTOR (Mobile Money, Cards, Bank Transfer, Pay on Delivery) */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-orange-600" /> Select Payment Method
                </h4>

                {/* 4 Payment Options Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mobile_money')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                      paymentMethod === 'mobile_money'
                        ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 ring-2 ring-orange-400/30'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-orange-300'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-amber-500" />
                    <span>Mobile Money</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 ring-2 ring-orange-400/30'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-orange-300'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-purple-500" />
                    <span>Card / Visa / MC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                      paymentMethod === 'bank_transfer'
                        ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 ring-2 ring-orange-400/30'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-orange-300'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-emerald-500" />
                    <span>Bank EFT / Transfer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pay_on_delivery')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                      paymentMethod === 'pay_on_delivery'
                        ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 ring-2 ring-orange-400/30'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-orange-300'
                    }`}
                  >
                    <Truck className="w-5 h-5 text-blue-500" />
                    <span>Pay on Delivery / Border</span>
                  </button>
                </div>

                {/* Sub-form based on selected payment method */}
                {paymentMethod === 'mobile_money' && (
                  <div className="p-4 bg-orange-50/40 dark:bg-slate-800/60 border border-orange-200/80 dark:border-slate-700 rounded-2xl space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentProvider('mtn_momo')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          paymentProvider === 'mtn_momo'
                            ? 'border-amber-500 bg-amber-500 text-slate-950 font-black shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>🟡 MTN MoMo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentProvider('airtel_money')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          paymentProvider === 'airtel_money'
                            ? 'border-red-600 bg-red-600 text-white font-black shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>🔴 Airtel Money</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Mobile Money Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={momoPhone}
                        onChange={(e) => setMomoPhone(e.target.value)}
                        placeholder="0772 123456"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Accepted Cards:</span>
                      <span className="text-[11px] text-slate-400 font-medium">Visa • Mastercard • Amex • UnionPay</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Cardholder Name *</label>
                        <input
                          type="text"
                          required
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          placeholder="e.g. GRACE KYOMUGISHA"
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden uppercase"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Card Number *</label>
                        <input
                          type="text"
                          required
                          maxLength={19}
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                          placeholder="4000 1234 5678 9010"
                          className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Expiry (MM/YY) *</label>
                          <input
                            type="text"
                            maxLength={5}
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="12/28"
                            className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">CVV / CVC *</label>
                          <input
                            type="password"
                            maxLength={4}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="•••"
                            className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'bank_transfer' && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Bank *</label>
                      <select
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden font-bold"
                      >
                        <option value="Stanbic Bank Uganda">Stanbic Bank Uganda (A/C: 9030012849201)</option>
                        <option value="Centenary Bank">Centenary Bank (A/C: 310008492011)</option>
                        <option value="Absa Bank Uganda">Absa Bank Uganda (A/C: 6004829104)</option>
                        <option value="Equity Bank Uganda">Equity Bank Uganda (A/C: 100239482910)</option>
                      </select>
                    </div>

                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
                      <p className="font-bold">EFT / Direct Deposit Instructions:</p>
                      <p>Beneficiary: <strong>SwiftCart Uganda Escrow Account</strong></p>
                      <p>Account Reference: <strong>{fullName.toUpperCase().slice(0, 10)} / ESCROW</strong></p>
                    </div>
                  </div>
                )}

                {paymentMethod === 'pay_on_delivery' && (
                  <div className="p-4 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-2 text-xs text-blue-900 dark:text-blue-200">
                    <div className="flex items-center gap-2 font-bold">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span>Cash on Delivery / Border Payment Terms</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-blue-800/90 dark:text-blue-300">
                      Standard local delivery within Uganda is flat-rate. For regional cross-border packages (e.g. Busia, Malaba, Mutukula, Katuna border crossings), customs/clearance dues are payable at the border post upon courier handover as stipulated in our Terms & Conditions.
                    </p>
                  </div>
                )}
              </div>

              {/* CROSS-BORDER & CUSTOMS TERMS DISCLOSURE & CHECKBOX */}
              <div className="p-4 bg-amber-50/60 dark:bg-slate-800/60 border border-amber-200 dark:border-slate-700 rounded-2xl space-y-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="termsAgreement"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                  <label htmlFor="termsAgreement" className="text-slate-700 dark:text-slate-300 leading-relaxed cursor-pointer text-[11px]">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setIsTermsModalOpen(true)}
                      className="text-orange-600 dark:text-orange-400 font-bold underline cursor-pointer"
                    >
                      SwiftCart Terms & Conditions & Cross-Border Delivery Policy
                    </button>
                    . I understand that free/flat delivery applies locally, and cross-border customs/clearance dues are payable upon border arrival.
                  </label>
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
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Secure Authorization...</span>
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

          {/* Step 2: Handset PIN prompt for Mobile Money */}
          {step === 'pin_prompt' && (
            <div className="space-y-6 py-2">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border shadow-xs bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300">
                  <Smartphone className="w-3.5 h-3.5 animate-pulse text-amber-600 dark:text-amber-400" />
                  <span>
                    {paymentProvider === 'airtel_money' ? 'Airtel Money USSD Prompt' : 'MTN MoMo USSD Prompt'}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {pinStatus === 'approved' ? 'Payment Approved!' : 'Check Your Phone'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {pinStatus === 'approved'
                    ? 'Funds have been secured in 100% Buyer Protected Escrow.'
                    : `A payment prompt has been sent to +${formatUgandaPhoneToInternational(momoPhone)}. Enter your Mobile Money PIN below or on your phone to complete.`}
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Total Escrow Amount:</span>
                  <span className="text-lg font-black text-orange-600">{formatUGX(grandTotalUGX)}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-slate-200 dark:border-slate-700/60 pt-2">
                  <span className="text-slate-500">Subscriber Handset:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">+{formatUgandaPhoneToInternational(momoPhone)}</span>
                </div>
              </div>

              {pinStatus !== 'approved' && (
                <form onSubmit={handleConfirmPin} className="space-y-4 max-w-xs mx-auto text-center">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Enter 4-digit PIN (or authorize on handset)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      autoFocus
                      placeholder="••••"
                      value={enteredPin}
                      onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center text-2xl font-mono tracking-widest py-3 px-4 bg-white dark:bg-slate-800 border-2 border-orange-500 rounded-2xl text-slate-900 dark:text-white outline-hidden shadow-inner"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={enteredPin.length < 4 || pinStatus === 'verifying'}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {pinStatus === 'verifying' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying with Telecom...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Authorize Escrow Payment</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Step 3: Success Confirmation */}
          {step === 'success' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Order Confirmed!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Your order reference <strong>{createdMasterId}</strong> has been logged. {createdOrders.length} package(s) have been routed to verified merchants for fulfillment.
              </p>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={() => {
                    onClose();
                    onOrderSuccess(createdMasterId);
                  }}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Track Order Status
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TERMS & CONDITIONS & CROSS-BORDER POLICY MODAL */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">SwiftCart Terms & Cross-Border Policy</h3>
              </div>
              <button onClick={() => setIsTermsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3 leading-relaxed">
              <h4 className="font-bold text-slate-900 dark:text-white">1. Multi-Vendor Escrow Security</h4>
              <p>
                All buyer payments via MTN MoMo, Airtel Money, Visa/Mastercard, or Bank Transfer are held in secure escrow until the buyer inspects and receives their items.
              </p>

              <h4 className="font-bold text-slate-900 dark:text-white">2. Cross-Border Delivery & Customs Clearance</h4>
              <p>
                Promotional free or flat-rate delivery covers standard transport routes. Deliveries across border control points (including Busia, Malaba, Mutukula, Katuna, and Elegu) are subject to inspection and applicable customs clearance dues payable at border arrival as required by statutory trade regulations.
              </p>

              <h4 className="font-bold text-slate-900 dark:text-white">3. Returns & Claims Policy</h4>
              <p>
                Buyers have 7 days from delivery confirmation to report defective or misdescribed items for full escrow refunds.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsTermsModalOpen(false)}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
