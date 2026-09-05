import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { personPhotoUrl, listPeople } from '@/services/peopleService';
import type { PersonMemory } from '@/types';
import { shuffle, type GameOutcome } from '@/utils/helpers';

interface Props { level: number; patientId: string; onComplete: (outcome: GameOutcome) => void; }

export function WhoIsThisPerson({ level, patientId, onComplete }: Props) {
  const [people, setPeople] = useState<PersonMemory[]>([]); const [photos, setPhotos] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0); const [correct, setCorrect] = useState(0); const [mistakes, setMistakes] = useState(0); const [message, setMessage] = useState('Loading familiar people…');
  const started = useRef(Date.now());
  useEffect(() => { void (async () => { try { const entries = shuffle(await listPeople(patientId)).filter((p) => p.photo_path); setPeople(entries); const urls = await Promise.all(entries.map(async (p) => [p.id, await personPhotoUrl(p.photo_path ?? null)] as const)); setPhotos(Object.fromEntries(urls.filter((x): x is [string, string] => Boolean(x[1])))); setMessage(entries.length ? 'Who is this person?' : 'Add at least one person with a photo in My People first.'); } catch { setMessage('Unable to load My People.'); } })(); }, [patientId]);
  const target = people[index];
  const options = useMemo(() => target ? shuffle([target, ...people.filter((p) => p.id !== target.id).slice(0, Math.max(1, Math.min(3, level + 1)))]).slice(0, Math.min(4, people.length)) : [], [target, people, level]);
  const answer = (person: PersonMemory) => { if (!target) return; const isCorrect = person.id === target.id; const nextCorrect = correct + (isCorrect ? 1 : 0); const nextMistakes = mistakes + (isCorrect ? 0 : 1); setCorrect(nextCorrect); setMistakes(nextMistakes); const next = index + 1; if (next >= Math.min(people.length, Math.max(3, level + 1))) { const attempts = next; onComplete({ score: Math.round((nextCorrect / attempts) * 100), accuracy: Math.round((nextCorrect / attempts) * 100), attempts, mistakes: nextMistakes, responseTimeMs: Date.now() - started.current, durationSec: Math.round((Date.now() - started.current) / 1000), metrics: { people_shown: attempts, correct_answers: nextCorrect } }); } else { setIndex(next); setMessage(isCorrect ? 'That is right. Let’s try another.' : `That was ${target.name}. Let’s try another.`); } };
  if (!target) return <div className="stack"><p className="text-muted">{message}</p><Button block onClick={() => window.history.back()}>Go to My People</Button></div>;
  return <div className="stack-lg"><p className="text-muted">{message}</p><div className="card text-center stack"><img src={photos[target.id]} alt="A familiar person" style={{ width: 'min(100%, 19rem)', aspectRatio: '1', objectFit: 'cover', borderRadius: 'var(--radius-lg)', margin: '0 auto' }} /><h2>Who is this person?</h2></div><div className="stack-sm">{options.map((person) => <Button key={person.id} block size="lg" variant="secondary" onClick={() => answer(person)}>{person.name}{person.nickname ? ` (${person.nickname})` : ''}</Button>)}</div></div>;
}
