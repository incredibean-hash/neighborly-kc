'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type NotificationItem = {
  id: string;
  type: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const loadNotifications = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (cancelled) return;

      if (error) {
        console.error('Failed to load notifications:', error);
        setItems([]);
      } else {
        setItems((data as NotificationItem[]) || []);
      }

      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setItems((current) => [
              payload.new as NotificationItem,
              ...current,
            ]);
          }
        )
        .subscribe();

      setLoading(false);
    };

    loadNotifications();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const markRead = async (id: string) => {
    const readAt = new Date().toISOString();

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('id', id);

    if (error) {
      console.error('Failed to mark notification as read:', error);
      return;
    }

    setItems((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, read_at: readAt }
          : notification
      )
    );
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
      <header className="sticky top-0 bg-[#0a0d14]/95 backdrop-blur border-b border-white/10 p-4">
        <div className="max-w-2xl mx-auto flex gap-3 items-center">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-10 h-10 rounded-full bg-white/10"
            aria-label="Back to Neighborly KC"
          >
            ←
          </button>
          <div>
            <h1 className="font-black text-xl">Notifications</h1>
            <p className="text-xs text-white/50">Likes, comments and messages</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-2">
        {items.length === 0 && (
          <div className="text-center text-white/40 py-16">
            You&apos;re all caught up.
          </div>
        )}

        {items.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={() => markRead(notification.id)}
            className={`w-full text-left rounded-2xl p-4 border border-white/10 ${
              notification.read_at
                ? 'bg-white/[.03]'
                : 'bg-[#1976ff]/15'
            }`}
          >
            <div className="flex gap-3">
              <span className="text-xl" aria-hidden="true">
                {notification.type === 'message'
                  ? '💬'
                  : notification.type === 'comment'
                    ? '🗨️'
                    : '❤️'}
              </span>

              <div className="flex-1">
                <p>{notification.message}</p>
                <small className="text-white/40">
                  {new Date(notification.created_at).toLocaleString()}
                </small>
              </div>

              {!notification.read_at && (
                <span className="w-2 h-2 rounded-full bg-[#1976ff] mt-2" />
              )}
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
