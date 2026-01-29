
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Player, GameState, StoryNode, ViewState, RoundPhase, DifficultyLevel, ChatMessage, User, Friend } from './types';
import { 
  joinRoomChannel, broadcastEvent, supabase, joinUserChannel, 
  sendPrivateMessage, searchProfiles, addFriendDB, fetchFriendsList, upsertProfile,
  fetchAllProfiles, fetchGlobalRanking, updateProfileData, fetchProfile
} from './services/supabaseService';
import { generateGameQuestion } from './services/geminiService';
import { 
  Flame, Users, Target, Zap, Trophy, Loader2, Skull, 
  LogOut, Crown, Share2, Mail, Lock, LogIn, Sparkles, 
  MessageCircle, Send, X, User as UserIcon, ShieldAlert, Heart,
  ChevronRight, Swords, Radio, AlertCircle, DoorOpen, Power,
  Keyboard, UserPlus, Check, Bell, Search, Database, Copy, Globe, Info, Fingerprint,
  AlertTriangle, Terminal, Edit3, Image as ImageIcon, LayoutGrid, Plus, Timer, RefreshCw
} from 'lucide-react';

const GAME_TIPS = [
  "O Gelo rápido é sua melhor defesa em campo aberto.",
  "Mantenha o colete sempre reparado para reduzir o dano.",
  "Mudar de posição após atirar evita que o squad inimigo te flanqueie.",
  "Habilidades como Alok e Kelly formam combos imbatíveis.",
  "A zona final causa dano massivo, não se atrase!",
  "Usar silenciador em Rifles de Precisão confunde o inimigo."
];

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Toby',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Buster',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Garrett',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Loki',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Coco'
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

