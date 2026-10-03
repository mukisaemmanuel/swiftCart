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
  Trash2,
  Loader2,
  ShieldCheck,
  Store,
  ShieldAlert,
  Crown,
  ShoppingBag,
  RefreshCw,
} from 'lucide-react';
import { generateStreamingClientSideGemini } from '../services/geminiClient';
import { useAuth } from '../context/AuthContext';
import {
  resolveAIPersona,
  getPersonaSystemPrompt,
  getPersonaBadgeInfo,
  getPersonaWelcomeMessage,
  getPersonaSuggestionChips,
  AIPersonaRole,
} from '../services/aiContextService';

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
  isStreaming?: boolean;
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
  const { currentUser, currentSeller } = useAuth();

  // Dynamically resolve persona based on auth state & current URL
  const [persona, setPersona] = useState<AIPersonaRole>('BUYER');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = resolveAIPersona(currentUser, window.location.pathname);
      setPersona(p);
    }
  }, [currentUser, isOpen]);

  const personaBadge = getPersonaBadgeInfo(persona);
  const suggestionChips = getPersonaSuggestionChips(persona);

  const [modelType, setModelType] = useState<ChatModelType>('general');
  const [roleType, setRoleType] = useState<ChatRoleType>('general');
  const [useSearchGrounding, setUseSearchGrounding] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Initialize or update welcome message when persona changes
  useEffect(() => {
    if (messages.length === 0 || messages.length === 1) {
      setMessages([
        {
          id: `welcome-${persona}`,
          role: 'assistant',
          content: getPersonaWelcomeMessage(persona, currentUser, currentSeller),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: 'gemini-3.8-flash',
        },
      ]);
    }
  }, [persona, currentUser, currentSeller]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const aiMsgId = `ai-${Date.now()}`;
    const initialAiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: modelType === 'complex' ? 'gemini-3.8-pro' : 'gemini-3.8-flash',
      isStreaming: true,
    };

    const updatedMessages = [...messages, userMsg, initialAiMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build conversation payload (last 6 turns sliding window)
      const payloadMessages = updatedMessages
        .filter((m) => m.id !== aiMsgId) // exclude empty placeholder
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const systemInstruction = getPersonaSystemPrompt(persona, currentUser, currentSeller);

      // Real-time streaming generator
      const result = await generateStreamingClientSideGemini({
        messages: payloadMessages,
        persona,
        systemInstruction,
        roleType,
        modelType,
        useSearchGrounding,
        onChunk: (accumulatedText) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId
                ? { ...msg, content: accumulatedText, isStreaming: true }
                : msg
            )
          );
        },
      });

      // Mark final response as complete with sources
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                content: result.text,
                modelUsed: result.model,
                searchSources: result.searchSources,
                isStreaming: false,
              }
            : msg
        )
      );
    } catch (err: any) {
      console.error('Chat error:', err);
      let errorMsg = `I encountered an issue processing your request: ${err.message}. Please try again.`;
      if (err.message && (err.message.includes('API key') || err.message.includes('API_KEY'))) {
        errorMsg =
          'Gemini AI Assistant requires a valid API key. Please add VITE_GEMINI_API_KEY in your environment and reload.';
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                content: errorMsg,
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-cleared-${Date.now()}`,
        role: 'assistant',
        content: getPersonaWelcomeMessage(persona, currentUser, currentSeller),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.8-flash',
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-[calc(100vw-1rem)] sm:max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[90dvh] max-h-[800px]">
        {/* Modal Header with Role Scoping */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-900 dark:bg-slate-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base">SwiftCart Gemini AI</h3>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${personaBadge.badgeColor} ${personaBadge.borderColor}`}>
                  {personaBadge.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {personaBadge.description} • Eastern Uganda Focus
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {onOpenLiveVoice && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLiveVoice();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
                title="Start Real-time Voice with gemini-3.8-live"
              >
                <Mic className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden sm:inline">Live Voice</span>
              </button>
            )}

            <button
              onClick={handleClearHistory}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Reset conversation"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Bar: Model Selection & Google Search Grounding */}
        <div className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 p-2.5 sm:px-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            {/* Model Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl">
              <button
                onClick={() => setModelType('general')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                  modelType === 'general'
                    ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="gemini-3.8-flash (Real-time Streaming)"
              >
                <Search className="w-3 h-3" /> 3.8 Flash (Streaming)
              </button>
              <button
                onClick={() => setModelType('fast')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                  modelType === 'fast'
                    ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="gemini-3.1-flash-lite for instant speed"
              >
                <Zap className="w-3 h-3" /> 3.1 Lite (Ultra-Fast)
              </button>
              <button
                onClick={() => setModelType('complex')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                  modelType === 'complex'
                    ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="gemini-3.8-pro for deep technical reasoning"
              >
                <Brain className="w-3 h-3" /> 3.8 Pro (Reasoning)
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
                Live Search Grounding
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-md border border-emerald-200 dark:border-emerald-800">
                Active
              </span>
            </label>
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
                    : persona === 'SELLER'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : persona === 'ADMIN' || persona === 'SUPER_ADMIN'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-emerald-600 text-white shadow-xs'
                }`}
              >
                {m.role === 'user' ? (
                  <UserIcon className="w-4 h-4" />
                ) : persona === 'SELLER' ? (
                  <Store className="w-4 h-4" />
                ) : persona === 'ADMIN' ? (
                  <ShieldAlert className="w-4 h-4" />
                ) : persona === 'SUPER_ADMIN' ? (
                  <Crown className="w-4 h-4" />
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
                  {/* Streaming Content */}
                  <div className="whitespace-pre-line break-words space-y-2">
                    {m.content || (m.isStreaming ? (
                      <span className="inline-flex items-center gap-1.5 text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                        <span>Streaming response...</span>
                      </span>
                    ) : '')}
                  </div>

                  {/* Google Search Grounding Sources Card */}
                  {m.searchSources && m.searchSources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase text-orange-700 dark:text-orange-400 tracking-wider mb-1.5">
                        <Search className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                        Grounding Web Sources:
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

          <div ref={messagesEndRef} />
        </div>

        {/* Persona-Isolated Suggested Prompts */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border-t border-slate-200/80 dark:border-slate-800 overflow-x-auto scrollbar-none flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            Suggested:
          </span>
          {suggestionChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip.prompt)}
              disabled={isLoading}
              className="text-[11px] px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-700 dark:hover:text-orange-300 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700 shrink-0 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {chip.label}
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
              placeholder={
                persona === 'SELLER'
                  ? 'Ask about catalog optimization, OTP dispatches, or Tuesday payouts...'
                  : persona === 'ADMIN'
                  ? 'Ask about pending KYC reviews, rider handovers, or catalog triage...'
                  : 'Ask anything about products, Busia zones, or prices in UGX...'
              }
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="p-2.5 sm:px-4 sm:py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
