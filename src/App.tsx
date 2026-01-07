import React, { useState, useCallback, useEffect } from 'react';
import { InputForm } from './components/InputForm';
import { ComparisonTable } from './components/output/ComparisonTable';
import { PlatformReviewCard } from './components/output/PlatformReviewCard';
import { FAQSection } from './components/output/FAQSection';
import { SinglePlatformReviewOutput } from './components/output/SinglePlatformReviewOutput';
import { CitationList } from './components/CitationLink';
import { ResearchEvidencePanel } from './components/ResearchEvidencePanel';
import { getUiText, getHtmlLang } from './utils/uiText';
import { 
    researchAllPlatforms, 
    generateFullArticle,
    analyzeSerpCompetitors,
    generateReviewsOnly,
    generateSinglePlatformArticle,
    SerpCompetitor,
    clearResearchCache,
    clearReviewCache,
    clearAllCaches,
    getCachedPlatformNames,
    getCacheSummary,
    getCachedReviews,
    saveReviewToCache,
    assembleArticleFromCache,
    generatePlatformReview
} from './services/platformResearchService';
import { 
    ArticleConfig, 
    Language, 
    PlatformResearch, 
    GeneratedArticle,
    SinglePlatformArticle,
    WorkflowPhase,
    AppMode,
    ArticleMode,
    WritingModel,
    ResearchModel,
    SeoMode,
    ToneOfVoice
} from './types';
import { 
    DEFAULT_SECTION_WORD_COUNTS,
    DEFAULT_INCLUDE_SECTIONS
} from './utils/templates';
import { getVerticalConfig } from './config/verticals';

// --- Loader Component ---
const Loader: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
        <p className="text-gray-600 text-sm">{message}</p>
    </div>
);

// --- Walkthrough Modal for Asian Editors ---
const WalkthroughModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(0);
    
    const steps = [
        {
            title: "📋 Welcome to Article Generator",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-700">This tool helps you create <strong>AI-powered review articles</strong> with real citations from web research.</p>
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="font-semibold text-blue-800 mb-2">🎯 Three Article Modes:</p>
                        <ul className="space-y-2 text-sm">
                            <li><strong>📊 Full Comparison</strong> — Compare 3-7 platforms with table, reviews, FAQs</li>
                            <li><strong>📝 Single Platform Review</strong> — Deep-dive review of one platform (NEW!)</li>
                            <li><strong>📋 Review Snippet</strong> — Quick review blocks for existing articles</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            title: "🏢 Content Verticals",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-700">Choose the vertical that matches your content:</p>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-red-50 p-3 rounded-lg text-center">
                            <p className="text-2xl mb-1">🎰</p>
                            <p className="font-semibold text-red-800">Online Gambling</p>
                            <p className="text-xs text-gray-600">Casinos, betting, sportsbooks</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg text-center">
                            <p className="text-2xl mb-1">₿</p>
                            <p className="font-semibold text-blue-800">Crypto Platforms</p>
                            <p className="text-xs text-gray-600">Exchanges, trading, DeFi</p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg text-center">
                            <p className="text-2xl mb-1">👛</p>
                            <p className="font-semibold text-purple-800">Crypto Wallet</p>
                            <p className="text-xs text-gray-600">Hardware, software wallets</p>
                        </div>
                    </div>
                    <p className="text-sm text-gray-600">💡 Each vertical has tailored research prompts, scoring categories, and section templates.</p>
                </div>
            )
        },
        {
            title: "📊 Mode 1: Full Comparison",
            content: (
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="font-semibold text-blue-800 mb-2">For comparing multiple platforms (3-7 recommended)</p>
                        <ul className="text-sm space-y-1 text-gray-700">
                            <li>✅ SEO-optimized introduction</li>
                            <li>✅ Platform quick list</li>
                            <li>✅ Comparison table (auto-generated columns)</li>
                            <li>✅ Individual reviews with ratings</li>
                            <li>✅ FAQs section</li>
                            <li>✅ SEO metadata (title, description)</li>
                        </ul>
                    </div>
                    <div className="bg-gray-100 p-3 rounded-lg text-sm">
                        <p><strong>Example:</strong> "Best Online Casinos 2025" or "Top Crypto Exchanges Compared"</p>
                    </div>
                </div>
            )
        },
        {
            title: "📝 Mode 2: Single Platform Review",
            content: (
                <div className="space-y-4">
                    <div className="bg-purple-50 p-4 rounded-lg">
                        <p className="font-semibold text-purple-800 mb-2">Deep-dive review of ONE platform (NEW!)</p>
                        <ul className="text-sm space-y-1 text-gray-700">
                            <li>✅ Comprehensive intro tailored to the platform</li>
                            <li>✅ Platform information sheet</li>
                            <li>✅ Multiple detailed sections (5 deep-dive sections)</li>
                            <li>✅ Pros & Cons analysis</li>
                            <li>✅ Final verdict</li>
                            <li>✅ Platform-specific FAQs</li>
                        </ul>
                    </div>
                    <div className="bg-gray-100 p-3 rounded-lg text-sm">
                        <p><strong>Example:</strong> "Binance Review 2025" or "Ledger Nano X Review"</p>
                    </div>
                </div>
            )
        },
        {
            title: "📋 Mode 3: Review Snippet",
            content: (
                <div className="space-y-4">
                    <div className="bg-orange-50 p-4 rounded-lg">
                        <p className="font-semibold text-orange-800 mb-2">Quick review blocks for existing articles</p>
                        <ul className="text-sm space-y-1 text-gray-700">
                            <li>✅ Individual review blocks only</li>
                            <li>✅ Optional: Infosheet, Ratings, Pros/Cons, Verdict</li>
                            <li>❌ No introduction</li>
                            <li>❌ No comparison table</li>
                            <li>❌ No FAQs</li>
                        </ul>
                    </div>
                    <div className="bg-gray-100 p-3 rounded-lg text-sm">
                        <p><strong>Use case:</strong> Adding 1-2 new platforms to an existing comparison article</p>
                    </div>
                </div>
            )
        },
        {
            title: "🔄 Workflow: Research → Generate → Copy",
            content: (
                <div className="space-y-4">
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                            <div>
                                <p className="font-semibold">Research Platforms</p>
                                <p className="text-sm text-gray-600">Add platform names → Click "Research Platforms" → AI gathers web data</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                            <div>
                                <p className="font-semibold">Generate Article</p>
                                <p className="text-sm text-gray-600">When cached → Button changes to "Generate Article" → AI writes content</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="bg-amber-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                            <div>
                                <p className="font-semibold">Copy to WordPress</p>
                                <p className="text-sm text-gray-600">Click "Copy for WordPress" → Paste in HTML editor → Done!</p>
                            </div>
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 bg-gray-100 p-2 rounded">💡 <strong>Research is cached!</strong> Close browser, come back later — your data is saved.</p>
                </div>
            )
        },
        {
            title: "⚙️ Key Settings",
            content: (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="font-semibold">🔍 Research Model</p>
                            <p className="text-gray-600"><strong>Perplexity Sonar</strong> = Real web sources</p>
                            <p className="text-gray-600">Tongyi = Training data only</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="font-semibold">✍️ Writing Model</p>
                            <p className="text-gray-600"><strong>GPT 5.2</strong> or <strong>Claude</strong> = Best quality</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="font-semibold">🌐 Language</p>
                            <p className="text-gray-600">TH, JP, KR, VN, EN</p>
                            <p className="text-gray-600">All content in selected language</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="font-semibold">📝 Shortcodes</p>
                            <p className="text-gray-600">WordPress shortcodes for tables, columns, FAQs</p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "✅ Tips for Best Results",
            content: (
                <div className="space-y-3">
                    <ul className="space-y-3 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="text-green-500">✓</span>
                            <span><strong>Use Perplexity Sonar</strong> for research — gives real URLs for citations</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500">✓</span>
                            <span><strong>5-7 platforms</strong> is optimal for Full Comparison mode</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500">✓</span>
                            <span><strong>Set primary keyword</strong> — affects comparison columns and content focus</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500">✓</span>
                            <span><strong>6+ sections</strong> in Full Comparison? Use SERP analysis to discover competitor sections</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500">✓</span>
                            <span><strong>Always review</strong> generated content before publishing</span>
                        </li>
                    </ul>
                    <div className="bg-purple-50 p-3 rounded-lg mt-4">
                        <p className="text-sm text-purple-800">🎉 <strong>You're ready!</strong> Close this guide and start creating.</p>
                    </div>
                </div>
            )
        }
    ];
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">{steps[step].title}</h2>
                        <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">&times;</button>
                    </div>
                    {/* Progress dots */}
                    <div className="flex gap-2 mt-3">
                        {steps.map((_, i) => (
                            <div 
                                key={i} 
                                className={`h-2 rounded-full transition-all ${i === step ? 'w-8 bg-white' : 'w-2 bg-white/40'}`}
                                onClick={() => setStep(i)}
                                style={{ cursor: 'pointer' }}
                            />
                        ))}
                    </div>
                </div>
                
                {/* Content */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                    {steps[step].content}
                </div>
                
                {/* Footer */}
                <div className="border-t px-6 py-4 flex justify-between items-center bg-gray-50">
                    <button 
                        onClick={() => setStep(Math.max(0, step - 1))}
                        disabled={step === 0}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-30"
                    >
                        ← Previous
                    </button>
                    <span className="text-sm text-gray-500">{step + 1} / {steps.length}</span>
                    {step < steps.length - 1 ? (
                        <button 
                            onClick={() => setStep(step + 1)}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                            Next →
                        </button>
                    ) : (
                        <button 
                            onClick={onClose}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            ✓ Got it!
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Animated Research Indicator ---
const AnimatedResearchingBadge: React.FC<{ message?: string }> = ({ message }) => {
    const [dots, setDots] = React.useState('');
    
    React.useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 400);
        return () => clearInterval(interval);
    }, []);
    
    return (
        <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full shadow-lg animate-pulse">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="font-medium">{message || 'Researching'}<span className="inline-block w-6 text-left">{dots}</span></span>
            </div>
        </div>
    );
};

