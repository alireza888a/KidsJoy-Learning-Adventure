
import React, { useEffect, useState } from 'react';
import { AvatarConfig, AvatarReaction } from '../types';
import { getHighResEmojiUrl } from '../services/emojiService';

interface Props {
  avatar: AvatarConfig;
  reaction: AvatarReaction;
}

export const Avatar: React.FC<Props> = ({ avatar, reaction }) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [imgError, setImgError] = useState(false);
  const avatarUrl = getHighResEmojiUrl(avatar.emoji);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // ریست کردن خطا در صورت تغییر آواتار
  useEffect(() => {
    setImgError(false);
  }, [avatar.id]);

  const getAvatarAnimation = () => {
    switch (reaction) {
      case 'success': return 'animate-bounce scale-110';
      case 'thinking': return 'rotate-[15deg] translate-y-4 brightness-90';
      default: return 'animate-[float_3s_ease-in-out_infinite]';
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-center pointer-events-none">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes shadow-scale {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(0.7); opacity: 0.1; }
        }
      `}</style>

      <div className="relative group">
        {reaction === 'success' && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <span className="absolute -top-12 -left-4 animate-ping text-3xl">✨</span>
            <span className="absolute -top-8 right-0 animate-bounce text-2xl">⭐</span>
            <span className="absolute top-0 -right-8 animate-pulse text-2xl">🌟</span>
          </div>
        )}

        {reaction === 'thinking' && (
          <div className="absolute -top-16 -left-12 bg-white/90 backdrop-blur-md px-4 py-2 rounded-3xl shadow-xl border border-white/50 animate-in zoom-in slide-in-from-bottom-4 duration-300 z-20">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">💡</span>
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white/90 rotate-45 border-r border-b border-white/50"></div>
          </div>
        )}

        <div className={`relative transition-all duration-500 transform ${getAvatarAnimation()}`}>
          {!imgError ? (
            <img 
              src={avatarUrl} 
              alt={avatar.name}
              onError={() => setImgError(true)}
              className={`w-28 h-28 object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.3)] transition-transform ${isBlinking ? 'scale-y-90' : 'scale-y-100'}`}
            />
          ) : (
            <div className="w-28 h-28 flex items-center justify-center text-7xl drop-shadow-2xl">
              {avatar.emoji}
            </div>
          )}
          
          <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 -z-10 ${avatar.color}`}></div>
        </div>

        <div 
          className="w-16 h-4 bg-black rounded-[100%] mx-auto mt-2 blur-sm animate-[shadow-scale_3s_ease-in-out_infinite] transition-opacity duration-500"
          style={{ opacity: reaction === 'success' ? 0.05 : 0.2 }}
        ></div>
      </div>
    </div>
  );
};
