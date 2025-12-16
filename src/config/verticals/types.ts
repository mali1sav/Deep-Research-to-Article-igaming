// Vertical Configuration Types

export type VerticalType = 'gambling' | 'crypto';

export interface InfosheetFieldDefinition {
    key: string;
    label: string;
    type: 'string' | 'array' | 'boolean';
    researchPrompt: string;  // What to ask the AI to research
    example: string;         // Example value for the AI
}

export interface ScoringCategoryDefinition {
    key: string;
    label: string;
    description: string;     // What this category measures
}

export interface VerticalConfig {
    id: VerticalType;
    name: string;
    description: string;
    
    // Platform terminology
    platformTerm: string;           // "casino" vs "exchange"
    platformTermPlural: string;     // "casinos" vs "exchanges"
    
    // Infosheet configuration
    infosheetFields: InfosheetFieldDefinition[];
    
    // Scoring categories (always 6 for consistent methodology)
    scoringCategories: ScoringCategoryDefinition[];
    
    // Research prompt customization
    researchContext: string;        // Context for the AI researcher
    searchSuffix: string;           // Added to platform name for disambiguation (e.g., "cloud mining" or "online casino")
    
    // Comparison table columns
    comparisonColumns: string[];    // Column names for comparison table
    
    // Disclaimer
    disclaimerTitle: string;
    disclaimerText: string;
    
    // CTA customization
    ctaPrefix: string;              // "Visit" or "Try"
}