type NavTab = 'play' | 'ranking' | 'social' | 'profile';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentNav, setCurrentNav] = useState<NavTab>('play');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [currentTip, setCurrentTip] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('Médio');
  const [showDamageEffect, setShowDamageEffect] = useState(false);
  
  // States do Ranking
  const [globalRanking, setGlobalRanking] = useState<any[]>([]);
  
  // States do Social
  const [socialTab, setSocialTab] = useState<'friends' | 'discover'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [discoverUsers, setDiscoverUsers] = useState<any[]>([]);
  const [invites, setInvites] = useState<{ roomCode: string, senderName: string }[]>([]);
  
  // States do Perfil (Editáveis) - Inicializados vazios para evitar resets acidentais
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  // Auth
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'guest'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authAvatar, setAuthAvatar] = useState(PRESET_AVATARS[0]);

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
  const isFirstLoad = useRef(true);
  const lastNavRef = useRef<NavTab>('play');

  // Derived state para identificar o jogador local e seu status de host
  const meInGame = useMemo(() => 
    gameState.players.find(p => p.id === currentUser?.id),
    [gameState.players, currentUser?.id]
  );
  
  const isHost = useMemo(() => 
    meInGame?.is_host ?? false,
    [meInGame]
  );

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Sincronizar campos de edição APENAS na primeira vez que entra no perfil por sessão de navegação
  useEffect(() => {
    if (currentNav === 'profile' && lastNavRef.current !== 'profile' && currentUser) {
      setEditName(currentUser.name);
      setEditAvatar(currentUser.avatar || PRESET_AVATARS[0]);
    }
    lastNavRef.current = currentNav;
  }, [currentNav, currentUser]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) mapSessionUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) mapSessionUser(session.user);
      else setCurrentUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser && isFirstLoad.current) {
      isFirstLoad.current = false;
      joinUserChannel(currentUser.id, (event, payload) => {
        if (event === 'SQUAD_INVITE') {
          playSound(SOUNDS.INVITE);
          setInvites(prev => [...prev, payload]);
        }
      });
      loadAllData();
      if (!currentUser.isGuest) {
        upsertProfile(currentUser.id, currentUser.name, currentUser.avatar);
      }
    }
  }, [currentUser?.id]);

  const loadAllData = async () => {
    if (!currentUser || currentUser.isGuest) return;
    const profileRes = await fetchProfile(currentUser.id);
    if (profileRes.data) {
      setCurrentUser(prev => prev ? ({ 
        ...prev, 
        name: profileRes.data.name, 
        avatar: profileRes.data.avatar_url,
        stats: {
          wins: profileRes.data.wins,
          matches: profileRes.data.matches,
          totalScore: profileRes.data.total_score
        }
      }) : null);
    }
    loadFriends();
    loadDiscoverUsers();
    loadRanking();
  };

  const loadRanking = async () => {
    const { data } = await fetchGlobalRanking();
    setGlobalRanking(data);
  };

  const loadFriends = async () => {
    if (!currentUser || currentUser.isGuest) return;
    const { data } = await fetchFriendsList(currentUser.id);
    setFriends(data);
  };

  const loadDiscoverUsers = async () => {
    const { data } = await fetchAllProfiles();
    setDiscoverUsers(data.filter(p => p.id !== currentUser?.id));
  };

  const mapSessionUser = (supabaseUser: any) => {
    const userData = {
      id: supabaseUser.id,
      name: supabaseUser.user_metadata.name || "PLAYER",
      email: supabaseUser.email,
      isGuest: false,
      avatar: supabaseUser.user_metadata.avatar_url || PRESET_AVATARS[0],
      level: 1, xp: 0, stats: { wins: 0, matches: 0, totalScore: 0 }
    };
    setCurrentUser(userData);
  };

  const handleUpdateProfile = async () => {
    if (!currentUser || !editName.trim() || !editAvatar.trim()) {
      alert("Preencha todos os campos!");
      return;
    }
    
    setIsUpdatingProfile(true);
    
    try {
      // Se for convidado, atualiza apenas localmente
      if (currentUser.isGuest) {
        setCurrentUser(prev => prev ? ({ ...prev, name: editName.toUpperCase(), avatar: editAvatar }) : null);
        alert("Perfil de Convidado atualizado!");
        setIsUpdatingProfile(false);
        return;
      }

      const res = await updateProfileData(currentUser.id, { 
        name: editName.toUpperCase(), 
        avatar_url: editAvatar 
      });

      if (res.success) {
        setCurrentUser(prev => prev ? ({ ...prev, name: editName.toUpperCase(), avatar: editAvatar }) : null);
        
        // Sincronizar com os outros jogadores se estiver em uma sala
        if (gameState.roomCode) {
          const updatedPlayers = gameState.players.map(p => 
            p.id === currentUser.id ? { ...p, name: editName.toUpperCase(), avatar: editAvatar } : p
          );
          updateAndBroadcast({ players: updatedPlayers });
        }
        
        alert("Perfil salvo no Banco de Dados!");
      } else {
        alert(res.error || "Erro ao salvar no servidor. Tente novamente.");
      }
    } catch (e) {
      alert("Erro de conexão fatal.");
    } finally {
      setIsUpdatingProfile(false);
    }
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
        data: {
          name: authName.toUpperCase(),
          avatar_url: authAvatar
        }
      }
    });
    if (error) setAuthError(error.message);
    else alert("Verifique seu e-mail para confirmar a conta.");
    setAuthLoading(false);
  };

  const handleGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authName) return setAuthError("NICKNAME OBRIGATÓRIO");
    const guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
    setCurrentUser({
      id: guestId,
      name: authName.toUpperCase(),
      isGuest: true,
      avatar: authAvatar,
      level: 1, xp: 0, stats: { wins: 0, matches: 0, totalScore: 0 }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    resetLocalState();
    isFirstLoad.current = true;
  };

  const inviteFriend = async (friendId: string) => {
    if (!gameState.roomCode || !currentUser) return;
    await sendPrivateMessage(friendId, 'SQUAD_INVITE', {
      roomCode: gameState.roomCode,
      senderName: currentUser.name
    });
    alert("Convite enviado!");
  };

  const handleAddFriend = async (friendId: string) => {
    if (!currentUser || currentUser.isGuest) {
      alert("Crie uma conta para adicionar amigos!");
      return;
    }
    const { success, error } = await addFriendDB(currentUser.id, friendId);
    if (success) {
      loadFriends();
      alert("Amigo adicionado!");
    } else {
      alert(error || "Erro ao adicionar.");
    }
  };

  const handleStartGame = async () => {
    if (!isHost) return;
    setLoading(true);
    setLoadingMsg('Gerando Desafio...');
    try {
      const { node, imageUrl } = await generateGameQuestion(1, gameState.difficulty);
      const playersReset = gameState.players.map(p => ({ ...p, hp: 100, score: 0, hasAnswered: false, lastAnswerIdx: null }));
      updateAndBroadcast({
        view: 'Playing',
        phase: 'Question',
        currentRound: 1,
        currentQuestion: { ...node, imageUrl },
        players: playersReset
      });
    } catch (e) {
      alert("Erro ao iniciar partida.");
    }
    setLoading(false);
  };

  const handleAnswer = (choiceIdx: number) => {
    if (!currentUser || meInGame?.hasAnswered || gameState.phase !== 'Question') return;
    
    const isCorrect = choiceIdx === gameState.currentQuestion?.correctAnswerIndex;
    const newPlayers = gameState.players.map(p => {
      if (p.id === currentUser.id) {
        const damage = isCorrect ? 0 : 20;
        if (!isCorrect) {
          setShowDamageEffect(true);
          setTimeout(() => setShowDamageEffect(false), 500);
          playSound(SOUNDS.DAMAGE);
        } else {
          playSound(SOUNDS.CLICK);
        }
        return { 
          ...p, 
          hasAnswered: true, 
          lastAnswerIdx: choiceIdx, 
          score: isCorrect ? p.score + 100 : p.score,
          hp: Math.max(0, p.hp - damage)
        };
      }
      return p;
    });

    updateAndBroadcast({ players: newPlayers });
  };

  const handleNextRound = async () => {
    if (!isHost) return;
    const nextRound = gameState.currentRound + 1;
    const alivePlayers = gameState.players.filter(p => p.hp > 0);
    
    if (alivePlayers.length === 0 || nextRound > 10) {
      updateAndBroadcast({ view: 'GameOver' });
      return;
    }

    setLoading(true);
    setLoadingMsg(`Preparando Rodada ${nextRound}...`);
    try {
      const { node, imageUrl } = await generateGameQuestion(nextRound, gameState.difficulty);
      const resetAnswers = gameState.players.map(p => ({ ...p, hasAnswered: false, lastAnswerIdx: null }));
      updateAndBroadcast({
        currentRound: nextRound,
        currentQuestion: { ...node, imageUrl },
        players: resetAnswers,
        phase: 'Question'
      });
    } catch (e) { alert("Erro ao carregar rodada."); }
    setLoading(false);
  };

  const handleCreateRoom = async () => {
    if (!currentUser) return;
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setLoading(true);
    try {
      await joinRoomChannel(code, handleRealtimeMessage);
      const player: Player = { 
        id: currentUser.id, 
        name: currentUser.name, 
        is_host: true, 
        hp: 100, 
        score: 0, 
        hasAnswered: false, 
        lastAnswerIdx: null, 
        isReady: true,
        avatar: currentUser.avatar
      };
      setGameState(s => ({ ...s, view: 'Lobby', roomCode: code, players: [player], difficulty: selectedDifficulty }));
    } catch (e) { alert("Erro ao criar sala."); }
    setLoading(false);
  };

  const handleJoinRoom = async (code: string) => {
    if (!code || !currentUser) return;
    setLoading(true);
    try {
      await joinRoomChannel(code, handleRealtimeMessage);
      broadcastEvent(code, 'JOIN_REQUEST', { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar });
      setGameState(s => ({ ...s, view: 'Lobby', roomCode: code }));
    } catch (e) { alert("Erro ao entrar na sala."); }
    setLoading(false);
  };

  const handleRealtimeMessage = (event: string, payload: any) => {
    const current = gameStateRef.current;
    switch (event) {
      case 'SYNC_STATE': setGameState(s => ({ ...s, ...payload })); break;
      case 'JOIN_REQUEST':
        if (current.players.find(p => p.id === currentUser?.id)?.is_host) {
          const exists = current.players.find(p => p.id === payload.id);
          if (!exists) {
            const newPlayers = [...current.players, { ...payload, is_host: false, hp: 100, score: 0, hasAnswered: false, lastAnswerIdx: null, isReady: true }];
            updateAndBroadcast({ players: newPlayers });
          }
        }
        break;
      case 'ROOM_CLOSED': alert("Squad desfeito pelo líder."); resetLocalState(); break;
    }
  };

  const updateAndBroadcast = (newState: Partial<GameState>) => {
    setGameState(s => {
      const merged = { ...s, ...newState };
      if (s.roomCode) broadcastEvent(s.roomCode, 'SYNC_STATE', merged);
      return merged;
    });
  };

  const resetLocalState = () => {
    setGameState({ view: 'Welcome', phase: 'Question', roomCode: null, players: [], currentRound: 0, currentQuestion: null, difficulty: 'Médio' });
  };

  if (!currentUser) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white overflow-hidden relative">
      <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80')] bg-cover bg-center grayscale"></div>
      <div className="w-full max-w-md z-10 space-y-6 animate-fade-up">
        <div className="text-center space-y-3 mb-8">
          <div className="w-16 h-16 bg-[#014BAA] mx-auto rounded-3xl flex items-center justify-center shadow-2xl rotate-3 border-4 border-white animate-float"><Swords size={32}/></div>
          <h1 className="text-4xl font-bungee tracking-tight">QUIZ <span className="text-blue-500">SQUAD</span></h1>
        </div>
        
        <div className="glass-panel p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6">
           <div className="flex p-1 bg-slate-800/50 rounded-2xl">
             {['login', 'signup', 'guest'].map((mode) => (
               <button key={mode} type="button" onClick={() => { setAuthMode(mode as any); setAuthError(null); }} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${authMode === mode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>{mode}</button>
             ))}
           </div>
           
           {authError && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-[10px] font-bold uppercase flex items-center gap-2 animate-shake"><AlertTriangle size={14}/> {authError}</div>}
           
           {(authMode === 'signup' || authMode === 'guest') && (
             <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-2">Avatar Inicial</label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_AVATARS.map(url => (
                    <button key={url} type="button" onClick={() => setAuthAvatar(url)} className={`relative rounded-xl overflow-hidden border-4 transition-all aspect-square ${authAvatar === url ? 'border-blue-500 scale-105 shadow-lg' : 'border-transparent opacity-50'}`}>
                      <img src={url} className="w-full h-full object-cover" />
                      {authAvatar === url && <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center"><Check size={16} className="text-white"/></div>}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 bg-slate-800/30 p-3 rounded-2xl border border-white/5">
                  <ImageIcon size={18} className="text-slate-500"/>
                  <input 
                    type="text" 
                    placeholder="OU COLE O LINK DA IMAGEM" 
                    value={authAvatar.startsWith('http') && !PRESET_AVATARS.includes(authAvatar) ? authAvatar : ''} 
                    onChange={e => setAuthAvatar(e.target.value || PRESET_AVATARS[0])} 
                    className="flex-1 bg-transparent border-none outline-none text-[10px] font-bold text-white uppercase" 
                  />
                </div>
             </div>
           )}

           <form onSubmit={authMode === 'login' ? handleLogin : (authMode === 'signup' ? handleSignup : handleGuest)} className="space-y-4">
             {authMode !== 'login' && <input type="text" placeholder="NICKNAME" required maxLength={12} value={authName} onChange={e => setAuthName(e.target.value.toUpperCase())} className="w-full bg-slate-800/50 border border-white/5 p-4 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none text-sm" />}
             {authMode !== 'guest' && ( <>
               <input type="email" placeholder="E-MAIL" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-slate-800/50 border border-white/5 p-4 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
               <input type="password" placeholder="SENHA" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-slate-800/50 border border-white/5 p-4 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
             </> )}
             <button type="submit" disabled={authLoading} className="w-full py-5 bg-blue-600 rounded-[1.2rem] font-bold text-white text-lg shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
               {authLoading ? <Loader2 className="animate-spin"/> : 'ENTRAR'}
             </button>
           </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FA] flex flex-col text-[#001A3D] relative overflow-hidden">
      {gameState.view === 'Welcome' && (
        <header className="p-6 flex justify-between items-center z-[100] animate-fade-down">
          <div className="flex items-center gap-3 bg-white p-2 pr-6 rounded-full shadow-lg border border-white">
            <img src={currentUser?.avatar} className="w-10 h-10 rounded-full border-2 border-blue-100 object-cover shadow-sm" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Status: {currentUser?.isGuest ? 'Convidado' : 'Operador'}</span>
              <span className="font-bold text-slate-800 text-sm leading-tight">{currentUser?.name}</span>
            </div>
          </div>
          <div className="relative cursor-pointer" onClick={() => { setCurrentNav('social'); setSocialTab('friends'); }}>
            <Bell size={24} className="text-slate-400"/>
            {invites.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold animate-bounce">{invites.length}</span>}
          </div>
        </header>
      )}

      <main className="flex-1 flex flex-col relative overflow-y-auto hide-scrollbar pb-32">
        {gameState.view === 'Welcome' && (
          currentNav === 'ranking' ? (
            <div className="p-6 space-y-6 animate-fade-up">
              <div className="text-center space-y-2"><Trophy className="mx-auto text-orange-500" size={48}/><h2 className="text-3xl font-bungee">RANKING</h2></div>
              {globalRanking.length === 0 ? (
                 <div className="text-center p-10 bg-white rounded-3xl shadow-lg border-2 border-dashed border-slate-200">
                    <Database size={48} className="mx-auto text-slate-200 mb-4"/>
                    <p className="font-bold text-slate-400 uppercase text-xs">Ainda não há dados no banco.</p>
                 </div>
              ) : globalRanking.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between p-5 bg-white rounded-3xl shadow-lg border-2 border-white">
                  <div className="flex items-center gap-4">
                    <span className="font-bungee text-xl text-slate-300 w-8">{i + 1}</span>
                    <img src={p.avatar_url} className="w-12 h-12 rounded-xl object-cover bg-slate-50" />
                    <div className="flex flex-col"><span className="font-bold text-sm">{p.name}</span><span className="text-[9px] font-bold text-blue-500 uppercase">{p.wins} WINS</span></div>
                  </div>
                  <span className="font-bungee text-xl text-blue-600">{p.total_score}</span>
                </div>
              ))}
            </div>
          ) : currentNav === 'social' ? (
            <div className="p-6 space-y-6 animate-fade-up">
              <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
                <button onClick={() => setSocialTab('friends')} className={`flex-1 py-3 text-[10px] font-bold uppercase rounded-xl transition-all ${socialTab === 'friends' ? 'bg-white shadow-md' : 'text-slate-500'}`}>Amigos</button>
                <button onClick={() => { setSocialTab('discover'); loadDiscoverUsers(); }} className={`flex-1 py-3 text-[10px] font-bold uppercase rounded-xl transition-all ${socialTab === 'discover' ? 'bg-white shadow-md' : 'text-slate-500'}`}>Descobrir</button>
              </div>
              <div className="space-y-4">
                {(socialTab === 'friends' ? friends : discoverUsers).map(u => (
                  <div key={u.id} className="bg-white p-4 rounded-3xl flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-4">
                      <img src={u.avatar || (u as any).avatar_url} className="w-12 h-12 rounded-xl object-cover" />
                      <p className="font-bold text-sm">{u.name}</p>
                    </div>
                    {socialTab === 'friends' ? (
                      gameState.roomCode && <button onClick={() => inviteFriend(u.id)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase">Chamar</button>
                    ) : (
                      <button onClick={() => handleAddFriend(u.id)} className="p-3 bg-blue-600 text-white rounded-xl active:scale-90 transition-all">
                        {friends.some(f => f.id === u.id) ? <Check size={18}/> : <Plus size={18}/>}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : currentNav === 'profile' ? (
            <div className="p-6 space-y-8 animate-fade-up max-w-lg mx-auto w-full">
              <div className="text-center space-y-6">
                <div className="relative inline-block">
                  <div className="w-32 h-32 rounded-[2.5rem] mx-auto border-4 border-white shadow-2xl overflow-hidden bg-slate-200 flex items-center justify-center">
                    <img 
                      src={editAvatar || PRESET_AVATARS[0]} 
                      className="w-full h-full object-cover" 
                      alt="Preview" 
                      key={editAvatar} 
                      onError={(e) => { e.currentTarget.src = PRESET_AVATARS[0]; }}
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-3 rounded-2xl shadow-lg animate-bounce"><Edit3 size={18}/></div>
                </div>
                <h2 className="text-3xl font-bungee text-slate-800">{editName || currentUser?.name}</h2>
              </div>
              
              <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-6 border border-white">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Nickname Operacional</label>
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value.toUpperCase())} 
                    maxLength={12} 
                    className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold focus:border-blue-500 outline-none transition-all" 
                    placeholder="DIGITE SEU NICK"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Galeria Squad</label>
                  <div className="grid grid-cols-4 gap-3">
                    {PRESET_AVATARS.map(url => (
                      <button 
                        key={url} 
                        type="button" 
                        onClick={() => { setEditAvatar(url); playSound(SOUNDS.CLICK); }} 
                        className={`relative rounded-2xl overflow-hidden border-4 transition-all aspect-square ${editAvatar === url ? 'border-blue-600 scale-105 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        <img src={url} className="w-full h-full object-cover" />
                        {editAvatar === url && <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center"><Check className="text-blue-600" size={24}/></div>}
                      </button>
                    ))}
                  </div>
                  
                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Link de Avatar Externo</label>
                    <div className="flex items-center gap-3 bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus-within:border-blue-500 transition-all">
                      <ImageIcon size={20} className="text-slate-400"/>
                      <input 
                        type="text" 
                        value={editAvatar} 
                        onChange={e => setEditAvatar(e.target.value)} 
                        placeholder="https://suafoto.com/imagem.png" 
                        className="flex-1 bg-transparent text-xs font-bold outline-none text-slate-700" 
                      />
                      {editAvatar && (
                        <button onClick={() => setEditAvatar('')} className="text-slate-300 hover:text-red-500">
                          <X size={16}/>
                        </button>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-400 px-2 leading-relaxed">Nota: Se for convidado, as alterações são locais e somem ao sair.</p>
                  </div>
                </div>

                <button 
                  onClick={handleUpdateProfile} 
                  disabled={isUpdatingProfile} 
                  className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-bold shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isUpdatingProfile ? (
                    <><Loader2 className="animate-spin" size={20}/> SALVANDO...</>
                  ) : (
                    <><Check size={20}/> SALVAR ALTERAÇÕES</>
                  )}
                </button>
              </div>
              <button 
                onClick={handleLogout} 
                className="w-full py-4 text-red-500 font-bold text-xs uppercase border-2 border-red-50 rounded-2xl hover:bg-red-50 transition-colors"
              >
                SAIR DA CONTA
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center space-y-8 max-w-lg mx-auto w-full px-6 pt-10">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-6 border border-white">
                <div className="flex items-center gap-3"><ShieldAlert className="text-blue-600" size={24}/><h3 className="text-xs font-bold uppercase text-slate-400">Dificuldade da Partida</h3></div>
                <div className="grid grid-cols-3 gap-3">
                  {(['Fácil', 'Médio', 'Difícil'] as DifficultyLevel[]).map(d => (
                    <button key={d} onClick={() => setSelectedDifficulty(d)} className={`py-4 rounded-xl font-bold text-[10px] border-2 transition-all ${selectedDifficulty === d ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-105' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-blue-200'}`}>{d}</button>
                  ))}
                </div>
              </div>
              <button onClick={handleCreateRoom} className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex items-center justify-between shadow-2xl active:scale-95 hover:bg-slate-800 transition-colors group">
                <div className="text-left"><h3 className="text-2xl font-bungee group-hover:text-blue-400 transition-colors">CRIAR SQUAD</h3></div>
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center border-4 border-slate-800"><Plus size={28}/></div>
              </button>
              <div className="bg-white rounded-[2.5rem] p-2 shadow-2xl flex h-20 border border-white">
                <input 
                  type="text" 
                  placeholder="CÓDIGO" 
                  value={inputCode} 
                  onChange={e => setInputCode(e.target.value.toUpperCase())} 
                  maxLength={4} 
                  className="flex-1 px-6 font-bungee text-3xl outline-none text-blue-600" 
                />
                <button onClick={() => handleJoinRoom(inputCode)} className="w-16 bg-blue-600 rounded-2xl text-white flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-blue-700"><ChevronRight size={32}/></button>
              </div>
            </div>
          )
        )}
        
        {gameState.view === 'Lobby' && (
           <div className="flex-1 flex items-center justify-center p-6 animate-scale">
             <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-10 text-center space-y-10 shadow-2xl border-t-8 border-blue-600">
               <div className="space-y-2">
                 <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em]">CÓDIGO DO SQUAD</span>
                 <h2 className="text-7xl font-bungee text-slate-900">{gameState.roomCode}</h2>
                 <button onClick={() => { navigator.clipboard.writeText(gameState.roomCode || ''); alert('Código copiado!'); }} className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 mx-auto"><Copy size={12}/> Copiar Link</button>
               </div>
               <div className="space-y-4 max-h-60 overflow-y-auto hide-scrollbar">
                 {gameState.players.map(p => (
                   <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-white shadow-sm">
                     <div className="flex items-center gap-4">
                        <img src={p.avatar} className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm" />
                        <span className="font-bold text-slate-700 text-sm">{p.name}</span>
                     </div>
                     {p.is_host && <Crown size={18} className="text-orange-500 drop-shadow-sm"/>}
                   </div>
                 ))}
               </div>
               <div className="space-y-3">
                 <button onClick={isHost ? handleStartGame : undefined} className={`w-full py-6 rounded-2xl font-bold text-white text-xl shadow-xl transition-all active:scale-95 ${isHost ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                   {isHost ? 'INICIAR PARTIDA' : 'ESPERANDO LÍDER'}
                 </button>
                 <button onClick={resetLocalState} className="text-red-500 font-bold uppercase text-[10px] tracking-widest hover:underline">Sair do Squad</button>
               </div>
             </div>
           </div>
        )}

        {gameState.view === 'Playing' && (
          <div className={`p-6 space-y-6 animate-fade-up ${showDamageEffect ? 'animate-pulse ring-8 ring-red-500/50 rounded-3xl' : ''}`}>
            <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
              {gameState.players.map(p => (
                <div key={p.id} className={`shrink-0 bg-white p-3 rounded-2xl shadow-md border-2 transition-all ${p.hp <= 0 ? 'grayscale opacity-50' : p.hasAnswered ? 'border-green-400 scale-95' : 'border-white'}`}>
                  <div className="flex items-center gap-3">
                    <img src={p.avatar} className="w-10 h-10 rounded-xl object-cover" />
                    <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-800">{p.name}</span>{renderHP(p.hp)}</div>
                  </div>
                </div>
              ))}
            </div>

            {gameState.currentQuestion && (
              <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col flex-1 border border-white">
                 <div className="relative h-48 bg-slate-200">
                   {gameState.currentQuestion.imageUrl && <img src={gameState.currentQuestion.imageUrl} className="w-full h-full object-cover" />}
                   <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-1 rounded-full font-bungee text-xs shadow-lg">RODADA {gameState.currentRound}</div>
                 </div>
                 <div className="p-8 space-y-6">
                   <h2 className="text-xl font-bold leading-tight text-slate-800">{gameState.currentQuestion.text}</h2>
                   <div className="grid grid-cols-1 gap-3">
                     {gameState.currentQuestion.choices.map((choice, i) => {
                       const isCorrect = i === gameState.currentQuestion?.correctAnswerIndex;
                       const myAnswer = meInGame?.lastAnswerIdx === i;
                       const allAnswered = gameState.players.every(p => p.hp <= 0 || p.hasAnswered);
                       let btnClass = "bg-slate-50 border-slate-100 text-slate-700";
                       if (allAnswered) {
                         if (isCorrect) btnClass = "bg-green-500 border-green-500 text-white shadow-green-200";
                         else if (myAnswer) btnClass = "bg-red-500 border-red-500 text-white shadow-red-200";
                       } else if (myAnswer) btnClass = "bg-blue-600 border-blue-600 text-white shadow-blue-200 scale-95";

                       return (
                         <button 
                           key={i} 
                           disabled={meInGame?.hasAnswered || meInGame?.hp === 0 || allAnswered}
                           onClick={() => handleAnswer(i)}
                           className={`w-full p-5 rounded-2xl text-left font-bold text-sm border-2 transition-all flex items-center justify-between ${btnClass}`}
                         >
                           {choice}
                           {allAnswered && isCorrect && <Check size={20}/>}
                           {allAnswered && !isCorrect && myAnswer && <Skull size={20}/>}
                         </button>
                       );
                     })}
                   </div>
                 </div>
              </div>
            )}

            {gameState.players.every(p => p.hp <= 0 || p.hasAnswered) && isHost && (
              <button onClick={handleNextRound} className="w-full py-6 bg-orange-500 text-white rounded-[1.5rem] font-bungee text-xl shadow-xl animate-bounce">
                PRÓXIMA RODADA <ChevronRight className="inline" size={24}/>
              </button>
            )}
          </div>
        )}
        
        {gameState.view === 'GameOver' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-fade-up">
            <h1 className="text-7xl font-bungee text-orange-500 animate-booyah drop-shadow-2xl">BOOYAH!</h1>
            <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-4 border border-white">
              {[...gameState.players].sort((a, b) => b.score - a.score).map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl ${i === 0 ? 'bg-orange-50 border-2 border-orange-200' : 'bg-slate-50'}`}>
                   <div className="flex items-center gap-4">
                     <span className="font-bungee text-xl text-slate-300 w-6">{i + 1}</span>
                     <img src={p.avatar} className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm" />
                     <span className="font-bold text-slate-800">{p.name}</span>
                   </div>
                   <span className="font-bungee text-blue-600">{p.score}</span>
                </div>
              ))}
            </div>
            {isHost && (
              <button onClick={() => updateAndBroadcast({ view: 'Lobby' })} className="w-full max-w-sm py-6 bg-blue-600 text-white rounded-2xl font-bungee text-xl shadow-xl active:scale-95 transition-all">NOVA PARTIDA</button>
            )}
            <button onClick={resetLocalState} className="text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-slate-600">Voltar ao Início</button>
          </div>
        )}
      </main>

      {gameState.view === 'Welcome' && (
        <nav className="fixed bottom-0 left-0 right-0 z-[1000] p-6 pb-10">
          <div className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-xl rounded-[2.5rem] p-2 flex items-center justify-around shadow-2xl border border-white/10">
            <button onClick={() => setCurrentNav('play')} className={`p-4 rounded-2xl transition-all ${currentNav === 'play' ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'text-slate-500 hover:text-white'}`}><Swords size={24}/></button>
            <button onClick={() => { setCurrentNav('ranking'); loadRanking(); }} className={`p-4 rounded-2xl transition-all ${currentNav === 'ranking' ? 'bg-orange-500 text-white scale-110 shadow-lg' : 'text-slate-500 hover:text-white'}`}><Trophy size={24}/></button>
            <button onClick={() => { setCurrentNav('social'); loadFriends(); }} className={`p-4 rounded-2xl transition-all ${currentNav === 'social' ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'text-slate-500 hover:text-white'}`}><Users size={24}/></button>
            <button onClick={() => setCurrentNav('profile')} className={`p-4 rounded-2xl transition-all ${currentNav === 'profile' ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'text-slate-500 hover:text-white'}`}><UserIcon size={24}/></button>
          </div>
        </nav>
      )}

      {loading && (
        <div className="fixed inset-0 bg-slate-900/95 z-[5000] flex flex-col items-center justify-center p-10 space-y-10 text-white backdrop-blur-sm">
          <Loader2 className="animate-spin text-blue-500" size={80}/>
          <div className="text-center space-y-6 max-w-sm">
            <h2 className="text-3xl font-bungee">{loadingMsg}</h2>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
               <p className="text-blue-200/80 italic font-medium">"{currentTip || GAME_TIPS[0]}"</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
