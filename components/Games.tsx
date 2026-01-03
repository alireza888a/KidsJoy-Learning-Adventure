
import React, { useState, useEffect, useMemo } from 'react';
import { Category, Item, GameType, AvatarReaction } from '../types';
import { playLocalSpeech } from '../services/audioPlayer';
import { CATEGORIES } from '../constants';

interface GameProps {
  category: Category;
  gameType: GameType;
  onBack: () => void;
  onReaction: (reaction: AvatarReaction) => void;
}

export const GameEngine: React.FC<GameProps> = ({ category, gameType, onBack, onReaction }) => {
  const [score, setScore] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Game States
  const [options, setOptions] = useState<Item[]>([]);
  const [spellingLetters, setSpellingLetters] = useState<string[]>([]);
  const [userSpelling, setUserSpelling] = useState<string[]>([]);
  const [gameStatus, setGameStatus] = useState<'neutral' | 'correct' | 'error'>('neutral');
  
  // Memory State
  const [memoryCards, setMemoryCards] = useState<{item: Item, flipped: boolean, matched: boolean, id: number}[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);

  // Matching State
  const [matchingImages, setMatchingImages] = useState<{id: string, emoji: string}[]>([]);
  const [matchingWords, setMatchingWords] = useState<{id: string, name: string}[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);

  // Odd One Out State
  const [oddOptions, setOddOptions] = useState<{emoji: string, isOdd: boolean, id: string}[]>([]);

  const shuffledItems = useMemo(() => [...category.items].sort(() => 0.5 - Math.random()), [category]);
  const currentItem = useMemo(() => shuffledItems[currentIndex] || shuffledItems[0], [currentIndex, shuffledItems]);

  const handleSpeech = async (text: string) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      await playLocalSpeech(text);
    } catch (e) {
      console.error("Speech playback error", e);
    }
    setIsSpeaking(false);
  };

  useEffect(() => {
    initLevel();
  }, [currentIndex, gameType, category]);

  const initLevel = () => {
    setGameStatus('neutral');
    
    if (gameType === GameType.FLASHCARDS) {
      handleSpeech(currentItem.name);
    } 
    else if (gameType === GameType.QUIZ) {
      const others = category.items.filter(i => i.id !== currentItem.id);
      const shuffled = [...others].sort(() => 0.5 - Math.random()).slice(0, 3);
      setOptions([...shuffled, currentItem].sort(() => 0.5 - Math.random()));
    } 
    else if (gameType === GameType.SPELLING) {
      const letters = currentItem.name.toUpperCase().split('');
      setSpellingLetters([...letters].sort(() => Math.random() - 0.5));
      setUserSpelling([]);
    } 
    else if (gameType === GameType.MEMORY) {
      const subset = [...category.items].sort(() => 0.5 - Math.random()).slice(0, 6);
      const doubled = [...subset, ...subset].map((item, idx) => ({ 
        item, flipped: false, matched: false, id: idx 
      })).sort(() => 0.5 - Math.random());
      setMemoryCards(doubled);
      setFlippedIndices([]);
    }
    else if (gameType === GameType.MATCHING) {
      const subset = [...category.items].sort(() => 0.5 - Math.random()).slice(0, 3);
      setMatchingImages(subset.map(it => ({ id: it.id, emoji: it.emoji })).sort(() => 0.5 - Math.random()));
      setMatchingWords(subset.map(it => ({ id: it.id, name: it.name })).sort(() => 0.5 - Math.random()));
      setMatchedPairs([]);
      setSelectedImageId(null);
      setSelectedWordId(null);
    }
    else if (gameType === GameType.ODD_ONE_OUT) {
      const correctOnes = [...category.items].sort(() => 0.5 - Math.random()).slice(0, 3);
      const otherCats = CATEGORIES.filter(c => c.id !== category.id);
      const randomCat = otherCats[Math.floor(Math.random() * otherCats.length)];
      const oddOne = randomCat.items[Math.floor(Math.random() * randomCat.items.length)];
      
      const combined = [
        ...correctOnes.map(i => ({ emoji: i.emoji, isOdd: false, id: i.id })),
        { emoji: oddOne.emoji, isOdd: true, id: 'odd-one-' + Date.now() }
      ].sort(() => 0.5 - Math.random());
      setOddOptions(combined);
    }
  };

  const celebrate = (points = 10) => {
    setScore(s => s + points);
    setGameStatus('correct');
    onReaction('success');
    handleSpeech("Awesome!");
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % shuffledItems.length);
    }, 1500);
  };

  const handleWrong = () => {
    setGameStatus('error');
    onReaction('thinking');
    if (navigator.vibrate) navigator.vibrate(100);
    setTimeout(() => setGameStatus('neutral'), 1000);
  };

  const VisualAsset = ({ emoji, size = "text-5xl" }: { emoji: string, size?: string }) => {
    return (
      <div className="w-full h-full flex items-center justify-center overflow-hidden p-2 select-none">
        <span className={`${size} drop-shadow-lg`}>{emoji}</span>
      </div>
    );
  };

  const handleMatch = (type: 'img' | 'word', id: string) => {
    if (matchedPairs.includes(id)) return;
    if (type === 'img') setSelectedImageId(id);
    else setSelectedWordId(id);

    const newImgId = type === 'img' ? id : selectedImageId;
    const newWordId = type === 'word' ? id : selectedWordId;

    if (newImgId && newWordId) {
      if (newImgId === newWordId) {
        const newMatched = [...matchedPairs, newImgId];
        setMatchedPairs(newMatched);
        setSelectedImageId(null);
        setSelectedWordId(null);
        onReaction('success');
        handleSpeech("Good job!");
        if (newMatched.length === 3) setTimeout(() => celebrate(20), 1000);
      } else {
        handleWrong();
        setTimeout(() => {
          setSelectedImageId(null);
          setSelectedWordId(null);
        }, 500);
      }
    }
  };

  const renderFlashcards = () => (
    <div className="flex flex-col items-center animate-in zoom-in w-full">
      <div className="w-64 h-64 bg-white rounded-[4rem] p-8 shadow-2xl border-b-8 border-slate-100 flex items-center justify-center mb-8">
        <VisualAsset emoji={currentItem.emoji} size="text-[120px]" />
      </div>
      <div className="bg-white px-10 py-5 rounded-[2.5rem] shadow-xl text-center mb-8 border-b-4 border-slate-50">
        <h2 className="text-4xl font-kids text-indigo-700 uppercase tracking-widest">{currentItem.name}</h2>
      </div>
      <button onClick={() => { setCurrentIndex(p => (p + 1) % shuffledItems.length); onReaction('idle'); }} className="bg-indigo-600 text-white px-14 py-5 rounded-full font-black text-2xl shadow-xl active:translate-y-2 border-b-8 border-indigo-900 transition-all btn-tap">NEXT!</button>
    </div>
  );

  const renderQuiz = () => (
    <div className="flex flex-col items-center w-full px-6 animate-in fade-in">
      <div className="bg-white px-10 py-5 rounded-[2.5rem] shadow-xl mb-12 border-b-8 border-indigo-50">
        <h2 className="text-3xl font-kids text-indigo-700 uppercase tracking-tighter text-center">WHERE IS {currentItem.name}?</h2>
      </div>
      <div className="grid grid-cols-2 gap-6 w-full max-w-md">
        {options.map((opt, i) => (
          <button key={i} onClick={() => opt.id === currentItem.id ? celebrate() : handleWrong()} 
            className={`aspect-square bg-white rounded-[3rem] shadow-2xl flex items-center justify-center border-b-8 border-slate-100 active:scale-95 transition-all ${gameStatus === 'error' && opt.id !== currentItem.id ? 'opacity-20 grayscale' : ''} btn-tap`}>
            <VisualAsset emoji={opt.emoji} size="text-8xl" />
          </button>
        ))}
      </div>
    </div>
  );

  const renderSpelling = () => (
    <div className="flex flex-col items-center space-y-10 w-full max-w-md animate-in slide-in-from-bottom">
      <div className="w-40 h-40 bg-white rounded-[3rem] p-6 shadow-2xl flex items-center justify-center border-b-8 border-slate-100">
        <VisualAsset emoji={currentItem.emoji} size="text-8xl" />
      </div>
      <div className={`flex flex-wrap justify-center gap-3 min-h-[80px] border-b-4 border-dashed pb-4 w-full ${gameStatus === 'error' ? 'border-red-400' : 'border-indigo-200'}`}>
        {currentItem.name.toUpperCase().split('').map((char, i) => (
          <div key={i} className={`w-12 h-16 rounded-2xl flex items-center justify-center font-black text-3xl shadow-lg transition-all ${userSpelling[i] ? 'bg-indigo-600 text-white scale-110' : 'bg-white/50 text-transparent'}`}>
            {userSpelling[i] || ''}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {spellingLetters.map((char, i) => (
          <button key={i} onClick={() => {
            handleSpeech(char);
            const next = [...userSpelling, char];
            const target = currentItem.name.toUpperCase();
            if (target.startsWith(next.join(''))) {
              setUserSpelling(next);
              if (next.join('') === target) celebrate();
            } else {
              handleWrong();
              setTimeout(() => { setUserSpelling([]); }, 600);
            }
          }} className="w-16 h-18 bg-white rounded-2xl shadow-xl border-b-8 border-indigo-100 flex items-center justify-center text-3xl font-black text-indigo-700 active:translate-y-1 btn-tap">
            {char}
          </button>
        ))}
      </div>
    </div>
  );

  const renderMemory = () => (
    <div className="grid grid-cols-3 gap-4 w-full max-w-sm px-4 animate-in zoom-in">
      {memoryCards.map((card, idx) => (
        <button key={idx} disabled={card.flipped || card.matched} onClick={() => {
          if (flippedIndices.length === 2) return;
          const newCards = [...memoryCards];
          newCards[idx].flipped = true;
          setMemoryCards(newCards);
          const newFlipped = [...flippedIndices, idx];
          setFlippedIndices(newFlipped);
          if (newFlipped.length === 2) {
            const [first, second] = newFlipped;
            if (newCards[first].item.id === newCards[second].item.id) {
              newCards[first].matched = true;
              newCards[second].matched = true;
              setScore(s => s + 5);
              onReaction('success');
              setFlippedIndices([]);
              if (newCards.every(c => c.matched)) setTimeout(initLevel, 1500);
            } else {
              onReaction('thinking');
              setTimeout(() => {
                newCards[first].flipped = false;
                newCards[second].flipped = false;
                setMemoryCards(newCards);
                setFlippedIndices([]);
              }, 1000);
            }
          }
        }} className={`aspect-square rounded-[2rem] shadow-xl transition-all duration-500 transform ${card.flipped || card.matched ? 'bg-white rotate-y-180 scale-100' : 'bg-magic scale-95'} btn-tap`}>
          {(card.flipped || card.matched) ? <VisualAsset emoji={card.item.emoji} size="text-5xl" /> : <span className="text-4xl text-white font-kids">?</span>}
        </button>
      ))}
    </div>
  );

  const renderMatching = () => (
    <div className="w-full max-w-md flex flex-col space-y-10 px-6 animate-in slide-in-from-right">
      <div className="grid grid-cols-3 gap-5">
        {matchingImages.map(it => (
          <button key={it.id} onClick={() => handleMatch('img', it.id)}
            className={`aspect-square rounded-[2.5rem] shadow-xl border-4 flex items-center justify-center transition-all ${matchedPairs.includes(it.id) ? 'bg-green-100 border-green-400 opacity-40 scale-90' : selectedImageId === it.id ? 'bg-indigo-100 border-indigo-500 scale-110 shadow-indigo-200' : 'bg-white border-white'} btn-tap`}>
            <VisualAsset emoji={it.emoji} size="text-5xl" />
          </button>
        ))}
      </div>
      <div className="flex flex-col space-y-4">
        {matchingWords.map(it => (
          <button key={it.id} onClick={() => handleMatch('word', it.id)}
            className={`py-6 rounded-[2.5rem] shadow-lg border-4 font-kids text-2xl uppercase tracking-widest transition-all ${matchedPairs.includes(it.id) ? 'bg-green-500 text-white border-green-600 opacity-40' : selectedWordId === it.id ? 'bg-indigo-600 text-white border-indigo-700 scale-105' : 'bg-white border-slate-100 text-indigo-700'} btn-tap`}>
            {it.name}
          </button>
        ))}
      </div>
    </div>
  );

  const renderOddOneOut = () => (
    <div className="flex flex-col items-center w-full px-8 animate-in zoom-in">
      <div className="bg-white px-8 py-5 rounded-[2.5rem] shadow-xl mb-12 border-b-8 border-orange-50">
        <h2 className="text-3xl font-kids text-orange-600 uppercase text-center">WHICH IS DIFFERENT?</h2>
      </div>
      <div className="grid grid-cols-2 gap-8 w-full">
        {oddOptions.map((opt, i) => (
          <button key={i} onClick={() => opt.isOdd ? celebrate(15) : handleWrong()}
            className={`aspect-square bg-white rounded-[3.5rem] shadow-2xl flex items-center justify-center border-b-12 border-slate-100 active:scale-95 transition-all ${gameStatus === 'error' && !opt.isOdd ? 'opacity-20 grayscale' : ''} btn-tap`}>
            <VisualAsset emoji={opt.emoji} size="text-[110px]" />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden h-full font-kids">
      <div className="bg-[#FFD233] pt-12 pb-5 px-6 rounded-b-[3.5rem] shadow-xl flex flex-col items-center relative z-20 flex-shrink-0">
        <h1 className="text-2xl font-kids text-white uppercase tracking-widest drop-shadow-md">{gameType}</h1>
        <button onClick={onBack} className="absolute left-6 bottom-4 bg-white/40 w-12 h-12 rounded-full shadow-inner text-white flex items-center justify-center text-2xl active:scale-90">🏠</button>
        <div className="absolute right-6 bottom-4 bg-white px-5 py-2 rounded-full shadow-lg font-black text-indigo-600 text-sm">⭐ {score}</div>
      </div>
      <div className="flex-1 flex flex-col justify-center items-center p-6 bg-slate-100/30 overflow-hidden">
        {gameType === GameType.FLASHCARDS && renderFlashcards()}
        {gameType === GameType.QUIZ && renderQuiz()}
        {gameType === GameType.SPELLING && renderSpelling()}
        {gameType === GameType.MEMORY && renderMemory()}
        {gameType === GameType.MATCHING && renderMatching()}
        {gameType === GameType.ODD_ONE_OUT && renderOddOneOut()}
      </div>
    </div>
  );
};
