import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PatientProfile } from '@/types';
import { createProfile, profiles, removeProfile, updateProfile } from '@/services/profileService';
import { useSettings } from '@/hooks/useSettings';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { GUEST_PATIENT_ID } from '@/services/guestService';
import { useI18n } from '@/i18n';

export function Profiles() {
  const { settings, updateActiveProfile } = useSettings(); const navigate = useNavigate();
  const { t } = useI18n();
  const [list, setList] = useState<PatientProfile[]>([]); const [name, setName] = useState('');
  const reload = () => profiles().then((all) => setList(settings.guestMode ? all.filter((profile) => profile.id === GUEST_PATIENT_ID) : all.filter((profile) => profile.id !== GUEST_PATIENT_ID))); useEffect(() => { reload(); }, [settings.guestMode]);
  const add = async () => { if (!name.trim()) return; const p = await createProfile(name); setName(''); await reload(); select(p); };
  const select = (p: PatientProfile) => updateActiveProfile({ id: p.id, patientName: p.name });
  const rename = async (p: PatientProfile) => { const value = window.prompt(t('profiles.namePrompt'), p.name)?.trim(); if (!value) return; await updateProfile({ ...p, name: value }); if (settings.activePatientId === p.id) updateActiveProfile({ patientName: value }); reload(); };
  const erase = async (p: PatientProfile) => { if (!window.confirm(t('profiles.deleteConfirm', { name: p.name }))) return; await removeProfile(p.id); if (settings.activePatientId === p.id) updateActiveProfile({ id: 'local-profile', patientName: '' }); reload(); };
  return <><AppHeader subtitle={t('profiles.title')} showBack onBack={() => navigate('/settings')} /><main className="page stack"><h1 className="page-title">{t('profiles.title')}</h1><p className="muted">{t('profiles.subtitle')}</p><div className="card stack-sm"><label className="field__label" htmlFor="profile-name">{t('profiles.newName')}</label><input id="profile-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /><Button block onClick={add}>{t('profiles.add')}</Button></div>{list.length === 0 && <div className="card muted">{t('profiles.empty')}</div>}{list.map((p) => <div className="card row-between" key={p.id}><div><strong>{p.name}</strong><div className="muted">{p.id === settings.activePatientId ? t('profiles.active') : t('profiles.selectHint')}</div></div><div className="row" style={{ gap: '0.4rem' }}><Button variant="ghost" onClick={() => select(p)}>{t('profiles.select')}</Button><Button variant="ghost" onClick={() => rename(p)}>{t('profiles.edit')}</Button><Button variant="ghost" onClick={() => erase(p)}>{t('profiles.delete')}</Button></div></div>)}</main></>;
}
