import { useCallback } from 'react';
import { useSettings } from './useSettings';
import { isVoiceSupported, speak, stopSpeaking } from '@/services/voiceService';

interface UseVoice {
  supported: boolean;
  enabled: boolean;
  /** Speak text in the active language. Returns false if it couldn't. */
  say: (text: string) => boolean;
  stop: () => void;
}

export function useVoice(): UseVoice {
  const { settings } = useSettings();
  const supported = isVoiceSupported();
  const enabled = settings.voiceEnabled;

  const say = useCallback(
    (text: string) => speak(text, settings.language),
    [settings.language],
  );

  return { supported, enabled, say, stop: stopSpeaking };
}
