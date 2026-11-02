import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Sparkles, Download, X, Smartphone, CheckCircle2, Share } from 'lucide-react';
import { festiveAudio } from '../lib/festiveAudio';
import confetti from 'canvas-confetti';
import pwaIcon from '../assets/images/pwa_app_icon_1793635609788.jpg';

export const FestivePWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If app is already installed or user dismissed banner for this session, don't show
  if (isInstalled || dismissed) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      festiveAudio.playJingle();
      const outcome = await install();
      if (outcome) {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.7 },
          colors: ['#ef4444', '#eab308', '#22c55e']
        });
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // General prompt if not beforeinstallprompt
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!dismissed && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.85, rotate: -2 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: 100, scale: 0.85, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 p-5 rounded-3xl bg-gradient-to-r from-red-950/95 via-slate-900/95 to-red-950/95 text-white shadow-2xl border-2 border-amber-400/80 dark:border-amber-500/60 backdrop-blur-xl space-y-4"
          >
            {/* Dismiss Button */}
            <button
              onClick={() => setDismissed(true)}
              className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              title="Fechar sugestão"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Banner Header with 3D Icon */}
            <div className="flex items-center gap-3.5 pr-6">
              <div className="relative shrink-0">
                <img
                  src={pwaIcon || '/assets/images/pwa_app_icon_1793635609788.jpg'}
                  alt="Amigo Secreto App Icon"
                  className="w-14 h-14 rounded-2xl object-cover shadow-lg border-2 border-amber-300 animate-pulse"
                />
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[10px]">
                  ✨
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-400/30">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Instalação Recomendada
                </div>
                <h4 className="text-base font-black text-white leading-tight">
                  Instale o App na sua Tela Inicial! 📱
                </h4>
              </div>
            </div>

            {/* Message Body */}
            <p className="text-xs text-slate-200 leading-relaxed">
              Acesse suas caixas de presentes e confira quem você tirou direto da tela inicial do seu celular, com resposta ultra-rápida e sem gastar internet!
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleInstallClick}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white rounded-2xl font-black text-xs shadow-lg shadow-red-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
              >
                <Download className="w-4 h-4 text-amber-200 group-hover:bounce" />
                <span>Instalar Agora</span>
              </button>

              <button
                onClick={() => setDismissed(true)}
                className="py-3 px-3 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-2xl hover:bg-white/10 transition-colors"
              >
                Agora não
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Instructions Modal */}
      <AnimatePresence>
        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-slate-900 text-white p-6 shadow-2xl border-2 border-amber-400/80 text-center space-y-5"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-400 flex items-center justify-center mx-auto">
                <Smartphone className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black">Instalar no iPhone / iPad</h3>
                <p className="text-xs text-slate-300">
                  Siga os passos abaixo para adicionar o app à sua Tela de Início:
                </p>
              </div>

              <div className="space-y-3 text-left text-xs bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0">1</span>
                  <span>Toque no ícone de <strong className="text-amber-300">Compartilhar</strong> (quadrado com seta) na barra do navegador Safari.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0">2</span>
                  <span>Role o menu para baixo e selecione <strong className="text-amber-300">Adicionar à Tela de Início</strong>.</span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-lg transition-colors"
              >
                Entendi!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
