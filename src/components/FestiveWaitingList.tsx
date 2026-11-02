import React from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Users, 
  Sparkles, 
  Bell, 
  Gift, 
  Star, 
  CheckCircle2, 
  Crown,
  Smile
} from 'lucide-react';
import { festiveAudio } from '../lib/festiveAudio';

export interface WaitingParticipant {
  id?: string;
  name: string;
  password?: string;
  giftBoxes?: string[];
  wishlist?: string | string[];
  uid?: string;
}

interface FestiveWaitingListProps {
  participants: WaitingParticipant[];
  currentUserName: string;
  currentUserId?: string;
  giftBoxesCount: number;
  onEditGifts?: () => void;
}

const AVATAR_FESTIVE_COLORS = [
  'bg-gradient-to-br from-red-500 to-rose-700 text-white',
  'bg-gradient-to-br from-emerald-600 to-teal-800 text-white',
  'bg-gradient-to-br from-amber-500 to-orange-700 text-white',
  'bg-gradient-to-br from-indigo-500 to-purple-700 text-white',
  'bg-gradient-to-br from-red-600 to-amber-600 text-white',
];

export const FestiveWaitingList: React.FC<FestiveWaitingListProps> = ({
  participants,
  currentUserName,
  currentUserId,
  giftBoxesCount,
  onEditGifts,
}) => {
  // Check if current user is already in the participants list
  const isUserInList = participants.some(
    p => (currentUserId && p.id === currentUserId) || 
         p.name.trim().toLowerCase() === currentUserName.trim().toLowerCase()
  );

  // If not in the list for any reason, prepend them so they are always visible
  const allParticipants: WaitingParticipant[] = isUserInList
    ? [...participants]
    : [{ id: currentUserId || 'me', name: currentUserName, wishlist: [] }, ...participants];

  // Reorder so current user is always displayed first at the top of the relation
  const sortedParticipants = [...allParticipants].sort((a, b) => {
    const isA = (currentUserId && a.id === currentUserId) || 
                a.name.trim().toLowerCase() === currentUserName.trim().toLowerCase();
    const isB = (currentUserId && b.id === currentUserId) || 
                b.name.trim().toLowerCase() === currentUserName.trim().toLowerCase();
    if (isA && !isB) return -1;
    if (!isA && isB) return 1;
    return a.name.localeCompare(b.name);
  });

  const handleCelebrate = () => {
    festiveAudio.playJingle();
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ffffff']
    });
  };

  return (
    <div className="bg-gradient-to-br from-blue-50/90 via-white to-red-50/50 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 p-6 sm:p-8 rounded-3xl border border-blue-100 dark:border-blue-900/40 shadow-xl space-y-6 relative overflow-hidden">
      
      {/* Festive Background Glows */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-red-500/10 dark:bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-44 h-44 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header section with exact requested text */}
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/80 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 text-[11px] font-black uppercase tracking-wider border border-blue-200/50 dark:border-blue-800/50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            <span>Sala em Espera · Ao Vivo</span>
          </div>

          <h3 className="font-bold text-lg sm:text-xl text-blue-950 dark:text-blue-200 flex items-center gap-2">
            <Users className="w-5 h-5 text-red-600 shrink-0" />
            <span>Aguardando Início do Sorteio</span>
          </h3>

          <p className="text-xs text-blue-800/80 dark:text-blue-300/80 leading-relaxed max-w-md">
            O organizador da sala iniciará o sorteio quando todos os amigos tiverem entrado. Fique atento!
          </p>
        </div>

        {/* Festive Bell Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={handleCelebrate}
          className="shrink-0 p-3 rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30 hover:shadow-red-600/40 transition-all flex flex-col items-center gap-1"
          title="Tocar sino de natal e soltar confetes!"
        >
          <Bell className="w-5 h-5 animate-bounce" />
          <span className="text-[10px] font-bold tracking-tight">Celebrar</span>
        </motion.button>
      </div>

      {/* Relação dos Participantes Header */}
      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Relação dos Participantes ({sortedParticipants.length})</span>
          </span>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Conectados
          </span>
        </div>

        {/* Participants Cards Grid / List */}
        <div className="space-y-3">
          {sortedParticipants.map((p, idx) => {
            const isMe = (currentUserId && p.id === currentUserId) || 
                         p.name.trim().toLowerCase() === currentUserName.trim().toLowerCase();
            const colorClass = AVATAR_FESTIVE_COLORS[idx % AVATAR_FESTIVE_COLORS.length];
            const giftsCount = isMe 
              ? giftBoxesCount 
              : (Array.isArray(p.giftBoxes)
                  ? p.giftBoxes.filter(b => typeof b === 'string' && b.trim().length > 0).length
                  : (Array.isArray(p.wishlist) 
                      ? p.wishlist.filter(Boolean).length 
                      : (typeof p.wishlist === 'string' && p.wishlist.trim().length > 0 ? 1 : 0)
                    )
                );

            if (isMe) {
              // --- CREATIVE SPECIAL EFFECTS CARD FOR CURRENT USER ---
              return (
                <motion.div
                  key={`participant-me-${p.id || idx}`}
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={handleCelebrate}
                  className="relative p-[2.5px] rounded-2xl bg-gradient-to-r from-red-500 via-amber-400 via-emerald-500 to-red-500 bg-[length:200%_auto] animate-gradient shadow-lg shadow-red-500/20 cursor-pointer group"
                  title="Seu nome especial na sala! Clique para tocar o sino!"
                >
                  <div className="relative bg-gradient-to-r from-white via-red-50/60 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 rounded-[14px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden">
                    
                    {/* Shimmering background accent */}
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl group-hover:bg-amber-400/30 transition-colors pointer-events-none" />

                    {/* Left: Avatar + Animated Special Name */}
                    <div className="flex items-center gap-3.5 relative z-10">
                      {/* Festive Avatar with Santa Hat */}
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-md border-2 border-white dark:border-slate-800">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        {/* Santa Cap / Festive Icon Pin */}
                        <span className="absolute -top-2 -right-1.5 text-base drop-shadow select-none animate-bounce" style={{ animationDuration: '2s' }}>
                          🎅
                        </span>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center" title="Presença confirmada">
                          <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>

                      {/* Name with creative festive styling & badges */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Creative Person Name with Special Effects */}
                          <span className="text-base sm:text-lg md:text-xl font-black bg-gradient-to-r from-red-600 via-amber-500 to-red-600 bg-clip-text text-transparent tracking-tight drop-shadow-sm flex items-center gap-1.5">
                            {p.name}
                            <motion.span 
                              animate={{ rotate: [0, 20, -20, 0] }}
                              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                              className="inline-block text-base"
                            >
                              ✨
                            </motion.span>
                          </span>

                          {/* VIP "VOCÊ" Pill */}
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-sm border border-amber-300">
                            <Crown className="w-3 h-3 fill-slate-950 text-slate-950" />
                            <span>VOCÊ (Na Sala)</span>
                          </span>
                        </div>

                        {/* Status text */}
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Presença Confirmada
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                            Aguardando sorteio
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Gift box badge & Interactive button */}
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center relative z-10">
                      {onEditGifts && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditGifts();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-red-100/80 hover:bg-red-200 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                          title="Gerenciar suas caixas de presente"
                        >
                          <Gift className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>{giftsCount > 0 ? `${giftsCount} Presente(s)` : 'Adicionar Presentes'}</span>
                        </button>
                      )}
                    </div>

                  </div>
                </motion.div>
              );
            }

            // --- Other Participants in the Room ---
            return (
              <div
                key={`participant-${p.id || idx}`}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 hover:border-red-200 dark:hover:border-slate-600 transition-all flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Colored Festive Avatar */}
                  <div className={`w-9 h-9 rounded-xl ${colorClass} flex items-center justify-center font-bold text-sm shadow-xs shrink-0`}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0"></span>
                      <span>Conectado na sala</span>
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-[11px] text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1">
                    <Gift className="w-3 h-3 text-red-500" />
                    <span>{giftsCount > 0 ? `${giftsCount} presente(s)` : 'Sem lista ainda'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info text */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-blue-700/80 dark:text-blue-300/80 font-medium">
          <p>
            {sortedParticipants.length} amigo(s) na sala aguardando o sorteio.
          </p>
          <p className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold">
            <Smile className="w-3.5 h-3.5" />
            <span>Boa sorte no sorteio natalino!</span>
          </p>
        </div>
      </div>

    </div>
  );
};
