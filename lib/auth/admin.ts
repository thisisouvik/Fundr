import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getConfiguredAdminEmail() {
  return (process.env.ADMIN_PANEL_EMAIL || "").trim().toLowerCase();
}

export async function requireAdminPanelAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const configuredAdminEmail = getConfiguredAdminEmail();
  const userEmail = (user.email || "").trim().toLowerCase();

  if (!configuredAdminEmail || userEmail !== configuredAdminEmail) {
    redirect("/dashboard?admin_error=denied");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_verified")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    await supabase
      .from("profiles")
      .update({ role: "admin", is_verified: true })
      .eq("id", user.id);
  }

  return { supabase, user };
}
