import React from 'react';
import { ComparisonTableRow, Language } from '../../types';
import { getUiText } from '../../utils/uiText';

interface ComparisonTableProps {
    rows: ComparisonTableRow[];
    language: Language;
    onEdit?: () => void;
    onRegenerate?: () => void;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ rows, language, onEdit, onRegenerate }) => {
    if (rows.length === 0) return null;

    const uiText = getUiText(language);

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <span className="mr-2">📊</span> {uiText.platformComparison}
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
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{uiText.tablePlatform}</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{uiText.tableLicense}</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{uiText.tableMinDeposit}</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{uiText.tablePayoutSpeed}</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{uiText.tableRating}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {rows.map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.platformName}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{row.license}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{row.minDeposit}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{row.payoutSpeed}</td>
                                <td className="px-4 py-3 text-sm font-medium text-amber-600">{row.rating}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
