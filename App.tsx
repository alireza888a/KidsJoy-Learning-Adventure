
import React, { useState, useEffect } from 'react';
import { CATEGORIES as INITIAL_CATEGORIES } from './constants';
import { Category, GameType, GameState, Item, SceneConfig, AvatarReaction } from './types';
import { GameEngine } from './components/Games';
import { ExplorationRoom } from './components/ExplorationRoom';
import { generateItemImage } from './services/geminiService';
import { playLocalSpeech } from './services/audioPlayer';
import { imageStorage } from './services/storage';

const RAINBOW_COLORS = [
  'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 
  'bg-blue-400', 'bg-indigo-400', 'bg-purple-400', 'bg-pink-400', 'bg-rose-400'
];

const EXPLORATION_SCENES: SceneConfig[] = [
  { 
    id: 'jungle', 
    title: 'The Wild Jungle', 
    icon: '🌴', 
    bgColor: 'bg-emerald-800', 
    categoryIds: ['animals', 'nature', 'birds'], 
    ambientEmojis: ['🌳', '🌿', '🍃', '🍀']
  },
  { 
    id: 'space', 
    title: 'Outer Space', 
    icon: '🚀', 
    bgColor: 'bg-indigo-950', 
    categoryIds: ['space', 'vehicles'], 
    ambientEmojis: ['✨', '☄️', '🌑', '🌟']
  },
  { 
    id: 'home', 
    title: 'My Sweet Home', 
    icon: '🏠', 
    bgColor: 'bg-orange-100', 
    categoryIds: ['food', 'house', 'clothes', 'toys'], 
    ambientEmojis: ['🛋️', '🪟', '🖼️', '🪴']
  },
  { 
    id: 'ocean', 
    title: 'Ocean World', 
    icon: '🐳', 
    bgColor: 'bg-sky-700', 
    categoryIds: ['sea', 'nature'], 
    ambientEmojis: ['🌊', '🫧', '🐚', '⚓']
  }
];

