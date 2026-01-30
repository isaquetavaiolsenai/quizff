import React from 'react';
import { LogOut, ChevronLeft, Award, Play } from 'lucide-react';
import { User } from '../types.ts';
import { supabase } from '../services/supabaseService.ts';

interface Props {
  user: User;
  onBack: () => void;
}

export default function ProfilePage({ user, onBack }: Props) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="p-6 space-y-8 animate-fade-up">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase">
        <ChevronLeft size={16}/> VOLTAR
      </button>

      <div className="text-center space-y-6">
        <div className="w-32 h-32 rounded-[2.5rem] mx-auto border-4 border-white shadow-2xl overflow-hidden">
          <img src={user.avatar} className="w-full h-full object-cover bg-white" />
        </div>
        <h2 className="text-3xl font-bungee text-white">{user.name}</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass p-6 rounded-3xl text-center space-y-2">
          <Award className="mx-auto text-orange-500" size={24}/>
          <span className="block text-2xl font-bungee text-white">{user.stats.wins}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase">Vitórias</span>
        </div>
        <div className="glass p-6 rounded-3xl text-center space-y-2">
          <Play className="mx-auto text-blue-500" size={24}/>
          <span className="block text-2xl font-bungee text-white">{user.stats.matches}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase">Partidas</span>
        </div>
      </div>

      <button onClick={handleLogout} className="w-full py-4 text-red-500 font-bold text-[10px] uppercase border-2 border-red-900/20 rounded-2xl flex items-center justify-center gap-2 active:bg-red-500/10 transition-all">
        <LogOut size={16}/> SAIR DA CONTA
      </button>
    </div>
  );
}
