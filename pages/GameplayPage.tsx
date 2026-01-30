
import React, { useMemo } from 'react';
// Added 'Target' to imports to fix "Cannot find name 'Target'" error
import { Skull, Check, ChevronRight, Zap, HelpCircle, Trophy, Target } from 'lucide-react';
import { GameState } from '../types.ts';

interface Props {
  gameState: GameState;
  userId: string;
  onAnswer: (idx: number) => void;
  onNext: () => void;
}

const GameplayPage: React.FC<Props> = ({ gameState, userId, onAnswer, onNext }) => {
  const { currentQuestion: q, players, currentRound, maxRounds } = gameState;
  const me = useMemo(() => players.find(p => p.id === userId), [players, userId]);
  const allAnswered = useMemo(() => players.every(p => p.hp <= 0 || p.hasAnswered), [players]);

  if (!q) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 animate-pulse">
      <Zap size={48} />
      <p className="mt-4 font-bungee">SINCRONIZANDO CALL...</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-lg mx-auto pb-32">
      {/* Squad Status Mini */}
      <section className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
        {players.map(p => (
          <div key={p.id} className={`shrink-0 glass p-2 rounded-2xl border-2 transition-all duration-500 ${p.hasAnswered ? 'border-blue-500 shadow-lg shadow-blue-500/20 scale-105' : 'border-white/5 opacity-60'}`}>
            <div className="relative">
              <img src={p.avatar} className="w-10 h-10 rounded-xl object-cover bg-slate-800" alt={p.name} />
              {p.hp <= 0 && <div className="absolute inset-0 bg-red-900/80 rounded-xl flex items-center justify-center"><Skull size={16} className="text-white" /></div>}
              {p.hasAnswered && !allAnswered && <div className="absolute -top-1 -right-1 bg-blue-500 w-3 h-3 rounded-full border-2 border-[#0A0F1E]" />}
            </div>
          </div>
        ))}
      </section>

      <article className="bg-slate-900/90 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl animate-slide-up">
        {/* Question Header - High Impact Text */}
        <header className="min-h-[18rem] bg-gradient-to-br from-blue-600/20 via-slate-900 to-slate-900 p-10 flex flex-col items-center justify-center relative text-center border-b border-white/5">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 px-5 py-1.5 rounded-full font-bungee text-[10px] uppercase tracking-widest backdrop-blur-md">
            <Target size={12} /> ROUND {currentRound}/{maxRounds}
          </div>
          
          <div className="mb-6 opacity-20">
            <HelpCircle size={64} className="text-blue-500" />
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            {q.text}
          </h2>
          
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        </header>

        <div className="p-8 space-y-4">
          <div className="grid gap-4">
            {q.choices.map((choice, idx) => {
              const isCorrect = idx === q.correctAnswerIndex;
              const isMyAnswer = me?.lastAnswerIdx === idx;
              
              let style = "bg-slate-950/40 border-white/5 text-slate-300 hover:border-blue-500/30 hover:bg-slate-950/60 transition-all cursor-pointer";
              
              if (allAnswered) {
                if (isCorrect) style = "bg-green-500/20 border-green-500/60 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.15)]";
                else if (isMyAnswer) style = "bg-red-500/20 border-red-500/60 text-red-400";
                else style = "bg-slate-950/20 border-white/5 text-slate-600 grayscale opacity-50";
              } else if (isMyAnswer) {
                style = "bg-blue-600 border-blue-400 text-white shadow-2xl shadow-blue-600/30 scale-[0.98] ring-4 ring-blue-500/20";
              }

              return (
                <button 
                  key={idx}
                  disabled={me?.hasAnswered || me?.hp === 0 || allAnswered}
                  onClick={() => onAnswer(idx)}
                  className={`w-full p-6 rounded-[1.8rem] text-left font-bold text-base border-2 flex items-center justify-between active:scale-95 group ${style}`}
                >
                  <span className="flex-1 pr-4">{choice}</span>
                  <div className="shrink-0 flex items-center justify-center">
                    {allAnswered && isCorrect && <Check size={24} className="text-green-500 drop-shadow-md" strokeWidth={3} />}
                    {allAnswered && !isCorrect && isMyAnswer && <Skull size={24} className="text-red-500 drop-shadow-md" strokeWidth={3} />}
                    {!allAnswered && isMyAnswer && <Zap size={20} className="text-white animate-pulse" fill="currentColor" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </article>

      {allAnswered && me?.is_host && (
        <button 
          onClick={onNext} 
          className="w-full py-6 bg-orange-600 hover:bg-orange-500 text-white rounded-[2.5rem] font-bungee text-2xl shadow-[0_10px_0_#9a3412] active:translate-y-2 active:shadow-none transition-all flex items-center justify-center gap-4 animate-pop-in mt-4"
        >
          {currentRound >= maxRounds ? (
            <>VER RESULTADO <Trophy size={28} /></>
          ) : (
            <>PRÓXIMO ROUND <ChevronRight size={28} strokeWidth={3} /></>
          )}
        </button>
      )}
    </div>
  );
};

export default GameplayPage;
