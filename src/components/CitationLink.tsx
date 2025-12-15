import React from 'react';
import { Citation } from '../types';

interface CitationLinkProps {
    citation: Citation;
    index?: number;
}

export const CitationLink: React.FC<CitationLinkProps> = ({ citation, index }) => {
    return (
        <span className="inline-flex items-center gap-1">
            {index !== undefined && (
                <sup className="text-xs text-gray-400">[{index + 1}]</sup>
            )}
            <a
                href={citation.vertexUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                title={`Source: ${citation.domain}`}
            >
                {citation.title.length > 60 ? citation.title.substring(0, 60) + '...' : citation.title}
            </a>
            <a
                href={citation.googleSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 ml-1"
                title="Search on Google (backup if link is broken)"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </a>
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
            <h4 className="text-sm font-semibold text-gray-700 mb-3">{title}</h4>
            <ul className="space-y-2">
                {citations.map((citation, index) => (
                    <li key={index} className="flex items-start gap-2">
                        <span className="text-xs text-gray-400 font-mono mt-0.5">[{index + 1}]</span>
                        <div className="flex-1">
                            <a
                                href={citation.vertexUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                            >
                                {citation.title}
                            </a>
                            <span className="text-xs text-gray-400 ml-2">({citation.domain})</span>
                            <a
                                href={citation.googleSearchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs text-gray-400 hover:text-gray-600 ml-2"
                                title="Search on Google (backup)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Google
                            </a>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export const formatCitationHtml = (citation: Citation): string => {
    return `<a href="${citation.vertexUrl}" target="_blank" rel="noopener noreferrer">${citation.title}</a> <a href="${citation.googleSearchUrl}" target="_blank" rel="noopener noreferrer" title="Google Search backup">[🔍]</a>`;
};
