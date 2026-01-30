
import React from 'react';
import { Player } from '../types';

interface Props {
  players: Player[];
  onRestart: () => void;
}

export default function GameOverView({ players, onRestart }: Props) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[80vh] space-y-8 text-center animate-fade-up">
      <h1 className="text-7xl font-bungee text-orange-500 animate-bounce drop-shadow-2xl">BOOYAH!</h1>
      <div className="w-full bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-4 border border-white">
        {sorted.map((p, i) => (
          <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${i === 0 ? 'bg-orange-50 border-2 border-orange-200' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-3">
              <span className="font-bungee text-xl text-slate-300 w-6">{i + 1}</span>
              <img src={p.avatar} className="w-10 h-10 rounded-lg object-cover" />
              <span className="font-bold text-slate-800">{p.name}</span>
            </div>
            <span className="font-bungee text-blue-600 text-xl">{p.score}</span>
          </div>
        ))}
      </div>
      <button onClick={onRestart} className="w-full py-6 bg-slate-900 text-white rounded-2xl font-bungee text-xl shadow-xl hover:bg-slate-800 active:scale-95 transition-all">
        VOLTAR AO INÍCIO
      </button>
    </div>
  );
}
