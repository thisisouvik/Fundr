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
