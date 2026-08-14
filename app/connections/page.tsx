"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ConnectionsPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setMe(user);

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("connections")
      .select(
        "id,requester_id,addressee_id,status,created_at"
      )
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error || !data) {
      setItems([]);
      setLoading(false);
      return;
    }

    const ids = Array.from(
      new Set(
        data
          .flatMap((c) => [c.requester_id, c.addressee_id])
          .filter((x) => x !== user.id)
      )
    );

    let profiles: any[] = [];

    if (ids.length) {
      const { data: p } = await supabase
        .from("profiles")
        .select("auth_user_id,full_name,email,zip")
        .in("auth_user_id", ids);

      profiles = p || [];
    }

    const map = new Map(
      profiles.map((x) => [x.auth_user_id, x])
    );

    setItems(
      data.map((c) => ({
        ...c,
        person: map.get(
          c.requester_id === user.id
            ? c.addressee_id
            : c.requester_id
        ),
      }))
    );

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const accept = async (id: string) => {
    if (!me) return;

    await supabase
      .from("connections")
      .update({ status: "accepted" })
      .eq("id", id)
      .eq("addressee_id", me.id);

    await load();
  };

  const remove = async (id: string) => {
    await supabase.from("connections").delete().eq("id", id);
    await load();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070a0f] text-white grid place-items-center">
        Loading…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <header className="sticky top-0 z-10 bg-[#0a0d14]/95 backdrop-blur border-b border-white/10 p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="w-10 h-10 rounded-full bg-white/10"
          >
            ←
          </button>

          <div>
            <h1 className="font-black text-xl">Connections</h1>
            <p className="text-xs text-white/50">
              Your Neighborly KC connections
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-3">
        {!items.length && (
          <div className="text-center text-white/40 py-16">
            No connections yet.
          </div>
        )}

        {items.map((item) => {
          const person = item.person;
          const incoming =
            me && item.addressee_id === me.id;

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-white/10 bg-white/[.04] p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold">
                    {person?.full_name ||
                      person?.email ||
                      "Neighbor"}
                  </p>

                  {person?.zip && (
                    <p className="text-sm text-white/50">
                      Kansas City · {person.zip}
                    </p>
                  )}

                  <p className="text-xs text-white/40 mt-1">
                    {item.status === "accepted"
                      ? "Connected"
                      : incoming
                      ? "Connection request"
                      : "Request sent"}
                  </p>
                </div>

                <div className="flex gap-2">
                  {item.status === "pending" && incoming && (
                    <button
                      onClick={() => accept(item.id)}
                      className="rounded-full bg-[#1976ff] px-4 py-2 font-bold"
                    >
                      Accept
                    </button>
                  )}

                  {item.status === "accepted" && (
                    <button
                      onClick={() => remove(item.id)}
                      className="rounded-full bg-white/10 px-4 py-2"
                    >
                      Remove
                    </button>
                  )}

                  {item.status === "pending" && !incoming && (
                    <button
                      onClick={() => remove(item.id)}
                      className="rounded-full bg-white/10 px-4 py-2"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
