
import React from 'react';
import { Heart, Image as ImageIcon, Check, Skull, ChevronRight } from 'lucide-react';
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
    <div className="p-6 space-y-6 animate-fade-up">
      <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
        {gameState.players.map(p => (
          <div key={p.id} className={`shrink-0 bg-white p-3 rounded-2xl shadow-md border-2 transition-all ${p.hasAnswered ? 'border-green-400 scale-95' : 'border-white'}`}>
            <div className="flex items-center gap-3">
              <img src={p.avatar} className="w-8 h-8 rounded-lg object-cover" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold truncate w-12">{p.name}</span>
                <div className="flex gap-0.5">
                  {Array.from({length:5}).map((_,i) => (
                    <Heart key={i} size={8} className={i < Math.ceil(p.hp/20) ? 'fill-red-500 text-red-500' : 'text-slate-200'}/>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-white">
        <div className="h-48 bg-slate-100 relative">
          {q.imageUrl ? (
            <img src={q.imageUrl} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="text-slate-200" size={40}/>
            </div>
          )}
          <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-1 rounded-full font-bungee text-[10px] shadow-lg">
            RODADA {gameState.currentRound}/{gameState.maxRounds}
          </div>
        </div>
        <div className="p-8 space-y-6">
          <h2 className="text-lg font-bold text-slate-800 leading-tight">{q.text}</h2>
          <div className="space-y-3">
            {q.choices.map((c, i) => {
              const isCorrect = i === q.correctAnswerIndex;
              const myAns = me?.lastAnswerIdx === i;
              let style = "bg-slate-50 border-slate-100 text-slate-700";
              
              if (allAnswered) {
                if (isCorrect) style = "bg-green-500 border-green-500 text-white shadow-green-200 shadow-lg";
                else if (myAns) style = "bg-red-500 border-red-500 text-white shadow-red-200 shadow-lg";
              } else if (myAns) {
                style = "bg-blue-600 border-blue-600 text-white scale-95 shadow-inner";
              }
              
              return (
                <button 
                  key={i} 
                  disabled={me?.hasAnswered || me?.hp === 0 || allAnswered} 
                  onClick={() => onAnswer(i)} 
                  className={`w-full p-5 rounded-2xl text-left font-bold text-sm border-2 transition-all flex items-center justify-between ${style}`}
                >
                  {c}
                  {allAnswered && isCorrect && <Check size={18}/>}
                  {allAnswered && !isCorrect && myAns && <Skull size={18}/>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {allAnswered && me?.is_host && (
        <button onClick={onNext} className="w-full py-6 bg-orange-500 text-white rounded-2xl font-bungee text-xl shadow-xl animate-bounce flex items-center justify-center gap-2">
          {gameState.currentRound >= gameState.maxRounds ? 'RESULTADO FINAL' : 'PRÓXIMA RODADA'} <ChevronRight/>
        </button>
      )}
    </div>
  );
}