// --- Research Progress Component ---
const ResearchProgress: React.FC<{ 
    platforms: { name: string; status: 'pending' | 'researching' | 'completed' | 'error' }[];
    isStillWorking?: boolean;
    currentTask?: string;
}> = ({ platforms, isStillWorking, currentTask }) => (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6">
        {/* Show animated indicator when still working */}
        {isStillWorking && (
            <AnimatedResearchingBadge message={currentTask} />
        )}
        
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">🔍</span> Research Progress
            {isStillWorking && (
                <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-100 px-2 py-1 rounded-full animate-pulse">
                    In Progress
                </span>
            )}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {platforms.map((p, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                    {p.status === 'completed' && <span className="text-green-500">✅</span>}
                    {p.status === 'researching' && <span className="animate-pulse">⏳</span>}
                    {p.status === 'pending' && <span className="text-gray-300">○</span>}
                    {p.status === 'error' && <span className="text-red-500">❌</span>}
                    <span className={p.status === 'completed' ? 'text-gray-900' : 'text-gray-500'}>
                        {p.name}
                    </span>
                </div>
            ))}
        </div>
    </div>
);

// --- Article Section Card ---
const SectionCard: React.FC<{ 
    title: string; 
    icon: string;
    children: React.ReactNode;
    onEdit?: () => void;
    onRegenerate?: () => void;
}> = ({ title, icon, children, onEdit, onRegenerate }) => (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="mr-2">{icon}</span> {title}
            </h3>
            <div className="flex gap-2">
                {onEdit && (
                    <button onClick={onEdit} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition">
                        Edit
                    </button>
                )}
                {onRegenerate && (
                    <button onClick={onRegenerate} className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition">
                        Regenerate
                    </button>
                )}
            </div>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const CONFIG_STORAGE_KEY = 'gambling-review-config';

const loadSavedConfig = (): ArticleConfig | null => {
    try {
        const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved) as ArticleConfig;
            // Validate language enum value
            const validLanguages = Object.values(Language);
            if (!validLanguages.includes(parsed.language)) {
                console.warn('Invalid language in saved config, resetting to English');
                parsed.language = Language.ENGLISH;
            }
            // Ensure required nested objects exist
            if (!parsed.sectionWordCounts) {
                parsed.sectionWordCounts = DEFAULT_SECTION_WORD_COUNTS;
            }
            if (!parsed.includeSections) {
                parsed.includeSections = DEFAULT_INCLUDE_SECTIONS;
            }
            if (!Array.isArray(parsed.platforms)) {
                parsed.platforms = [];
            }
            // Validate new fields with defaults
            if (!Array.isArray(parsed.targetKeywords)) {
                parsed.targetKeywords = [];
            }
            const validSeoModes = Object.values(SeoMode);
            if (!validSeoModes.includes(parsed.seoMode)) {
                parsed.seoMode = SeoMode.DEFAULT;
            }
            const validWritingModels = Object.values(WritingModel);
            if (!validWritingModels.includes(parsed.writingModel)) {
                parsed.writingModel = WritingModel.GPT_5_2;
            }
            const validResearchModels = Object.values(ResearchModel);
            if (!validResearchModels.includes(parsed.researchModel)) {
                parsed.researchModel = ResearchModel.PERPLEXITY_SONAR;
            }
            const validTones = Object.values(ToneOfVoice);
            if (!validTones.includes(parsed.toneOfVoice)) {
                parsed.toneOfVoice = ToneOfVoice.PROFESSIONAL;
            }
            return parsed;
        }
    } catch (e) {
        console.warn('Failed to load saved config:', e);
        // Clear corrupted config
        try { localStorage.removeItem(CONFIG_STORAGE_KEY); } catch {}
    }
    return null;
};

const saveConfig = (config: ArticleConfig) => {
    try {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.warn('Failed to save config:', e);
    }
};

