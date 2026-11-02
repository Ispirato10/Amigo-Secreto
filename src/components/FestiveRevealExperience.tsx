import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gift, 
  Sparkles, 
  Package, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Flame, 
  RotateCcw,
  Lock,
  Heart,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { festiveAudio } from '../lib/festiveAudio';

interface DrawResult {
  targetId: string;
  targetName: string;
}

interface Participant {
  id: string;
  name: string;
  giftBoxes?: string[];
  wishlist?: string;
}

interface FestiveRevealExperienceProps {
  result: DrawResult;
  drawnParticipant?: Participant | null;
  currentUserName: string;
}

export const FestiveRevealExperience: React.FC<FestiveRevealExperienceProps> = ({
  result,
  drawnParticipant,
  currentUserName
}) => {
  const [revealStage, setRevealStage] = useState<'IDLE' | 'COUNTDOWN' | 'UNBOXING' | 'REVEALED'>('IDLE');
  const [countdown, setCountdown] = useState(3);
  const [copied, setCopied] = useState(false);

  // Helper for random number
  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  // Fireworks cannon explosion sequence
  const launchFireworksBarrage = () => {
    festiveAudio.playDrawFinished();

    // 1. Instant center blast
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#ef4444', '#eab308', '#22c55e', '#3b82f6', '#ec4899', '#ffffff']
    });

    // 2. Multi-shot side cannons over 3 seconds
    const duration = 3.5 * 1000;
    const animationEnd = Date.now() + duration;

    const interval: NodeJS.Timeout = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }
      const particleCount = 40 * (timeLeft / duration);

      // Fireworks left cannon
      confetti({
        startVelocity: 35,
        spread: 360,
        ticks: 60,
        zIndex: 1000,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#ff0000', '#ffd700', '#00ff00', '#ffffff', '#ff69b4']
      });

      // Fireworks right cannon
      confetti({
        startVelocity: 35,
        spread: 360,
        ticks: 60,
        zIndex: 1000,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#ff0000', '#ffd700', '#00ff00', '#ffffff', '#ff69b4']
      });
    }, 250);
  };

  // Trigger suspense countdown
  const startSuspenseReveal = () => {
    setRevealStage('COUNTDOWN');
    setCountdown(3);

    // Audio cue
    festiveAudio.playRoomEntry();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setRevealStage('UNBOXING');
          
          // Brief unboxing shake
          setTimeout(() => {
            setRevealStage('REVEALED');
            launchFireworksBarrage();
          }, 1200);
          return 0;
        }
        festiveAudio.playRoomEntry();
        return prev - 1;
      });
    }, 900);
  };

  const targetGifts = drawnParticipant?.giftBoxes?.filter(g => g.trim().length > 0) || [];

  const handleCopyGifts = () => {
    if (targetGifts.length === 0) return;
    const text = `Caixas de Presente de ${result.targetName}:\n` + targetGifts.map((g, i) => `🎁 Caixa #${i+1}: ${g}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-4">
      {/* ================= STAGE 1: IDLE - START BUTTON ================= */}
      {revealStage === 'IDLE' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 text-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border-4 border-red-600/60 text-center space-y-6 relative overflow-hidden"
        >
          {/* Glowing Background Orbs */}
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-red-600/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-amber-500/30 rounded-full blur-3xl" />

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Sorteio Finalizado com Sucesso
            </div>

            <motion.div
              animate={{ scale: [1, 1.08, 1], rotate: [0, -3, 3, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-28 h-28 bg-gradient-to-tr from-red-600 to-amber-500 rounded-3xl p-1 shadow-2xl shadow-red-600/40 mx-auto flex items-center justify-center cursor-pointer"
              onClick={startSuspenseReveal}
            >
              <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
                <Gift className="w-14 h-14 text-amber-400" />
              </div>
            </motion.div>

            <div className="space-y-2">
              <h3 className="text-3xl md:text-4xl font-black text-white">
                Quem é o seu Amigo Secreto?
              </h3>
              <p className="text-slate-300 text-xs md:text-sm max-w-md mx-auto">
                Olá, <strong className="text-white">{currentUserName}</strong>! O sorteio foi realizado e o resultado está pronto. Clique no botão abaixo para iniciar a revelação com suspense e fogos!
              </p>
            </div>

            <button
              onClick={startSuspenseReveal}
              className="px-10 py-5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black text-lg md:text-xl rounded-2xl shadow-2xl shadow-red-600/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 mx-auto"
            >
              <Flame className="w-6 h-6 text-amber-300 animate-pulse" />
              <span>REVELAR COM FOGOS DE ARTIFÍCIO ✨</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* ================= STAGE 2: SUSPENSE COUNTDOWN ================= */}
      {revealStage === 'COUNTDOWN' && (
        <motion.div
          key="countdown-stage"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-950 text-white rounded-[2.5rem] p-12 shadow-2xl border-4 border-amber-500 text-center space-y-6 flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/40 via-slate-950 to-slate-950" />
          
          <div className="relative z-10 space-y-4">
            <p className="text-xs uppercase tracking-widest text-amber-400 font-bold flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 animate-spin" />
              Preparando Suspense...
            </p>

            <AnimatePresence mode="wait">
              <motion.div
                key={`count-${countdown}`}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1.4, opacity: 1 }}
                exit={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-red-500 to-amber-400 my-4"
              >
                {countdown}
              </motion.div>
            </AnimatePresence>

            <p className="text-slate-400 text-sm italic font-semibold">
              O Papai Noel está abrindo o envelope secreto... 🤫
            </p>
          </div>
        </motion.div>
      )}

      {/* ================= STAGE 3: UNBOXING SHAKE ================= */}
      {revealStage === 'UNBOXING' && (
        <motion.div
          key="unboxing-stage"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slate-950 text-white rounded-[2.5rem] p-12 shadow-2xl border-4 border-red-500 text-center space-y-6 flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden"
        >
          <motion.div
            animate={{ 
              x: [-12, 12, -12, 12, -8, 8, 0],
              rotate: [-5, 5, -5, 5, -3, 3, 0],
              scale: [1, 1.15, 1.25]
            }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
            className="w-32 h-32 bg-gradient-to-tr from-red-600 via-rose-500 to-amber-400 rounded-3xl p-1 shadow-2xl shadow-red-500/50 flex items-center justify-center"
          >
            <Gift className="w-16 h-16 text-white animate-bounce" />
          </motion.div>
          <h3 className="text-2xl font-black text-amber-400 uppercase tracking-widest animate-pulse">
            💥 ABRINDO O SEGREDO! 💥
          </h3>
        </motion.div>
      )}

      {/* ================= STAGE 4: REVEALED MATCH WITH FIREWORKS ================= */}
      {revealStage === 'REVEALED' && (
        <motion.div
          key="revealed-stage"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-12 shadow-2xl border-4 border-red-600 text-center space-y-8 relative"
        >
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-red-600 to-amber-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-red-600/20">
            <Sparkles className="w-4 h-4 text-amber-200" />
            Amigo Secreto Revelado!
          </div>

          {/* Winner Name with Dramatic Card */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-red-50 via-white to-amber-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 border-2 border-red-200 dark:border-red-900/50 shadow-inner space-y-3">
            <span className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold block">
              Você tirou no sorteio...
            </span>
            <motion.h2 
              initial={{ scale: 0.8 }}
              animate={{ scale: [0.8, 1.1, 1] }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-6xl font-black text-red-600 dark:text-red-400 leading-tight drop-shadow-sm"
            >
              {result.targetName} 🎉
            </motion.h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              Confira abaixo as caixas de presente desejadas por {result.targetName}!
            </p>
          </div>

          {/* Target Gift Boxes Section */}
          <div className="space-y-4 text-left border-t border-slate-100 dark:border-slate-800 pt-6">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Gift className="w-5 h-5 text-red-600" />
                Caixas de Presente de {result.targetName}
              </h4>

              {targetGifts.length > 0 && (
                <button
                  onClick={handleCopyGifts}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copied ? "Copiado!" : "Copiar Lista"}</span>
                </button>
              )}
            </div>

            {targetGifts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {targetGifts.map((giftItem, idx) => (
                  <motion.div
                    key={`target-gift-box-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-4 rounded-2xl bg-gradient-to-br from-red-50/70 to-white dark:from-slate-800 dark:to-slate-900 border-2 border-red-200 dark:border-red-900/40 shadow-sm flex items-center gap-3 group hover:border-red-400 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-black text-red-600 tracking-wider block">
                        Caixa #{idx + 1}
                      </span>
                      <span className="font-black text-slate-900 dark:text-white text-base truncate block">
                        {giftItem}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-slate-500 text-xs italic text-center space-y-1">
                <p>
                  {drawnParticipant?.wishlist 
                    ? `Desejos registrados: ${drawnParticipant.wishlist}` 
                    : `${result.targetName} ainda não preencheu suas caixas de presente.`}
                </p>
                <p className="text-[11px] text-slate-400">
                  Dica: Você pode dar uma olhadinha mais tarde caso {result.targetName} adicione presentes!
                </p>
              </div>
            )}
          </div>

          {/* Action Row: Re-fire Fogos & Secret Badge */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span>Segredo Mantido a Sete Chaves! 🔒</span>
            </div>

            <button
              onClick={launchFireworksBarrage}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
            >
              <Flame className="w-4 h-4" />
              <span>Soltar Fogos Novamente! 🎆</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
