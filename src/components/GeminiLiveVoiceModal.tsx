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
} from 'lucide-react';
import { float32To16BitPCMBase64, base64PCMToAudioBuffer } from '../utils/audioUtils';

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
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'error' | 'closed'
  >('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [transcripts, setTranscripts] = useState<Array<{ role: 'ai' | 'user'; text: string }>>([
    {
      role: 'ai',
      text: 'Habari! I am your SwiftCart Live Voice Assistant. Ask me anything about products, prices in UGX, or delivery to Busia, Busitema, Dabani, Sibanga, and Jinja.',
    },
  ]);

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
      // Input: 16000Hz PCM required for Gemini Live API
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      // Output: 24000Hz PCM returned by Gemini Live API
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
      const wsUrl = `${protocol}//${window.location.host}/api/live-ws`;
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
            // User interrupted model speaking: stop queued playback
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

      // 4. Capture microphone audio and stream PCM to WebSocket
      const source = inputCtx.createMediaStreamSource(stream);
      // Buffer size 2048 or 4096 gives balanced latency
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMutedRef.current) return;
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert to 16-bit linear PCM base64
        const base64Pcm = float32To16BitPCMBase64(inputData);
        wsRef.current.send(JSON.stringify({ audio: base64Pcm }));
      };

      source.connect(processor);
      processor.connect(inputCtx.destination);

      // 5. Start real-time waveform visualizer
      startVisualizer(stream);
    } catch (err: any) {
      console.error('Error starting live voice session:', err);
      setErrorMessage(
        err?.message?.includes('Permission denied')
          ? 'Microphone permission was denied. Please allow microphone access in your browser.'
          : err?.message || 'Unable to access microphone or connect to Live API.'
      );
      setConnectionStatus('error');
    }
  };

  const playAudioChunk = (base64Audio: string) => {
    const audioCtx = outputAudioCtxRef.current;
    if (!audioCtx) return;

    try {
      const audioBuffer = base64PCMToAudioBuffer(audioCtx, base64Audio, 24000);
      const sourceNode = audioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(audioCtx.destination);

      const currentTime = audioCtx.currentTime;
      // Schedule gapless playback
      const startTime = Math.max(currentTime, nextStartTimeRef.current);
      sourceNode.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;

      sourceNode.onended = () => {
        if (audioCtx.currentTime >= nextStartTimeRef.current - 0.05) {
          setIsModelSpeaking(false);
        }
      };
    } catch (err) {
      console.error('Error playing audio chunk:', err);
    }
  };

  const stopCurrentAudioPlayback = () => {
    if (outputAudioCtxRef.current) {
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
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

    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionStatus('idle');
    setIsModelSpeaking(false);
  };

  // Canvas visualizer animation
  const startVisualizer = (stream: MediaStream) => {
    if (!canvasRef.current || !inputAudioCtxRef.current) return;

    try {
      const audioCtx = inputAudioCtxRef.current;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
        animationFrameIdRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const width = canvas.width;
        const height = canvas.height;
        const barWidth = (width / bufferLength) * 2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const val = dataArray[i];
          const percent = val / 255;
          const barHeight = Math.max(4, percent * height * 0.9);

          // Orange and Amber warm glowing gradient
          ctx.fillStyle = isModelSpeaking
            ? '#38bdf8' // Sky blue when Gemini is speaking
            : isMuted
            ? '#94a3b8' // Slate when muted
            : '#ea580c'; // Orange when user is speaking

          const y = (height - barHeight) / 2;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth - 2, barHeight, 3);
          ctx.fill();

          x += barWidth;
        }
      };

      draw();
    } catch (e) {
      console.error('Visualizer error:', e);
    }
  };

  const handleSendPromptText = (text: string) => {
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
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Gemini 3.8 Live Voice
                </h3>
                <span className="text-[9px] font-black uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">
                  Real-time
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                Bidirectional voice assistant for Ugandan shopping
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
                className="text-xs px-2.5 py-1 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition-colors shadow-xs"
                title="Switch to Smart Text Chat"
              >
                Text Chat
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
                <Radio className="w-3 h-3 text-orange-400" /> Try speaking or clicking:
              </span>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {[
                  'Best laptops for students in Kampala?',
                  'How fast is nationwide delivery in Uganda?',
                  'How does the 100% Prepaid MoMo Escrow work?',
                  'Are warranty repairs handled locally?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSendPromptText(suggestion)}
                    disabled={connectionStatus !== 'connected'}
                    className="text-[10px] sm:text-[11px] px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 hover:text-orange-300 text-slate-300 transition-colors border border-slate-700/60 disabled:opacity-50"
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Voice Connection Notice / Fallback to Text */}
          {errorMessage && (
            <div className="mx-4 my-2.5 p-3 rounded-2xl bg-slate-800/90 border border-orange-500/40 text-xs text-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Real-time Audio Offline</span>
                  <span className="text-[11px] text-slate-300">
                    Live bidirectional audio requires an active WebSocket server. Switch to Smart Text Assistant for instant answers!
                  </span>
                </div>
              </div>
              {onOpenTextChat && (
                <button
                  onClick={() => {
                    stopLiveSession();
                    onClose();
                    onOpenTextChat();
                  }}
                  className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shrink-0 shadow-md transition-colors"
                >
                  Open Text Chat
                </button>
              )}
            </div>
          )}

          {/* Live Conversation Transcript Feed */}
          <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/40 space-y-2 text-xs">
            <div className="flex items-center justify-between text-[10px] text-slate-500 pb-1 font-bold">
              <span>CONVERSATION TRANSCRIPT</span>
              <span className="text-orange-400">Continuous 2-Way Audio</span>
            </div>

            {transcripts.map((t, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-2xl ${
                  t.role === 'ai'
                    ? 'bg-slate-900 border border-slate-800 text-slate-200 ml-0 mr-4'
                    : 'bg-orange-950/50 border border-orange-800/40 text-orange-200 ml-4 mr-0'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-0.5 text-[10px] text-slate-400">
                  {t.role === 'ai' ? (
                    <Sparkles className="w-3 h-3 text-sky-400" />
                  ) : (
                    <Mic className="w-3 h-3 text-orange-400" />
                  )}
                  <span>{t.role === 'ai' ? 'Gemini 3.8 Live' : 'You (Spoken)'}</span>
                </div>
                <p className="leading-relaxed text-[11px]">{t.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Controls */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              disabled={connectionStatus !== 'connected'}
              className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                isMuted
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              } disabled:opacity-50`}
            >
              {isMuted ? (
                <>
                  <MicOff className="w-3.5 h-3.5" /> Unmute
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" /> Mute
                </>
              )}
            </button>

            {connectionStatus === 'error' && (
              <button
                onClick={startLiveSession}
                className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                title="Retry connecting to audio server"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry
              </button>
            )}
          </div>

          <button
            onClick={() => {
              stopLiveSession();
              onClose();
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-300 font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeminiLiveVoiceModal;
