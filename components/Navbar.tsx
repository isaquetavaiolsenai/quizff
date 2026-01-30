
import React from 'react';
import { Swords, Trophy, User as UserIcon } from 'lucide-react';

interface Props {
  active: 'play' | 'ranking' | 'profile';
  onNav: (nav: 'play' | 'ranking' | 'profile') => void;
}

export default function Navbar({ active, onNav }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 p-6 pb-10 z-[1000] max-w-lg mx-auto w-full">
      <div className="bg-slate-900 rounded-[2.5rem] p-2 flex justify-around items-center shadow-2xl border border-white/10 backdrop-blur-md">
        <button onClick={() => onNav('play')} className={`p-4 rounded-2xl transition-all ${active === 'play' ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'text-slate-500'}`}>
          <Swords size={24}/>
        </button>
        <button onClick={() => onNav('ranking')} className={`p-4 rounded-2xl transition-all ${active === 'ranking' ? 'bg-orange-500 text-white scale-110 shadow-lg' : 'text-slate-500'}`}>
          <Trophy size={24}/>
        </button>
        <button onClick={() => onNav('profile')} className={`p-4 rounded-2xl transition-all ${active === 'profile' ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'text-slate-500'}`}>
          <UserIcon size={24}/>
        </button>
      </div>
    </nav>
  );
}
