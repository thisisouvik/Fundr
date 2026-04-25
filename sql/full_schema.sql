-- 001_init_schema.sql
-- Fundr schema (no RLS policies yet by request)
-- Execute in Supabase SQL editor.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT UNIQUE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  twitter_url TEXT,
  github_url TEXT,
  website_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'creator', 'admin')),
  is_verified BOOLEAN DEFAULT FALSE,
  total_raised_xlm NUMERIC DEFAULT 0,
  total_backed_xlm NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON public.profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_address TEXT UNIQUE NOT NULL,
  factory_tx_hash TEXT,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  short_description TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'technology' CHECK (
    category IN ('technology', 'art', 'education', 'environment', 'health', 'community')
  ),
  goal_xlm NUMERIC NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('draft', 'active', 'successful', 'failed', 'withdrawn')
  ),
  is_featured BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON public.campaigns(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON public.campaigns(category);
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON public.campaigns(slug);

CREATE TABLE IF NOT EXISTS public.campaign_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_updates_campaign ON public.campaign_updates(campaign_id);

CREATE TABLE IF NOT EXISTS public.contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  backer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  wallet_address TEXT NOT NULL,
  amount_xlm NUMERIC NOT NULL,
  tx_hash TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (
    status IN ('pending', 'confirmed', 'refunded')
  ),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contributions_campaign ON public.contributions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_contributions_wallet ON public.contributions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_contributions_backer ON public.contributions(backer_id);

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_campaign ON public.comments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id);

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (
    reason IN ('spam', 'fraud', 'inappropriate', 'misleading', 'other')
  ),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'reviewed', 'resolved', 'dismissed')
  ),
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT report_target CHECK (
    (campaign_id IS NOT NULL AND comment_id IS NULL) OR
    (campaign_id IS NULL AND comment_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN (
      'campaign_funded',
      'campaign_goal_met',
      'campaign_failed',
      'campaign_update',
      'refund_available',
      'withdrawal_available',
      'comment_reply',
      'campaign_flagged'
    )
  ),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE is_read = FALSE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS campaigns_updated_at ON public.campaigns;
CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.generate_campaign_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND length(trim(NEW.slug)) > 0 THEN
    RETURN NEW;
  END IF;

  base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9\\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\\s+', '-', 'g');
  base_slug := substring(base_slug FROM 1 FOR 60);
  final_slug := base_slug;

  WHILE EXISTS (SELECT 1 FROM public.campaigns WHERE slug = final_slug AND id != NEW.id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaigns_generate_slug ON public.campaigns;
CREATE TRIGGER campaigns_generate_slug
  BEFORE INSERT ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.generate_campaign_slug();

CREATE OR REPLACE FUNCTION public.update_creator_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != 'confirmed' THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
  SET total_raised_xlm = total_raised_xlm + NEW.amount_xlm
  FROM public.campaigns
  WHERE campaigns.id = NEW.campaign_id
    AND profiles.id = campaigns.creator_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_contribution_confirmed ON public.contributions;
CREATE TRIGGER on_contribution_confirmed
  AFTER INSERT ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_creator_stats();


-- 002_fundraiser_kyc.sql
-- Immutable fundraiser KYC records.

CREATE TABLE IF NOT EXISTS public.fundraiser_kyc (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  country TEXT NOT NULL,
  id_number TEXT NOT NULL,
  document_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fundraiser_kyc_user ON public.fundraiser_kyc(user_id);

CREATE OR REPLACE FUNCTION public.prevent_fundraiser_kyc_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'KYC records are immutable and cannot be changed after submission';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fundraiser_kyc_immutable_update ON public.fundraiser_kyc;
CREATE TRIGGER fundraiser_kyc_immutable_update
  BEFORE UPDATE ON public.fundraiser_kyc
  FOR EACH ROW EXECUTE FUNCTION public.prevent_fundraiser_kyc_update();

-- 003_donations_anonymous.sql
-- Add fields to support anonymous and named donations
-- Run this migration in Supabase SQL editor

ALTER TABLE public.contributions
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS donor_name TEXT,
ADD COLUMN IF NOT EXISTS donor_message TEXT;

-- Index for fetching recent donors
CREATE INDEX IF NOT EXISTS idx_contributions_campaign_created ON public.contributions(campaign_id, created_at DESC);

-- Ensure contributions have a default status of 'confirmed' for donationsa
ALTER TABLE public.contributions
ALTER COLUMN status SET DEFAULT 'confirmed';


-- 004_campaign_slug_generation.sql
-- Ensure slug generation for campaigns
-- Run this migration in Supabase SQL editor

-- Create a function to generate URL-friendly slugs
CREATE OR REPLACE FUNCTION public.generate_campaign_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'),
      '^-+|-+$', '', 'g'
    )
  ) || '-' || to_char(NOW(), 'YYYYMMDDHHmmss');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a trigger to auto-generate slugs on insert
CREATE OR REPLACE FUNCTION public.set_campaign_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_campaign_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaigns_slug_trigger ON public.campaigns;
CREATE TRIGGER campaigns_slug_trigger
  BEFORE INSERT ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.set_campaign_slug();


-- 005_storage_and_upload_policies.sql
-- Storage + upload support for KYC and campaign media
-- Run this migration in Supabase SQL editor

-- 1) Extend campaigns with optional proof metadata
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS official_link TEXT,
ADD COLUMN IF NOT EXISTS proof_document_url TEXT;

