
import React from 'react';
import { User as UserIcon, LogOut, ChevronLeft, Target, Award, Play } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../services/supabaseService';

interface Props {
  user: User;
  onBack: () => void;
}

export default function ProfileView({ user, onBack }: Props) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="p-6 space-y-8 animate-fade-up">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
        <ChevronLeft size={16}/> VOLTAR
      </button>

      <div className="text-center space-y-6">
        <div className="w-32 h-32 rounded-[2.5rem] mx-auto border-4 border-white shadow-2xl overflow-hidden bg-white">
          <img src={user.avatar} className="w-full h-full object-cover" />
        </div>
        <h2 className="text-3xl font-bungee text-slate-800">{user.name}</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-white text-center space-y-2">
          <Award className="mx-auto text-orange-500" size={24}/>
          <span className="block text-2xl font-bungee text-slate-800">{user.stats.wins}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase">Vitórias</span>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-white text-center space-y-2">
          <Play className="mx-auto text-blue-500" size={24}/>
          <span className="block text-2xl font-bungee text-slate-800">{user.stats.matches}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase">Partidas</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-xl border border-white space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score Total</span>
          <span className="font-bungee text-blue-600 text-xl">{user.stats.totalScore}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nível</span>
          <span className="font-bungee text-slate-800 text-xl">LVL {user.level}</span>
        </div>
      </div>

      <button 
        onClick={handleLogout} 
        className="w-full py-4 text-red-500 font-bold text-[10px] uppercase tracking-widest border-2 border-red-50 rounded-2xl flex items-center justify-center gap-2 active:bg-red-50 transition-all"
      >
        <LogOut size={16}/> SAIR DA CONTA
      </button>
    </div>
  );
}
