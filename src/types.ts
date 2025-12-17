// ============================================
// Evergreen Content Tool - Type Definitions
// Supports multiple verticals: Gambling, Crypto, etc.
// ============================================

import { VerticalType } from './config/verticals/types';

export type { VerticalType } from './config/verticals/types';

export enum Language {
    ENGLISH = 'english',
    THAI = 'thai',
    VIETNAMESE = 'vietnamese',
    JAPANESE = 'japanese',
    KOREAN = 'korean',
}

export enum WritingModel {
    GPT_5_2 = 'openai/gpt-5.2',
    GEMINI_2_5_PRO = 'google/gemini-2.5-flash',
    CLAUDE_SONNET_4_5 = 'anthropic/claude-sonnet-4.5',
}

export enum SeoMode {
    DEFAULT = 'default',
    MANUAL = 'manual',
    AI_POWERED = 'ai-powered',
}

export enum ToneOfVoice {
    PROFESSIONAL = 'professional',
    FRIENDLY = 'friendly',
    FORMAL = 'formal',
    CASUAL = 'casual',
    CUSTOM = 'custom',
}

export interface ManualSeoSettings {
    keywords: { keyword: string; count: number }[];
}

export interface TargetKeyword {
    keyword: string;
    isPrimary: boolean;
}

// --- Citation Types ---
export interface Citation {
    title: string;
    sourceUrl: string;        // Actual source URL from research
    googleSearchUrl: string;  // Fallback: Google search if no URL found
    domain: string;           // Source domain for display (without www)
}

// --- Platform Types ---
export interface PlatformInput {
    name: string;
    affiliateUrl?: string;
}

export interface RatingCategory {
    category: string;
    score: number; // 1-10
}

export interface PlatformInfosheet {
    license: string;
    country: string;
    company: string;
    yearEstablished: string;
    minDeposit: string;
    payoutSpeed: string;
    supportedCurrencies: string[];
    paymentMethods: string[];
    // Additional fields
    kycRequirement?: string;  // e.g., "Required before withdrawal", "Not required"
    welcomeBonus?: string;    // e.g., "100% up to $500", "No welcome bonus"
    // Source attribution
    dataSource?: string;      // e.g., "we88.com, askgamblers.com"
    retrievedAt?: string;     // ISO timestamp when data was retrieved
}

export interface PlatformResearch {
    name: string;
    shortDescription: string;
    infosheet: PlatformInfosheet;
    keyFeatures: string[];
    pros: string[];
    cons: string[];
    rawResearchSummary: string;
    citations: Citation[];
    researchStatus: 'pending' | 'researching' | 'completed' | 'error';
    error?: string;
}

export interface PlatformReview {
    platformName: string;
    overview: string;           // HTML paragraph
    infosheet: PlatformInfosheet;
    ratings: RatingCategory[];  // Visual rating bars
    pros: string[];
    cons: string[];
    verdict: string;            // HTML paragraph
    affiliateUrl?: string;
    citations: Citation[];
}

// --- Article Configuration ---
export interface SectionWordCounts {
    overview: number;
    verdict: number;
    prosConsItems: number;      // Number of items per list
}

export interface IncludeSections {
    platformInfosheet: boolean;
    platformRatings: boolean;  // Individual 1-10 scores for each category
    prosCons: boolean;
    verdict: boolean;
    comparisonTable: boolean;
    faqs: boolean;
}

export interface InternalLink {
    anchorText: string;
    url: string;
}

export interface CompetitorAnalysis {
    rank: number;
    domain: string;
    title: string;
    metaDesc: string;
    headings: string[];  // H2 sections
}

// Additional content section (learned from competitors)
export interface AdditionalSection {
    title: string;
    content: string;  // HTML content
}

