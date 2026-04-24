import { redirect } from "next/navigation";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedSidebar } from "@/components/layout/ProtectedSidebar";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <AuthProvider>
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:grid-cols-[240px_1fr] md:gap-8 md:px-8 md:py-10">
          <aside className="md:sticky md:top-6 md:h-fit">
            <ProtectedSidebar />
          </aside>
          <main>{children}</main>
        </div>
      </AuthProvider>
    </div>
  );
}
