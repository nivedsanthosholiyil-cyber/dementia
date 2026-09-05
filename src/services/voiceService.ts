// ============================================================
// MemoryCare — Voice Service
// Thin wrapper over the Web Speech API (speechSynthesis).
// Never throws if unsupported; callers can check isSupported().
// ============================================================

import type { LanguageCode } from '@/types';

const BCP47: Record<LanguageCode, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  as: 'as-IN',
  bn: 'bn-IN',
  lus: 'en-IN', // Mizo TTS is rarely available; fall back to English voice
  mni: 'en-IN', // Meitei TTS rarely available; fall back to English voice
};

export function isVoiceSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
}

let currentLang: LanguageCode = 'en';
let enabled = true;

export function configureVoice(lang: LanguageCode, isEnabled: boolean): void {
  currentLang = lang;
  enabled = isEnabled;
}

function pickVoice(langTag: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return undefined;
  // Prefer exact locale, then base language, then any.
  const base = langTag.split('-')[0];
  return (
    voices.find((v) => v.lang.toLowerCase() === langTag.toLowerCase()) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(base)) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('en'))
  );
}

/** Speak text. No-op (returns false) when disabled or unsupported. */
export function speak(text: string, langOverride?: LanguageCode): boolean {
  if (!enabled || !isVoiceSupported() || !text.trim()) return false;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const tag = BCP47[langOverride ?? currentLang] ?? 'en-IN';
    utter.lang = tag;
    utter.rate = 0.92; // gentle, unhurried pace for older listeners
    utter.pitch = 1;
    utter.volume = 1;
    const v = pickVoice(tag);
    if (v) utter.voice = v;
    window.speechSynthesis.speak(utter);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking(): void {
  if (isVoiceSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

// Warm up the voice list (some browsers load voices asynchronously).
if (isVoiceSupported()) {
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  } catch {
    /* ignore */
  }
}
