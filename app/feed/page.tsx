
"use client";
import { useState } from "react";
type Category = "All" | "For Sale" | "Lost & Found" | "Recommendation" | "Safety" | "General";
type Post = { id: string; author: string; neighborhood: string; category: Category; time: string; text: string; likes: number; liked: boolean; comments: number; };
const INITIAL_POSTS: Post[] = [
  { id: "1", author: "Megan S.", neighborhood: "Parkwood Hills", category: "For Sale", time: "2h", text: "Moving sale - barely used patio set, $150 OBO. Pickup near 304 NE 115th. DM me!", likes: 12, liked: true, comments: 3 },
  { id: "2", author: "David L.", neighborhood: "Parkwood Hills", category: "Lost & Found", time: "4h", text: "Found black lab near Vivion Rd, no collar. Super friendly.", likes: 24, liked: false, comments: 8 },
  { id: "3", author: "Jen R.", neighborhood: "North KC", category: "Recommendation", time: "6h", text: "Anyone have a good plumber rec for 64155?", likes: 3, liked: false, comments: 5 },
];
const CATEGORIES: Category[] = ["All","For Sale","Lost & Found","Recommendation","Safety","General"];
export default function FeedPage(){
  const [active,setActive]=useState<Category>("All");
  const [posts,setPosts]=useState<Post[]>(INITIAL_POSTS);
  const filtered = active==="All"?posts:posts.filter(p=>p.category===active);
  return (
    <main className="min-h-screen bg-[#fefcf5]">
      <header className="sticky top-0 z-10 flex h-[56px] items-center justify-between border-b bg-white px-4">
        <div className="flex items-center gap-2"><span className="font-bold">Neighborly KC</span><span>📍</span><span className="font-semibold">5mi</span></div>
        <button className="rounded-full bg-black px-5 py-2 text-white text-[14px]">Join</button>
      </header>
      <div className="mx-auto max-w-[800px] p-4 space-y-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          {CATEGORIES.map(c=><button key={c} onClick={()=>setActive(c)} className={`rounded-full border px-3 py-1 text-[13px] ${active===c?"bg-zinc-900 text-white":"bg-white"}`}>{c}</button>)}
        </div>
        {filtered.length===0?<p className="text-center text-zinc-400 py-16">No posts in {active}</p>:filtered.map(p=>(
          <div key={p.id} className="rounded-[16px] border bg-white p-4"><p className="font-semibold text-sm">{p.author} • {p.neighborhood}</p><p className="mt-2 text-sm">{p.text}</p></div>
        ))}
      </div>
    </main>
  );
}
