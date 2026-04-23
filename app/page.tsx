import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import {
  CommunityStatsSection,
  FaqSection,
  FeaturedCampaignsSection,
  HeroSection,
  ImpactStoriesSection,
  PurposeSection,
  QuickFundraisersSection,
  SocialProofSection,
  VisionSection,
} from "@/components/home";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export default function Home() {
  return (
    <div className="bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />
      <ScrollReveal />

      <main>
        <HeroSection />
        <SocialProofSection />
        <PurposeSection />
        <FeaturedCampaignsSection />
        <CommunityStatsSection />
        <QuickFundraisersSection />
        <ImpactStoriesSection />
        <VisionSection />
        <FaqSection />
      </main>

      <Footer />
    </div>
  );
}
