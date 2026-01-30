
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Player, GameState, StoryNode, ViewState, RoundPhase, DifficultyLevel, User, Friend, GameMode } from './types';
import { 
  joinRoomChannel, broadcastEvent, supabase, joinUserChannel, 
  sendPrivateMessage, upsertProfile, fetchFriendsList,
  fetchAllProfiles, fetchGlobalRanking, updateProfileData, fetchProfile, incrementPlayerStats
} from './services/supabaseService';
import { generateGameQuestion } from './services/geminiService';
import { 
  Trophy, Loader2, Skull, Crown, Sparkles, X, User as UserIcon, Heart,
  ChevronRight, Swords, AlertCircle, Plus, Settings2, Sliders, Hash, MessageSquare,
  Image as ImageIcon, RefreshCw, LayoutGrid, Terminal, Bell, Check, AlertTriangle, LogOut
} from 'lucide-react';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Toby',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Buster'
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentNav, setCurrentNav] = useState<'play' | 'ranking' | 'profile'>('play');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [gameState, setGameState] = useState<GameState>({
    view: 'Welcome', phase: 'Question', roomCode: null, players: [],
    currentRound: 0, maxRounds: 5, currentQuestion: null,
    difficulty: 'Médio', gameMode: 'Quiz', customTopic: null
  });

  // Refs para manter estado atualizado em callbacks de tempo real
  const stateRef = useRef(gameState);
  useEffect(() => { stateRef.current = gameState; }, [gameState]);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) handleLoginSuccess(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) handleLoginSuccess(session.user);
      else setCurrentUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSuccess = (sbUser: any) => {
    setCurrentUser({
      id: sbUser.id, name: (sbUser.user_metadata.name || "PLAYER").toUpperCase(),
      email: sbUser.email, isGuest: false, avatar: sbUser.user_metadata.avatar_url || PRESET_AVATARS[0],
      level: 1, xp: 0, stats: { wins: 0, matches: 0, totalScore: 0 }
    });
  };

  const handleGuestLogin = () => {
    setCurrentUser({
      id: 'guest_' + Math.random().toString(36).substr(2, 5),
      name: 'GUEST_' + Math.random().toString(36).substr(2, 3).toUpperCase(),
      isGuest: true, avatar: PRESET_AVATARS[0],
      level: 1, xp: 0, stats: { wins: 0, matches: 0, totalScore: 0 }
    });
  };

  // Funções de Sala (Lobby)
  const createRoom = async (theme: string, rounds: number) => {
    if (!currentUser) return;
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setLoading(true);
    setLoadingMsg("Criando squad...");
    try {
      await joinRoomChannel(code, (ev, pay) => onRealtimeMsg(ev, pay));
      const host: Player = { id: currentUser.id, name: currentUser.name, is_host: true, hp: 100, score: 0, lastAnswerIdx: null, hasAnswered: false, isReady: true, avatar: currentUser.avatar };
      setGameState({
        view: 'Lobby', phase: 'Question', roomCode: code, players: [host], 
        currentRound: 0, maxRounds: rounds, currentQuestion: null,
        difficulty: 'Médio', gameMode: 'Quiz', customTopic: theme || null
      });
    } catch (e) { alert("Erro ao criar sala."); }
    setLoading(false);
  };

  const joinRoom = async (code: string) => {
    if (!code || !currentUser) return;
    setLoading(true);
    try {
      await joinRoomChannel(code, (ev, pay) => onRealtimeMsg(ev, pay));
      broadcastEvent(code, 'JOIN_REQUEST', { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar });
      setGameState(s => ({ ...s, view: 'Lobby', roomCode: code }));
    } catch (e) { alert("Sala não encontrada."); }
    setLoading(false);
  };

  const onRealtimeMsg = (event: string, payload: any) => {
    const cur = stateRef.current;
    if (event === 'SYNC_STATE') setGameState(s => ({ ...s, ...payload }));
    if (event === 'JOIN_REQUEST' && cur.players.find(p => p.id === currentUser?.id)?.is_host) {
      if (!cur.players.find(p => p.id === payload.id)) {
        const newP: Player = { ...payload, is_host: false, hp: 100, score: 0, hasAnswered: false, lastAnswerIdx: null, isReady: true };
        const updatedPlayers = [...cur.players, newP];
        updateState({ players: updatedPlayers });
      }
    }
  };

  const updateState = (newState: Partial<GameState>) => {
    setGameState(s => {
      const merged = { ...s, ...newState };
      if (s.roomCode) broadcastEvent(s.roomCode, 'SYNC_STATE', merged);
      return merged;
    });
  };

  // Ciclo de Jogo (Gameplay)
  const startGame = async () => {
    setLoading(true);
    setLoadingMsg("Gerando desafio...");
    try {
      const { node, imageUrl } = await generateGameQuestion(1, gameState.difficulty, gameState.gameMode, gameState.customTopic);
      updateState({
        view: 'Playing', phase: 'Question', currentRound: 1,
        currentQuestion: { ...node, imageUrl },
        players: gameState.players.map(p => ({ ...p, hp: 100, score: 0, hasAnswered: false, lastAnswerIdx: null }))
      });
    } catch (e) { alert("Erro ao conectar com a IA."); }
    setLoading(false);
  };

  const submitAnswer = (idx: number) => {
    const me = gameState.players.find(p => p.id === currentUser?.id);
    if (!me || me.hasAnswered || gameState.phase !== 'Question') return;
    
    const isCorrect = idx === gameState.currentQuestion?.correctAnswerIndex;
    const updatedPlayers = gameState.players.map(p => p.id === currentUser?.id ? {
      ...p, hasAnswered: true, lastAnswerIdx: idx, 
      hp: Math.max(0, p.hp - (isCorrect ? 0 : 20)),
      score: p.score + (isCorrect ? 100 : 0)
    } : p);
    
    updateState({ players: updatedPlayers });
  };

  const nextRound = async () => {
    const next = gameState.currentRound + 1;
    if (next > gameState.maxRounds) {
      updateState({ view: 'GameOver' });
      return;
    }
    setLoading(true);
    setLoadingMsg(`Preparando Rodada ${next}...`);
    try {
      const { node, imageUrl } = await generateGameQuestion(next, gameState.difficulty, gameState.gameMode, gameState.customTopic);
      updateState({
        currentRound: next, currentQuestion: { ...node, imageUrl },
        phase: 'Question',
        players: gameState.players.map(p => ({ ...p, hasAnswered: false, lastAnswerIdx: null }))
      });
    } catch (e) { alert("Erro na API."); }
    setLoading(false);
  };

  const meInGame = useMemo(() => gameState.players.find(p => p.id === currentUser?.id), [gameState.players, currentUser]);

  // Vistas Organizadas
  const RenderAuth = () => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
      <div className="text-center space-y-8 animate-fade-up max-w-sm w-full">
        <div className="w-20 h-20 bg-blue-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl rotate-6 border-4 border-white"><Swords size={40}/></div>
        <h1 className="text-5xl font-bungee">QUIZ <span className="text-blue-500">SQUAD</span></h1>
        <div className="bg-white/10 p-8 rounded-[2rem] border border-white/5 backdrop-blur-md space-y-4">
          <button onClick={handleGuestLogin} className="w-full py-5 bg-blue-600 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-all">JOGAR AGORA</button>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Entre para competir no ranking mundial</p>
        </div>
      </div>
    </div>
  );

  const RenderHome = () => {
    const [theme, setTheme] = useState('');
    const [rounds, setRounds] = useState(5);
    const [code, setCode] = useState('');
    
    return (
      <div className="px-6 space-y-6 pt-6 animate-fade-up">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-6 border border-white">
          <h3 className="text-sm font-bungee text-slate-400 flex items-center gap-2"><Settings2 size={18}/> NOVO SQUAD</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Tema (Prompt)</span>
              <textarea value={theme} onChange={e => setTheme(e.target.value)} placeholder="Ex: Marvel, Futebol, Biologia, Free Fire..." className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-sm focus:border-blue-600 outline-none h-24" />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Rodadas</span>
              <div className="flex gap-2">
                {[5, 10, 15].map(n => (
                  <button key={n} onClick={() => setRounds(n)} className={`flex-1 py-3 rounded-xl font-bold ${rounds === n ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{n}</button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => createRoom(theme, rounds)} className="w-full py-6 bg-slate-900 text-white rounded-[1.8rem] font-bungee text-xl shadow-xl flex items-center justify-center gap-2">CRIAR SALA <Plus/></button>
        </div>
        <div className="bg-white rounded-3xl p-3 shadow-xl flex items-center">
          <Terminal className="text-slate-300 ml-4" size={20}/>
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={4} placeholder="CÓDIGO" className="flex-1 px-4 font-bungee text-2xl outline-none text-blue-600" />
          <button onClick={() => joinRoom(code)} className="w-14 h-14 bg-blue-600 rounded-2xl text-white flex items-center justify-center shadow-lg"><ChevronRight size={28}/></button>
        </div>
      </div>
    );
  };

  const RenderGameplay = () => {
    const q = gameState.currentQuestion;
    const allAnswered = gameState.players.every(p => p.hp <= 0 || p.hasAnswered);
    
    return (
      <div className="p-6 space-y-6 animate-fade-up">
        <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
          {gameState.players.map(p => (
            <div key={p.id} className={`shrink-0 bg-white p-3 rounded-2xl shadow-md border-2 ${p.hasAnswered ? 'border-green-400 scale-95' : 'border-white'}`}>
              <div className="flex items-center gap-3">
                <img src={p.avatar} className="w-8 h-8 rounded-lg object-cover" />
                <div className="flex flex-col"><span className="text-[10px] font-bold truncate w-12">{p.name}</span><div className="flex gap-0.5">{Array.from({length:5}).map((_,i) => <Heart key={i} size={8} className={i < Math.ceil(p.hp/20) ? 'fill-red-500 text-red-500' : 'text-slate-200'}/>)}</div></div>
              </div>
            </div>
          ))}
        </div>
        {q && (
          <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-white">
            <div className="h-44 bg-slate-100 relative">
              {q.imageUrl ? <img src={q.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-slate-200" size={40}/></div>}
              <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-1 rounded-full font-bungee text-[10px]">RODADA {gameState.currentRound}</div>
            </div>
            <div className="p-8 space-y-6">
              <h2 className="text-lg font-bold text-slate-800 leading-tight">{q.text}</h2>
              <div className="space-y-3">
                {q.choices.map((c, i) => {
                  const isCorrect = i === q.correctAnswerIndex;
                  const myAns = meInGame?.lastAnswerIdx === i;
                  let style = "bg-slate-50 border-slate-100 text-slate-700";
                  if (allAnswered) {
                    if (isCorrect) style = "bg-green-500 border-green-500 text-white";
                    else if (myAns) style = "bg-red-500 border-red-500 text-white";
                  } else if (myAns) style = "bg-blue-600 border-blue-600 text-white";
                  
                  return (
                    <button key={i} disabled={meInGame?.hasAnswered || allAnswered} onClick={() => submitAnswer(i)} className={`w-full p-5 rounded-2xl text-left font-bold text-sm border-2 transition-all ${style}`}>{c}</button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {allAnswered && meInGame?.is_host && <button onClick={nextRound} className="w-full py-6 bg-orange-500 text-white rounded-2xl font-bungee text-xl shadow-xl animate-bounce">CONTINUAR <ChevronRight className="inline"/></button>}
      </div>
    );
  };

  if (!currentUser) return <RenderAuth />;

  return (
    <div className="min-h-screen flex flex-col relative max-w-lg mx-auto w-full">
      {gameState.view === 'Welcome' && (
        <header className="p-6 flex justify-between items-center">
          <div className="flex items-center gap-3 bg-white p-2 pr-6 rounded-full shadow-lg border border-white">
            <img src={currentUser.avatar} className="w-10 h-10 rounded-full border-2 border-blue-50" />
            <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400">PLAYER</span><span className="font-bold text-sm">{currentUser.name}</span></div>
          </div>
          <button onClick={() => setCurrentNav('profile')} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md"><UserIcon size={20} className="text-slate-400"/></button>
        </header>
      )}

      <main className="flex-1 pb-32 overflow-y-auto hide-scrollbar">
        {gameState.view === 'Welcome' && <RenderHome />}
        {gameState.view === 'Lobby' && (
          <div className="flex items-center justify-center p-6 min-h-[60vh]">
            <div className="w-full bg-white rounded-[3rem] p-10 text-center space-y-8 shadow-2xl border-t-[12px] border-blue-600 animate-fade-up">
              <h2 className="text-[10px] font-bold text-blue-600 tracking-[0.2em] uppercase">Código do Squad</h2>
              <h1 className="text-7xl font-bungee tracking-tighter text-slate-900">{gameState.roomCode}</h1>
              <div className="space-y-3">
                {gameState.players.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-white">
                    <div className="flex items-center gap-3"><img src={p.avatar} className="w-10 h-10 rounded-lg"/><span className="font-bold">{p.name}</span></div>
                    {p.is_host && <Crown size={18} className="text-orange-500"/>}
                  </div>
                ))}
              </div>
              <button onClick={startGame} disabled={!meInGame?.is_host} className={`w-full py-6 rounded-2xl font-bungee text-xl shadow-xl transition-all ${meInGame?.is_host ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-300'}`}>{meInGame?.is_host ? 'COMEÇAR JOGO' : 'ESPERANDO LÍDER'}</button>
              <button onClick={() => setGameState(s => ({ ...s, view: 'Welcome', roomCode: null }))} className="text-red-500 text-[10px] font-bold uppercase">SAIR DA SALA</button>
            </div>
          </div>
        )}
        {gameState.view === 'Playing' && <RenderGameplay />}
        {gameState.view === 'GameOver' && (
          <div className="p-6 flex flex-col items-center justify-center min-h-[70vh] space-y-8 text-center animate-fade-up">
            <h1 className="text-7xl font-bungee text-orange-500 animate-bounce">BOOYAH!</h1>
            <div className="w-full bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-4">
              {gameState.players.sort((a,b)=>b.score-a.score).map((p,i) => (
                <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl ${i===0?'bg-orange-50 border-2 border-orange-200':'bg-slate-50'}`}>
                  <div className="flex items-center gap-3"><span className="font-bungee text-slate-300">{i+1}</span><img src={p.avatar} className="w-10 h-10 rounded-lg"/><span className="font-bold">{p.name}</span></div>
                  <span className="font-bungee text-blue-600">{p.score}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setGameState(s => ({ ...s, view: 'Welcome', roomCode: null }))} className="w-full py-6 bg-slate-900 text-white rounded-2xl font-bungee text-xl shadow-xl">VOLTAR AO INÍCIO</button>
          </div>
        )}
      </main>

      {gameState.view === 'Welcome' && (
        <nav className="fixed bottom-0 left-0 right-0 p-6 pb-10">
          <div className="bg-slate-900 rounded-[2.5rem] p-2 flex justify-around items-center shadow-2xl border border-white/10">
            <button onClick={() => setCurrentNav('play')} className={`p-4 rounded-2xl transition-all ${currentNav==='play'?'bg-blue-600 text-white scale-110 shadow-lg':'text-slate-500'}`}><Swords size={24}/></button>
            <button onClick={() => setCurrentNav('ranking')} className={`p-4 rounded-2xl transition-all ${currentNav==='ranking'?'bg-orange-500 text-white scale-110 shadow-lg':'text-slate-500'}`}><Trophy size={24}/></button>
          </div>
        </nav>
      )}

      {loading && (
        <div className="fixed inset-0 bg-slate-900/90 z-[5000] flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <Loader2 className="animate-spin text-blue-500 mb-6" size={60}/>
          <h2 className="text-2xl font-bungee tracking-tight">{loadingMsg}</h2>
          <p className="mt-4 text-[10px] uppercase font-bold text-slate-400">Dica: Gelo rápido salva vidas no Bermuda!</p>
        </div>
      )}
    </div>
  );
}
