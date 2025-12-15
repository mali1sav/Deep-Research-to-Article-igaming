import React, { useState } from 'react';
import { FAQ, Language } from '../../types';
import { getUiText } from '../../utils/uiText';

const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);

interface FAQItemProps {
    faq: FAQ;
    index: number;
}

const FAQItem: React.FC<FAQItemProps> = ({ faq, index }) => {
    const [isOpen, setIsOpen] = useState(false);

    const contentId = `faq-content-${index}`;

    return (
        <div className="border-b border-gray-200 last:border-b-0">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-4 text-left hover:bg-gray-50 transition px-4"
                aria-controls={contentId}
            >
                <span className="text-sm font-medium text-gray-900 pr-4">
                    {index + 1}. {faq.question}
                </span>
                <div className={`transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDownIcon />
                </div>
            </button>
            {isOpen && (
                <div id={contentId} className="px-4 pb-4">
                    <div
                        className="prose prose-sm max-w-none text-gray-600 pl-4 border-l-2 border-blue-200"
                        dangerouslySetInnerHTML={{ __html: faq.answer }}
                    />
                </div>
            )}
        </div>
    );
};

interface FAQSectionProps {
    faqs: FAQ[];
    language: Language;
    onEdit?: () => void;
    onRegenerate?: () => void;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ faqs, language, onEdit, onRegenerate }) => {
    if (faqs.length === 0) return null;

    const uiText = getUiText(language);

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <span className="mr-2">❓</span> {uiText.frequentlyAskedQuestions}
                </h3>
                <div className="flex gap-2">
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition"
                        >
                            Edit
                        </button>
                    )}
                    {onRegenerate && (
                        <button
                            onClick={onRegenerate}
                            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition"
                        >
                            Regenerate
                        </button>
                    )}
                </div>
            </div>
            <div>
                {faqs.map((faq, index) => (
                    <FAQItem key={index} faq={faq} index={index} />
                ))}
            </div>
        </div>
    );
};