const App: React.FC = () => {
    // Config state - load from localStorage if available
    const [config, setConfig] = useState<ArticleConfig>(() => {
        const saved = loadSavedConfig();
        if (saved) {
            return saved;
        }
        return {
            vertical: 'gambling' as const,
            language: Language.ENGLISH,
            introNarrative: '',
            introWordCount: 200,
            platforms: [],
            sectionWordCounts: DEFAULT_SECTION_WORD_COUNTS,
            includeSections: DEFAULT_INCLUDE_SECTIONS,
            targetKeywords: [],
            seoMode: SeoMode.DEFAULT,
            writingModel: WritingModel.GPT_5_2,
            researchModel: ResearchModel.PERPLEXITY_SONAR,
            toneOfVoice: ToneOfVoice.PROFESSIONAL,
            articleMode: ArticleMode.FULL_COMPARISON,
        };
    });


    // Workflow state
    const [workflowPhase, setWorkflowPhase] = useState<WorkflowPhase>('idle');
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    
    // Two-phase workflow mode
    const [appMode, setAppMode] = useState<AppMode>('research');
    const [cacheSummary, setCacheSummary] = useState<{
        researchCount: number;
        reviewCount: number;
        researchPlatforms: string[];
        reviewPlatforms: string[];
        canAssemble: boolean;
    }>({ researchCount: 0, reviewCount: 0, researchPlatforms: [], reviewPlatforms: [], canAssemble: false });

    // Research state
    const [platformResearch, setPlatformResearch] = useState<PlatformResearch[]>([]);
    
    // Generated article state
    const [generatedArticle, setGeneratedArticle] = useState<GeneratedArticle | null>(null);
    
    // Single platform article state (for SINGLE_PLATFORM_REVIEW mode)
    const [singlePlatformArticle, setSinglePlatformArticle] = useState<SinglePlatformArticle | null>(null);

    // SERP Competitor Analysis state
    const [serpCompetitors, setSerpCompetitors] = useState<SerpCompetitor[]>([]);
    const [serpAnalysisLoading, setSerpAnalysisLoading] = useState(false);
    
    // Walkthrough modal state
    const [showWalkthrough, setShowWalkthrough] = useState(false);
    
    // Update cache summary when vertical changes or on mount
    useEffect(() => {
        const summary = getCacheSummary(config.vertical || 'gambling');
        setCacheSummary(summary);
    }, [config.vertical]);


    // Handler for SERP competitor analysis
    const handleAnalyzeSerpCompetitors = useCallback(async (keyword: string, count: number) => {
        if (!keyword.trim()) return;
        
        setSerpAnalysisLoading(true);
        setSerpCompetitors([]);
        
        try {
            const competitors = await analyzeSerpCompetitors(keyword.trim(), count);
            setSerpCompetitors(competitors);
        } catch (err) {
            console.error('SERP analysis failed:', err);
            setError('Failed to analyze competitors. Please try again.');
        } finally {
            setSerpAnalysisLoading(false);
        }
    }, []);

    // Auto-save config whenever it changes
    useEffect(() => {
        saveConfig(config);
    }, [config]);

    // Clear all form data
    const handleClearAll = useCallback(() => {
        const defaultConfig: ArticleConfig = {
            vertical: 'gambling' as const,
            language: Language.ENGLISH,
            introNarrative: '',
            introWordCount: 200,
            platforms: [],
            sectionWordCounts: DEFAULT_SECTION_WORD_COUNTS,
            includeSections: DEFAULT_INCLUDE_SECTIONS,
            targetKeywords: [],
            seoMode: SeoMode.DEFAULT,
            writingModel: WritingModel.GPT_5_2,
            researchModel: ResearchModel.PERPLEXITY_SONAR,
            toneOfVoice: ToneOfVoice.PROFESSIONAL,
            articleMode: ArticleMode.FULL_COMPARISON,
        };
        setConfig(defaultConfig);
        localStorage.removeItem(CONFIG_STORAGE_KEY);
        clearResearchCache(); // Also clear research cache
    }, []);

    const handleClearResearchCache = useCallback(() => {
        clearResearchCache();
        const summary = getCacheSummary(config.vertical || 'gambling');
        setCacheSummary(summary);
        alert('Research cache cleared. Next research will fetch fresh data.');
    }, [config.vertical]);
    
    const handleClearAllCaches = useCallback(() => {
        clearAllCaches();
        const summary = getCacheSummary(config.vertical || 'gambling');
        setCacheSummary(summary);
        alert('All caches cleared (research + reviews).');
    }, [config.vertical]);
    
    // Refresh cache summary after operations
    const refreshCacheSummary = useCallback(() => {
        const summary = getCacheSummary(config.vertical || 'gambling');
        setCacheSummary(summary);
    }, [config.vertical]);

    const resetState = () => {
        setWorkflowPhase('idle');
        setPlatformResearch([]);
        setGeneratedArticle(null);
        setSinglePlatformArticle(null);
        setError(null);
        setLoadingMessage('');
    };

    // Phase 1: Research platforms only (two-phase workflow)
    // Behavior depends on articleMode:
    // - FULL_COMPARISON: Research + cache reviews, then user assembles
    // - SINGLE_PLATFORM_REVIEW: Research + generate complete single platform article
    // - REVIEW_SNIPPET: Research + cache reviews (same as FULL_COMPARISON but for fewer platforms)
    const handleStartResearch = useCallback(async () => {
        if (!config.verticalConfirmed) {
            setError('Please select a Content Vertical (Gambling or Crypto) before starting research.');
            return;
        }
        if (config.platforms.length === 0) {
            setError('Please add at least one platform to review.');
            return;
        }
        
        // Validate platform count based on mode
        const articleMode = config.articleMode || ArticleMode.FULL_COMPARISON;
        if (articleMode === ArticleMode.SINGLE_PLATFORM_REVIEW && config.platforms.length !== 1) {
            setError('Single Platform Review mode requires exactly 1 platform. Please add only one platform.');
            return;
        }
        if (articleMode === ArticleMode.FULL_COMPARISON && config.platforms.length < 3) {
            setError('Full Comparison mode requires at least 3 platforms. Add more platforms or switch to Review Snippet mode.');
            return;
        }

        resetState();
        setWorkflowPhase('researching');
        setAppMode('research');

        try {
            // SINGLE_PLATFORM_REVIEW mode: Generate complete article in one go
            if (articleMode === ArticleMode.SINGLE_PLATFORM_REVIEW) {
                setLoadingMessage(`Generating comprehensive review for ${config.platforms[0].name}...`);
                
                const singleArticle = await generateSinglePlatformArticle(
                    config,
                    (phase, detail) => {
                        if (phase === 'researching') setWorkflowPhase('researching');
                        else if (phase === 'generating-intro') setWorkflowPhase('generating-intro');
                        else if (phase === 'generating-reviews') setWorkflowPhase('generating-reviews');
                        else if (phase === 'generating-additional') setWorkflowPhase('generating-additional');
                        else if (phase === 'generating-faqs') setWorkflowPhase('generating-faqs');
                        else if (phase === 'generating-seo') setWorkflowPhase('generating-seo');
                        
                        if (detail) setLoadingMessage(detail);
                    }
                );
                
                if (singleArticle) {
                    setSinglePlatformArticle(singleArticle);
                    setWorkflowPhase('completed');
                } else {
                    setError('Failed to generate single platform article.');
                    setWorkflowPhase('error');
                }
                return;
            }
            
            // FULL_COMPARISON and REVIEW_SNIPPET modes: Research + cache reviews
            // Initialize platform research state
            const initialResearch: PlatformResearch[] = config.platforms.map(p => ({
                name: p.name,
                shortDescription: '',
                infosheet: {
                    license: 'Unknown',
                    country: 'Unknown',
                    company: 'Unknown',
                    yearEstablished: 'Unknown',
                    minDeposit: 'Unknown',
                    payoutSpeed: 'Unknown',
                    supportedCurrencies: [],
                    paymentMethods: []
                },
                keyFeatures: [],
                pros: [],
                cons: [],
                rawResearchSummary: '',
                citations: [],
                researchStatus: 'pending'
            }));
            setPlatformResearch(initialResearch);

            // Research all platforms (uses cache for previously researched platforms)
            const modelName = config.researchModel === ResearchModel.PERPLEXITY_SONAR ? 'Perplexity Sonar' : 'Tongyi';
            setLoadingMessage(`Researching platforms with ${modelName}...`);
            const researchResults = await researchAllPlatforms(
                config.platforms.map(p => p.name),
                config.vertical || 'gambling',
                (completed, total, platformName, fromCache) => {
                    const cacheIndicator = fromCache ? ' (cached)' : '';
                    setLoadingMessage(`Researched ${platformName}${cacheIndicator} (${completed}/${total})`);
                    setPlatformResearch(prev => prev.map(p => 
                        p.name === platformName 
                            ? { ...p, researchStatus: 'completed' }
                            : p
                    ));
                },
                config.researchModel
            );
            setPlatformResearch(researchResults);
            
            // Generate reviews for each platform (saves to cache)
            setLoadingMessage('Processing research data...');
            
            // Helper to add delay between API calls to avoid overload
            const delayMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
            const DELAY_MS = 5000;
            
            for (let i = 0; i < researchResults.length; i++) {
                const research = researchResults[i];
                const platformInput = config.platforms.find(p => p.name === research.name);
                
                if (i > 0) {
                    setLoadingMessage(`Waiting before processing ${research.name}... (${i + 1}/${researchResults.length})`);
                    await delayMs(DELAY_MS);
                }
                
                setLoadingMessage(`Writing review: ${research.name} (${i + 1}/${researchResults.length})`);
                
                const review = await generatePlatformReview(
                    research,
                    config,
                    platformInput?.affiliateUrl
                );
                
                // Save review to cache
                saveReviewToCache(review, config.vertical || 'gambling');
            }

            // Research complete
            setWorkflowPhase('idle');
            setLoadingMessage('');
            
        } catch (e: any) {
            console.error(e);
            setError(e.message || 'An unexpected error occurred.');
            setWorkflowPhase('error');
        } finally {
            refreshCacheSummary();
        }
    }, [config, refreshCacheSummary]);

    // Phase 2: Assemble article from cached reviews
    const handleAssembleArticle = useCallback(async () => {
        if (!cacheSummary.canAssemble) {
            setError('Need at least 3 cached reviews to assemble an article. Continue researching more platforms.');
            return;
        }
        
        if (!config.verticalConfirmed) {
            setError('Please confirm the Content Vertical before assembling.');
            return;
        }

        resetState();
        setWorkflowPhase('generating-intro');
        setAppMode('assemble');

        try {
            setLoadingMessage('Assembling article from cached reviews...');
            
            const article = await assembleArticleFromCache(
                config,
                (phase, detail) => {
                    if (phase === 'generating-ratings') setWorkflowPhase('generating-reviews');
                    else if (phase === 'generating-intro') setWorkflowPhase('generating-intro');
                    else if (phase === 'generating-comparison') setWorkflowPhase('generating-comparison');
                    else if (phase === 'generating-faqs') setWorkflowPhase('generating-faqs');
                    else if (phase === 'generating-seo') setWorkflowPhase('generating-seo');
                    
                    if (detail) setLoadingMessage(detail);
                }
            );

            if (article) {
                setGeneratedArticle(article);
                setWorkflowPhase('completed');
            } else {
                setError('Failed to assemble article. Not enough cached data.');
                setWorkflowPhase('error');
            }

        } catch (e: any) {
            console.error(e);
            setError(e.message || 'An unexpected error occurred during assembly.');
            setWorkflowPhase('error');
        }
    }, [config, cacheSummary.canAssemble, refreshCacheSummary]);

    const handleCopyAllHtml = useCallback(() => {
        if (!generatedArticle) return;

        const uiText = getUiText(config.language);

        // Build full HTML
        let html = `<div class="article-content">`;
        html += `<div class="intro">${generatedArticle.intro}</div>`;
        
        // Platform quick list
        html += `<div class="platform-list"><h2>${uiText.platformOverview}</h2><ol>`;
        generatedArticle.platformQuickList.forEach(p => {
            html += `<li><strong>${p.name}</strong> - ${p.shortDescription}</li>`;
        });
        html += `</ol></div>`;

        // Comparison table
        if (generatedArticle.comparisonTable.length > 0) {
            html += `<table class="comparison-table"><thead><tr><th>${uiText.tablePlatform}</th><th>${uiText.tableLicense}</th><th>${uiText.tableMinDeposit}</th><th>${uiText.tablePayoutSpeed}</th><th>${uiText.tableRating}</th></tr></thead><tbody>`;
            generatedArticle.comparisonTable.forEach(row => {
                html += `<tr><td>${row.platformName}</td><td>${row.license}</td><td>${row.minDeposit}</td><td>${row.payoutSpeed}</td><td>${row.rating}</td></tr>`;
            });
            html += `</tbody></table>`;
        }

        // Platform reviews
        generatedArticle.platformReviews.forEach(review => {
            html += `<div class="platform-review"><h2>${uiText.platformReviewTitle(review.platformName)}</h2>`;
            html += `<div class="overview">${review.overview}</div>`;
            html += `<div class="pros"><h3>${uiText.pros}</h3><ul>${review.pros.map(p => `<li>✓ ${p}</li>`).join('')}</ul></div>`;
            html += `<div class="cons"><h3>${uiText.cons}</h3><ul>${review.cons.map(c => `<li>✗ ${c}</li>`).join('')}</ul></div>`;
            html += `<div class="verdict">${review.verdict}</div>`;
            if (review.affiliateUrl) {
                html += `<a href="${review.affiliateUrl}" class="cta-button">${uiText.visitPlatformCta(review.platformName)}</a>`;
            }
            html += `</div>`;
        });

        // FAQs
        if (generatedArticle.faqs.length > 0) {
            html += `<div class="faqs"><h2>${uiText.frequentlyAskedQuestions}</h2>`;
            generatedArticle.faqs.forEach(faq => {
                html += `<div class="faq"><h3>${faq.question}</h3>${faq.answer}</div>`;
            });
            html += `</div>`;
        }

        // Risk Disclaimer (vertical-specific)
        if (config.includeResponsibleGamblingDisclaimer) {
            const verticalConfig = getVerticalConfig(config.vertical || 'gambling');
            const disclaimerText = config.responsibleGamblingDisclaimerText || verticalConfig.disclaimerText;
            html += `<div class="risk-disclaimer" style="margin-top: 2rem; padding: 1rem; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem;">
<h3 style="font-weight: bold; margin-bottom: 0.5rem;">${verticalConfig.disclaimerTitle}</h3>
<p style="font-size: 0.875rem; color: #4b5563;">${disclaimerText}</p>
</div>`;
        }

        html += `</div>`;

        navigator.clipboard.writeText(html);
    }, [generatedArticle, config.language, config.includeResponsibleGamblingDisclaimer, config.responsibleGamblingDisclaimerText]);

    // Helper: Generate rating bar HTML with inline styles
    const generateRatingBarHtml = (category: string, score: number): string => {
        const percentage = (score / 10) * 100;
        const barColor = score >= 8 ? '#22c55e' : score >= 6 ? '#eab308' : '#ef4444';
        return `
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="width: 140px; font-size: 14px; color: #374151;">${category}</span>
            <div style="flex: 1; height: 12px; background-color: #e5e7eb; border-radius: 6px; margin: 0 12px; overflow: hidden;">
                <div style="width: ${percentage}%; height: 100%; background-color: ${barColor}; border-radius: 6px;"></div>
            </div>
            <span style="font-size: 14px; font-weight: 600; color: #374151;">${score}/10</span>
        </div>`;
    };

    // Helper: Generate infosheet HTML with inline styles (for Download HTML)
    const generateInfosheetHtmlStyled = (infosheet: any, uiText: any): string => {
        const rows = [
            [uiText.infosheetLicense, infosheet.license],
            [uiText.infosheetCountry, infosheet.country],
            [uiText.infosheetCompany, infosheet.company],
            [uiText.infosheetMinDeposit, infosheet.minDeposit],
            [uiText.infosheetPayoutSpeed, infosheet.payoutSpeed],
            [uiText.infosheetCurrencies, Array.isArray(infosheet.supportedCurrencies) ? infosheet.supportedCurrencies.join(', ') : infosheet.supportedCurrencies || 'N/A'],
            [uiText.infosheetPaymentMethods, Array.isArray(infosheet.paymentMethods) ? infosheet.paymentMethods.join(', ') : infosheet.paymentMethods || 'N/A'],
            ['KYC', infosheet.kycRequirement || 'Not specified'],
        ];
        
        let tableHtml = `<div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h4 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px;">${uiText.platformInformation}</h4>`;
        
        if (infosheet.dataSource || infosheet.retrievedAt) {
            tableHtml += `<p style="font-size: 12px; color: #6b7280; margin-bottom: 12px;">`;
            if (infosheet.dataSource) tableHtml += `Source: ${infosheet.dataSource}`;
            if (infosheet.dataSource && infosheet.retrievedAt) tableHtml += ` • `;
            if (infosheet.retrievedAt) {
                const date = new Date(infosheet.retrievedAt);
                tableHtml += `Last retrieved: ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`;
            }
            tableHtml += `</p>`;
        }
        
        tableHtml += `<table style="width: 100%; font-size: 14px; border-collapse: collapse;">`;
        rows.forEach(([label, value]) => {
            tableHtml += `<tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; color: #6b7280; font-weight: 500; width: 140px;">${label}</td><td style="padding: 8px 0; color: #111827;">${value}</td></tr>`;
        });
        // Bonus row - highlighted
        tableHtml += `<tr style="background-color: #fef9c3;"><td style="padding: 8px 0; color: #374151; font-weight: 600;">🎁 Bonus</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${infosheet.welcomeBonus || 'Not specified'}</td></tr>`;
        tableHtml += `</table></div>`;
        
        return tableHtml;
    };

    // Helper: Generate infosheet HTML (with or without shortcodes)
    const generateInfosheetHtml = (infosheet: any, uiText: any, useShortcodes: boolean): string => {
        let sourceInfo = '';
        if (infosheet.dataSource || infosheet.retrievedAt) {
            sourceInfo = '<small>';
            if (infosheet.dataSource) sourceInfo += `Source: ${infosheet.dataSource}`;
            if (infosheet.dataSource && infosheet.retrievedAt) sourceInfo += ` • `;
            if (infosheet.retrievedAt) {
                const date = new Date(infosheet.retrievedAt);
                sourceInfo += `Last retrieved: ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`;
            }
            sourceInfo += '</small>\n\n';
        }
        
        let tableHtml = `<h4>${uiText.platformInformation}</h4>\n`;
        tableHtml += sourceInfo;
        if (useShortcodes) tableHtml += `[su_table responsive="yes"]\n`;
        tableHtml += `<table>\n<tbody>\n`;
        tableHtml += `<tr><td><strong>${uiText.infosheetLicense}</strong></td><td>${infosheet.license}</td></tr>\n`;
        tableHtml += `<tr><td><strong>${uiText.infosheetCountry}</strong></td><td>${infosheet.country}</td></tr>\n`;
        tableHtml += `<tr><td><strong>${uiText.infosheetCompany}</strong></td><td>${infosheet.company}</td></tr>\n`;
        tableHtml += `<tr><td><strong>${uiText.infosheetMinDeposit}</strong></td><td>${infosheet.minDeposit}</td></tr>\n`;
        tableHtml += `<tr><td><strong>${uiText.infosheetPayoutSpeed}</strong></td><td>${infosheet.payoutSpeed}</td></tr>\n`;
        tableHtml += `<tr><td><strong>${uiText.infosheetCurrencies}</strong></td><td>${Array.isArray(infosheet.supportedCurrencies) ? infosheet.supportedCurrencies.join(', ') : infosheet.supportedCurrencies || 'N/A'}</td></tr>\n`;
        tableHtml += `<tr><td><strong>${uiText.infosheetPaymentMethods}</strong></td><td>${Array.isArray(infosheet.paymentMethods) ? infosheet.paymentMethods.join(', ') : infosheet.paymentMethods || 'N/A'}</td></tr>\n`;
        tableHtml += `<tr><td><strong>KYC</strong></td><td>${infosheet.kycRequirement || 'Not specified'}</td></tr>\n`;
        tableHtml += `<tr style="background-color: #fef9c3;"><td><strong>🎁 Bonus</strong></td><td><strong>${infosheet.welcomeBonus || 'Not specified'}</strong></td></tr>\n`;
        tableHtml += `</tbody>\n</table>\n`;
        if (useShortcodes) tableHtml += `[/su_table]\n`;
        tableHtml += `\n`;
        
        return tableHtml;
    };

    // Clean HTML copy for WordPress (with or without shortcodes)
    const handleCopyCleanHtml = useCallback(() => {
        if (!generatedArticle) return;

        const uiText = getUiText(config.language);
        const useShortcodes = config.useShortcodes !== false; // default true

        let html = useShortcodes 
            ? `<!-- Article Content - WordPress Ultimate Shortcode Format -->\n`
            : `<!-- Article Content - Plain HTML -->\n`;
        
        // SEO Metadata block at the top
        if (generatedArticle.seoMetadata) {
            const seo = generatedArticle.seoMetadata;
            html += `<!--
=== SEO METADATA ===
Title: ${seo.title}
Meta Description: ${seo.metaDescription}
Slug: ${seo.slug}
Image Prompt: ${seo.imagePrompt}
Image Alt Text: ${seo.imageAltText}
==================
-->\n\n`;
        }
        
        html += generatedArticle.intro + '\n\n';
        
        // Platform quick list
        html += `<h2>${uiText.platformOverview}</h2>\n<ol>\n`;
        generatedArticle.platformQuickList.forEach(p => {
            html += `<li><strong>${p.name}</strong> - ${p.shortDescription}</li>\n`;
        });
        html += `</ol>\n\n`;

        // Comparison table (dynamic columns chosen by LLM)
        if (generatedArticle.comparisonTable.length > 0) {
            html += `<h2>${uiText.platformComparison}</h2>\n`;
            if (useShortcodes) html += `[su_table responsive="yes"]\n`;
            
            // Extract dynamic columns from first row (excluding platformName and rating)
            const firstRow = generatedArticle.comparisonTable[0] as Record<string, any>;
            const dynamicColumns = Object.keys(firstRow).filter(k => 
                k !== 'platformName' && k !== 'rating'
            );
            
            // Build header row dynamically
            const headerCells = [uiText.tablePlatform, ...dynamicColumns.map(col => 
                col.charAt(0).toUpperCase() + col.slice(1).replace(/([A-Z])/g, ' $1').trim()
            ), uiText.tableRating];
            html += `<table>\n<thead>\n<tr>${headerCells.map(h => `<th>${h}</th>`).join('')}</tr>\n</thead>\n<tbody>\n`;
            
            // Build data rows dynamically
            generatedArticle.comparisonTable.forEach(row => {
                const rowData = row as Record<string, any>;
                const cells = [rowData.platformName, ...dynamicColumns.map(col => rowData[col] || '-'), rowData.rating];
                html += `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>\n`;
            });
            html += `</tbody>\n</table>\n`;
            if (useShortcodes) html += `[/su_table]\n`;
            html += `\n`;
        }

        // Platform reviews
        generatedArticle.platformReviews.forEach(review => {
            html += `<h2>${uiText.platformReviewTitle(review.platformName)}</h2>\n`;
            html += review.overview + '\n\n';
            
            // Rating bars (if enabled and available) - using inline HTML as no shortcode equivalent
            if (config.includeSections.platformRatings && review.ratings && review.ratings.length > 0) {
                html += `<h3>${uiText.platformRatings}</h3>\n`;
                review.ratings.forEach(r => {
                    const score = r.score;
                    const percentage = (score / 10) * 100;
                    const barColor = score >= 8 ? '#22c55e' : score >= 6 ? '#eab308' : '#ef4444';
                    html += `<div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <span style="width: 140px; font-size: 14px;">${uiText.translateRatingCategory(r.category)}</span>
                        <div style="flex: 1; height: 12px; background-color: #e5e7eb; border-radius: 6px; margin: 0 12px; overflow: hidden;">
                            <div style="width: ${percentage}%; height: 100%; background-color: ${barColor}; border-radius: 6px;"></div>
                        </div>
                        <span style="font-size: 14px; font-weight: 600;">${score}/10</span>
                    </div>\n`;
                });
                html += `\n`;
            }
            
            // Infosheet (with or without shortcodes)
            if (config.includeSections.platformInfosheet) {
                html += generateInfosheetHtml(review.infosheet, uiText, useShortcodes);
            }
            
            // Pros and Cons
            if (config.includeSections.prosCons) {
                if (useShortcodes) {
                    html += `[su_row]\n[su_column size="1/2"]\n`;
                } else {
                    html += `<div style="display: flex; gap: 24px;">\n<div style="flex: 1;">\n`;
                }
                html += `<h4 style="color: #166534;">✓ ${uiText.pros}</h4>\n<ul>\n`;
                review.pros.forEach(p => {
                    html += `<li><span style="color: #22c55e;">✓</span> ${p}</li>\n`;
                });
                html += `</ul>\n`;
                if (useShortcodes) {
                    html += `[/su_column]\n[su_column size="1/2"]\n`;
                } else {
                    html += `</div>\n<div style="flex: 1;">\n`;
                }
                html += `<h4 style="color: #991b1b;">✗ ${uiText.cons}</h4>\n<ul>\n`;
                review.cons.forEach(c => {
                    html += `<li><span style="color: #ef4444;">✗</span> ${c}</li>\n`;
                });
                html += `</ul>\n`;
                if (useShortcodes) {
                    html += `[/su_column]\n[/su_row]\n\n`;
                } else {
                    html += `</div>\n</div>\n\n`;
                }
            }
            
            // Verdict
            if (config.includeSections.verdict) {
                html += `<h3>${uiText.ourVerdict}</h3>\n`;
                if (useShortcodes) {
                    html += `[su_highlight background="#f3f4f6" color="#111827"]\n${review.verdict}\n[/su_highlight]\n\n`;
                } else {
                    html += `<div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px;">${review.verdict}</div>\n\n`;
                }
            }
            
            // CTA Button
            if (review.affiliateUrl) {
                if (useShortcodes) {
                    html += `[su_button url="${review.affiliateUrl}" target="blank" style="flat" background="#22c55e" color="#ffffff" size="6" center="yes" radius="5"]${uiText.visitPlatformCta(review.platformName)}[/su_button]\n\n`;
                } else {
                    html += `<p style="text-align: center;"><a href="${review.affiliateUrl}" target="_blank" style="display: inline-block; background-color: #22c55e; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">${uiText.visitPlatformCta(review.platformName)}</a></p>\n\n`;
                }
            }
        });

        // Scoring Methodology Section (translated)
        html += `<h2>${uiText.ratingMethodologyTitle}</h2>\n`;
        html += `<p>${uiText.ratingMethodologyIntro}</p>\n`;
        if (useShortcodes) html += `[su_table responsive="yes"]\n`;
        html += `<table>\n<thead>\n<tr><th>${uiText.ratingScore}</th><th>${uiText.ratingMeaning}</th><th>${uiText.ratingCriteria}</th></tr>\n</thead>\n<tbody>\n`;
        html += `<tr><td>9-10</td><td>${uiText.ratingExceptional}</td><td>${uiText.ratingExceptionalCriteria}</td></tr>\n`;
        html += `<tr><td>8</td><td>${uiText.ratingExcellent}</td><td>${uiText.ratingExcellentCriteria}</td></tr>\n`;
        html += `<tr><td>7</td><td>${uiText.ratingVeryGood}</td><td>${uiText.ratingVeryGoodCriteria}</td></tr>\n`;
        html += `<tr><td>6</td><td>${uiText.ratingGood}</td><td>${uiText.ratingGoodCriteria}</td></tr>\n`;
        html += `<tr><td>5</td><td>${uiText.ratingAdequate}</td><td>${uiText.ratingAdequateCriteria}</td></tr>\n`;
        html += `<tr><td>1-4</td><td>${uiText.ratingBelowAverage}</td><td>${uiText.ratingBelowAverageCriteria}</td></tr>\n`;
        html += `</tbody>\n</table>\n`;
        if (useShortcodes) html += `[/su_table]\n`;
        html += `<p><strong>${uiText.starRatingAggregation}</strong></p>\n\n`;

        // FAQs
        if (generatedArticle.faqs.length > 0) {
            html += `<h2>${uiText.frequentlyAskedQuestions}</h2>\n`;
            if (useShortcodes) {
                generatedArticle.faqs.forEach((faq, index) => {
                    const num = index + 1;
                    html += `[Q${num}]${faq.question}[/Q${num}]\n`;
                    html += `[A${num}]${faq.answer}[/A${num}]\n`;
                });
            } else {
                generatedArticle.faqs.forEach((faq) => {
                    html += `<details><summary><strong>${faq.question}</strong></summary>\n<p>${faq.answer}</p>\n</details>\n`;
                });
            }
            html += `\n`;
        }

        // Risk Disclaimer (vertical-specific)
        if (config.includeResponsibleGamblingDisclaimer) {
            const verticalConfig = getVerticalConfig(config.vertical || 'gambling');
            const disclaimerText = config.responsibleGamblingDisclaimerText || verticalConfig.disclaimerText;
            if (useShortcodes) {
                html += `[su_note note_color="#fef3c7" text_color="#78350f"]\n`;
                html += `<strong>${verticalConfig.disclaimerTitle}</strong>\n${disclaimerText}\n[/su_note]\n`;
            } else {
                html += `<div style="background-color: #fef3c7; color: #78350f; padding: 16px; border-radius: 8px; margin-top: 24px;">\n`;
                html += `<strong>${verticalConfig.disclaimerTitle}</strong><br>\n${disclaimerText}\n</div>\n`;
            }
        }

        navigator.clipboard.writeText(html);
    }, [generatedArticle, config.language, config.includeResponsibleGamblingDisclaimer, config.responsibleGamblingDisclaimerText, config.includeSections, config.useShortcodes, config.vertical]);

    const handleDownloadHtml = useCallback(() => {
        if (!generatedArticle) return;

        const htmlLang = getHtmlLang(config.language);
        const uiText = getUiText(config.language);

        // Build complete article content
        let articleContent = generatedArticle.intro + '\n\n';
        
        // Platform quick list
        articleContent += `<h2>${uiText.platformOverview}</h2>\n<ol>\n`;
        generatedArticle.platformQuickList.forEach(p => {
            articleContent += `<li><strong>${p.name}</strong> - ${p.shortDescription}</li>\n`;
        });
        articleContent += `</ol>\n\n`;

        // Comparison table
        if (generatedArticle.comparisonTable.length > 0) {
            articleContent += `<h2>${uiText.platformComparison}</h2>\n`;
            articleContent += `<table>\n<thead>\n<tr><th>${uiText.tablePlatform}</th><th>${uiText.tableLicense}</th><th>${uiText.tableMinDeposit}</th><th>${uiText.tablePayoutSpeed}</th><th>${uiText.tableRating}</th></tr>\n</thead>\n<tbody>\n`;
            generatedArticle.comparisonTable.forEach(row => {
                articleContent += `<tr><td>${row.platformName}</td><td>${row.license}</td><td>${row.minDeposit}</td><td>${row.payoutSpeed}</td><td>${row.rating}</td></tr>\n`;
            });
            articleContent += `</tbody>\n</table>\n\n`;
        }

        // Platform reviews
        generatedArticle.platformReviews.forEach(review => {
            articleContent += `<h2>${uiText.platformReviewTitle(review.platformName)}</h2>\n`;
            articleContent += review.overview + '\n\n';
            
            // Rating bars (if enabled)
            if (config.includeSections.platformRatings && review.ratings && review.ratings.length > 0) {
                articleContent += `<h3>${uiText.platformRatings}</h3>\n`;
                articleContent += `<div style="margin: 16px 0;">`;
                review.ratings.forEach(r => {
                    articleContent += generateRatingBarHtml(uiText.translateRatingCategory(r.category), r.score);
                });
                articleContent += `</div>\n\n`;
            }
            
            // Infosheet (if enabled)
            if (config.includeSections.platformInfosheet) {
                articleContent += generateInfosheetHtmlStyled(review.infosheet, uiText);
            }
            
            // Pros and Cons (if enabled)
            if (config.includeSections.prosCons) {
                articleContent += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0;">`;
                articleContent += `<div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px;">`;
                articleContent += `<h4 style="font-size: 14px; font-weight: 600; color: #166534; margin-bottom: 12px;">✓ ${uiText.pros}</h4>`;
                articleContent += `<ul style="margin: 0; padding-left: 0; list-style: none;">`;
                review.pros.forEach(p => {
                    articleContent += `<li style="margin-bottom: 8px; color: #111827;"><span style="color: #22c55e; margin-right: 8px;">✓</span>${p}</li>`;
                });
                articleContent += `</ul></div>`;
                articleContent += `<div style="background-color: #fef2f2; padding: 16px; border-radius: 8px;">`;
                articleContent += `<h4 style="font-size: 14px; font-weight: 600; color: #991b1b; margin-bottom: 12px;">✗ ${uiText.cons}</h4>`;
                articleContent += `<ul style="margin: 0; padding-left: 0; list-style: none;">`;
                review.cons.forEach(c => {
                    articleContent += `<li style="margin-bottom: 8px; color: #111827;"><span style="color: #ef4444; margin-right: 8px;">✗</span>${c}</li>`;
                });
                articleContent += `</ul></div></div>\n\n`;
            }
            
            // Verdict (if enabled)
            if (config.includeSections.verdict) {
                articleContent += `<div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">`;
                articleContent += `<h3 style="font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 12px;">${uiText.ourVerdict}</h3>\n`;
                articleContent += `<div style="color: #111827;">${review.verdict}</div></div>\n\n`;
            }
            
            if (review.affiliateUrl) {
                articleContent += `<p style="text-align: center; margin: 24px 0;"><a href="${review.affiliateUrl}" style="display: inline-block; padding: 12px 32px; background-color: #22c55e; color: white; text-decoration: none; font-weight: 600; border-radius: 8px;">${uiText.visitPlatformCta(review.platformName)}</a></p>\n\n`;
            }
        });

        // Scoring Methodology Section (before FAQs)
        articleContent += `<h2>Our Rating Methodology</h2>\n`;
        articleContent += `<p>We evaluate each platform across six key categories, with scores from 1-10:</p>\n`;
        articleContent += `<div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">`;
        articleContent += `<table style="width: 100%; font-size: 14px; border-collapse: collapse;">`;
        articleContent += `<tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px; font-weight: 600;">Score</td><td style="padding: 8px; font-weight: 600;">Meaning</td><td style="padding: 8px; font-weight: 600;">Criteria</td></tr>`;
        articleContent += `<tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px;">9-10</td><td style="padding: 8px;">Exceptional</td><td style="padding: 8px;">Industry-leading, verified by multiple sources</td></tr>`;
        articleContent += `<tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px;">8</td><td style="padding: 8px;">Excellent</td><td style="padding: 8px;">Top-tier with minor room for improvement</td></tr>`;
        articleContent += `<tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px;">7</td><td style="padding: 8px;">Very Good</td><td style="padding: 8px;">Above average, meets high standards</td></tr>`;
        articleContent += `<tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px;">6</td><td style="padding: 8px;">Good</td><td style="padding: 8px;">Solid, meets expectations</td></tr>`;
        articleContent += `<tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px;">5</td><td style="padding: 8px;">Adequate</td><td style="padding: 8px;">Acceptable but has gaps</td></tr>`;
        articleContent += `<tr><td style="padding: 8px;">1-4</td><td style="padding: 8px;">Below Average</td><td style="padding: 8px;">Significant issues noted</td></tr>`;
        articleContent += `</table></div>\n`;
        articleContent += `<p><strong>Star Rating Aggregation:</strong> The overall star rating (1-5 stars) is calculated by averaging all six category scores: 9.0-10 = ⭐⭐⭐⭐⭐ | 7.5-8.9 = ⭐⭐⭐⭐ | 6.0-7.4 = ⭐⭐⭐ | 4.5-5.9 = ⭐⭐ | Below 4.5 = ⭐</p>\n\n`;

        // FAQs
        if (generatedArticle.faqs.length > 0) {
            articleContent += `<h2>${uiText.frequentlyAskedQuestions}</h2>\n`;
            generatedArticle.faqs.forEach(faq => {
                articleContent += `<h3>${faq.question}</h3>\n${faq.answer}\n\n`;
            });
        }

        // Risk Disclaimer (vertical-specific)
        if (config.includeResponsibleGamblingDisclaimer) {
            const verticalConfig = getVerticalConfig(config.vertical || 'gambling');
            const disclaimerText = config.responsibleGamblingDisclaimerText || verticalConfig.disclaimerText;
            articleContent += `<div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">`;
            articleContent += `<h3 style="color: #92400e;">${verticalConfig.disclaimerTitle}</h3>\n`;
            articleContent += `<p style="color: #78350f;">${disclaimerText}</p></div>\n`;
        }

        const fullHtml = `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Platform Reviews</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 font-sans">
    <main class="max-w-4xl mx-auto my-8 p-8 bg-white rounded-lg shadow-lg">
        <article class="prose max-w-none">
            ${articleContent}
        </article>
    </main>
</body>
</html>`;

        const blob = new Blob([fullHtml], { type: 'text/html' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = 'platform-reviews.html';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
    }, [generatedArticle, config.language, config.includeSections, config.includeResponsibleGamblingDisclaimer, config.responsibleGamblingDisclaimerText, generateRatingBarHtml, generateInfosheetHtmlStyled]);

    const isLoading = workflowPhase !== 'idle' && workflowPhase !== 'completed' && workflowPhase !== 'error';
    const uiText = getUiText(config.language);

    return (
        <div className="min-h-screen bg-gray-100 text-gray-800 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-8 relative">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-600">
                        Deep Research to Article 
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">Create comprehensive, research-backed platform reviews</p>
                    <button
                        onClick={() => setShowWalkthrough(true)}
                        className="absolute top-0 right-0 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium transition flex items-center gap-2"
                    >
                        <span>❓</span> How to Use
                    </button>
                </header>
                
                {/* Walkthrough Modal */}
                <WalkthroughModal isOpen={showWalkthrough} onClose={() => setShowWalkthrough(false)} />

                <main className="space-y-8">
                    {/* Input Form */}
                    <InputForm
                        config={config}
                        setConfig={setConfig}
                        onClearAll={handleClearAll}
                        onClearResearchCache={handleClearResearchCache}
                        onCacheChanged={refreshCacheSummary}
                        onSubmit={handleStartResearch}
                        isLoading={isLoading}
                        serpCompetitors={serpCompetitors}
                        serpAnalysisLoading={serpAnalysisLoading}
                        onAnalyzeSerpCompetitors={handleAnalyzeSerpCompetitors}
                    />

                    {/* Two-Phase Workflow Panel - Only show for Full Comparison mode */}
                    {workflowPhase === 'idle' && config.articleMode === ArticleMode.FULL_COMPARISON && (
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl shadow-lg p-6">
                            <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center">
                                <span className="mr-2">📊</span> Article Generation Workflow
                            </h3>
                            
                            {/* Step 1: Research Status */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">1</span>
                                    <h4 className="text-lg font-semibold text-gray-800">Research Platforms</h4>
                                    {cacheSummary.reviewCount > 0 && (
                                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                            ✓ {cacheSummary.reviewCount} completed
                                        </span>
                                    )}
                                </div>
                                
                                {cacheSummary.reviewCount > 0 ? (
                                    <div className="ml-10 bg-white rounded-lg p-4 border border-gray-200">
                                        <p className="text-sm text-gray-600 mb-2">Platforms in research corpus:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {cacheSummary.reviewPlatforms.map((name, i) => (
                                                <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                                    ✓ {name}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-3">
                                            Add more platforms above and click "Research Platforms" to expand your corpus.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="ml-10 bg-white rounded-lg p-4 border border-gray-200">
                                        <p className="text-sm text-gray-500">
                                            No platforms researched yet. Add platforms above and click "Research Platforms" to begin.
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Step 2: Generate Article */}
                            <div className="border-t border-indigo-200 pt-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                        cacheSummary.canAssemble 
                                            ? 'bg-purple-600 text-white' 
                                            : 'bg-gray-300 text-gray-500'
                                    }`}>2</span>
                                    <h4 className={`text-lg font-semibold ${cacheSummary.canAssemble ? 'text-gray-800' : 'text-gray-400'}`}>
                                        Generate Article
                                    </h4>
                                </div>
                                
                                <div className="ml-10">
                                    {cacheSummary.canAssemble ? (
                                        <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
                                            <p className="text-sm text-green-700 font-medium mb-3">
                                                ✅ {cacheSummary.reviewCount} platforms ready! You can now generate your comparison article.
                                            </p>
                                            <p className="text-xs text-gray-500 mb-4">
                                                This will generate: Introduction, Comparison Table, Platform Reviews with consistent ratings, and FAQs.
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={handleAssembleArticle}
                                                    disabled={isLoading}
                                                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-md transition transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
                                                >
                                                    ✨ Generate Comparison Article
                                                </button>
                                                <button
                                                    onClick={handleClearAllCaches}
                                                    className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition"
                                                >
                                                    Clear Research
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <p className="text-sm text-amber-600">
                                                ⚠️ Need at least 3 platforms to generate a comparison article.
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Currently have {cacheSummary.reviewCount} platform{cacheSummary.reviewCount !== 1 ? 's' : ''}. 
                                                Research {Math.max(0, 3 - cacheSummary.reviewCount)} more to unlock article generation.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Single Platform Review Workflow Panel */}
                    {workflowPhase === 'idle' && config.articleMode === ArticleMode.SINGLE_PLATFORM_REVIEW && (
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl shadow-lg p-6">
                            <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center">
                                <span className="mr-2">📝</span> Single Platform Review Workflow
                            </h3>
                            <div className="bg-white rounded-lg p-4 border border-purple-200">
                                <p className="text-sm text-purple-700 mb-2">
                                    <strong>One-click generation:</strong> Add exactly 1 platform above, then click "Research Platforms".
                                </p>
                                <p className="text-xs text-gray-500">
                                    The system will research the platform and automatically generate a comprehensive standalone review with intro, detailed sections, ratings, pros/cons, verdict, and platform-specific FAQs.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Review Snippet Workflow Panel */}
                    {workflowPhase === 'idle' && config.articleMode === ArticleMode.REVIEW_SNIPPET && (
                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl shadow-lg p-6">
                            <h3 className="text-xl font-bold text-orange-900 mb-4 flex items-center">
                                <span className="mr-2">✂️</span> Review Snippet Workflow
                            </h3>
                            <div className="bg-white rounded-lg p-4 border border-orange-200">
                                <p className="text-sm text-orange-700 mb-2">
                                    <strong>Quick review blocks:</strong> Add 1-5 platforms above, then click "Research Platforms".
                                </p>
                                <p className="text-xs text-gray-500">
                                    Generates just the review block (infosheet, ratings, pros/cons, verdict) for each platform. No intro or FAQs. Perfect for updating existing comparison articles.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Research Evidence Panel - Shows raw research data and citations for verification */}
                    {platformResearch.length > 0 && workflowPhase === 'idle' && (
                        <ResearchEvidencePanel 
                            platformResearch={platformResearch}
                            title="📚 Research Evidence (Verify Sources)"
                        />
                    )}

                    {/* Error Display with Retry */}
                    {error && (
                        <div className="bg-red-50 border-2 border-red-300 text-red-700 p-4 rounded-lg">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="font-semibold mb-1">Error occurred</p>
                                    <p className="text-sm">{error}</p>
                                    {error.includes('503') && (
                                        <p className="text-xs text-red-500 mt-2">
                                            Tip: The AI model is temporarily overloaded. Wait 30-60 seconds and try again.
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <button
                                        onClick={() => setError(null)}
                                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition"
                                    >
                                        Dismiss
                                    </button>
                                    {appMode === 'assemble' && cacheSummary.canAssemble && (
                                        <button
                                            onClick={handleAssembleArticle}
                                            className="px-4 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md transition"
                                        >
                                            Try Again
                                        </button>
                                    )}
                                    {appMode === 'research' && (
                                        <button
                                            onClick={handleStartResearch}
                                            className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
                                        >
                                            Try Again
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Research Progress */}
                    {workflowPhase === 'researching' && platformResearch.length > 0 && (
                        <ResearchProgress 
                            platforms={platformResearch.map(p => ({ 
                                name: p.name, 
                                status: p.researchStatus 
                            }))}
                            isStillWorking={isLoading}
                            currentTask={loadingMessage}
                        />
                    )}

                    {/* Loading State */}
                    {isLoading && workflowPhase !== 'researching' && (
                        <Loader message={loadingMessage || `${workflowPhase}...`} />
                    )}

                    {/* Single Platform Review Output */}
                    {singlePlatformArticle && workflowPhase === 'completed' && (
                        <SinglePlatformReviewOutput
                            article={singlePlatformArticle}
                            language={config.language}
                            useShortcodes={config.useShortcodes !== false}
                            onCopyHtml={() => alert('Copied to clipboard!')}
                        />
                    )}

                    {/* Generated Article Output (Full Comparison) */}
                    {generatedArticle && workflowPhase === 'completed' && !singlePlatformArticle && (
                        <div className="space-y-6">
                            {/* Action Buttons */}
                            <div className="flex flex-wrap justify-end gap-3">
                                <button
                                    onClick={handleCopyCleanHtml}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm font-medium transition"
                                    title="Copy clean HTML for WordPress/Google Docs"
                                >
                                    Copy for WordPress
                                </button>
                                <button
                                    onClick={handleDownloadHtml}
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition"
                                >
                                    Download HTML
                                </button>
                            </div>

                            {/* SEO Metadata */}
                            {generatedArticle.seoMetadata && (
                                <SectionCard title="📊 SEO Metadata" icon="">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</label>
                                            <p className="text-sm font-medium text-gray-900 mt-1">{generatedArticle.seoMetadata.title}</p>
                                            <span className="text-xs text-gray-400">{generatedArticle.seoMetadata.title.length} characters</span>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Meta Description</label>
                                            <p className="text-sm text-gray-700 mt-1">{generatedArticle.seoMetadata.metaDescription}</p>
                                            <span className="text-xs text-gray-400">{generatedArticle.seoMetadata.metaDescription.length} characters</span>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Slug (English)</label>
                                            <code className="block text-sm text-purple-600 mt-1 font-mono">/{generatedArticle.seoMetadata.slug}/</code>
                                        </div>
                                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                            <label className="text-xs font-semibold text-blue-600 uppercase tracking-wide">🎨 Image Prompt (English)</label>
                                            <p className="text-sm text-gray-700 mt-1 italic">{generatedArticle.seoMetadata.imagePrompt}</p>
                                        </div>
                                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                            <label className="text-xs font-semibold text-green-600 uppercase tracking-wide">Image Alt Text ({config.language})</label>
                                            <p className="text-sm text-gray-700 mt-1">{generatedArticle.seoMetadata.imageAltText}</p>
                                        </div>
                                    </div>
                                </SectionCard>
                            )}

                            {/* Introduction */}
                            <SectionCard title={uiText.introduction} icon="📄">
                                <div 
                                    className="prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: generatedArticle.intro }}
                                />
                            </SectionCard>

                            {/* Platform Quick List */}
                            <SectionCard title={uiText.platformOverview} icon="📋">
                                <ol className="space-y-2">
                                    {generatedArticle.platformQuickList.map((p, i) => (
                                        <li key={i} className="flex gap-2">
                                            <span className="font-bold text-purple-600">{i + 1}.</span>
                                            <span>
                                                <strong>{p.name}</strong>
                                                {' - '}
                                                <span dangerouslySetInnerHTML={{ __html: p.shortDescription }} />
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </SectionCard>

                            {/* Comparison Table */}
                            {config.includeSections.comparisonTable && generatedArticle.comparisonTable.length > 0 && (
                                <ComparisonTable rows={generatedArticle.comparisonTable} language={config.language} />
                            )}

                            {/* Platform Reviews */}
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-gray-900">{uiText.platformReviews}</h2>
                                {generatedArticle.platformReviews.map((review, index) => (
                                    <PlatformReviewCard
                                        key={index}
                                        review={review}
                                        language={config.language}
                                        showInfosheet={config.includeSections.platformInfosheet}
                                        showRatings={config.includeSections.platformRatings}
                                        showProsCons={config.includeSections.prosCons}
                                        showVerdict={config.includeSections.verdict}
                                    />
                                ))}
                            </div>

                            {/* Additional Sections (from competitor analysis) */}
                            {generatedArticle.additionalSections.length > 0 && (
                                <div className="space-y-4">
                                    {generatedArticle.additionalSections.map((section, index) => (
                                        <SectionCard key={index} title={section.title} icon="📝">
                                            <div 
                                                className="prose prose-sm max-w-none"
                                                dangerouslySetInnerHTML={{ __html: section.content }}
                                            />
                                        </SectionCard>
                                    ))}
                                </div>
                            )}

                            {/* FAQs */}
                            {config.includeSections.faqs && generatedArticle.faqs.length > 0 && (
                                <FAQSection faqs={generatedArticle.faqs} language={config.language} />
                            )}

                            {/* Citations */}
                            {generatedArticle.allCitations.length > 0 && (
                                <SectionCard title={uiText.allSources} icon="📚">
                                    <CitationList 
                                        citations={generatedArticle.allCitations} 
                                        title="" 
                                    />
                                </SectionCard>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;