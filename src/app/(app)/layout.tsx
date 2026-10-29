import { Sidebar } from "@/components/chrome/sidebar";
import { TopBar } from "@/components/chrome/top-bar";
import { db } from "@/db/client";
import { requireUser } from "@/lib/auth";
import { listConversations, listNotifications, unreadMessages, unreadNotifications } from "@/lib/social/repository";

/** Every screen except playing and signing in: the navy sidebar, the bar with the bell, and the page. Signed-in only. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  const [notifications, messages, anyNotification, conversations] = await Promise.all([
    unreadNotifications(db, me.id),
    unreadMessages(db, me.id),
    listNotifications(db, me.id, 1),
    listConversations(db, me.id),
  ]);
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar userName={me.name} />
      <main className="min-w-0 flex-1 px-[max(20px,env(safe-area-inset-left))] pb-14 pt-4 md:px-12 md:pt-5">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-7">
          <TopBar unread={{ notifications, messages }} show={{ bell: anyNotification.length > 0, mail: conversations.length > 0 }} />
          {children}
        </div>
      </main>
    </div>
  );
}
