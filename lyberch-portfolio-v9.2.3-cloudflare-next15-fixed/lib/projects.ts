import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';

export type Project = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  image: string;
  url?: string;
  github?: string;
  role?: string;
  challenge?: string;
  solution?: string;
  published?: boolean;
  createdAt?: string;
};

type DbProject = {
  id: string; title: string; description: string; tags: string[]; image: string;
  url: string | null; github: string | null; role: string | null;
  challenge: string | null; solution: string | null; published: boolean; created_at: string;
};

const localFile = path.join(process.cwd(), 'data', 'projects.json');

export function hasSupabaseConfig() {
  return Boolean(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
  );
}

export function getProjectsDb(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function fromDb(row: DbProject): Project {
  return {
    id: row.id, title: row.title, description: row.description, tags: row.tags || [], image: row.image,
    url: row.url || undefined, github: row.github || undefined, role: row.role || undefined,
    challenge: row.challenge || undefined, solution: row.solution || undefined,
    published: row.published, createdAt: row.created_at,
  };
}

async function readLocal(): Promise<Project[]> {
  try {
    const raw = await fs.readFile(localFile, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function writeLocal(projects: Project[]) {
  await fs.mkdir(path.dirname(localFile), { recursive: true });
  await fs.writeFile(localFile, JSON.stringify(projects, null, 2) + '\n', 'utf8');
}

export async function getAllProjectsLocal() { return readLocal(); }
export async function saveAllProjectsLocal(projects: Project[]) { return writeLocal(projects); }

export async function getProjectById(id: string, includeDraft = false): Promise<Project | null> {
  if (!hasSupabaseConfig()) {
    const projects = await readLocal();
    return projects.find(p => p.id === id && (includeDraft || p.published !== false)) || null;
  }
  const db = getProjectsDb();
  const result = includeDraft
    ? await db.from('projects').select('*').eq('id', id).maybeSingle()
    : await db.from('projects').select('*').eq('id', id).eq('published', true).maybeSingle();

  if (result.error) throw result.error;
  return result.data ? fromDb(result.data as DbProject) : null;
}

export async function getPublishedProjects(): Promise<Project[]> {
  if (!hasSupabaseConfig()) return (await readLocal()).filter(p => p.published !== false);
  const { data, error } = await getProjectsDb().from('projects').select('*').eq('published', true).order('created_at', { ascending: false });
  if (error) throw error;
  return (data as DbProject[]).map(fromDb);
}
