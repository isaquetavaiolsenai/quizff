
export type Genre = 'Battle Royale';

export interface Player {
  id: string;
  name: string;
  is_host: boolean;
  hp: number;
  score: number;
  rank: string;
}

export interface StoryNode {
  text: string;
  imageUrl?: string;
  choices: string[];
  currentPlayerId: string;
  correctAnswerIndex: number;
}

export type ViewState = 'Welcome' | 'Auth' | 'Lobby' | 'Playing' | 'GameOver';

export interface GameState {
  view: ViewState;
  roomCode: string | null;
  players: Player[];
  currentTurn: number;
  history: StoryNode[];
}
