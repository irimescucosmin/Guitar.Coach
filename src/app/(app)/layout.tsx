import { Sidebar } from "@/components/chrome/sidebar";
import { pageProgress } from "@/lib/progress/server";

/** Every screen except playing and signing in: the navy sidebar and the page beside it. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userName } = await pageProgress();
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar userName={userName} />
      <main className="min-w-0 flex-1 px-[max(20px,env(safe-area-inset-left))] pb-14 pt-8 md:px-12 md:pt-10">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-7">{children}</div>
      </main>
    </div>
  );
}