const SmartImage: React.FC<{ item: Item, aiImage?: string }> = ({ item, aiImage }) => {
  return (
    <div className="flex items-center justify-center w-full h-full relative">
      {aiImage ? (
        <img 
          src={aiImage} 
          alt={item.name} 
          className="max-w-full max-h-full object-contain rounded-[3rem] shadow-2xl border-4 border-white animate-in zoom-in duration-300"
        />
      ) : (
        <span className="text-[140px] drop-shadow-2xl animate-in fade-in select-none">
          {item.emoji}
        </span>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [aiImages, setAiImages] = useState<Record<string, string>>({});
  const [state, setState] = useState<GameState>({
    view: 'main',
    selectedCategory: categories[0],
    selectedGame: null,
    score: 0,
  });

  const [learningIndex, setLearningIndex] = useState(0);
  const [showPersian, setShowPersian] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  
  const currentItem = state.selectedCategory?.items[learningIndex];

  useEffect(() => {
    const loadSaved = async () => {
      const saved: Record<string, string> = {};
      for (const cat of categories) {
        for (const it of cat.items) {
          const img = await imageStorage.get(`img-${it.id}`);
          if (img) saved[it.id] = img;
        }
      }
      setAiImages(saved);
    };
    loadSaved();
  }, []);

  const triggerReaction = (reaction: AvatarReaction) => {
    // No-op placeholder since avatar is removed
  };

  const handleSpeech = async (text: string) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      // Use local speech exclusively as requested (default model)
      await playLocalSpeech(text);
    } catch (e) {
      console.error("Speech playback error", e);
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleMagicImage = async () => {
    if (!currentItem || isMagicLoading) return;
    setIsMagicLoading(true);
    try {
      const b64 = await generateItemImage(currentItem.name);
      if (b64) {
        const fullImg = `data:image/png;base64,${b64}`;
        setAiImages(prev => ({ ...prev, [currentItem.id]: fullImg }));
        await imageStorage.set(`img-${currentItem.id}`, fullImg);
      }
    } catch (e: any) {
      console.error("Magic fail", e);
    } finally {
      setIsMagicLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-white overflow-hidden relative font-kids">
      {state.view === 'main' && (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
          <div className="bg-[#FFD233] pt-[calc(var(--safe-top)+2rem)] pb-10 px-6 rounded-b-[4rem] shadow-xl flex flex-col items-center flex-shrink-0 z-10 relative">
            <h1 className="text-5xl font-kids text-white uppercase tracking-tighter drop-shadow-md">KIDS JOY</h1>
            <p className="text-white/80 font-bold text-xs mt-2 tracking-[0.3em] uppercase">Learning Adventure</p>
          </div>
          
          <div className="flex-1 flex flex-col justify-center p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6 h-[70%] max-h-[600px]">
              <button onClick={() => setState({ ...state, view: 'exploration_menu' })} className="bg-[#A855F7] p-6 rounded-[3.5rem] shadow-2xl flex flex-col items-center justify-center space-y-4 btn-tap border-b-[10px] border-purple-800">
                <span className="text-7xl drop-shadow-lg">🔍</span>
                <span className="text-2xl font-kids text-white tracking-widest uppercase">Discover</span>
              </button>
              <button onClick={() => setState({ ...state, view: 'category_list' })} className="bg-[#3B82F6] p-6 rounded-[3.5rem] shadow-2xl flex flex-col items-center justify-center space-y-4 btn-tap border-b-[10px] border-blue-800">
                <span className="text-7xl drop-shadow-lg">📚</span>
                <span className="text-2xl font-kids text-white tracking-widest uppercase">Learn</span>
              </button>
              <button onClick={() => setState({ ...state, view: 'game_types' })} className="bg-[#FF7043] p-6 rounded-[3.5rem] shadow-2xl flex flex-col items-center justify-center space-y-4 btn-tap border-b-[10px] border-orange-700">
                <span className="text-7xl drop-shadow-lg">🎮</span>
                <span className="text-2xl font-kids text-white tracking-widest uppercase">Play</span>
              </button>
              <button onClick={() => setState({ ...state, view: 'alphabet' })} className="bg-[#22C55E] p-6 rounded-[3.5rem] shadow-2xl flex flex-col items-center justify-center space-y-4 btn-tap border-b-[10px] border-green-700">
                <span className="text-7xl drop-shadow-lg">🔤</span>
                <span className="text-2xl font-kids text-white tracking-widest uppercase">ABC</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {state.view === 'category_list' && (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden animate-in slide-in-from-bottom duration-500">
          <div className="bg-[#3B82F6] pt-[calc(var(--safe-top)+0.5rem)] pb-6 px-6 rounded-b-[3.5rem] shadow-xl flex items-center justify-between z-10">
            <button onClick={() => setState({...state, view: 'main'})} className="bg-white/30 w-12 h-12 rounded-full text-white flex items-center justify-center text-2xl shadow-inner btn-tap">🏠</button>
            <h1 className="text-2xl font-kids text-white uppercase tracking-widest">Library</h1>
            <div className="w-12"></div>
          </div>
          <div className="flex-1 p-6 grid grid-cols-3 gap-4 overflow-y-auto scroll-container hide-scrollbar pb-24">
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => { setState({ ...state, view: 'learning_detail', selectedCategory: cat }); setLearningIndex(0); }} 
                className={`${cat.color} aspect-square rounded-[2.5rem] shadow-lg text-white flex flex-col items-center justify-center btn-tap border-b-6 border-black/15`}
              >
                <span className="text-5xl">{cat.icon}</span>
                <span className="text-[11px] font-black mt-3 uppercase text-center px-1 leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {state.view === 'exploration_menu' && (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden animate-in slide-in-from-right">
          <div className="bg-[#A855F7] pt-[calc(var(--safe-top)+0.5rem)] pb-6 px-6 rounded-b-[3rem] shadow-xl flex items-center justify-between z-10">
            <button onClick={() => setState({...state, view: 'main'})} className="bg-white/40 w-12 h-12 rounded-full text-white flex items-center justify-center text-2xl shadow-inner btn-tap">🏠</button>
            <h1 className="text-2xl font-kids text-white uppercase tracking-widest">SCENES</h1>
            <div className="w-12"></div>
          </div>
          <div className="flex-1 p-6 space-y-6 overflow-y-auto scroll-container hide-scrollbar pb-20">
            {EXPLORATION_SCENES.map(scene => (
              <button 
                key={scene.id} 
                onClick={() => setState({ ...state, view: 'exploration_scene', selectedScene: scene })}
                className={`w-full ${scene.bgColor} p-8 rounded-[3.5rem] border-b-8 border-black/20 shadow-xl flex items-center justify-between transition-all btn-tap`}
              >
                <div className="flex items-center space-x-6 text-white">
                  <span className="text-7xl drop-shadow-xl">{scene.icon}</span>
                  <span className="text-2xl font-kids uppercase tracking-wider">{scene.title}</span>
                </div>
                <span className="text-4xl text-white opacity-50">👉</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {state.view === 'exploration_scene' && state.selectedScene && (
        <ExplorationRoom 
          scene={state.selectedScene} 
          onBack={() => setState({ ...state, view: 'exploration_menu' })} 
          onReaction={triggerReaction}
        />
      )}

      {state.view === 'learning_detail' && currentItem && (
        <div className="flex-1 flex flex-col overflow-hidden bg-white pb-[var(--safe-bottom)] animate-in zoom-in duration-300">
          <div className="bg-[#FFD233] pt-[calc(var(--safe-top)+0.5rem)] pb-4 px-6 rounded-b-[2.5rem] shadow-sm flex items-center justify-between z-40">
            <button onClick={() => setState({...state, view: 'category_list'})} className="bg-white/40 w-11 h-11 rounded-full text-white flex items-center justify-center text-xl shadow-inner btn-tap">⬅️</button>
            <div className="flex flex-col items-center">
              <h1 className="text-xl font-kids text-white uppercase font-bold tracking-widest leading-none">{state.selectedCategory?.name}</h1>
              <span className="text-[10px] font-black text-indigo-800 mt-1 uppercase tracking-widest">{learningIndex + 1} / 20</span>
            </div>
            <button onClick={() => setState({...state, view: 'main'})} className="bg-white/40 w-11 h-11 rounded-full text-white flex items-center justify-center text-xl shadow-inner btn-tap">🏠</button>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-50">
            <div className="w-full max-w-[360px] flex-1 flex flex-col justify-center items-center relative">
              <div onClick={() => setShowPersian(!showPersian)} className={`w-full aspect-square rounded-[4rem] shadow-2xl flex flex-col items-center justify-center relative border-[2px] transition-all duration-500 overflow-hidden p-8 ${showPersian ? 'bg-indigo-600 border-indigo-400' : 'bg-white border-slate-50'}`}>
                {!showPersian && (
                  <div className="absolute top-6 right-6 flex flex-col space-y-4 z-50">
                    <button onClick={(e) => { e.stopPropagation(); handleSpeech(currentItem.name); }} className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-3xl text-white shadow-lg border-2 border-white btn-tap">🔊</button>
                    <button onClick={(e) => { e.stopPropagation(); handleMagicImage(); }} disabled={isMagicLoading} className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl text-white shadow-lg border-2 border-white btn-tap ${isMagicLoading ? 'bg-slate-300' : 'bg-magic magic-btn-active'}`}>
                      {isMagicLoading ? '⏳' : '🪄'}
                    </button>
                  </div>
                )}

                {!showPersian ? (
                  <div className="flex flex-col items-center justify-center w-full h-full">
                    <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                      <SmartImage 
                        key={currentItem.id}
                        item={currentItem} 
                        aiImage={aiImages[currentItem.id]}
                      />
                    </div>
                    <div className="mt-8 bg-indigo-50 px-10 py-3 rounded-2xl border border-indigo-100">
                      <span className="text-4xl font-kids text-indigo-700 uppercase tracking-widest">{currentItem.name}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 w-full flex flex-col items-center justify-center text-center p-8 animate-in zoom-in">
                    <h2 className="text-7xl font-kids text-white mb-6 drop-shadow-lg" dir="rtl">{currentItem.persianName}</h2>
                    <p className="text-lg text-white/20 font-black tracking-widest mt-10 uppercase">Tap to Go Back</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center space-x-12 mt-10">
                <button onClick={() => { setLearningIndex(p => (p > 0 ? p - 1 : 19)); setShowPersian(false); }} className="w-20 h-20 bg-white rounded-full text-4xl flex items-center justify-center shadow-lg border border-slate-100 btn-tap">👈</button>
                <button onClick={() => { setLearningIndex(p => (p < 19 ? p + 1 : 0)); setShowPersian(false); }} className="w-20 h-20 bg-indigo-600 rounded-full text-4xl flex items-center justify-center shadow-lg text-white btn-tap">👉</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {state.view === 'alphabet' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 animate-in slide-in-from-left">
          <div className="bg-[#22C55E] pt-[calc(var(--safe-top)+0.5rem)] pb-4 px-6 rounded-b-[3.5rem] shadow-xl flex items-center justify-between z-30">
            <button onClick={() => setState({...state, view: 'main'})} className="bg-white/40 w-12 h-12 rounded-full text-white flex items-center justify-center text-2xl shadow-inner btn-tap">🏠</button>
            <h1 className="text-3xl font-kids text-white uppercase tracking-tighter">ABC ROOM</h1>
            <div className="w-12"></div>
          </div>
          <div className="flex-1 p-6 grid grid-cols-2 gap-5 overflow-y-auto scroll-container hide-scrollbar pb-20">
            {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter, idx) => (
              <button key={letter} onClick={() => { handleSpeech(letter); triggerReaction('success'); }} className={`aspect-square ${RAINBOW_COLORS[idx % RAINBOW_COLORS.length]} rounded-[3.5rem] shadow-xl border-b-[12px] border-black/15 flex items-center justify-center text-8xl font-kids text-white active:translate-y-2 active:border-b-0 transition-all btn-tap`}>
                {letter}
              </button>
            ))}
          </div>
        </div>
      )}

      {state.view === 'game_active' && state.selectedCategory && state.selectedGame && (
        <GameEngine 
          category={state.selectedCategory} 
          gameType={state.selectedGame} 
          onBack={() => setState({ ...state, view: 'game_types' })} 
          onReaction={triggerReaction}
        />
      )}

      {(state.view === 'game_types' || state.view === 'game_cats') && (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 animate-in slide-in-from-bottom">
          <div className="bg-[#FF7043] pt-[calc(var(--safe-top)+0.5rem)] pb-5 px-6 rounded-b-[3.5rem] shadow-xl flex items-center justify-between z-30">
             <button onClick={() => setState({...state, view: 'main'})} className="bg-white/40 w-12 h-12 rounded-full text-white flex items-center justify-center text-2xl shadow-inner btn-tap">🏠</button>
             <h1 className="text-2xl font-kids text-white uppercase tracking-widest">ARCADE</h1>
             <div className="w-12"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-container hide-scrollbar pb-20">
            {state.view === 'game_types' ? (
              Object.values(GameType).map(type => (
                <button key={type} onClick={() => setState({ ...state, selectedGame: type, view: 'game_cats' })} className="w-full flex items-center p-8 bg-white rounded-[3.5rem] border-b-8 border-slate-200 shadow-xl active:translate-y-2 active:border-b-0 transition-all btn-tap">
                  <span className="text-7xl mr-6">{type === GameType.FLASHCARDS ? '🗂️' : type === GameType.QUIZ ? '❓' : type === GameType.MEMORY ? '🧠' : type === GameType.MATCHING ? '🧩' : type === GameType.SPELLING ? '✏️' : '🔍'}</span>
                  <div className="text-left">
                    <span className="text-3xl font-kids text-orange-600 uppercase block leading-none">{type}</span>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">TAP TO PLAY!</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="grid grid-cols-2 gap-5 pb-8">
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => setState({ ...state, selectedCategory: cat, view: 'game_active' })} className={`${cat.color} p-8 rounded-[3.5rem] shadow-xl text-white flex flex-col items-center active:scale-90 transition-all border-b-8 border-black/10 btn-tap`}>
                    <span className="text-6xl drop-shadow-lg">{cat.icon}</span>
                    <span className="text-[13px] font-black mt-4 uppercase text-center px-1">{cat.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
