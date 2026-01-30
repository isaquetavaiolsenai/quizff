
import React from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  message: string;
}

const TIPS = [
  "Dica: O Gelo rápido é sua melhor defesa no Free Fire!",
  "Dica: Temas como Marvel e Naruto funcionam muito bem.",
  "Dica: A Gemini AI aprende com suas perguntas.",
  "Dica: Responda rápido para garantir sua sobrevivência!"
];

export default function LoadingOverlay({ message }: Props) {
  const tip = TIPS[Math.floor(Math.random() * TIPS.length)];

  return (
    <div className="fixed inset-0 bg-slate-900/95 z-[5000] flex flex-col items-center justify-center text-white backdrop-blur-md p-10 text-center">
      <Loader2 className="animate-spin text-blue-500 mb-6" size={80}/>
      <h2 className="text-3xl font-bungee tracking-tight mb-4">{message}</h2>
      <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 max-w-xs">
        <p className="text-blue-200/80 italic font-medium">"{tip}"</p>
      </div>
    </div>
  );
}
