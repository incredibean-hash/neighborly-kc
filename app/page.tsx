"use client";
import { useState } from "react";

// TS ^5.3.3 compatible - Neighborly KC feed - restored from your artifact
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

const INITIAL_POSTS: Post[] = [
  { id: "1", author: "Megan S.", neighborhood: "Parkwood Hills", category: "For Sale", time: "2h", text: "Moving sale - barely used patio set, $150 OBO. Pickup near 304 NE 115th. DM me!", likes: 12, liked: true, comments: 3 },
  { id: "2", author: "David L.", neighborhood: "Parkwood Hills", category: "Lost & Found", time: "4h", text: "Found black lab near Vivion Rd, no collar. Super friendly. Anyone missing him?", likes: 24, liked: false, comments: 8 },
  { id: "3", author: "Jen R.", neighborhood: "North KC", category: "Recommendation", time: "6h", text: "Anyone have a good plumber rec? Need someone who can do same-day in 64155.", likes: 3, liked: false, comments: 5 },
  { id: "4", author: "Carlos M.", neighborhood: "Parkwood Hills", category: "For Sale", time: "1d", text: "Tinkercad kits for kids - free to a good home. My son outgrew them.", likes: 8, liked: false, comments: 1 },
  { id: "5", author: "Priya K.", neighborhood: "Gladstone", category: "Safety", time: "1d", text: "Heads up - porch pirate on NE 115th around 3pm today. Ring footage in comments.", likes: 31, liked: false, comments: 12 },
];

const CATEGORIES: Category[] = ["All", "For Sale", "Lost & Found", "Recommendation", "Safety", "General"];

export default function Page() {
  const [active, setActive] = useState<Category>("All");
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);

  const filtered = active === "All" ? posts : posts.filter(p => p.category === active);

  const toggleLike = (id: string): void => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
  };

  return (
    <main className="min-h-screen bg-[#f6f7f3] text-zinc-900 antialiased selection:bg-green-100">
      {/* Header like screenshot */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-[64px] max-w-[1280px] items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-[18px] font-extrabold tracking-tight">Neighborly KC</span>
            <span className="text-[15px]">📍</span>
            <span className="text-[15px] font-semibold">5mi</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-[13px] text-zinc-500">Parkwood Hills • 412 neighbors</span>
            <button className="rounded-full bg-[#1a1a1a] px-5 py-2 text-[14px] font-semibold text-white hover:bg-black">Join</button>
          </div>
        </div>
        {/* Category Tabs */}
        <div className="mx-auto max-w-[1280px] overflow-x-auto no-scrollbar border-t border-zinc-100 bg-white px-2">
          <div className="flex gap-2 py-2">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  active === c ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-4 py-6 sm:gap-6">
        {/* Composer */}
        <div className="rounded-[20px] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex gap-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-[#e8f5e9] grid place-items-center font-bold text-[#2e7d32]">S</div>
            <button className="flex-1 rounded-full border border-zinc-200 bg-[#f9faf7] px-4 py-2.5 text-left text-[14px] text-zinc-500 hover:bg-white">
              Posting to {active} • What&apos;s happening near 304 NE 115TH ST?
            </button>
          </div>
        </div>

        {/* Feed */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-zinc-200 bg-white p-10 text-center">
              <p className="text-[14px] text-zinc-400">No posts in {active}</p>
            </div>
          ) : (
            filtered.map(post => (
              <article key={post.id} className="rounded-[20px] border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="h-9 w-9 rounded-full bg-zinc-100 grid place-items-center text-[12px] font-bold">{post.author[0]}</div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-semibold">{post.author}</span>
                        <span className="text-[11px] text-zinc-500">• {post.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        <span>Posted to {post.neighborhood}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          post.category === "For Sale" ? "bg-blue-50 text-blue-700 border border-[#d6e8d6]" :
                          post.category === "Lost & Found" ? "bg-amber-50 text-amber-800 border border-amber-100" :
                          "bg-zinc-50 text-zinc-600 border border-zinc-100"
                        }`}>
                          {post.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => alert(`Post options • Report • Mute ${post.author}`)} className="text-zinc-400 hover:text-zinc-600">•••</button>
                </div>

                <p className="mt-3 text-[14.5px] leading-[1.6] text-zinc-800 whitespace-pre-wrap">{post.text}</p>

                <div className="mt-4 flex items-center gap-4">
                  <button onClick={() => toggleLike(post.id)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] ${post.liked ? "border-[#c8e6c9] bg-[#e8f5e9] text-[#2e7d32]" : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"}`}>
                    <span>♥</span> {post.likes}
                  </button>
                  <span className="text-[13px] text-zinc-500">{post.comments} comments</span>
                  <span className="ml-auto text-[11px] text-zinc-400">Walled garden active</span>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <div className="pb-10 text-center text-[11px] text-zinc-400">
        neighborly-kc/neighborly-kc • 304 NE 115TH ST • TS ^5.3.3 • {posts.length} posts
      </div>
    </main>
  );
}
