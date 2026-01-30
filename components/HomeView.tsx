
import React, { useState } from 'react';
import { Settings2, Plus, Terminal, ChevronRight, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface Props {
  user: User;
  onCreate: (theme: string, rounds: number) => void;
  onJoin: (code: string) => void;
  onProfileClick: () => void;
}

export default function HomeView({ user, onCreate, onJoin, onProfileClick }: Props) {
  const [theme, setTheme] = useState('');
  const [rounds, setRounds] = useState(5);
  const [code, setCode] = useState('');

  return (
    <div className="flex-1 flex flex-col space-y-6">
      <header className="p-6 flex justify-between items-center bg-white shadow-sm">
        <div className="flex items-center gap-3 bg-slate-50 p-2 pr-6 rounded-full border border-slate-100">
          <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-blue-50" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400">MEMBRO</span>
            <span className="font-bold text-sm text-slate-800">{user.name}</span>
          </div>
        </div>
        <button onClick={onProfileClick} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md text-slate-400">
          <UserIcon size={20}/>
        </button>
      </header>

      <div className="px-6 space-y-6 animate-fade-up">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-6 border border-white">
          <h3 className="text-sm font-bungee text-slate-400 flex items-center gap-2">
            <Settings2 size={18}/> NOVO SQUAD
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Tema (Prompt)</span>
              <textarea 
                value={theme} 
                onChange={e => setTheme(e.target.value)} 
                placeholder="Ex: Naruto, Futebol, Biologia, Free Fire..." 
                className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-sm focus:border-blue-600 outline-none h-24 transition-all" 
              />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Rodadas</span>
              <div className="flex gap-2">
                {[5, 10, 15].map(n => (
                  <button key={n} onClick={() => setRounds(n)} className={`flex-1 py-3 rounded-xl font-bold transition-all ${rounds === n ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => onCreate(theme, rounds)} className="w-full py-6 bg-slate-900 text-white rounded-[1.8rem] font-bungee text-xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
            CRIAR SALA <Plus/>
          </button>
        </div>

        <div className="bg-white rounded-3xl p-3 shadow-xl flex items-center border border-white">
          <Terminal className="text-slate-300 ml-4" size={20}/>
          <input 
            value={code} 
            onChange={e => setCode(e.target.value.toUpperCase())} 
            maxLength={4} 
            placeholder="CÓDIGO DA SALA" 
            className="flex-1 px-4 font-bungee text-2xl outline-none text-blue-600" 
          />
          <button onClick={() => onJoin(code)} className="w-14 h-14 bg-blue-600 rounded-2xl text-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
            <ChevronRight size={28}/>
          </button>
        </div>
      </div>
    </div>
  );
}
