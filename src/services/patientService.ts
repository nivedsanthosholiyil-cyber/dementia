import { supabase } from '@/lib/supabase';
import type { PatientRecord } from '@/types';

export async function createPatient(patient: Pick<PatientRecord, 'name'> & Partial<PatientRecord>, userId: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('patients').insert({ ...patient, auth_user_id: userId }).select().single();
  if (error) throw error;
  return data as PatientRecord;
}

/** Creates the signed-in patient's row only when the RLS-protected row is missing. */
export async function ensureCurrentUserPatient(name: string): Promise<PatientRecord | null> {
  if (!supabase) return null;
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const user = authData.user;
  if (!user) return null;
  const { data: existing, error: lookupError } = await supabase
    .from('patients')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return existing as PatientRecord;
  const { data, error } = await supabase
    .from('patients')
    .insert({ auth_user_id: user.id, name: name.trim() || 'My profile', share_with_caregiver: false })
    .select()
    .single();
  if (error) throw error;
  return data as PatientRecord;
}

export async function listAuthorizedPatients() {
  if (!supabase) return [] as PatientRecord[];
  const { data, error } = await supabase.from('patients').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as PatientRecord[];
}

export async function setPatientAccess(caregiverId: string, patientId: string, status: 'pending' | 'active' | 'revoked') {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('caregiver_patient').upsert({ caregiver_id: caregiverId, patient_id: patientId, status, granted_by: caregiverId });
  if (error) throw error;
}
