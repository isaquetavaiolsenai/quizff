
import React from 'react';
import { Crown, User as UserIcon, LogOut, Play, Sparkles } from 'lucide-react';
import { GameState } from '../types.ts';

interface Props {
  gameState: GameState;
  userId: string;
  onStart: () => void;
  onExit: () => void;
  onUpdateTopic: (topic: string) => void;
}

export default function LobbyView({ gameState, userId, onStart, onExit, onUpdateTopic }: Props) {
  const me = gameState.players.find(p => p.id === userId);
  const isHost = me?.is_host ?? false;

  return (
    <div className="flex items-center justify-center p-6 min-h-[85vh]">
      <div className="w-full bg-slate-900/80 rounded-[3rem] p-10 text-center space-y-8 shadow-2xl border-t-[12px] border-blue-600 animate-pop-in relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <Sparkles size={100} className="text-blue-500" />
        </div>

        <div className="space-y-1 relative z-10">
          <h2 className="text-[10px] font-bold text-blue-500 tracking-[0.4em] uppercase">CÓDIGO DO SQUAD</h2>
          <h1 className="text-7xl font-bungee tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{gameState.roomCode}</h1>
        </div>

        <div className="mt-4 pt-6 border-t border-white/5 space-y-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">OBJETIVO DA MISSÃO</span>
          {isHost ? (
            <input 
              type="text" 
              value={gameState.customTopic || ''} 
              onChange={e => onUpdateTopic(e.target.value)} 
              placeholder="DIGITE O TEMA AQUI..." 
              className="w-full bg-slate-950 p-4 rounded-2xl font-bold text-sm text-center text-blue-400 outline-none border-2 border-slate-800 focus:border-blue-600 transition-all placeholder:text-slate-800" 
            />
          ) : (
            <div className="p-4 bg-blue-600/10 rounded-2xl text-xs font-bold text-blue-400 uppercase border border-blue-500/20 truncate">
              {gameState.customTopic || "TEMA ALEATÓRIO (IA)"}
            </div>
          )}
        </div>

        <div className="space-y-3 max-h-56 overflow-y-auto hide-scrollbar pt-2">
          {gameState.players.map(p => (
            <div key={p.id} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5 group hover:bg-slate-950 transition-all">
              <div className="flex items-center gap-4">
                <img src={p.avatar} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                <span className="font-bold text-white text-sm">{p.name}</span>
              </div>
              {p.is_host && (
                <div className="flex items-center gap-1 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/30">
                  <Crown size={14} className="text-orange-500"/>
                  <span className="text-[8px] font-bold text-orange-500">LÍDER</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-4 pt-4">
          <button 
            onClick={onStart} 
            disabled={!isHost} 
            className={`w-full py-6 rounded-[2rem] font-bungee text-2xl shadow-xl transition-all active:translate-y-2 active:shadow-none flex items-center justify-center gap-3 ${isHost ? 'bg-white text-slate-950 shadow-[0_8px_0_#cbd5e1] hover:bg-slate-100' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
          >
            {isHost ? 'INICIAR PARTIDA' : 'ESPERANDO LÍDER'} <Play fill="currentColor" size={24} />
          </button>
          <button onClick={onExit} className="text-slate-600 text-[10px] font-bold uppercase tracking-widest hover:text-red-500 transition-colors">
            ABANDONAR SQUAD
          </button>
        </div>
      </div>
    </div>
  );
}
