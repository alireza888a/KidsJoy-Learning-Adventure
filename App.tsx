
import React, { useState, useEffect, useRef } from 'react';
import { CATEGORIES as INITIAL_CATEGORIES } from './constants';
import { Category, GameType, GameState, Item } from './types';
import { GameEngine } from './components/Games';
import { generateSpeech, expandCategoryItems, generateItemImage } from './services/geminiService';
import { playTTSSound, playLocalSpeech } from './services/audioPlayer';

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(() => {
    // Note: We use 'kids_joy_categories_v2' to force unique ID update for all items
    const saved = localStorage.getItem('kids_joy_categories_v2');
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  useEffect(() => {
    localStorage.setItem('kids_joy_categories_v2', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    if (state.view === 'learning_detail' && state.selectedCategory) {
      const currentItem = state.selectedCategory.items[learningIndex];
      const cachedImg = localStorage.getItem(`kids_joy_img_${currentItem.id}`);
      setItemImage(cachedImg);
      // WE REMOVED pre-fetch generateSpeech here to save quota
    }
  }, [learningIndex, state.view, state.selectedCategory]);

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

  const handleSpeech = async (text: string, forceGemini = false) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      let speechPlayed = false;
      
      // Try Gemini TTS if we have an API Key and it's not explicitly disabled
      if (process.env.API_KEY) {
        try {
          // We use a short timeout/abort check for Gemini to not keep the user waiting if quota is hit
          const base64 = await generateSpeech(text);
          if (base64) {
            await playTTSSound(base64, text);
            speechPlayed = true;
          }
        } catch (apiError) {
          console.warn("Gemini TTS Quota exceeded, falling back to local speech.");
        }
      }
      
      // Fallback to local device speech if Gemini failed or wasn't used
      if (!speechPlayed) {
        await playLocalSpeech(text);
      }
    } catch (e) { 
      console.error("Speech error:", e); 
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleImageGeneration = async () => {
    if (isGeneratingImg || !state.selectedCategory) return;
    const item = state.selectedCategory.items[learningIndex];
    setIsGeneratingImg(true);
    try {
      const imgUrl = await generateItemImage(item.name, state.selectedCategory.name);
      if (imgUrl) {
        localStorage.setItem(`kids_joy_img_${item.id}`, imgUrl);
        setItemImage(imgUrl);
      }
    } catch (e) { console.error(e); }
    setIsGeneratingImg(false);
  };

  const handleExpand = async () => {
    if (!state.selectedCategory || isExpanding) return;
    setIsExpanding(true);
    try {
      const newItems = await expandCategoryItems(state.selectedCategory.name, state.selectedCategory.items);
      if (newItems && newItems.length > 0) {
        const updatedCats = categories.map(c => 
          c.id === state.selectedCategory?.id ? { ...c, items: [...c.items, ...newItems] } : c
        );
        setCategories(updatedCats);
        const updatedSelected = updatedCats.find(c => c.id === state.selectedCategory?.id);
        if (updatedSelected) setState({ ...state, selectedCategory: updatedSelected });
      }
    } catch (e) { console.error(e); }
    setIsExpanding(false);
  };

  const goMain = () => setState({ ...state, view: 'main', selectedGame: null });
  const goLearning = (cat: Category) => { 
    setState({ ...state, selectedCategory: cat, view: 'learning_detail' }); 
    setLearningIndex(0); 
    setShowPersian(false); 
  };

  const renderMain = () => (
    <div className="min-h-screen flex flex-col p-0 animate-in fade-in duration-500 bg-white">
      <div className="bg-[#FFD233] pt-12 pb-6 px-6 rounded-b-[2.5rem] shadow-lg flex flex-col items-center relative">
        <h1 className="text-3xl font-kids text-white uppercase tracking-tighter drop-shadow-sm">Explorer 🚀</h1>
        <p className="text-white/80 font-bold text-[10px] uppercase tracking-[0.2em] mt-0.5">Ready for Adventure!</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-5">
        <button onClick={() => goLearning(categories[0])} className="w-full bg-[#6366F1] py-12 rounded-[3.5rem] shadow-card flex flex-col items-center transform active:scale-95 transition-all">
          <span className="text-7xl mb-3">📚</span>
          <span className="text-2xl font-kids text-white tracking-tighter uppercase">Learning Room</span>
        </button>
        <button onClick={() => setState({ ...state, view: 'game_types' })} className="w-full bg-[#FF7043] py-12 rounded-[3.5rem] shadow-card flex flex-col items-center transform active:scale-95 transition-all">
          <span className="text-7xl mb-3">🎮</span>
          <span className="text-2xl font-kids text-white tracking-tighter uppercase">Game Zone</span>
        </button>
      </div>
    </div>
  );

  const renderLearningDetail = () => {
    const cat = state.selectedCategory || categories[0];
    const item = cat.items[learningIndex] || cat.items[0];
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <div className="bg-[#FFD233] pt-10 pb-4 px-6 rounded-b-[2.5rem] shadow-md flex flex-col items-center relative z-20">
          <h1 className="text-xl font-kids text-white uppercase tracking-tighter">{cat.name}</h1>
          <button onClick={goMain} className="absolute right-6 bottom-3 bg-white p-2.5 rounded-full shadow-md text-gray-600 scale-75">🏠</button>
          <div className="absolute left-6 bottom-3 bg-white/30 px-3 py-1 rounded-full text-[10px] text-white font-bold">{learningIndex + 1} / {cat.items.length}</div>
        </div>
        
        <div 
          ref={scrollRef} 
          onMouseDown={handleDragStart}
          onMouseLeave={handleDragEnd}
          onMouseUp={handleDragEnd}
          onMouseMove={handleDragMove}
          onTouchStart={handleDragStart}
          onTouchEnd={handleDragEnd}
          onTouchMove={handleDragMove}
          className="flex overflow-x-auto hide-scrollbar px-5 py-4 space-x-4 bg-gray-50/50 select-none cursor-grab active:cursor-grabbing"
        >
          {categories.map((c) => (
            <button 
              key={c.id} 
              onPointerDown={(e) => e.stopPropagation()} 
              onClick={() => goLearning(c)} 
              className="flex flex-col items-center space-y-1 flex-shrink-0"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all ${cat.id === c.id ? 'bg-[#FF9F1C] ring-4 ring-orange-100 scale-110 shadow-md' : 'bg-white shadow-sm border border-gray-100'}`}>{c.icon}</div>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${cat.id === c.id ? 'text-indigo-600' : 'text-gray-400'}`}>{c.name}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 px-8 flex flex-col items-center justify-center py-4">
          <div onClick={() => setShowPersian(!showPersian)} className={`w-full aspect-square rounded-[4rem] shadow-card flex flex-col items-center justify-center transition-all duration-500 relative cursor-pointer active:scale-[0.98] overflow-hidden ${showPersian ? 'bg-[#6366F1]' : 'bg-white border-2 border-indigo-50'}`}>
            {!showPersian && (
              <>
                <button onClick={(e) => { e.stopPropagation(); handleSpeech(item.name); }} className={`absolute top-5 right-5 w-14 h-14 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg border-4 border-white z-10 transform active:scale-90 ${isSpeaking ? 'animate-pulse' : ''}`}><span className="text-2xl text-white">🔊</span></button>
                <button onClick={(e) => { e.stopPropagation(); handleImageGeneration(); }} className={`absolute top-5 left-5 w-14 h-14 bg-pink-500 rounded-full flex items-center justify-center shadow-lg border-4 border-white z-10 transform active:scale-90 ${isGeneratingImg ? 'animate-spin' : ''}`}><span className="text-2xl text-white">{isGeneratingImg ? '✨' : '🎨'}</span></button>
              </>
            )}
            {!showPersian ? (
              <>
                <div className="w-full h-full flex items-center justify-center p-6">
                  {itemImage ? <img src={itemImage} alt={item.name} className="w-full h-full object-contain rounded-[3rem] animate-in zoom-in" /> : <div className="text-[10rem] drop-shadow-xl">{item.emoji}</div>}
                </div>
                <div className="absolute bottom-8 w-full text-center"><h2 className="text-4xl font-kids text-indigo-700 capitalize tracking-tight bg-white/80 backdrop-blur-sm mx-auto inline-block px-6 py-2 rounded-full">{item.name}</h2></div>
              </>
            ) : (
              <div className="flex flex-col items-center px-8 text-center animate-in fade-in zoom-in"><h2 className="text-6xl font-kids text-white leading-tight" dir="rtl">{item.persianName}</h2><div className="mt-10 bg-white/20 px-6 py-2 rounded-2xl text-white text-[10px] font-bold uppercase tracking-widest">Tap to See English</div></div>
            )}
          </div>
        </div>
        <div className="px-8 flex justify-between space-x-4 py-6">
          <button onClick={() => { setLearningIndex(prev => (prev - 1 + cat.items.length) % cat.items.length); setShowPersian(false); }} className="flex-1 bg-gray-100 py-5 rounded-2xl shadow-sm text-gray-500 font-bold text-sm uppercase tracking-widest active:bg-gray-200 transition-colors">Back</button>
          <button onClick={() => { setLearningIndex(prev => (prev + 1) % cat.items.length); setShowPersian(false); }} className="flex-1 bg-gray-100 py-5 rounded-2xl shadow-sm text-gray-500 font-bold text-sm uppercase tracking-widest active:bg-gray-200 transition-colors">Next</button>
        </div>
        <div className="px-8 pb-8">
          <button disabled={isExpanding} onClick={handleExpand} className={`w-full ${isExpanding ? 'bg-gray-200 text-gray-400' : 'bg-[#22C55E] text-white'} py-5 rounded-2xl shadow-lg flex items-center justify-center space-x-3 active:scale-95 transition-all`}><span className="text-2xl">{isExpanding ? '⏳' : '🪄'}</span><span className="text-xs font-bold uppercase tracking-widest">{isExpanding ? 'Magic in progress...' : `Grow ${cat.name} (+10 Words)`}</span></button>
        </div>
      </div>
    );
  };

  const renderGameTypes = () => (
    <div className="min-h-screen bg-white flex flex-col animate-in slide-in-from-right duration-300">
       <div className="bg-[#FFD233] pt-12 pb-6 px-6 rounded-b-[2.5rem] shadow-md flex flex-col items-center relative"><h1 className="text-2xl font-kids text-white uppercase">Game Zone 🎮</h1><button onClick={goMain} className="absolute right-6 bottom-4 bg-white p-2 rounded-full shadow-md text-gray-600 scale-75">🏠</button></div>
        <div className="flex-1 p-6 grid grid-cols-1 gap-4 overflow-y-auto hide-scrollbar">
          {Object.values(GameType).map(type => (
            <button key={type} onClick={() => setState({ ...state, selectedGame: type, view: 'game_cats' })} className="flex items-center p-6 bg-white rounded-[3rem] border-2 border-indigo-50 shadow-soft active:border-indigo-400 transform active:scale-98 transition-all"><span className="text-4xl mr-6">{type === GameType.FLASHCARDS ? '🗂️' : type === GameType.QUIZ ? '❓' : type === GameType.MEMORY ? '🧠' : type === GameType.MATCHING ? '🔗' : type === GameType.SPELLING ? '🔤' : '🔍'}</span><span className="text-xl font-kids text-indigo-700 uppercase">{type}</span></button>
          ))}
        </div>
    </div>
  );

  const renderGameCats = () => (
    <div className="min-h-screen bg-white flex flex-col animate-in slide-in-from-right duration-300">
       <div className="bg-[#FFD233] pt-12 pb-6 px-6 rounded-b-[2.5rem] shadow-md flex flex-col items-center relative"><h1 className="text-2xl font-kids text-white uppercase">Pick Topic 🎨</h1><button onClick={() => setState({...state, view: 'game_types'})} className="absolute right-6 bottom-4 bg-white p-2 rounded-full shadow-md text-gray-600 scale-75">🔙</button></div>
        <div className="flex-1 p-5 grid grid-cols-2 gap-4 overflow-y-auto hide-scrollbar">
           {categories.map(cat => (
             <button key={cat.id} onClick={() => setState({ ...state, selectedCategory: cat, view: 'game_active' })} className={`${cat.color} p-7 rounded-[3rem] shadow-lg flex flex-col items-center justify-center space-y-2 transform active:scale-95 transition-all`}><span className="text-5xl">{cat.icon}</span><span className="text-white font-kids text-sm uppercase">{cat.name}</span></button>
           ))}
        </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen relative overflow-hidden bg-white shadow-2xl">
      {state.view === 'main' && renderMain()}
      {state.view === 'learning_detail' && renderLearningDetail()}
      {state.view === 'game_types' && renderGameTypes()}
      {state.view === 'game_cats' && renderGameCats()}
      {state.view === 'game_active' && state.selectedCategory && state.selectedGame && (
        <GameEngine category={state.selectedCategory} gameType={state.selectedGame} onBack={() => setState({ ...state, view: 'game_types' })} />
      )}
    </div>
  );
};

export default App;
