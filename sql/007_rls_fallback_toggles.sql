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
