/* ============================================================
   VedicAladdin V6 — assets/js/voice.js
   Hindi Voice Alerts — Web Speech API (hi-IN)
   ============================================================ */
const VOICE = (function () {
  'use strict';

  function isSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  function speak(text, rate) {
    if (!isSupported()) return;
    window.speechSynthesis.cancel();
    const utt  = new SpeechSynthesisUtterance(text);
    utt.lang   = 'hi-IN';
    utt.rate   = rate || 0.9;
    utt.pitch  = 1.0;
    utt.volume = 1.0;
    // Prefer Hindi voice if available
    const voices = window.speechSynthesis.getVoices();
    const hiVoice = voices.find(v => v.lang === 'hi-IN') || voices.find(v => v.lang.startsWith('hi'));
    if (hiVoice) utt.voice = hiVoice;
    window.speechSynthesis.speak(utt);
  }

  function speakSignal(signal) {
    const MAP = {
      STRONG_BULL : 'आज का संकेत: प्रबल तेजी है। बाज़ार ऊपर जा सकता है।',
      BULL        : 'आज का संकेत: तेजी है।',
      NEUTRAL     : 'आज का संकेत: सपाट बाज़ार। कोई स्पष्ट दिशा नहीं।',
      BEAR        : 'आज का संकेत: मंदी है। सतर्क रहें।',
      STRONG_BEAR : 'आज का संकेत: प्रबल मंदी है। जोखिम उच्च है।',
    };
    speak(MAP[signal] || 'संकेत उपलब्ध नहीं');
  }

  function speakAlert(text) {
    speak('सतर्कता: ' + text);
  }

  function speakSessionStart(session) {
    const MAP = {
      asian  : 'एशियन सत्र शुरू हो रहा है।',
      london : 'लंदन सत्र शुरू हो रहा है।',
      newyork: 'न्यूयॉर्क सत्र शुरू हो रहा है। NASDAQ खुलने वाला है।',
    };
    speak(MAP[session] || session + ' सत्र शुरू');
  }

  function speakCrashAlert(score) {
    if (score >= 60) speak('चेतावनी! क्रैश जोखिम ' + score + ' है। अत्यंत सतर्क रहें।', 0.8);
    else if (score >= 40) speak('सतर्कता: क्रैश जोखिम ' + score + ' है।');
  }

  if (typeof window !== 'undefined') window.VOICE = { isSupported, speak, speakSignal, speakAlert, speakSessionStart, speakCrashAlert };
  return { isSupported, speak, speakSignal, speakAlert, speakSessionStart, speakCrashAlert };
})();
