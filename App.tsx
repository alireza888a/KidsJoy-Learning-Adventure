
import React, { useState, useEffect, useRef } from 'react';
import { CATEGORIES as INITIAL_CATEGORIES } from './constants';
import { Category, GameType, GameState, Item } from './types';
import { GameEngine } from './components/Games';
import { generateSpeech, expandCategoryItems, generateItemImage } from './services/geminiService';
import { playTTSSound, playLocalSpeech } from './services/audioPlayer';
import { imageStorage } from './services/storage';

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const RAINBOW_COLORS = [
  '#FF595E', '#FF924C', '#FFCA3A', '#C5CA30', '#8AC926', 
  '#52A675', '#1982C4', '#4267AC', '#6A4C93', '#B5179E'
];

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('kids_joy_categories_v3');
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
  const [aiActive, setAiActive] = useState(!!process.env.API_KEY);

  useEffect(() => {
    localStorage.setItem('kids_joy_categories_v3', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    const loadImage = async () => {
      if (state.view === 'learning_detail' && state.selectedCategory) {
        const items = state.selectedCategory.items;
        if (items && items.length > 0) {
          const idx = Math.min(learningIndex, items.length - 1);
          const currentItem = items[idx];
          if (currentItem) {
            const cachedImg = await imageStorage.get(`kids_joy_img_${currentItem.id}`);
            setItemImage(cachedImg);
          }
        }
      }
    };
    loadImage();
  }, [learningIndex, state.view, state.selectedCategory]);

  const handleSpeech = async (text: string) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    if (navigator.vibrate) navigator.vibrate(15);
    
    try {
      let speechPlayed = false;
      if (process.env.API_KEY) {
        try {
          const base64 = await generateSpeech(text);
          if (base64) {
            await playTTSSound(base64, text);
            speechPlayed = true;
          }
        } catch (e) { console.warn("AI Speech failed."); }
      }
      if (!speechPlayed) await playLocalSpeech(text);
    } catch (e) { console.error(e); }
    finally { setIsSpeaking(false); }
  };

  const handleImageGeneration = async () => {
    if (isGeneratingImg || !state.selectedCategory || !process.env.API_KEY) return;
    const items = state.selectedCategory.items;
    const item = items[learningIndex] || items[0];
    if (!item) return;

    setIsGeneratingImg(true);
    try {
      const imgUrl = await generateItemImage(item.name, state.selectedCategory.name);
      if (imgUrl) {
        await imageStorage.set(`kids_joy_img_${item.id}`, imgUrl);
        setItemImage(imgUrl);
      }
    } catch (e) { console.error(e); }
    setIsGeneratingImg(false);
  };

  const goMain = () => {
    if (navigator.vibrate) navigator.vibrate(10);
    setState({ ...state, view: 'main', selectedGame: null });
  };
  
  return (
    <div className="w-full h-full max-w-md mx-auto relative overflow-hidden bg-white selection:bg-none flex flex-col">
      {state.view === 'main' && (
        <div className="flex-1 flex flex-col p-0 animate-in fade-in duration-500 bg-white overflow-hidden">
          <div className="bg-[#FFD233] pt-12 pb-10 px-6 rounded-b-[4rem] shadow-lg flex flex-col items-center relative flex-shrink-0 z-10">
            <h1 className="text-4xl xs:text-5xl font-kids text-white uppercase tracking-tighter drop-shadow-md">KidsJoy 🌟</h1>
            <p className="text-white/90 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Mobile Learning Fun</p>
            
            <div className={`absolute top-4 right-4 px-3 py-1 rounded-full flex items-center space-x-1 border shadow-sm ${aiActive ? 'bg-green-50 border-green-200 text-green-600' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${aiActive ? 'bg-green-500 animate-pulse' : 'bg-orange-400'}`}></div>
              <span className="text-[9px] font-black uppercase">{aiActive ? 'AI' : 'Offline'}</span>
            </div>
          </div>
          
          <div className="flex-1 scroll-container p-5 space-y-5 hide-scrollbar overflow-y-auto">
            <button onClick={() => { if (navigator.vibrate) navigator.vibrate(25); setState({ ...state, view: 'alphabet' }); }} className="w-full bg-[#22C55E] py-8 rounded-[2.5rem] shadow-card flex items-center px-8 active:scale-95 transition-all">
              <span className="text-6xl mr-5">🔤</span>
              <div className="text-left text-white">
                <span className="block text-2xl font-kids uppercase leading-none">Alphabet</span>
                <span className="text-[10px] font-bold uppercase opacity-80 mt-1 block">A to Z Room</span>
              </div>
            </button>

            <button onClick={() => { if (navigator.vibrate) navigator.vibrate(25); setState({ ...state, view: 'learning_detail', selectedCategory: categories[0] }); }} className="w-full bg-[#6366F1] py-8 rounded-[2.5rem] shadow-card flex items-center px-8 active:scale-95 transition-all">
              <span className="text-6xl mr-5">🍎</span>
              <div className="text-left text-white">
                <span className="block text-2xl font-kids uppercase leading-none">Words</span>
                <span className="text-[10px] font-bold uppercase opacity-80 mt-1 block">Vocabulary</span>
              </div>
            </button>

            <button onClick={() => { if (navigator.vibrate) navigator.vibrate(25); setState({ ...state, view: 'game_types' }); }} className="w-full bg-[#FF7043] py-8 rounded-[2.5rem] shadow-card flex items-center px-8 active:scale-95 transition-all">
              <span className="text-6xl mr-5">🎮</span>
              <div className="text-left text-white">
                <span className="block text-2xl font-kids uppercase leading-none">Games</span>
                <span className="text-[10px] font-bold uppercase opacity-80 mt-1 block">Play & Learn</span>
              </div>
            </button>
            <div className="h-10"></div>
          </div>
        </div>
      )}

      {state.view === 'alphabet' && (
        <div className="flex-1 bg-white flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
          <div className="bg-[#22C55E] pt-12 pb-5 px-6 rounded-b-[3rem] shadow-md flex flex-col items-center relative flex-shrink-0 z-10">
            <h1 className="text-2xl font-kids text-white uppercase">ABC Room</h1>
            <button onClick={goMain} className="absolute left-6 bottom-4 bg-white p-2.5 rounded-full shadow-lg text-gray-600 active:scale-90">🏠</button>
          </div>
          <div className="flex-1 p-4 grid grid-cols-3 gap-3 hide-scrollbar overflow-y-auto">
            {ALPHABET.map((letter, idx) => (
              <button 
                key={letter} 
                onClick={() => handleSpeech(letter)} 
                style={{ backgroundColor: RAINBOW_COLORS[idx % RAINBOW_COLORS.length] }} 
                className="aspect-square rounded-2xl shadow-lg flex items-center justify-center active:scale-90 transition-all border-b-[4px] border-black/10"
              >
                <span className="text-4xl font-kids text-white drop-shadow-md">{letter}</span>
              </button>
            ))}
            <div className="h-10 col-span-3"></div>
          </div>
        </div>
      )}

      {state.view === 'learning_detail' && state.selectedCategory && (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="bg-[#FFD233] pt-10 pb-4 px-6 rounded-b-[2.5rem] shadow-md flex flex-col items-center relative z-20 flex-shrink-0">
            <h1 className="text-xl font-kids text-white uppercase">{state.selectedCategory.name}</h1>
            <button onClick={goMain} className="absolute right-6 bottom-3 bg-white p-2 rounded-full shadow-lg text-gray-600 active:scale-90">🏠</button>
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex overflow-x-auto hide-scrollbar px-5 py-4 space-x-4 bg-gray-50/50 flex-shrink-0">
              {categories.map((c) => (
                <button key={c.id} onClick={() => { setState({ ...state, selectedCategory: c }); setLearningIndex(0); if (navigator.vibrate) navigator.vibrate(10); }} className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${state.selectedCategory?.id === c.id ? 'bg-[#FF9F1C] shadow-lg scale-110' : 'bg-white border shadow-sm opacity-60'}`}>{c.icon}</div>
                </button>
              ))}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-0">
              <div onClick={() => { setShowPersian(!showPersian); if (navigator.vibrate) navigator.vibrate(10); }} className={`w-full max-w-[280px] aspect-square rounded-[3rem] shadow-card flex flex-col items-center justify-center relative transition-all duration-300 active:scale-[0.97] cursor-pointer ${showPersian ? 'bg-indigo-600' : 'bg-white border-4 border-indigo-50'}`}>
                {!showPersian ? (
                  <>
                    <div className="w-full h-full flex items-center justify-center p-6">
                      {itemImage ? <img src={itemImage} alt="item" className="w-full h-full object-contain rounded-[2rem] animate-in zoom-in" /> : <span className="text-[8rem] drop-shadow-xl">{state.selectedCategory.items[learningIndex]?.emoji}</span>}
                    </div>
                    <div className="absolute bottom-4 w-full text-center">
                      <span className="text-2xl font-kids text-indigo-700 bg-white/95 px-6 py-1.5 rounded-full shadow-sm">{state.selectedCategory.items[learningIndex]?.name}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 animate-in fade-in zoom-in">
                    <h2 className="text-4xl font-kids text-white leading-tight" dir="rtl">{state.selectedCategory.items[learningIndex]?.persianName}</h2>
                    <p className="mt-4 text-white/50 text-[10px] font-black uppercase tracking-widest">Tap to flip back</p>
                  </div>
                )}
                
                <button onClick={(e) => { e.stopPropagation(); handleSpeech(state.selectedCategory?.items[learningIndex]?.name || ""); }} className="absolute -top-2 -right-2 w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-xl border-4 border-white active:scale-90 z-30">
                  <span className="text-xl">🔊</span>
                </button>
                
                {aiActive && (
                  <button onClick={(e) => { e.stopPropagation(); handleImageGeneration(); }} className={`absolute -top-2 -left-2 w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center text-white shadow-xl border-4 border-white active:scale-90 z-30 ${isGeneratingImg ? 'animate-spin' : ''}`}>
                    <span className="text-xl">{isGeneratingImg ? '✨' : '🎨'}</span>
                  </button>
                )}
              </div>

              <div className="flex w-full max-w-[280px] space-x-4 mt-8">
                <button onClick={() => { setLearningIndex(p => (p > 0 ? p - 1 : state.selectedCategory!.items.length - 1)); setShowPersian(false); if (navigator.vibrate) navigator.vibrate(10); }} className="flex-1 bg-gray-100 py-4 rounded-2xl font-black text-gray-400 uppercase text-xs tracking-widest active:bg-gray-200">Prev</button>
                <button onClick={() => { setLearningIndex(p => (p < state.selectedCategory!.items.length - 1 ? p + 1 : 0)); setShowPersian(false); if (navigator.vibrate) navigator.vibrate(15); }} className="flex-1 bg-indigo-600 py-4 rounded-2xl font-black text-white shadow-lg uppercase text-xs tracking-widest active:scale-95">Next</button>
              </div>
            </div>
            
            {aiActive && (
              <div className="px-6 pb-6 flex-shrink-0">
                 <button 
                    onClick={async () => {
                      if (isExpanding || !aiActive) return;
                      setIsExpanding(true);
                      if (navigator.vibrate) navigator.vibrate(30);
                      try {
                        const newItems = await expandCategoryItems(state.selectedCategory!.name, state.selectedCategory!.items);
                        if (newItems && newItems.length > 0) {
                          const updatedCats = categories.map(c => 
                            c.id === state.selectedCategory!.id ? { ...c, items: [...c.items, ...newItems] } : c
                          );
                          setCategories(updatedCats);
                          setState(s => ({ ...s, selectedCategory: updatedCats.find(c => c.id === s.selectedCategory?.id) || s.selectedCategory }));
                        }
                      } catch (e) { console.error(e); }
                      setIsExpanding(false);
                    }} 
                    disabled={isExpanding || !aiActive} 
                    className={`w-full py-4 rounded-3xl font-black uppercase text-xs tracking-tighter shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2 ${aiActive ? 'bg-[#22C55E] text-white' : 'bg-gray-100 text-gray-400'}`}
                  >
                    <span className="text-xl">{isExpanding ? '⏳' : '🪄'}</span>
                    <span>{isExpanding ? 'Magic...' : `Add 10 More Words`}</span>
                 </button>
              </div>
            )}
          </div>
        </div>
      )}

      {state.view === 'game_types' && (
        <div className="flex-1 bg-white flex flex-col overflow-hidden">
          <div className="bg-[#FFD233] pt-12 pb-5 px-6 rounded-b-[2.5rem] shadow-md flex flex-col items-center relative z-10">
            <h1 className="text-2xl font-kids text-white uppercase tracking-tighter">Choose Game</h1>
            <button onClick={goMain} className="absolute right-6 bottom-4 bg-white p-2 rounded-full shadow-lg text-gray-600">🏠</button>
          </div>
          <div className="flex-1 p-5 space-y-4 overflow-y-auto hide-scrollbar">
            {Object.values(GameType).map(type => (
              <button key={type} onClick={() => { if (navigator.vibrate) navigator.vibrate(15); setState({ ...state, selectedGame: type, view: 'game_cats' }); }} className="w-full flex items-center p-5 bg-white rounded-3xl border-2 border-indigo-50 shadow-soft active:border-indigo-400 transition-all active:scale-98">
                <span className="text-4xl mr-4">{type === GameType.FLASHCARDS ? '🗂️' : type === GameType.QUIZ ? '❓' : type === GameType.MEMORY ? '🧠' : '🎮'}</span>
                <span className="text-lg font-kids text-indigo-700 uppercase">{type}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {state.view === 'game_cats' && (
        <div className="flex-1 bg-white flex flex-col overflow-hidden">
          <div className="bg-[#FFD233] pt-12 pb-5 px-6 rounded-b-[2.5rem] shadow-md flex flex-col items-center relative z-10">
            <h1 className="text-2xl font-kids text-white uppercase tracking-tighter">Topic</h1>
            <button onClick={() => setState({ ...state, view: 'game_types' })} className="absolute right-6 bottom-4 bg-white p-2 rounded-full shadow-lg text-gray-600">🔙</button>
          </div>
          <div className="flex-1 p-4 grid grid-cols-2 gap-4 overflow-y-auto hide-scrollbar">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => { if (navigator.vibrate) navigator.vibrate(15); setState({ ...state, selectedCategory: cat, view: 'game_active' }); }} className={`${cat.color} p-6 rounded-[2.5rem] shadow-lg flex flex-col items-center justify-center active:scale-95 transition-all text-white space-y-1`}>
                <span className="text-4xl drop-shadow-md">{cat.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-widest">{cat.name}</span>
              </button>
            ))}
            <div className="h-10 col-span-2"></div>
          </div>
        </div>
      )}

      {state.view === 'game_active' && state.selectedCategory && state.selectedGame && (
        <GameEngine category={state.selectedCategory} gameType={state.selectedGame} onBack={() => setState({ ...state, view: 'game_types' })} />
      )}
    </div>
  );
};

export default App;
