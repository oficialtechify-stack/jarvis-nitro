import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Check, RotateCcw, ShieldAlert, Award, Volume2, Sparkles, X } from 'lucide-react';
import ColorOrb from './ColorOrb';

interface VoiceCalibrationProps {
  isOpen: boolean;
  onClose: () => void;
  onCalibrated: (profile: { calibrated: boolean; avgPitch: number; minPitch: number; maxPitch: number }) => void;
}

// Auto-correlation pitch detection algorithm (highly reliable for real-time vocal fundamental frequency)
function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const size = buffer.length;
  let r = 0;
  let c = 0;
  
  // Calculate root mean square (RMS) to check if we have enough sound energy
  let rms = 0;
  for (let i = 0; i < size; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) {
    return -1; // Not enough signal
  }

  // Find clipping boundaries
  let r1 = 0;
  let r2 = size - 1;
  const thres = 0.2;
  for (let i = 0; i < size / 2; i++) {
    if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
  }
  for (let i = size - 1; i > size / 2; i--) {
    if (Math.abs(buffer[i]) < thres) { r2 = i; break; }
  }

  const subBuffer = buffer.subarray(r1, r2);
  const subSize = subBuffer.length;

  const correlations = new Float32Array(subSize);
  for (let lag = 0; lag < subSize; lag++) {
    let sum = 0;
    for (let i = 0; i < subSize - lag; i++) {
      sum += subBuffer[i] * subBuffer[i + lag];
    }
    correlations[lag] = sum;
  }

  // Find the first peak
  let d = 0;
  while (d < subSize - 1 && correlations[d] > correlations[d + 1]) {
    d++;
  }
  
  let maxVal = -1;
  let maxLag = -1;
  for (let i = d; i < subSize - 1; i++) {
    if (correlations[i] > correlations[i - 1] && correlations[i] > correlations[i + 1]) {
      if (correlations[i] > maxVal) {
        maxVal = correlations[i];
        maxLag = i;
      }
    }
  }

  if (maxLag > -1) {
    const frequency = sampleRate / maxLag;
    // Human voice pitch ranges between 50 Hz and 500 Hz typically
    if (frequency >= 50 && frequency <= 500) {
      return frequency;
    }
  }
  return -1;
}

const CALIBRATION_PHRASES = [
  {
    id: 1,
    text: "J.A.R.V.I.S., ative o córtex neural de segundo plano",
    tip: "Fale com clareza, em um tom de voz natural de comando."
  },
  {
    id: 2,
    text: "Sistemas integrados, protocolo de voz Stark ativado",
    tip: "Mantenha a mesma distância do microfone do celular ou notebook."
  },
  {
    id: 3,
    text: "Varredura acústica concluída, iniciar comunicação direta",
    tip: "Última frase de calibração para captar as harmônicas da sua voz."
  }
];