export interface ArticleConfig {
    vertical: VerticalType;  // 'gambling' | 'crypto' - determines infosheet fields, scoring, prompts
    verticalConfirmed?: boolean;  // User must explicitly select vertical before research
    language: Language;
    introNarrative: string;
    introWordCount: number;
    platforms: PlatformInput[];
    sectionWordCounts: SectionWordCounts;
    includeSections: IncludeSections;
    // New SEO & Content settings
    targetKeywords: TargetKeyword[];
    seoMode: SeoMode;
    manualSeoSettings?: ManualSeoSettings;
    primaryKeywordCount?: number;  // Simple count for primary keyword mentions (default 15)
    writingModel: WritingModel;
    toneOfVoice: ToneOfVoice;
    customTone?: string;
    // Article structure
    maxPlatformReviews?: number;
    targetSectionCount?: number;  // Default 5, can be 5-10 for additional sections
    // Custom instructions
    customInstructions?: string;
    // Internal linking
    internalLinks?: InternalLink[];
    // Responsible gambling disclaimer
    includeResponsibleGamblingDisclaimer?: boolean;
    responsibleGamblingDisclaimerText?: string;  // Custom or AI-generated disclaimer
    // SERP competitor analysis
    serpKeyword?: string;  // Keyword to analyze competitors for
    // Review Only mode - generates only platform reviews without intro, comparison, FAQs
    reviewOnlyMode?: boolean;
    // Output format options
    useShortcodes?: boolean;  // Use WordPress Ultimate Shortcode format (default: true)
}

// --- Template Types ---
export interface ReviewTemplate {
    id: string;
    name: string;
    language: Language;
    introWordCount: number;
    sectionWordCounts: SectionWordCounts;
    includeSections: IncludeSections;
    writingModel?: WritingModel;
    toneOfVoice?: ToneOfVoice;
    seoMode?: SeoMode;
    createdAt: string;
}

// --- Generated Article Types ---
export interface ComparisonTableRow {
    platformName: string;
    license: string;
    minDeposit: string;
    payoutSpeed: string;
    rating: string;
}

export interface FAQ {
    question: string;
    answer: string;
}

export interface SeoMetadata {
    title: string;              // SEO-optimized title (50-60 chars)
    metaDescription: string;    // SEO meta description (150-160 chars)
    slug: string;               // URL slug in English
    imagePrompt: string;        // AI image generation prompt in English
    imageAltText: string;       // Image alt text in user's language
}

export interface GeneratedArticle {
    intro: string;                          // HTML content
    platformQuickList: {
        name: string;
        shortDescription: string;
    }[];
    comparisonTable: ComparisonTableRow[];
    platformReviews: PlatformReview[];
    additionalSections: AdditionalSection[];  // Sections learned from competitors
    faqs: FAQ[];
    allCitations: Citation[];
    seoMetadata?: SeoMetadata;              // SEO metadata for the article
}

// --- Workflow State ---
export type WorkflowPhase = 
    | 'idle'
    | 'researching'
    | 'generating-intro'
    | 'generating-comparison'
    | 'generating-reviews'
    | 'generating-additional'  // New phase for additional sections
    | 'generating-faqs'
    | 'generating-seo'         // SEO metadata generation
    | 'completed'
    | 'error';

// Two-phase workflow: Research → Assemble
export type AppMode = 'research' | 'assemble';

export interface WorkflowState {
    phase: WorkflowPhase;
    currentPlatformIndex?: number;
    totalPlatforms?: number;
    error?: string;
}

// Cached review (without ratings - ratings generated at assemble time)
export interface CachedReview {
    platformName: string;
    overview: string;
    infosheet: PlatformInfosheet;
    pros: string[];
    cons: string[];
    verdict: string;
    affiliateUrl?: string;
    citations: Citation[];
    cachedAt: string;  // ISO timestamp
}

// Cache summary for UI display
export interface CacheSummary {
    researchCount: number;
    reviewCount: number;
    platformNames: string[];
    vertical: VerticalType;
    canAssemble: boolean;  // true if 3+ reviews cached
}