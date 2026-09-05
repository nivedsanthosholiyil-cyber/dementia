import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { useSettings } from '@/hooks/useSettings';
import { isSupabaseConfigured } from '@/lib/supabase';
import { listPeople, personPhotoUrl, removePerson, savePerson } from '@/services/peopleService';
import type { PersonMemory, PersonRelationship } from '@/types';
import { ListSkeleton } from '@/components/Skeleton';
import { ContentState } from '@/components/ContentState';

const relationships: PersonRelationship[] = ['family', 'friend', 'caregiver', 'clinician', 'other'];

export function People() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const patientId = settings.activePatientId;
  const [people, setPeople] = useState<PersonMemory[]>([]);
  const [editing, setEditing] = useState<Partial<PersonMemory> | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [voice, setVoice] = useState<File | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(Boolean(patientId && isSupabaseConfigured));

  const reload = async () => {
    if (!patientId || !isSupabaseConfigured) return;
    setLoading(true);
    try {
      const next = await listPeople(patientId);
      setPeople(next);
      const urls = await Promise.all(next.filter((p) => p.photo_path).map(async (p) => [p.id, await personPhotoUrl(p.photo_path ?? null)] as const));
      setPhotoUrls(Object.fromEntries(urls.filter((entry): entry is [string, string] => Boolean(entry[1]))));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load people.'); } finally { setLoading(false); }
  };
  useEffect(() => { void reload(); }, [patientId]);

  const save = async () => {
    if (!patientId || !editing?.name?.trim()) return;
    try {
      await savePerson({ ...editing, patient_id: patientId, name: editing.name.trim() }, photo, voice);
      setEditing(null); setPhoto(null); setVoice(null); setMessage('Person saved.'); await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save person.'); }
  };
  const erase = async (id: string) => {
    if (!window.confirm('Delete this person?')) return;
    try { await removePerson(id); await reload(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to delete person.'); }
  };

  return <>
    <AppHeader subtitle="My people" showBack onBack={() => navigate(location.pathname.startsWith('/caregiver') ? '/caregiver/patient' : '/settings')} />
    <main className="page stack">
      <div><h1 className="page-title">My people</h1><p className="muted">Add familiar faces and gentle notes for this patient.</p></div>
      {!isSupabaseConfigured && <div className="banner banner--soft">Connect Supabase to save people and their photos securely.</div>}
      {!patientId && <div className="card muted">Select a patient profile before adding people.</div>}
      {isSupabaseConfigured && patientId && <>
        <Button block onClick={() => setEditing({ relationship: 'family' })}>Add a person</Button>
        {editing && <div className="card stack-sm">
          <label className="field__label" htmlFor="person-name">Name</label><input id="person-name" className="input" value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
          <label className="field__label" htmlFor="person-nickname">Nickname</label><input id="person-nickname" className="input" value={editing.nickname ?? ''} onChange={(e) => setEditing({ ...editing, nickname: e.target.value })} />
          <label className="field__label" htmlFor="person-relationship">Relationship</label><select id="person-relationship" className="input" value={editing.relationship ?? 'other'} onChange={(e) => setEditing({ ...editing, relationship: e.target.value as PersonRelationship })}>{relationships.map((r) => <option key={r}>{r}</option>)}</select>
          <label className="field__label" htmlFor="person-notes">Notes</label><textarea id="person-notes" className="input" value={editing.notes ?? ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} rows={3} />
          <label className="field__label" htmlFor="person-photo">Photo</label><input id="person-photo" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          <label className="field__label" htmlFor="person-voice">Voice recording (optional)</label><input id="person-voice" type="file" accept="audio/*" onChange={(e) => setVoice(e.target.files?.[0] ?? null)} />
          <div className="row"><Button onClick={() => void save()} disabled={!editing.name?.trim()}>Save</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
        </div>}
        {loading ? <ListSkeleton count={3} /> : people.length === 0 && !editing ? <ContentState title="No people added yet" detail="Add familiar faces to make activities feel more personal." action={{ label: 'Add a person', onClick: () => setEditing({ relationship: 'family' }) }} /> : null}
        {people.map((person) => <div className="card row-between" key={person.id}>
          <div className="row" style={{ gap: '0.75rem' }}>{photoUrls[person.id] ? <img src={photoUrls[person.id]} alt="" style={{ width: '3.5rem', height: '3.5rem', borderRadius: '9999px', objectFit: 'cover' }} /> : <span className="medallion medallion--green" aria-hidden="true">{person.name.charAt(0).toUpperCase()}</span>}<div><strong>{person.name}</strong><div className="muted">{person.nickname ? `${person.nickname} · ` : ''}{person.relationship}</div>{person.notes && <div className="muted">{person.notes}</div>}</div></div>
          <div className="row"><Button variant="ghost" onClick={() => setEditing(person)}>Edit</Button><Button variant="ghost" onClick={() => void erase(person.id)}>Delete</Button></div>
        </div>)}
      </>}
      {message && <p className="muted" role="status">{message}</p>}
    </main>
  </>;
}
