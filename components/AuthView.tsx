
import React from 'react';
import { Swords } from 'lucide-react';
import { User } from '../types';

interface Props {
  onGuest: (user: User) => void;
}

export default function AuthView({ onGuest }: Props) {
  const handleGuest = () => {
    onGuest({
      id: 'guest_' + Math.random().toString(36).substr(2, 5),
      name: 'GUEST_' + Math.random().toString(36).substr(2, 3).toUpperCase(),
      isGuest: true,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=FreeFire',
      level: 1, xp: 0, stats: { wins: 0, matches: 0, totalScore: 0 }
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white font-inter">
       <div className="text-center space-y-8 max-w-sm w-full animate-fade-up">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl rotate-6 border-4 border-white">
            <Swords size={40}/>
          </div>
          <h1 className="text-5xl font-bungee">QUIZ <span className="text-blue-500">SQUAD</span></h1>
          <div className="bg-white/10 p-8 rounded-[2rem] border border-white/5 backdrop-blur-md space-y-4">
            <button onClick={handleGuest} className="w-full py-5 bg-blue-600 rounded-2xl font-bold text-lg shadow-xl hover:bg-blue-500 active:scale-95 transition-all">
              JOGAR AGORA
            </button>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Entre para competir no ranking mundial
            </p>
          </div>
       </div>
    </div>
  );
}
