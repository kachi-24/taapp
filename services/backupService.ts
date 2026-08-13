import { Activity } from '@/types/activity';
import { UserSettings } from '@/contexts/SettingsContext';
import { ScheduleProfile } from '@/contexts/ScheduleProfilesContext';

// ─── Backup schema ───────────────────────────────────────────────────────────

export const BACKUP_VERSION = 1;

export interface BackupData {
  version: number;
  exported_at: string;
  activities: Activity[];
  settings: Partial<UserSettings>;
  profiles: ScheduleProfile[];
}

// ─── Preview / Result types ───────────────────────────────────────────────────

export interface ImportPreview {
  activitiesNew: number;
  activitiesDuplicate: number;
  profilesNew: number;
  profilesDuplicate: number;
  hasSettings: boolean;
  format: 'json' | 'csv';
  warnings: string[];
}

export interface ImportOptions {
  importActivities: boolean;
  importSettings: boolean;
  importProfiles: boolean;
}

export interface ImportResult {
  activitiesAdded: number;
  activitiesSkipped: number;
  profilesAdded: number;
  profilesSkipped: number;
  settingsApplied: boolean;
  errors: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function datestamp(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Export ──────────────────────────────────────────────────────────────────

/** Download a full JSON backup (activities + settings + profiles). */
export function exportJSON(
  activities: Activity[],
  settings: Partial<UserSettings>,
  profiles: ScheduleProfile[]
): void {
  const payload: BackupData = {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    activities,
    settings,
    profiles,
  };
  downloadBlob(
    JSON.stringify(payload, null, 2),
    `timetable-backup-${datestamp()}.json`,
    'application/json'
  );
}

/** Download activities as a CSV file. */
export function exportCSV(activities: Activity[]): void {
  const COLS: (keyof Activity)[] = [
    'id', 'title', 'description', 'category', 'priority',
    'start_time', 'end_time', 'end_date',
    'recurrence', 'recurrence_days', 'reminder_minutes',
    'location', 'notes', 'is_completed', 'profile_id',
  ];

  const escapeCsv = (v: unknown): string => {
    if (v === undefined || v === null) return '';
    const str = Array.isArray(v) ? v.join('|') : String(v);
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const rows = [
    COLS.join(','),
    ...activities.map(a => COLS.map(c => escapeCsv(a[c])).join(',')),
  ];

  downloadBlob(rows.join('\n'), `activities-${datestamp()}.csv`, 'text/csv');
}

// ─── Parse ───────────────────────────────────────────────────────────────────

export type ParseResult =
  | { ok: true; data: BackupData; format: 'json' }
  | { ok: true; data: BackupData; format: 'csv' }
  | { ok: false; error: string };

/** Parse raw file text into a BackupData structure, validating as we go. */
export function parseBackupFile(
  content: string,
  filename: string
): ParseResult {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'json') {
    return parseJSON(content);
  } else if (ext === 'csv') {
    return parseCSV(content);
  }
  return { ok: false, error: `Unsupported file type ".${ext}". Use .json or .csv.` };
}

function parseJSON(content: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return { ok: false, error: 'Invalid JSON: could not parse file.' };
  }

  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Invalid backup: file is not a JSON object.' };
  }

  const obj = raw as Record<string, unknown>;

  if (!('version' in obj)) {
    return { ok: false, error: 'Invalid backup: missing "version" field.' };
  }
  if (typeof obj.version !== 'number') {
    return { ok: false, error: 'Invalid backup: "version" must be a number.' };
  }
  if (obj.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `Unsupported backup version ${obj.version}. This app supports up to v${BACKUP_VERSION}.`,
    };
  }
  if (!Array.isArray(obj.activities)) {
    return { ok: false, error: 'Invalid backup: "activities" must be an array.' };
  }

  // Validate each activity has the minimum required fields
  const actErrors: string[] = [];
  (obj.activities as unknown[]).forEach((a, i) => {
    if (typeof a !== 'object' || a === null) {
      actErrors.push(`Activity ${i}: not an object`);
      return;
    }
    const act = a as Record<string, unknown>;
    if (!act.title) actErrors.push(`Activity ${i}: missing "title"`);
    if (!act.start_time) actErrors.push(`Activity ${i}: missing "start_time"`);
    if (!act.end_time) actErrors.push(`Activity ${i}: missing "end_time"`);
  });
  if (actErrors.length > 3) {
    return { ok: false, error: `Multiple activity validation errors:\n${actErrors.slice(0, 3).join('\n')} …` };
  }
  if (actErrors.length > 0) {
    return { ok: false, error: actErrors.join('\n') };
  }

  const data: BackupData = {
    version: obj.version as number,
    exported_at: (obj.exported_at as string) ?? '',
    activities: obj.activities as Activity[],
    settings: (obj.settings as Partial<UserSettings>) ?? {},
    profiles: Array.isArray(obj.profiles) ? (obj.profiles as ScheduleProfile[]) : [],
  };

  return { ok: true, data, format: 'json' };
}

