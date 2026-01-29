
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Player, GameState, StoryNode, ViewState, RoundPhase, DifficultyLevel, ChatMessage, User, Friend } from './types';
import { 
  joinRoomChannel, broadcastEvent, supabase, joinUserChannel, 
  sendPrivateMessage, searchProfiles, addFriendDB, fetchFriendsList, upsertProfile,
  fetchAllProfiles
} from './services/supabaseService';
import { generateGameQuestion } from './services/geminiService';
import { 
  Flame, Users, Target, Zap, Trophy, Loader2, Skull, 
  LogOut, Crown, Share2, Mail, Lock, LogIn, Sparkles, 
  MessageCircle, Send, X, User as UserIcon, ShieldAlert, Heart,
  ChevronRight, Swords, Radio, AlertCircle, DoorOpen, Power,
  Keyboard, UserPlus, Check, Bell, Search, Database, Copy, Globe, Info, Fingerprint,
  AlertTriangle, Terminal
} from 'lucide-react';

const GAME_TIPS = [
  "O Gelo rápido é sua melhor defesa em campo aberto.",
  "Mantenha o colete sempre reparado para reduzir o dano.",
  "Mudar de posição após atirar evita que o squad inimigo te flanqueie.",
  "Habilidades como Alok e Kelly formam combos imbatíveis.",
  "A zona final causa dano massivo, não se atrase!",
  "Usar silenciador em Rifles de Precisão confunde o inimigo."
];

const SOUNDS = {
  CLICK: 'https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3',
  MESSAGE: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
  DAMAGE: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  INVITE: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'
};

const playSound = (url: string) => {
  const audio = new Audio(url);
  audio.volume = 0.3;
  audio.play().catch(() => {});
};

