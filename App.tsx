
import React, { useState, useEffect } from 'react';
import { CATEGORIES as INITIAL_CATEGORIES } from './constants';
import { Category, GameType, GameState } from './types';
import { GameEngine } from './components/Games';
import { generateSpeech, expandCategoryItems, generateItemImage } from './services/geminiService';
import { playTTSSound, playLocalSpeech } from './services/audioPlayer';
import { imageStorage } from './services/storage';

const RAINBOW_COLORS = [
  'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 
  'bg-blue-400', 'bg-indigo-400', 'bg-purple-400', 'bg-pink-400', 'bg-rose-400'
];

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('kids_joy_v16_data');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [state, setState] = useState<GameState>({
    view: 'main',
    selectedCategory: categories[0],
    selectedGame: null,
    score: 0,
  });

  const [learningIndex, setLearningIndex] = useState(0);
  const [showPersian, setShowPersian] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [itemImage, setItemImage] = useState<string | null>(null);
  const [showAllCats, setShowAllCats] = useState(false);

  useEffect(() => {
    localStorage.setItem('kids_joy_v16_data', JSON.stringify(categories));
  }, [categories]);

  // اصلاح منطق چک کردن کلید برای کارکرد در هر محیطی
  const ensureApiKeyIsReady = async () => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
      }
    }
    return true;
  };

  const handleApiError = async (error: any) => {
    console.error("API Error Detail:", error);
    const errStr = String(error).toLowerCase();
    if (errStr.includes("key") || errStr.includes("401") || errStr.includes("403") || errStr.includes("not found")) {
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
      } else {
        alert("Please make sure your API_KEY is set correctly in your hosting environment (like Vercel or Netlify).");
      }
    }
  };

  useEffect(() => {
    const loadImage = async () => {
      if (state.view === 'learning_detail' && state.selectedCategory) {
        const item = state.selectedCategory.items[learningIndex];
        if (item) {
          const cached = await imageStorage.get(`img_v16_${item.id}`);
          setItemImage(cached);
        }
      }
    };
    loadImage();
  }, [learningIndex, state.view, state.selectedCategory]);

  const handleSpeech = async (text: string) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      let played = false;
      if (process.env.API_KEY) {
        try {
          const audio = await generateSpeech(text);
          if (audio) { await playTTSSound(audio, text); played = true; }
        } catch (e) { console.warn("Cloud TTS failed, falling back to local"); }
      }
      if (!played) await playLocalSpeech(text);
    } catch (e) { console.error("Speech error:", e); }
    finally { setIsSpeaking(false); }
  };

  const handleImageGen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const item = state.selectedCategory?.items[learningIndex];
    if (isGeneratingImg || !item) return;
    
    await ensureApiKeyIsReady();
    setIsGeneratingImg(true);
    try {
      const url = await generateItemImage(item.name, state.selectedCategory!.name);
      if (url) {
        await imageStorage.set(`img_v16_${item.id}`, url);
        setItemImage(url);
      }
    } catch (e) {
      await handleApiError(e);
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handleExpand = async () => {
    if (isExpanding || !state.selectedCategory) return;
    
    await ensureApiKeyIsReady();
    setIsExpanding(true);
    try {
      const newItems = await expandCategoryItems(state.selectedCategory.name, state.selectedCategory.items);
      if (newItems && newItems.length > 0) {
        const updated = categories.map(c => 
          c.id === state.selectedCategory!.id ? { ...c, items: [...c.items, ...newItems] } : c
        );
        setCategories(updated);
        const refreshed = updated.find(cat => cat.id === state.selectedCategory?.id);
        if (refreshed) setState(s => ({ ...s, selectedCategory: refreshed }));
      }
    } catch (e) {
      await handleApiError(e);
    } finally {
      setIsExpanding(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-white overflow-hidden relative">
      {state.view === 'main' && (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden pb-[var(--safe-bottom)]">
          <div className="bg-[#FFD233] pt-[calc(var(--safe-top)+1.5rem)] pb-8 px-6 rounded-b-[3rem] shadow-xl flex flex-col items-center flex-shrink-0 z-10">
            <h1 className="text-4xl font-kids text-white uppercase tracking-tighter drop-shadow-md">KIDS JOY</h1>
            <p className="text-white/80 font-bold text-[10px] mt-1 tracking-[0.2em] uppercase">Play and Learn!</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-container hide-scrollbar">
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setState({ ...state, view: 'alphabet' })} className="col-span-2 bg-[#22C55E] p-7 rounded-[3rem] shadow-xl flex items-center justify-center space-x-6 btn-tap border-b-8 border-green-700">
                <span className="text-6xl">🔤</span>
                <span className="text-3xl font-kids text-white tracking-widest">ABC</span>
              </button>
              <button onClick={() => setState({ ...state, view: 'game_types' })} className="col-span-2 bg-[#FF7043] p-7 rounded-[3rem] shadow-xl flex items-center justify-center space-x-6 btn-tap border-b-8 border-orange-700">
                <span className="text-6xl">🎮</span>
                <span className="text-3xl font-kids text-white tracking-widest">ARCADE</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">TOPICS</h2>
                <button onClick={() => setShowAllCats(true)} className="text-[12px] font-bold text-indigo-500 uppercase">View All</button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {categories.slice(0, 9).map(cat => (
                  <button key={cat.id} onClick={() => setState({ ...state, view: 'learning_detail', selectedCategory: cat })} className={`${cat.color} aspect-square rounded-[2.5rem] shadow-lg text-white flex flex-col items-center justify-center btn-tap border-b-4 border-black/10`}>
                    <span className="text-4xl">{cat.icon}</span>
                    <span className="text-[11px] font-black mt-2 uppercase text-center px-1">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAllCats && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="bg-slate-50 p-6 flex items-center justify-between border-b">
            <h2 className="text-2xl font-kids text-slate-800 uppercase">All Topics</h2>
            <button onClick={() => setShowAllCats(false)} className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-xl shadow-inner">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-3 gap-4 pb-12 scroll-container">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => { setState({ ...state, view: 'learning_detail', selectedCategory: cat }); setShowAllCats(false); }} className={`${cat.color} aspect-square rounded-[2.5rem] shadow-md text-white flex flex-col items-center justify-center btn-tap border-b-4 border-black/10`}>
                <span className="text-4xl">{cat.icon}</span>
                <span className="text-[10px] font-black mt-2 uppercase text-center px-1">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {state.view === 'learning_detail' && state.selectedCategory && (
        <div className="flex-1 flex flex-col overflow-hidden bg-white pb-[var(--safe-bottom)]">
          {/* HEADER WITH COUNT - REMAINED IN YELLOW SECTION */}
          <div className="bg-[#FFD233] pt-[calc(var(--safe-top)+0.5rem)] pb-4 px-6 rounded-b-[2.5rem] shadow-sm flex items-center justify-between flex-shrink-0 z-40">
            <button onClick={() => setState({...state, view: 'main'})} className="bg-white/40 w-11 h-11 rounded-full text-white flex items-center justify-center text-xl shadow-inner btn-tap">🏠</button>
            <div className="flex flex-col items-center">
              <h1 className="text-xl font-kids text-white uppercase font-bold tracking-widest leading-none">{state.selectedCategory.name}</h1>
              <div className="mt-2 bg-white px-5 py-1 rounded-full shadow-inner border border-white/50">
                <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em]">{learningIndex + 1} / {state.selectedCategory.items.length}</p>
              </div>
            </div>
            <button onClick={() => setShowAllCats(true)} className="bg-white/40 w-11 h-11 rounded-full text-white flex items-center justify-center text-xl shadow-inner btn-tap">📚</button>
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 relative">
            {/* CATEGORY STRIP */}
            <div className="flex overflow-x-auto horizontal-scroll hide-scrollbar px-6 py-3 space-x-3 bg-white/80 border-b border-slate-100 flex-shrink-0 z-30">
              {categories.map((c) => (
                <button key={c.id} onClick={() => { setState({ ...state, selectedCategory: c }); setLearningIndex(0); setShowPersian(false); }} 
                  className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center text-2xl transition-all ${state.selectedCategory?.id === c.id ? 'bg-[#FF9F1C] text-white shadow-lg ring-4 ring-orange-100 scale-105' : 'bg-white border opacity-50'}`}>{c.icon}</button>
              ))}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-4 pt-4 pb-2 overflow-hidden relative">
              {/* CENTER CARD */}
              <div className="w-full max-w-[340px] flex-1 flex flex-col justify-center relative px-2">
                <div onClick={() => setShowPersian(!showPersian)} className={`w-full aspect-square rounded-[4.5rem] shadow-2xl flex flex-col items-center justify-center relative border-[2px] transition-all duration-500 overflow-hidden ${showPersian ? 'bg-indigo-600 border-indigo-400' : 'bg-white border-slate-50'}`}>
                  
                  {/* ACTIONS ON TOP CORNERS OF THE IMAGE */}
                  {!showPersian && (
                    <>
                      <button onClick={handleImageGen} className={`absolute top-5 left-5 z-50 w-12 h-12 bg-[#F43F5E] rounded-xl flex items-center justify-center text-2xl text-white shadow-xl border-2 border-white btn-tap ${isGeneratingImg ? 'animate-spin' : ''}`}>
                        {isGeneratingImg ? '⏳' : '🎨'}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleSpeech(state.selectedCategory?.items[learningIndex]?.name || ""); }} 
                        className="absolute top-5 right-5 z-50 w-12 h-12 bg-[#6366F1] rounded-xl flex items-center justify-center text-2xl text-white shadow-xl border-2 border-white btn-tap">
                        🔊
                      </button>
                    </>
                  )}

                  {!showPersian ? (
                    <div className="flex flex-col items-center justify-center p-4 w-full h-full">
                      <div className="flex-1 w-full flex items-center justify-center overflow-hidden mb-2">
                        {itemImage ? (
                          <img src={itemImage} alt="item" className="w-[98%] h-[98%] object-contain rounded-[3.5rem] animate-in zoom-in duration-500" />
                        ) : (
                          <span className="text-[220px] drop-shadow-2xl animate-bounce-slow leading-none">{state.selectedCategory.items[learningIndex]?.emoji}</span>
                        )}
                      </div>
                      <div className="bg-[#EEF2FF] px-10 py-2.5 rounded-2xl border border-indigo-100 shadow-sm flex-shrink-0 mb-3">
                        <span className="text-2xl font-kids text-indigo-700 uppercase tracking-widest">{state.selectedCategory.items[learningIndex]?.name}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8 animate-in zoom-in flex flex-col items-center justify-center">
                      <h2 className="text-7xl font-kids text-white mb-6 drop-shadow-lg" dir="rtl">{state.selectedCategory.items[learningIndex]?.persianName}</h2>
                      <p className="text-sm text-white/40 uppercase font-black tracking-[0.4em] mt-8">TAP FOR ENGLISH</p>
                    </div>
                  )}
                </div>

                {/* NAVIGATION BUTTONS - MOVED DOWN, ROUND AND ATTRACTIVE */}
                <div className="flex items-center justify-between w-full mt-6 px-4">
                  <button onClick={() => { setLearningIndex(p => (p > 0 ? p - 1 : state.selectedCategory!.items.length - 1)); setShowPersian(false); }} 
                    className="w-20 h-20 bg-white rounded-full text-5xl flex items-center justify-center shadow-lg border-b-8 border-slate-200 active:translate-y-2 active:border-b-0 transition-all btn-tap">
                    👈
                  </button>
                  <button onClick={() => { setLearningIndex(p => (p < state.selectedCategory!.items.length - 1 ? p + 1 : 0)); setShowPersian(false); }} 
                    className="w-20 h-20 bg-indigo-600 rounded-full text-5xl flex items-center justify-center shadow-xl border-b-8 border-indigo-900 text-white active:translate-y-2 active:border-b-0 transition-all btn-tap">
                    👉
                  </button>
                </div>
              </div>
            </div>

            {/* MAGIC EXPAND BUTTON */}
            <div className="px-12 pb-6 mt-2 flex-shrink-0 z-30">
              <button onClick={handleExpand} disabled={isExpanding} className={`w-full py-5 rounded-[2.5rem] font-black text-white shadow-xl transition-all flex items-center justify-center space-x-4 text-sm tracking-widest active:scale-95 ${isExpanding ? 'bg-slate-300' : 'bg-magic magic-btn-active'}`}>
                <span className="text-2xl">🪄</span>
                <span>{isExpanding ? 'WORKING MAGIC...' : `GET 10 NEW ITEMS`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTHER VIEWS REMAIN FOR FULL FUNCTIONALITY */}
      {state.view === 'alphabet' && (
        <div className="flex-1 flex flex-col overflow-hidden pb-[var(--safe-bottom)] bg-slate-50">
          <div className="bg-[#22C55E] pt-[calc(var(--safe-top)+0.5rem)] pb-4 px-6 rounded-b-[3.5rem] shadow-xl flex items-center justify-between flex-shrink-0 z-30">
            <button onClick={() => setState({...state, view: 'main'})} className="bg-white/40 w-12 h-12 rounded-full text-white flex items-center justify-center text-2xl shadow-inner btn-tap">🏠</button>
            <h1 className="text-3xl font-kids text-white uppercase tracking-tighter">ABC ROOM</h1>
            <div className="w-12"></div>
          </div>
          <div className="flex-1 p-6 grid grid-cols-2 gap-5 overflow-y-auto scroll-container hide-scrollbar bg-white/50">
            {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter, idx) => (
              <button key={letter} onClick={() => handleSpeech(letter)} 
                className={`aspect-square ${RAINBOW_COLORS[idx % RAINBOW_COLORS.length]} rounded-[3.5rem] shadow-[0_15px_30px_-5px_rgba(0,0,0,0.15)] border-b-[15px] border-black/15 flex items-center justify-center text-8xl font-kids text-white active:translate-y-4 active:border-b-0 transition-all duration-100 transform`}>
                {letter}
              </button>
            ))}
          </div>
        </div>
      )}

      {state.view === 'game_active' && state.selectedCategory && state.selectedGame && (
        <GameEngine category={state.selectedCategory} gameType={state.selectedGame} onBack={() => setState({ ...state, view: 'game_types' })} />
      )}

      {(state.view === 'game_types' || state.view === 'game_cats') && (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 pb-[var(--safe-bottom)]">
          <div className="bg-[#FF7043] pt-[calc(var(--safe-top)+0.5rem)] pb-5 px-6 rounded-b-[3.5rem] shadow-xl flex items-center justify-between flex-shrink-0 z-30">
             <button onClick={() => setState({...state, view: 'main'})} className="bg-white/40 w-12 h-12 rounded-full text-white flex items-center justify-center text-2xl shadow-inner active:scale-90">🏠</button>
             <h1 className="text-2xl font-kids text-white uppercase tracking-widest">ARCADE</h1>
             <div className="w-12"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-container hide-scrollbar">
            {state.view === 'game_types' ? (
              Object.values(GameType).map(type => (
                <button key={type} onClick={() => setState({ ...state, selectedGame: type, view: 'game_cats' })} className="w-full flex items-center p-8 bg-white rounded-[3.5rem] border-b-12 border-slate-200 shadow-xl active:translate-y-2 active:border-b-0 transition-all btn-tap">
                  <span className="text-7xl mr-6">{type === GameType.FLASHCARDS ? '🗂️' : type === GameType.QUIZ ? '❓' : type === GameType.MEMORY ? '🧠' : type === GameType.MATCHING ? '🧩' : type === GameType.SPELLING ? '✏️' : '🔍'}</span>
                  <div className="text-left">
                    <span className="text-3xl font-kids text-orange-600 uppercase block leading-none">{type}</span>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">TAP TO PLAY!</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="grid grid-cols-2 gap-5">
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => setState({ ...state, selectedCategory: cat, view: 'game_active' })} className={`${cat.color} p-8 rounded-[3.5rem] shadow-xl text-white flex flex-col items-center active:scale-90 transition-all border-b-8 border-black/10 btn-tap`}>
                    <span className="text-6xl">{cat.icon}</span>
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
