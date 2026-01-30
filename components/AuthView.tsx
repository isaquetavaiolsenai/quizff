
import React from 'react';
import { Swords, Zap } from 'lucide-react';
import { User } from '../types.ts';

export default function AuthView({ onGuest }: { onGuest: (u: User) => void }) {
  const handleGuest = () => {
    onGuest({
      id: 'guest_' + Math.random().toString(36).substr(2, 5),
      name: 'GUEST_' + Math.random().toString(36).substr(2, 3).toUpperCase(),
      isGuest: true,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=Squad${Math.random()}`,
      level: 1, xp: 0, stats: { wins: 0, matches: 0, totalScore: 0 }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-600/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-orange-600/10 rounded-full blur-[100px]" />
      
      <div className="text-center space-y-10 animate-pop-in z-10 w-full max-w-xs">
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-[2.2rem] mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.4)] rotate-3 border-4 border-white/20">
            <Swords size={48} className="text-white drop-shadow-lg" />
          </div>
          <Zap className="absolute -top-2 -right-2 text-yellow-400 fill-yellow-400 animate-pulse" size={24} />
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-bungee tracking-tighter leading-none">
            QUIZ <span className="text-blue-500 block mt-2">SQUAD</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">O Desafio Definitivo da IA</p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={handleGuest} 
            className="w-full py-6 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bungee text-xl shadow-[0_10px_0_#1d4ed8] active:shadow-none active:translate-y-2 transition-all"
          >
            INICIAR RUSH
          </button>
          <div className="pt-4 flex items-center justify-center gap-4 text-slate-500">
            <div className="h-px w-8 bg-slate-800" />
            <span className="text-[10px] font-bold uppercase">Ou entre com</span>
            <div className="h-px w-8 bg-slate-800" />
          </div>
          <button className="w-full py-4 bg-slate-900 border border-slate-800 rounded-2xl font-bold text-sm text-slate-300 hover:bg-slate-800 transition-all">
            CONTA GOOGLE
          </button>
        </div>
      </div>
    </div>
  );
}