-- 2) Keep KYC one-time immutable, but allow status updates by admins/review flow
CREATE OR REPLACE FUNCTION public.prevent_fundraiser_kyc_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.legal_name IS DISTINCT FROM OLD.legal_name
    OR NEW.country IS DISTINCT FROM OLD.country
    OR NEW.id_number IS DISTINCT FROM OLD.id_number
    OR NEW.document_url IS DISTINCT FROM OLD.document_url
    OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
  THEN
    RAISE EXCEPTION 'KYC identity fields are immutable and cannot be changed after submission';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'kyc-documents',
    'kyc-documents',
    false,
    5242880,
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  ),
  (
    'campaign-media',
    'campaign-media',
    true,
    4194304,
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  ),
  (
    'campaign-proofs',
    'campaign-proofs',
    false,
    6291456,
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 4) Storage policies (idempotent)
DROP POLICY IF EXISTS "kyc_upload_own" ON storage.objects;
CREATE POLICY "kyc_upload_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "kyc_read_owner_or_admin" ON storage.objects;
CREATE POLICY "kyc_read_owner_or_admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
);

DROP POLICY IF EXISTS "kyc_delete_owner_or_admin" ON storage.objects;
CREATE POLICY "kyc_delete_owner_or_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
);

DROP POLICY IF EXISTS "campaign_media_upload_own" ON storage.objects;
CREATE POLICY "campaign_media_upload_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "campaign_media_read_public" ON storage.objects;
CREATE POLICY "campaign_media_read_public"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'campaign-media');

DROP POLICY IF EXISTS "campaign_media_delete_owner_or_admin" ON storage.objects;
CREATE POLICY "campaign_media_delete_owner_or_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'campaign-media'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
);

DROP POLICY IF EXISTS "campaign_proofs_upload_own" ON storage.objects;
CREATE POLICY "campaign_proofs_upload_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "campaign_proofs_read_owner_or_admin" ON storage.objects;
CREATE POLICY "campaign_proofs_read_owner_or_admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'campaign-proofs'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
);

DROP POLICY IF EXISTS "campaign_proofs_delete_owner_or_admin" ON storage.objects;
CREATE POLICY "campaign_proofs_delete_owner_or_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'campaign-proofs'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
);


-- 006_enable_rls_policies.sql
-- Enable Row Level Security and create baseline policies for Fundr
-- Run this migration after schema + storage migrations.

