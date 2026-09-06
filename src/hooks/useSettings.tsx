import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AccessibilitySettings,
  AppSettings,
  ActiveProfile,
  LanguageCode,
  UserRole,
} from '@/types';
import { storageService } from '@/services/storageService';
import { configureVoice } from '@/services/voiceService';
import { activeProfileFrom, displayName } from '@/utils/profile';
import { currentAuthContext, onAuthStateChange, signOut } from '@/services/authService';
import { ensureCurrentUserPatient, listAuthorizedPatients } from '@/services/patientService';
import { supabase } from '@/lib/supabase';
import { inspectSupabase } from '@/lib/supabaseDiagnostics';

const KEY = 'mc:settings';

const DEFAULTS: AppSettings = {
  onboarded: false,
  role: 'patient',
  language: 'en',
  patientName: '',
  caregiverName: '',
  voiceEnabled: true,
  accessibility: {
    largeText: false,
    jumboButtons: false,
    highContrast: false,
    reducedMotion: false,
  },
  emergencyContact: '',
  shareWithCaregiver: false,
  activePatientId: undefined,
  userName: '',
  authenticated: false,
  theme: 'system',
};

interface SettingsContextValue {
  settings: AppSettings;
  setLanguage: (lang: LanguageCode) => void;
  setRole: (role: UserRole) => void;
  setVoiceEnabled: (on: boolean) => void;
  setAccessibility: (patch: Partial<AccessibilitySettings>) => void;
  update: (patch: Partial<AppSettings>) => void;
  updateActiveProfile: (patch: Partial<ActiveProfile>) => void;
  completeOnboarding: () => void;
  logout: () => void;
  authReady: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function load(): AppSettings {
  const stored = storageService.get<Partial<AppSettings>>(KEY, {});
  return {
    ...DEFAULTS,
    ...stored,
    accessibility: { ...DEFAULTS.accessibility, ...(stored.accessibility ?? {}) },
  };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(load);
  const [authReady, setAuthReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    let live = true;
    void inspectSupabase().catch(() => undefined);
    const hydrate = async () => {
      try {
        const context = await currentAuthContext();
        if (!live) return;
        if (!context) { setSettings((s) => ({ ...s, authenticated: false })); return; }
        let patients = await listAuthorizedPatients();
        if (context.role === 'patient' && !context.needsRoleSelection && patients.length === 0) {
          const patient = await ensureCurrentUserPatient(context.displayName);
          if (patient) patients = [patient];
        }
        if (!live) return;
        setSettings((s) => {
          const active = patients.find((patient) => patient.id === s.activePatientId) ?? patients[0];
          return { ...s, authenticated: true, onboarded: true, needsRoleSelection: context.needsRoleSelection, role: context.role, userName: context.displayName, caregiverName: context.role === 'caregiver' ? context.displayName : s.caregiverName, activePatientId: active?.id ?? s.activePatientId, patientName: active?.name ?? s.patientName, activeProfile: active ? { id: active.id, patientName: active.name, caregiverName: context.role === 'caregiver' ? context.displayName : s.caregiverName, role: context.role } : s.activeProfile };
        });
      } catch { if (live) setSettings((s) => ({ ...s, authenticated: false })); }
      finally { if (live) setAuthReady(true); }
    };
    void hydrate();
    const unsubscribe = onAuthStateChange(() => { setAuthReady(false); void hydrate(); });
    return () => { live = false; unsubscribe(); };
  }, []);

  // Persist on every change.
  useEffect(() => {
    storageService.set(KEY, settings);
  }, [settings]);

  // Apply accessibility + language to the document root.
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.largeText = String(settings.accessibility.largeText);
    el.dataset.jumbo = String(settings.accessibility.jumboButtons);
    el.dataset.contrast = String(settings.accessibility.highContrast);
    el.dataset.reducedMotion = String(settings.accessibility.reducedMotion);
    el.lang = settings.language;
    el.dataset.theme = settings.theme ?? 'system';
  }, [settings.accessibility, settings.language, settings.theme]);

  // Keep the voice service in sync.
  useEffect(() => {
    configureVoice(settings.language, settings.voiceEnabled);
  }, [settings.language, settings.voiceEnabled]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      setLanguage: (language) => setSettings((s) => ({ ...s, language })),
      setRole: (role) => setSettings((s) => ({ ...s, role })),
      setVoiceEnabled: (voiceEnabled) =>
        setSettings((s) => ({ ...s, voiceEnabled })),
      setAccessibility: (patch) =>
        setSettings((s) => ({
          ...s,
          accessibility: { ...s.accessibility, ...patch },
        })),
      update: (patch) => setSettings((s) => ({ ...s, ...patch })),
      updateActiveProfile: (patch) => setSettings((s) => {
        const active = activeProfileFrom(s);
        const next = { ...active, ...patch };
        return {
          ...s,
          activeProfile: next,
          role: next.role,
          activePatientId: next.id,
          patientName: next.patientName,
          caregiverName: next.caregiverName,
          userName: displayName(next),
        };
      }),
      completeOnboarding: () => setSettings((s) => ({ ...s, onboarded: true, authenticated: true })),
      logout: () => { void signOut(); setSettings((s) => ({ ...s, authenticated: false })); },
      authReady,
    }),
    [settings, authReady],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
