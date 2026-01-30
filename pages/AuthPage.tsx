import React from 'react';
import { Swords, Zap, Chrome } from 'lucide-react';
import { User } from '../types.ts';

interface AuthPageProps {
  onGuest: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onGuest }) => {
  const handleGuestSignIn = () => {
    const guestUser: User = {
      id: `guest_${Math.random().toString(36).substring(2, 7)}`,
      name: `RUSH_${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      isGuest: true,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=Squad${Math.random()}`,
      level: 1,
      xp: 0,
      stats: { wins: 0, matches: 0, totalScore: 0 }
    };
    onGuest(guestUser);
  };

  return (
    <main className="min-h-screen bg-[#0A0F1E] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute top-[-15%] left-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-15%] right-[-10%] w-96 h-96 bg-orange-600/10 rounded-full blur-[120px]" />

      <section className="w-full max-w-sm z-10 text-center space-y-12 animate-slide-up">
        <header className="relative inline-block">
          <div className="w-28 h-28 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-[2.5rem] mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/40 border-4 border-white/10 transform rotate-6">
            <Swords size={56} className="text-white drop-shadow-md" />
          </div>
          <Zap className="absolute -top-3 -right-3 text-yellow-400 fill-yellow-400 animate-pulse" size={32} />
        </header>

        <div className="space-y-3">
          <h1 className="text-7xl font-bungee tracking-tighter leading-[0.9] text-white">
            QUIZ <span className="text-blue-500 block">SQUAD</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em]">Battle Royale de Inteligência</p>
        </div>

        <nav className="flex flex-col gap-4">
          <button 
            onClick={handleGuestSignIn}
            className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] font-bungee text-2xl shadow-[0_10px_0_#1d4ed8] active:shadow-none active:translate-y-2 transition-all"
          >
            SOLO RUSH
          </button>
          
          <div className="flex items-center gap-4 py-2">
            <div className="h-[1px] flex-1 bg-slate-800" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Acesso Rápido</span>
            <div className="h-[1px] flex-1 bg-slate-800" />
          </div>

          <button className="w-full py-5 glass hover:bg-white/5 rounded-[2rem] font-bold text-sm text-slate-300 flex items-center justify-center gap-3 transition-colors border border-white/5">
            <Chrome size={20} /> ENTRAR COM GOOGLE
          </button>
        </nav>
      </section>
    </main>
  );
};

export default AuthPage;