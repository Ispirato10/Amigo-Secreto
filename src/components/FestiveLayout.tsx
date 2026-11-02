import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Info, Gift, Volume2, VolumeX } from 'lucide-react';
import { festiveAudio } from '../lib/festiveAudio';
import festiveHeroBg from '../assets/images/festive_secret_santa_hero_1793629619164.jpg';

interface FestiveLayoutProps {
  children: React.ReactNode;
}

export const FestiveLayout: React.FC<FestiveLayoutProps> = ({ children }) => {
  const { isInstallable, install, isIOS, isInstalled } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = React.useState(false);
  const [muted, setMuted] = React.useState(festiveAudio.isMuted());

  // Generate snow particles
  const snowParticles = React.useMemo(() => 
    Array.from({ length: 30 }).map((_, i) => ({
      id: `snow-flake-${i}`,
      left: `${Math.random() * 100}%`,
      duration: 5 + Math.random() * 10,
      delay: Math.random() * 5,
      size: 2 + Math.random() * 4
    })), []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-red-200 selection:text-red-900">
      {/* Background festive image with overlay */}
      <div className="fixed inset-0 z-0">
        <img 
          src={festiveHeroBg || '/assets/images/festive_secret_santa_hero_1793629619164.jpg'} 
          alt="Festive background"
          className="w-full h-full object-cover opacity-10 dark:opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white/50 dark:from-black/50 dark:to-black/50" />
      </div>

      {/* Snowfall effect */}
      <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
        {snowParticles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ y: -20, opacity: 0 }}
            animate={{ 
              y: '110vh', 
              opacity: [0, 0.8, 0],
              x: ['-5vw', '5vw', '-5vw']
            }}
            transition={{ 
              duration: p.duration, 
              repeat: Infinity, 
              delay: p.delay,
              ease: "linear"
            }}
            className="absolute rounded-full bg-white dark:bg-slate-200"
            style={{ 
              left: p.left, 
              width: p.size, 
              height: p.size,
              filter: 'blur(1px)'
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 md:gap-8 px-4 md:px-6 py-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Gift className="w-6 h-6 text-red-600" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            Amigo Secreto
          </h1>
        </div>

        <nav className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => {
              const newMuted = festiveAudio.toggleMute();
              setMuted(newMuted);
              if (!newMuted) festiveAudio.playJingle();
            }}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={muted ? "Ativar Efeitos Sonoros Festivos" : "Silenciar Efeitos Sonoros"}
            aria-label={muted ? "Ativar Efeitos Sonoros" : "Silenciar Efeitos Sonoros"}
          >
            {muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-red-600" />}
          </button>

          {!isInstalled && (
            <>
              {isInstallable && (
                <button
                  onClick={install}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Instalar App
                </button>
              )}
              {isIOS && (
                <button
                  onClick={() => setShowIOSGuide(true)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <Info className="w-4 h-4" />
                  iOS
                </button>
              )}
            </>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-20 container mx-auto px-4 py-8 max-w-4xl">
        {children}
      </main>

      {/* iOS Install Guide */}
      <AnimatePresence>
        {showIOSGuide && (
          <motion.div 
            key="ios-guide-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              key="ios-guide-modal-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-8 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Instalar no iPhone / iPad</h3>
              <div className="mt-4 space-y-4 text-slate-600 dark:text-slate-300">
                <p className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-sm font-bold">1</span>
                  Toque no botão <strong>Compartilhar</strong> na barra do Safari.
                </p>
                <p className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-sm font-bold">2</span>
                  Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.
                </p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-8 w-full rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Entendi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="relative z-20 py-8 text-center text-slate-400 text-sm">
        <p>© 2026 Amigo Secreto Festivo · Boas Festas!</p>
      </footer>
    </div>
  );
};
