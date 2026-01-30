
import React from 'react';
import { Crown } from 'lucide-react';
import { GameState } from '../types';

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
    <div className="flex items-center justify-center p-6 min-h-[80vh]">
      <div className="w-full bg-white rounded-[3rem] p-10 text-center space-y-8 shadow-2xl border-t-[12px] border-blue-600 animate-fade-up">
        <div className="space-y-1">
          <h2 className="text-[10px] font-bold text-blue-600 tracking-[0.2em] uppercase">Código do Squad</h2>
          <h1 className="text-7xl font-bungee tracking-tighter text-slate-900">{gameState.roomCode}</h1>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-50 space-y-2">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">TEMA CONFIGURADO</span>
          {isHost ? (
            <input 
              type="text" 
              value={gameState.customTopic || ''} 
              onChange={e => onUpdateTopic(e.target.value)} 
              placeholder="ALTERAR TEMA AGORA..." 
              className="w-full bg-slate-50 p-3 rounded-xl font-bold text-[10px] text-center outline-none border-2 border-transparent focus:border-blue-200 transition-all" 
            />
          ) : (
            <div className="p-3 bg-blue-50 rounded-xl text-[10px] font-bold text-blue-600 uppercase border border-blue-100 truncate">
              {gameState.customTopic || "FREE FIRE (PADRÃO)"}
            </div>
          )}
        </div>

        <div className="space-y-3 max-h-48 overflow-y-auto hide-scrollbar">
          {gameState.players.map(p => (
            <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-white shadow-sm">
              <div className="flex items-center gap-3">
                <img src={p.avatar} className="w-10 h-10 rounded-lg object-cover" />
                <span className="font-bold text-slate-700 text-sm">{p.name}</span>
              </div>
              {p.is_host && <Crown size={18} className="text-orange-500"/>}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <button 
            onClick={onStart} 
            disabled={!isHost} 
            className={`w-full py-6 rounded-2xl font-bungee text-xl shadow-xl transition-all active:scale-95 ${isHost ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100' : 'bg-slate-100 text-slate-300'}`}
          >
            {isHost ? 'COMEÇAR JOGO' : 'ESPERANDO LÍDER'}
          </button>
          <button onClick={onExit} className="text-red-500 text-[10px] font-bold uppercase tracking-widest hover:underline">
            SAIR DO SQUAD
          </button>
        </div>
      </div>
    </div>
  );
}
