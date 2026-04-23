import type {
  CommunityStat,
  FaqItem,
  FeaturedCampaign,
  HeroConfig,
  ImpactStory,
  PurposeCard,
  QuickStep,
  SocialProof,
} from "@/types/home";

export const heroConfig: HeroConfig = {
  badgeText: "Online fundraising made easy",
  headline: "Online fundraising for any event, anytime, anywhere.",
  description:
    "Initiate a fundraiser with us to champion the causes close to your heart, enjoying a secure and transparent on-chain journey from setup to impact.",
  heroImageUrl:
    "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1600&q=80",
  heroImageAlt: "Volunteers helping at a donation center",
};

export const socialProof: SocialProof = {
  source: "Trustpilot",
  ratingSummary: "Excellent, 10,000+ reviews",
  quote:
    "Easy to use and great customer service. Fundr is now my favorite crowdfunding platform.",
  author: "John Delian",
};

export const purposeCards: PurposeCard[] = [
  {
    title: "Gift with friends",
    description:
      "Perfect for birthdays, weddings, and milestone moments where collective giving creates bigger impact.",
    imageUrl:
      "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Gift box with ribbon",
  },
  {
    title: "Fundraising for causes",
    description:
      "Support verified causes from disaster recovery to healthcare, education, and social welfare projects.",
    imageUrl:
      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Volunteer carrying donation box",
  },
];

export const featuredCampaigns: FeaturedCampaign[] = [
  {
    title: "Water Flood and Inundation Road with Thai People",
    location: "Kisod",
    raised: "$16,040",
    progress: "85%",
    imageUrl:
      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Regina's Emergency Response for Turkiye & Syria",
    location: "Rasek",
    raised: "$3,210.45",
    progress: "72%",
    imageUrl:
      "https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Bisher & Yusuf's Volunteer Abroad in South Africa",
    location: "Rakod",
    raised: "$14,640",
    progress: "81%",
    imageUrl:
      "https://images.unsplash.com/photo-1497486751825-1233686d5d80?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Abdelrahman E. in Transforming the Lives of Orphans",
    location: "Rasek",
    raised: "$16,040",
    progress: "45%",
    imageUrl:
      "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1200&q=80",
  },
];

export const communityStats: CommunityStat[] = [
  {
    value: "60%",
    label: "Social shares/month",
  },
  {
    value: "86",
    label: "Countries reached",
  },
  {
    value: "$50.4M",
    label: "Distributed funds",
  },
  {
    value: "863",
    label: "Campaigns completed",
  },
];

export const quickSteps: QuickStep[] = [
  {
    number: "01",
    title: "Start your collect",
    description:
      "Create your campaign and define the purpose, deadline, and funding goal.",
  },
  {
    number: "02",
    title: "Share to your friends",
    description:
      "Invite your loved ones and communities to support the cause quickly.",
  },
  {
    number: "03",
    title: "View the progress",
    description:
      "Watch every contribution in real time with transparent on-chain updates.",
  },
  {
    number: "04",
    title: "Receive your funds",
    description:
      "Withdraw securely once your campaign reaches goal or deadline conditions.",
  },
];

export const quickFundraiserImage = {
  src: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1000&q=80",
  alt: "Person sharing campaign on phone",
};

export const visionGallery = [
  {
    imageUrl:
      "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80",
    imageAlt: "Students smiling in a community program",
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=600&q=80",
    imageAlt: "Volunteers organizing aid supplies",
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=600&q=80",
    imageAlt: "Fundraising gift prepared for donation",
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80",
    imageAlt: "Supporter sharing campaign from mobile phone",
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=600&q=80",
    imageAlt: "Community members preparing donations",
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=600&q=80",
    imageAlt: "People receiving direct relief support",
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1497486751825-1233686d5d80?auto=format&fit=crop&w=600&q=80",
    imageAlt: "Volunteer team helping in local area",
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=700&q=80",
    imageAlt: "Smiling beneficiary after successful fundraiser",
  },
];

export const impactStories: ImpactStory[] = [
  {
    title: "Emergency Relief Reached 4,000 Families",
    excerpt:
      "A regional campaign delivered food kits and medicine support within 10 days through transparent on-chain disbursement.",
    imageUrl:
      "https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Volunteers delivering aid packages",
  },
  {
    title: "Education Fund Opened 120 Scholarships",
    excerpt:
      "Community donors united to cover school tuition and digital learning resources for underrepresented students.",
    imageUrl:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Students learning in a classroom",
  },
  {
    title: "Healthcare Drive Equipped Rural Clinics",
    excerpt:
      "Backers funded essential diagnostic equipment and maternal care kits for local healthcare centers.",
    imageUrl:
      "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Medical worker helping patient",
  },
];

export const faqItems: FaqItem[] = [
  {
    question: "How does Fundr keep donations transparent?",
    answer:
      "Campaign-related transactions can be tracked on Stellar testnet, and campaign status updates are reflected in your dashboard in near real time.",
  },
  {
    question: "Do I need crypto experience to donate?",
    answer:
      "Not at all. You can connect your wallet in one click, choose a campaign, and confirm the amount with guided prompts.",
  },
  {
    question: "What happens when a campaign misses its goal?",
    answer:
      "Campaign behavior follows configured rules. Depending on setup, funds may be refundable or partially releasable according to campaign terms.",
  },
  {
    question: "Can organizations run verified campaigns?",
    answer:
      "Yes, we support individual and charity campaigns with profile verification, moderation tools, and transparent reporting.",
  },
];
