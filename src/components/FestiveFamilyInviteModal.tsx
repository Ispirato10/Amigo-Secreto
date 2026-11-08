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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-md bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 overflow-hidden my-auto mx-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full backdrop-blur-md transition-colors border border-slate-700"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Social Share Banner Header */}
          <div className="relative h-36 sm:h-40 w-full overflow-hidden bg-slate-950 shrink-0">
            <img 
              src={familyShareCardImg} 
              alt="Convite Amigo Secreto"
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent flex items-end p-5">
              <div className="space-y-1">
                <span className="px-3 py-1 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-full inline-flex items-center gap-1.5 shadow-lg">
                  <Sparkles className="w-3.5 h-3.5" />
                  Convite Festivo
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md">
                  Convidar a Família 🎄
                </h2>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-4">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed text-center font-medium">
              Envie o convite no grupo da família para que todos se cadastrem e entrem no sorteio!
            </p>

            {/* Message Box Preview */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400 px-1">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  PRÉVIA DA MENSAGEM
                </span>
                <span className="bg-amber-950/80 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider">
                  Pronta para envio
                </span>
              </div>
              <div className="text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto p-3 bg-slate-900/50 rounded-xl leading-relaxed border border-slate-800/80">
                {defaultInviteMessage}
              </div>
            </div>

            {/* Action Buttons - SINGLE ROW CIRCULAR ICON-ONLY BUTTONS */}
            <div className="pt-2 flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-5">
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={handleWhatsAppShare}
                    className="w-12 h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-xl shadow-emerald-950/60 transition-all flex items-center justify-center shrink-0 active:scale-95 cursor-pointer"
                    title="Enviar via WhatsApp"
                  >
                    <Send className="w-5.5 h-5.5" />
                  </button>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={handleCopyMessage}
                    className={`w-12 h-12 rounded-full shadow-xl transition-all flex items-center justify-center shrink-0 active:scale-95 cursor-pointer ${
                      copied 
                        ? 'bg-emerald-600 text-white shadow-emerald-950/60' 
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/60'
                    }`}
                    title={copied ? "Copiado!" : "Copiar Texto"}
                  >
                    {copied ? <Check className="w-5.5 h-5.5" /> : <Copy className="w-5.5 h-5.5" />}
                  </button>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {copied ? 'Copiado!' : 'Copiar'}
                  </span>
                </div>

                {'share' in navigator && (
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={handleWebShare}
                      className="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-full shadow-xl transition-all flex items-center justify-center shrink-0 active:scale-95 border border-slate-700 cursor-pointer"
                      title="Compartilhar no Aparelho"
                    >
                      <Share2 className="w-5.5 h-5.5" />
                    </button>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outros</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
