
import React, { useMemo } from 'react';
import { Skull, Check, ChevronRight, Zap, HelpCircle } from 'lucide-react';
import { GameState } from '../types.ts';

interface GameplayViewProps {
  gameState: GameState;
  userId: string;
  onAnswer: (idx: number) => void;
  onNext: () => void;
}

const GameplayView: React.FC<GameplayViewProps> = ({ gameState, userId, onAnswer, onNext }) => {
  const { currentQuestion: q, players, currentRound, maxRounds } = gameState;
  const me = useMemo(() => players.find(p => p.id === userId), [players, userId]);
  const allAnswered = useMemo(() => players.every(p => p.hp <= 0 || p.hasAnswered), [players]);

  if (!q) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 animate-pulse">
      <Zap size={48} />
      <p className="mt-4 font-bungee">Sincronizando Call...</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-lg mx-auto">
      {/* Squad Status */}
      <section className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
        {players.map(p => (
          <div 
            key={p.id} 
            className={`shrink-0 glass p-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${p.hasAnswered ? 'border-blue-500' : 'border-transparent'}`}
          >
            <div className="relative">
              <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-xl object-cover bg-slate-800" />
              {p.hp <= 0 && (
                <div className="absolute inset-0 bg-red-900/80 rounded-xl flex items-center justify-center">
                  <Skull size={16} className="text-white" />
                </div>
              )}
            </div>
            <div className="hidden sm:flex flex-col pr-1">
              <span className="text-[10px] font-bold text-white truncate w-16 uppercase">{p.name}</span>
              <div className="h-1 w-full bg-slate-800 rounded-full mt-1">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${p.hp}%` }} />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Main Question Card (Texto Focado) */}
      <article className="bg-slate-900/90 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl animate-slide-up">
        <header className="min-h-[16rem] bg-gradient-to-br from-blue-900/30 to-slate-900 p-8 flex flex-col items-center justify-center relative text-center">
          <div className="absolute top-6 left-6 bg-blue-600 px-4 py-1.5 rounded-full font-bungee text-[10px] text-white shadow-xl">
            MISSAO {currentRound}/{maxRounds}
          </div>
          
          <HelpCircle size={48} className="text-blue-500/20 mb-4" />
          
          <h2 className="text-2xl font-bold text-white leading-tight tracking-tight px-4">
            {q.text}
          </h2>
          
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900 to-transparent" />
        </header>

        <div className="p-8 pt-2 space-y-4">
          <div className="grid gap-3">
            {q.choices.map((choice, idx) => {
              const isCorrect = idx === q.correctAnswerIndex;
              const isMyAnswer = me?.lastAnswerIdx === idx;
              
              let btnStyle = "bg-slate-950/40 border-white/5 text-slate-400";
              if (allAnswered) {
                if (isCorrect) btnStyle = "bg-green-500/20 border-green-500 text-green-400 shadow-lg";
                else if (isMyAnswer) btnStyle = "bg-red-500/20 border-red-500 text-red-400";
              } else if (isMyAnswer) {
                btnStyle = "bg-blue-600 border-blue-400 text-white scale-[0.98]";
              }

              return (
                <button 
                  key={idx}
                  disabled={me?.hasAnswered || me?.hp === 0 || allAnswered}
                  onClick={() => onAnswer(idx)}
                  className={`w-full p-5 rounded-[1.5rem] text-left font-bold text-base border-2 transition-all flex items-center justify-between group active:scale-95 ${btnStyle}`}
                >
                  <span className="flex-1">{choice}</span>
                  {allAnswered && isCorrect && <Check size={24} className="text-green-500" />}
                </button>
              );
            })}
          </div>
        </div>
      </article>

      {/* Control Action */}
      {allAnswered && me?.is_host && (
        <button 
          onClick={onNext}
          className="w-full py-6 bg-orange-600 hover:bg-orange-500 text-white rounded-[2.5rem] font-bungee text-2xl shadow-[0_10px_0_#9a3412] active:translate-y-2 active:shadow-none transition-all flex items-center justify-center gap-4 animate-pop-in"
        >
          {currentRound >= maxRounds ? 'BOOYAH!' : 'PRÓXIMA CALL'} <ChevronRight size={32} strokeWidth={3} />
        </button>
      )}
    </div>
  );
};

export default React.memo(GameplayView);
