import React, { useState } from 'react';
import { PlatformReview, PlatformInfosheet, Language } from '../../types';
import { CitationList } from '../CitationLink';
import RatingBars from './RatingBars';
import { getUiText } from '../../utils/uiText';

// Icons
const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

interface InfosheetTableProps {
    infosheet: PlatformInfosheet;
    language: Language;
}

const InfosheetTable: React.FC<InfosheetTableProps> = ({ infosheet, language }) => {
    const uiText = getUiText(language);
    
    // Format retrieval date
    const formatRetrievalDate = (isoDate?: string): string => {
        if (!isoDate) return 'N/A';
        try {
            const date = new Date(isoDate);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return isoDate;
        }
    };

    return (
    <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-1">{uiText.platformInformation}</h4>
        {/* Source attribution */}
        <p className="text-xs text-gray-500 mb-3">
            {infosheet.dataSource && <>Source: {infosheet.dataSource}</>}
            {infosheet.dataSource && infosheet.retrievedAt && <> • </>}
            {infosheet.retrievedAt && <>Last retrieved: {formatRetrievalDate(infosheet.retrievedAt)}</>}
            {!infosheet.dataSource && !infosheet.retrievedAt && <>Source information not available</>}
        </p>
        <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-200">
                <tr>
                    <td className="py-2 text-gray-500 font-medium">{uiText.infosheetLicense}</td>
                    <td className="py-2 text-gray-900">{infosheet.license}</td>
                </tr>
                <tr>
                    <td className="py-2 text-gray-500 font-medium">{uiText.infosheetCountry}</td>
                    <td className="py-2 text-gray-900">{infosheet.country}</td>
                </tr>
                <tr>
                    <td className="py-2 text-gray-500 font-medium">{uiText.infosheetCompany}</td>
                    <td className="py-2 text-gray-900">{infosheet.company}</td>
                </tr>
                <tr>
                    <td className="py-2 text-gray-500 font-medium">{uiText.infosheetEstablished}</td>
                    <td className="py-2 text-gray-900">{infosheet.yearEstablished}</td>
                </tr>
                <tr>
                    <td className="py-2 text-gray-500 font-medium">{uiText.infosheetMinDeposit}</td>
                    <td className="py-2 text-gray-900">{infosheet.minDeposit}</td>
                </tr>
                <tr>
                    <td className="py-2 text-gray-500 font-medium">{uiText.infosheetPayoutSpeed}</td>
                    <td className="py-2 text-gray-900">{infosheet.payoutSpeed}</td>
                </tr>
                <tr>
                    <td className="py-2 text-gray-500 font-medium">{uiText.infosheetCurrencies}</td>
                    <td className="py-2 text-gray-900">{infosheet.supportedCurrencies.join(', ') || 'N/A'}</td>
                </tr>
                <tr>
                    <td className="py-2 text-gray-500 font-medium">{uiText.infosheetPaymentMethods}</td>
                    <td className="py-2 text-gray-900">{infosheet.paymentMethods.join(', ') || 'N/A'}</td>
                </tr>
                <tr>
                    <td className="py-2 text-gray-500 font-medium">KYC</td>
                    <td className="py-2 text-gray-900">{infosheet.kycRequirement || 'Not specified'}</td>
                </tr>
                {/* Bonus row - highlighted */}
                <tr className="bg-yellow-50">
                    <td className="py-2 text-gray-700 font-semibold">🎁 Bonus</td>
                    <td className="py-2 text-gray-900 font-medium">{infosheet.welcomeBonus || 'Not specified'}</td>
                </tr>
            </tbody>
        </table>
    </div>
    );
};

interface ProsConsTableProps {
    pros: string[];
    cons: string[];
    language: Language;
}

