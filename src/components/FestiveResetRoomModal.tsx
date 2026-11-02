import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Lock, AlertCircle, Loader2, CheckCircle2, X, RefreshCw } from 'lucide-react';

interface FestiveResetRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  onConfirmReset: (roomId: string, password: string) => Promise<boolean>;
}

export const FestiveResetRoomModal: React.FC<FestiveResetRoomModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomName,
  onConfirmReset
}) => {
  const [password, setPassword] = useState('123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.trim() !== '123') {
      setError('Senha incorreta! A senha para reabrir a sala é 123.');
      return;
    }

    setLoading(true);
    const success = await onConfirmReset(roomId, password);
    setLoading(false);

    if (success) {
      setPassword('123');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border-2 border-amber-300 dark:border-amber-700/60 text-center space-y-6"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Header */}
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-red-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
            <RotateCcw className="w-8 h-8 animate-spin-slow" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-widest rounded-full">
              Reutilização de Sala
            </span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              Reabrir Sala para Novo Sorteio?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Você está prestes a reabrir a sala <strong className="text-red-600">{roomName}</strong>.
            </p>
          </div>

          <div className="p-4 bg-amber-50/80 dark:bg-slate-800/80 rounded-2xl border border-amber-200 dark:border-slate-700 text-left space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
              O que acontecerá:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-600 dark:text-slate-300">
              <li>O resultado do sorteio anterior será resetado.</li>
              <li><strong>Todos os participantes cadastrados permanecem na sala</strong>.</li>
              <li>As caixas de presentes dos participantes são mantidas.</li>
              <li>A sala volta para o status "Aguardando Sorteio".</li>
            </ul>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-200 dark:border-red-900/50">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-left space-y-1">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-red-600" />
                Senha de Confirmação do Administrador:
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha (123)"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-950 dark:text-white font-mono text-center font-bold text-sm focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
              />
              <p className="text-[11px] text-slate-400 text-center">
                Confirme com a senha <strong>123</strong> para reabrir a sala.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Reabrindo...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirmar Reabertura</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
