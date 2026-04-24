"use server";

import { createClient } from "@supabase/supabase-js";

export async function saveContribution(data: {
  campaign_id: string;
  wallet_address: string;
  amount_xlm: number;
  donor_name?: string;
  donor_message?: string;
  is_anonymous: boolean;
  tx_hash: string;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase.from("contributions").insert({
    campaign_id: data.campaign_id,
    wallet_address: data.wallet_address,
    amount_xlm: data.amount_xlm,
    donor_name: data.donor_name || null,
    donor_message: data.donor_message || null,
    is_anonymous: data.is_anonymous,
    tx_hash: data.tx_hash,
    status: "confirmed"
  });

  if (error) {
    console.error("Failed to save contribution:", error);
    throw new Error("Failed to save contribution to database.");
  }
}

export async function addComment(data: {
  campaign_id: string;
  content: string;
  author_id?: string | null;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: newComment, error } = await supabase.from("comments").insert({
    campaign_id: data.campaign_id,
    author_id: data.author_id || null,
    content: data.content,
    is_hidden: false,
  }).select().single();

  if (error) {
    console.error("Failed to add comment:", error);
    throw new Error("Failed to add comment to database.");
  }

  return newComment;
}
