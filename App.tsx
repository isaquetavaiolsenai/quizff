
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
  AlertTriangle, Terminal, Edit3, Image as ImageIcon, LayoutGrid
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // States do Perfil
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

  // Jogo
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
      if (session?.user) mapSessionUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) mapSessionUser(session.user);
      else setCurrentUser(null);
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
      loadAllData();
      upsertProfile(currentUser.id, currentUser.name);
    }
  }, [currentUser]);

  const loadAllData = async () => {
    if (!currentUser) return;
    const profileRes = await fetchProfile(currentUser.id);
    if (profileRes.data) {
      setCurrentUser(prev => prev ? ({ ...prev, name: profileRes.data.name, avatar: profileRes.data.avatar_url }) : null);
      setEditName(profileRes.data.name);
      setEditAvatar(profileRes.data.avatar_url || '');
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
    if (!currentUser) return;
    const { data, error } = await fetchFriendsList(currentUser.id);
    if (error === 'TABLE_MISSING') setDbError('MISSING_TABLES');
    else setFriends(data);
  };

  const loadDiscoverUsers = async () => {
    const { data, error } = await fetchAllProfiles();
    if (error === 'TABLE_MISSING') setDbError('MISSING_TABLES');
    else setDiscoverUsers(data.filter(p => p.id !== currentUser?.id));
  };

  const mapSessionUser = (supabaseUser: any) => {
    setCurrentUser({
      id: supabaseUser.id,
      name: supabaseUser.user_metadata.name || "PLAYER",
      email: supabaseUser.email,
      isGuest: false,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + supabaseUser.id,
      level: 1, xp: 0, stats: { wins: 0, matches: 0, totalScore: 0 }
    });
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    setIsUpdatingProfile(true);
    const res = await updateProfileData(currentUser.id, { 
      name: editName.toUpperCase(), 
      avatar_url: editAvatar 
    });
    if (res.success) {
      alert("Perfil atualizado com sucesso!");
      loadAllData();
    } else {
      alert("Erro ao atualizar perfil.");
    }
    setIsUpdatingProfile(false);
  };

  // Nav Logic
  const renderNavView = () => {
    if (gameState.view !== 'Welcome') return null; // Não mostra nav em jogo ou lobby

    switch (currentNav) {
      case 'ranking': return renderRanking();
      case 'social': return renderSocial();
      case 'profile': return renderProfileEdit();
      default: return renderHome();
    }
  };

  const renderHome = () => (
    <div className="flex-1 flex flex-col justify-center space-y-8 animate-fade-up max-w-lg mx-auto w-full px-6">
      <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-white space-y-6">
        <div className="flex items-center gap-3"><ShieldAlert className="text-blue-600" size={24}/><h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Dificuldade da Missão</h3></div>
        <div className="grid grid-cols-3 gap-3">
          {(['Fácil', 'Médio', 'Difícil'] as DifficultyLevel[]).map(d => (
            <button key={d} onClick={() => setSelectedDifficulty(d)} className={`py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border-2 ${selectedDifficulty === d ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-105' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>{d}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
         <button onClick={handleCreateRoom} className="group relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 text-white flex items-center justify-between shadow-2xl transition-all hover:scale-[1.02] active:scale-95">
            <div className="relative z-10 text-left">
               <h3 className="text-2xl font-bungee mb-1">CRIAR SQUAD</h3>
               <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">Lidere sua equipe</p>
            </div>
            <div className="relative z-10 w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center border-4 border-slate-800"><Users size={28}/></div>
         </button>

         <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl border border-white space-y-6">
            <div className="flex bg-slate-50 border-2 border-slate-100 rounded-2xl p-1 items-stretch h-16">
              <input type="text" placeholder="CÓDIGO" value={inputCode} onChange={e => setInputCode(e.target.value.toUpperCase())} maxLength={4} className="flex-1 bg-transparent px-6 text-center font-bungee text-2xl text-blue-600 placeholder:text-slate-300 outline-none" />
              <button onClick={() => handleJoinRoom(inputCode)} className="w-14 bg-blue-600 rounded-xl text-white flex items-center justify-center hover:bg-blue-700 transition-all"><ChevronRight size={24}/></button>
            </div>
         </div>
      </div>
    </div>
  );

  const renderRanking = () => (
    <div className="flex-1 flex flex-col p-6 space-y-6 animate-fade-up overflow-y-auto hide-scrollbar pb-32">
      <div className="text-center space-y-2">
        <Trophy className="mx-auto text-orange-500" size={48}/>
        <h2 className="text-3xl font-bungee text-slate-900">RANKING GLOBAL</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Os melhores operadores do servidor</p>
      </div>

      <div className="space-y-3">
        {globalRanking.map((p, i) => (
          <div key={p.id} className={`flex items-center justify-between p-5 bg-white rounded-3xl border-2 transition-all ${i === 0 ? 'border-orange-200 shadow-orange-100 shadow-xl' : 'border-white shadow-lg'}`}>
            <div className="flex items-center gap-4">
              <span className={`font-bungee text-xl w-8 text-center ${i === 0 ? 'text-orange-500' : 'text-slate-300'}`}>{i + 1}</span>
              <img src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`} className="w-12 h-12 rounded-xl bg-slate-100 border-2 border-white shadow-sm" />
              <div className="flex flex-col">
                <span className="font-bold text-slate-800">{p.name}</span>
                <span className="text-[9px] font-bold text-blue-500 uppercase">{p.wins} Vitórias</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bungee text-xl text-blue-600">{p.total_score.toLocaleString()}</span>
              <p className="text-[8px] font-bold text-slate-400 uppercase">Pontos</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfileEdit = () => (
    <div className="flex-1 flex flex-col p-6 space-y-8 animate-fade-up overflow-y-auto hide-scrollbar pb-32 max-w-lg mx-auto w-full">
       <div className="text-center space-y-4">
         <div className="relative inline-block group">
           <img src={editAvatar || currentUser?.avatar} className="w-32 h-32 rounded-[2.5rem] mx-auto border-4 border-white shadow-2xl object-cover bg-slate-200" />
           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
             <div className="bg-black/40 p-2 rounded-xl text-white"><Edit3 size={20}/></div>
           </div>
         </div>
         <div>
           <h2 className="text-3xl font-bungee text-slate-900">{currentUser?.name}</h2>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Editar Identidade do Operador</p>
         </div>
       </div>

       <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-white space-y-6">
         <div className="space-y-4">
           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><UserIcon size={12}/> Nickname do Squad</label>
           <input type="text" value={editName} onChange={e => setEditName(e.target.value.toUpperCase())} maxLength={12} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:border-blue-500 outline-none transition-all" />
         </div>

         <div className="space-y-4">
           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><ImageIcon size={12}/> Link da Foto de Perfil</label>
           <input type="text" value={editAvatar} onChange={e => setEditAvatar(e.target.value)} placeholder="https://exemplo.com/foto.png" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-medium text-slate-700 focus:border-blue-500 outline-none transition-all text-xs" />
           <p className="text-[9px] text-slate-400 italic">* Use links diretos para imagens (.jpg, .png, .svg)</p>
         </div>

         <button onClick={handleUpdateProfile} disabled={isUpdatingProfile} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-bold shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
           {isUpdatingProfile ? <Loader2 className="animate-spin" size={20}/> : <Check size={20}/>}
           SALVAR ALTERAÇÕES
         </button>
       </div>

       <button onClick={handleLogout} className="w-full py-4 text-red-500 font-bold text-xs uppercase tracking-[0.2em] border-2 border-red-50 rounded-2xl hover:bg-red-50 transition-all flex items-center justify-center gap-3">
         <LogOut size={16}/> Encerrar Sessão
       </button>
    </div>
  );

  const renderSocial = () => (
    <div className="flex-1 flex flex-col p-6 space-y-6 animate-fade-up overflow-y-auto hide-scrollbar pb-32">
       <div className="flex bg-slate-200/50 p-1.5 rounded-[1.5rem]">
         <button onClick={() => setSocialTab('friends')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${socialTab === 'friends' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}>Meus Amigos</button>
         <button onClick={() => { setSocialTab('discover'); loadDiscoverUsers(); }} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${socialTab === 'discover' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}>Global</button>
       </div>

       {socialTab === 'friends' ? (
         <div className="space-y-4">
           {friends.length === 0 ? (
             <div className="text-center py-20 text-slate-400">
               <Users className="mx-auto mb-4 opacity-20" size={60}/>
               <p className="text-sm italic">Nenhum operador adicionado.</p>
             </div>
           ) : (
             friends.map(f => (
               <div key={f.id} className="bg-white p-4 rounded-3xl flex items-center justify-between shadow-lg border border-white">
                 <div className="flex items-center gap-4">
                   <img src={f.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.id}`} className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100" />
                   <div>
                     <p className="font-bold text-slate-800 text-sm">{f.name}</p>
                     <p className="text-[8px] font-mono text-slate-400">{f.id.slice(0, 16)}</p>
                   </div>
                 </div>
                 {gameState.roomCode && (
                   <button onClick={() => inviteFriend(f.id)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase">Convidar</button>
                 )}
               </div>
             ))
           )}
         </div>
       ) : (
         <div className="space-y-4">
           <div className="relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
             <input type="text" placeholder="BUSCAR OPERADOR..." value={searchQuery} onChange={e => setSearchQuery(e.target.value.toUpperCase())} className="w-full bg-white border-2 border-slate-50 p-4 pl-12 rounded-2xl text-sm outline-none focus:border-blue-200 shadow-sm" />
           </div>
           
           {(searchResults.length > 0 ? searchResults : discoverUsers).map(u => (
             <div key={u.id} className="bg-white p-5 rounded-[2rem] flex items-center justify-between shadow-xl border border-white group transition-all hover:scale-[1.02]">
                <div className="flex items-center gap-4">
                  <img src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`} className="w-14 h-14 rounded-2xl bg-slate-900 border-2 border-white shadow-lg" />
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-lg">{u.name}</span>
                    <span className="text-[9px] font-mono text-slate-400">ID: {u.id.slice(0, 20)}</span>
                  </div>
                </div>
                <button onClick={() => handleAddFriend(u.id)} disabled={friends.some(f => f.id === u.id)} className={`p-4 rounded-2xl transition-all ${friends.some(f => f.id === u.id) ? 'bg-green-50 text-green-500' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 active:scale-90'}`}>
                   {friends.some(f => f.id === u.id) ? <Check size={20}/> : <UserPlus size={20}/>}
                </button>
             </div>
           ))}
         </div>
       )}
    </div>
  );

  // Funcionalidades de Jogo
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

  const handleRealtimeMessage = (event: string, payload: any) => {
    const current = gameStateRef.current;
    switch (event) {
      case 'SYNC_STATE': setGameState(s => ({ ...s, ...payload })); break;
      case 'ROOM_CLOSED': alert("Squad encerrado."); resetLocalState(); break;
    }
  };

  const resetLocalState = () => {
    setGameState({ view: 'Welcome', phase: 'Question', roomCode: null, players: [], currentRound: 0, currentQuestion: null, difficulty: 'Médio' });
    setMessages([]);
  };

  // Fix: Added handleLogout to clear session and reset game state
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    resetLocalState();
    setCurrentNav('play');
  };

  // Fix: Added inviteFriend to send room invites via Supabase Realtime
  const inviteFriend = async (friendId: string) => {
    if (!gameState.roomCode || !currentUser) return;
    await sendPrivateMessage(friendId, 'SQUAD_INVITE', {
      roomCode: gameState.roomCode,
      senderName: currentUser.name
    });
    alert("Convite enviado!");
  };

  // Fix: Added handleAddFriend to manage friendships in Supabase
  const handleAddFriend = async (friendId: string) => {
    if (!currentUser) return;
    const { success, error } = await addFriendDB(currentUser.id, friendId);
    if (success) {
      loadFriends();
    } else {
      alert("Erro ao adicionar amigo: " + error);
    }
  };

  // Fix: Added handleGuest for guest mode authentication
  const handleGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authName) return;
    const guestUser: User = {
      id: 'guest_' + Math.random().toString(36).substr(2, 9),
      name: authName.toUpperCase(),
      isGuest: true,
      level: 1,
      xp: 0,
      stats: { wins: 0, matches: 0, totalScore: 0 },
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + authName
    };
    setCurrentUser(guestUser);
  };

  // Fix: Added handleLogin to process user sign-in
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    if (error) {
      setAuthError(error.message);
    } else if (data.user) {
      mapSessionUser(data.user);
    }
    setAuthLoading(false);
  };

  // Fix: Added handleSignup to process user registration
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
      options: {
        data: { name: authName }
      }
    });
    if (error) {
      setAuthError(error.message);
    } else {
      alert("Cadastro realizado! Verifique seu e-mail para confirmar.");
      setAuthMode('login');
    }
    setAuthLoading(false);
  };

  if (!currentUser) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white overflow-hidden relative">
      <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80')] bg-cover bg-center grayscale"></div>
      <div className="w-full max-w-sm z-10 space-y-8 animate-fade-up">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-[#014BAA] mx-auto rounded-3xl flex items-center justify-center shadow-2xl rotate-3 border-4 border-white animate-float">
            <Swords size={40}/>
          </div>
          <h1 className="text-5xl font-bungee tracking-tight">QUIZ <span className="text-blue-500">SQUAD</span></h1>
          <p className="text-blue-300/60 font-bold text-[10px] uppercase tracking-[0.3em]">Battle Royale Intelligence</p>
        </div>

        <div className="glass-panel p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6">
           <div className="flex p-1 bg-slate-800/50 rounded-2xl">
             {['login', 'signup', 'guest'].map((mode) => (
               <button key={mode} onClick={() => { setAuthMode(mode as any); setAuthError(null); }} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${authMode === mode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>{mode}</button>
             ))}
           </div>

           {authError && (
             <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 animate-shake">
               <AlertTriangle size={14}/> {authError}
             </div>
           )}

           {authMode === 'guest' ? (
             <form onSubmit={(e) => { e.preventDefault(); if(authName) { handleGuest(e); } }} className="space-y-4 animate-scale">
               <input type="text" placeholder="SEU NICKNAME" required maxLength={12} value={authName} onChange={e => setAuthName(e.target.value.toUpperCase())} className="w-full bg-slate-800/50 border border-white/5 p-4 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
               <button type="submit" className="w-full py-5 bg-blue-600 rounded-[1.2rem] font-bold text-white text-lg shadow-xl shadow-blue-600/20 active:scale-95 transition-all">INICIAR OPERAÇÃO</button>
             </form>
           ) : (
             <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="space-y-4 animate-scale">
               {authMode === 'signup' && (
                 <input type="text" placeholder="NICKNAME" required value={authName} onChange={e => setAuthName(e.target.value.toUpperCase())} className="w-full bg-slate-800/50 border border-white/5 p-4 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
               )}
               <input type="email" placeholder="E-MAIL" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-slate-800/50 border border-white/5 p-4 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
               <input type="password" placeholder="SENHA" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-slate-800/50 border border-white/5 p-4 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
               <button type="submit" disabled={authLoading} className="w-full py-5 bg-blue-600 rounded-[1.2rem] font-bold text-white text-lg shadow-xl flex items-center justify-center gap-3">
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
      {/* Header Fixo para Info rápida */}
      {gameState.view === 'Welcome' && (
        <header className="p-6 flex justify-between items-center z-[100] animate-fade-down">
          <div className="flex items-center gap-3 bg-white p-2 pr-6 rounded-full shadow-lg border border-white">
            <img src={currentUser?.avatar} className="w-10 h-10 rounded-full border-2 border-blue-100 shadow-sm" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Status: <span className="text-green-500">Online</span></span>
              <span className="font-bold text-slate-800 text-sm leading-tight">{currentUser?.name}</span>
            </div>
          </div>
          <div className="relative">
            <Bell size={24} className="text-slate-400"/>
            {invites.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold">{invites.length}</span>}
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative">
        {gameState.view === 'Welcome' ? renderNavView() : null}
        
        {gameState.view === 'Lobby' && (
           <div className="flex-1 flex items-center justify-center p-6 animate-scale">
             <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-10 text-center space-y-10 shadow-2xl border-t-8 border-blue-600 relative overflow-hidden">
               <div className="space-y-4">
                 <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-600 bg-blue-50 px-4 py-2 rounded-full">SQUAD ID</span>
                 <h2 className="text-7xl font-bungee text-slate-900 tracking-tighter">{gameState.roomCode}</h2>
               </div>
               
               <div className="space-y-4">
                 {gameState.players.map(p => (
                   <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-white">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bungee text-sm">{p.name[0]}</div>
                       <span className="font-bold text-slate-700">{p.name}</span>
                     </div>
                     {p.is_host && <Crown size={18} className="text-orange-500 fill-orange-500/20"/>}
                   </div>
                 ))}
               </div>

               <button onClick={isHost ? () => {} : () => {}} className={`w-full py-6 rounded-2xl font-bold text-white text-xl shadow-2xl ${isHost ? 'bg-blue-600' : 'bg-slate-300'}`}>
                 {isHost ? 'INICIAR PARTIDA' : 'SQUAD PRONTO'}
               </button>
               
               <button onClick={resetLocalState} className="text-red-500 text-xs font-bold uppercase tracking-widest">Sair da Sala</button>
             </div>
           </div>
        )}
      </main>

      {/* BOTTOM NAV BAR */}
      {gameState.view === 'Welcome' && (
        <nav className="fixed bottom-0 left-0 right-0 z-[1000] p-6 pb-10">
          <div className="max-w-md mx-auto bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] p-2 flex items-center justify-around shadow-2xl border border-white/10">
            <button onClick={() => setCurrentNav('play')} className={`p-4 rounded-2xl transition-all ${currentNav === 'play' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-slate-500 hover:text-white'}`}>
              <Swords size={24}/>
            </button>
            <button onClick={() => { setCurrentNav('ranking'); loadRanking(); }} className={`p-4 rounded-2xl transition-all ${currentNav === 'ranking' ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/30' : 'text-slate-500 hover:text-white'}`}>
              <Trophy size={24}/>
            </button>
            <button onClick={() => { setCurrentNav('social'); loadFriends(); }} className={`p-4 rounded-2xl transition-all ${currentNav === 'social' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-slate-500 hover:text-white'}`}>
              <Users size={24}/>
            </button>
            <button onClick={() => setCurrentNav('profile')} className={`p-4 rounded-2xl transition-all ${currentNav === 'profile' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-slate-500 hover:text-white'}`}>
              <UserIcon size={24}/>
            </button>
          </div>
        </nav>
      )}

      {loading && (
        <div className="fixed inset-0 bg-slate-900/95 z-[5000] flex flex-col items-center justify-center p-10 space-y-10 text-white">
          <Loader2 className="animate-spin text-blue-500" size={80}/>
          <div className="text-center space-y-6 max-w-sm">
            <h2 className="text-3xl font-bungee text-white">{loadingMsg}</h2>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10"><p className="text-blue-200/80 font-medium text-sm italic">"{currentTip}"</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
