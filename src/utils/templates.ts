import { ReviewTemplate, Language, SectionWordCounts, IncludeSections } from '../types';

const STORAGE_KEY = 'gambling-review-templates';

export const DEFAULT_SECTION_WORD_COUNTS: SectionWordCounts = {
    overview: 150,
    verdict: 100,
    prosConsItems: 5
};

export const DEFAULT_INCLUDE_SECTIONS: IncludeSections = {
    platformInfosheet: true,
    prosCons: true,
    verdict: true,
    comparisonTable: true,
    faqs: true
};

export const DEFAULT_TEMPLATE: Omit<ReviewTemplate, 'id' | 'name' | 'createdAt'> = {
    language: Language.ENGLISH,
    introWordCount: 200,
    sectionWordCounts: DEFAULT_SECTION_WORD_COUNTS,
    includeSections: DEFAULT_INCLUDE_SECTIONS
};

const generateId = (): string => {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const listTemplates = (): ReviewTemplate[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return [];
        // Filter out invalid templates
        const validLanguages = Object.values(Language);
        return parsed.filter((t: any) => 
            t && typeof t.id === 'string' && typeof t.name === 'string' &&
            validLanguages.includes(t.language)
        ) as ReviewTemplate[];
    } catch (error) {
        console.error('Failed to load templates from localStorage:', error);
        // Clear corrupted templates
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        return [];
    }
};

export const saveTemplate = (
    name: string,
    config: {
        language: Language;
        introWordCount: number;
        sectionWordCounts: SectionWordCounts;
        includeSections: IncludeSections;
    }
): ReviewTemplate => {
    const templates = listTemplates();
    
    const newTemplate: ReviewTemplate = {
        id: generateId(),
        name,
        language: config.language,
        introWordCount: config.introWordCount,
        sectionWordCounts: { ...config.sectionWordCounts },
        includeSections: { ...config.includeSections },
        createdAt: new Date().toISOString()
    };

    templates.push(newTemplate);
    
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
        console.error('Failed to save template to localStorage:', error);
    }

    return newTemplate;
};

export const loadTemplate = (id: string): ReviewTemplate | null => {
    const templates = listTemplates();
    return templates.find(t => t.id === id) || null;
};

export const deleteTemplate = (id: string): boolean => {
    const templates = listTemplates();
    const filtered = templates.filter(t => t.id !== id);
    
    if (filtered.length === templates.length) {
        return false; // Template not found
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return true;
    } catch (error) {
        console.error('Failed to delete template from localStorage:', error);
        return false;
    }
};

export const updateTemplate = (
    id: string,
    updates: Partial<Omit<ReviewTemplate, 'id' | 'createdAt'>>
): ReviewTemplate | null => {
    const templates = listTemplates();
    const index = templates.findIndex(t => t.id === id);
    
    if (index === -1) return null;

    templates[index] = {
        ...templates[index],
        ...updates
    };

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
        return templates[index];
    } catch (error) {
        console.error('Failed to update template in localStorage:', error);
        return null;
    }
};
