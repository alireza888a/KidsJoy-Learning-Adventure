
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

let audioCtx: AudioContext | null = null;
const audioCache = new Map<string, AudioBuffer>();

// Instant local speech for simple words
export const playLocalSpeech = (text: string) => {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // Slightly slower for kids
    utterance.pitch = 1.2; // Cheerful pitch
    utterance.onend = resolve;
    window.speechSynthesis.speak(utterance);
  });
};

export const playTTSSound = async (base64Data: string, cacheKey?: string) => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }

  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  let audioBuffer: AudioBuffer;

  if (cacheKey && audioCache.has(cacheKey)) {
    audioBuffer = audioCache.get(cacheKey)!;
  } else {
    const audioBytes = decodeBase64(base64Data);
    audioBuffer = await decodeAudioData(audioBytes, audioCtx, 24000, 1);
    if (cacheKey) audioCache.set(cacheKey, audioBuffer);
  }
  
  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioCtx.destination);
  source.start();
  
  return new Promise((resolve) => {
    source.onended = resolve;
  });
};
