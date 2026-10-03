import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  X,
  Sparkles,
  Radio,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Store,
  ShieldAlert,
  Crown,
  ShoppingBag,
} from 'lucide-react';
import { float32To16BitPCMBase64, base64PCMToAudioBuffer } from '../utils/audioUtils';
import { useAuth } from '../context/AuthContext';
import {
  resolveAIPersona,
  getPersonaBadgeInfo,
  getPersonaWelcomeMessage,
  AIPersonaRole,
} from '../services/aiContextService';

interface GeminiLiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTextChat?: () => void;
}

export const GeminiLiveVoiceModal: React.FC<GeminiLiveVoiceModalProps> = ({
  isOpen,
  onClose,
  onOpenTextChat,
}) => {
  const { currentUser, currentSeller } = useAuth();
  const [persona, setPersona] = useState<AIPersonaRole>('BUYER');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPersona(resolveAIPersona(currentUser, window.location.pathname));
    }
  }, [currentUser, isOpen]);

  const personaBadge = getPersonaBadgeInfo(persona);

  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'error' | 'closed'
  >('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [transcripts, setTranscripts] = useState<Array<{ role: 'ai' | 'user'; text: string }>>([]);

  useEffect(() => {
    setTranscripts([
      {
        role: 'ai',
        text:
          persona === 'SELLER'
            ? `Habari ${currentSeller?.storeName || 'Merchant'}! I am your SwiftCart Live Voice Copilot. Ask me about your products, Phase 5 rider handover OTP, or Tuesday payouts.`
            : persona === 'ADMIN' || persona === 'SUPER_ADMIN'
            ? `Operations Voice Copilot ready. Ask for summaries of KYC queues, unverified riders, or Eastern Uganda logistics.`
            : 'Habari! I am your SwiftCart Live Voice Assistant for Busia, Busitema, and Eastern Uganda. Ask me about products, UGX prices, or express delivery.',
      },
    ]);
  }, [persona, currentSeller]);

  // Audio references
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Start live session when modal opens
  useEffect(() => {
    if (isOpen) {
      startLiveSession();
    } else {
      stopLiveSession();
    }

    return () => {
      stopLiveSession();
    };
  }, [isOpen]);

  const startLiveSession = async () => {
    setConnectionStatus('connecting');
    setErrorMessage(null);

    try {
      // 1. Initialize browser AudioContexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });

      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      // 2. Request microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // 3. Connect to server-side WebSocket proxy for gemini-3.8-live
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const userName = encodeURIComponent(currentUser?.name || 'Guest');
      const wsUrl = `${protocol}//${window.location.host}/api/live-ws?persona=${persona}&user=${userName}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'status' && data.status === 'ready') {
            setConnectionStatus('connected');
          } else if (data.type === 'audio' && data.audio) {
            setIsModelSpeaking(true);
            playAudioChunk(data.audio);
          } else if (data.type === 'interrupted') {
            stopCurrentAudioPlayback();
            setIsModelSpeaking(false);
          } else if (data.type === 'transcript' && data.text) {
            setTranscripts((prev) => [...prev, { role: 'ai', text: data.text }]);
          } else if (data.type === 'error') {
            setErrorMessage(data.error);
            setConnectionStatus('error');
          }
        } catch (e) {
          console.error('Error handling WS audio message:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket error:', e);
        setErrorMessage('Failed to connect to Live Voice server. Ensure dev server is active.');
        setConnectionStatus('error');
      };

      ws.onclose = () => {
        setConnectionStatus('closed');
      };

      // 4. Capture microphone audio with optimized 2048 buffer for low latency
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMutedRef.current) return;
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const base64Pcm = float32To16BitPCMBase64(inputData);
        wsRef.current.send(JSON.stringify({ audio: base64Pcm }));
      };

      source.connect(processor);
      processor.connect(inputCtx.destination);

      // 5. Start canvas visualizer loop
      startVisualizer(source, inputCtx);
    } catch (err: any) {
      console.error('Error starting live voice session:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Please allow microphone access in your browser settings.'
          : `Failed to initialize voice session: ${err.message || 'Check audio devices'}`
      );
      setConnectionStatus('error');
    }
  };

  const stopLiveSession = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== 'closed') {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current && outputAudioCtxRef.current.state !== 'closed') {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    setConnectionStatus('idle');
    setIsModelSpeaking(false);
  };

  const playAudioChunk = (base64Pcm: string) => {
    if (!outputAudioCtxRef.current) return;

    try {
      const audioCtx = outputAudioCtxRef.current;
      const audioBuffer = base64PCMToAudioBuffer(base64Pcm, audioCtx, 24000);

      const sourceNode = audioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(audioCtx.destination);

      const currentTime = audioCtx.currentTime;
      const startTime = Math.max(currentTime, nextStartTimeRef.current);
      sourceNode.start(startTime);

      nextStartTimeRef.current = startTime + audioBuffer.duration;

      sourceNode.onended = () => {
        if (audioCtx.currentTime >= nextStartTimeRef.current - 0.05) {
          setIsModelSpeaking(false);
        }
      };
    } catch (e) {
      console.error('Error playing audio chunk:', e);
      setIsModelSpeaking(false);
    }
  };

  const stopCurrentAudioPlayback = () => {
    if (outputAudioCtxRef.current) {
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
  };

  const startVisualizer = (sourceNode: MediaStreamAudioSourceNode, audioCtx: AudioContext) => {
    if (!canvasRef.current) return;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    sourceNode.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const draw = () => {
      animationFrameIdRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * (canvas.height * 0.85);

        canvasCtx.fillStyle = isMutedRef.current
          ? '#94a3b8'
          : isModelSpeaking
          ? '#38bdf8'
          : '#ea580c';

        canvasCtx.beginPath();
        canvasCtx.roundRect(x, canvas.height - barHeight, barWidth - 2, barHeight, 3);
        canvasCtx.fill();

        x += barWidth + 1;
      }
    };

    draw();
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleSendQuickText = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ text }));
      setTranscripts((prev) => [...prev, { role: 'user', text }]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-[calc(100vw-1rem)] sm:max-w-lg shadow-2xl text-white overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85dvh]">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Gemini 3.8 Live Voice
                </h3>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${personaBadge.badgeColor} ${personaBadge.borderColor}`}>
                  {personaBadge.label}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                Low-latency voice assistant • Eastern Uganda Focus
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenTextChat && (
              <button
                onClick={() => {
                  stopLiveSession();
                  onClose();
                  onOpenTextChat();
                }}
                className="text-xs px-2.5 py-1 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition-colors shadow-xs cursor-pointer"
                title="Switch to Smart Text Chat"
              >
                Text Chat
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Status Banner */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connectionStatus === 'connected'
                  ? isModelSpeaking
                    ? 'bg-sky-400 animate-ping'
                    : isMuted
                    ? 'bg-amber-400'
                    : 'bg-emerald-400 animate-pulse'
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-400 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <span className="font-semibold text-slate-300 text-[11px]">
              {connectionStatus === 'connected'
                ? isModelSpeaking
                  ? 'Gemini is speaking...'
                  : isMuted
                  ? 'Mic Muted (Click Mic to speak)'
                  : 'Listening to your voice...'
                : connectionStatus === 'connecting'
                ? 'Connecting to Gemini Live...'
                : connectionStatus === 'error'
                ? 'Voice Server Offline'
                : 'Session Closed'}
            </span>
          </div>

          <span className="text-[9px] text-slate-500 font-mono">
            gemini-3.8-live
          </span>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Central Visualizer & Interactive Waves */}
          <div className="p-4 sm:p-5 flex flex-col items-center justify-center text-center space-y-3 bg-linear-to-b from-slate-900 to-slate-950">
            {/* Animated Pulsing Ring & Audio Canvas */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Glowing Backdrop */}
              <div
                className={`absolute inset-0 rounded-full blur-xl opacity-40 transition-colors duration-500 ${
                  isModelSpeaking
                    ? 'bg-sky-500'
                    : isMuted
                    ? 'bg-slate-700'
                    : 'bg-orange-600'
                }`}
              />

              {/* Orbiting Ring */}
              <div className="absolute inset-2 rounded-full border border-slate-700/80 animate-spin" style={{ animationDuration: '14s' }} />

              {/* Canvas for real-time waveform bars */}
              <canvas
                ref={canvasRef}
                width={100}
                height={60}
                className="absolute z-10 pointer-events-none"
              />

              {/* Central Icon Button */}
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center z-20 shadow-2xl transition-all duration-300 ${
                  isModelSpeaking
                    ? 'bg-sky-500 text-white ring-4 ring-sky-400/40 scale-105'
                    : isMuted
                    ? 'bg-slate-800 text-slate-400 ring-2 ring-slate-700'
                    : 'bg-orange-600 text-white ring-4 ring-orange-500/40'
                }`}
              >
                {isModelSpeaking ? (
                  <Volume2 className="w-7 h-7 animate-bounce" />
                ) : isMuted ? (
                  <MicOff className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </div>
            </div>

            {/* Quick Voice Prompt Suggestions */}
            <div className="w-full space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
                <Radio className="w-3 h-3 text-orange-400" /> Eastern Uganda Prompts:
              </span>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {(persona === 'SELLER'
                  ? [
                      'How to generate rider handover OTP?',
                      'When are Tuesday payouts processed?',
                      'How to format specifications for electronics?',
                    ]
                  : persona === 'ADMIN'
                  ? [
                      'Summarize pending KYC documents',
                      'Check unverified rider dispatches',
                      'Review disputed delivery policy',
                    ]
                  : [
                      'Delivery times to Busitema & Busia?',
                      'How does MoMo Escrow protect my order?',
                      'Best solar kits for Eastern Uganda homes?',
                    ]
                ).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSendQuickText(suggestion)}
                    className="text-[10px] sm:text-[11px] px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Real-time Voice Transcripts */}
          <div className="p-3.5 sm:p-4 space-y-2.5 bg-slate-950/40">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Spoken Transcript:
            </span>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {transcripts.map((t, idx) => (
                <div
                  key={idx}
                  className={`text-xs p-2.5 rounded-xl ${
                    t.role === 'ai'
                      ? 'bg-slate-800/80 text-slate-200 border border-slate-700/60'
                      : 'bg-orange-950/40 text-orange-200 border border-orange-800/40 ml-4'
                  }`}
                >
                  <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">
                    {t.role === 'ai' ? 'Gemini 3.8 Live' : 'You (Spoken)'}
                  </span>
                  <p className="leading-relaxed">{t.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={handleToggleMute}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isMuted
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
          </button>

          <button
            onClick={stopLiveSession}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeminiLiveVoiceModal;
