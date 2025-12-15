import React, { useState, useCallback, useEffect } from 'react';
import { InputForm } from './components/InputForm';
import { ComparisonTable } from './components/output/ComparisonTable';
import { PlatformReviewCard } from './components/output/PlatformReviewCard';
import { FAQSection } from './components/output/FAQSection';
import { CitationList } from './components/CitationLink';
import { getUiText, getHtmlLang } from './utils/uiText';
import { 
    researchAllPlatforms, 
    generateFullArticle,
    analyzeSerpCompetitors,
    SerpCompetitor
} from './services/platformResearchService';
import { 
    ArticleConfig, 
    Language, 
    PlatformResearch, 
    GeneratedArticle,
    ReviewTemplate,
    WorkflowPhase,
    WritingModel,
    SeoMode,
    ToneOfVoice
} from './types';
import { 
    listTemplates, 
    saveTemplate, 
    deleteTemplate,
    DEFAULT_SECTION_WORD_COUNTS,
    DEFAULT_INCLUDE_SECTIONS
} from './utils/templates';

// --- Loader Component ---
const Loader: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
        <p className="text-gray-600 text-sm">{message}</p>
    </div>
);

// --- Research Progress Component ---
const ResearchProgress: React.FC<{ 
    platforms: { name: string; status: 'pending' | 'researching' | 'completed' | 'error' }[] 
}> = ({ platforms }) => (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">🔍</span> Research Progress
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
                parsed.writingModel = WritingModel.GEMINI_2_5_PRO;
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
            language: Language.ENGLISH,
            introNarrative: '',
            introWordCount: 200,
            platforms: [],
            sectionWordCounts: DEFAULT_SECTION_WORD_COUNTS,
            includeSections: DEFAULT_INCLUDE_SECTIONS,
            targetKeywords: [],
            seoMode: SeoMode.DEFAULT,
            writingModel: WritingModel.GEMINI_2_5_PRO,
            toneOfVoice: ToneOfVoice.PROFESSIONAL,
        };
    });

    // Template state
    const [templates, setTemplates] = useState<ReviewTemplate[]>([]);

    // Workflow state
    const [workflowPhase, setWorkflowPhase] = useState<WorkflowPhase>('idle');
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Research state
    const [platformResearch, setPlatformResearch] = useState<PlatformResearch[]>([]);
    
    // Generated article state
    const [generatedArticle, setGeneratedArticle] = useState<GeneratedArticle | null>(null);

    // SERP Competitor Analysis state
    const [serpCompetitors, setSerpCompetitors] = useState<SerpCompetitor[]>([]);
    const [serpAnalysisLoading, setSerpAnalysisLoading] = useState(false);

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

    // Load templates on mount
    useEffect(() => {
        setTemplates(listTemplates());
    }, []);

    // Auto-save config whenever it changes
    useEffect(() => {
        saveConfig(config);
    }, [config]);

    const handleSaveTemplate = (name: string) => {
        const newTemplate = saveTemplate(name, {
            language: config.language,
            introWordCount: config.introWordCount,
            sectionWordCounts: config.sectionWordCounts,
            includeSections: config.includeSections
        });
        setTemplates(prev => [...prev, newTemplate]);
    };

    const handleLoadTemplate = (template: ReviewTemplate) => {
        setConfig(prev => ({
            ...prev,
            language: template.language,
            introWordCount: template.introWordCount,
            sectionWordCounts: template.sectionWordCounts,
            includeSections: template.includeSections
        }));
    };

    const handleDeleteTemplate = (id: string) => {
        deleteTemplate(id);
        setTemplates(prev => prev.filter(t => t.id !== id));
    };

    const resetState = () => {
        setWorkflowPhase('idle');
        setPlatformResearch([]);
        setGeneratedArticle(null);
        setError(null);
        setLoadingMessage('');
    };

    // Main workflow handler
    const handleStartResearch = useCallback(async () => {
        if (config.platforms.length === 0) {
            setError('Please add at least one platform to review.');
            return;
        }

        resetState();
        setWorkflowPhase('researching');

        try {
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

            // Run SERP competitor analysis if keyword is provided
            if (config.serpKeyword?.trim()) {
                setSerpAnalysisLoading(true);
                setLoadingMessage('Analyzing SERP competitors...');
                try {
                    const competitors = await analyzeSerpCompetitors(config.serpKeyword.trim(), 5);
                    setSerpCompetitors(competitors);
                } catch (err) {
                    console.warn('SERP analysis failed:', err);
                }
                setSerpAnalysisLoading(false);
            }

            // Research all platforms in parallel
            setLoadingMessage('Researching platforms...');
            const researchResults = await researchAllPlatforms(
                config.platforms.map(p => p.name),
                (completed, total, platformName) => {
                    setLoadingMessage(`Researched ${platformName} (${completed}/${total})`);
                    setPlatformResearch(prev => prev.map(p => 
                        p.name === platformName 
                            ? { ...p, researchStatus: 'completed' }
                            : p
                    ));
                }
            );
            setPlatformResearch(researchResults);

            // Generate full article - pass competitor headings for additional sections
            setWorkflowPhase('generating-intro');
            const competitorHeadings = serpCompetitors.flatMap(c => c.headings);
            const article = await generateFullArticle(
                config,
                researchResults,
                (phase, detail) => {
                    setWorkflowPhase(phase as WorkflowPhase);
                    if (detail) {
                        setLoadingMessage(detail);
                    }
                },
                competitorHeadings
            );

            setGeneratedArticle(article);
            setWorkflowPhase('completed');

        } catch (e: any) {
            console.error(e);
            setError(e.message || 'An unexpected error occurred.');
            setWorkflowPhase('error');
        }
    }, [config]);

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

        // Responsible Gambling Disclaimer
        if (config.includeResponsibleGamblingDisclaimer) {
            const disclaimerText = config.responsibleGamblingDisclaimerText || 
                'Gambling involves risk and should be done responsibly. Please only gamble with money you can afford to lose. If you or someone you know has a gambling problem, please seek help from professional organizations. Many jurisdictions have support services available 24/7. You must be of legal gambling age in your jurisdiction to participate in online gambling activities.';
            html += `<div class="responsible-gambling-disclaimer" style="margin-top: 2rem; padding: 1rem; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem;">
<h3 style="font-weight: bold; margin-bottom: 0.5rem;">⚠️ Responsible Gambling</h3>
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
    const generateInfosheetHtml = (infosheet: any, uiText: any): string => {
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

    // Helper: Generate infosheet using WordPress Ultimate Shortcode [su_table]
    const generateInfosheetShortcode = (infosheet: any, uiText: any): string => {
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
        tableHtml += `[su_table responsive="yes"]\n`;
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
        tableHtml += `</tbody>\n</table>\n[/su_table]\n\n`;
        
        return tableHtml;
    };

    // Clean HTML copy for WordPress using Ultimate Shortcode plugin
    const handleCopyCleanHtml = useCallback(() => {
        if (!generatedArticle) return;

        const uiText = getUiText(config.language);

        let html = `<!-- Article Content - WordPress Ultimate Shortcode Format -->\n`;
        html += generatedArticle.intro + '\n\n';
        
        // Platform quick list
        html += `<h2>${uiText.platformOverview}</h2>\n<ol>\n`;
        generatedArticle.platformQuickList.forEach(p => {
            html += `<li><strong>${p.name}</strong> - ${p.shortDescription}</li>\n`;
        });
        html += `</ol>\n\n`;

        // Comparison table using [su_table]
        if (generatedArticle.comparisonTable.length > 0) {
            html += `<h2>${uiText.platformComparison}</h2>\n`;
            html += `[su_table responsive="yes"]\n`;
            html += `<table>\n<thead>\n<tr><th>${uiText.tablePlatform}</th><th>${uiText.tableLicense}</th><th>${uiText.tableMinDeposit}</th><th>${uiText.tablePayoutSpeed}</th><th>${uiText.tableRating}</th></tr>\n</thead>\n<tbody>\n`;
            generatedArticle.comparisonTable.forEach(row => {
                html += `<tr><td>${row.platformName}</td><td>${row.license}</td><td>${row.minDeposit}</td><td>${row.payoutSpeed}</td><td>${row.rating}</td></tr>\n`;
            });
            html += `</tbody>\n</table>\n[/su_table]\n\n`;
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
            
            // Infosheet using [su_table]
            if (config.includeSections.platformInfosheet) {
                html += generateInfosheetShortcode(review.infosheet, uiText);
            }
            
            // Pros and Cons using [su_row][su_column]
            if (config.includeSections.prosCons) {
                html += `[su_row]\n`;
                html += `[su_column size="1/2"]\n`;
                html += `<h4 style="color: #166534;">✓ ${uiText.pros}</h4>\n`;
                html += `<ul>\n`;
                review.pros.forEach(p => {
                    html += `<li><span style="color: #22c55e;">✓</span> ${p}</li>\n`;
                });
                html += `</ul>\n`;
                html += `[/su_column]\n`;
                html += `[su_column size="1/2"]\n`;
                html += `<h4 style="color: #991b1b;">✗ ${uiText.cons}</h4>\n`;
                html += `<ul>\n`;
                review.cons.forEach(c => {
                    html += `<li><span style="color: #ef4444;">✗</span> ${c}</li>\n`;
                });
                html += `</ul>\n`;
                html += `[/su_column]\n`;
                html += `[/su_row]\n\n`;
            }
            
            // Verdict using [su_highlight]
            if (config.includeSections.verdict) {
                html += `<h3>${uiText.ourVerdict}</h3>\n`;
                html += `[su_highlight background="#f3f4f6" color="#111827"]\n`;
                html += `${review.verdict}\n`;
                html += `[/su_highlight]\n\n`;
            }
            
            // CTA Button using [su_button]
            if (review.affiliateUrl) {
                html += `[su_button url="${review.affiliateUrl}" target="blank" style="flat" background="#22c55e" color="#ffffff" size="6" center="yes" radius="5"]${uiText.visitPlatformCta(review.platformName)}[/su_button]\n\n`;
            }
        });

        // Scoring Methodology Section (before FAQs) using [su_table]
        html += `<h2>Our Rating Methodology</h2>\n`;
        html += `<p>We evaluate each platform across six key categories, with scores from 1-10:</p>\n`;
        html += `[su_table responsive="yes"]\n`;
        html += `<table>\n<thead>\n<tr><th>Score</th><th>Meaning</th><th>Criteria</th></tr>\n</thead>\n<tbody>\n`;
        html += `<tr><td>9-10</td><td>Exceptional</td><td>Industry-leading, verified by multiple sources</td></tr>\n`;
        html += `<tr><td>8</td><td>Excellent</td><td>Top-tier with minor room for improvement</td></tr>\n`;
        html += `<tr><td>7</td><td>Very Good</td><td>Above average, meets high standards</td></tr>\n`;
        html += `<tr><td>6</td><td>Good</td><td>Solid, meets expectations</td></tr>\n`;
        html += `<tr><td>5</td><td>Adequate</td><td>Acceptable but has gaps</td></tr>\n`;
        html += `<tr><td>1-4</td><td>Below Average</td><td>Significant issues noted</td></tr>\n`;
        html += `</tbody>\n</table>\n[/su_table]\n`;
        html += `<p><strong>Star Rating Aggregation:</strong> The overall star rating (1-5 stars) is calculated by averaging all six category scores: 9.0-10 = ⭐⭐⭐⭐⭐ | 7.5-8.9 = ⭐⭐⭐⭐ | 6.0-7.4 = ⭐⭐⭐ | 4.5-5.9 = ⭐⭐ | Below 4.5 = ⭐</p>\n\n`;

        // FAQs using [Q1][A1] format
        if (generatedArticle.faqs.length > 0) {
            html += `<h2>${uiText.frequentlyAskedQuestions}</h2>\n`;
            generatedArticle.faqs.forEach((faq, index) => {
                const num = index + 1;
                html += `[Q${num}]${faq.question}[/Q${num}]\n`;
                html += `[A${num}]${faq.answer}[/A${num}]\n`;
            });
            html += `\n`;
        }

        // Responsible Gambling Disclaimer using [su_note]
        if (config.includeResponsibleGamblingDisclaimer) {
            const disclaimerText = config.responsibleGamblingDisclaimerText || 
                'Gambling involves risk and should be done responsibly. Please only gamble with money you can afford to lose. If you or someone you know has a gambling problem, please seek help from professional organizations. Many jurisdictions have support services available 24/7. You must be of legal gambling age in your jurisdiction to participate in online gambling activities.';
            html += `[su_note note_color="#fef3c7" text_color="#78350f"]\n`;
            html += `<strong>⚠️ Responsible Gambling</strong>\n`;
            html += `${disclaimerText}\n`;
            html += `[/su_note]\n`;
        }

        navigator.clipboard.writeText(html);
    }, [generatedArticle, config.language, config.includeResponsibleGamblingDisclaimer, config.responsibleGamblingDisclaimerText, config.includeSections, generateInfosheetShortcode]);

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
                articleContent += generateInfosheetHtml(review.infosheet, uiText);
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

        // Responsible Gambling Disclaimer
        if (config.includeResponsibleGamblingDisclaimer) {
            const disclaimerText = config.responsibleGamblingDisclaimerText || 
                'Gambling involves risk and should be done responsibly. Please only gamble with money you can afford to lose.';
            articleContent += `<div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">`;
            articleContent += `<h3 style="color: #92400e;">⚠️ Responsible Gambling</h3>\n`;
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
    }, [generatedArticle, config.language, config.includeSections, config.includeResponsibleGamblingDisclaimer, config.responsibleGamblingDisclaimerText, generateRatingBarHtml, generateInfosheetHtml]);

    const isLoading = workflowPhase !== 'idle' && workflowPhase !== 'completed' && workflowPhase !== 'error';
    const uiText = getUiText(config.language);

    return (
        <div className="min-h-screen bg-gray-100 text-gray-800 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-600">
                        Deep Research to Article 
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">Create comprehensive, research-backed platform reviews</p>
                </header>

                <main className="space-y-8">
                    {/* Input Form */}
                    <InputForm
                        config={config}
                        setConfig={setConfig}
                        templates={templates}
                        onSaveTemplate={handleSaveTemplate}
                        onLoadTemplate={handleLoadTemplate}
                        onDeleteTemplate={handleDeleteTemplate}
                        onSubmit={handleStartResearch}
                        isLoading={isLoading}
                        serpCompetitors={serpCompetitors}
                        serpAnalysisLoading={serpAnalysisLoading}
                        onAnalyzeSerpCompetitors={handleAnalyzeSerpCompetitors}
                    />

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Research Progress */}
                    {workflowPhase === 'researching' && platformResearch.length > 0 && (
                        <ResearchProgress 
                            platforms={platformResearch.map(p => ({ 
                                name: p.name, 
                                status: p.researchStatus 
                            }))} 
                        />
                    )}

                    {/* Loading State */}
                    {isLoading && workflowPhase !== 'researching' && (
                        <Loader message={loadingMessage || `${workflowPhase}...`} />
                    )}

                    {/* Generated Article Output */}
                    {generatedArticle && workflowPhase === 'completed' && (
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