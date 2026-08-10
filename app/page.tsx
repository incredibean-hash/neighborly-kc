"use client";
import { useState } from "react";

// TS ^5.3.3 compatible - Restored functional feed
// Matches your screenshot: Neighborly KC 📍 5mi + Join + No posts in All
// + your R98DUGA.html artifact (For Sale, Lost & Found, Parkwood Hills)

type Category = "All" | "For Sale" | "Lost & Found" | "Recommendation" | "Safety" | "General";

type Post = {
  id: string;
  author: string;
  neighborhood: string;
  category: Category;
  time: string;
  text: string;
  likes: number;
  liked: boolean;
  comments: number;
};

const INITIAL: Post[] = [
  { id: "1", author: "Megan S.", neighborhood: "Parkwood Hills", category: "For Sale", time: "2h", text: "Moving sale - patio set $150 OBO. Pickup near 304 NE 115th St. DM me!", likes: 12, liked: true, comments: 3 },
  { id: "2", author: "David L.", neighborhood: "Parkwood Hills", category: "Lost & Found", time: "4h", text: "Found black lab near Vivion Rd, no collar. Super friendly. Anyone missing him?", likes: 24, liked: false, comments: 8 },
  { id: "3", author: "Jen R.", neighborhood: "North KC", category: "Recommendation", time: "6h", text: "Need a good plumber for 64155 who does same-day?", likes: 3, liked: false, comments: 5 },
];

const CATS: Category[] = ["All", "For Sale", "Lost & Found", "Recommendation", "Safety", "General"];

export default function Page() {
  const [active, setActive] = useState<Category>("All");
  const [posts, setPosts] = useState<Post[]>(INITIAL);
  const [draft, setDraft] = useState<string>("");
  const [showComposer, setShowComposer] = useState<boolean>(false);

  const filtered = active === "All" ? posts : posts.filter(p => p.category === active);

  const toggleLike = (id: string): void => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
  };

  const createPost = (): void => {
    if (!draft.trim()) return;
    const newPost: Post = {
      id: String(Date.now()),
      author: "You",
      neighborhood: "Parkwood Hills",
      category: active === "All" ? "General" : active,
      time: "now",
      text: draft,
      likes: 0,
      liked: false,
      comments: 0,
    };
    setPosts([newPost, ...posts]);
    setDraft("");
    setShowComposer(false);
  };

  return (
    <main className="min-h-screen bg-[#fefcf5] text-zinc-900">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-[64px] max-w-[1280px] items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-[18px] font-extrabold tracking-tight">Neighborly KC</span>
            <span>📍</span>
            <span className="font-semibold">5mi</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-[13px] text-zinc-500">412 neighbors • 304 NE 115TH ST</span>
            <button className="rounded-full bg-black px-5 py-2 text-[14px] font-semibold text-white">Join</button>
          </div>
        </div>
        <div className="border-t border-zinc-100 bg-white px-2">
          <div className="mx-auto flex max-w-[1280px] gap-2 overflow-x-auto py-2 no-scrollbar">
            {CATS.map(c => (
              <button key={c} onClick={() => setActive(c)} className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium ${active === c ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"}`}>{c}</button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[720px] p-4">
        {/* Composer - functional */}
        <div className="rounded-[20px] border border-zinc-200 bg-white p-4 shadow-sm">
          {!showComposer ? (
            <button onClick={() => setShowComposer(true)} className="flex w-full items-center gap-3 text-left">
              <div className="h-9 w-9 rounded-full bg-[#e8f5e9] grid place-items-center font-bold text-[#2e7d32]">S</div>
              <span className="flex-1 rounded-full bg-[#f9faf7] border border-zinc-200 px-4 py-2.5 text-[14px] text-zinc-500">Posting to {active} • What&apos;s happening?</span>
            </button>
          ) : (
            <div>
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-full bg-[#e8f5e9] grid place-items-center font-bold text-[#2e7d32]">S</div>
                <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder={`Share something in ${active}...`} className="min-h-[64px] flex-1 resize-none rounded-xl border border-zinc-200 bg-[#f9faf7] p-3 text-[14px] outline-none focus-within:border-zinc-300" />
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setShowComposer(false)} className="rounded-full border border-zinc-200 px-4 py-1.5 text-[13px]">Cancel</button>
                <button onClick={createPost} disabled={!draft.trim()} className="rounded-full bg-[#1b5e20] px-4 py-1.5 text-[13px] font-semibold text-white disabled:bg-zinc-200 disabled:text-zinc-400 hover:bg-[#2e7d32]">Post to {active}</button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-zinc-200 bg-white p-10 text-center"><p className="text-[14px] text-zinc-400">No posts in {active}</p></div>
          ) : (
            filtered.map(post => (
              <article key={post.id} className="rounded-[20px] border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex justify-between">
                  <div className="flex gap-3">
                    <div className="h-9 w-9 rounded-full bg-zinc-100 grid place-items-center text-[12px] font-bold">{post.author[0]}</div>
                    <div>
                      <p className="text-[14px] font-semibold">{post.author} <span className="font-normal text-zinc-500 text-[11px]">• {post.time}</span></p>
                      <p className="text-[11px] text-zinc-500">Posted to {post.neighborhood} • <span className="rounded-full border bg-zinc-50 px-2 py-0.5 text-[10px]">{post.category}</span></p>
                    </div>
                  </div>
                  <button className="text-zinc-400">•••</button>
                </div>
                <p className="mt-3 text-[14.5px] leading-[1.6]">{post.text}</p>
                <div className="mt-3 flex items-center gap-3">
                  <button onClick={() => toggleLike(post.id)} className={`rounded-full border px-3 py-1 text-[13px] ${post.liked ? "border-[#c8e6c9] bg-[#e8f5e9] text-[#2e7d32]" : "border-zinc-200 bg-white text-zinc-600"}`}>♥ {post.likes}</button>
                  <span className="text-[13px] text-zinc-500">{post.comments} comments</span>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="mt-8 text-center text-[11px] text-zinc-400">TS ^5.3.3 • neighborly-kc • 304 NE 115TH ST</div>
      </div>
    </main>
  );
}
