import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User as UserIcon,
  Search,
  ExternalLink,
  Mic,
  Zap,
  Brain,
  Compass,
  Trash2,
  Loader2,
  RefreshCw,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { generateClientSideGemini } from '../services/geminiClient';

export type ChatRoleType = 'general' | 'logistics' | 'procurement';
export type ChatModelType = 'fast' | 'general' | 'complex';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
  roleType?: ChatRoleType;
  searchSources?: Array<{ title: string; uri: string }>;
  timestamp: string;
}

interface GeminiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLiveVoice?: () => void;
}

export const GeminiChatModal: React.FC<GeminiChatModalProps> = ({
  isOpen,
  onClose,
  onOpenLiveVoice,
}) => {
  const [modelType, setModelType] = useState<ChatModelType>('general');
  const [roleType, setRoleType] = useState<ChatRoleType>('general');
  const [useSearchGrounding, setUseSearchGrounding] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      content: `Hello! I am your **SwiftCart AI Shopping & Market Assistant** for Busia, Busitema University, Jinja, and the Eastern region.

I can help you:
- Find genuine smartphones, laptops, solar kits, and farm-fresh produce with UGX pricing
- Check local delivery estimates to **Busitema Campus**, **Dabani**, **Sibanga**, **Busia Town/Customs**, and **Majanji**
- Query live product specs and current Uganda market prices with **Google Search Grounding**
- Guide you through MTN MoMo and Airtel Money mobile checkout

How can I assist you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.5-flash',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build conversation payload (all turns)
      const payloadMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let data: any = null;

      // 1. Attempt backend /api/chat first
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: payloadMessages,
            roleType,
            modelType,
            useSearchGrounding,
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          data = await res.json();
        } else {
          console.warn('Backend /api/chat returned non-JSON, falling back to direct client-side Gemini AI...');
        }
      } catch (fetchErr) {
        console.warn('Network call to /api/chat failed, falling back to direct client-side Gemini AI:', fetchErr);
      }

      // 2. Direct client-side Gemini fallback if backend was unavailable
      if (!data) {
        data = await generateClientSideGemini({
          messages: payloadMessages,
          roleType,
          modelType,
          useSearchGrounding,
        });
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.text,
        modelUsed: data.model,
        roleType: data.roleType,
        searchSources: data.searchSources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      let errorMsg = `Sorry, I encountered an issue processing your request: ${err.message}. Please try again.`;
      if (err.message && (err.message.includes('API key') || err.message.includes('API_KEY'))) {
        errorMsg = 'Gemini AI Assistant requires a valid API key. Please add GEMINI_API_KEY in your Vercel Project Settings (Settings > Environment Variables) and redeploy.';
      }
      const fallbackMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: errorMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'msg-welcome-new',
        role: 'assistant',
        content:
          'Conversation cleared. What can I help you find today in Busia, Busitema, or Jinja?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: modelType === 'fast' ? 'gemini-3.1-flash-lite' : modelType === 'complex' ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash',
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-[calc(100vw-1rem)] sm:max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[90dvh] max-h-[800px]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-900 dark:bg-slate-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base">SwiftCart Gemini AI</h3>
                <span className="text-[10px] font-bold uppercase bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30">
                  {modelType === 'fast'
                    ? 'gemini-3.8-flash (Fast)'
                    : modelType === 'complex'
                    ? 'gemini-3.8-pro'
                    : 'gemini-3.8-flash'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Multi-turn conversational assistant with Google Search grounding
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenLiveVoice && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLiveVoice();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition-colors shadow-xs"
                title="Start Real-time Voice with gemini-3.8-live"
              >
                <Mic className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden sm:inline">Live Voice</span>
              </button>
            )}

            <button
              onClick={handleClearHistory}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-800/80 transition-colors"
              title="Clear chat history"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Bar: Model Selection & Role Tabs */}
        <div className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 p-2.5 sm:px-4 space-y-2">
          {/* Row 1: Model Choice & Google Search Grounding Checkbox */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            {/* Model Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl">
              <button
                onClick={() => setModelType('general')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
                  modelType === 'general'
                    ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="gemini-3.8-flash with Google Search Grounding"
              >
                <Search className="w-3 h-3" /> General (3.8 Flash)
              </button>
              <button
                onClick={() => setModelType('fast')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
                  modelType === 'fast'
                    ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="gemini-3.1-flash-lite for instant speed"
              >
                <Zap className="w-3 h-3" /> Fast (3.1 Lite)
              </button>
              <button
                onClick={() => setModelType('complex')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
                  modelType === 'complex'
                    ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="gemini-3.1-pro-preview for complex reasoning"
              >
                <Brain className="w-3 h-3" /> Complex (3.1 Pro)
              </button>
            </div>

            {/* Google Search Grounding Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-700 dark:text-slate-300 select-none">
              <input
                type="checkbox"
                checked={useSearchGrounding}
                onChange={(e) => setUseSearchGrounding(e.target.checked)}
                className="accent-orange-600 rounded"
              />
              <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                <Search className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                Google Search Grounding
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-md border border-emerald-200 dark:border-emerald-800">
                Real-time
              </span>
            </label>
          </div>

          {/* Row 2: Chatbot Roles (System Instruction Selection) */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px]">
            <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] shrink-0 mr-1">
              Role:
            </span>
            {[
              { id: 'general', label: '🛒 Shopping Advisor' },
              { id: 'logistics', label: '🚚 Busia & Busoga Logistics' },
              { id: 'procurement', label: '🔬 Tech Specs & Procurement' },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setRoleType(r.id as ChatRoleType)}
                className={`px-2.5 py-0.5 rounded-full font-bold transition-all shrink-0 border ${
                  roleType === r.id
                    ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Thread (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 max-w-[90%] sm:max-w-[85%] ${
                m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  m.role === 'user'
                    ? 'bg-slate-900 dark:bg-slate-800 text-white'
                    : 'bg-orange-600 text-white shadow-xs'
                }`}
              >
                {m.role === 'user' ? (
                  <UserIcon className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              {/* Message Bubble */}
              <div className="space-y-1.5 min-w-0">
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                    m.role === 'user'
                      ? 'bg-slate-900 dark:bg-orange-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                  }`}
                >
                  {/* Markdown-style content display */}
                  <div className="whitespace-pre-line break-words space-y-2">
                    {m.content}
                  </div>

                  {/* Google Search Grounding Sources Card */}
                  {m.searchSources && m.searchSources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase text-orange-700 dark:text-orange-400 tracking-wider mb-1.5">
                        <Search className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                        Google Search Sources:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.searchSources.slice(0, 4).map((source, idx) => (
                          <a
                            key={idx}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/50 hover:bg-orange-100 dark:hover:bg-orange-900/60 text-orange-900 dark:text-orange-200 border border-orange-200/80 dark:border-orange-800/60 text-[10px] font-bold transition-colors group"
                          >
                            <ExternalLink className="w-2.5 h-2.5 text-orange-600 dark:text-orange-400 group-hover:translate-x-0.5 transition-transform" />
                            <span className="truncate max-w-[170px]">{source.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Subtext info */}
                <div
                  className={`flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 px-1 ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <span>{m.timestamp}</span>
                  {m.modelUsed && (
                    <span className="text-slate-400 dark:text-slate-500 font-mono">
                      • {m.modelUsed}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-[85%] mr-auto items-center">
              <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none shadow-xs flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                <span>
                  {modelType === 'complex'
                    ? 'Gemini 3.1 Pro is analyzing complex query...'
                    : useSearchGrounding
                    ? 'Searching Google & grounding market information...'
                    : 'Thinking...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompts */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-850 border-t border-slate-200/80 dark:border-slate-800 overflow-x-auto scrollbar-none flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            Suggested:
          </span>
          {[
            'What laptops are best for Busitema University students?',
            'What is the delivery turnaround to Dabani or Sibanga?',
            'Search current Samsung A55 price and warranty in Uganda',
            'Compare solar lighting kits for off-grid homes in Busia',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading}
              className="text-[11px] px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-700 dark:hover:text-orange-300 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700 shrink-0 transition-colors disabled:opacity-50"
            >
              "{prompt}"
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask anything about products, Busia zones, or prices in UGX..."
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="p-2.5 sm:px-4 sm:py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
