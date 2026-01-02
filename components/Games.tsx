
import React, { useState, useEffect } from 'react';
import { Category, Item, GameType } from '../types';
import { getFunFact, generateSpeech } from '../services/geminiService';
import { playTTSSound, playLocalSpeech } from '../services/audioPlayer';
import { CATEGORIES } from '../constants';
import { imageStorage } from '../services/storage';

interface GameProps {
  category: Category;
  gameType: GameType;
  onBack: () => void;
}

export const GameEngine: React.FC<GameProps> = ({ category, gameType, onBack }) => {
  const [score, setScore] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [funFact, setFunFact] = useState<string>('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<Item[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [imageCache, setImageCache] = useState<Record<string, string>>({});

  // State for game-specific data
  const [memoryCards, setMemoryCards] = useState<any[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchingItems, setMatchingItems] = useState<{emojis: Item[], names: Item[]}>({emojis: [], names: []});
  const [selectedEmojiId, setSelectedEmojiId] = useState<string | null>(null);
  const [selectedNameId, setSelectedNameId] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [spellingLetters, setSpellingLetters] = useState<string[]>([]);
  const [userSpelling, setUserSpelling] = useState<string[]>([]);
  const [spellingStatus, setSpellingStatus] = useState<'neutral' | 'correct' | 'error'>('neutral');
  const [oddOneItems, setOddOneItems] = useState<(Item & {isOdd: boolean})[]>([]);

  useEffect(() => {
    const loadImages = async () => {
      const allItems = [...category.items];
      const results = await Promise.all(
        allItems.map(async it => {
          const data = await imageStorage.get(`kids_joy_img_${it.id}`);
          return { id: it.id, data };
        })
      );
      const map: Record<string, string> = {};
      results.forEach(res => { if (res.data) map[res.id] = res.data; });
      setImageCache(prev => ({ ...prev, ...map }));
    };
    loadImages();
  }, [category]);

  const handleSpeech = async (text: string, useLocal = true) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      if (useLocal) {
        await playLocalSpeech(text);
      } else {
        const base64 = await generateSpeech(text);
        if (base64) await playTTSSound(base64);
      }
    } catch (e) { console.error(e); }
    setIsSpeaking(false);
  };

  useEffect(() => {
    initGame();
  }, [currentIndex, gameType, category]);

  const getRandomItems = (count: number, excludeId?: string) => {
    let pool = [...category.items];
    if (excludeId) pool = pool.filter(i => i.id !== excludeId);
    return pool.sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));
  };

  const initGame = () => {
    if (!category.items || category.items.length === 0) return;
    const safeIndex = Math.min(currentIndex, category.items.length - 1);
    const current = category.items[safeIndex] || category.items[0];
    if (!current) return;

    if (gameType === GameType.FLASHCARDS) {
      updateFunFact(current.name);
      handleSpeech(current.name);
    } 
    
    else if (gameType === GameType.QUIZ) {
      const others = category.items.filter(i => i.id !== current.id);
      const opts = [...others.sort(() => Math.random() - 0.5).slice(0, 3), current].sort(() => Math.random() - 0.5);
      setShuffledOptions(opts);
    }

    else if (gameType === GameType.MEMORY) {
      const slice = getRandomItems(4);
      const doubled = [...slice, ...slice].sort(() => Math.random() - 0.5).map((it, idx) => ({
        id: it.id + '-' + idx,
        originalId: it.id,
        emoji: it.emoji,
        isFlipped: false,
        isMatched: false
      }));
      setMemoryCards(doubled);
      setFlippedIndices([]);
    }

    else if (gameType === GameType.MATCHING) {
      const slice = getRandomItems(3);
      setMatchingItems({
        emojis: [...slice].sort(() => Math.random() - 0.5),
        names: [...slice].sort(() => Math.random() - 0.5)
      });
      setMatchedPairs([]);
      setSelectedEmojiId(null);
      setSelectedNameId(null);
    }

    else if (gameType === GameType.SPELLING) {
      const letters = current.name.toUpperCase().split('');
      const scrambled = [...letters].sort(() => Math.random() - 0.5);
      setSpellingLetters(scrambled);
      setUserSpelling([]);
      setSpellingStatus('neutral');
    }

    else if (gameType === GameType.ODD_ONE_OUT) {
      const sameCat = getRandomItems(3, current.id);
      const otherCats = CATEGORIES.filter(c => c.id !== category.id);
      const randomCat = otherCats[Math.floor(Math.random() * otherCats.length)];
      const oddItem = randomCat.items[Math.floor(Math.random() * randomCat.items.length)];
      
      const mixed = [
        ...sameCat.map(i => ({...i, isOdd: false})),
        {...oddItem, isOdd: true}
      ].sort(() => Math.random() - 0.5);
      setOddOneItems(mixed);
    }
  };

  const updateFunFact = async (name: string) => {
    const fact = await getFunFact(name, category.name);
    setFunFact(fact);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % category.items.length);
    setIsCorrect(null);
    setSpellingStatus('neutral');
  };

  const celebrate = (shouldSpeak = true) => {
    setIsCorrect(true);
    setScore(s => s + 10);
    if (shouldSpeak) handleSpeech("Awesome!");
    setTimeout(handleNext, 1500);
  };

  const fail = (shouldSpeak = true) => {
    setIsCorrect(false);
    if (shouldSpeak) handleSpeech("Try again!");
    setTimeout(() => setIsCorrect(null), 1000);
  };

  const renderItemVisual = (item: Item, className: string = "text-5xl") => {
    if (!item) return null;
    const img = imageCache[item.id];
    if (img) {
      return <img src={img} alt={item.name} className="w-full h-full object-contain rounded-xl animate-in fade-in" />;
    }
    return <span className={className}>{item.emoji}</span>;
  };

  const renderFlashcards = () => {
    const item = category.items[currentIndex] || category.items[0];
    if (!item) return null;
    return (
      <div className="flex flex-col items-center justify-center space-y-4 animate-in zoom-in duration-300 w-full max-w-[280px] mx-auto">
        <div className="w-full aspect-square bg-[#6366F1] rounded-[2.5rem] shadow-card flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="w-4/5 h-4/5 flex items-center justify-center">
              {renderItemVisual(item, "text-[7rem]")}
            </div>
            <h2 className="text-2xl font-kids text-white capitalize mt-2">{item.name}</h2>
            <button onClick={() => handleSpeech(item.name)} className={`absolute top-4 right-4 bg-white/20 p-2 rounded-full text-white z-10 ${isSpeaking ? 'animate-pulse' : ''}`}>🔊</button>
        </div>
        <div className="bg-indigo-50 p-4 rounded-[1.5rem] w-full text-center border-2 border-indigo-100 min-h-[80px] flex flex-col justify-center">
           <p className="text-[11px] text-indigo-900 font-bold italic leading-tight">"{funFact || 'Thinking...'}"</p>
           <div className="mt-1 text-pink-500 font-bold text-base" dir="rtl">{item.persianName}</div>
        </div>
        <button onClick={handleNext} className="w-full bg-[#FFD233] text-white py-4 rounded-2xl text-lg font-kids shadow-lg uppercase active:scale-95 transition-all">NEXT ➜</button>
      </div>
    );
  };

  const renderQuiz = () => {
    const item = category.items[currentIndex] || category.items[0];
    if (!item) return null;
    return (
      <div className="flex flex-col items-center space-y-6 animate-in slide-in-from-bottom duration-300 w-full">
        <div className="text-center px-4">
          <h3 className="text-xl font-kids text-indigo-800 leading-tight">Where is the <span className="text-pink-500 underline uppercase">{item.name}</span>?</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full max-w-[300px]">
          {shuffledOptions.map((opt, i) => (
            <button 
              key={i} 
              onClick={() => {
                  if (opt.id === item.id) celebrate();
                  else fail();
              }}
              className={`aspect-square flex items-center justify-center p-4 rounded-[2rem] bg-white shadow-soft border-4 transition-all overflow-hidden ${isCorrect === true && opt.id === item.id ? 'border-green-400 bg-green-50' : 'border-gray-50 active:scale-90 active:border-indigo-200'}`}
            >
              {renderItemVisual(opt)}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMemory = () => (
    <div className="flex flex-col items-center space-y-4 animate-in fade-in duration-500 w-full">
      <h3 className="text-lg font-kids text-indigo-800">Find the Pairs! 🧠</h3>
      <div className="grid grid-cols-2 gap-3 w-full max-w-[240px]">
        {memoryCards.map((card, idx) => (
          <button
            key={card.id}
            onClick={() => {
              if (flippedIndices.length === 2 || card.isMatched || card.isFlipped) return;
              const newCards = [...memoryCards];
              newCards[idx].isFlipped = true;
              setMemoryCards(newCards);
              const newFlipped = [...flippedIndices, idx];
              setFlippedIndices(newFlipped);
              if (newFlipped.length === 2) {
                const [f, s] = newFlipped;
                if (memoryCards[f].originalId === memoryCards[s].originalId) {
                  newCards[f].isMatched = true; newCards[s].isMatched = true;
                  setScore(s => s + 20); setFlippedIndices([]);
                  if (newCards.every(c => c.isMatched)) celebrate();
                } else {
                  setTimeout(() => { newCards[f].isFlipped = false; newCards[s].isFlipped = false; setMemoryCards(newCards); setFlippedIndices([]); }, 1000);
                }
              }
            }}
            className={`aspect-square rounded-2xl shadow-soft text-4xl flex items-center justify-center transition-all duration-300 border-4 overflow-hidden ${card.isFlipped || card.isMatched ? 'bg-white border-indigo-200' : 'bg-[#6366F1] border-indigo-400'}`}
          >
            {(card.isFlipped || card.isMatched) ? renderItemVisual({id: card.originalId, emoji: card.emoji} as any, "text-4xl") : '❓'}
          </button>
        ))}
      </div>
    </div>
  );

  const renderMatching = () => (
    <div className="flex flex-col items-center space-y-4 w-full animate-in slide-in-from-left duration-300">
      <h3 className="text-lg font-kids text-indigo-800">Match Them Up! 🔗</h3>
      <div className="flex justify-between w-full space-x-3 px-2">
        <div className="flex flex-col space-y-2 flex-1 max-w-[120px]">
          {matchingItems.emojis.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedEmojiId(item.id);
                if (selectedNameId === item.id) {
                  setMatchedPairs([...matchedPairs, item.id]); setScore(s => s + 15); setSelectedEmojiId(null); setSelectedNameId(null);
                  if (matchedPairs.length + 1 === matchingItems.emojis.length) celebrate();
                } else if (selectedNameId) { setTimeout(() => {setSelectedEmojiId(null); setSelectedNameId(null);}, 500); }
              }}
              className={`aspect-square p-3 rounded-2xl bg-white shadow-soft border-4 transition-all flex items-center justify-center overflow-hidden ${matchedPairs.includes(item.id) ? 'opacity-30 border-green-200' : selectedEmojiId === item.id ? 'border-indigo-500 scale-105' : 'border-gray-50'}`}
            >
              {renderItemVisual(item, "text-4xl")}
            </button>
          ))}
        </div>
        <div className="flex flex-col space-y-2 flex-1 max-w-[120px]">
          {matchingItems.names.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedNameId(item.id);
                if (selectedEmojiId === item.id) {
                  setMatchedPairs([...matchedPairs, item.id]); setScore(s => s + 15); setSelectedEmojiId(null); setSelectedNameId(null);
                  if (matchedPairs.length + 1 === matchingItems.emojis.length) celebrate();
                } else if (selectedEmojiId) { setTimeout(() => {setSelectedEmojiId(null); setSelectedNameId(null);}, 500); }
              }}
              className={`p-3 rounded-2xl bg-white shadow-soft text-[10px] font-black uppercase border-4 aspect-square flex items-center justify-center text-center transition-all ${matchedPairs.includes(item.id) ? 'opacity-30 border-green-200' : selectedNameId === item.id ? 'border-indigo-500 scale-105' : 'border-gray-50'}`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSpelling = () => {
    const item = category.items[currentIndex] || category.items[0];
    if (!item) return null;
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in zoom-in duration-300 w-full px-4">
        <div className="w-40 h-40 p-6 bg-white rounded-[2.5rem] shadow-card flex items-center justify-center overflow-hidden flex-shrink-0">
          {renderItemVisual(item, "text-7xl")}
        </div>
        
        <div className={`flex flex-wrap justify-center gap-1.5 min-h-[50px] w-full border-b-4 border-dashed ${spellingStatus === 'error' ? 'border-red-200' : spellingStatus === 'correct' ? 'border-green-200' : 'border-indigo-100'} pb-4 transition-colors duration-300`}>
          {item.name.toUpperCase().split('').map((char, i) => {
            const isFilled = userSpelling.length > i;
            return (
              <div key={i} className={`w-8 h-10 rounded-lg flex items-center justify-center font-bold text-lg shadow-md transition-all transform ${isFilled ? 'scale-110' : 'scale-100'} ${spellingStatus === 'correct' ? 'bg-green-500 text-white animate-bounce' : spellingStatus === 'error' && isFilled ? 'bg-red-500 text-white animate-pulse' : isFilled ? 'bg-[#6366F1] text-white' : 'bg-white border border-gray-100 text-transparent'}`}>{isFilled ? userSpelling[i] : ''}</div>
            );
          })}
        </div>

        <div className="flex flex-wrap justify-center gap-2 max-w-sm">
          {spellingLetters.map((char, i) => (
            <button key={i} onClick={() => {
              if (spellingStatus === 'correct') return;
              const nextUserSpelling = [...userSpelling, char];
              const target = item.name.toUpperCase();
              if (target.startsWith(nextUserSpelling.join(''))) {
                setUserSpelling(nextUserSpelling);
                if (navigator.vibrate) navigator.vibrate(10);
                if (nextUserSpelling.join('') === target) { 
                  setSpellingStatus('correct'); 
                  handleSpeech(item.name); 
                  setScore(s => s + 20); 
                  setTimeout(handleNext, 2000); 
                }
              } else { 
                setSpellingStatus('error'); 
                if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
                setTimeout(() => { setUserSpelling([]); setSpellingStatus('neutral'); }, 800); 
              }
            }}
            className="w-10 h-12 bg-white rounded-xl shadow-soft border-b-4 border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg active:scale-90 transition-transform">
              {char}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderOddOneOut = () => (
    <div className="flex flex-col items-center space-y-6 animate-in slide-in-from-right duration-300 w-full px-4">
      <h3 className="text-lg font-kids text-indigo-800">Which one is different? 🔍</h3>
      <div className="grid grid-cols-2 gap-3 w-full max-w-[300px]">
        {oddOneItems.map((item, i) => (
          <button key={i} onClick={() => { if (item.isOdd) celebrate(); else fail(); }}
            className={`aspect-square flex items-center justify-center p-4 rounded-[2rem] bg-white shadow-soft border-4 transition-all overflow-hidden ${isCorrect === true && item.isOdd ? 'border-green-400 bg-green-50' : 'border-gray-50 active:scale-90 active:border-indigo-200'}`}
          >
            {renderItemVisual(item, "text-6xl")}
          </button>
        ))}
      </div>
    </div>
  );

  const renderGameContent = () => {
    switch(gameType) {
      case GameType.FLASHCARDS: return renderFlashcards();
      case GameType.QUIZ: return renderQuiz();
      case GameType.MEMORY: return renderMemory();
      case GameType.MATCHING: return renderMatching();
      case GameType.SPELLING: return renderSpelling();
      case GameType.ODD_ONE_OUT: return renderOddOneOut();
      default: return renderFlashcards();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden h-full">
       <div className="bg-[#FFD233] pt-10 pb-3 px-6 rounded-b-[2rem] shadow-md flex flex-col items-center relative z-20 flex-shrink-0">
          <h1 className="text-sm font-kids text-white uppercase tracking-tighter">{gameType}</h1>
          <button onClick={onBack} className="absolute left-6 bottom-2.5 bg-white p-2 rounded-full shadow-md text-gray-600 scale-90">🔙</button>
          <div className="absolute right-6 bottom-2.5 bg-white px-3 py-1 rounded-full shadow-md font-black text-indigo-600 text-[10px]">⭐ {score}</div>
        </div>
      <div className="flex-1 flex flex-col justify-center p-5 bg-pattern overflow-hidden">
        {renderGameContent()}
      </div>
    </div>
  );
};
