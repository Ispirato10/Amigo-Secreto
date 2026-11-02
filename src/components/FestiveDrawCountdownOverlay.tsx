import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Gift, Flame, Trophy, Play } from 'lucide-react';
import { festiveAudio } from '../lib/festiveAudio';
import confetti from 'canvas-confetti';

interface FestiveDrawCountdownOverlayProps {
  isOpen: boolean;
  onCountdownComplete: () => void;
  onCancel?: () => void;
  durationSeconds?: number;
}

export const FestiveDrawCountdownOverlay: React.FC<FestiveDrawCountdownOverlayProps> = ({
  isOpen,
  onCountdownComplete,
  onCancel,
  durationSeconds = 10
}) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(durationSeconds);
      setHasTriggered(false);
      return;
    }

    festiveAudio.playJingle();

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        festiveAudio.playJingle();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, durationSeconds]);

  useEffect(() => {
    if (isOpen && timeLeft === 0 && !hasTriggered) {
      setHasTriggered(true);
      festiveAudio.playDrawFinished();

      // Confetti Burst
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#ef4444', '#eab308', '#22c55e', '#ffffff']
      });

      const timer = setTimeout(() => {
        onCountdownComplete();
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [isOpen, timeLeft, hasTriggered, onCountdownComplete]);

  if (!isOpen) return null;

  const progressPercent = ((durationSeconds - timeLeft) / durationSeconds) * 100;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl overflow-hidden selection:bg-red-500 text-white">
        {/* Glowing Background Radial Effects */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-600/30 via-amber-600/10 to-transparent animate-pulse" />
        
        {/* Animated Christmas Ring Frame */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute w-[320px] h-[320px] sm:w-[500px] sm:h-[500px] rounded-full border-4 border-dashed border-amber-400/40 pointer-events-none"
        />

        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
          className="absolute w-[280px] h-[280px] sm:w-[440px] sm:h-[440px] rounded-full border-2 border-dotted border-red-500/50 pointer-events-none"
        />

        {/* Content Box */}
        <div className="relative z-10 text-center space-y-8 max-w-lg mx-auto">
          {/* Top Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-600/80 via-amber-500/80 to-red-600/80 border border-amber-300 text-white text-xs font-black uppercase tracking-widest shadow-xl"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
            <span>Sorteio de Amigo Secreto em Andamento</span>
          </motion.div>

          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-lg">
              Prepara o Coração! ❤️
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              O Papai Noel está girando a roleta mágica para definir todos os amigos secretos!
            </p>
          </div>

          {/* Spectacular Countdown Display */}
          <div className="relative w-48 h-48 sm:w-60 sm:h-60 mx-auto flex items-center justify-center">
            {/* Circular Progress Ring */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="42%"
                stroke="currentColor"
                strokeWidth="10"
                className="text-slate-800"
                fill="transparent"
              />
              <circle
                cx="50%"
                cy="50%"
                r="42%"
                stroke="currentColor"
                strokeWidth="10"
                className="text-gradient font-bold transition-all duration-1000 ease-linear"
                fill="transparent"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * progressPercent) / 100}
                strokeLinecap="round"
                style={{ stroke: 'url(#festiveGradient)' }}
              />
              <defs>
                <linearGradient id="festiveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>

            {/* Glowing Center Number */}
            <motion.div
              key={`countdown-num-${timeLeft}`}
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              {timeLeft > 0 ? (
                <span className="text-6xl sm:text-8xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-red-600 drop-shadow-[0_10px_10px_rgba(239,68,68,0.5)]">
                  {timeLeft}
                </span>
              ) : (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1.3, rotate: [0, -10, 10, 0] }}
                  className="flex flex-col items-center gap-1"
                >
                  <Gift className="w-16 h-16 text-amber-400 animate-bounce" />
                  <span className="text-sm font-black text-amber-300 uppercase tracking-wider">SORTEADO!</span>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Footer note / cancel option */}
          <div className="pt-2">
            {onCancel && timeLeft > 0 && (
              <button
                onClick={onCancel}
                className="text-xs text-slate-400 hover:text-white font-semibold underline transition-colors"
              >
                Cancelar Contagem
              </button>
            )}
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};
