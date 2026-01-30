
import React from 'react';
import { Trophy, ChevronRight, RotateCcw } from 'lucide-react';
import { Player } from '../types.ts';

interface Props {
  players: Player[];
  onRestart: () => void;
}

export default function GameOverView({ players, onRestart }: Props) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-screen space-y-8 text-center animate-pop-in bg-[#0A0F1E]">
      <div className="relative">
         <h1 className="text-7xl font-bungee text-orange-500 animate-bounce drop-shadow-[0_0_20px_rgba(249,115,22,0.6)]">BOOYAH!</h1>
         <div className="absolute -top-4 -right-4 bg-white text-slate-900 px-3 py-1 rounded-full font-bungee text-[10px] rotate-12">VICTORY</div>
      </div>

      <div className="w-full bg-slate-900/50 rounded-[3rem] p-8 border border-white/10 space-y-4 neo-glow">
        {sorted.map((p, i) => (
          <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${i === 0 ? 'bg-orange-500/10 border-2 border-orange-500/50' : 'bg-slate-950/50 border border-white/5'}`}>
            <div className="flex items-center gap-3">
              <span className={`font-bungee text-xl w-6 ${i === 0 ? 'text-orange-500' : 'text-slate-700'}`}>{i + 1}</span>
              <img src={p.avatar} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
              <span className="font-bold text-white text-sm">{p.name}</span>
            </div>
            <div className="text-right">
               <span className="font-bungee text-blue-500 text-xl">{p.score}</span>
               <span className="block text-[8px] font-bold text-slate-600 uppercase">PTS</span>
            </div>
          </div>
        ))}
      </div>

      <div className="w-full space-y-4">
        <button 
          onClick={onRestart} 
          className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-bungee text-xl shadow-[0_8px_0_#1d4ed8] active:shadow-none active:translate-y-2 transition-all flex items-center justify-center gap-3"
        >
          <RotateCcw size={24} strokeWidth={3} /> NOVO RUSH
        </button>
      </div>
    </div>
  );
}
