import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Share2, 
  Copy, 
  Check, 
  X, 
  Sparkles, 
  Send, 
  MessageSquare
} from 'lucide-react';
import { festiveAudio } from '../lib/festiveAudio';
import confetti from 'canvas-confetti';
import familyShareCardImg from '../assets/images/family_share_card_1793635609269.jpg';

interface FestiveFamilyInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  roomName?: string;
}

export const FestiveFamilyInviteModal: React.FC<FestiveFamilyInviteModalProps> = ({
  isOpen,
  onClose,
  roomId = '',
  roomName = 'Amigo Secreto da Família'
}) => {
  const [copied, setCopied] = useState(false);

  const baseUrl = 'https://meuamigofamily.vercel.app';
  const shareUrl = roomId 
    ? `${baseUrl}?room=${roomId}` 
    : baseUrl;

  const defaultInviteMessage = `🎄✨ *AMIGO SECRETO DA FAMÍLIA DE FIM DE ANO!* 🎅🎁

Boas Festas, pessoal! O nosso sorteio de fim de ano já está pronto! 🌟

Venha cadastrar suas caixas de presentes mágicas e entrar na nossa sala oficial do Amigo Secreto!

${roomId ? `🔑 *CHAVE DA SALA:* *${roomId}*` : ''}
👉 *ENTRE DIRETO PELO LINK:* ${shareUrl}

🎁 *Como participar:*
1. Acesse o link acima
2. Preencha seu nome e sua senha
3. Monte suas caixas de presente desejados
4. Aguarde o sorteio com sigilo 100% garantido!

Um feliz fim de ano cheio de paz, amor e alegrias para toda a família! ❤️🎅✨`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(defaultInviteMessage);
    setCopied(true);
    festiveAudio.playJingle();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#ef4444', '#eab308', '#22c55e']
    });
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(defaultInviteMessage);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Amigo Secreto da Família 🎄 ${roomName}`,
          text: `Venha participar do nosso Amigo Secreto da Família! Monte sua lista de presentes e divirta-se!`,
          url: shareUrl,
        });
      } catch (err) {
        console.warn('Share cancelled or not supported:', err);
      }
    } else {
      handleCopyMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-red-200 dark:border-red-900/50 overflow-hidden my-8"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Social Share Banner Header */}
          <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
            <img 
              src={familyShareCardImg || '/assets/images/family_share_card_1793635609269.jpg'} 
              alt="Convite Amigo Secreto da Família"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent flex items-end p-6">
              <div className="space-y-1">
                <span className="px-3 py-1 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-full inline-flex items-center gap-1.5 shadow-md">
                  <Sparkles className="w-3.5 h-3.5" />
                  Convite Festivo da Família
                </span>
                <h3 className="text-2xl md:text-3xl font-black text-white drop-shadow-md">
                  Convidar a Família 🎄
                </h3>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 md:p-8 space-y-6">
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Envie este convite especial no grupo do WhatsApp da família ou redes sociais para que todos se cadastrem e montem suas listas de presentes!
            </p>

            {/* Message Box Preview */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 to-red-50/70 dark:from-slate-800/80 dark:to-slate-950/80 border border-amber-200 dark:border-amber-900/40 relative space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  Mensagem de Convite
                </span>
                <span className="text-[10px] bg-amber-200 dark:bg-amber-900/60 px-2 py-0.5 rounded-full text-amber-900 dark:text-amber-100">
                  Pronta para envio
                </span>
              </div>

              <div className="text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed">
                {defaultInviteMessage}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleWhatsAppShare}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 group"
              >
                <Send className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Enviar no WhatsApp</span>
              </button>

              <button
                onClick={handleCopyMessage}
                className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-amber-300" />
                    <span>Copiado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>Copiar Convite</span>
                  </>
                )}
              </button>
            </div>

            {'share' in navigator && (
              <button
                onClick={handleWebShare}
                className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4 text-red-600" />
                <span>Outras Opções de Compartilhamento no Celular</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
