
import React, { useState } from 'react';
import { Plus, Terminal, ChevronRight, User as UserIcon, Settings2, Sparkles } from 'lucide-react';
import { User } from '../types.ts';

interface Props {
  user: User;
  onCreate: (t: string, r: number) => void;
  onJoin: (c: string) => void;
  onProfileClick: () => void;
}

export default function HomeView({ user, onCreate, onJoin, onProfileClick }: Props) {
  const [theme, setTheme] = useState('');
  const [rounds, setRounds] = useState(5);
  const [code, setCode] = useState('');

  return (
    <div className="flex-1 flex flex-col space-y-6 pt-4">
      <header className="px-6 flex justify-between items-center">
        <div className="flex items-center gap-3 bg-slate-900/50 p-2 pr-6 rounded-full border border-white/5 neo-glow">
          <img src={user.avatar} className="w-12 h-12 rounded-full border-2 border-blue-500/50 object-cover" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-blue-500/80 uppercase tracking-widest">SQUAD MEMBER</span>
            <span className="font-bold text-base text-white truncate max-w-[100px]">{user.name}</span>
          </div>
        </div>
        <button onClick={onProfileClick} className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/5 hover:bg-slate-800 transition-all">
          <UserIcon size={20} className="text-slate-400" />
        </button>
      </header>

      <div className="px-6 space-y-6 animate-pop-in">
        <div className="bg-slate-900/80 rounded-[2.5rem] p-8 space-y-6 border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
            <Sparkles size={40} className="text-blue-500" />
          </div>
          
          <h3 className="text-xs font-bungee text-slate-400 flex items-center gap-2">
            <Settings2 size={16} className="text-blue-500" /> CONFIGURAR PARTIDA
          </h3>
          
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tema Personalizado (IA)</label>
              <textarea 
                value={theme} 
                onChange={e => setTheme(e.target.value)} 
                placeholder="Ex: Curiosidades sobre Free Fire, Harry Potter, Anime, Futebol..." 
                className="w-full bg-slate-950 border-2 border-slate-800 p-4 rounded-2xl font-bold text-sm text-white focus:border-blue-600 outline-none h-28 transition-all resize-none" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Quantidade de Rodadas</label>
              <div className="flex gap-3">
                {[5, 10, 15].map(n => (
                  <button key={n} onClick={() => setRounds(n)} className={`flex-1 py-4 rounded-2xl font-bungee text-sm transition-all ${rounds === n ? 'bg-blue-600 text-white shadow-[0_4px_0_#1d4ed8]' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={() => onCreate(theme, rounds)} className="w-full py-6 bg-white text-slate-950 rounded-[1.8rem] font-bungee text-xl shadow-[0_8px_0_#cbd5e1] active:shadow-none active:translate-y-2 transition-all flex items-center justify-center gap-2">
            CRIAR SQUAD <Plus size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="relative group">
           <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
           <div className="bg-slate-900 rounded-3xl p-2 flex items-center border border-white/5 relative">
              <Terminal className="text-slate-600 ml-4 shrink-0" size={24} />
              <input 
                value={code} 
                onChange={e => setCode(e.target.value.toUpperCase())} 
                maxLength={4} 
                placeholder="CÓDIGO" 
                className="flex-1 px-4 font-bungee text-3xl outline-none bg-transparent text-blue-400 placeholder:text-slate-800" 
              />
              <button onClick={() => onJoin(code)} className="w-14 h-14 bg-blue-600 rounded-2xl text-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
                <ChevronRight size={32} strokeWidth={3} />
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
