import React, { useState } from 'react';
import { PlatformResearch, Citation } from '../types';

interface ResearchEvidencePanelProps {
    platformResearch: PlatformResearch[];
    title?: string;
}

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth={2}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);

const ExternalLinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
);

const CitationCard: React.FC<{ citation: Citation; index: number }> = ({ citation, index }) => {
    const [isValidating, setIsValidating] = useState(false);
    const [validationStatus, setValidationStatus] = useState<'unknown' | 'valid' | 'invalid'>('unknown');

    const validateUrl = async () => {
        if (!citation.sourceUrl || citation.sourceUrl === 'N/A') {
            setValidationStatus('invalid');
            return;
        }
        
        setIsValidating(true);
        try {
            // Note: This will be blocked by CORS for most URLs
            // User will need to click the link to verify manually
            // This is just a placeholder for future server-side validation
            setValidationStatus('unknown');
        } catch {
            setValidationStatus('unknown');
        } finally {
            setIsValidating(false);
        }
    };

    const hasValidUrl = citation.sourceUrl && citation.sourceUrl !== 'N/A' && citation.sourceUrl.startsWith('http');

    return (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-400">#{index + 1}</span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {citation.domain || 'Unknown source'}
                        </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate" title={citation.title}>
                        {citation.title || 'Untitled source'}
                    </p>
                    {hasValidUrl ? (
                        <a 
                            href={citation.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline break-all"
                            title="Click to verify this source (opens in new tab)"
                        >
                            {citation.sourceUrl}
                            <ExternalLinkIcon />
                        </a>
                    ) : (
                        <span className="text-xs text-amber-600">
                            ⚠️ No direct URL - using Google search fallback
                        </span>
                    )}
                </div>
                <a
                    href={hasValidUrl ? citation.sourceUrl : citation.googleSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition shrink-0"
                    title="Verify this source"
                >
                    Verify →
                </a>
            </div>
        </div>
    );
};

const PlatformResearchCard: React.FC<{ research: PlatformResearch }> = ({ research }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showRawSummary, setShowRawSummary] = useState(false);

    const validCitations = research.citations.filter(c => c.sourceUrl || c.googleSearchUrl);
    const hasResearchData = research.rawResearchSummary && research.rawResearchSummary.length > 0;

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition text-left"
            >
                <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${
                        research.researchStatus === 'completed' ? 'bg-green-500' :
                        research.researchStatus === 'error' ? 'bg-red-500' :
                        'bg-gray-300'
                    }`} />
                    <span className="font-semibold text-gray-900">{research.name}</span>
                    <span className="text-xs text-gray-500">
                        {validCitations.length} source{validCitations.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <ChevronIcon isOpen={isExpanded} />
            </button>
            
            {isExpanded && (
                <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-4">
                    {/* Research Summary */}
                    {hasResearchData && (
                        <div>
                            <button
                                onClick={() => setShowRawSummary(!showRawSummary)}
                                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                            >
                                <span>📝 Raw Research Summary</span>
                                <ChevronIcon isOpen={showRawSummary} />
                            </button>
                            {showRawSummary && (
                                <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                                    {research.rawResearchSummary}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Key Findings */}
                    {research.keyFeatures.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">🔑 Key Findings</h4>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {research.keyFeatures.slice(0, 5).map((feature, i) => (
                                    <li key={i}>{feature}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Citations */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                            📚 Sources ({validCitations.length})
                            <span className="ml-2 text-xs font-normal text-gray-500">
                                Click to verify each source
                            </span>
                        </h4>
                        {validCitations.length > 0 ? (
                            <div className="space-y-2">
                                {validCitations.map((citation, i) => (
                                    <CitationCard key={i} citation={citation} index={i} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-amber-600">
                                ⚠️ No sources found for this platform. Research data may be unreliable.
                            </p>
                        )}
                    </div>

                    {/* Infosheet Data Source */}
                    {research.infosheet.dataSource && (
                        <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                            <strong>Data sources:</strong> {research.infosheet.dataSource}
                            {research.infosheet.retrievedAt && (
                                <span className="ml-2">
                                    (Retrieved: {new Date(research.infosheet.retrievedAt).toLocaleString()})
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const ResearchEvidencePanel: React.FC<ResearchEvidencePanelProps> = ({ 
    platformResearch,
    title = "📚 Research Evidence"
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    
    const totalCitations = platformResearch.reduce((sum, p) => sum + p.citations.length, 0);
    const completedResearch = platformResearch.filter(p => p.researchStatus === 'completed');

    if (platformResearch.length === 0) {
        return null;
    }

    return (
        <div className="bg-white border border-amber-200 rounded-xl shadow-lg overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 bg-amber-50 hover:bg-amber-100 transition"
            >
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-amber-900">{title}</h3>
                    <span className="text-sm text-amber-700">
                        {completedResearch.length} platform{completedResearch.length !== 1 ? 's' : ''} · {totalCitations} source{totalCitations !== 1 ? 's' : ''}
                    </span>
                </div>
                <ChevronIcon isOpen={isExpanded} />
            </button>

            {isExpanded && (
                <div className="p-4 space-y-3">
                    <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                        💡 <strong>Verify sources before publishing:</strong> Click each source link to confirm it exists and contains relevant information. 
                        Sources marked with ⚠️ may not have direct URLs.
                    </p>
                    
                    {platformResearch.map((research, i) => (
                        <PlatformResearchCard key={i} research={research} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ResearchEvidencePanel;
