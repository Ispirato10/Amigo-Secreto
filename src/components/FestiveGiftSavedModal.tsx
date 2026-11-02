import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gift, 
  Sparkles, 
  CheckCircle2, 
  X, 
  Package, 
  PartyPopper,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { festiveAudio } from '../lib/festiveAudio';

interface FestiveGiftSavedModalProps {
  isOpen: boolean;
  onClose: () => void;
  giftBoxes: string[];
  roomName?: string;
  onGoToRoom?: () => void;
}

export const FestiveGiftSavedModal: React.FC<FestiveGiftSavedModalProps> = ({
  isOpen,
  onClose,
  giftBoxes,
  roomName,
  onGoToRoom
}) => {
  const filledGifts = giftBoxes
    .map(b => b.trim())
    .filter(b => b.length > 0);

  useEffect(() => {
    if (isOpen) {
      // Trigger festive sound effect
      festiveAudio.playGiftsSaved();

      // Launch cheerful Christmas confetti burst
      try {
        confetti({
          particleCount: 65,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#dc2626', '#16a34a', '#eab308', '#ffffff', '#f43f5e']
        });

        // Double burst for extra delight
        const timer = setTimeout(() => {
          confetti({
            particleCount: 40,
            angle: 60,
            spread: 55,
            origin: { x: 0.2, y: 0.6 },
            colors: ['#dc2626', '#16a34a', '#eab308']
          });
          confetti({
            particleCount: 40,
            angle: 120,
            spread: 55,
            origin: { x: 0.8, y: 0.6 },
            colors: ['#dc2626', '#16a34a', '#eab308']
          });
        }, 220);

        return () => clearTimeout(timer);
      } catch (e) {
        console.warn('Confetti error:', e);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg bg-gradient-to-b from-white via-red-50/30 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 rounded-[2.5rem] p-6 md:p-8 shadow-2xl border-2 border-red-500/30 text-center overflow-hidden"
        >
          {/* Decorative glowing background orbs */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-red-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Animated Festive Icon Header */}
          <div className="relative mx-auto mb-4 w-20 h-20">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-red-500/30"
            >
              <Gift className="w-10 h-10" />
            </motion.div>
            <div className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-500 text-white rounded-full shadow-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          {/* Cheerful Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Salvo com Sucesso!</span>
          </div>

          {/* Title */}
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Ho, Ho, Ho! Lista Salva! 🎅✨
          </h3>

          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-sm mx-auto leading-relaxed">
            Suas caixas de presentes natalinos foram salvas com muito carinho. O Papai Noel já anotou seus desejos!
          </p>

          {/* Gifts Summary Box */}
          <div className="my-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-left space-y-2.5 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                <Package className="w-4 h-4" />
                Caixas Registradas ({filledGifts.length}):
              </span>
              <span>{filledGifts.length > 0 ? 'Prontas para o Amigo Secreto' : 'Vazias'}</span>
            </div>

            {filledGifts.length > 0 ? (
              <div className="space-y-1.5">
                {filledGifts.map((gift, idx) => (
                  <motion.div
                    key={`saved-gift-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-red-100 dark:border-slate-800 shadow-xs text-xs"
                  >
                    <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 font-black text-[10px]">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {gift}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50">
                ⚠️ Dica: Você salvou as caixas, mas nenhuma possui o nome de um presente ainda. Digite os presentes que deseja ganhar para facilitar a escolha do seu amigo!
              </p>
            )}

            {roomName && (
              <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/70 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Atualizado automaticamente na sala: <strong className="font-bold">{roomName}</strong></span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
            {roomName && onGoToRoom && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToRoom();
                }}
                className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Ir para a Sala</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2"
            >
              <PartyPopper className="w-4 h-4" />
              <span>Maravilha, Entendido!</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
