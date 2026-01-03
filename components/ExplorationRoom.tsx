
import React, { useState, useEffect } from 'react';
import { SceneConfig, Item, AvatarReaction } from '../types';
import { CATEGORIES } from '../constants';
import { playLocalSpeech } from '../services/audioPlayer';

interface Props {
  scene: SceneConfig;
  onBack: () => void;
  onReaction: (reaction: AvatarReaction) => void;
}

interface PositionedItem {
  id: string; 
  item: Item;
  x: number;
  y: number;
  size: number;
  isFading: boolean;
}

export const ExplorationRoom: React.FC<Props> = ({ scene, onBack, onReaction }) => {
  const [activeItem, setActiveItem] = useState<PositionedItem | null>(null);
  const [sceneItems, setSceneItems] = useState<PositionedItem[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const initScene = () => {
    setIsFinished(false);
    setActiveItem(null);
    const items: Item[] = [];
    scene.categoryIds.forEach(catId => {
      const cat = CATEGORIES.find(c => c.id === catId);
      if (cat) {
        const count = 4 + Math.floor(Math.random() * 3);
        const shuffled = [...cat.items].sort(() => 0.5 - Math.random()).slice(0, count);
        items.push(...shuffled);
      }
    });

    const positioned = items.map((item, idx) => ({
      id: `${item.id}-${idx}-${Math.random()}`,
      item,
      x: 10 + Math.random() * 75,
      y: 15 + Math.random() * 65,
      size: 70 + Math.random() * 40,
      isFading: false
    }));
    setSceneItems(positioned);
  };

  useEffect(() => {
    initScene();
  }, [scene]);

  const handleItemClick = async (pItem: PositionedItem) => {
    if (pItem.isFading || activeItem) return;

    setActiveItem(pItem);
    onReaction('success');
    
    // Use native browser speech exclusively (the default model)
    try {
      await playLocalSpeech(pItem.item.name);
    } catch (e) {
      console.error("Speech playback error", e);
    }
    
    // Show item for 2.5 seconds then fade it out
    setTimeout(() => {
      setSceneItems(prev => 
        prev.map(it => it.id === pItem.id ? { ...it, isFading: true } : it)
      );
      setActiveItem(null);
      
      setTimeout(() => {
        setSceneItems(prev => {
          const newList = prev.filter(it => it.id !== pItem.id);
          if (newList.length === 0) {
             setIsFinished(true);
             onReaction('success');
          }
          return newList;
        });
      }, 500);
    }, 2500);
  };

  return (
    <div className={`fixed inset-0 ${scene.bgColor} overflow-hidden font-kids select-none`}>
      {/* Back button */}
      <button 
        onClick={onBack}
        className="absolute top-12 left-6 z-50 bg-white/30 backdrop-blur-md w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 border-white/50 btn-tap shadow-lg"
      >
        🏠
      </button>

      {/* Scene Title */}
      {!isFinished && (
        <div className="absolute top-14 left-0 right-0 flex justify-center z-10 pointer-events-none">
          <div className="bg-white/20 backdrop-blur-sm px-6 py-2 rounded-full border border-white/30">
            <h2 className="text-xl text-white font-bold uppercase tracking-widest">{scene.title}</h2>
          </div>
        </div>
      )}

      {/* Background Decor */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        {scene.ambientEmojis.map((emoji, idx) => (
          <span 
            key={idx} 
            className="absolute text-9xl animate-pulse"
            style={{ 
              left: `${(idx * 35) % 90}%`, 
              top: `${(idx * 30) % 85}%`,
              transform: `rotate(${idx * 45}deg)`,
              animationDelay: `${idx * 0.5}s`
            }}
          >
            {emoji}
          </span>
        ))}
      </div>

      {/* Items on the ground */}
      <div className="absolute inset-0">
        {sceneItems.map((pItem) => (
          <button
            key={pItem.id}
            onClick={() => handleItemClick(pItem)}
            className={`absolute transition-all duration-500 
              ${pItem.isFading ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`}
            style={{ 
              left: `${pItem.x}%`, 
              top: `${pItem.y}%`,
              fontSize: `${pItem.size}px`,
              visibility: activeItem?.id === pItem.id ? 'hidden' : 'visible'
            }}
          >
            <span className="drop-shadow-2xl block hover:scale-110 active:scale-90 transition-transform">
              {pItem.item.emoji}
            </span>
          </button>
        ))}
      </div>

      {/* Overlay for Focused Item */}
      {activeItem && (
        <div className="absolute inset-0 z-40 bg-black/30 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
          <div className="flex flex-col items-center animate-in zoom-in duration-500">
            <span className="text-[180px] drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-10 animate-bounce">
              {activeItem.item.emoji}
            </span>
            <div className="bg-white rounded-[3rem] px-12 py-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border-b-[12px] border-indigo-200 flex flex-col items-center space-y-2">
              <span className="text-5xl font-black text-indigo-600 uppercase tracking-tighter">
                {activeItem.item.name}
              </span>
              <div className="h-1 w-20 bg-slate-100 rounded-full my-2"></div>
              <span className="text-4xl font-kids text-slate-400 font-medium" dir="rtl">
                {activeItem.item.persianName}
              </span>
            </div>
            <div className="mt-8">
               <span className="text-white/80 text-2xl animate-pulse">🔊</span>
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {isFinished && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-700">
          <div className="bg-white p-10 rounded-[4rem] shadow-2xl border-b-[12px] border-indigo-200 flex flex-col items-center animate-in zoom-in delay-300">
            <span className="text-8xl mb-6">🌟</span>
            <h2 className="text-5xl font-kids text-indigo-600 mb-2 uppercase tracking-tighter">Excellent!</h2>
            <p className="text-slate-400 font-bold mb-8 uppercase tracking-widest">You found everything!</p>
            <div className="flex space-x-4">
               <button 
                onClick={initScene}
                className="bg-indigo-600 text-white px-10 py-5 rounded-full text-2xl font-black shadow-xl border-b-8 border-indigo-900 active:translate-y-2 active:border-b-0 transition-all btn-tap"
              >
                PLAY AGAIN
              </button>
              <button 
                onClick={onBack}
                className="bg-slate-100 text-slate-600 px-10 py-5 rounded-full text-2xl font-black shadow-xl border-b-8 border-slate-300 active:translate-y-2 active:border-b-0 transition-all btn-tap"
              >
                EXIT
              </button>
            </div>
          </div>
        </div>
      )}

      {!isFinished && sceneItems.length > 0 && (
        <div className="absolute bottom-10 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20">
            <p className="text-white font-bold uppercase tracking-[0.4em] text-xs">
              Items to find: {sceneItems.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
