
import React from 'react';
import { Loader2, Zap } from 'lucide-react';

export default function LoadingOverlay({ message }: { message: string }) {
  const tips = [
    "Dica: O 'Capa' é essencial para vencer no Squad!",
    "Dica: A IA está gerando imagens exclusivas para sua partida.",
    "Dica: Use gelo rápido para se proteger enquanto pensa!",
    "Dica: Temas criativos geram perguntas mais difíceis.",
    "Dica: Squad unido nunca é batido!"
  ];
  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  return (
    <div className="fixed inset-0 bg-[#0A0F1E]/95 z-[9999] flex flex-col items-center justify-center text-white backdrop-blur-xl p-10 text-center animate-pop-in">
      <div className="relative mb-10">
        <Loader2 className="animate-spin text-blue-500" size={80} strokeWidth={3} />
        <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-pulse" size={30} />
      </div>
      
      <h2 className="text-3xl font-bungee tracking-tight mb-6">{message}</h2>
      
      <div className="bg-blue-600/10 p-6 rounded-[2rem] border border-blue-500/20 max-w-xs relative">
        <div className="absolute -top-3 left-6 bg-blue-600 text-[8px] font-bold px-3 py-1 rounded-full uppercase">Load Tip</div>
        <p className="text-blue-200/80 italic font-medium text-sm leading-relaxed">"{randomTip}"</p>
      </div>
    </div>
  );
}