-- -----------------------------------------------------------------------------
-- Helper functions used by policies
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = user_id
      AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_campaign(campaign_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaigns c
    WHERE c.id = campaign_id
      AND c.creator_id = user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.owns_campaign(UUID, UUID) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Profiles
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
CREATE POLICY profiles_select_public
ON public.profiles
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS profiles_insert_own_or_admin ON public.profiles;
CREATE POLICY profiles_insert_own_or_admin
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS profiles_update_own_or_admin ON public.profiles;
CREATE POLICY profiles_update_own_or_admin
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS profiles_delete_admin_only ON public.profiles;
CREATE POLICY profiles_delete_admin_only
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- Campaigns
-- -----------------------------------------------------------------------------

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaigns_select_public_or_owner_or_admin ON public.campaigns;
CREATE POLICY campaigns_select_public_or_owner_or_admin
ON public.campaigns
FOR SELECT
TO public
USING (
  status = 'active'
  OR creator_id = auth.uid()
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS campaigns_insert_creator_or_admin ON public.campaigns;
CREATE POLICY campaigns_insert_creator_or_admin
ON public.campaigns
FOR INSERT
TO authenticated
WITH CHECK (
  creator_id = auth.uid()
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS campaigns_update_creator_or_admin ON public.campaigns;
CREATE POLICY campaigns_update_creator_or_admin
ON public.campaigns
FOR UPDATE
TO authenticated
USING (
  creator_id = auth.uid()
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  creator_id = auth.uid()
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS campaigns_delete_creator_or_admin ON public.campaigns;
CREATE POLICY campaigns_delete_creator_or_admin
ON public.campaigns
FOR DELETE
TO authenticated
USING (
  creator_id = auth.uid()
  OR public.is_admin(auth.uid())
);

-- -----------------------------------------------------------------------------
-- Campaign updates
-- -----------------------------------------------------------------------------

ALTER TABLE public.campaign_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_updates_select_public ON public.campaign_updates;
CREATE POLICY campaign_updates_select_public
ON public.campaign_updates
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS campaign_updates_insert_owner_or_admin ON public.campaign_updates;
CREATE POLICY campaign_updates_insert_owner_or_admin
ON public.campaign_updates
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (public.owns_campaign(campaign_id, auth.uid()) OR public.is_admin(auth.uid()))
);

DROP POLICY IF EXISTS campaign_updates_update_owner_or_admin ON public.campaign_updates;
CREATE POLICY campaign_updates_update_owner_or_admin
ON public.campaign_updates
FOR UPDATE
TO authenticated
USING (
  author_id = auth.uid()
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  author_id = auth.uid()
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS campaign_updates_delete_owner_or_admin ON public.campaign_updates;
CREATE POLICY campaign_updates_delete_owner_or_admin
ON public.campaign_updates
FOR DELETE
TO authenticated
USING (
  author_id = auth.uid()
  OR public.is_admin(auth.uid())
);

-- -----------------------------------------------------------------------------
-- Contributions
-- -----------------------------------------------------------------------------

ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contributions_select_public_confirmed_or_owner_admin ON public.contributions;
CREATE POLICY contributions_select_public_confirmed_or_owner_admin
ON public.contributions
FOR SELECT
TO public
USING (
  status = 'confirmed'
  OR backer_id = auth.uid()
  OR public.owns_campaign(campaign_id, auth.uid())
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS contributions_update_admin_only ON public.contributions;
CREATE POLICY contributions_update_admin_only
ON public.contributions
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS contributions_delete_admin_only ON public.contributions;
CREATE POLICY contributions_delete_admin_only
ON public.contributions
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- Comments
-- -----------------------------------------------------------------------------

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comments_select_public_visible_or_admin ON public.comments;
CREATE POLICY comments_select_public_visible_or_admin
ON public.comments
FOR SELECT
TO public
USING (is_hidden = false OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS comments_insert_user ON public.comments;
CREATE POLICY comments_insert_user
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS comments_update_author_or_admin ON public.comments;
CREATE POLICY comments_update_author_or_admin
ON public.comments
FOR UPDATE
TO authenticated
USING (author_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (author_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS comments_delete_author_or_admin ON public.comments;
CREATE POLICY comments_delete_author_or_admin
ON public.comments
FOR DELETE
TO authenticated
USING (author_id = auth.uid() OR public.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- Reports
-- -----------------------------------------------------------------------------

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_insert_reporter ON public.reports;
CREATE POLICY reports_insert_reporter
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS reports_select_admin_only ON public.reports;
CREATE POLICY reports_select_admin_only
ON public.reports
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS reports_update_admin_only ON public.reports;
CREATE POLICY reports_update_admin_only
ON public.reports
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- Notifications
-- -----------------------------------------------------------------------------

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own_or_admin ON public.notifications;
CREATE POLICY notifications_select_own_or_admin
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS notifications_insert_own_or_admin ON public.notifications;
CREATE POLICY notifications_insert_own_or_admin
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS notifications_update_own_or_admin ON public.notifications;
CREATE POLICY notifications_update_own_or_admin
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS notifications_delete_own_or_admin ON public.notifications;
CREATE POLICY notifications_delete_own_or_admin
ON public.notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- Fundraiser KYC
-- -----------------------------------------------------------------------------

ALTER TABLE public.fundraiser_kyc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fundraiser_kyc_select_own_or_admin ON public.fundraiser_kyc;
CREATE POLICY fundraiser_kyc_select_own_or_admin
ON public.fundraiser_kyc
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS fundraiser_kyc_insert_own ON public.fundraiser_kyc;
CREATE POLICY fundraiser_kyc_insert_own
ON public.fundraiser_kyc
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS fundraiser_kyc_update_admin_only ON public.fundraiser_kyc;
CREATE POLICY fundraiser_kyc_update_admin_only
ON public.fundraiser_kyc
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- Optional safety: prevent anonymous deletes on key tables
-- -----------------------------------------------------------------------------
REVOKE DELETE ON public.campaigns FROM anon;
REVOKE DELETE ON public.contributions FROM anon;
REVOKE DELETE ON public.comments FROM anon;


-- 007_rls_fallback_toggles.sql
-- Emergency RLS fallback toggles
-- Use only during incident response. Re-enable RLS after policy corrections.

-- -----------------------------------------------------------------------------
-- Disable RLS quickly for critical recovery
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundraiser_kyc DISABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Re-enable RLS after policy fix
-- -----------------------------------------------------------------------------
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.campaign_updates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.fundraiser_kyc ENABLE ROW LEVEL SECURITY;


