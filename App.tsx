
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

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

  const handleExpand = async () => {
    if (!state.selectedCategory || isExpanding || !process.env.API_KEY) return;
    setIsExpanding(true);
    try {
      const newItems = await expandCategoryItems(state.selectedCategory.name, state.selectedCategory.items);
      if (newItems && newItems.length > 0) {
        const categoryId = state.selectedCategory.id;
        const updatedCats = categories.map(c => 
          c.id === categoryId ? { ...c, items: [...c.items, ...newItems] } : c
        );
        setCategories(updatedCats);
        const updatedSelected = updatedCats.find(c => c.id === categoryId);
        if (updatedSelected) {
          setState(s => ({ ...s, selectedCategory: updatedSelected }));
        }
      }
    } catch (e) { console.error(e); }
    setIsExpanding(false);
  };

  const goMain = () => setState({ ...state, view: 'main', selectedGame: null });
  
  const renderMain = () => (
    <div className="h-full flex flex-col p-0 animate-in fade-in duration-500 bg-white">
      <div className="bg-[#FFD233] pt-14 pb-8 px-8 rounded-b-[3.5rem] shadow-lg flex flex-col items-center relative flex-shrink-0 z-10">
        <h1 className="text-4xl font-kids text-white uppercase tracking-tighter drop-shadow-md">KidsJoy 🌟</h1>
        <p className="text-white/80 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">Adventure Awaits!</p>
        
        <div className={`absolute top-6 right-6 px-2.5 py-1 rounded-full flex items-center space-x-1.5 border shadow-sm ${aiActive ? 'bg-green-50 border-green-200 text-green-600' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
          <div className={`w-2 h-2 rounded-full ${aiActive ? 'bg-green-500 animate-pulse' : 'bg-orange-400'}`}></div>
          <span className="text-[9px] font-black uppercase">{aiActive ? 'AI Online' : 'Local Mode'}</span>
        </div>
      </div>
      
      <div className="flex-1 scroll-container p-6 space-y-5 hide-scrollbar">
        <button onClick={() => setState({ ...state, view: 'alphabet' })} className="w-full bg-[#22C55E] py-9 rounded-[3.5rem] shadow-card flex items-center px-10 transform active:scale-95 transition-all">
          <span className="text-6xl mr-6 drop-shadow-sm">🔤</span>
          <div className="text-left">
            <span className="block text-2xl font-kids text-white tracking-tighter uppercase leading-none">ABC Room</span>
            <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Learn Letters</span>
          </div>
        </button>

        <button onClick={() => setState({ ...state, view: 'learning_detail', selectedCategory: categories[0] })} className="w-full bg-[#6366F1] py-9 rounded-[3.5rem] shadow-card flex items-center px-10 transform active:scale-95 transition-all">
          <span className="text-6xl mr-6 drop-shadow-sm">🍎</span>
          <div className="text-left">
            <span className="block text-2xl font-kids text-white tracking-tighter uppercase leading-none">Word Room</span>
            <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Explore Categories</span>
          </div>
        </button>

        <button onClick={() => setState({ ...state, view: 'game_types' })} className="w-full bg-[#FF7043] py-9 rounded-[3.5rem] shadow-card flex items-center px-10 transform active:scale-95 transition-all">
          <span className="text-6xl mr-6 drop-shadow-sm">🎮</span>
          <div className="text-left">
            <span className="block text-2xl font-kids text-white tracking-tighter uppercase leading-none">Play Time</span>
            <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Fun Mini-Games</span>
          </div>
        </button>
        {/* Extra space for scrolling comfort */}
        <div className="h-4"></div>
      </div>
      
      <div className="p-4 bg-gray-50/50 border-t border-gray-100 text-center flex-shrink-0">
        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">V 3.3 • Optimized Experience</p>
      </div>
    </div>
  );

  const renderAlphabet = () => (
    <div className="h-full bg-white flex flex-col animate-in slide-in-from-bottom duration-500">
      <div className="bg-[#22C55E] pt-14 pb-6 px-6 rounded-b-[3.5rem] shadow-md flex flex-col items-center relative flex-shrink-0 z-10">
        <h1 className="text-3xl font-kids text-white uppercase tracking-tighter">ABC Room</h1>
        <button onClick={goMain} className="absolute left-6 bottom-5 bg-white p-3 rounded-full shadow-lg text-gray-600 active:scale-90 transition-transform">🏠</button>
        <p className="text-white/70 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Tap a letter to listen!</p>
      </div>
      
      <div className="flex-1 scroll-container p-6 hide-scrollbar bg-pattern">
        <div className="grid grid-cols-3 gap-5">
          {ALPHABET.map((letter, idx) => (
            <button 
              key={letter} 
              onClick={() => handleSpeech(letter)}
              style={{ backgroundColor: RAINBOW_COLORS[idx % RAINBOW_COLORS.length] }}
              className="aspect-square rounded-[2.5rem] shadow-lg flex items-center justify-center transform active:scale-90 transition-all border-b-[10px] border-black/15 group"
            >
              <span className="text-5xl font-kids text-white drop-shadow-md group-active:animate-bounce">{letter}</span>
            </button>
          ))}
        </div>
        <div className="h-10"></div>
      </div>
    </div>
  );

  const renderLearningDetail = () => {
    const cat = state.selectedCategory || categories[0];
    const items = cat.items || [];
    const item = items[learningIndex] || items[0];

    if (!item) return <div className="p-10 text-center font-kids">Loading...</div>;

    return (
      <div className="h-full flex flex-col bg-white overflow-hidden">
        <div className="bg-[#FFD233] pt-12 pb-5 px-6 rounded-b-[3rem] shadow-md flex flex-col items-center relative z-20 flex-shrink-0">
          <h1 className="text-2xl font-kids text-white uppercase tracking-tighter">{cat.name}</h1>
          <button onClick={goMain} className="absolute right-6 bottom-4 bg-white p-3 rounded-full shadow-lg text-gray-600 active:scale-90 transition-transform">🏠</button>
          <div className="absolute left-6 bottom-4 bg-white/25 px-4 py-1.5 rounded-full text-[11px] text-white font-black">{learningIndex + 1} / {items.length}</div>
        </div>
        
        {/* Main Content Area - Scrollable to fit shorter screens */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div 
            ref={scrollRef} 
            onMouseDown={handleDragStart}
            onMouseLeave={handleDragEnd}
            onMouseUp={handleDragEnd}
            onMouseMove={handleDragMove}
            onTouchStart={handleDragStart}
            onTouchEnd={handleDragEnd}
            onTouchMove={handleDragMove}
            className="flex overflow-x-auto hide-scrollbar px-6 py-5 space-x-5 bg-gray-50/50 select-none flex-shrink-0"
          >
            {categories.map((c) => (
              <button key={c.id} onPointerDown={(e) => e.stopPropagation()} onClick={() => { setState({ ...state, selectedCategory: c }); setLearningIndex(0); }} className="flex flex-col items-center space-y-1.5 flex-shrink-0">
                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl transition-all ${cat.id === c.id ? 'bg-[#FF9F1C] ring-4 ring-orange-100 scale-110 shadow-lg' : 'bg-white shadow-sm border border-gray-100'}`}>{c.icon}</div>
                <span className={`text-[10px] font-black uppercase tracking-wider ${cat.id === c.id ? 'text-indigo-600' : 'text-gray-400'}`}>{c.name}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 scroll-container px-8 py-2 flex flex-col items-center justify-center min-h-0">
            <div onClick={() => setShowPersian(!showPersian)} className={`w-full aspect-square max-h-[350px] rounded-[4rem] shadow-card flex flex-col items-center justify-center transition-all duration-500 relative cursor-pointer active:scale-[0.98] overflow-hidden flex-shrink-0 ${showPersian ? 'bg-[#6366F1]' : 'bg-white border-2 border-indigo-50'}`}>
              {!showPersian && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); handleSpeech(item.name); }} className={`absolute top-6 right-6 w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center shadow-xl border-4 border-white z-10 transform active:scale-90 ${isSpeaking ? 'animate-pulse' : ''}`}><span className="text-3xl text-white">🔊</span></button>
                  {aiActive && (
                    <button onClick={(e) => { e.stopPropagation(); handleImageGeneration(); }} className={`absolute top-6 left-6 w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center shadow-xl border-4 border-white z-10 transform active:scale-90 ${isGeneratingImg ? 'animate-spin' : ''}`}><span className="text-3xl text-white">{isGeneratingImg ? '✨' : '🎨'}</span></button>
                  )}
                </>
              )}
              {!showPersian ? (
                <>
                  <div className="w-full h-full flex items-center justify-center p-8">
                    {itemImage ? <img src={itemImage} alt={item.name} className="w-full h-full object-contain rounded-[3rem] animate-in zoom-in" /> : <div className="text-[9rem] drop-shadow-2xl">{item.emoji}</div>}
                  </div>
                  <div className="absolute bottom-6 w-full text-center"><h2 className="text-2xl font-kids text-indigo-700 capitalize tracking-tight bg-white/90 backdrop-blur-sm mx-auto inline-block px-8 py-2 rounded-full shadow-sm">{item.name}</h2></div>
                </>
              ) : (
                <div className="flex flex-col items-center px-8 text-center animate-in fade-in zoom-in duration-300"><h2 className="text-6xl font-kids text-white leading-tight" dir="rtl">{item.persianName}</h2><div className="mt-8 bg-white/20 px-8 py-2 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest">Tap for English</div></div>
              )}
            </div>
          </div>
          
          <div className="px-8 flex justify-between space-x-4 py-4 flex-shrink-0 bg-white">
            <button onClick={() => { setLearningIndex(prev => (prev - 1 + items.length) % items.length); setShowPersian(false); }} className="flex-1 bg-gray-100 py-5 rounded-2xl shadow-sm text-gray-500 font-black text-[10px] uppercase tracking-widest active:bg-gray-200 transition-colors">Prev</button>
            <button onClick={() => { setLearningIndex(prev => (prev + 1) % items.length); setShowPersian(false); }} className="flex-1 bg-gray-100 py-5 rounded-2xl shadow-sm text-gray-500 font-black text-[10px] uppercase tracking-widest active:bg-gray-200 transition-colors">Next</button>
          </div>

          <div className="px-8 pb-8 flex-shrink-0 bg-white">
            <button 
              disabled={isExpanding || !aiActive} 
              onClick={handleExpand} 
              className={`w-full ${isExpanding || !aiActive ? 'bg-gray-100 text-gray-400' : 'bg-[#22C55E] text-white shadow-lg'} py-5 rounded-[2rem] flex items-center justify-center space-x-3 active:scale-95 transition-all`}
            >
              <span className="text-2xl">{isExpanding ? '⏳' : aiActive ? '🪄' : '🔒'}</span>
              <span className="text-[11px] font-black uppercase tracking-[0.1em]">
                {isExpanding ? 'Generating Words...' : aiActive ? `Grow ${cat.name} (+10 Words)` : 'Connect API Key for Magic'}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleDragStart = (e: any) => {
    isDown.current = true;
    const clientX = e.pageX || e.touches?.[0]?.pageX;
    startX.current = clientX - (scrollRef.current?.offsetLeft || 0);
    scrollLeft.current = scrollRef.current?.scrollLeft || 0;
  };
  const handleDragEnd = () => { isDown.current = false; };
  const handleDragMove = (e: any) => {
    if (!isDown.current || !scrollRef.current) return;
    e.preventDefault();
    const clientX = e.pageX || e.touches?.[0]?.pageX;
    const x = clientX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 2;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  return (
    <div className="max-w-md mx-auto h-full relative overflow-hidden bg-white shadow-2xl ring-1 ring-gray-100">
      {state.view === 'main' && renderMain()}
      {state.view === 'alphabet' && renderAlphabet()}
      {state.view === 'learning_detail' && renderLearningDetail()}
      {state.view === 'game_types' && (
        <div className="h-full bg-white flex flex-col animate-in slide-in-from-right duration-300">
           <div className="bg-[#FFD233] pt-14 pb-6 px-6 rounded-b-[3rem] shadow-md flex flex-col items-center relative flex-shrink-0 z-10"><h1 className="text-2xl font-kids text-white uppercase">Game Zone</h1><button onClick={goMain} className="absolute right-6 bottom-5 bg-white p-2.5 rounded-full shadow-lg text-gray-600 scale-90">🏠</button></div>
            <div className="flex-1 scroll-container p-6 space-y-5 hide-scrollbar">
              {Object.values(GameType).map(type => (
                <button key={type} onClick={() => setState({ ...state, selectedGame: type, view: 'game_cats' })} className="w-full flex items-center p-7 bg-white rounded-[3.5rem] border-2 border-indigo-50 shadow-soft active:border-indigo-400 transform active:scale-98 transition-all"><span className="text-5xl mr-8 drop-shadow-sm">{type === GameType.FLASHCARDS ? '🗂️' : type === GameType.QUIZ ? '❓' : type === GameType.MEMORY ? '🧠' : type === GameType.MATCHING ? '🔗' : type === GameType.SPELLING ? '🔤' : '🔍'}</span><span className="text-xl font-kids text-indigo-700 uppercase tracking-tight">{type}</span></button>
              ))}
              <div className="h-4"></div>
            </div>
        </div>
      )}
      {state.view === 'game_cats' && (
        <div className="h-full bg-white flex flex-col animate-in slide-in-from-right duration-300">
           <div className="bg-[#FFD233] pt-14 pb-6 px-6 rounded-b-[3rem] shadow-md flex flex-col items-center relative flex-shrink-0 z-10"><h1 className="text-2xl font-kids text-white uppercase tracking-tight">Pick Topic</h1><button onClick={() => setState({...state, view: 'game_types'})} className="absolute right-6 bottom-5 bg-white p-2.5 rounded-full shadow-lg text-gray-600 scale-90">🔙</button></div>
            <div className="flex-1 scroll-container p-5 hide-scrollbar">
               <div className="grid grid-cols-2 gap-5">
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => setState({ ...state, selectedCategory: cat, view: 'game_active' })} className={`${cat.color} p-8 rounded-[3.5rem] shadow-lg flex flex-col items-center justify-center space-y-3 transform active:scale-95 transition-all`}><span className="text-6xl drop-shadow-md">{cat.icon}</span><span className="text-white font-kids text-sm uppercase tracking-widest">{cat.name}</span></button>
                ))}
               </div>
               <div className="h-10"></div>
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
