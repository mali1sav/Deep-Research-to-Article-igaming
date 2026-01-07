import React from 'react';
import { SinglePlatformArticle, Language } from '../../types';
import { CitationList } from '../CitationLink';
import { getUiText } from '../../utils/uiText';

interface SinglePlatformReviewOutputProps {
    article: SinglePlatformArticle;
    language: Language;
    useShortcodes?: boolean;
    onCopyHtml?: () => void;
}

const RatingBar: React.FC<{ category: string; score: number }> = ({ category, score }) => {
    const percentage = (score / 10) * 100;
    const getColorClass = (s: number) => {
        if (s >= 8) return 'bg-green-500';
        if (s >= 6) return 'bg-yellow-500';
        if (s >= 4) return 'bg-orange-500';
        return 'bg-red-500';
    };

    return (
        <div className="flex items-center gap-3 mb-2">
            <span className="w-32 text-sm text-gray-700 truncate" title={category}>{category}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div 
                    className={`h-3 rounded-full ${getColorClass(score)} transition-all`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className="w-8 text-sm font-bold text-gray-700">{score}/10</span>
        </div>
    );
};

export const SinglePlatformReviewOutput: React.FC<SinglePlatformReviewOutputProps> = ({
    article,
    language,
    useShortcodes = true,
    onCopyHtml
}) => {
    const uiText = getUiText(language);

    // Helper to strip duplicate strong tags that repeat the H2 title
    const cleanSectionContent = (title: string, content: string): string => {
        // Remove patterns like <p><strong>Title</strong> or <strong>Title</strong> at start
        const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const patterns = [
            new RegExp(`<p>\\s*<strong>${escapedTitle}</strong>\\s*</p>`, 'gi'),
            new RegExp(`<p>\\s*<strong>${escapedTitle}</strong>`, 'gi'),
            new RegExp(`<strong>${escapedTitle}</strong>\\s*`, 'gi'),
        ];
        let cleaned = content;
        patterns.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });
        // Clean up any resulting empty <p></p> tags
        cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');
        return cleaned.trim();
    };

    const handleCopyHtml = () => {
        let html = '';
        
        // Intro (no wrapper div for cleaner output)
        html += article.intro;
        html += '\n\n';
        
        // Infosheet - localized labels
        const infosheet = article.infosheet || {};
        if (infosheet.license || infosheet.company || infosheet.yearEstablished || infosheet.minDeposit || infosheet.payoutSpeed) {
            html += `<h2>${uiText.platformInformation}</h2>\n`;
            html += `<table><tbody>\n`;
            if (infosheet.license) html += `<tr><td>${uiText.infosheetLicense}</td><td>${infosheet.license}</td></tr>\n`;
            if (infosheet.company) html += `<tr><td>${uiText.infosheetCompany}</td><td>${infosheet.company}</td></tr>\n`;
            if (infosheet.yearEstablished) html += `<tr><td>${uiText.infosheetEstablished}</td><td>${infosheet.yearEstablished}</td></tr>\n`;
            if (infosheet.minDeposit) html += `<tr><td>${uiText.infosheetMinDeposit}</td><td>${infosheet.minDeposit}</td></tr>\n`;
            if (infosheet.payoutSpeed) html += `<tr><td>${uiText.infosheetPayoutSpeed}</td><td>${infosheet.payoutSpeed}</td></tr>\n`;
            html += `</tbody></table>\n\n`;
        }
        
        // Deep-dive sections (NO rating score, clean duplicate strong tags)
        for (const section of (article.sections || [])) {
            const cleanedContent = cleanSectionContent(section.title, section.content);
            html += `<h2>${section.title}</h2>\n${cleanedContent}\n\n`;
        }
        
        // Pros & Cons with [row][column] shortcodes
        const pros = article.pros || [];
        const cons = article.cons || [];
        if (pros.length > 0 || cons.length > 0) {
            if (useShortcodes) {
                html += `[row]\n`;
                html += `  [column width="1/2"]\n`;
                html += `    <h3>${uiText.pros}</h3>\n`;
                html += `    <ul>\n`;
                pros.forEach(pro => { html += `      <li>✅ ${pro}</li>\n`; });
                html += `    </ul>\n`;
                html += `  [/column]\n\n`;
                html += `  [column width="1/2"]\n`;
                html += `    <h3>${uiText.cons}</h3>\n`;
                html += `    <ul>\n`;
                cons.forEach(con => { html += `      <li>❌ ${con}</li>\n`; });
                html += `    </ul>\n`;
                html += `  [/column]\n`;
                html += `[/row]\n\n`;
            } else {
                html += `<div class="pros-cons">\n`;
                if (pros.length > 0) {
                    html += `<h3>${uiText.pros}</h3>\n<ul>\n`;
                    pros.forEach(pro => { html += `<li>✅ ${pro}</li>\n`; });
                    html += `</ul>\n`;
                }
                if (cons.length > 0) {
                    html += `<h3>${uiText.cons}</h3>\n<ul>\n`;
                    cons.forEach(con => { html += `<li>❌ ${con}</li>\n`; });
                    html += `</ul>\n`;
                }
                html += `</div>\n\n`;
            }
        }
        
        // Verdict
        html += `<h2>${uiText.ourVerdict}</h2>\n${article.verdict}\n\n`;
        
        // FAQs with [Q1][A1] shortcodes
        const faqs = article.faqs || [];
        if (faqs.length > 0) {
            html += `<h2>${uiText.frequentlyAskedQuestions}</h2>\n\n`;
            if (useShortcodes) {
                faqs.forEach((faq, idx) => {
                    const num = idx + 1;
                    html += `[Q${num}]${faq.question}[/Q${num}]\n`;
                    // Strip HTML tags from answer for cleaner FAQ shortcode
                    const cleanAnswer = faq.answer.replace(/<[^>]*>/g, '').trim();
                    html += `[A${num}]${cleanAnswer}[/A${num}]\n\n`;
                });
            } else {
                faqs.forEach(faq => {
                    html += `<h3>${faq.question}</h3>\n${faq.answer}\n\n`;
                });
            }
        }
        
        navigator.clipboard.writeText(html.trim());
        onCopyHtml?.();
    };

    const ratings = article.ratings || [];
    const avgRating = ratings.length > 0
        ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1)
        : null;

    return (
        <div className="space-y-6">
            {/* Header with Copy Button */}
            <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                <div>
                    <h2 className="text-xl font-bold text-purple-800">
                        📝 {article.platformName} Review
                    </h2>
                    {article.seoMetadata && (
                        <p className="text-sm text-purple-600 mt-1">{article.seoMetadata.title}</p>
                    )}
                </div>
                <button
                    onClick={handleCopyHtml}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                >
                    📋 Copy for WordPress
                </button>
            </div>

            {/* SEO Metadata */}
            {article.seoMetadata && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h3 className="font-semibold text-gray-700 mb-2">🔍 SEO Metadata</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Title:</span>
                            <p className="font-medium">{article.seoMetadata.title}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Slug:</span>
                            <p className="font-medium text-blue-600">{article.seoMetadata.slug}</p>
                        </div>
                        <div className="col-span-2">
                            <span className="text-gray-500">Meta Description:</span>
                            <p className="font-medium">{article.seoMetadata.metaDescription}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Introduction */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">{uiText.introduction}</h3>
                <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: article.intro }}
                />
            </div>

            {/* Platform Info - Full width, no ratings */}
            {(article.infosheet?.license || article.infosheet?.company || article.infosheet?.yearEstablished) && (
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">📋 {uiText.platformInformation}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        {article.infosheet?.license && (
                            <div className="py-2">
                                <span className="text-gray-500 block text-xs">{uiText.infosheetLicense}</span>
                                <span className="font-medium">{article.infosheet.license}</span>
                            </div>
                        )}
                        {article.infosheet?.company && (
                            <div className="py-2">
                                <span className="text-gray-500 block text-xs">{uiText.infosheetCompany}</span>
                                <span className="font-medium">{article.infosheet.company}</span>
                            </div>
                        )}
                        {article.infosheet?.yearEstablished && (
                            <div className="py-2">
                                <span className="text-gray-500 block text-xs">{uiText.infosheetEstablished}</span>
                                <span className="font-medium">{article.infosheet.yearEstablished}</span>
                            </div>
                        )}
                        {article.infosheet?.minDeposit && (
                            <div className="py-2">
                                <span className="text-gray-500 block text-xs">{uiText.infosheetMinDeposit}</span>
                                <span className="font-medium">{article.infosheet.minDeposit}</span>
                            </div>
                        )}
                        {article.infosheet?.payoutSpeed && (
                            <div className="py-2">
                                <span className="text-gray-500 block text-xs">{uiText.infosheetPayoutSpeed}</span>
                                <span className="font-medium">{article.infosheet.payoutSpeed}</span>
                            </div>
                        )}
                        {(article.infosheet?.paymentMethods || []).length > 0 && (
                            <div className="py-2 col-span-2 md:col-span-1">
                                <span className="text-gray-500 block text-xs">{uiText.infosheetPaymentMethods}</span>
                                <span className="font-medium">
                                    {(article.infosheet.paymentMethods || []).slice(0, 4).join(', ')}
                                    {(article.infosheet.paymentMethods || []).length > 4 && '...'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Deep-dive Sections */}
            {(article.sections || []).map((section, idx) => (
                <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{section.title}</h3>
                    <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                </div>
            ))}

            {/* Pros & Cons */}
            {((article.pros || []).length > 0 || (article.cons || []).length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(article.pros || []).length > 0 && (
                        <div className="bg-green-50 p-5 rounded-xl border border-green-200">
                            <h3 className="text-lg font-semibold text-green-800 mb-3">✅ {uiText.pros}</h3>
                            <ul className="space-y-2">
                                {(article.pros || []).map((pro, idx) => (
                                    <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
                                        <span className="text-green-500 mt-0.5">•</span>
                                        {pro}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {(article.cons || []).length > 0 && (
                        <div className="bg-red-50 p-5 rounded-xl border border-red-200">
                            <h3 className="text-lg font-semibold text-red-800 mb-3">❌ {uiText.cons}</h3>
                            <ul className="space-y-2">
                                {(article.cons || []).map((con, idx) => (
                                    <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                                        <span className="text-red-500 mt-0.5">•</span>
                                        {con}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Verdict */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-200">
                <h3 className="text-lg font-semibold text-purple-800 mb-4">🏆 {uiText.ourVerdict}</h3>
                <div 
                    className="prose prose-sm max-w-none text-purple-900"
                    dangerouslySetInnerHTML={{ __html: article.verdict }}
                />
                {article.affiliateUrl && (
                    <div className="mt-4">
                        <a
                            href={article.affiliateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition"
                        >
                            Visit {article.platformName} →
                        </a>
                    </div>
                )}
            </div>

            {/* FAQs */}
            {(article.faqs || []).length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">❓ {uiText.frequentlyAskedQuestions}</h3>
                    <div className="space-y-4">
                        {(article.faqs || []).map((faq, idx) => (
                            <div key={idx} className="border-b border-gray-100 pb-4 last:border-0">
                                <h4 className="font-semibold text-gray-800 mb-2">{faq.question}</h4>
                                <div 
                                    className="text-sm text-gray-600"
                                    dangerouslySetInnerHTML={{ __html: faq.answer }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Citations */}
            {(article.allCitations || []).length > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h3 className="font-semibold text-gray-700 mb-3">📚 Sources ({(article.allCitations || []).length})</h3>
                    <CitationList citations={article.allCitations || []} />
                </div>
            )}
        </div>
    );
};
