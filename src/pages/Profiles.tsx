import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PatientProfile } from '@/types';
import { createProfile, profiles, removeProfile, updateProfile } from '@/services/profileService';
import { useSettings } from '@/hooks/useSettings';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';

export function Profiles() {
  const { settings, updateActiveProfile } = useSettings(); const navigate = useNavigate();
  const [list, setList] = useState<PatientProfile[]>([]); const [name, setName] = useState('');
  const reload = () => profiles().then(setList); useEffect(() => { reload(); }, []);
  const add = async () => { if (!name.trim()) return; const p = await createProfile(name); setName(''); await reload(); select(p); };
  const select = (p: PatientProfile) => updateActiveProfile({ id: p.id, patientName: p.name });
  const rename = async (p: PatientProfile) => { const value = window.prompt('Patient name', p.name)?.trim(); if (!value) return; await updateProfile({ ...p, name: value }); if (settings.activePatientId === p.id) updateActiveProfile({ patientName: value }); reload(); };
  const erase = async (p: PatientProfile) => { if (!window.confirm(`Delete ${p.name} and all local data for this patient?`)) return; await removeProfile(p.id); if (settings.activePatientId === p.id) updateActiveProfile({ id: 'local-profile', patientName: '' }); reload(); };
  return <><AppHeader subtitle="Patient profiles" showBack onBack={() => navigate('/settings')} /><main className="page stack"><h1 className="page-title">Patient profiles</h1><p className="muted">Profiles keep reminders, mood, and game activity separate on this device.</p><div className="card stack-sm"><label className="field__label" htmlFor="profile-name">New patient name</label><input id="profile-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /><Button block onClick={add}>Add patient</Button></div>{list.length === 0 && <div className="card muted">No patient profiles yet.</div>}{list.map((p) => <div className="card row-between" key={p.id}><div><strong>{p.name}</strong><div className="muted">{p.id === settings.activePatientId ? 'Active profile' : 'Tap Select to switch'}</div></div><div className="row" style={{ gap: '0.4rem' }}><Button variant="ghost" onClick={() => select(p)}>Select</Button><Button variant="ghost" onClick={() => rename(p)}>Edit</Button><Button variant="ghost" onClick={() => erase(p)}>Delete</Button></div></div>)}</main></>;
}