const ProsConsTable: React.FC<ProsConsTableProps> = ({ pros, cons, language }) => {
    const uiText = getUiText(language);

    return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                <CheckIcon />
                <span className="ml-2">{uiText.pros}</span>
            </h4>
            <ul className="space-y-2">
                {pros.map((pro, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-900">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>{pro}</span>
                    </li>
                ))}
            </ul>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                <XIcon />
                <span className="ml-2">{uiText.cons}</span>
            </h4>
            <ul className="space-y-2">
                {cons.map((con, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-900">
                        <span className="text-red-500 mt-0.5">✗</span>
                        <span>{con}</span>
                    </li>
                ))}
            </ul>
        </div>
    </div>
    );
};

interface PlatformReviewCardProps {
    review: PlatformReview;
    language: Language;
    showInfosheet?: boolean;
    showRatings?: boolean;
    showProsCons?: boolean;
    showVerdict?: boolean;
    onEditOverview?: () => void;
    onEditVerdict?: () => void;
    onEditProsCons?: () => void;
    onRegenerateOverview?: () => void;
    onRegenerateVerdict?: () => void;
}

export const PlatformReviewCard: React.FC<PlatformReviewCardProps> = ({
    review,
    language,
    showInfosheet = true,
    showRatings = true,
    showProsCons = true,
    showVerdict = true,
    onEditOverview,
    onEditVerdict,
    onRegenerateOverview,
    onRegenerateVerdict
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const uiText = getUiText(language);

    const localizedRatings = (review.ratings || []).map(r => ({
        ...r,
        category: uiText.translateRatingCategory(r.category)
    }));

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {/* Header - Always visible */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
            >
                <h3 className="text-lg font-semibold text-gray-900">
                    {uiText.platformReviewTitle(review.platformName)}
                </h3>
                <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDownIcon />
                </div>
            </button>

            {/* Expandable Content */}
            {isExpanded && (
                <div className="border-t border-gray-200 p-6 space-y-6">
                    {/* Overview */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-md font-semibold text-gray-800">{uiText.overview}</h4>
                            <div className="flex gap-2">
                                {onEditOverview && (
                                    <button
                                        onClick={onEditOverview}
                                        className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition"
                                    >
                                        Edit
                                    </button>
                                )}
                                {onRegenerateOverview && (
                                    <button
                                        onClick={onRegenerateOverview}
                                        className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
                                    >
                                        Regenerate
                                    </button>
                                )}
                            </div>
                        </div>
                        <div 
                            className="prose prose-sm max-w-none text-gray-700"
                            dangerouslySetInnerHTML={{ __html: review.overview }}
                        />
                    </div>

                    {/* Rating Bars */}
                    {showRatings && review.ratings && review.ratings.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-4">{uiText.platformRatings}</h4>
                            <RatingBars ratings={localizedRatings} />
                        </div>
                    )}

                    {/* Infosheet */}
                    {showInfosheet && (
                        <InfosheetTable infosheet={review.infosheet} language={language} />
                    )}

                    {/* Pros/Cons */}
                    {showProsCons && (
                        <ProsConsTable pros={review.pros} cons={review.cons} language={language} />
                    )}

                    {/* Verdict */}
                    {showVerdict && (
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-md font-semibold text-gray-800">{uiText.ourVerdict}</h4>
                                <div className="flex gap-2">
                                    {onEditVerdict && (
                                        <button
                                            onClick={onEditVerdict}
                                            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition"
                                        >
                                            Edit
                                        </button>
                                    )}
                                    {onRegenerateVerdict && (
                                        <button
                                            onClick={onRegenerateVerdict}
                                            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition"
                                        >
                                            Regenerate
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div 
                                className="prose prose-sm max-w-none text-gray-900"
                                dangerouslySetInnerHTML={{ __html: review.verdict }}
                            />
                        </div>
                    )}

                    {/* CTA Button */}
                    {review.affiliateUrl && (
                        <div className="text-center pt-4">
                            <a
                                href={review.affiliateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition"
                            >
                                {uiText.visitPlatformCta(review.platformName)}
                            </a>
                        </div>
                    )}

                    {/* Citations */}
                    {review.citations.length > 0 && (
                        <CitationList citations={review.citations} title={uiText.allSources} />
                    )}
                </div>
            )}
        </div>
    );
};

export { ProsConsTable, InfosheetTable };
