import { useCallback, useRef, useState } from 'react';

/**
 * Voice I/O via the browser Web Speech API.
 * Privacy note: in Chrome the recognition audio may be processed by the browser vendor's servers.
 * The production plan is offline recognition (Vosk / Whisper-small) so audio never leaves the phone.
 */
export function useVoice() {
  const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  const supported = !!SR;

  const listen = useCallback((lang = 'en-IN') => new Promise((resolve, reject) => {
    if (!SR) return reject(new Error('Speech recognition is not supported in this browser. Type the answer instead.'));
    const rec = new SR();
    recRef.current = rec;
    rec.lang = lang; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => resolve(e.results[0][0].transcript);
    rec.onerror = (e) => reject(new Error(e.error === 'not-allowed' ? 'Microphone permission was denied.' : e.error === 'no-speech' ? 'Nothing was heard. Please try again.' : `Voice error: ${e.error}`));
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }), [SR]);

  const stop = useCallback(() => { try { recRef.current?.stop(); } catch { /* already stopped */ } setListening(false); }, []);

  const speak = useCallback((text, lang = 'en-IN') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }, []);

  return { supported, listening, listen, stop, speak };
}
