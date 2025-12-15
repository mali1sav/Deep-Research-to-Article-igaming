import React from 'react';

export interface RatingCategory {
    category: string;
    score: number; // 1-10
}

interface RatingBarsProps {
    ratings: RatingCategory[];
    barColor?: string;
}

const RatingBars: React.FC<RatingBarsProps> = ({ 
    ratings, 
    barColor = '#dc2626' // red-600
}) => {
    if (!ratings || ratings.length === 0) return null;

    return (
        <div className="space-y-3">
            {ratings.map((rating, index) => (
                <div key={index} className="flex items-center gap-4">
                    <span className="text-sm text-gray-700 w-48 flex-shrink-0">
                        {rating.category}
                    </span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                                width: `${rating.score * 10}%`,
                                backgroundColor: barColor
                            }}
                        />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                        {rating.score}/10
                    </span>
                </div>
            ))}
        </div>
    );
};

export default RatingBars;
