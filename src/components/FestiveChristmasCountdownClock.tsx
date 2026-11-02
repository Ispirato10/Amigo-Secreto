import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Clock, Calendar, Flame } from 'lucide-react';

interface FestiveChristmasCountdownClockProps {
  title?: string;
  targetDate?: Date;
}

export const FestiveChristmasCountdownClock: React.FC<FestiveChristmasCountdownClockProps> = ({
  title = "Contagem Regressiva do Papai Noel 🎅",
  targetDate
}) => {
  // Default target date: Christmas Eve Dec 24, 2026 20:00:00 or custom target
  const defaultTarget = React.useMemo(() => {
    if (targetDate) return targetDate;
    const now = new Date();
    const christmas = new Date(now.getFullYear(), 11, 24, 20, 0, 0);
    if (now > christmas) {
      christmas.setFullYear(now.getFullYear() + 1);
    }
    return christmas;
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(defaultTarget));

  function calculateTimeLeft(target: Date) {
    const diff = target.getTime() - new Date().getTime();
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60)
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(defaultTarget));
    }, 1000);
    return () => clearInterval(timer);
  }, [defaultTarget]);

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-red-950/90 via-slate-900/90 to-red-950/90 border-2 border-amber-400/80 dark:border-amber-500/60 shadow-2xl text-white space-y-6 text-center backdrop-blur-xl relative overflow-hidden">
      {/* Background festive glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent pointer-events-none" />

      {/* Header Badge */}
      <div className="flex flex-col items-center gap-2">
        <span className="px-3.5 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/40 font-black text-[10px] uppercase tracking-widest rounded-full inline-flex items-center gap-1.5 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          {title}
        </span>
        <h3 className="text-xl md:text-2xl font-black text-white flex items-center justify-center gap-2">
          <span>Sorteio & Revelação do Amigo Secreto</span>
        </h3>
      </div>

      {/* Ticking 3D Time Cards */}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-4 max-w-lg mx-auto">
        {/* Days */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white/10 dark:bg-slate-800/80 border border-amber-300/30 flex flex-col items-center justify-center space-y-1 shadow-inner">
          <motion.span
            key={`days-${timeLeft.days}`}
            initial={{ scale: 1.2, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl sm:text-4xl font-black font-mono text-amber-300"
          >
            {String(timeLeft.days).padStart(2, '0')}
          </motion.span>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-300">Dias</span>
        </div>

        {/* Hours */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white/10 dark:bg-slate-800/80 border border-amber-300/30 flex flex-col items-center justify-center space-y-1 shadow-inner">
          <motion.span
            key={`hours-${timeLeft.hours}`}
            initial={{ scale: 1.2, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl sm:text-4xl font-black font-mono text-white"
          >
            {String(timeLeft.hours).padStart(2, '0')}
          </motion.span>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-300">Horas</span>
        </div>

        {/* Minutes */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white/10 dark:bg-slate-800/80 border border-amber-300/30 flex flex-col items-center justify-center space-y-1 shadow-inner">
          <motion.span
            key={`mins-${timeLeft.minutes}`}
            initial={{ scale: 1.2, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl sm:text-4xl font-black font-mono text-white"
          >
            {String(timeLeft.minutes).padStart(2, '0')}
          </motion.span>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-300">Minutos</span>
        </div>

        {/* Seconds */}
        <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 border-2 border-amber-400 flex flex-col items-center justify-center space-y-1 shadow-lg shadow-red-600/30">
          <motion.span
            key={`secs-${timeLeft.seconds}`}
            initial={{ scale: 1.3, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="text-2xl sm:text-4xl font-black font-mono text-amber-200"
          >
            {String(timeLeft.seconds).padStart(2, '0')}
          </motion.span>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-100">Segundos</span>
        </div>
      </div>

      <p className="text-[11px] text-slate-300 italic">
        🎄 Prepare seus presentes e fique atento quando o organizador iniciar o sorteio em tempo real!
      </p>
    </div>
  );
};
