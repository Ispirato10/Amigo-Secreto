import React from 'react';
import { motion, useAnimation } from 'motion/react';
import confetti from 'canvas-confetti';
import { Howl } from 'howler';
import { festiveAudio } from '../lib/festiveAudio';

interface RouletteProps {
  participants: { name: string }[];
  isSpinning: boolean;
  onSpinEnd?: (winnerName: string) => void;
}

export const Roulette: React.FC<RouletteProps> = ({ participants, isSpinning, onSpinEnd }) => {
  const controls = useAnimation();
  const [winner, setWinner] = React.useState<string | null>(null);

  const spinSound = React.useMemo(() => new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'], // Festive chime/spin
    volume: 0.5,
  }), []);

  const winSound = React.useMemo(() => new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], // Win sound
    volume: 0.7,
  }), []);

  React.useEffect(() => {
    if (isSpinning && participants.length > 0) {
      const spin = async () => {
        spinSound.play();
        // Random spin duration and rotation
        const rotations = 5 + Math.floor(Math.random() * 5);
        const finalRotation = rotations * 360 + Math.floor(Math.random() * 360);
        
        await controls.start({
          rotate: finalRotation,
          transition: { duration: 4, ease: "circOut" }
        });

        // Determine winner based on rotation
        const degreePerPerson = 360 / participants.length;
        const normalizedRotation = finalRotation % 360;
        const winnerIndex = Math.floor((360 - normalizedRotation) / degreePerPerson) % participants.length;
        
        const winnerName = participants[winnerIndex].name;
        setWinner(winnerName);
        
        spinSound.stop();
        winSound.play();
        festiveAudio.playDrawFinished();

        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ff0000', '#00ff00', '#ffffff', '#ffd700']
        });

        if (onSpinEnd) onSpinEnd(winnerName);
      };
      spin();
    }
  }, [isSpinning, participants, controls, onSpinEnd]);

  if (participants.length === 0) return null;

  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 mx-auto">
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20">
        <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-red-600 drop-shadow-lg" />
      </div>

      <motion.div
        animate={controls}
        className="w-full h-full rounded-full border-8 border-white dark:border-slate-800 shadow-2xl overflow-hidden relative bg-white dark:bg-slate-900"
      >
        {participants.map((p, i) => {
          const angle = (360 / participants.length);
          const rotation = angle * i;
          const skewY = 90 - angle;
          
          return (
            <div
              key={`segment-${i}-${p.name}`}
              className="absolute top-0 right-0 w-1/2 h-1/2 origin-bottom-left border-l border-slate-200 dark:border-slate-700"
              style={{
                transform: `rotate(${rotation}deg) skewY(-${skewY}deg)`,
                backgroundColor: i % 2 === 0 ? '#fecaca' : '#fee2e2',
              }}
            >
              <div 
                className="absolute bottom-4 left-4 origin-bottom-left"
                style={{
                  transform: `skewY(${skewY}deg) rotate(${angle / 2}deg)`,
                  width: '100px'
                }}
              >
                <span className="text-xs font-bold text-red-900 truncate block max-w-[80px]">
                  {p.name}
                </span>
              </div>
            </div>
          );
        })}
        {/* Center hub */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white dark:bg-slate-800 rounded-full border-4 border-red-600 z-10 flex items-center justify-center">
          <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse" />
        </div>
      </motion.div>

      {winner && !isSpinning && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-slate-500 uppercase tracking-widest font-bold">Participante Sorteado</p>
          <h2 className="text-3xl font-black text-red-600 dark:text-red-400 mt-1">{winner}</h2>
        </motion.div>
      )}
    </div>
  );
};
