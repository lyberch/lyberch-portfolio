import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { getProjectById } from "../../../lib/projects";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  let p = null;
  try {
    p = await getProjectById(params.id, false);
  } catch (error) {
    console.error("Project page failed:", error);
  }

  if (!p) return <main className="not-found"><p className="label">404 / PROJECT</p><h1>Project not found.</h1><Link href="/">Back home</Link></main>;

  return <main className="detail"><header className="detail-nav"><Link href="/" className="brand">LYBERCH<span>_</span></Link><Link href="/" className="back"><ArrowLeft size={15}/> All work</Link></header><section className="detail-hero"><p className="label">PROJECT / {p.id}</p><h1>{p.title}</h1><p>{p.description}</p><div className="tags">{p.tags?.map((t:string)=><span key={t}>{t}</span>)}</div></section><div className="detail-image"><img src={p.image} alt={p.title}/></div><section className="detail-grid"><div><p className="label">OVERVIEW</p><p>{p.challenge||'A focused digital experience designed around clarity, performance and a strong visual system.'}</p></div><div><p className="label">ROLE</p><p>{p.role||'Design & Development'}</p><p className="label gap">APPROACH</p><p>{p.solution||'A thoughtful, responsive implementation with attention to interaction, accessibility and detail.'}</p>{p.url&&<a className="button" href={p.url} target="_blank" rel="noreferrer">Visit project <ArrowUpRight size={16}/></a>}</div></section><footer><span>© {new Date().getFullYear()} LYBERCH</span><Link href="/">Home</Link></footer></main>;
}
