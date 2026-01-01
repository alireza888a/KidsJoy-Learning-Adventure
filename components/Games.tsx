
import React, { useState, useEffect, useMemo } from 'react';
import { Category, Item, GameType } from '../types';
import { getFunFact, generateSpeech } from '../services/geminiService';
import { playTTSSound, playLocalSpeech } from '../services/audioPlayer';
import { CATEGORIES } from '../constants';

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

  // Helper to get cached image
  const getCachedImage = (id: string) => localStorage.getItem(`kids_joy_img_${id}`);

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
    return pool.sort(() => Math.random() - 0.5).slice(0, count);
  };

  const initGame = () => {
    const current = category.items[currentIndex] || category.items[0];

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

  // Render Helpers
  const renderItemVisual = (item: Item, className: string = "text-6xl") => {
    const img = getCachedImage(item.id);
    if (img) {
      return <img src={img} alt={item.name} className="w-full h-full object-contain rounded-2xl" />;
    }
    return <span className={className}>{item.emoji}</span>;
  };

  const renderFlashcards = () => (
    <div className="flex flex-col items-center justify-center space-y-5 animate-in zoom-in duration-300">
      <div className="w-full aspect-square bg-[#6366F1] rounded-[3rem] shadow-card flex flex-col items-center justify-center p-6 relative overflow-hidden">
          <div className="w-4/5 h-4/5 flex items-center justify-center">
            {renderItemVisual(category.items[currentIndex], "text-[8rem]")}
          </div>
          <h2 className="text-3xl font-kids text-white capitalize mt-2">{category.items[currentIndex].name}</h2>
          <button onClick={() => handleSpeech(category.items[currentIndex].name)} className={`absolute top-5 right-5 bg-white/20 p-2.5 rounded-full text-white text-lg z-10 ${isSpeaking ? 'animate-pulse' : ''}`}>🔊</button>
      </div>
      <div className="bg-indigo-50 p-5 rounded-[2rem] w-full text-center border-2 border-indigo-100">
         <p className="text-sm text-indigo-900 font-bold italic leading-relaxed">"{funFact || 'Thinking...'}"</p>
         <div className="mt-2 text-pink-500 font-bold text-lg" dir="rtl">{category.items[currentIndex].persianName}</div>
      </div>
      <button onClick={handleNext} className="w-full bg-[#FFD233] text-white py-4 rounded-[1.5rem] text-lg font-kids shadow-lg uppercase active:scale-95 transition-all">NEXT WORD ➜</button>
    </div>
  );

  const renderQuiz = () => (
    <div className="flex flex-col items-center space-y-6 animate-in slide-in-from-bottom duration-300">
      <div className="text-center">
        <h3 className="text-xl font-kids text-indigo-800">Where is the <span className="text-pink-500 underline">{category.items[currentIndex].name}</span>?</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full">
        {shuffledOptions.map((opt, i) => (
          <button 
            key={i} 
            onClick={() => {
                if (opt.id === category.items[currentIndex].id) celebrate();
                else fail();
            }}
            className={`aspect-square flex items-center justify-center p-4 rounded-[2.5rem] bg-white shadow-soft border-4 transition-all overflow-hidden ${isCorrect === true && opt.id === category.items[currentIndex].id ? 'border-green-400 bg-green-50' : 'border-gray-50 active:scale-90 active:border-indigo-200'}`}
          >
            {renderItemVisual(opt)}
          </button>
        ))}
      </div>
    </div>
  );

  const renderMemory = () => (
    <div className="flex flex-col items-center space-y-6 animate-in fade-in duration-500">
      <h3 className="text-xl font-kids text-indigo-800">Find the Pairs! 🧠</h3>
      <div className="grid grid-cols-2 gap-3 w-full max-w-[280px]">
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
            className={`aspect-square rounded-3xl shadow-soft text-5xl flex items-center justify-center transition-all duration-300 border-4 overflow-hidden ${card.isFlipped || card.isMatched ? 'bg-white border-indigo-200' : 'bg-[#6366F1] border-indigo-400'}`}
          >
            {(card.isFlipped || card.isMatched) ? renderItemVisual({id: card.originalId, emoji: card.emoji} as any) : '❓'}
          </button>
        ))}
      </div>
    </div>
  );

  const renderMatching = () => (
    <div className="flex flex-col items-center space-y-6 w-full px-2 animate-in slide-in-from-left duration-300">
      <h3 className="text-xl font-kids text-indigo-800">Match Them Up! 🔗</h3>
      <div className="flex justify-between w-full space-x-6">
        <div className="flex flex-col space-y-3 flex-1">
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
              className={`aspect-square p-4 rounded-2xl bg-white shadow-soft border-4 transition-all flex items-center justify-center overflow-hidden ${matchedPairs.includes(item.id) ? 'opacity-30 border-green-200' : selectedEmojiId === item.id ? 'border-indigo-500 scale-105' : 'border-gray-50'}`}
            >
              {renderItemVisual(item, "text-4xl")}
            </button>
          ))}
        </div>
        <div className="flex flex-col space-y-3 flex-1">
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
              className={`p-4 rounded-2xl bg-white shadow-soft text-xs font-bold uppercase border-4 h-full flex items-center justify-center transition-all ${matchedPairs.includes(item.id) ? 'opacity-30 border-green-200' : selectedNameId === item.id ? 'border-indigo-500 scale-105' : 'border-gray-50'}`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSpelling = () => (
    <div className="flex flex-col items-center space-y-8 animate-in zoom-in duration-300 w-full max-w-sm">
      <div className="w-48 h-48 p-8 bg-white rounded-[3rem] shadow-card flex items-center justify-center overflow-hidden">
        {renderItemVisual(category.items[currentIndex], "text-[7rem]")}
      </div>
      <div className={`flex flex-wrap justify-center gap-2 min-h-[70px] w-full border-b-8 border-dashed ${spellingStatus === 'error' ? 'border-red-200' : spellingStatus === 'correct' ? 'border-green-200' : 'border-indigo-100'} pb-6 transition-colors duration-300`}>
        {category.items[currentIndex].name.toUpperCase().split('').map((char, i) => {
          const isFilled = userSpelling.length > i;
          return (
            <div key={i} className={`w-10 h-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg transition-all transform ${isFilled ? 'scale-110' : 'scale-100'} ${spellingStatus === 'correct' ? 'bg-green-500 text-white animate-bounce' : spellingStatus === 'error' && isFilled ? 'bg-red-500 text-white animate-pulse' : isFilled ? 'bg-[#6366F1] text-white' : 'bg-white border-2 border-gray-100 text-transparent'}`}>{isFilled ? userSpelling[i] : ''}</div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-3 px-4">
        {spellingLetters.map((char, i) => (
          <button key={i} onClick={() => {
            const nextUserSpelling = [...userSpelling, char];
            const target = category.items[currentIndex].name.toUpperCase();
            if (target.startsWith(nextUserSpelling.join(''))) {
              setUserSpelling(nextUserSpelling);
              if (nextUserSpelling.join('') === target) { setSpellingStatus('correct'); handleSpeech(category.items[currentIndex].name); setScore(s => s + 20); setTimeout(handleNext, 2000); }
            } else { setSpellingStatus('error'); setTimeout(() => { setUserSpelling([]); setSpellingStatus('neutral'); }, 800); }
          }}
          className={`w-12 h-14 bg-white rounded-xl shadow-soft border-b-4 border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl animate-float`}
          style={{ animationDelay: `${i * 0.1}s` }}>{char}</button>
        ))}
      </div>
      <style>{`@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } } .animate-float { animation: float 3s infinite ease-in-out; }`}</style>
    </div>
  );

  const renderOddOneOut = () => (
    <div className="flex flex-col items-center space-y-6 animate-in slide-in-from-right duration-300">
      <h3 className="text-xl font-kids text-indigo-800">Which one is different? 🔍</h3>
      <div className="grid grid-cols-2 gap-4 w-full">
        {oddOneItems.map((item, i) => (
          <button key={i} onClick={() => { if (item.isOdd) celebrate(); else fail(); }}
            className={`aspect-square flex items-center justify-center p-4 rounded-[2.5rem] bg-white shadow-soft border-4 transition-all overflow-hidden ${isCorrect === true && item.isOdd ? 'border-green-400 bg-green-50' : 'border-gray-50 active:scale-90 active:border-indigo-200'}`}
          >
            {renderItemVisual(item, "text-7xl")}
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
    <div className="min-h-screen bg-white flex flex-col">
       <div className="bg-[#FFD233] pt-10 pb-4 px-6 rounded-b-[2rem] shadow-md flex flex-col items-center relative z-20">
          <h1 className="text-lg font-kids text-white uppercase tracking-tighter">{gameType}</h1>
          <button onClick={onBack} className="absolute left-6 bottom-3 bg-white p-2 rounded-full shadow-md text-gray-600 scale-75">🔙</button>
          <div className="absolute right-6 bottom-3 bg-white px-3 py-1 rounded-full shadow-md font-bold text-indigo-600 text-xs">⭐ {score}</div>
        </div>
      <div className="flex-1 flex flex-col justify-center p-6 bg-pattern">
        {renderGameContent()}
      </div>
    </div>
  );
};