function parseCSV(content: string): ParseResult {
  const lines = content.trim().split('\n').filter(Boolean);
  if (lines.length < 2) {
    return { ok: false, error: 'CSV file must have a header row and at least one data row.' };
  }

  const headers = splitCsvLine(lines[0]);
  const required = ['title', 'start_time', 'end_time'];
  const missing = required.filter(f => !headers.includes(f));
  if (missing.length > 0) {
    return { ok: false, error: `CSV missing required columns: ${missing.join(', ')}` };
  }

  const activities: Activity[] = [];
  const parseErrors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });

    if (!row.title || !row.start_time || !row.end_time) {
      parseErrors.push(`Row ${i}: missing required field(s)`);
      continue;
    }

    // Attempt basic ISO date validation
    if (isNaN(new Date(row.start_time).getTime())) {
      parseErrors.push(`Row ${i}: invalid start_time "${row.start_time}"`);
      continue;
    }
    if (isNaN(new Date(row.end_time).getTime())) {
      parseErrors.push(`Row ${i}: invalid end_time "${row.end_time}"`);
      continue;
    }

    activities.push({
      id: row.id || crypto.randomUUID(),
      user_id: row.user_id || '',
      title: row.title,
      description: row.description || undefined,
      category: (row.category as Activity['category']) || 'other',
      priority: (row.priority as Activity['priority']) || 'medium',
      start_time: row.start_time,
      end_time: row.end_time,
      end_date: row.end_date || undefined,
      notes: row.notes || undefined,
      recurrence: (row.recurrence as Activity['recurrence']) || 'none',
      recurrence_days: row.recurrence_days
        ? row.recurrence_days.split('|').map(Number).filter(n => !isNaN(n))
        : undefined,
      reminder_minutes: parseInt(row.reminder_minutes || '15', 10) || 15,
      color: row.color || undefined,
      location: row.location || undefined,
      is_completed: row.is_completed === 'true',
      profile_id: row.profile_id || undefined,
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    });
  }

  if (parseErrors.length > 0 && activities.length === 0) {
    return { ok: false, error: `Could not parse any activities:\n${parseErrors.slice(0, 3).join('\n')}` };
  }

  return {
    ok: true,
    data: {
      version: BACKUP_VERSION,
      exported_at: '',
      activities,
      settings: {},
      profiles: [],
    },
    format: 'csv',
  };
}

/** Splits a CSV line, respecting quoted fields. */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ─── Preview ─────────────────────────────────────────────────────────────────

/** Compute what an import would do without actually doing it. */
export function previewImport(
  incoming: BackupData,
  existingActivities: Activity[],
  existingProfiles: ScheduleProfile[],
  format: 'json' | 'csv'
): ImportPreview {
  const existingActivityIds = new Set(existingActivities.map(a => a.id));
  const existingProfileIds = new Set(existingProfiles.map(p => p.id));

  let activitiesNew = 0;
  let activitiesDuplicate = 0;
  for (const a of incoming.activities) {
    if (existingActivityIds.has(a.id)) activitiesDuplicate++;
    else activitiesNew++;
  }

  let profilesNew = 0;
  let profilesDuplicate = 0;
  for (const p of incoming.profiles) {
    if (existingProfileIds.has(p.id)) profilesDuplicate++;
    else profilesNew++;
  }

  const warnings: string[] = [];
  if (activitiesDuplicate > 0) {
    warnings.push(`${activitiesDuplicate} activit${activitiesDuplicate === 1 ? 'y' : 'ies'} already exist and will be skipped.`);
  }
  if (profilesDuplicate > 0) {
    warnings.push(`${profilesDuplicate} profile${profilesDuplicate === 1 ? '' : 's'} already exist and will be skipped.`);
  }

  return {
    activitiesNew,
    activitiesDuplicate,
    profilesNew,
    profilesDuplicate,
    hasSettings: Object.keys(incoming.settings).length > 0,
    format,
    warnings,
  };
}

// ─── Import ──────────────────────────────────────────────────────────────────

/**
 * Perform the actual import.
 * Returns a result summary — all errors are non-fatal (skipped, not thrown).
 */
export async function performImport(
  incoming: BackupData,
  existingActivities: Activity[],
  existingProfiles: ScheduleProfile[],
  options: ImportOptions,
  addActivity: (a: Omit<Activity, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Activity | null>,
  addProfile: (p: Omit<ScheduleProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<ScheduleProfile | null>,
  updateSettings: (s: Partial<UserSettings>) => Promise<void>
): Promise<ImportResult> {
  const result: ImportResult = {
    activitiesAdded: 0,
    activitiesSkipped: 0,
    profilesAdded: 0,
    profilesSkipped: 0,
    settingsApplied: false,
    errors: [],
  };

  const existingActivityIds = new Set(existingActivities.map(a => a.id));
  const existingProfileIds = new Set(existingProfiles.map(p => p.id));

  // Import activities
  if (options.importActivities) {
    for (const a of incoming.activities) {
      if (existingActivityIds.has(a.id)) {
        result.activitiesSkipped++;
        continue;
      }
      try {
        const { id: _id, user_id: _uid, created_at: _ca, updated_at: _ua, ...rest } = a;
        const saved = await addActivity(rest);
        if (saved) result.activitiesAdded++;
        else { result.activitiesSkipped++; result.errors.push(`Failed to save "${a.title}"`); }
      } catch (e) {
        result.activitiesSkipped++;
        result.errors.push(`Error importing "${a.title}": ${(e as Error).message}`);
      }
    }
  }

  // Import profiles
  if (options.importProfiles) {
    for (const p of incoming.profiles) {
      if (existingProfileIds.has(p.id)) {
        result.profilesSkipped++;
        continue;
      }
      try {
        const { id: _id, user_id: _uid, created_at: _ca, updated_at: _ua, ...rest } = p;
        const saved = await addProfile(rest);
        if (saved) result.profilesAdded++;
        else result.profilesSkipped++;
      } catch (e) {
        result.profilesSkipped++;
        result.errors.push(`Error importing profile "${p.name}": ${(e as Error).message}`);
      }
    }
  }

  // Import settings
  if (options.importSettings && Object.keys(incoming.settings).length > 0) {
    try {
      // Strip server-only / id fields before merging
      const { id: _id, ...safeSettings } = incoming.settings as UserSettings & { id?: string };
      await updateSettings(safeSettings);
      result.settingsApplied = true;
    } catch (e) {
      result.errors.push(`Settings import failed: ${(e as Error).message}`);
    }
  }

  return result;
}