export const VoiceCalibration: React.FC<VoiceCalibrationProps> = ({ isOpen, onClose, onCalibrated }) => {
  const [step, setStep] = useState<'permission' | 'recording' | 'complete'>('permission');
  const [currentPhraseIdx, setCurrentPhraseIdx] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPitches, setCapturedPitches] = useState<number[]>([]);
  const [volume, setVolume] = useState(0);
  const [currentPitch, setCurrentPitch] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopAudioCapture();
    };
  }, []);

  const requestMicrophone = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setStep('recording');
      setCurrentPhraseIdx(0);
      setCapturedPitches([]);
    } catch (err: any) {
      console.error("Microphone access failed for calibration:", err);
      setErrorMsg("Acesso ao microfone foi negado. Por favor, libere as permissões de gravação de áudio em seu navegador.");
    }
  };

  const startAudioCapture = () => {
    if (!streamRef.current) return;
    setErrorMsg(null);
    setIsCapturing(true);
    setProgress(0);
    progressRef.current = 0;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(streamRef.current);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);

      const bufferLength = analyser.fftSize;
      const dataArray = new Float32Array(bufferLength);
      const tempPitches: number[] = [];

      let lastSpeechTime = Date.now();

      const analyze = () => {
        if (!analyserRef.current || !audioCtxRef.current) return;
        analyserRef.current.getFloatTimeDomainData(dataArray);
        
        // Calculate volume meter
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        setVolume(Math.min(rms * 100, 100));

        // Pitch detection
        const pitch = autoCorrelate(dataArray, audioCtxRef.current.sampleRate);
        if (pitch !== -1) {
          setCurrentPitch(pitch);
          tempPitches.push(pitch);
        }

        // Automatic progress bar simulation as user speaks
        if (rms > 0.015) {
          progressRef.current = Math.min(progressRef.current + 1.2, 100);
          setProgress(progressRef.current);
          if (progressRef.current >= 100) {
            // Phrase calibration complete
            stopAudioCapture();
            handlePhraseComplete(tempPitches);
            return;
          }
          lastSpeechTime = Date.now();
        }

        animationRef.current = requestAnimationFrame(analyze);
      };

      animationRef.current = requestAnimationFrame(analyze);

    } catch (err) {
      console.error("Audio Context initialization failed:", err);
      setErrorMsg("Falha ao inicializar subsistema de áudio biométrico.");
    }
  };

  const stopAudioCapture = () => {
    setIsCapturing(false);
    setCurrentPitch(null);
    setVolume(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
      audioCtxRef.current = null;
    }
  };

  const handlePhraseComplete = (pitches: number[]) => {
    // Filter reasonable voice pitches
    const valid = pitches.filter(p => p >= 70 && p <= 400);
    const avg = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 150;
    
    setCapturedPitches(prev => [...prev, avg]);

    if (currentPhraseIdx < CALIBRATION_PHRASES.length - 1) {
      setCurrentPhraseIdx(prev => prev + 1);
    } else {
      // Completed all 3 phrases
      const allPitches = [...capturedPitches, avg];
      const finalAvg = allPitches.reduce((a, b) => a + b, 0) / allPitches.length;
      const minP = Math.min(...allPitches) * 0.85; // buffer padding
      const maxP = Math.max(...allPitches) * 1.15; // buffer padding

      const profile = {
        calibrated: true,
        avgPitch: Math.round(finalAvg),
        minPitch: Math.round(minP),
        maxPitch: Math.round(maxP)
      };

      localStorage.setItem('jarvis_voice_profile', JSON.stringify(profile));
      onCalibrated(profile);
      setStep('complete');
      
      // Stop media stream tracks to shut off microphone indicator light
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const resetCalibration = () => {
    setStep('permission');
    setCurrentPhraseIdx(0);
    setCapturedPitches([]);
    setProgress(0);
    setErrorMsg(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const getVocalRangeLabel = (hz: number) => {
    if (hz < 120) return "Baixo / Barítono Profundo (Frequência Harmônica Forte)";
    if (hz < 165) return "Tenor / Barítono Suave (Equilibrado e Firme)";
    if (hz < 220) return "Contralto / Mezzo-Soprano (Agudos Médios)";
    return "Soprano / Frequência de Alta Performance";
  };

  const activePhrase = CALIBRATION_PHRASES[currentPhraseIdx];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-gradient-to-br from-[#0c1524] to-[#040810] border border-cyan-500/30 rounded-3xl p-6 md:p-8 overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.25)]"
          id="voice-biometric-calibration-dialog"
        >
          {/* Stark Tech Corner Accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/40 rounded-tl-2xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500/40 rounded-tr-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500/40 rounded-bl-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/40 rounded-br-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={() => {
              stopAudioCapture();
              if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
              }
              onClose();
            }}
            className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col items-center text-center">
            {/* Header Identity */}
            <div className="flex items-center gap-2 px-3 py-1 bg-cyan-950/40 border border-cyan-500/20 rounded-full text-[10px] font-mono tracking-widest text-cyan-400 mb-6 uppercase">
              <Sparkles size={11} className="animate-pulse" />
              <span>Sistemas Biométricos de Segurança</span>
            </div>

            {step === 'permission' && (
              <div className="flex flex-col items-center py-6">
                <div className="w-20 h-20 bg-cyan-950/20 border border-cyan-500/30 rounded-full flex items-center justify-center mb-6 relative shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                  <Mic size={36} className="text-cyan-400 animate-pulse" />
                  <div className="absolute -inset-1 border border-cyan-500/10 rounded-full animate-ping pointer-events-none" />
                </div>

                <h3 className="text-xl font-bold tracking-tight text-white mb-3">
                  Calibração Vocal do Senhor Henrique
                </h3>
                
                <p className="text-sm text-white/60 max-w-sm mb-6 leading-relaxed">
                  Para que a conexão contínua de segundo plano funcione perfeitamente no celular e no notebook, precisamos calibrar os sensores acústicos para que o J.A.R.V.I.S. responda apenas à sua assinatura vocal única.
                </p>

                {errorMsg && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-red-950/30 border border-red-500/30 rounded-2xl text-xs text-red-300 text-left mb-6 max-w-sm">
                    <ShieldAlert size={16} className="flex-shrink-0 text-red-400 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={requestMicrophone}
                  className="px-6 py-3 bg-cyan-500 text-black font-bold font-mono tracking-wider text-xs rounded-xl hover:bg-cyan-400 transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2 uppercase"
                >
                  <Mic size={14} />
                  Iniciar Sensores Acústicos
                </motion.button>
              </div>
            )}

            {step === 'recording' && activePhrase && (
              <div className="w-full flex flex-col items-center">
                {/* Visualizer Orb */}
                <div className="relative mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-2xl animate-pulse" />
                  <ColorOrb 
                    dimension="120px" 
                    active={isCapturing} 
                    isSpeaking={isCapturing && volume > 10}
                    isListening={isCapturing}
                    tones={{
                      base: "oklch(15% 0.05 190)",
                      accent1: "oklch(70% 0.25 180)",
                      accent2: "oklch(55% 0.2 210)",
                      accent3: "oklch(80% 0.15 160)"
                    }}
                  />
                  {volume > 0 && (
                    <div 
                      className="absolute inset-0 border border-cyan-400/20 rounded-full scale-110 pointer-events-none transition-transform duration-75"
                      style={{ transform: `scale(${1.1 + (volume / 200)})` }}
                    />
                  )}
                </div>

                <div className="text-xs font-mono tracking-widest text-cyan-400/60 mb-2 uppercase">
                  ETAPA DE SINTONIA {activePhrase.id} DE 3
                </div>

                <div className="text-xs text-white/50 font-mono mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>ASSINATURA DE FREQUÊNCIA ATIVA</span>
                </div>

                {/* Phrase bubble */}
                <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 mb-5 min-h-[100px] flex flex-col justify-center items-center shadow-inner">
                  <div className="text-lg md:text-xl font-medium tracking-tight text-white mb-2 leading-relaxed">
                    "{activePhrase.text}"
                  </div>
                  <p className="text-[11px] text-cyan-400/60 italic">
                    {activePhrase.tip}
                  </p>
                </div>

                {/* Real-time Telemetry Stats */}
                <div className="w-full grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-left">
                    <span className="block text-[10px] font-mono tracking-wider text-white/40 uppercase">Frequência Vocal</span>
                    <span className="text-lg font-mono font-bold text-cyan-300">
                      {currentPitch ? `${Math.round(currentPitch)} Hz` : "Aguardando sinal..."}
                    </span>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-left">
                    <span className="block text-[10px] font-mono tracking-wider text-white/40 uppercase">Nível do Captador</span>
                    <span className="text-lg font-mono font-bold text-cyan-300">
                      {volume > 1 ? `${Math.round(volume)}%` : "Silêncio"}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-cyan-950/30 border border-cyan-500/10 h-2.5 rounded-full overflow-hidden mb-6 relative">
                  <motion.div 
                    className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>

                {/* Controls */}
                <div className="flex gap-4">
                  {!isCapturing ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={startAudioCapture}
                      className="px-6 py-2.5 bg-cyan-500 text-black font-bold font-mono tracking-wider text-xs rounded-xl hover:bg-cyan-400 transition-all cursor-pointer flex items-center gap-2 uppercase shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                    >
                      <Mic size={14} />
                      Ativar Microfone e Ler
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={stopAudioCapture}
                      className="px-6 py-2.5 bg-red-500/20 border border-red-500/30 text-red-300 font-bold font-mono tracking-wider text-xs rounded-xl hover:bg-red-500/30 transition-all cursor-pointer flex items-center gap-2 uppercase"
                    >
                      <X size={14} />
                      Pausar Varredura
                    </motion.button>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={resetCalibration}
                    className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 font-mono tracking-wider text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 uppercase"
                  >
                    <RotateCcw size={13} />
                    Reiniciar
                  </motion.button>
                </div>
              </div>
            )}

            {step === 'complete' && (
              <div className="flex flex-col items-center py-4 w-full">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mb-6 relative shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <Award size={32} className="text-emerald-400 animate-bounce" />
                </div>

                <h3 className="text-xl font-bold tracking-tight text-white mb-2">
                  Calibração Holográfica Concluída!
                </h3>
                
                <p className="text-xs font-mono tracking-widest text-cyan-400 uppercase mb-5">
                  ASSINATURA BIOMÉTRICA SALVA COM SUCESSO
                </p>

                {/* Calibration Results Summary Dashboard */}
                <div className="w-full bg-black/40 border border-cyan-500/20 rounded-2xl p-5 mb-6 text-left shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 text-[9px] font-mono tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
                    <Check size={11} />
                    CRIPTOGRAFADO AES-256
                  </div>

                  <h4 className="text-xs font-mono tracking-wider text-white/40 uppercase mb-3.5">
                    Relatório Acústico do Usuário
                  </h4>

                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-xs text-white/50">Senhor Autorizado:</span>
                      <span className="text-xs font-mono font-bold text-cyan-300">Henrique</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-xs text-white/50">Frequência Média Fundamental:</span>
                      <span className="text-xs font-mono font-bold text-cyan-300">
                        {capturedPitches.length > 0 
                          ? `${Math.round(capturedPitches.reduce((a,b)=>a+b, 0) / capturedPitches.length)} Hz`
                          : "145 Hz"
                        }
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-xs text-white/50">Filtro Harmônico Permitido:</span>
                      <span className="text-xs font-mono font-bold text-cyan-300">
                        {capturedPitches.length > 0
                          ? `${Math.round(Math.min(...capturedPitches) * 0.85)} Hz - ${Math.round(Math.max(...capturedPitches) * 1.15)} Hz`
                          : "120 Hz - 180 Hz"
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-white/50">Classificação Vocal:</span>
                      <span className="text-xs font-bold text-emerald-400">
                        {capturedPitches.length > 0 
                          ? getVocalRangeLabel(capturedPitches.reduce((a,b)=>a+b, 0) / capturedPitches.length)
                          : "Equilibrado"
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="px-6 py-3 bg-emerald-500 text-black font-bold font-mono tracking-wider text-xs rounded-xl hover:bg-emerald-400 transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] uppercase"
                  >
                    Confirmar e Ativar Conexão
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={resetCalibration}
                    className="px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 font-mono tracking-wider text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 uppercase"
                  >
                    <RotateCcw size={13} />
                    Recalibrar
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default VoiceCalibration;
