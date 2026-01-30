
import React, { useState, useEffect, useRef } from 'react';
import { Player, GameState, User } from './types.ts';
import { 
  joinRoomChannel, broadcastEvent, supabase 
} from './services/supabaseService.ts';
import { generateGameQuestion } from './services/geminiService.ts';

// Imports com extensões obrigatórias para evitar tela branca
import AuthView from './components/AuthView.tsx';
import HomeView from './components/HomeView.tsx';
import LobbyView from './components/LobbyView.tsx';
import GameplayView from './components/GameplayView.tsx';
import GameOverView from './components/GameOverView.tsx';
import ProfileView from './components/ProfileView.tsx';
import RankingView from './components/RankingView.tsx';
import Navbar from './components/Navbar.tsx';
import LoadingOverlay from './components/LoadingOverlay.tsx';

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

  const stateRef = useRef(gameState);
  useEffect(() => { stateRef.current = gameState; }, [gameState]);

  // Auth Effect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) handleAuth(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) handleAuth(session.user);
      else setCurrentUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = (sbUser: any) => {
    setCurrentUser({
      id: sbUser.id,
      name: (sbUser.user_metadata.name || "PLAYER").toUpperCase(),
      email: sbUser.email,
      isGuest: false,
      avatar: sbUser.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sbUser.id}`,
      level: 1, xp: 0, stats: { wins: 0, matches: 0, totalScore: 0 }
    });
  };

  const updateState = (newState: Partial<GameState>) => {
    setGameState(s => {
      const merged = { ...s, ...newState };
      if (s.roomCode) broadcastEvent(s.roomCode, 'SYNC_STATE', merged);
      return merged;
    });
  };

  const onRealtimeMsg = (event: string, payload: any) => {
    const cur = stateRef.current;
    if (event === 'SYNC_STATE') setGameState(s => ({ ...s, ...payload }));
    if (event === 'JOIN_REQUEST' && cur.players.find(p => p.id === currentUser?.id)?.is_host) {
      if (!cur.players.find(p => p.id === payload.id)) {
        const newP: Player = { ...payload, is_host: false, hp: 100, score: 0, hasAnswered: false, lastAnswerIdx: null, isReady: true };
        updateState({ players: [...cur.players, newP] });
      }
    }
  };

  const createRoom = async (theme: string, rounds: number) => {
    if (!currentUser) return;
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setLoading(true);
    setLoadingMsg("CONFIGURANDO SERVIDOR...");
    try {
      await joinRoomChannel(code, onRealtimeMsg);
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
    setLoadingMsg("RUSHANDO NA SALA...");
    try {
      await joinRoomChannel(code, onRealtimeMsg);
      broadcastEvent(code, 'JOIN_REQUEST', { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar });
      setGameState(s => ({ ...s, view: 'Lobby', roomCode: code }));
    } catch (e) { alert("Sala não encontrada."); }
    setLoading(false);
  };

  const startGame = async () => {
    setLoading(true);
    setLoadingMsg("CARREGANDO DESAFIO...");
    try {
      const { node, imageUrl } = await generateGameQuestion(1, gameState.difficulty, gameState.gameMode, gameState.customTopic);
      updateState({
        view: 'Playing', phase: 'Question', currentRound: 1,
        currentQuestion: { ...node, imageUrl },
        players: gameState.players.map(p => ({ ...p, hp: 100, score: 0, hasAnswered: false, lastAnswerIdx: null }))
      });
    } catch (e) { alert("IA ocupada."); }
    setLoading(false);
  };

  const submitAnswer = (idx: number) => {
    const me = gameState.players.find(p => p.id === currentUser?.id);
    if (!me || me.hasAnswered) return;
    const isCorrect = idx === gameState.currentQuestion?.correctAnswerIndex;
    const updated = gameState.players.map(p => p.id === currentUser?.id ? {
      ...p, hasAnswered: true, lastAnswerIdx: idx, 
      hp: Math.max(0, p.hp - (isCorrect ? 0 : 20)),
      score: p.score + (isCorrect ? 100 : 0)
    } : p);
    updateState({ players: updated });
  };

  const nextRound = async () => {
    const next = gameState.currentRound + 1;
    if (next > gameState.maxRounds) {
      updateState({ view: 'GameOver' });
      return;
    }
    setLoading(true);
    setLoadingMsg(`RODADA ${next} INICIANDO...`);
    try {
      const { node, imageUrl } = await generateGameQuestion(next, gameState.difficulty, gameState.gameMode, gameState.customTopic);
      updateState({
        currentRound: next, currentQuestion: { ...node, imageUrl },
        phase: 'Question',
        players: gameState.players.map(p => ({ ...p, hasAnswered: false, lastAnswerIdx: null }))
      });
    } catch (e) { alert("Erro de rede."); }
    setLoading(false);
  };

  const reset = () => {
    setGameState(s => ({ ...s, view: 'Welcome', roomCode: null }));
    setCurrentNav('play');
  };

  if (!currentUser) return <AuthView onGuest={setCurrentUser} />;

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex flex-col max-w-lg mx-auto w-full shadow-2xl shadow-blue-900/20">
      <main className="flex-1 pb-32 overflow-y-auto hide-scrollbar">
        {gameState.view === 'Welcome' && (
          <>
            {currentNav === 'play' && <HomeView user={currentUser} onCreate={createRoom} onJoin={joinRoom} onProfileClick={() => setCurrentNav('profile')} />}
            {currentNav === 'ranking' && <RankingView />}
            {currentNav === 'profile' && <ProfileView user={currentUser} onBack={() => setCurrentNav('play')} />}
          </>
        )}
        
        {gameState.view === 'Lobby' && <LobbyView gameState={gameState} userId={currentUser.id} onStart={startGame} onExit={reset} onUpdateTopic={(t) => updateState({ customTopic: t })} />}
        {gameState.view === 'Playing' && <GameplayView gameState={gameState} userId={currentUser.id} onAnswer={submitAnswer} onNext={nextRound} />}
        {gameState.view === 'GameOver' && <GameOverView players={gameState.players} onRestart={reset} />}
      </main>

      {gameState.view === 'Welcome' && <Navbar active={currentNav} onNav={setCurrentNav} />}
      {loading && <LoadingOverlay message={loadingMsg} />}
    </div>
  );
}
