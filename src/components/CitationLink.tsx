import React from 'react';
import { Citation } from '../types';

interface CitationLinkProps {
    citation: Citation;
    index?: number;
}

// Note: AI models hallucinate URLs, so we use Google Search as the primary link
// This ensures users always get working links to find the actual source
export const CitationLink: React.FC<CitationLinkProps> = ({ citation, index }) => {
    return (
        <span className="inline-flex items-center gap-1">
            {index !== undefined && (
                <sup className="text-xs text-gray-400">[{index + 1}]</sup>
            )}
            <a
                href={citation.googleSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                title={`Search Google for: ${citation.domain}`}
            >
                {citation.domain}
            </a>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
        </span>
    );
};

interface CitationListProps {
    citations: Citation[];
    title?: string;
}

export const CitationList: React.FC<CitationListProps> = ({ citations, title = "Sources" }) => {
    if (citations.length === 0) return null;

    return (
        <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
                {title}
                <span className="ml-2 text-xs font-normal text-gray-500">(click to search on Google)</span>
            </h4>
            <ul className="space-y-2">
                {citations.map((citation, index) => (
                    <li key={index} className="flex items-start gap-2">
                        <span className="text-xs text-gray-400 font-mono mt-0.5">[{index + 1}]</span>
                        <div className="flex-1 flex items-center gap-2">
                            <a
                                href={citation.googleSearchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline text-sm inline-flex items-center gap-1"
                                title={`Search Google for information from ${citation.domain}`}
                            >
                                {citation.domain}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                            <span className="text-xs text-gray-500">— {citation.title.length > 50 ? citation.title.substring(0, 50) + '...' : citation.title}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export const formatCitationHtml = (citation: Citation): string => {
    // Use Google Search URL as primary link since AI-generated URLs are often hallucinated
    return `<a href="${citation.googleSearchUrl}" target="_blank" rel="noopener noreferrer" title="Search Google for ${citation.domain}">(${citation.domain})</a>`;
};
