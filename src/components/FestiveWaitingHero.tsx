import React from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  Gift, 
  Bell, 
  Star, 
  CheckCircle2, 
  Crown,
  Heart
} from 'lucide-react';
import { festiveAudio } from '../lib/festiveAudio';

interface FestiveWaitingHeroProps {
  userName: string;
  roomName: string;
  giftBoxesCount: number;
  onEditGifts: () => void;
}

export const FestiveWaitingHero: React.FC<FestiveWaitingHeroProps> = ({
  userName,
  roomName,
  giftBoxesCount,
  onEditGifts
}) => {
  const [bellRings, setBellRings] = React.useState(0);

  const handleRingBell = () => {
    setBellRings(prev => prev + 1);
    festiveAudio.playJingle();

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.5 },
      colors: ['#ef4444', '#eab308', '#22c55e', '#ffffff']
    });
  };

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] p-1 bg-gradient-to-r from-red-600 via-amber-400 to-emerald-600 shadow-2xl shadow-red-500/20">
      {/* Animated glowing inner wrapper */}
      <div className="relative rounded-[2.4rem] bg-gradient-to-b from-white via-red-50/40 to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-8 md:p-10 text-center backdrop-blur-xl overflow-hidden">
        
        {/* Decorative Festive Floating Stars & Elements */}
        <div className="absolute top-4 left-6 pointer-events-none opacity-40 animate-pulse">
          <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
        </div>
        <div className="absolute top-8 right-8 pointer-events-none opacity-40 animate-bounce">
          <Sparkles className="w-6 h-6 text-red-500" />
        </div>
        <div className="absolute bottom-4 left-10 pointer-events-none opacity-30">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
        </div>
        <div className="absolute bottom-6 right-8 pointer-events-none opacity-30 animate-pulse">
          <Star className="w-4 h-4 text-emerald-500 fill-emerald-400" />
        </div>

        {/* Top Tag */}
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-black uppercase tracking-widest shadow-md shadow-red-600/30 mb-5"
        >
          <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
          <span>Participante Oficial · {roomName}</span>
        </motion.div>

        {/* Centerpiece: The Person's Name with Special Effects */}
        <div className="relative my-2">
          {/* Subtle Golden Glow behind name */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-red-500/20 to-amber-400/20 blur-2xl rounded-full -z-10" />

          {/* Festive Santa Hat decoration above the avatar / name */}
          <div className="flex justify-center items-center gap-2 mb-2">
            <span className="text-2xl animate-bounce">🎅</span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Passaporte de Natal
            </span>
            <span className="text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎄</span>
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="cursor-pointer select-none group"
            onClick={handleRingBell}
            title="Clique para celebrar!"
          >
            {/* Shimmering, high-impact gradient typography */}
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm flex items-center justify-center gap-2 flex-wrap">
              <span className="bg-gradient-to-r from-red-600 via-amber-500 to-red-600 bg-clip-text text-transparent group-hover:scale-105 transition-transform inline-block">
                {userName}
              </span>
              <motion.span 
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="inline-block text-3xl md:text-4xl"
              >
                ✨
              </motion.span>
            </h2>
          </motion.div>

          <p className="mt-3 text-sm md:text-base text-slate-600 dark:text-slate-300 font-semibold max-w-lg mx-auto">
            Você está confirmado(a) e na lista do Papai Noel! Aguarde o organizador iniciar o sorteio mágico.
          </p>
        </div>

        {/* Status Pills and Interactive Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {/* Confirmed presence badge */}
          <div className="px-4 py-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>Presença Confirmada no Sorteio</span>
          </div>

          {/* Gift boxes badge */}
          <button
            onClick={onEditGifts}
            className="px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shadow-sm"
          >
            <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>
              {giftBoxesCount > 0 
                ? `${giftBoxesCount} presente(s) nas caixas` 
                : 'Cadastrar presentes nas caixas'}
            </span>
          </button>

          {/* Interactive Bell Chime button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleRingBell}
            className="px-4 py-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all"
            title="Tocar sino natalino e comemorar"
          >
            <Bell className="w-3.5 h-3.5 animate-bounce" />
            <span>Tocar Sino de Natal! {bellRings > 0 && `(${bellRings})`}</span>
          </motion.button>
        </div>

      </div>
    </div>
  );
};
