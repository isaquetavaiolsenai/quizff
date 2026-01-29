
import React, { useState, useEffect } from 'react';
import { Player, GameState, ViewState, StoryNode } from './types';
import { supabase, signUp, signIn, createRoom, joinRoom, subscribeRoom, broadcastState } from './services/supabaseService';
import { generateGameNode } from './services/geminiService';
import { Flame, Users, Target, Zap, Trophy, LogOut, Loader2, Play, AlertTriangle, CheckCircle, Skull, ChevronRight } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Processando...');
  const [urlError, setUrlError] = useState<string | null>(null);
  
  const [gameState, setGameState] = useState<GameState>({
    view: 'Welcome',
    roomCode: null,
    players: [],
    currentTurn: 0,
    history: []
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [inputCode, setInputCode] = useState('');

  // Sincronização de Sessão e Erros de URL
  useEffect(() => {
    // Detectar erro de OTP expirado ou acesso negado (sua imagem de erro)
    const hash = window.location.hash;
    if (hash.includes('error')) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      const errorDesc = params.get('error_description')?.replace(/\+/g, ' ');
      if (errorDesc) setUrlError(errorDesc);
    }

    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Sincronização Realtime da Sala
  useEffect(() => {
    if (gameState.roomCode) {
      return subscribeRoom(
        gameState.roomCode,
        (players) => setGameState(s => ({ ...s, players })),
        (remote) => {
          if (remote.view || remote.history) {
            setGameState(s => ({ ...s, ...remote }));
          }
        }
      );
    }
  }, [gameState.roomCode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMsg('Conectando ao Squad...');
    try {
      if (authMode === 'signup') {
        await signUp(email, password, nickname);
        alert('E-mail enviado! Confirme para ativar seu cadastro.');
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      alert('Falha na autenticação: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    setLoadingMsg('Gerando Frequência de Rádio...');
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const name = user?.user_metadata?.display_name || 'Jogador';
    try {
      const player = await createRoom(code, name, user.id);
      setGameState(s => ({ ...s, roomCode: code, players: [player], view: 'Lobby' }));
    } catch (err: any) { alert('Erro ao criar sala. Verifique se as tabelas "rooms" e "players" existem no seu Supabase.'); }
    setLoading(false);
  };

  const handleJoinRoom = async () => {
    if (!inputCode) return;
    setLoading(true);
    setLoadingMsg('Sincronizando com Aliados...');
    const name = user?.user_metadata?.display_name || 'Jogador';
    try {
      const player = await joinRoom(inputCode, name, user.id);
      setGameState(s => ({ ...s, roomCode: inputCode, view: 'Lobby' }));
    } catch (err: any) { alert('Sala não encontrada.'); }
    setLoading(false);
  };

  const startGame = async () => {
    setLoading(true);
    setLoadingMsg('IA Mestre despertando...');
    try {
      const { node, imageUrl } = await generateGameNode(gameState.players, []);
      const nextState: Partial<GameState> = {
        view: 'Playing',
        history: [{ ...node, imageUrl }],
        currentTurn: 0
      };
      setGameState(s => ({ ...s, ...nextState } as GameState));
      broadcastState(gameState.roomCode!, nextState);
    } catch (err) { alert('Erro na IA.'); }
    setLoading(false);
  };

  const makeChoice = async (idx: number) => {
    const current = gameState.history[gameState.history.length - 1];
    if (user.id !== current.currentPlayerId) return;

    setLoading(true);
    const isCorrect = idx === current.correctAnswerIndex;
    setLoadingMsg(isCorrect ? 'ESTRATÉGIA BOOYAH!' : 'EMBOSCADA! VOCÊ FOI ATINGIDO!');

    const updatedPlayers = gameState.players.map(p => {
      if (p.id === user.id) {
        const newHp = isCorrect ? p.hp : Math.max(0, p.hp - 25);
        return { 
          ...p, 
          hp: newHp,
          score: isCorrect ? p.score + 100 : p.score,
          rank: newHp === 0 ? 'ELIMINADO' : p.rank
        };
      }
      return p;
    });

    const activePlayers = updatedPlayers.filter(p => p.hp > 0);
    if (activePlayers.length === 0) {
      const gameOverState: Partial<GameState> = { view: 'GameOver', players: updatedPlayers };
      setGameState(s => ({ ...s, ...gameOverState } as GameState));
      broadcastState(gameState.roomCode!, gameOverState);
      setLoading(false);
      return;
    }

    try {
      const { node, imageUrl } = await generateGameNode(updatedPlayers, gameState.history, idx);
      const nextState: Partial<GameState> = {
        players: updatedPlayers,
        currentTurn: gameState.currentTurn + 1,
        history: [...gameState.history, { ...node, imageUrl }]
      };
      setGameState(s => ({ ...s, ...nextState } as GameState));
      broadcastState(gameState.roomCode!, nextState);
    } catch (err) { alert('Falha na IA.'); }
    setLoading(false);
  };

  // Renders de Erro
  if (urlError) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border-2 border-red-500/40 p-10 rounded-[2.5rem] text-center space-y-6 shadow-2xl">
        <AlertTriangle className="text-red-500 mx-auto" size={80} />
        <h2 className="text-3xl font-bungee text-white">ERRO DE ACESSO</h2>
        <p className="text-slate-400 font-bold">{urlError}</p>
        <p className="text-xs text-slate-500 uppercase tracking-widest">O link de e-mail pode ter expirado ou o redirecionamento falhou.</p>
        <button onClick={() => window.location.href = window.location.origin} className="w-full py-5 bg-orange-600 rounded-2xl text-white font-black hover:bg-orange-500 transition-all">TENTAR NOVAMENTE</button>
      </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="scanline opacity-10" />
      <div className="max-w-md w-full bg-[#0f172a]/95 border border-orange-500/20 p-10 rounded-[3rem] shadow-2xl space-y-8 animate-in fade-in zoom-in duration-500 relative z-10">
        <div className="text-center space-y-2">
          <div className="ff-gradient w-24 h-24 rounded-3xl mx-auto flex items-center justify-center ff-glow rotate-3 border-4 border-white/5">
            <Flame className="text-white" size={48} />
          </div>
          <h1 className="text-5xl font-bungee text-white">SQUAD <span className="text-orange-600">JOIN</span></h1>
          <p className="text-slate-500 font-black text-[10px] tracking-[0.4em] uppercase">Seja Bem-vindo à Arena</p>
        </div>

        <div className="flex bg-[#020617] p-2 rounded-2xl gap-2">
          <button onClick={() => setAuthMode('login')} className={`flex-1 py-4 rounded-xl text-xs font-black uppercase transition-all ${authMode === 'login' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500'}`}>LOGIN</button>
          <button onClick={() => setAuthMode('signup')} className={`flex-1 py-4 rounded-xl text-xs font-black uppercase transition-all ${authMode === 'signup' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500'}`}>REGISTRO</button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {authMode === 'signup' && (
            <input type="text" placeholder="NICKNAME" required value={nickname} onChange={e => setNickname(e.target.value.toUpperCase())} className="w-full bg-[#020617] border-2 border-slate-800 p-5 rounded-2xl text-white font-bold focus:border-orange-500 outline-none transition-all" />
          )}
          <input type="email" placeholder="EMAIL" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#020617] border-2 border-slate-800 p-5 rounded-2xl text-white font-bold focus:border-orange-500 outline-none transition-all" />
          <input type="password" placeholder="SENHA" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#020617] border-2 border-slate-800 p-5 rounded-2xl text-white font-bold focus:border-orange-500 outline-none transition-all" />
          <button disabled={loading} className="w-full py-6 ff-gradient rounded-2xl font-black text-white text-xl uppercase tracking-widest ff-glow flex items-center justify-center gap-3">
            {loading ? <Loader2 className="animate-spin" /> : <Play size={24} fill="white" />}
            {authMode === 'login' ? 'INICIAR PARTIDA' : 'CRIAR SOLDADO'}
          </button>
        </form>
      </div>
    </div>
  );

  if (gameState.view === 'Welcome') return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 relative">
      <div className="scanline opacity-20" />
      <div className="max-w-4xl w-full text-center space-y-16 relative z-10">
        <header className="space-y-4 animate-in slide-in-from-top duration-700">
           <h2 className="text-orange-500 font-black text-2xl tracking-[0.6em] uppercase">Status: Online</h2>
           <h1 className="text-[12rem] font-bungee text-white leading-none drop-shadow-2xl">BOOYAH!</h1>
           <div className="bg-slate-900/80 py-4 px-10 rounded-full border border-orange-500/20 inline-flex mx-auto items-center gap-4">
              <CheckCircle className="text-emerald-500" size={24} />
              <span className="text-white font-black uppercase text-xl">{user?.user_metadata?.display_name || 'RECRUTA'}</span>
           </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
           <button onClick={handleCreateRoom} className="group bg-[#0f172a] border-4 border-slate-800 p-16 rounded-[4rem] hover:border-orange-600 transition-all flex flex-col items-center gap-8 shadow-2xl hover:-translate-y-4">
              <div className="p-8 bg-slate-800 rounded-3xl group-hover:bg-orange-600 transition-all shadow-xl">
                <Target size={80} className="text-slate-400 group-hover:text-white" />
              </div>
              <span className="font-bungee text-4xl text-white uppercase">CRIAR SALA</span>
              <p className="text-slate-500 text-xs font-black tracking-widest uppercase">Assuma a liderança do Squad</p>
           </button>

           <div className="bg-[#0f172a] border-4 border-slate-800 p-16 rounded-[4rem] flex flex-col items-center gap-8 shadow-2xl">
              <div className="p-8 bg-slate-800 rounded-3xl shadow-xl">
                <Users size={80} className="text-slate-400" />
              </div>
              <div className="w-full space-y-6">
                <input type="text" placeholder="CÓDIGO" value={inputCode} onChange={e => setInputCode(e.target.value.toUpperCase())} maxLength={4} className="w-full bg-[#020617] border-4 border-slate-800 p-6 rounded-3xl text-white text-center font-bungee text-6xl focus:border-orange-500 outline-none transition-all shadow-inner" />
                <button onClick={handleJoinRoom} className="w-full py-6 bg-orange-600 rounded-3xl text-white font-black text-2xl uppercase tracking-[0.4em] hover:bg-orange-500 transition-all shadow-lg active:scale-95">UNIR-SE</button>
              </div>
           </div>
        </div>

        <button onClick={() => supabase.auth.signOut()} className="text-slate-600 hover:text-red-500 font-black uppercase tracking-[0.5em] text-sm flex items-center gap-3 transition-colors mx-auto">
          <LogOut size={20} /> ENCERRAR SESSÃO
        </button>
      </div>
    </div>
  );

  if (gameState.view === 'Lobby') return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-[#0f172a]/95 backdrop-blur-3xl p-14 rounded-[4rem] border-t-[14px] border-orange-600 shadow-2xl space-y-12 text-center relative overflow-hidden">
        <div className="space-y-4 relative z-10">
          <p className="text-xs font-black text-slate-500 uppercase tracking-[0.6em]">ID DA SALA</p>
          <h2 className="text-9xl font-bungee text-white drop-shadow-xl">{gameState.roomCode}</h2>
        </div>

        <div className="space-y-8 relative z-10">
          <h3 className="text-sm font-black text-orange-500 uppercase flex items-center justify-center gap-4">
             <Users size={28} /> SQUAD ATIVO ({gameState.players.length}/4)
          </h3>
          <div className="space-y-4">
             {gameState.players.map((p, i) => (
               <div key={p.id} className="bg-[#020617] p-6 rounded-[2rem] border border-white/5 flex items-center justify-between group hover:border-orange-500/50 transition-all shadow-xl">
                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center font-bungee text-orange-500 text-3xl shadow-inner">
                        {i + 1}
                     </div>
                     <div className="text-left">
                       <span className="font-black text-white text-2xl uppercase block">{p.name}</span>
                       <span className="text-[10px] text-slate-500 font-black tracking-widest">{p.id === user.id ? 'VOCÊ' : 'SOLDADO'}</span>
                     </div>
                  </div>
                  {p.is_host && <div className="bg-yellow-500/10 p-4 rounded-2xl border border-yellow-500/30"><Zap size={28} className="text-yellow-500 fill-yellow-500 animate-pulse" /></div>}
               </div>
             ))}
             {gameState.players.length < 2 && (
               <div className="py-14 text-slate-700 font-black uppercase text-sm tracking-[0.5em] animate-pulse italic">Escaneando aliados...</div>
             )}
          </div>
        </div>

        <div className="relative z-10">
          {gameState.players.find(p => p.id === user.id)?.is_host ? (
            <button onClick={startGame} disabled={gameState.players.length < 2 || loading} className="w-full py-9 ff-gradient ff-glow rounded-[2.5rem] font-black text-white text-4xl uppercase tracking-[0.4em] disabled:opacity-30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-6 shadow-2xl">
              {loading ? <Loader2 className="animate-spin" /> : <Play fill="white" size={48} />} GO!
            </button>
          ) : (
            <div className="flex flex-col items-center gap-8 py-12 bg-[#020617] rounded-[3rem] border border-white/5 shadow-inner">
              <Loader2 className="animate-spin text-orange-500" size={56} />
              <p className="text-sm font-black text-orange-500 uppercase tracking-[0.6em] animate-pulse">Aguardando Líder do Squad...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const currentNode = gameState.history[gameState.history.length - 1];
  const isMyTurn = currentNode?.currentPlayerId === user.id;
  const activePlayer = gameState.players.find(p => p.id === currentNode?.currentPlayerId);

  if (gameState.view === 'Playing') return (
    <div className="min-h-screen bg-[#020617] flex flex-col font-inter selection:bg-orange-500/30">
      <header className="p-8 bg-[#0f172a]/95 border-b-4 border-orange-500/20 flex justify-between items-center sticky top-0 z-50 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-8">
           <div className="ff-gradient p-5 rounded-[2rem] shadow-orange-500/40 shadow-2xl border-2 border-white/10 rotate-3"><Flame className="text-white" size={40} /></div>
           <div>
             <div className="text-[14px] font-black text-orange-500 uppercase tracking-[0.5em] mb-2 animate-pulse">Arena de Combate Elite</div>
             <div className="text-4xl font-bungee text-white tracking-tight">FREQ: {gameState.roomCode}</div>
           </div>
        </div>
        <div className="flex gap-8">
           {gameState.players.map(p => (
             <div key={p.id} className={`px-8 py-5 rounded-[2rem] border-2 flex flex-col gap-4 transition-all duration-700 ${p.id === activePlayer?.id ? 'border-orange-500 bg-orange-600/20 scale-110 shadow-[0_0_50px_rgba(234,88,12,0.4)]' : 'border-slate-800 opacity-20'}`}>
                <div className="flex justify-between items-center gap-8">
                  <span className="text-[14px] font-black text-white uppercase truncate max-w-[120px]">{p.name}</span>
                  <Trophy size={20} className="text-yellow-500" />
                </div>
                <div className="w-40 h-4 bg-slate-950 rounded-full overflow-hidden p-1 shadow-inner ring-1 ring-white/5">
                   <div className="h-full bg-red-600 rounded-full transition-all duration-1000" style={{ width: `${p.hp}%` }} />
                </div>
             </div>
           ))}
        </div>
      </header>

      <main className="flex-1 p-10 md:p-20 flex flex-col xl:flex-row gap-20 max-w-[1920px] mx-auto w-full relative">
        <div className="flex-1 space-y-14 animate-in fade-in slide-in-from-bottom-10 duration-1000">
           {/* Visual Scene */}
           <div className="relative rounded-[6rem] overflow-hidden border-[10px] border-[#0f172a] shadow-[0_100px_200px_-50px_rgba(0,0,0,1)] ring-8 ring-orange-500/5 group">
              {currentNode.imageUrl ? (
                <img src={currentNode.imageUrl} className="w-full aspect-video object-cover group-hover:scale-110 transition-all duration-[20s] ease-linear" alt="Battle Scene" />
              ) : (
                <div className="w-full aspect-video bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={100} /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/50 to-transparent" />
              <div className="absolute bottom-20 left-20 right-20">
                 <div className="bg-orange-600 w-24 h-2 mb-10 rounded-full shadow-[0_0_30px_rgba(234,88,12,1)]" />
                 <p className="text-4xl md:text-7xl font-black text-white italic drop-shadow-[0_15px_30px_rgba(0,0,0,1)] leading-[1.05] max-w-6xl">
                   "{currentNode.text}"
                 </p>
              </div>
           </div>

           {/* Interaction Section */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {currentNode.choices.map((choice, i) => (
                <button
                  key={i}
                  disabled={!isMyTurn || loading}
                  onClick={() => makeChoice(i)}
                  className={`relative p-14 rounded-[5rem] border-4 font-black text-3xl transition-all text-center flex flex-col items-center justify-center min-h-[250px] shadow-2xl ${
                    isMyTurn 
                    ? 'border-slate-800 bg-[#0f172a] text-slate-300 hover:border-orange-500 hover:bg-orange-600/25 hover:text-white hover:-translate-y-6 hover:shadow-orange-500/30' 
                    : 'border-slate-900 bg-[#020617] text-slate-800 cursor-not-allowed grayscale'
                  }`}
                >
                  <span className="relative z-10 leading-[1.2]">{choice}</span>
                </button>
              ))}
           </div>
        </div>

        <aside className="w-full xl:w-[500px] space-y-12 h-fit sticky top-48">
           {/* Leaderboard */}
           <div className="bg-[#0f172a]/95 backdrop-blur-3xl p-12 rounded-[5rem] border-4 border-slate-800 shadow-2xl space-y-10">
              <h3 className="font-bungee text-orange-500 text-3xl flex items-center gap-6"><Trophy size={40} /> RANKING ELITE</h3>
              <div className="space-y-6">
                 {gameState.players.sort((a,b) => b.score - a.score).map((p, i) => (
                   <div key={p.id} className={`flex justify-between items-center p-8 rounded-[2.5rem] transition-all ${p.id === user.id ? 'bg-orange-600/25 border-4 border-orange-500 shadow-2xl' : 'bg-[#020617]/90 border-2 border-slate-800'}`}>
                      <div className="flex items-center gap-6">
                        <span className={`text-4xl font-bungee ${i === 0 ? 'text-yellow-500' : 'text-slate-600'}`}>#{i+1}</span>
                        <div>
                          <p className="text-white font-black text-2xl uppercase leading-none mb-2">{p.name}</p>
                          <p className={`text-[12px] font-black uppercase tracking-[0.3em] ${p.hp > 0 ? 'text-emerald-500' : 'text-red-500 animate-pulse'}`}>
                             {p.hp > 0 ? 'STATUS: ATIVO' : 'STATUS: ABATIDO'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-orange-600 font-bungee text-4xl">{p.score}</span>
                        <p className="text-[10px] text-slate-700 font-black uppercase tracking-widest">PTS</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
           
           {/* Turn Status */}
           <div className={`p-12 rounded-[5rem] border-4 transition-all duration-700 shadow-2xl ${isMyTurn ? 'border-orange-500 bg-orange-600/15 shadow-orange-500/40' : 'border-slate-800 bg-slate-900/80 opacity-60 grayscale'}`}>
              <div className="flex items-center gap-8">
                 <div className={`p-6 rounded-[2.5rem] shadow-2xl ${isMyTurn ? 'bg-orange-600 shadow-orange-500/50' : 'bg-slate-800 shadow-inner'}`}>
                    {isMyTurn ? <Zap className="text-white fill-white animate-pulse" size={40} /> : <Loader2 className="animate-spin text-slate-500" size={40} />}
                 </div>
                 <div>
                    <p className="text-[14px] font-black text-slate-500 uppercase tracking-[0.5em] mb-3">Comando Neural</p>
                    <p className="text-2xl font-black text-white uppercase tracking-widest leading-none">
                       {isMyTurn ? 'RUSH AGORA!' : `ESPERANDO ${activePlayer?.name.split(' ')[0]}`}
                    </p>
                 </div>
              </div>
           </div>

           <button onClick={() => window.location.reload()} className="w-full py-8 text-slate-700 hover:text-red-500 font-black uppercase text-sm tracking-[0.6em] transition-all hover:tracking-[0.8em]">RECONEXÃO SQUAD</button>
        </aside>
      </main>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-[#020617]/99 backdrop-blur-[150px] z-[200] flex flex-col items-center justify-center space-y-16 animate-in fade-in duration-500">
           <div className="relative scale-[2]">
              <Flame className="text-orange-600 animate-bounce" size={140} />
              <div className="absolute inset-0 bg-orange-600 blur-[150px] opacity-50 animate-pulse" />
           </div>
           <div className="text-center space-y-8">
             <h2 className="text-8xl font-bungee text-white tracking-[0.3em] animate-pulse drop-shadow-[0_0_50px_rgba(234,88,12,0.8)] uppercase">{loadingMsg}</h2>
             <div className="flex justify-center gap-6">
                {[1,2,3,4,5,6].map(i => <div key={i} className="w-5 h-5 bg-orange-600 rounded-full animate-ping shadow-[0_0_20px_rgba(234,88,12,1)]" style={{ animationDelay: `${i*0.2}s` }} />)}
             </div>
           </div>
        </div>
      )}
    </div>
  );

  if (gameState.view === 'GameOver') return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-bungee relative overflow-hidden">
       <div className="scanline opacity-40" />
       <div className="max-w-5xl w-full bg-[#0f172a] p-24 rounded-[7rem] border-8 border-slate-800 text-center space-y-20 animate-in zoom-in-50 duration-1000 shadow-[0_0_150px_rgba(0,0,0,1)] relative z-10">
          <div className="space-y-8">
             <Skull className="text-slate-800 mx-auto" size={180} />
             <h1 className="text-[14rem] text-white leading-none tracking-tighter italic drop-shadow-2xl">GAME<br/><span className="text-orange-600 drop-shadow-[0_0_60px_rgba(234,88,12,0.6)]">OVER</span></h1>
          </div>
          <div className="space-y-14">
             <p className="text-slate-500 text-3xl tracking-[0.8em] uppercase">Relatório de Batalha</p>
             <div className="grid grid-cols-1 gap-8">
                {gameState.players.sort((a,b) => b.score - a.score).map((p, i) => (
                   <div key={p.id} className={`flex justify-between items-center bg-[#020617] p-12 rounded-[4rem] border-4 transition-all ${i === 0 ? 'border-yellow-500 shadow-yellow-500/20 shadow-[0_0_80px_rgba(234,179,8,0.2)] scale-110 rotate-1' : 'border-slate-800'}`}>
                      <div className="flex items-center gap-10">
                        <span className={`text-8xl ${i === 0 ? 'text-yellow-500' : 'text-slate-700'}`}>#{i+1}</span>
                        <span className="text-5xl text-white uppercase tracking-tighter">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-7xl text-orange-600">{p.score}</span>
                        <p className="text-sm text-slate-800 font-black tracking-[0.4em] uppercase">Battle Points</p>
                      </div>
                   </div>
                ))}
             </div>
          </div>
          <button onClick={() => window.location.href = window.location.origin} className="w-full py-12 ff-gradient rounded-[4rem] text-white text-6xl hover:scale-105 active:scale-95 transition-all shadow-[0_30px_80px_rgba(234,88,12,0.5)] border-4 border-white/20">REINICIAR OPERAÇÃO</button>
       </div>
    </div>
  );

  return null;
}
