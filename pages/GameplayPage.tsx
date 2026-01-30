import React, { useMemo } from 'react';
import { Skull, Check, ChevronRight, Zap, Target } from 'lucide-react';
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
      <p className="mt-4 font-bungee">SINCRONIZANDO...</p>
    </div>
  );

  return (
    <div className="p-6 space-y-8 animate-fade-in max-w-lg mx-auto">
      <section className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
        {players.map(p => (
          <div key={p.id} className={`shrink-0 glass p-4 rounded-[2rem] border-2 ${p.hasAnswered ? 'border-blue-500' : 'border-transparent'}`}>
            <div className="relative">
              <img src={p.avatar} className="w-12 h-12 rounded-2xl object-cover bg-slate-800" />
              {p.hp <= 0 && <div className="absolute inset-0 bg-red-900/80 rounded-2xl flex items-center justify-center"><Skull size={20} className="text-white" /></div>}
            </div>
          </div>
        ))}
      </section>

      <article className="bg-slate-900/90 rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl">
        <header className="h-64 bg-slate-800 relative">
          {q.imageUrl ? <img src={q.imageUrl} className="w-full h-full object-cover opacity-60" /> : <div className="w-full h-full flex items-center justify-center opacity-10"><Target size={120} /></div>}
          <div className="absolute top-6 left-6 bg-blue-600 px-5 py-2 rounded-full font-bungee text-[11px] text-white shadow-xl">
            ROUND {currentRound}/{maxRounds}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
        </header>

        <div className="p-8 space-y-8">
          <h2 className="text-2xl font-bold text-white leading-tight">{q.text}</h2>
          <div className="grid gap-4">
            {q.choices.map((choice, idx) => {
              const isCorrect = idx === q.correctAnswerIndex;
              const isMyAnswer = me?.lastAnswerIdx === idx;
              let style = "bg-slate-950/40 border-white/5 text-slate-400";
              if (allAnswered) {
                if (isCorrect) style = "bg-green-500/20 border-green-500 text-green-400 shadow-lg";
                else if (isMyAnswer) style = "bg-red-500/20 border-red-500 text-red-400";
              } else if (isMyAnswer) style = "bg-blue-600 border-blue-400 text-white";

              return (
                <button 
                  key={idx}
                  disabled={me?.hasAnswered || me?.hp === 0 || allAnswered}
                  onClick={() => onAnswer(idx)}
                  className={`w-full p-6 rounded-3xl text-left font-bold border-2 transition-all flex items-center justify-between ${style}`}
                >
                  <span>{choice}</span>
                  {allAnswered && isCorrect && <Check size={24} />}
                </button>
              );
            })}
          </div>
        </div>
      </article>

      {allAnswered && me?.is_host && (
        <button onClick={onNext} className="w-full py-6 bg-orange-500 text-white rounded-[2.5rem] font-bungee text-2xl shadow-[0_10px_0_#c2410c] active:translate-y-2 active:shadow-none transition-all flex items-center justify-center gap-4">
          PRÓXIMA <ChevronRight size={32} strokeWidth={3} />
        </button>
      )}
    </div>
  );
};

export default GameplayPage;