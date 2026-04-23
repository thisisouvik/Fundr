import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CampaignRow, FundraiserKycRow, ProfileRow } from "@/types/supabase";

function getConfiguredAdminEmail() {
  return (process.env.ADMIN_PANEL_EMAIL || "").trim().toLowerCase();
}

export async function requireCreatorAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileResponse, kycResponse] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("fundraiser_kyc").select("status").eq("user_id", user.id).maybeSingle(),
  ]);

  const profile = profileResponse.data as Pick<ProfileRow, "role"> | null;
  const kyc = kycResponse.data as Pick<FundraiserKycRow, "status"> | null;
  const normalizedUserEmail = (user.email || "").trim().toLowerCase();
  const isDedicatedAdmin = normalizedUserEmail === getConfiguredAdminEmail();
  const isAdmin = isDedicatedAdmin || profile?.role === "admin";
  const isCreator = isAdmin || profile?.role === "creator";
  const hasApprovedKyc = kyc?.status === "approved";

  if (!isCreator) {
    redirect("/dashboard");
  }

  if (!isAdmin && !hasApprovedKyc) {
    redirect("/settings?error=kyc_required");
  }

  return { supabase, user, profile, kyc, isAdmin, isCreator, hasApprovedKyc };
}

export async function requireCampaignOwnerAccess(campaignId: string) {
  const context = await requireCreatorAccess();

  const { data: campaign } = await context.supabase
    .from("campaigns")
    .select("id, creator_id, title, image_url, gallery_urls, proof_document_url")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign) {
    redirect("/dashboard");
  }

  const typedCampaign = campaign as Pick<
    CampaignRow,
    "id" | "creator_id" | "title" | "image_url" | "gallery_urls" | "proof_document_url"
  >;

  if (!context.isAdmin && typedCampaign.creator_id !== context.user.id) {
    redirect("/dashboard");
  }

  return {
    ...context,
    campaign: typedCampaign,
  };
}