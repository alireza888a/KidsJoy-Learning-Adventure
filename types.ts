
export interface Item {
  id: string;
  name: string;
  persianName: string;
  emoji: string;
  color: string;
  imageUrl?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  items: Item[];
}

export enum GameType {
  FLASHCARDS = 'Flashcards',
  QUIZ = 'Quiz',
  MEMORY = 'Memory',
  MATCHING = 'Matching',
  SPELLING = 'Spelling',
  ODD_ONE_OUT = 'Odd One Out'
}

export type AvatarReaction = 'idle' | 'success' | 'thinking';

// Fix: Defined missing AvatarConfig interface used in constants.tsx and Avatar.tsx
export interface AvatarConfig {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
}

export interface GameState {
  view: 'main' | 'learning_detail' | 'game_types' | 'game_cats' | 'game_active' | 'alphabet' | 'exploration_menu' | 'exploration_scene' | 'category_list';
  selectedCategory: Category | null;
  selectedGame: GameType | null;
  selectedScene?: SceneConfig | null;
  score: number;
}

export interface SceneConfig {
  id: string;
  title: string;
  icon: string;
  bgColor: string;
  categoryIds: string[];
  ambientEmojis: string[];
}
