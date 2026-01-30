
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Player, GameState, StoryNode, ViewState, DifficultyLevel, User, GameMode } from './types';
import { 
  joinRoomChannel, broadcastEvent, supabase, 
  fetchProfile, incrementPlayerStats
} from './services/supabaseService';
import { generateGameQuestion } from './services/geminiService';

// Importação de Componentes Modulares
import AuthView from './components/AuthView';
import HomeView from './components/HomeView';
import LobbyView from './components/LobbyView';
import GameplayView from './components/GameplayView';
import GameOverView from './components/GameOverView';
import ProfileView from './components/ProfileView';
import RankingView from './components/RankingView';
import Navbar from './components/Navbar';
import LoadingOverlay from './components/LoadingOverlay';

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

  const stateRef = useRef(gameState);
  useEffect(() => { stateRef.current = gameState; }, [gameState]);

  // Gerenciamento de Autenticação
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) mapUser(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) mapUser(session.user);
      else setCurrentUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const mapUser = (sbUser: any) => {
    setCurrentUser({
      id: sbUser.id, name: (sbUser.user_metadata.name || "PLAYER").toUpperCase(),
      email: sbUser.email, isGuest: false, avatar: sbUser.user_metadata.avatar_url || PRESET_AVATARS[0],
      level: 1, xp: 0, stats: { wins: 0, matches: 0, totalScore: 0 }
    });
  };

  // Handlers de Sala e Realtime
  const onRealtimeMsg = (event: string, payload: any) => {
    const cur = stateRef.current;
    if (event === 'SYNC_STATE') setGameState(s => ({ ...s, ...payload }));
    if (event === 'JOIN_REQUEST' && cur.players.find(p => p.id === currentUser?.id)?.is_host) {
      if (!cur.players.find(p => p.id === payload.id)) {
        const newP: Player = { ...payload, is_host: false, hp: 100, score: 0, hasAnswered: false, lastAnswerIdx: null, isReady: true };
        const updated = [...cur.players, newP];
        updateState({ players: updated });
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

  const createRoom = async (theme: string, rounds: number) => {
    if (!currentUser) return;
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setLoading(true);
    setLoadingMsg("Criando Sala...");
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
    try {
      await joinRoomChannel(code, onRealtimeMsg);
      broadcastEvent(code, 'JOIN_REQUEST', { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar });
      setGameState(s => ({ ...s, view: 'Lobby', roomCode: code }));
    } catch (e) { alert("Sala indisponível."); }
    setLoading(false);
  };

  // Ciclo de Vida do Jogo
  const startGame = async () => {
    setLoading(true);
    setLoadingMsg("Gerando Desafio IA...");
    try {
      const { node, imageUrl } = await generateGameQuestion(1, gameState.difficulty, gameState.gameMode, gameState.customTopic);
      updateState({
        view: 'Playing', phase: 'Question', currentRound: 1,
        currentQuestion: { ...node, imageUrl },
        players: gameState.players.map(p => ({ ...p, hp: 100, score: 0, hasAnswered: false, lastAnswerIdx: null }))
      });
    } catch (e) { alert("IA ocupada. Tente novamente."); }
    setLoading(false);
  };

  const submitAnswer = (idx: number) => {
    if (gameState.players.find(p => p.id === currentUser?.id)?.hasAnswered) return;
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
    setLoadingMsg(`Carregando Rodada ${next}...`);
    try {
      const { node, imageUrl } = await generateGameQuestion(next, gameState.difficulty, gameState.gameMode, gameState.customTopic);
      updateState({
        currentRound: next, currentQuestion: { ...node, imageUrl },
        phase: 'Question',
        players: gameState.players.map(p => ({ ...p, hasAnswered: false, lastAnswerIdx: null }))
      });
    } catch (e) { alert("Erro na API Gemini."); }
    setLoading(false);
  };

  const resetGame = () => {
    setGameState({
      view: 'Welcome', phase: 'Question', roomCode: null, players: [],
      currentRound: 0, maxRounds: 5, currentQuestion: null,
      difficulty: 'Médio', gameMode: 'Quiz', customTopic: null
    });
    setCurrentNav('play');
  };

  // Visualização Principal
  if (!currentUser) return <AuthView onGuest={setCurrentUser} />;

  return (
    <div className="min-h-screen flex flex-col relative max-w-lg mx-auto w-full">
      {gameState.view === 'Welcome' && currentNav === 'play' && (
        <HomeView 
          user={currentUser} 
          onCreate={createRoom} 
          onJoin={joinRoom} 
          onProfileClick={() => setCurrentNav('profile')}
        />
      )}
      
      {gameState.view === 'Welcome' && currentNav === 'ranking' && <RankingView />}
      {gameState.view === 'Welcome' && currentNav === 'profile' && <ProfileView user={currentUser} onBack={() => setCurrentNav('play')} />}

      {gameState.view === 'Lobby' && (
        <LobbyView 
          gameState={gameState} 
          userId={currentUser.id} 
          onStart={startGame} 
          onExit={resetGame}
          onUpdateTopic={(t) => updateState({ customTopic: t })}
        />
      )}

      {gameState.view === 'Playing' && (
        <GameplayView 
          gameState={gameState} 
          userId={currentUser.id} 
          onAnswer={submitAnswer} 
          onNext={nextRound} 
        />
      )}

      {gameState.view === 'GameOver' && (
        <GameOverView 
          players={gameState.players} 
          onRestart={resetGame} 
        />
      )}

      {gameState.view === 'Welcome' && (
        <Navbar active={currentNav} onNav={setCurrentNav} />
      )}

      {loading && <LoadingOverlay message={loadingMsg} />}
    </div>
  );
}
