import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PatientProfile } from '@/types';
import { createProfile, profiles, removeProfile, updateProfile } from '@/services/profileService';
import { useSettings } from '@/hooks/useSettings';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { GUEST_PATIENT_ID } from '@/services/guestService';
import { useI18n } from '@/i18n';
import { ageFromDateOfBirth, dateOfBirthFromAge } from '@/utils/date';

export function Profiles() {
  const { settings, updateActiveProfile } = useSettings(); const navigate = useNavigate();
  const { t } = useI18n();
  const [list, setList] = useState<PatientProfile[]>([]); const [name, setName] = useState(''); const [age, setAge] = useState(''); const [notes, setNotes] = useState(''); const [interests, setInterests] = useState(''); const [editingId, setEditingId] = useState<string | null>(null);
  const reload = () => profiles().then((all) => setList(settings.guestMode ? all.filter((profile) => profile.id === GUEST_PATIENT_ID) : all.filter((profile) => profile.id !== GUEST_PATIENT_ID))); useEffect(() => { reload(); }, [settings.guestMode]);
  const resetForm = () => { setName(''); setAge(''); setNotes(''); setInterests(''); setEditingId(null); };
  const save = async () => {
    if (!name.trim()) return;
    const numericAge = age.trim() ? Number(age) : null;
    if (numericAge !== null && (!Number.isInteger(numericAge) || numericAge < 1 || numericAge > 120)) return;
    const details = { dateOfBirth: numericAge === null ? null : dateOfBirthFromAge(numericAge), notes, interests };
    if (editingId) {
      const existing = list.find((profile) => profile.id === editingId);
      if (!existing) return;
      const updated = { ...existing, name: name.trim(), ...details };
      await updateProfile(updated); if (settings.activePatientId === updated.id) updateActiveProfile({ patientName: updated.name });
    } else {
      const p = await createProfile(name, details); select(p);
    }
    resetForm(); await reload();
  };
  const select = (p: PatientProfile) => updateActiveProfile({ id: p.id, patientName: p.name });
  const edit = (p: PatientProfile) => { setEditingId(p.id); setName(p.name); setAge(String(ageFromDateOfBirth(p.dateOfBirth) ?? '')); setNotes(p.notes ?? ''); setInterests(p.interests ?? ''); };
  const erase = async (p: PatientProfile) => { if (!window.confirm(t('profiles.deleteConfirm', { name: p.name }))) return; await removeProfile(p.id); if (settings.activePatientId === p.id) updateActiveProfile({ id: 'local-profile', patientName: '' }); reload(); };
  return <><AppHeader subtitle={t('profiles.title')} showBack onBack={() => navigate('/settings')} /><main className="page stack"><h1 className="page-title">{t('profiles.title')}</h1><p className="muted">{t('profiles.subtitle')}</p><div className="card stack-sm"><label className="field__label" htmlFor="profile-name">{t('profiles.newName')}</label><input id="profile-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /><div className="grid-2"><div><label className="field__label" htmlFor="profile-age">{t('profiles.age')}</label><input id="profile-age" className="input" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 3))} type="number" min="1" max="120" inputMode="numeric" placeholder={t('profiles.ageOptional')} /></div><div><label className="field__label" htmlFor="profile-interests">{t('profiles.interests')}</label><input id="profile-interests" className="input" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder={t('profiles.interestsPlaceholder')} /></div></div><label className="field__label" htmlFor="profile-notes">{t('profiles.notes')}</label><textarea id="profile-notes" className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('profiles.notesPlaceholder')} /><small className="muted">{t('profiles.ageHint')}</small><div className="row"><Button block onClick={() => void save()}>{editingId ? t('profiles.save') : t('profiles.add')}</Button>{editingId && <Button variant="ghost" onClick={resetForm}>{t('profiles.cancel')}</Button>}</div></div>{list.length === 0 && <div className="card muted">{t('profiles.empty')}</div>}{list.map((p) => <div className="card row-between" key={p.id}><div><strong>{p.name}</strong><div className="muted">{p.id === settings.activePatientId ? t('profiles.active') : t('profiles.selectHint')}{ageFromDateOfBirth(p.dateOfBirth) !== null ? ` · ${t('profiles.ageValue', { n: ageFromDateOfBirth(p.dateOfBirth) ?? 0 })}` : ''}</div>{p.interests && <div className="muted">{t('profiles.interests')}: {p.interests}</div>}{p.notes && <div className="muted">{p.notes}</div>}</div><div className="row" style={{ gap: '0.4rem' }}><Button variant="ghost" onClick={() => select(p)}>{t('profiles.select')}</Button><Button variant="ghost" onClick={() => edit(p)}>{t('profiles.edit')}</Button><Button variant="ghost" onClick={() => erase(p)}>{t('profiles.delete')}</Button></div></div>)}</main></>;
}
