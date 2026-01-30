
import React, { useEffect, useState } from 'react';
import { Trophy, Crown, Loader2 } from 'lucide-react';
import { fetchGlobalRanking } from '../services/supabaseService.ts';

export default function RankingView() {
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalRanking().then(res => {
      setRanking(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 space-y-6 animate-pop-in">
      <div className="text-center space-y-2 mb-4">
        <Trophy className="mx-auto text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.4)]" size={48}/>
        <h2 className="text-3xl font-bungee text-white">HALL DA FAMA</h2>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Os Melhores do Squad</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40}/></div>
      ) : (
        <div className="space-y-4 pb-20">
          {ranking.map((p, i) => (
            <div key={p.id} className={`flex items-center justify-between p-5 bg-slate-900/50 rounded-[2rem] border-2 transition-all ${i === 0 ? 'border-orange-500 scale-105 neo-glow bg-slate-900' : 'border-white/5'}`}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`} className="w-14 h-14 rounded-2xl object-cover border-2 border-white/10" />
                  {i < 3 && (
                    <div className={`absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg ${i === 0 ? 'bg-orange-500' : i === 1 ? 'bg-slate-400' : 'bg-amber-700'}`}>
                      {i + 1}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-white text-sm truncate w-24">
                    {p.name} {i === 0 && <Crown size={14} className="inline text-orange-500 ml-1"/>}
                  </span>
                  <span className="text-[9px] font-bold text-blue-500 uppercase">{p.wins || 0} Vitórias</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-500 uppercase">Pontos</p>
                <span className="font-bungee text-xl text-blue-400">{p.total_score || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
