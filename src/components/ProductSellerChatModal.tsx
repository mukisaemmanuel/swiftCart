import React, { useState, useEffect, useRef } from 'react';
import { Product, ProductVariant, Seller } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatUGX } from '../utils/formatters';
import {
  X,
  Send,
  MessageSquare,
  Store,
  ShieldCheck,
  CheckCheck,
  Phone,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';

interface ChatMessageItem {
  id: string;
  sender: 'buyer' | 'seller';
  text: string;
  timestamp: string;
}

interface ProductSellerChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  selectedVariant?: ProductVariant | null;
  seller?: Seller | null;
}

export const ProductSellerChatModal: React.FC<ProductSellerChatModalProps> = ({
  isOpen,
  onClose,
  product,
  selectedVariant,
  seller,
}) => {
  const { currentUser } = useAuth();
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Storage key for persistent buyer-seller thread per product
  const storageKey = `swiftcart_chat_${product.id}_${currentUser?.id || 'guest'}`;

  useEffect(() => {
    if (!isOpen) return;

    // Load existing messages or initialize with warm greeting
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        initializeDefaultGreeting();
      }
    } else {
      initializeDefaultGreeting();
    }
  }, [isOpen, product.id]);

  const initializeDefaultGreeting = () => {
    const initialGreeting: ChatMessageItem[] = [
      {
        id: 'msg_welcome',
        sender: 'seller',
        text: `Hello ${
          currentUser?.name ? currentUser.name.split(' ')[0] : 'there'
        }! Thanks for checking out ${product.title}. How can we assist you with your order today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setMessages(initialGreeting);
    localStorage.setItem(storageKey, JSON.stringify(initialGreeting));
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text) return;

    const newMsg: ChatMessageItem = {
      id: `msg_${Date.now()}`,
      sender: 'buyer',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setInputMessage('');

    // Simulate verified automated merchant assistant acknowledgement
    setTimeout(() => {
      const sellerReply: ChatMessageItem = {
        id: `msg_reply_${Date.now()}`,
        sender: 'seller',
        text: `Thanks for your inquiry! Our store manager at ${product.sellerStoreName} has received this and usually responds within 5–15 minutes during operating hours. You can also tap "Direct WhatsApp" below for immediate hotline support.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const withReply = [...updated, sellerReply];
      setMessages(withReply);
      localStorage.setItem(storageKey, JSON.stringify(withReply));
    }, 1200);
  };

  if (!isOpen) return null;

  // Format WhatsApp deep link
  const sellerPhone = seller?.phone || seller?.momoNumber || '256776155353';
  const cleanPhone = sellerPhone.replace(/[^0-9]/g, '');
  const e164 = cleanPhone.startsWith('0')
    ? '256' + cleanPhone.slice(1)
    : cleanPhone.startsWith('256')
    ? cleanPhone
    : '256' + cleanPhone;

  const prefilledWhatsappMsg = encodeURIComponent(
    `Hello ${product.sellerStoreName}, I am inquiring about "${product.title}" (${
      selectedVariant ? `Variant: ${selectedVariant.variantName}, ` : ''
    }Listing Price: ${formatUGX(product.priceUGX)}) on SwiftCart Uganda. Is this currently available for delivery?`
  );

  const whatsappUrl = `https://wa.me/${e164}?text=${prefilledWhatsappMsg}`;

  const currentPrice = selectedVariant
    ? product.priceUGX + (selectedVariant.additionalPrice || 0)
    : product.priceUGX;

  const productImage = product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=80';

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full h-[85vh] sm:h-[620px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              <Store className="w-5 h-5" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-white truncate max-w-[200px]">
                  {product.sellerStoreName}
                </h3>
                <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-400 text-[9px] font-black rounded border border-emerald-800/80 flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" /> Verified
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Direct Seller Inquiry Desk • {seller?.district || 'Kampala'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pre-attached Product Reference Card */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={productImage}
              alt={product.title}
              className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-white"
            />
            <div className="overflow-hidden">
              <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                {product.title}
              </span>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="font-black text-orange-600 dark:text-orange-400">
                  {formatUGX(currentPrice)}
                </span>
                {selectedVariant && (
                  <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded text-[10px] font-semibold truncate">
                    {selectedVariant.variantName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors shrink-0 cursor-pointer"
            title="Switch to WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100/50 dark:bg-slate-950/40">
          {messages.map((msg) => {
            const isMe = msg.sender === 'buyer';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-orange-600 text-white rounded-tr-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200/80 dark:border-slate-700'
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1 flex items-center gap-0.5">
                  {msg.timestamp}
                  {isMe && <CheckCheck className="w-3 h-3 text-emerald-500" />}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 pt-2 pb-1 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 overflow-x-auto flex items-center gap-1.5 no-scrollbar shrink-0">
          <span className="text-[10px] text-slate-400 font-bold shrink-0">Quick ask:</span>
          {[
            'Is this in stock for delivery today?',
            'Does it have official warranty?',
            'What is the last price for 2 units?',
            'Can you deliver to upcountry district?',
          ].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(chip)}
              className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
          <input
            type="text"
            placeholder="Type your question to the merchant..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim()}
            className="p-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white shadow-md transition-colors cursor-pointer"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
