
import React, { useState } from 'react';
import { Plus, Terminal, ChevronRight, User as UserIcon, Sparkles, SlidersHorizontal } from 'lucide-react';
import { User } from '../types.ts';

interface HomeViewProps {
  user: User;
  onCreate: (theme: string, rounds: number) => void;
  onJoin: (code: string) => void;
  onProfileClick: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({ user, onCreate, onJoin, onProfileClick }) => {
  const [theme, setTheme] = useState('');
  const [rounds, setRounds] = useState(5);
  const [code, setCode] = useState('');

  return (
    <div className="flex-1 flex flex-col space-y-8 pt-8">
      {/* User Header */}
      <header className="px-6 flex justify-between items-center">
        <button 
          onClick={onProfileClick}
          className="flex items-center gap-4 glass p-2 pr-8 rounded-full border border-white/10 hover:bg-white/5 transition-all text-left"
        >
          <img src={user.avatar} alt="Avatar" className="w-14 h-14 rounded-full border-2 border-blue-500 p-0.5 object-cover" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">SQUAD LEADER</span>
            <span className="font-bold text-lg text-white leading-tight truncate max-w-[120px]">{user.name}</span>
          </div>
        </button>
        <div className="bg-slate-900/50 p-4 rounded-3xl border border-white/5">
          <Sparkles className="text-yellow-500 animate-pulse" size={24} />
        </div>
      </header>

      <section className="px-6 space-y-8 animate-slide-up">
        {/* Create Squad Panel */}
        <div className="bg-slate-900/60 rounded-[3rem] p-10 space-y-8 border border-white/5 shadow-2xl relative overflow-hidden group">
          <header className="flex items-center justify-between">
            <h3 className="text-xs font-bungee text-slate-500 flex items-center gap-3">
              <SlidersHorizontal size={18} className="text-blue-500" /> NOVA MISSÃO
            </h3>
            <span className="bg-blue-600/10 text-blue-500 text-[9px] font-bold px-3 py-1 rounded-full border border-blue-500/20">IA ENGINE</span>
          </header>

          <div className="space-y-6">
            <div className="space-y-3">
              <label htmlFor="theme-input" className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Tema do Quiz</label>
              <textarea 
                id="theme-input"
                value={theme}
                onChange={e => setTheme(e.target.value)}
                placeholder="Ex: Curiosidades de One Piece, Copa do Mundo, História do Brasil..."
                className="w-full bg-slate-950 border-2 border-slate-800 p-6 rounded-[2rem] font-medium text-base text-white focus:border-blue-600 outline-none h-32 transition-all resize-none placeholder:text-slate-800"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Duração da Partida</label>
              <div className="flex gap-4">
                {[5, 10, 15].map(n => (
                  <button 
                    key={n} 
                    onClick={() => setRounds(n)}
                    className={`flex-1 py-5 rounded-3xl font-bungee text-sm transition-all ${rounds === n ? 'bg-blue-600 text-white shadow-xl scale-105' : 'bg-slate-950 text-slate-500 border border-slate-800 hover:border-slate-700'}`}
                  >
                    {n} ROUNDS
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button 
            onClick={() => onCreate(theme, rounds)}
            className="w-full py-6 bg-white hover:bg-slate-100 text-slate-950 rounded-[2.5rem] font-bungee text-2xl shadow-[0_10px_0_#cbd5e1] active:shadow-none active:translate-y-2 transition-all flex items-center justify-center gap-4"
          >
            CRIAR SALA <Plus size={28} strokeWidth={3} />
          </button>
        </div>

        {/* Join Section */}
        <div className="relative group">
           <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-[2.5rem] blur opacity-10 group-hover:opacity-25 transition duration-500"></div>
           <div className="bg-slate-900 rounded-[2.5rem] p-3 flex items-center border border-white/5 relative h-24">
              <Terminal className="text-slate-700 ml-6 shrink-0" size={28} />
              <input 
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                maxLength={4}
                placeholder="DIGITE O CÓDIGO"
                className="flex-1 px-6 font-bungee text-3xl outline-none bg-transparent text-blue-500 placeholder:text-slate-800 tracking-[0.2em]"
              />
              <button 
                onClick={() => onJoin(code)}
                aria-label="Entrar na sala"
                className="w-16 h-16 bg-blue-600 hover:bg-blue-500 rounded-3xl text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
              >
                <ChevronRight size={36} strokeWidth={3} />
              </button>
           </div>
        </div>
      </section>
    </div>
  );
};

export default React.memo(HomeView);
