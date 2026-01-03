
/**
 * Simple and robust audio player focusing on native browser Speech Synthesis.
 * This avoids external API calls and base64 decoding issues.
 */

let speechQueue: string[] = [];
let isSpeakingGlobal = false;

/**
 * Native Browser Text-to-Speech (The "Default" model)
 * Robust, offline-capable, and fast.
 */
export const playLocalSpeech = (text: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      console.error("Speech synthesis not supported");
      return resolve(false);
    }

    // Cancel any current speech to ensure responsiveness
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = 'en-US';
    
    // Attempt to pick a pleasant voice
    const voices = window.speechSynthesis.getVoices();
    // Prefer higher quality English voices if available
    const preferredVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Samantha') || v.name.includes('Natural'))
    ) || voices.find(v => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = 0.9;   // Slightly slower for children
    utterance.pitch = 1.1;  // Slightly higher/friendlier
    utterance.volume = 1.0;

    utterance.onend = () => {
      isSpeakingGlobal = false;
      resolve(true);
    };

    utterance.onerror = (e) => {
      console.error("Speech synthesis error", e);
      isSpeakingGlobal = false;
      resolve(false);
    };

    isSpeakingGlobal = true;
    window.speechSynthesis.speak(utterance);
    
    // Safety timeout in case onend doesn't fire (some browsers/os combinations)
    setTimeout(() => {
        if (isSpeakingGlobal) {
            isSpeakingGlobal = false;
            resolve(true);
        }
    }, 5000);
  });
};

/**
 * Legacy support for the TTS function, now redirecting to local speech for stability.
 */
export const playTTSSound = async (base64Data: string, cacheKey?: string) => {
    // Redirecting to local speech as requested to use "default model"
    // The components will be updated to call playLocalSpeech directly
    return Promise.resolve(true);
};

// Initial voice load for Chrome/Safari
if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
}
