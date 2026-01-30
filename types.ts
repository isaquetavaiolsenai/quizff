
export type Genre = 'Battle Royale';
export type RoundPhase = 'Question' | 'Results' | 'Leaderboard';
export type DifficultyLevel = 'Fácil' | 'Médio' | 'Difícil';
export type GameMode = 'Quiz' | 'TrueFalse';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface Friend {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'in-game';
  avatar?: string;
}

export interface User {
  id: string;
  name: string;
  isGuest: boolean;
  email?: string;
  avatar?: string;
  level: number;
  xp: number;
  stats: {
    wins: number;
    matches: number;
    totalScore: number;
  };
}

export interface Player {
  id: string;
  name: string;
  is_host: boolean;
  hp: number;
  score: number;
  lastAnswerIdx: number | null;
  hasAnswered: boolean;
  isReady: boolean;
  avatar?: string;
}

export interface StoryNode {
  text: string;
  imageUrl?: string;
  choices: string[];
  correctAnswerIndex: number;
}

export type ViewState = 'Welcome' | 'Auth' | 'Lobby' | 'Playing' | 'GameOver';

export interface GameState {
  view: ViewState;
  phase: RoundPhase;
  roomCode: string | null;
  players: Player[];
  currentRound: number;
  maxRounds: number;
  currentQuestion: StoryNode | null;
  difficulty: DifficultyLevel;
  gameMode: GameMode;
  customTopic: string | null;
}
