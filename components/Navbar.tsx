
import React from 'react';
import { Swords, Trophy, User as UserIcon } from 'lucide-react';

export default function Navbar({ active, onNav }: { active: string, onNav: (n: any) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 p-6 pb-10 z-[1000] max-w-lg mx-auto w-full pointer-events-none">
      <div className="bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] p-2 flex justify-around items-center border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto">
        <button onClick={() => onNav('play')} className={`p-5 rounded-[2rem] transition-all relative ${active === 'play' ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-500/30' : 'text-slate-600 hover:text-slate-400'}`}>
          <Swords size={28} strokeWidth={2.5} />
          {active === 'play' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />}
        </button>
        <button onClick={() => onNav('ranking')} className={`p-5 rounded-[2rem] transition-all relative ${active === 'ranking' ? 'bg-orange-500 text-white scale-110 shadow-lg shadow-orange-500/30' : 'text-slate-600 hover:text-slate-400'}`}>
          <Trophy size={28} strokeWidth={2.5} />
          {active === 'ranking' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />}
        </button>
        <button onClick={() => onNav('profile')} className={`p-5 rounded-[2rem] transition-all relative ${active === 'profile' ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-500/30' : 'text-slate-600 hover:text-slate-400'}`}>
          <UserIcon size={28} strokeWidth={2.5} />
          {active === 'profile' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />}
        </button>
      </div>
    </nav>
  );
}
