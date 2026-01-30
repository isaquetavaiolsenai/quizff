
import React from 'react';
import { Heart, Image as ImageIcon, Check, Skull, ChevronRight, Zap } from 'lucide-react';
import { GameState } from '../types.ts';

interface Props {
  gameState: GameState;
  userId: string;
  onAnswer: (idx: number) => void;
  onNext: () => void;
}

export default function GameplayView({ gameState, userId, onAnswer, onNext }: Props) {
  const q = gameState.currentQuestion;
  const me = gameState.players.find(p => p.id === userId);
  const allAnswered = gameState.players.every(p => p.hp <= 0 || p.hasAnswered);

  if (!q) return null;

  return (
    <div className="p-6 space-y-6 animate-pop-in">
      {/* Barra de Jogadores (Squad) */}
      <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
        {gameState.players.map(p => (
          <div key={p.id} className={`shrink-0 glass-panel p-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${p.hasAnswered ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'border-white/5'}`}>
            <div className="relative">
              <img src={p.avatar} className="w-10 h-10 rounded-xl object-cover" />
              {p.hp <= 0 && <div className="absolute inset-0 bg-red-900/60 rounded-xl flex items-center justify-center"><Skull size={16} className="text-white"/></div>}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-white truncate w-16 uppercase">{p.name}</span>
              <div className="flex gap-0.5">
                {Array.from({length:5}).map((_,i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < Math.ceil(p.hp/20) ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'bg-slate-800'}`} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Card da Pergunta */}
      <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
        <div className="h-56 bg-slate-800 relative group">
          {q.imageUrl ? (
            <img src={q.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Zap className="text-blue-500/20 animate-pulse" size={60}/>
            </div>
          )}
          <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-1.5 rounded-full font-bungee text-[10px] shadow-lg">
            RODADA {gameState.currentRound}/{gameState.maxRounds}
          </div>
        </div>

        <div className="p-8 space-y-6">
          <h2 className="text-xl font-bold text-white leading-snug drop-shadow-sm">
            {q.text}
          </h2>
          
          <div className="grid gap-3">
            {q.choices.map((c, i) => {
              const isCorrect = i === q.correctAnswerIndex;
              const myAns = me?.lastAnswerIdx === i;
              
              let style = "bg-slate-950/50 border-white/5 text-slate-400";
              if (allAnswered) {
                if (isCorrect) style = "bg-green-500 text-white border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]";
                else if (myAns) style = "bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]";
              } else if (myAns) {
                style = "bg-blue-600 text-white border-blue-400 scale-95 shadow-inner";
              }
              
              return (
                <button 
                  key={i} 
                  disabled={me?.hasAnswered || me?.hp === 0 || allAnswered} 
                  onClick={() => onAnswer(i)} 
                  className={`w-full p-5 rounded-2xl text-left font-bold text-sm border-2 transition-all flex items-center justify-between group active:scale-95 ${style}`}
                >
                  <span className="flex-1">{c}</span>
                  {allAnswered && isCorrect && <Check size={20} className="text-white" strokeWidth={3} />}
                  {allAnswered && !isCorrect && myAns && <Skull size={20} className="text-white" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {allAnswered && me?.is_host && (
        <button 
          onClick={onNext} 
          className="w-full py-6 bg-orange-500 text-white rounded-[2rem] font-bungee text-2xl shadow-[0_10px_0_#c2410c] active:shadow-none active:translate-y-2 transition-all flex items-center justify-center gap-3 animate-pulse"
        >
          {gameState.currentRound >= gameState.maxRounds ? 'VER BOOYAH!' : 'PRÓXIMO DROP'} <ChevronRight size={28} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}