const renderHP = (hp: number) => {
  const total = 5;
  const active = Math.ceil(Math.max(0, hp) / 20);
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <Heart 
          key={i} 
          size={16} 
          className={`${i < active ? "fill-red-500 text-red-500" : "fill-slate-200 text-slate-200"} transition-all duration-300`} 
        />
      ))}
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [currentTip, setCurrentTip] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('Médio');
  const [showDamageEffect, setShowDamageEffect] = useState(false);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSocialOpen, setIsSocialOpen] = useState(false);
  const [socialTab, setSocialTab] = useState<'friends' | 'discover'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [discoverUsers, setDiscoverUsers] = useState<any[]>([]);
  const [invites, setInvites] = useState<{ roomCode: string, senderName: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'guest'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<GameState>({
    view: 'Welcome',
    phase: 'Question',
    roomCode: null,
    players: [],
    currentRound: 0,
    currentQuestion: null,
    difficulty: 'Médio'
  });

  const [inputCode, setInputCode] = useState('');
  const gameStateRef = useRef(gameState);

  const meInGame = useMemo(() => 
    gameState.players.find(p => p.id === currentUser?.id)
  , [gameState.players, currentUser]);

  const isHost = meInGame?.is_host ?? false;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        mapSessionUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        mapSessionUser(session.user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
      joinUserChannel(currentUser.id, (event, payload) => {
        if (event === 'SQUAD_INVITE') {
          playSound(SOUNDS.INVITE);
          setInvites(prev => [...prev, payload]);
        }
      });
      loadFriends();
      loadDiscoverUsers();
      upsertProfile(currentUser.id, currentUser.name);
    }
  }, [currentUser]);

  const loadFriends = async () => {
    if (!currentUser) return;
    const { data, error } = await fetchFriendsList(currentUser.id);
    if (error === 'TABLE_MISSING') setDbError('MISSING_TABLES');
    else {
      setFriends(data);
      setDbError(null);
    }
  };

  const loadDiscoverUsers = async () => {
    const { data, error } = await fetchAllProfiles();
    if (error === 'TABLE_MISSING') setDbError('MISSING_TABLES');
    else {
      setDiscoverUsers(data.filter(p => p.id !== currentUser?.id));
      setDbError(null);
    }
  };

  const mapSessionUser = (supabaseUser: any) => {
    setCurrentUser({
      id: supabaseUser.id,
      name: supabaseUser.user_metadata.name || "PLAYER",
      email: supabaseUser.email,
      isGuest: false,
      level: 1, xp: 0, stats: { wins: 0, matches: 0, totalScore: 0 }
    });
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        const { data, error } = await searchProfiles(searchQuery);
        if (error === 'TABLE_MISSING') setDbError('MISSING_TABLES');
        else setSearchResults(data.filter(r => r.id !== currentUser?.id));
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]);

  useEffect(() => {
    if (loading) setCurrentTip(GAME_TIPS[Math.floor(Math.random() * GAME_TIPS.length)]);
  }, [loading]);

  const resetLocalState = () => {
    setGameState({
      view: 'Welcome',
      phase: 'Question',
      roomCode: null,
      players: [],
      currentRound: 0,
      currentQuestion: null,
      difficulty: 'Médio'
    });
    setMessages([]);
    setIsChatOpen(false);
  };

  const updateAndBroadcast = (newState: Partial<GameState>) => {
    setGameState(s => {
      const merged = { ...s, ...newState };
      if (s.roomCode) broadcastEvent(s.roomCode, 'SYNC_STATE', merged);
      return merged;
    });
  };

  const handleLeaveRoom = () => {
    playSound(SOUNDS.CLICK);
    if (gameState.roomCode && currentUser) {
      broadcastEvent(gameState.roomCode, 'PLAYER_LEFT', { playerId: currentUser.id });
    }
    resetLocalState();
  };

  const handleCloseRoom = () => {
    if (!isHost || !gameState.roomCode) return;
    playSound(SOUNDS.CLICK);
    broadcastEvent(gameState.roomCode, 'ROOM_CLOSED', {});
    resetLocalState();
  };

  const handleRealtimeMessage = (event: string, payload: any) => {
    const current = gameStateRef.current;
    switch (event) {
      case 'SYNC_STATE': setGameState(s => ({ ...s, ...payload })); break;
      case 'CHAT_MESSAGE': 
        setMessages(prev => [...prev, payload]);
        if (!isChatOpen) { setUnreadCount(p => p + 1); playSound(SOUNDS.MESSAGE); }
        break;
      case 'ROOM_CLOSED':
        alert("O Líder do Squad encerrou a partida.");
        resetLocalState();
        break;
      case 'PLAYER_LEFT':
        if (current.players.find(p => p.id === currentUser?.id)?.is_host) {
          const newPlayers = current.players.filter(p => p.id !== payload.playerId);
          updateAndBroadcast({ players: newPlayers });
        }
        break;
      case 'JOIN_REQUEST':
        if (current.players.find(p => p.id === currentUser?.id)?.is_host) {
          if (!current.players.find(p => p.id === payload.id)) {
            const newPlayers = [...current.players, { ...payload, is_host: false, hp: 100, score: 0, hasAnswered: false, lastAnswerIdx: null, isReady: false }];
            updateAndBroadcast({ players: newPlayers });
          }
        }
        break;
      case 'SUBMIT_ANSWER':
        if (current.players.find(p => p.id === currentUser?.id)?.is_host) {
          const hpLoss = payload.isCorrect ? 0 : (current.difficulty === 'Fácil' ? 10 : current.difficulty === 'Médio' ? 25 : 50);
          const updatedPlayers = current.players.map(p => {
            if (p.id === payload.playerId) {
              return { 
                ...p, 
                hasAnswered: true, 
                lastAnswerIdx: payload.idx, 
                score: payload.isCorrect ? p.score + 1000 : p.score, 
                hp: Math.max(0, p.hp - hpLoss) 
              };
            }
            return p;
          });
          updateAndBroadcast({ players: updatedPlayers });
          if (updatedPlayers.every(p => p.hasAnswered)) {
            setTimeout(() => updateAndBroadcast({ phase: 'Results' }), 1200);
          }
        }
        break;
    }
  };

  const handleCreateRoom = async () => {
    if (!currentUser) return;
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setLoading(true);
    setLoadingMsg('Sincronizando Frequência do Squad...');
    try {
      await joinRoomChannel(code, handleRealtimeMessage);
      const player: Player = { id: currentUser.id, name: currentUser.name, is_host: true, hp: 100, score: 0, hasAnswered: false, lastAnswerIdx: null, isReady: true };
      setGameState(s => ({ ...s, view: 'Lobby', roomCode: code, players: [player], difficulty: selectedDifficulty }));
    } catch (e) { alert("Erro ao criar sala."); }
    setLoading(false);
  };

  const handleJoinRoom = async (code: string) => {
    if (!code || !currentUser) return;
    if (code.length < 4) return alert("Insira o código de 4 dígitos!");
    setLoading(true);
    setLoadingMsg('Localizando Coordenadas do Squad...');
    try {
      await joinRoomChannel(code, handleRealtimeMessage);
      broadcastEvent(code, 'JOIN_REQUEST', { id: currentUser.id, name: currentUser.name });
      setGameState(s => ({ ...s, view: 'Lobby', roomCode: code }));
      setInvites(prev => prev.filter(inv => inv.roomCode !== code));
    } catch (e) { alert("Erro ao conectar."); }
    setLoading(false);
  };

  const inviteFriend = async (friendId: string) => {
    if (!gameState.roomCode || !currentUser) return;
    playSound(SOUNDS.CLICK);
    await sendPrivateMessage(friendId, 'SQUAD_INVITE', { 
      roomCode: gameState.roomCode, 
      senderName: currentUser.name 
    });
    alert("Convite enviado!");
  };

  const handleAddFriend = async (friendId: string) => {
    if (!currentUser) return;
    playSound(SOUNDS.CLICK);
    const { success, error } = await addFriendDB(currentUser.id, friendId);
    if (success) {
      alert("Operador adicionado à sua lista!");
      loadFriends();
      setSearchQuery('');
    } else {
      if (error === 'TABLE_MISSING') alert("Erro: Tabelas do banco de dados não encontradas. Verifique o setup.sql.");
      else alert("Erro ao adicionar amigo: " + error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    playSound(SOUNDS.CLICK);
    alert("Copiado!");
  };

  const nextRound = async () => {
    const nextR = gameState.currentRound + 1;
    setLoading(true);
    setLoadingMsg(`Carregando Rodada ${nextR}...`);
    try {
      const { node, imageUrl } = await generateGameQuestion(nextR, selectedDifficulty);
      updateAndBroadcast({ 
        view: 'Playing', 
        phase: 'Question', 
        currentRound: nextR, 
        currentQuestion: { ...node, imageUrl },
        players: gameState.players.map(p => ({ ...p, hasAnswered: false, lastAnswerIdx: null }))
      });
    } catch (err) { alert('Erro na central de comando IA.'); }
    setLoading(false);
  };

  const handleAnswer = (idx: number) => {
    if (!gameState.roomCode || !currentUser || !gameState.currentQuestion) return;
    const isCorrect = idx === gameState.currentQuestion.correctAnswerIndex;
    if (!isCorrect) {
      playSound(SOUNDS.DAMAGE);
      setShowDamageEffect(true);
      setTimeout(() => setShowDamageEffect(false), 500);
    }
    broadcastEvent(gameState.roomCode, 'SUBMIT_ANSWER', { playerId: currentUser.id, idx, isCorrect });
  };

  const sendChat = (txt: string) => {
    if (!txt.trim() || !gameState.roomCode || !currentUser) return;
    broadcastEvent(gameState.roomCode, 'CHAT_MESSAGE', { 
      id: Date.now().toString(), 
      senderId: currentUser.id, 
      senderName: currentUser.name, 
      text: txt.trim(), 
      timestamp: Date.now() 
    });
    setChatInput('');
  };

  const handleGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authName.trim()) return;
    const user: User = { 
      id: 'g-' + Math.random().toString(36).substring(2, 7), 
      name: authName.toUpperCase(), 
      isGuest: true, 
      level: 1, xp: 0, stats: { wins: 0, matches: 0, totalScore: 0 } 
    };
    setCurrentUser(user);
    playSound(SOUNDS.CLICK);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
      options: {
        data: { name: authName.toUpperCase() }
      }
    });
    if (error) setAuthError(error.message);
    else alert("Cadastro realizado! Verifique seu e-mail.");
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    playSound(SOUNDS.CLICK);
    await supabase.auth.signOut();
    setCurrentUser(null);
    setFriends([]);
  };

  if (!currentUser) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white overflow-hidden relative">
      <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80')] bg-cover bg-center grayscale"></div>
      <div className="w-full max-w-sm z-10 space-y-8 animate-fade-up">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-[#014BAA] mx-auto rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-3 animate-float border-4 border-white">
            <Swords size={40}/>
          </div>
          <h1 className="text-5xl font-bungee tracking-tight">QUIZ <span className="text-blue-500">SQUAD</span></h1>
          <p className="text-blue-300/60 font-bold text-[10px] uppercase tracking-[0.3em]">Battle Royale Intelligence</p>
        </div>

        <div className="glass-panel p-8 rounded-[2rem] border border-white/10 shadow-2xl space-y-6">
           <div className="flex p-1 bg-slate-800/50 rounded-2xl">
             {['login', 'signup', 'guest'].map((mode) => (
               <button key={mode} onClick={() => { setAuthMode(mode as any); setAuthError(null); }} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${authMode === mode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>{mode}</button>
             ))}
           </div>

           {authError && (
             <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2 text-red-400 text-xs animate-shake">
               <AlertCircle size={14}/>
               <span>{authError}</span>
             </div>
           )}

           {authMode === 'guest' ? (
             <form onSubmit={handleGuest} className="space-y-4 animate-scale">
               <div className="relative">
                 <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
                 <input type="text" placeholder="SEU NICKNAME" required maxLength={12} value={authName} onChange={e => setAuthName(e.target.value.toUpperCase())} className="w-full bg-slate-800/50 border border-white/5 p-4 pl-12 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
               </div>
               <button type="submit" className="w-full py-5 bg-blue-600 rounded-[1.2rem] font-bold text-white text-lg shadow-xl shadow-blue-600/20 active:scale-95 transition-all">INICIAR OPERAÇÃO</button>
             </form>
           ) : (
             <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="space-y-4 animate-scale">
               {authMode === 'signup' && (
                 <div className="relative">
                   <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
                   <input type="text" placeholder="NICKNAME" required value={authName} onChange={e => setAuthName(e.target.value.toUpperCase())} className="w-full bg-slate-800/50 border border-white/5 p-4 pl-12 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                 </div>
               )}
               <div className="relative">
                 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
                 <input type="email" placeholder="E-MAIL" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-slate-800/50 border border-white/5 p-4 pl-12 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
               </div>
               <div className="relative">
                 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
                 <input type="password" placeholder="SENHA" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-slate-800/50 border border-white/5 p-4 pl-12 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
               </div>
               <button type="submit" disabled={authLoading} className="w-full py-5 bg-blue-600 rounded-[1.2rem] font-bold text-white text-lg shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                 {authLoading ? <Loader2 className="animate-spin"/> : (authMode === 'login' ? <LogIn size={20}/> : <Sparkles size={20}/>)}
                 {authMode === 'login' ? 'ENTRAR NO SQUAD' : 'CRIAR PERFIL'}
               </button>
             </form>
           )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FA] flex flex-col text-[#001A3D] relative overflow-hidden">
      {showDamageEffect && <div className="fixed inset-0 bg-red-500/20 z-[9999] pointer-events-none animate-pulse"></div>}

      <header className="p-6 flex justify-between items-center z-50">
        <div className="bg-white pl-2 pr-6 py-2 rounded-full flex items-center gap-4 shadow-xl border border-white animate-fade-up">
           <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bungee text-lg border-2 border-white shadow-md">{currentUser.name[0]}</div>
           <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">Operador: <span className="text-slate-900">{currentUser.name}</span></span>
              <div className="h-1.5 w-24 bg-slate-100 rounded-full mt-1 overflow-hidden"><div className="h-full bg-blue-500 w-[40%]"></div></div>
           </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setIsSocialOpen(true); loadDiscoverUsers(); loadFriends(); }} className="relative bg-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all">
            <Users size={18}/>
            {(invites.length > 0) && <span className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold animate-bounce">{invites.length}</span>}
          </button>
          {gameState.roomCode && (
            <button onClick={isHost ? handleCloseRoom : handleLeaveRoom} className="bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-red-500 font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all">
              {isHost ? <><Power size={14}/> Encerrar Sala</> : <><DoorOpen size={14}/> Sair do Squad</>}
            </button>
          )}
          <button onClick={handleLogout} title="Sair da Conta" className="bg-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:rotate-12 transition-all"><LogOut size={18}/></button>
        </div>
      </header>

      {/* SOCIAL HUB DRAWER */}
      <div className={`fixed inset-y-0 left-0 w-85 bg-white shadow-2xl z-[1100] flex flex-col transition-transform duration-500 ease-in-out ${isSocialOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="bg-blue-600 p-6 flex flex-col gap-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><Users size={24}/><span className="font-bungee text-lg">SOCIAL HUB</span></div>
            <button onClick={() => setIsSocialOpen(false)} className="hover:rotate-90 transition-all"><X size={24}/></button>
          </div>
          <div className="flex bg-blue-700/50 p-1 rounded-xl">
             <button onClick={() => setSocialTab('friends')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${socialTab === 'friends' ? 'bg-white text-blue-600 shadow-lg' : 'text-blue-200'}`}>Contatos</button>
             <button onClick={() => { setSocialTab('discover'); loadDiscoverUsers(); }} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${socialTab === 'discover' ? 'bg-white text-blue-600 shadow-lg' : 'text-blue-200'}`}>Descobrir</button>
          </div>
        </div>

        {/* Database Missing Warning */}
        {dbError === 'MISSING_TABLES' && (
          <div className="m-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl space-y-3 animate-shake">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-widest">
              <AlertTriangle size={18}/> SETUP DO BANCO NECESSÁRIO
            </div>
            <p className="text-[10px] text-amber-800 leading-relaxed font-medium">As tabelas 'profiles' ou 'friendships' não foram encontradas. Execute o script <b>setup.sql</b> no editor SQL do seu Supabase Dashboard.</p>
            <button onClick={() => { loadFriends(); loadDiscoverUsers(); }} className="w-full py-2 bg-amber-200 text-amber-800 rounded-lg text-[10px] font-bold uppercase hover:bg-amber-300 transition-all">TENTAR NOVAMENTE</button>
          </div>
        )}

        {/* Informação do Próprio ID */}
        {!dbError && (
          <div className="bg-slate-50 p-4 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Fingerprint size={12}/> Meu Identificador (ID)</p>
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <code className="text-[10px] font-mono font-bold text-blue-600 truncate mr-2">{currentUser.id}</code>
              <button onClick={() => copyToClipboard(currentUser.id)} className="text-slate-400 hover:text-blue-600 transition-colors" title="Copiar meu ID"><Copy size={14}/></button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar">
          {socialTab === 'friends' ? (
            <>
               {/* Search Friends */}
               <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Localizar Amigo</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                  <input 
                    type="text" 
                    placeholder="Nickname..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border-2 border-slate-100 p-3 pl-10 rounded-xl text-sm outline-none focus:border-blue-200"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="space-y-2 animate-fade-up">
                    {searchResults.map(res => (
                      <div key={res.id} className="bg-white border-2 border-blue-50 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-sm">{res.name}</span>
                          <span className="text-[8px] text-slate-400 font-mono">ID: {res.id.slice(0, 16)}...</span>
                        </div>
                        <button onClick={() => handleAddFriend(res.id)} className="bg-blue-600 text-white p-2 rounded-xl"><UserPlus size={18}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invites */}
              {invites.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Bell size={12}/> Convites Pendentes</h3>
                  {invites.map((inv, i) => (
                    <div key={i} className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-center justify-between animate-fade-up">
                      <div>
                        <p className="text-xs font-bold text-orange-900">{inv.senderName}</p>
                        <p className="text-[9px] text-orange-600 uppercase font-bold">Squad {inv.roomCode}</p>
                      </div>
                      <button onClick={() => handleJoinRoom(inv.roomCode)} className="bg-orange-500 text-white p-2 rounded-xl hover:scale-110 transition-all"><Check size={18}/></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Friends List */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Meus Contatos ({friends.length})</h3>
                {friends.length === 0 && !dbError && (
                   <div className="text-center py-10 space-y-3">
                      <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-slate-200"><Users size={32}/></div>
                      <p className="text-xs text-slate-400 font-medium italic">Sua lista está vazia.</p>
                   </div>
                )}
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-fade-up">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 font-bungee text-sm shadow-sm">{friend.name[0]}</div>
                      <div>
                        <p className="font-bold text-slate-700 text-sm">{friend.name}</p>
                        <p className="text-[8px] text-slate-400 font-mono">ID: {friend.id.slice(0, 12)}...</p>
                      </div>
                    </div>
                    {gameState.roomCode && (
                      <button onClick={() => inviteFriend(friend.id)} className="bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">Convidar</button>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Globe size={14}/> Descoberta Global</h3>
                <button onClick={loadDiscoverUsers} className="text-blue-500 hover:rotate-180 transition-all duration-500"><Loader2 size={16}/></button>
              </div>
              
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                 <div className="bg-blue-100 p-2 rounded-xl text-blue-600 mt-1"><Info size={16}/></div>
                 <p className="text-[10px] text-blue-800 leading-relaxed font-medium">Aqui estão os operadores que entraram recentemente no radar. Você pode adicioná-los diretamente ou compartilhar o seu ID.</p>
              </div>

              <div className="grid gap-4">
                {discoverUsers.length === 0 && !dbError && <p className="text-center text-slate-400 text-xs py-10">Procurando sinais de rádio...</p>}
                {discoverUsers.map((p) => (
                  <div key={p.id} className="group relative overflow-hidden bg-white border-2 border-slate-50 p-5 rounded-3xl shadow-sm hover:border-blue-100 transition-all hover:shadow-md animate-fade-up">
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bungee text-lg shadow-xl shadow-slate-900/20">{p.name[0]}</div>
                         <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-base flex items-center gap-2">{p.name} <Target size={12} className="text-blue-500"/></span>
                            <div className="flex items-center gap-2 mt-1">
                               <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg truncate max-w-[120px]">ID: {p.id}</span>
                               <button onClick={() => copyToClipboard(p.id)} className="text-slate-300 hover:text-blue-500 transition-colors p-1" title="Copiar ID"><Copy size={12}/></button>
                            </div>
                         </div>
                      </div>
                      <button 
                        onClick={() => handleAddFriend(p.id)} 
                        disabled={friends.some(f => f.id === p.id)}
                        className={`p-3 rounded-2xl transition-all ${friends.some(f => f.id === p.id) ? 'bg-green-50 text-green-500' : 'bg-blue-600 text-white hover:scale-110 active:scale-95 shadow-lg shadow-blue-500/20'}`}
                      >
                        {friends.some(f => f.id === p.id) ? <Check size={20}/> : <UserPlus size={20}/>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CHAT RADIO */}
      {gameState.roomCode && (
        <>
          <button onClick={() => { setIsChatOpen(true); setUnreadCount(0); }} className="fixed bottom-6 right-6 z-[100] bg-blue-600 w-16 h-16 rounded-2xl shadow-2xl flex items-center justify-center text-white hover:scale-110 active:scale-90 transition-all border-4 border-white">
            <Radio size={28} />
            {unreadCount > 0 && <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-bold w-7 h-7 rounded-full flex items-center justify-center border-4 border-[#F4F7FA]">{unreadCount}</span>}
          </button>
          
          <div className={`fixed inset-y-0 right-0 w-85 bg-white shadow-2xl z-[1000] flex flex-col transition-transform duration-500 ease-in-out ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="bg-slate-900 p-6 flex items-center justify-between text-white">
              <div className="flex items-center gap-3"><Radio className="text-blue-500" size={24}/><span className="font-bungee text-lg">SQUAD RADIO</span></div>
              <button onClick={() => setIsChatOpen(false)} className="hover:rotate-90 transition-all"><X size={24}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar bg-slate-50">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'} animate-slide-right`}>
                  <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">{msg.senderName}</span>
                  <div className={`px-5 py-3 rounded-2xl text-sm shadow-sm max-w-[85%] ${msg.senderId === currentUser.id ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>{msg.text}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-6 border-t bg-white space-y-4">
              <div className="flex gap-3">
                <input type="text" placeholder="Transmitir mensagem..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat(chatInput)} className="flex-1 bg-slate-100 p-4 rounded-xl text-sm outline-none font-medium" />
                <button onClick={() => sendChat(chatInput)} className="bg-blue-600 text-white p-4 rounded-xl hover:scale-105 transition-all"><Send size={20}/></button>
              </div>
            </div>
          </div>
        </>
      )}

      {loading && (
        <div className="fixed inset-0 bg-slate-900/95 z-[2000] flex flex-col items-center justify-center p-10 space-y-10 text-white">
          <div className="relative">
            <Loader2 className="animate-spin text-blue-500" size={80}/>
            <div className="absolute inset-0 flex items-center justify-center"><Target size={30} className="text-blue-400 animate-pulse"/></div>
          </div>
          <div className="text-center space-y-6 max-w-sm">
            <h2 className="text-3xl font-bungee text-white">{loadingMsg}</h2>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10"><p className="text-blue-200/80 font-medium text-sm italic">"{currentTip}"</p></div>
          </div>
        </div>
      )}

      {/* VIEW: WELCOME */}
      {gameState.view === 'Welcome' && (
        <main className="flex-1 max-w-lg mx-auto w-full flex flex-col justify-center p-6 space-y-8 animate-fade-up">
          <div className="bg-white rounded-[2rem] p-8 shadow-2xl border border-white space-y-6">
            <div className="flex items-center gap-3"><ShieldAlert className="text-blue-600" size={24}/><h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Dificuldade da Missão</h3></div>
            <div className="grid grid-cols-3 gap-3">
              {(['Fácil', 'Médio', 'Difícil'] as DifficultyLevel[]).map(d => (
                <button key={d} onClick={() => { setSelectedDifficulty(d); playSound(SOUNDS.CLICK); }} className={`py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border-2 ${selectedDifficulty === d ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20 scale-105' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>{d}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
             <button onClick={handleCreateRoom} className="group relative overflow-hidden bg-slate-900 rounded-[2rem] p-8 text-white flex items-center justify-between shadow-2xl transition-all hover:scale-[1.02] active:scale-95">
                <div className="relative z-10 text-left">
                   <h3 className="text-2xl font-bungee mb-1">CRIAR SQUAD</h3>
                   <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">Lidere sua equipe</p>
                </div>
                <div className="relative z-10 w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center border-4 border-slate-800"><Users size={28}/></div>
                <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-125 transition-transform"><Users size={200}/></div>
             </button>

             <div className="bg-white rounded-[2rem] p-6 shadow-2xl border border-white space-y-6">
                <div className="flex items-center justify-center gap-2">
                  <Keyboard size={14} className="text-blue-600"/>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">INGRESSAR EM SQUAD ATIVO</span>
                </div>
                
                <div className="flex bg-slate-50 border-2 border-slate-100 rounded-2xl overflow-hidden focus-within:border-blue-200 transition-all p-1 items-stretch h-16">
                  <input 
                    type="text" 
                    placeholder="CODE" 
                    value={inputCode} 
                    onChange={e => setInputCode(e.target.value.toUpperCase())} 
                    maxLength={4} 
                    className="flex-1 bg-transparent px-6 text-center font-bungee text-2xl text-blue-600 placeholder:text-slate-300 outline-none self-center" 
                  />
                  <button 
                    onClick={() => handleJoinRoom(inputCode)} 
                    className="w-14 bg-blue-600 rounded-xl text-white flex items-center justify-center hover:bg-blue-700 active:scale-90 transition-all shadow-lg shadow-blue-600/20"
                  >
                    <ChevronRight size={24}/>
                  </button>
                </div>
             </div>
          </div>
        </main>
      )}

      {/* VIEW: LOBBY */}
      {gameState.view === 'Lobby' && (
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-10 text-center space-y-10 shadow-2xl animate-scale border border-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-600 bg-blue-50 px-4 py-2 rounded-full">SQUAD ID</span>
              <h2 className="text-7xl font-bungee text-slate-900 tracking-tighter">{gameState.roomCode}</h2>
              <button onClick={() => { navigator.clipboard.writeText(gameState.roomCode!); playSound(SOUNDS.CLICK); }} className="mx-auto flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase hover:text-blue-600 transition-colors"><Share2 size={14}/> Compartilhar convite</button>
            </div>
            
            <div className="space-y-4 max-h-64 overflow-y-auto hide-scrollbar pr-2">
              <div className="text-[10px] font-bold text-slate-400 text-left uppercase tracking-widest border-b border-slate-100 pb-2">Integrantes do Squad ({gameState.players.length})</div>
              {gameState.players.map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-white animate-slide-right" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 font-bungee text-sm shadow-sm border border-slate-100">{p.name[0]}</div>
                    <span className="font-bold text-slate-700 text-sm">{p.name} {p.id === currentUser.id && '(VOCÊ)'}</span>
                  </div>
                  {p.is_host && <Crown size={18} className="text-orange-500 fill-orange-500/20"/>}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => isHost ? nextRound() : alert('Aguardando o Líder do Squad autorizar o início!')} 
                disabled={!isHost && gameState.players.length < 1}
                className={`w-full py-6 rounded-2xl font-bold text-white text-xl transition-all active:scale-95 shadow-2xl shadow-blue-600/30 ${isHost ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed opacity-80'}`}
              >
                {isHost ? 'INICIAR PARTIDA' : 'SQUAD PRONTO'}
              </button>
              
              <button onClick={isHost ? handleCloseRoom : handleLeaveRoom} className="w-full py-4 text-xs font-bold uppercase tracking-[0.2em] text-red-500 hover:bg-red-50 rounded-xl transition-all border border-red-100">
                {isHost ? 'Desativar Sala' : 'Sair da Sala'}
              </button>
            </div>
          </div>
        </main>
      )}

      {/* VIEW: PLAYING */}
      {gameState.view === 'Playing' && (
        <main className="flex-1 flex flex-col p-6 max-w-2xl mx-auto w-full space-y-6 animate-fade-up">
          <header className="flex justify-between items-end pb-4 border-b-2 border-slate-100">
            <div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-600">{gameState.difficulty} Mode</span><span className="font-bungee text-3xl text-slate-900">ROUND {gameState.currentRound}</span></div>
            <div className="flex -space-x-3">
               {gameState.players.map(p => (
                  <div key={p.id} className={`w-12 h-12 rounded-xl border-4 border-white flex items-center justify-center font-bungee text-[14px] shadow-lg transition-all ${p.hp <= 0 ? 'bg-red-500 text-white animate-shake' : p.hasAnswered ? 'bg-green-500 text-white' : 'bg-white text-blue-600'}`}>{p.hp <= 0 ? <Skull size={20}/> : p.name[0]}</div>
               ))}
            </div>
          </header>

          {gameState.phase === 'Question' && (
            <div className="space-y-6 flex-1 flex flex-col animate-scale">
               <div className="relative aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-900 border-4 border-white group scanline-effect">
                  {gameState.currentQuestion?.imageUrl && <img src={gameState.currentQuestion.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/>}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                  {meInGame && (
                    <div className="absolute bottom-6 left-6 right-6 glass-panel p-4 rounded-2xl border border-white/20 flex items-center justify-between">
                      <div className="flex items-center gap-3"><Flame size={20} className="text-orange-500 animate-pulse"/><span className="text-slate-900 font-bungee text-xs">VITALIDADE</span></div>
                      {renderHP(meInGame.hp)}
                    </div>
                  )}
               </div>
               
               <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-white flex-1 flex flex-col justify-center">
                  <h3 className="font-bold text-slate-800 text-center text-2xl leading-relaxed italic">"{gameState.currentQuestion?.text}"</h3>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
                 {gameState.currentQuestion?.choices.map((choice, i) => (
                   <button 
                    key={i} 
                    disabled={meInGame?.hasAnswered || meInGame?.hp <= 0} 
                    onClick={() => handleAnswer(i)} 
                    className={`choice-btn py-5 rounded-2xl text-white font-bold text-lg shadow-xl active:scale-95 transition-all text-left px-8 flex items-center gap-4 ${['bg-blue-600', 'bg-green-600', 'bg-orange-500', 'bg-red-600'][i]} ${meInGame?.hasAnswered && 'opacity-40 grayscale'}`}
                   >
                     <span className="font-bungee opacity-40 text-2xl">{String.fromCharCode(65+i)}</span>
                     <span className="flex-1">{choice}</span>
                   </button>
                 ))}
               </div>
            </div>
          )}

          {gameState.phase === 'Results' && (
             <div className="flex-1 flex flex-col items-center justify-center space-y-10 animate-scale text-center">
                <div className="space-y-4 animate-booyah">
                  {meInGame?.lastAnswerIdx === gameState.currentQuestion?.correctAnswerIndex ? (
                    <>
                      <Sparkles className="text-orange-500 mx-auto" size={80}/>
                      <h1 className="text-8xl font-bungee text-blue-600 tracking-tighter">BOOYAH!</h1>
                    </>
                  ) : (
                    <>
                      <Skull className="text-red-500 mx-auto" size={80}/>
                      <h1 className="text-8xl font-bungee text-red-600 tracking-tighter">ELIMINADO!</h1>
                    </>
                  )}
                </div>
                <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-white w-full max-w-md space-y-4">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">RESPOSTA TÁTICA</p>
                   <p className="text-2xl font-bold italic text-slate-800">"{gameState.currentQuestion?.choices[gameState.currentQuestion?.correctAnswerIndex]}"</p>
                </div>
                <button onClick={() => updateAndBroadcast({ phase: 'Leaderboard' })} className="px-12 py-6 bg-slate-900 text-white rounded-2xl font-bold text-xl shadow-2xl active:scale-95 transition-all flex items-center gap-4">ANALISAR PERFORMANCE <ChevronRight/></button>
             </div>
          )}

          {gameState.phase === 'Leaderboard' && (
            <div className="flex-1 flex flex-col space-y-8 animate-fade-up">
               <h1 className="text-5xl font-bungee text-center text-slate-900">SQUAD RANKING</h1>
               <div className="space-y-4 flex-1 overflow-y-auto pr-2 hide-scrollbar">
                  {gameState.players.sort((a,b) => b.score - a.score).map((p, i) => (
                    <div key={p.id} className={`flex items-center justify-between p-6 bg-white rounded-3xl shadow-xl border-4 transition-all ${p.id === currentUser.id ? 'border-blue-600 scale-105' : 'border-white'}`} style={{animationDelay: `${i*0.1}s`}}>
                       <div className="flex items-center gap-6">
                         <span className="font-bungee text-slate-200 text-4xl">#{i+1}</span>
                         <div className="flex flex-col">
                            <span className="font-bold text-xl text-slate-800">{p.name} {p.id === currentUser.id && '(VOCÊ)'}</span>
                            <div className="flex mt-1">{renderHP(p.hp)}</div>
                         </div>
                       </div>
                       <div className="text-right">
                          <span className="font-bungee text-3xl text-blue-600">{p.score}</span>
                          <p className="text-[10px] font-bold uppercase text-slate-300 tracking-widest">PONTOS</p>
                       </div>
                    </div>
                  ))}
               </div>
               {isHost ? (
                 <button onClick={nextRound} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-bold text-2xl shadow-2xl shadow-blue-600/30 active:scale-95 transition-all">PRÓXIMO SALTO</button>
               ) : (
                 <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 text-center animate-pulse"><p className="text-xs font-bold text-blue-600 uppercase tracking-[0.2em]">Aguardando o Líder do Squad autorizar o salto...</p></div>
               )}
            </div>
          )}
        </main>
      )}
    </div>
  );
}
