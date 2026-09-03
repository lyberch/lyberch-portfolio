import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { fromDb, getProjectsDb, hasSupabaseConfig, getAllProjectsLocal, saveAllProjectsLocal, type Project } from '../../../lib/projects';
import { isAuthenticated } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

function clean(v: unknown, max = 2000) { return String(v ?? '').trim().slice(0, max); }
function validUrl(v: string) { if (!v) return true; try { const u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:'; } catch { return false; } }
function normalize(body: any, old?: Project): Project {
  return { id: old?.id || crypto.randomUUID(), title: clean(body.title, 100), description: clean(body.description, 1000),
    tags: Array.isArray(body.tags) ? body.tags.map((x: unknown) => clean(x, 40)).filter(Boolean).slice(0, 12) : old?.tags || [],
    image: clean(body.image, 1000), url: clean(body.url, 1000), github: clean(body.github, 1000), role: clean(body.role, 200),
    challenge: clean(body.challenge, 1500), solution: clean(body.solution, 1500), published: body.published !== false,
    createdAt: old?.createdAt || new Date().toISOString() };
}
function validate(p: Project) { if (!p.title || !p.description) return 'Title and description are required.'; if (!validUrl(p.image) || !validUrl(p.url || '') || !validUrl(p.github || '')) return 'URLs must use http or https.'; return null; }

async function seedSupabaseIfEmpty() {
  const client = getProjectsDb();
  const { data, error } = await client.from('projects').select('id').limit(1);
  if (error) throw error;
  if (data?.length) return;
  const projects = await getAllProjectsLocal();
  if (!projects.length) return;
  const rows = projects.map(p => ({ id:p.id, title:p.title, description:p.description, tags:p.tags||[], image:p.image, url:p.url||null, github:p.github||null, role:p.role||null, challenge:p.challenge||null, solution:p.solution||null, published:p.published!==false, created_at:p.createdAt||new Date().toISOString() }));
  const { error: insertError } = await client.from('projects').insert(rows);
  if (insertError) throw insertError;
}

async function readProjects(includeDrafts: boolean) {
  if (!hasSupabaseConfig()) return (await getAllProjectsLocal()).filter(p => includeDrafts || p.published !== false);
  await seedSupabaseIfEmpty();
  let query = getProjectsDb().from('projects').select('*').order('created_at', { ascending: false });
  if (!includeDrafts) query = query.eq('published', true);
  const { data, error } = await query; if (error) throw error; return data.map(fromDb);
}

export async function GET() {
  try { return NextResponse.json(await readProjects(isAuthenticated()), { headers:{'Cache-Control':'no-store','X-Storage':hasSupabaseConfig()?'supabase':'local'} }); }
  catch (error) { console.error('GET /api/projects failed:', error); return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load projects.' }, { status:503 }); }
}

export async function POST(req: Request) {
  if (!isAuthenticated()) return NextResponse.json({error:'Unauthorized'}, {status:401});
  try { const p=normalize(await req.json()); const error=validate(p); if(error)return NextResponse.json({error},{status:400});
    if(!hasSupabaseConfig()){ if(process.env.VERCEL) return NextResponse.json({error:'Supabase is required for project changes on Vercel. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'},{status:503}); const projects=await getAllProjectsLocal(); await saveAllProjectsLocal([p,...projects]); return NextResponse.json(p,{status:201}); }
    const {data,error:dbError}=await getProjectsDb().from('projects').insert({id:p.id,title:p.title,description:p.description,tags:p.tags,image:p.image,url:p.url||null,github:p.github||null,role:p.role||null,challenge:p.challenge||null,solution:p.solution||null,published:p.published!==false,created_at:p.createdAt}).select('*').single(); if(dbError)throw dbError; return NextResponse.json(fromDb(data),{status:201});
  } catch(error){console.error('POST /api/projects failed:',error);return NextResponse.json({error:error instanceof Error?error.message:'Could not save project.'},{status:500});}
}

export async function PUT(req: Request) {
  if (!isAuthenticated()) return NextResponse.json({error:'Unauthorized'}, {status:401});
  try { const body=await req.json(); const id=clean(body.id,100);
    if(!hasSupabaseConfig()){ if(process.env.VERCEL)return NextResponse.json({error:'Supabase is required for project changes on Vercel. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'},{status:503}); const projects=await getAllProjectsLocal(); const old=projects.find(p=>p.id===id); if(!old)return NextResponse.json({error:'Project not found.'},{status:404}); const p=normalize(body,old); const error=validate(p); if(error)return NextResponse.json({error},{status:400}); await saveAllProjectsLocal(projects.map(x=>x.id===id?p:x)); return NextResponse.json(p); }
    const {data:oldRow,error:findError}=await getProjectsDb().from('projects').select('*').eq('id',id).maybeSingle(); if(findError)throw findError; if(!oldRow)return NextResponse.json({error:'Project not found.'},{status:404}); const p=normalize(body,fromDb(oldRow)); const error=validate(p); if(error)return NextResponse.json({error},{status:400}); const {data,error:dbError}=await getProjectsDb().from('projects').update({title:p.title,description:p.description,tags:p.tags,image:p.image,url:p.url||null,github:p.github||null,role:p.role||null,challenge:p.challenge||null,solution:p.solution||null,published:p.published!==false}).eq('id',id).select('*').single(); if(dbError)throw dbError; return NextResponse.json(fromDb(data));
  } catch(error){console.error('PUT /api/projects failed:',error);return NextResponse.json({error:error instanceof Error?error.message:'Could not update project.'},{status:500});}
}

export async function DELETE(req: Request) {
  if (!isAuthenticated()) return NextResponse.json({error:'Unauthorized'}, {status:401});
  try { const {id}=await req.json(); const projectId=clean(id,100);
    if(!hasSupabaseConfig()){ if(process.env.VERCEL)return NextResponse.json({error:'Supabase is required for project changes on Vercel. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'},{status:503}); const projects=await getAllProjectsLocal(); if(!projects.some(p=>p.id===projectId))return NextResponse.json({error:'Project not found.'},{status:404}); await saveAllProjectsLocal(projects.filter(p=>p.id!==projectId)); return NextResponse.json({ok:true}); }
    const {data,error}=await getProjectsDb().from('projects').delete().eq('id',projectId).select('id'); if(error)throw error; if(!data?.length)return NextResponse.json({error:'Project not found.'},{status:404}); return NextResponse.json({ok:true});
  } catch(error){console.error('DELETE /api/projects failed:',error);return NextResponse.json({error:error instanceof Error?error.message:'Could not delete project.'},{status:500});}
}
