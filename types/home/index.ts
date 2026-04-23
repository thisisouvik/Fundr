export interface FeaturedCampaign {
  title: string;
  location: string;
  raised: string;
  progress: string;
  imageUrl: string;
}

export interface QuickStep {
  number: string;
  title: string;
  description: string;
}

export interface CommunityStat {
  value: string;
  label: string;
}

export interface PurposeCard {
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
}

export interface HeroConfig {
  badgeText: string;
  headline: string;
  description: string;
  heroImageUrl: string;
  heroImageAlt: string;
}

export interface SocialProof {
  source: string;
  ratingSummary: string;
  quote: string;
  author: string;
}

export interface ImpactStory {
  title: string;
  excerpt: string;
  imageUrl: string;
  imageAlt: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}
