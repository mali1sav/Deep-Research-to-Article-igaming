import React, { useState } from 'react';
import { 
    ArticleConfig, 
    Language, 
    PlatformInput, 
    IncludeSections, 
    SectionWordCounts,
    WritingModel,
    ToneOfVoice,
    InternalLink,
    TargetKeyword
} from '../types';
import { generateResponsibleGamblingDisclaimer } from '../services/platformResearchService';

// Icons
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);

interface SerpCompetitor {
    rank: number;
    domain: string;
    url: string;
    title: string;
    metaDesc: string;
    headings: string[];
}

interface InputFormProps {
    config: ArticleConfig;
    setConfig: (config: ArticleConfig) => void;
    onClearAll: () => void;
    onSubmit: () => void;
    isLoading: boolean;
    // SERP Analysis props
    serpCompetitors?: SerpCompetitor[];
    serpAnalysisLoading?: boolean;
    onAnalyzeSerpCompetitors?: (keyword: string, count: number) => void;
}

export const InputForm: React.FC<InputFormProps> = ({ 
    config, 
    setConfig, 
    onClearAll,
    onSubmit, 
    isLoading,
    serpCompetitors = [],
    serpAnalysisLoading = false,
    onAnalyzeSerpCompetitors
}) => {
    const [newPlatformName, setNewPlatformName] = useState('');
    const [settingsExpanded, setSettingsExpanded] = useState(true);
    const [newKeyword, setNewKeyword] = useState('');
    const [seoSettingsExpanded, setSeoSettingsExpanded] = useState(false);
    const [newManualKeyword, setNewManualKeyword] = useState('');
    const [newManualKeywordCount, setNewManualKeywordCount] = useState(3);
    const [newLinkAnchor, setNewLinkAnchor] = useState('');
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [advancedExpanded, setAdvancedExpanded] = useState(false);
    const [serpKeywordInput, setSerpKeywordInput] = useState('');
    const [serpResultCount, setSerpResultCount] = useState(5);
    const [serpExpanded, setSerpExpanded] = useState(true);
    const [keywordsRawInput, setKeywordsRawInput] = useState(() => 
        config.targetKeywords?.map(k => k.keyword).join('\n') || ''
    );
    const [disclaimerLoading, setDisclaimerLoading] = useState(false);

    const addPlatform = () => {
        if (newPlatformName.trim()) {
            const newPlatform: PlatformInput = { name: newPlatformName.trim() };
            setConfig({ ...config, platforms: [...config.platforms, newPlatform] });
            setNewPlatformName('');
        }
    };

    const removePlatform = (index: number) => {
        const updated = config.platforms.filter((_, i) => i !== index);
        setConfig({ ...config, platforms: updated });
    };

    const updatePlatformAffiliateUrl = (index: number, url: string) => {
        const updated = [...config.platforms];
        updated[index] = { ...updated[index], affiliateUrl: url };
        setConfig({ ...config, platforms: updated });
    };

    const updateSectionWordCount = (key: keyof SectionWordCounts, value: number) => {
        setConfig({
            ...config,
            sectionWordCounts: { ...config.sectionWordCounts, [key]: value }
        });
    };

    const updateIncludeSection = (key: keyof IncludeSections, value: boolean) => {
        setConfig({
            ...config,
            includeSections: { ...config.includeSections, [key]: value }
        });
    };

    const addKeyword = () => {
        if (newKeyword.trim()) {
            const keyword: TargetKeyword = { 
                keyword: newKeyword.trim(), 
                isPrimary: (config.targetKeywords?.length || 0) === 0 
            };
            setConfig({ 
                ...config, 
                targetKeywords: [...(config.targetKeywords || []), keyword] 
            });
            setNewKeyword('');
        }
    };

    const removeKeyword = (index: number) => {
        const updated = (config.targetKeywords || []).filter((_, i) => i !== index);
        setConfig({ ...config, targetKeywords: updated });
    };

    const togglePrimaryKeyword = (index: number) => {
        const updated = (config.targetKeywords || []).map((kw, i) => ({
            ...kw,
            isPrimary: i === index
        }));
        setConfig({ ...config, targetKeywords: updated });
    };

    const addManualSeoKeyword = () => {
        if (newManualKeyword.trim()) {
            const current = config.manualSeoSettings?.keywords || [];
            setConfig({
                ...config,
                manualSeoSettings: {
                    keywords: [...current, { keyword: newManualKeyword.trim(), count: newManualKeywordCount }]
                }
            });
            setNewManualKeyword('');
            setNewManualKeywordCount(3);
        }
    };

    const removeManualSeoKeyword = (index: number) => {
        const current = config.manualSeoSettings?.keywords || [];
        setConfig({
            ...config,
            manualSeoSettings: {
                keywords: current.filter((_, i) => i !== index)
            }
        });
    };

    const addInternalLink = () => {
        if (newLinkAnchor.trim() && newLinkUrl.trim()) {
            const link: InternalLink = { 
                anchorText: newLinkAnchor.trim(), 
                url: newLinkUrl.trim() 
            };
            setConfig({ 
                ...config, 
                internalLinks: [...(config.internalLinks || []), link] 
            });
            setNewLinkAnchor('');
            setNewLinkUrl('');
        }
    };

    const removeInternalLink = (index: number) => {
        const updated = (config.internalLinks || []).filter((_, i) => i !== index);
        setConfig({ ...config, internalLinks: updated });
    };

    const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
        <label className="flex items-center cursor-pointer">
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <div className={`block w-12 h-7 rounded-full transition ${checked ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform shadow-sm ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
            <span className="ml-3 text-sm text-gray-700">{label}</span>
        </label>
    );

    const isReviewOnlyMode = config.reviewOnlyMode || false;

    return (
        <div className="space-y-6">
            {/* Top Bar: Mode Toggle + Clear All */}
            <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center gap-4">
                    <label className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={isReviewOnlyMode}
                                onChange={(e) => setConfig({ ...config, reviewOnlyMode: e.target.checked })}
                            />
                            <div className={`block w-14 h-8 rounded-full transition ${isReviewOnlyMode ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform shadow-sm ${isReviewOnlyMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                        <span className={`ml-3 font-semibold ${isReviewOnlyMode ? 'text-orange-700' : 'text-gray-600'}`}>
                            {isReviewOnlyMode ? '🔄 Review Only Mode' : '📝 Full Article Mode'}
                        </span>
                    </label>
                </div>
                <button
                    type="button"
                    onClick={onClearAll}
                    className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition font-medium"
                >
                    🗑️ Clear All
                </button>
            </div>

            {/* Review Only Mode Warning */}
            {isReviewOnlyMode && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <span className="text-orange-500 text-xl">⚠️</span>
                        <div>
                            <h3 className="font-semibold text-orange-800 mb-1">Review Only Mode</h3>
                            <p className="text-sm text-orange-700">
                                This mode generates <strong>only platform reviews</strong>. Intro, List, Comparison Table, and FAQs will not be generated.
                                <br />
                                <span className="text-orange-600">You must manually update your List and Comparison Table sections in existing articles.</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Section 1: Article Structure and Settings - Hidden in Review Only Mode */}
            {!isReviewOnlyMode && (
            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">📝</span> Article Structure and Settings
                </h2>
                
                <div className="space-y-4">
                    {/* Narrative */}
                    <div>
                        <label htmlFor="introNarrative" className="block text-sm font-medium text-gray-700 mb-2">
                            Describe the angle/narrative for this review article
                        </label>
                        <textarea
                            id="introNarrative"
                            rows={3}
                            className="w-full bg-white border border-gray-300 rounded-md p-3 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder-gray-400"
                            placeholder="e.g., Best online casinos for Thai players in 2025, focusing on fast withdrawals and Thai Baht support..."
                            value={config.introNarrative}
                            onChange={(e) => setConfig({ ...config, introNarrative: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label htmlFor="language" className="block text-xs font-medium text-gray-700 mb-1">Language</label>
                            <select 
                                id="language" 
                                value={config.language} 
                                onChange={(e) => setConfig({ ...config, language: e.target.value as Language })}
                                className="w-full bg-white border border-gray-300 rounded-md p-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={Language.ENGLISH}>English</option>
                                <option value={Language.THAI}>Thai</option>
                                <option value={Language.VIETNAMESE}>Vietnamese</option>
                                <option value={Language.JAPANESE}>Japanese</option>
                                <option value={Language.KOREAN}>Korean</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="introWordCount" className="block text-xs font-medium text-gray-700 mb-1">Intro Words</label>
                            <input 
                                type="number" 
                                id="introWordCount" 
                                value={config.introWordCount} 
                                min="50" 
                                step="50" 
                                onChange={(e) => setConfig({ ...config, introWordCount: parseInt(e.target.value, 10) || 200 })}
                                className="w-full bg-white border border-gray-300 rounded-md p-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500" 
                            />
                        </div>
                        <div>
                            <label htmlFor="targetSectionCount" className="block text-xs font-medium text-gray-700 mb-1">Sections</label>
                            <select 
                                id="targetSectionCount" 
                                value={config.targetSectionCount || 5} 
                                onChange={(e) => setConfig({ ...config, targetSectionCount: parseInt(e.target.value, 10) })}
                                className="w-full bg-white border border-gray-300 rounded-md p-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={5}>5 (Intro, List, Comparison, Reviews, FAQs)</option>
                                <option value={6}>6 (Run SERP for AI to add sections)</option>
                                <option value={7}>7 (Run SERP for AI to add sections)</option>
                                <option value={8}>8 (Run SERP for AI to add sections)</option>
                                <option value={9}>9 (Run SERP for AI to add sections)</option>
                                <option value={10}>10 (Run SERP for AI to add sections)</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="writingModel" className="block text-xs font-medium text-gray-700 mb-1">Writing Model</label>
                            <select 
                                id="writingModel" 
                                value={config.writingModel} 
                                onChange={(e) => setConfig({ ...config, writingModel: e.target.value as WritingModel })}
                                className="w-full bg-white border border-gray-300 rounded-md p-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={WritingModel.GPT_5_2}>GPT 5.2</option>
                                <option value={WritingModel.GEMINI_2_5_PRO}>Gemini 2.5 Pro</option>
                                <option value={WritingModel.CLAUDE_SONNET_4_5}>Claude Sonnet 4.5</option>
                            </select>
                        </div>
                    </div>

                    {/* Article Structure Toggles */}
                    <div className="pt-4 border-t border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Include in article:</h3>
                        <div className="flex flex-wrap gap-x-6 gap-y-3">
                            <Toggle 
                                checked={config.includeSections.comparisonTable} 
                                onChange={(v) => updateIncludeSection('comparisonTable', v)} 
                                label="Comparison Table" 
                            />
                            <Toggle 
                                checked={config.includeSections.faqs} 
                                onChange={(v) => updateIncludeSection('faqs', v)} 
                                label="FAQs Section" 
                            />
                            <Toggle 
                                checked={config.includeResponsibleGamblingDisclaimer || false} 
                                onChange={(v) => setConfig({ ...config, includeResponsibleGamblingDisclaimer: v })} 
                                label="Responsible Gambling Disclaimer" 
                            />
                        </div>
                    </div>

                    {/* Responsible Gambling Disclaimer Customization */}
                    {config.includeResponsibleGamblingDisclaimer && (
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Disclaimer Text
                                </label>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setDisclaimerLoading(true);
                                        try {
                                            const text = await generateResponsibleGamblingDisclaimer(config.language);
                                            setConfig({ ...config, responsibleGamblingDisclaimerText: text });
                                        } catch (e) {
                                            console.error('Failed to generate disclaimer:', e);
                                        }
                                        setDisclaimerLoading(false);
                                    }}
                                    disabled={disclaimerLoading}
                                    className="px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-md font-medium transition flex items-center gap-1"
                                >
                                    {disclaimerLoading ? (
                                        <>
                                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                            </svg>
                                            Generating...
                                        </>
                                    ) : (
                                        <>✨ Auto-generate for {config.language}</>
                                    )}
                                </button>
                            </div>
                            <textarea
                                rows={3}
                                placeholder="Enter custom disclaimer text or click 'Auto-generate' to create one based on the selected language/market..."
                                value={config.responsibleGamblingDisclaimerText || ''}
                                onChange={(e) => setConfig({ ...config, responsibleGamblingDisclaimerText: e.target.value })}
                                className="w-full bg-white border border-gray-300 rounded-md p-3 text-gray-800 focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Leave empty to use default disclaimer, or customize/auto-generate for your market.
                            </p>
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* Section 2: Writing & SEO Settings */}
            <div className={`bg-white border p-6 rounded-xl shadow-lg ${isReviewOnlyMode ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-200'}`}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">✍️</span> Writing & SEO Settings
                    {isReviewOnlyMode && <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Required for Review Only</span>}
                </h2>

                {/* Language & Writing Model - shown only in Review Only mode */}
                {isReviewOnlyMode && (
                    <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
                        <div>
                            <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                            <select 
                                id="language" 
                                value={config.language} 
                                onChange={(e) => setConfig({ ...config, language: e.target.value as Language })}
                                className="w-full bg-white border border-gray-300 rounded-md p-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={Language.ENGLISH}>English</option>
                                <option value={Language.THAI}>Thai</option>
                                <option value={Language.VIETNAMESE}>Vietnamese</option>
                                <option value={Language.JAPANESE}>Japanese</option>
                                <option value={Language.KOREAN}>Korean</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="writingModel" className="block text-sm font-medium text-gray-700 mb-1">Writing Model</label>
                            <select 
                                id="writingModel" 
                                value={config.writingModel} 
                                onChange={(e) => setConfig({ ...config, writingModel: e.target.value as WritingModel })}
                                className="w-full bg-white border border-gray-300 rounded-md p-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={WritingModel.GPT_5_2}>GPT 5.2</option>
                                <option value={WritingModel.GEMINI_2_5_PRO}>Gemini 2.5 Pro</option>
                                <option value={WritingModel.CLAUDE_SONNET_4_5}>Claude Sonnet 4.5</option>
                            </select>
                        </div>
                    </div>
                )}
                
                {/* 3-column layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Left: Target Keywords */}
                    <div>
                        <label htmlFor="targetKeywords" className="block text-sm font-medium text-gray-700 mb-1">
                            🔑 Target Keywords <span className="text-gray-400 font-normal text-xs">(first = primary)</span>
                        </label>
                        <textarea
                            id="targetKeywords"
                            rows={4}
                            className="w-full h-[120px] bg-white border border-gray-300 rounded-md p-2 text-gray-800 focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="best online casino thailand&#10;thai casino 2025&#10;online gambling thailand"
                            value={keywordsRawInput}
                            onChange={(e) => {
                                const rawValue = e.target.value;
                                setKeywordsRawInput(rawValue);
                                const lines = rawValue.split('\n');
                                const keywords = lines
                                    .filter(line => line.trim())
                                    .map((line, i) => ({
                                        keyword: line.trim(),
                                        isPrimary: i === 0
                                    }));
                                setConfig({ ...config, targetKeywords: keywords });
                            }}
                        />
                    </div>

                    {/* Middle: Custom Instructions */}
                    <div>
                        <label htmlFor="customInstructions" className="block text-sm font-medium text-gray-700 mb-1">
                            Custom Instructions <span className="text-gray-400 font-normal text-xs">(optional)</span>
                        </label>
                        <textarea
                            id="customInstructions"
                            rows={4}
                            placeholder="e.g., Avoid sounding like AI. Follow local gambling advertising regulations..."
                            value={config.customInstructions || ''}
                            onChange={(e) => setConfig({ ...config, customInstructions: e.target.value })}
                            className="w-full h-[120px] bg-white border border-gray-300 rounded-md p-2 text-gray-800 focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>

                    {/* Right: Tone + Primary KW Mentions stacked */}
                    <div className="space-y-3">
                        <div>
                            <label htmlFor="toneOfVoice" className="block text-sm font-medium text-gray-700 mb-1">Tone of Voice</label>
                            <select 
                                id="toneOfVoice" 
                                value={config.toneOfVoice} 
                                onChange={(e) => setConfig({ ...config, toneOfVoice: e.target.value as ToneOfVoice })}
                                className="w-full bg-white border border-gray-300 rounded-md p-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={ToneOfVoice.PROFESSIONAL}>Professional</option>
                                <option value={ToneOfVoice.FRIENDLY}>Friendly</option>
                                <option value={ToneOfVoice.FORMAL}>Formal</option>
                                <option value={ToneOfVoice.CASUAL}>Casual</option>
                                <option value={ToneOfVoice.CUSTOM}>Custom...</option>
                            </select>
                        </div>
                        {config.toneOfVoice === ToneOfVoice.CUSTOM && (
                            <div>
                                <label htmlFor="customTone" className="block text-xs font-medium text-gray-700 mb-1">Custom Tone</label>
                                <input 
                                    type="text" 
                                    id="customTone" 
                                    placeholder="e.g., Enthusiastic but informative..."
                                    value={config.customTone || ''} 
                                    onChange={(e) => setConfig({ ...config, customTone: e.target.value })}
                                    className="w-full bg-white border border-gray-300 rounded-md p-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}
                        <div>
                            <label htmlFor="primaryKeywordCount" className="block text-sm font-medium text-gray-700 mb-1">Primary KW Mentions</label>
                            <input
                                type="number"
                                id="primaryKeywordCount"
                                min="1"
                                max="50"
                                value={config.primaryKeywordCount || 15}
                                onChange={(e) => setConfig({ ...config, primaryKeywordCount: parseInt(e.target.value) || 15 })}
                                className="w-full bg-white border border-gray-300 rounded-md p-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Times to mention primary keyword</p>
                        </div>
                    </div>
                </div>

                {/* Internal Links - bottom of section */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">🔗 Internal Links</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Anchor text..."
                            value={newLinkAnchor}
                            onChange={(e) => setNewLinkAnchor(e.target.value)}
                            className="flex-1 bg-white border border-gray-300 rounded-md p-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="text"
                            placeholder="URL..."
                            value={newLinkUrl}
                            onChange={(e) => setNewLinkUrl(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addInternalLink()}
                            className="flex-1 bg-white border border-gray-300 rounded-md p-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="button"
                            onClick={addInternalLink}
                            aria-label="Add internal link"
                            title="Add internal link"
                            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition flex items-center"
                        >
                            <PlusIcon />
                        </button>
                    </div>

                    {(config.internalLinks?.length || 0) > 0 && (
                        <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-200">
                            {config.internalLinks?.map((link, index) => (
                                <div key={index} className="flex items-center justify-between p-2">
                                    <div className="flex-1 text-sm">
                                        <span className="font-medium text-blue-600">{link.anchorText}</span>
                                        <span className="mx-2 text-gray-400">→</span>
                                        <span className="text-gray-500 truncate">{link.url}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeInternalLink(index)}
                                        aria-label="Remove link"
                                        title="Remove link"
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Links inserted where anchor text appears naturally.</p>
                </div>
            </div>

            {/* Section 5: Platforms to Review (with Review Settings) */}
            <div className={`bg-white border p-6 rounded-xl shadow-lg ${isReviewOnlyMode ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-200'}`}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">🎰</span> Platforms to Review
                    {isReviewOnlyMode && <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Required for Review Only</span>}
                </h2>

                <div className="space-y-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Add platform name..."
                            value={newPlatformName}
                            onChange={(e) => setNewPlatformName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addPlatform()}
                            className="flex-1 bg-white border border-gray-300 rounded-md p-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="button"
                            onClick={addPlatform}
                            aria-label="Add platform"
                            title="Add platform"
                            className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition flex items-center"
                        >
                            <PlusIcon />
                        </button>
                    </div>

                    {config.platforms.length > 0 && (
                        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                            {config.platforms.map((platform, index) => (
                                <div key={index} className="flex items-center gap-3 p-3">
                                    <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>
                                    <span className="font-medium text-gray-900 min-w-[120px]">{platform.name}</span>
                                    <input
                                        type="text"
                                        placeholder="Affiliate URL (optional)"
                                        value={platform.affiliateUrl || ''}
                                        onChange={(e) => updatePlatformAffiliateUrl(index, e.target.value)}
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-md p-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removePlatform(index)}
                                        aria-label={`Remove ${platform.name}`}
                                        title={`Remove ${platform.name}`}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-md transition"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {config.platforms.length === 0 && (
                        <p className="text-sm text-gray-500 italic">No platforms added yet. Recommended: 5-7 platforms for best results.</p>
                    )}

                    <p className="text-xs text-blue-600 flex items-center">
                        💡 Recommended: <strong className="mx-1">5-7 platforms</strong> for useful comparison tables. Fewer = weak comparison. More = slower processing.
                    </p>
                </div>

                {/* Review Settings (collapsible within same card) */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={() => setSettingsExpanded(!settingsExpanded)}
                        className="w-full flex items-center justify-between text-left"
                    >
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                            ⚙️ Review Settings
                        </h3>
                        <div className={`transition-transform duration-200 ${settingsExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDownIcon />
                        </div>
                    </button>

                    {settingsExpanded && (
                        <div className="mt-4 space-y-4">
                            <div>
                                <h4 className="text-xs font-medium text-gray-600 mb-2">Word counts per section:</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Overview</label>
                                        <input
                                            type="number"
                                            value={config.sectionWordCounts.overview}
                                            min="50"
                                            step="25"
                                            aria-label="Overview word count"
                                            onChange={(e) => updateSectionWordCount('overview', parseInt(e.target.value, 10) || 150)}
                                            className="w-full bg-white border border-gray-300 rounded-md p-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Verdict</label>
                                        <input
                                            type="number"
                                            value={config.sectionWordCounts.verdict}
                                            min="50"
                                            step="25"
                                            aria-label="Verdict word count"
                                            onChange={(e) => updateSectionWordCount('verdict', parseInt(e.target.value, 10) || 100)}
                                            className="w-full bg-white border border-gray-300 rounded-md p-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Pros/Cons</label>
                                        <input
                                            type="number"
                                            value={config.sectionWordCounts.prosConsItems}
                                            min="3"
                                            max="10"
                                            aria-label="Pros and cons items"
                                            onChange={(e) => updateSectionWordCount('prosConsItems', parseInt(e.target.value, 10) || 5)}
                                            className="w-full bg-white border border-gray-300 rounded-md p-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-medium text-gray-600 mb-2">Include in each review:</h4>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                    <Toggle 
                                        checked={config.includeSections.platformInfosheet} 
                                        onChange={(v) => updateIncludeSection('platformInfosheet', v)} 
                                        label="Infosheet" 
                                    />
                                    <Toggle 
                                        checked={config.includeSections.prosCons} 
                                        onChange={(v) => updateIncludeSection('prosCons', v)} 
                                        label="Pros/Cons" 
                                    />
                                    <Toggle 
                                        checked={config.includeSections.verdict} 
                                        onChange={(v) => updateIncludeSection('verdict', v)} 
                                        label="Verdict" 
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* SERP Competitor Analysis Section - Hidden in Review Only mode */}
            {!isReviewOnlyMode && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <button
                    type="button"
                    onClick={() => setSerpExpanded(!serpExpanded)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                        <span className="mr-2">🔍</span> SERP Competitor Analysis
                        {serpCompetitors.length > 0 && (
                            <span className="ml-2 text-sm font-normal text-gray-500">
                                ({serpCompetitors.length} competitors analyzed)
                            </span>
                        )}
                    </h2>
                    <ChevronDownIcon />
                </button>
                
                {serpExpanded && (
                    <div className="p-4 pt-0 border-t border-gray-200">
                        <p className="text-sm text-gray-600 mb-3">
                            Analyze top 3 ranking competitors to learn from their content structure.
                        </p>
                        
                        <div className="flex gap-3 mb-4">
                            <input
                                type="text"
                                placeholder="Enter keyword to analyze"
                                value={serpKeywordInput || config.targetKeywords?.find(k => k.isPrimary)?.keyword || ''}
                                onChange={(e) => setSerpKeywordInput(e.target.value)}
                                className="flex-1 bg-white border border-gray-300 rounded-md p-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const keyword = serpKeywordInput || config.targetKeywords?.find(k => k.isPrimary)?.keyword || '';
                                    if (keyword.trim()) {
                                        onAnalyzeSerpCompetitors?.(keyword, 3);
                                    }
                                }}
                                disabled={serpAnalysisLoading || !(serpKeywordInput || config.targetKeywords?.find(k => k.isPrimary)?.keyword)}
                                className="px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-md font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {serpAnalysisLoading ? 'Analyzing...' : 'Analyze Top 3'}
                            </button>
                        </div>

                        {/* Competitor Results Table */}
                        {serpCompetitors.length > 0 && (
                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            {serpCompetitors.map((c) => (
                                                <th key={c.rank} className="border-r border-gray-200 p-3 text-left font-semibold min-w-[200px]">
                                                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                        {c.domain}
                                                    </a>
                                                    <span className="ml-1 text-gray-400 font-normal">(#{c.rank})</span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-t border-gray-200">
                                            {serpCompetitors.map((c) => (
                                                <td key={c.rank} className="border-r border-gray-200 p-3 align-top font-medium text-gray-900">
                                                    {c.title}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="border-t border-gray-200 bg-gray-50">
                                            {serpCompetitors.map((c) => (
                                                <td key={c.rank} className="border-r border-gray-200 p-3 align-top text-gray-500 text-xs">
                                                    {c.metaDesc}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="border-t border-gray-200">
                                            {serpCompetitors.map((c) => (
                                                <td key={c.rank} className="border-r border-gray-200 p-3 align-top">
                                                    <p className="text-xs text-gray-500 mb-1 font-medium">H2 Sections:</p>
                                                    <ul className="space-y-0.5">
                                                        {c.headings.map((h, j) => (
                                                            <li key={j} className="text-xs text-gray-700">• {h}</li>
                                                        ))}
                                                    </ul>
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {serpCompetitors.length === 0 && !serpAnalysisLoading && (
                            <p className="text-sm text-gray-400 italic">
                                
                            </p>
                        )}

                        {serpAnalysisLoading && (
                            <div className="flex items-center justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                <span className="ml-3 text-gray-600">Analyzing competitors...</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
            )}

            {/* Submit Button */}
            <div className="text-center">
                <button 
                    onClick={onSubmit} 
                    disabled={isLoading || config.platforms.length === 0}
                    className={`inline-flex items-center justify-center px-8 py-3 font-bold rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 ${
                        isReviewOnlyMode 
                            ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white'
                            : 'bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white'
                    }`}
                >
                    <SearchIcon />
                    <span className="ml-2">
                        {isLoading 
                            ? 'Researching...' 
                            : isReviewOnlyMode 
                                ? '🔄 Research & Generate Reviews Only'
                                : 'Research & Generate Article'
                        }
                    </span>
                </button>
                {config.platforms.length === 0 && (
                    <p className="mt-2 text-sm text-red-500">Please add at least one platform to review.</p>
                )}
            </div>
        </div>
    );
};
