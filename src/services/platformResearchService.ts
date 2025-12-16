import { GoogleGenAI, Type } from "@google/genai";
import { 
    PlatformResearch, 
    PlatformInfosheet, 
    Citation, 
    ArticleConfig,
    PlatformReview,
    ComparisonTableRow,
    FAQ,
    GeneratedArticle,
    Language,
    RatingCategory,
    WritingModel,
    SeoMode,
    ToneOfVoice,
    TargetKeyword,
    AdditionalSection,
    VerticalType
} from '../types';
import { getVerticalConfig, VerticalConfig } from '../config/verticals';

// --- API Configuration ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';

// Gemini for content generation (intro, reviews, FAQs)
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const textModel = 'gemini-2.5-flash';

// OpenRouter Deep Research for platform research (better web search)
const OPENROUTER_MODEL = 'alibaba/tongyi-deepresearch-30b-a3b';

// --- Retry Helper with Exponential Backoff ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 2000
): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            const message = String(error?.message || '');
            const lower = message.toLowerCase();
            const isRetryable =
                               message.includes('503') || 
                               lower.includes('overloaded') ||
                               lower.includes('unavailable') ||
                               lower.includes('rate limit') ||
                               lower.includes('econnreset') ||
                               lower.includes('connection reset') ||
                               lower.includes('incomplete envelope') ||
                               lower.includes('protocol error') ||
                               lower.includes('networkerror') ||
                               lower.includes('failed to fetch');
            
            if (!isRetryable || attempt === maxRetries) {
                throw error;
            }
            
            const delayMs = baseDelayMs * Math.pow(2, attempt);
            console.warn(`API call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delayMs}ms...`, error.message);
            await sleep(delayMs);
        }
    }
    
    throw lastError;
}

// --- Helper to parse JSON from AI response ---
const parseJsonResponse = <T,>(text: string | undefined): T => {
    if (!text || text.trim() === '') {
        throw new Error("The AI returned an empty response.");
    }
    try {
        // Try to find JSON in the response
        const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as T;
        }
        const cleanedText = text.replace(/^```json\s*|```$/g, '').trim();
        return JSON.parse(cleanedText) as T;
    } catch (error: any) {
        console.error("Failed to parse JSON response:", text);
        throw new Error(`Invalid JSON format: ${error.message}`);
    }
};

// --- OpenRouter API Helper ---
interface OpenRouterMessage {
    role: 'user' | 'assistant';
    content: string;
    reasoning_details?: any;
}

async function callOpenRouterDeepResearch(messages: OpenRouterMessage[]): Promise<{ content: string; reasoning_details?: any }> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "Gambling Platform Research"
        },
        body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: messages,
            reasoning: { enabled: true },
            // Force AtlasCloud provider for better uptime (reduces 503 errors)
            provider: {
                order: ["atlas-cloud"],
                allow_fallbacks: true  // Allow fallback to other providers if AtlasCloud is unavailable
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.choices[0].message;
}

// --- Citation Helper Functions ---
export const buildGoogleSearchUrl = (title: string): string => {
    const encodedQuery = encodeURIComponent(title);
    return `https://www.google.com/search?q=${encodedQuery}`;
};

const tryGetDomainFromUrl = (url: string): string | null => {
    try {
        const parsed = new URL(url);
        return parsed.hostname;
    } catch {
        return null;
    }
};

const isProbablyUrl = (value: string): boolean => {
    const v = value.trim().toLowerCase();
    return v.startsWith('http://') || v.startsWith('https://');
};

export const extractCitationsFromSources = (sources: string[]): Citation[] => {
    return sources
        .map(s => String(s || '').trim())
        .filter(Boolean)
        .map(source => {
            if (isProbablyUrl(source)) {
                // Extract domain without www
                let domain = tryGetDomainFromUrl(source) || 'source';
                domain = domain.replace(/^www\./, '');
                return {
                    title: source,
                    sourceUrl: source,
                    googleSearchUrl: buildGoogleSearchUrl(source),
                    domain
                };
            }

            // Non-URL source - use Google search as fallback
            return {
                title: source,
                sourceUrl: buildGoogleSearchUrl(source),
                googleSearchUrl: buildGoogleSearchUrl(source),
                domain: 'research'
            };
        });
};

export const deduplicateCitations = (citations: Citation[]): Citation[] => {
    const seen = new Set<string>();
    return citations.filter(c => {
        // Deduplicate by domain to ensure each source appears only once
        const key = c.domain.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const getLanguageInstruction = (
    language: Language,
    scope: 'introduction' | 'quickList' | 'comparison' | 'review' | 'faqs'
): string => {
    const labelByLanguage: Record<Language, string> = {
        [Language.ENGLISH]: 'English',
        [Language.THAI]: 'Thai',
        [Language.VIETNAMESE]: 'Vietnamese',
        [Language.JAPANESE]: 'Japanese',
        [Language.KOREAN]: 'Korean'
    };

    const label = labelByLanguage[language] || 'English';

    if (scope === 'introduction') return `Write the introduction in ${label} language.`;
    if (scope === 'quickList') return `Write the platform overview list in ${label} language.`;
    if (scope === 'comparison') return `Write the comparison output text in ${label} language.`;
    if (scope === 'faqs') return `Write all FAQs in ${label} language.`;
    return `Write all content in ${label} language.`;
};

const buildCitationsIndexBlock = (citations: Citation[]): string => {
    if (!citations || citations.length === 0) return 'No citations provided.';
    return citations
        .map((c, i) => `${i + 1}. ${c.domain} - ${c.sourceUrl}`)
        .join('\n');
};

const IN_TEXT_CITATION_RULES_HTML = `
**Citation Format:**
- Add in-text citations INSIDE paragraphs (not in a separate list)
- Use format: <a href="FULL_URL" target="_blank" rel="noopener noreferrer">(domain.com)</a>
- Example: Licensed by Curacao eGaming <a href="https://curacaoegaming.lc/verify" target="_blank" rel="noopener noreferrer">(curacaoegaming.lc)</a>
- Each source should appear ONLY ONCE in the entire article
- Only cite credibility-important info (licenses, company details, bonuses) - NOT generic knowledge
- Use ONLY the URLs from the citations index below
`;

// --- Tone, SEO, and Keyword Helpers ---
const getToneInstruction = (config: ArticleConfig): string => {
    const toneDescriptions: Record<ToneOfVoice, string> = {
        [ToneOfVoice.PROFESSIONAL]: 'Write in a professional, authoritative tone. Be informative and trustworthy.',
        [ToneOfVoice.FRIENDLY]: 'Write in a friendly, approachable tone. Be warm and conversational while still being informative.',
        [ToneOfVoice.FORMAL]: 'Write in a formal, academic tone. Use proper grammar and avoid colloquialisms.',
        [ToneOfVoice.CASUAL]: 'Write in a casual, relaxed tone. Be conversational and use everyday language.',
        [ToneOfVoice.CUSTOM]: config.customTone ? `Write in this tone: ${config.customTone}` : 'Write in a professional tone.'
    };
    return toneDescriptions[config.toneOfVoice] || toneDescriptions[ToneOfVoice.PROFESSIONAL];
};

const getKeywordsInstruction = (config: ArticleConfig): string => {
    if (!config.targetKeywords || config.targetKeywords.length === 0) return '';
    
    const primary = config.targetKeywords.find(k => k.isPrimary);
    const secondary = config.targetKeywords.filter(k => !k.isPrimary);
    
    let instruction = '\n**Target Keywords:**\n';
    if (primary) {
        instruction += `- Primary keyword: "${primary.keyword}" - use this naturally 3-5 times throughout the content.\n`;
    }
    if (secondary.length > 0) {
        instruction += `- Secondary keywords: ${secondary.map(k => `"${k.keyword}"`).join(', ')} - incorporate these naturally where relevant.\n`;
    }
    instruction += 'Integrate keywords naturally without keyword stuffing.\n';
    return instruction;
};

const getSeoInstruction = (config: ArticleConfig): string => {
    if (config.seoMode === SeoMode.DEFAULT) {
        return 'Follow standard SEO best practices: use descriptive headings, natural keyword placement, and engaging meta-friendly content.';
    }
    
    if (config.seoMode === SeoMode.AI_POWERED) {
        return 'Optimize for SEO using AI best practices: ensure keyword density is optimal, use semantic variations, include relevant LSI keywords, and structure content for featured snippets.';
    }
    
    if (config.seoMode === SeoMode.MANUAL && config.manualSeoSettings?.keywords?.length) {
        const keywordRules = config.manualSeoSettings.keywords
            .map(k => `- "${k.keyword}": exactly ${k.count} times`)
            .join('\n');
        return `**Manual SEO Requirements:**\nInclude these keywords with the specified frequency:\n${keywordRules}\nDistribute keywords naturally throughout the content.`;
    }
    
    return '';
};

const getWritingModelName = (model: WritingModel): string => {
    return model; // The enum value is already the OpenRouter model name
};

const getCustomInstructions = (config: ArticleConfig): string => {
    if (!config.customInstructions?.trim()) return '';
    return `\n**Custom Instructions:**\n${config.customInstructions.trim()}\n`;
};

const getInternalLinksInstruction = (config: ArticleConfig): string => {
    if (!config.internalLinks || config.internalLinks.length === 0) return '';
    const linksList = config.internalLinks
        .map(l => `- "${l.anchorText}" → ${l.url}`)
        .join('\n');
    return `\n**Internal Links to Insert (MAXIMUM 1 TIME EACH):**
Insert each internal link ONLY ONCE in the ENTIRE article. After using a link once, do NOT link that anchor text again - just use plain text.
${linksList}
Use format: <a href="URL">anchor text</a>
IMPORTANT: Each link should appear exactly 1 time total across all sections.\n`;
};

const buildCitationAnchor = (citation: Citation): string => {
    return `<a href="${citation.sourceUrl}" target="_blank" rel="noopener noreferrer">(${citation.domain})</a>`;
};

const ensureInTextCitations = (html: string, citations: Citation[], minCount: number): string => {
    if (!html) return html;
    if (!citations || citations.length === 0) return html;

    const linkCount = (html.match(/<a\s+[^>]*href=/gi) || []).length;
    if (linkCount >= minCount) return html;

    const needed = Math.min(citations.length, minCount - linkCount);
    const anchors = Array.from({ length: needed }, (_, i) => buildCitationAnchor(citations[i])).join(' ');
    if (!anchors) return html;

    // Prefer to place citations inside the last paragraph tag when possible.
    const lastParagraphClose = html.lastIndexOf('</p>');
    if (lastParagraphClose !== -1) {
        return `${html.slice(0, lastParagraphClose)} ${anchors}${html.slice(lastParagraphClose)}`;
    }

    return `${html} ${anchors}`;
};

const buildFallbackProsFromInfosheet = (research: PlatformResearch, language: Language): string[] => {
    const infosheet = research.infosheet;
    const pros: string[] = [];

    const hasValue = (v: string | undefined) => {
        const s = String(v || '').trim();
        if (!s) return false;
        const lower = s.toLowerCase();
        return lower !== 'unknown' && lower !== 'not publicly disclosed' && lower !== 'research failed';
    };

    const t = (english: string, thai: string, vi: string, ja: string, ko: string) => {
        if (language === Language.THAI) return thai;
        if (language === Language.VIETNAMESE) return vi;
        if (language === Language.JAPANESE) return ja;
        if (language === Language.KOREAN) return ko;
        return english;
    };

    if (hasValue(infosheet.license)) {
        pros.push(t(
            `Licensed by ${infosheet.license}.`,
            `ได้รับใบอนุญาตจาก ${infosheet.license}.`,
            `Được cấp phép bởi ${infosheet.license}.`,
            `${infosheet.license} のライセンスを取得しています。`,
            `${infosheet.license} 라이선스를 보유하고 있습니다.`
        ));
    }

    if (Array.isArray(infosheet.paymentMethods) && infosheet.paymentMethods.length > 0) {
        pros.push(t(
            `Supports multiple payment methods (e.g., ${infosheet.paymentMethods.slice(0, 3).join(', ')}).`,
            `รองรับวิธีชำระเงินหลายรูปแบบ (เช่น ${infosheet.paymentMethods.slice(0, 3).join(', ')}).`,
            `Hỗ trợ nhiều phương thức thanh toán (ví dụ: ${infosheet.paymentMethods.slice(0, 3).join(', ')}).`,
            `複数の決済方法に対応（例：${infosheet.paymentMethods.slice(0, 3).join(', ')}）。`,
            `여러 결제 수단을 지원합니다(예: ${infosheet.paymentMethods.slice(0, 3).join(', ')}).`
        ));
    }

    if (Array.isArray(infosheet.supportedCurrencies) && infosheet.supportedCurrencies.length > 0) {
        pros.push(t(
            `Supports several currencies (e.g., ${infosheet.supportedCurrencies.slice(0, 3).join(', ')}).`,
            `รองรับหลายสกุลเงิน (เช่น ${infosheet.supportedCurrencies.slice(0, 3).join(', ')}).`,
            `Hỗ trợ nhiều loại tiền tệ (ví dụ: ${infosheet.supportedCurrencies.slice(0, 3).join(', ')}).`,
            `複数通貨に対応（例：${infosheet.supportedCurrencies.slice(0, 3).join(', ')}）。`,
            `여러 통화를 지원합니다(예: ${infosheet.supportedCurrencies.slice(0, 3).join(', ')}).`
        ));
    }

    if (hasValue(infosheet.payoutSpeed)) {
        pros.push(t(
            `Clear payout timeframe: ${infosheet.payoutSpeed}.`,
            `มีกรอบเวลาการถอนที่ชัดเจน: ${infosheet.payoutSpeed}.`,
            `Thời gian rút tiền rõ ràng: ${infosheet.payoutSpeed}.`,
            `出金目安が明確：${infosheet.payoutSpeed}。`,
            `출금 소요 시간이 비교적 명확합니다: ${infosheet.payoutSpeed}.`
        ));
    }

    return pros;
};

// --- Platform Research Functions (Using OpenRouter Deep Research) ---

interface ResearchResponse {
    shortDescription: string;
    infosheet: PlatformInfosheet;
    keyFeatures: string[];
    pros: string[];
    cons: string[];
    sources: string[];
}

// Generate research prompt dynamically based on vertical config
const buildResearchPrompt = (platformName: string, verticalConfig: VerticalConfig): string => {
    const fieldsList = verticalConfig.infosheetFields
        .map((field, idx) => `${idx + 1}. **${field.label}**: ${field.researchPrompt} (e.g., "${field.example}")`)
        .join('\n');
    
    const infosheetJson = verticalConfig.infosheetFields
        .map(field => `        "${field.key}": ${field.type === 'array' ? '["..."]' : '"..."'}`)
        .join(',\n');

    return `${verticalConfig.researchContext} "${platformName}" and provide comprehensive, factual information.

Find and report REAL DATA for:
${fieldsList}
${verticalConfig.infosheetFields.length + 1}. **Key Features**: 3-5 notable features of this ${verticalConfig.platformTerm}
${verticalConfig.infosheetFields.length + 2}. **Pros**: Genuine advantages based on user reviews (3-6 items)
${verticalConfig.infosheetFields.length + 3}. **Cons**: Genuine disadvantages based on user reviews (2-5 items)

IMPORTANT:
- Search thoroughly and provide actual data you find
- If you cannot find specific information, state "Not publicly disclosed"
- Include FULL SOURCE URLs where you found the information (not search URLs)

CITATION RULES:
- Provide actual source page URLs (e.g., https://example.com/page)
- Only cite credibility-important info - NOT generic knowledge
- Maximum 3-5 high-quality sources per ${verticalConfig.platformTerm}

Format your response as JSON:
{
    "shortDescription": "1-2 sentence description",
    "infosheet": {
${infosheetJson}
    },
    "keyFeatures": ["..."],
    "pros": ["..."],
    "cons": ["..."],
    "sources": ["https://full-url-to-source-page.com/path"]
}`;
};

export const researchPlatform = async (platformName: string, vertical: VerticalType = 'gambling'): Promise<PlatformResearch> => {
    const verticalConfig = getVerticalConfig(vertical);
    const prompt = buildResearchPrompt(platformName, verticalConfig);

    try {
        // First call - initial research
        const response1 = await callOpenRouterDeepResearch([
            { role: 'user', content: prompt }
        ]);

        // Second call - verify and fill gaps
        const verifyPrompt = `Please verify the information above is accurate. If any fields show "Unknown" or "Not publicly disclosed", try harder to find the actual data. Provide your final verified JSON response.`;

        const response2 = await callOpenRouterDeepResearch([
            { role: 'user', content: prompt },
            { 
                role: 'assistant', 
                content: response1.content,
                reasoning_details: response1.reasoning_details
            },
            { role: 'user', content: verifyPrompt }
        ]);

        const parsed = parseJsonResponse<ResearchResponse>(response2.content);
        const citations = extractCitationsFromSources(parsed.sources || []);
        
        // Extract source domains for attribution
        const sourceDomains = (parsed.sources || [])
            .map(s => {
                try {
                    const url = new URL(s.startsWith('http') ? s : `https://${s}`);
                    return url.hostname.replace('www.', '');
                } catch {
                    return s;
                }
            })
            .filter((v, i, a) => a.indexOf(v) === i) // unique
            .slice(0, 3) // max 3 sources
            .join(', ');
        
        // Add source attribution to infosheet
        const infosheet = parsed.infosheet || {
            license: 'Not publicly disclosed',
            country: 'Not publicly disclosed',
            company: 'Not publicly disclosed',
            yearEstablished: 'Not publicly disclosed',
            minDeposit: 'Not publicly disclosed',
            payoutSpeed: 'Not publicly disclosed',
            supportedCurrencies: [],
            paymentMethods: []
        };
        infosheet.dataSource = sourceDomains || 'Research sources';
        infosheet.retrievedAt = new Date().toISOString();

        return {
            name: platformName,
            shortDescription: parsed.shortDescription || '',
            infosheet,
            keyFeatures: parsed.keyFeatures || [],
            pros: parsed.pros || [],
            cons: parsed.cons || [],
            rawResearchSummary: response2.content,
            citations,
            researchStatus: 'completed'
        };
    } catch (error: any) {
        console.error(`Research failed for ${platformName}:`, error);
        return {
            name: platformName,
            shortDescription: '',
            infosheet: {
                license: 'Research failed',
                country: 'Research failed',
                company: 'Research failed',
                yearEstablished: 'Research failed',
                minDeposit: 'Research failed',
                payoutSpeed: 'Research failed',
                supportedCurrencies: [],
                paymentMethods: [],
                dataSource: 'Research failed',
                retrievedAt: new Date().toISOString()
            },
            keyFeatures: [],
            pros: [],
            cons: [],
            rawResearchSummary: '',
            citations: [],
            researchStatus: 'error',
            error: error.message
        };
    }
};

/**
 * Research platforms with controlled concurrency to avoid API overload.
 * Processes in batches of 3 with delays between batches.
 * Recommended: 5-7 platforms for best balance of comparison quality and stability.
 */
export const researchAllPlatforms = async (
    platformNames: string[],
    vertical: VerticalType = 'gambling',
    onProgress?: (completed: number, total: number, platformName: string) => void
): Promise<PlatformResearch[]> => {
    const total = platformNames.length;
    let completed = 0;
    const results: PlatformResearch[] = [];
    
    // Process in batches of 3 to avoid API overload
    const BATCH_SIZE = 3;
    const BATCH_DELAY_MS = 2000; // 2 second delay between batches
    
    for (let i = 0; i < platformNames.length; i += BATCH_SIZE) {
        const batch = platformNames.slice(i, i + BATCH_SIZE);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (name) => {
            const result = await researchPlatform(name, vertical);
            completed++;
            onProgress?.(completed, total, name);
            return result;
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Add delay between batches (except for the last batch)
        if (i + BATCH_SIZE < platformNames.length) {
            await sleep(BATCH_DELAY_MS);
        }
    }
    
    return results;
};

// --- Content Generation Functions ---

export const generateIntroduction = async (
    config: ArticleConfig,
    platformQuickList: { name: string; shortDescription: string }[],
    allCitations: Citation[]
): Promise<string> => {
    const platformList = platformQuickList.map(p => `- ${p.name}: ${p.shortDescription}`).join('\n');
    const langInstruction = getLanguageInstruction(config.language, 'introduction');
    const citationsIndex = buildCitationsIndexBlock(allCitations);

    const toneInstruction = getToneInstruction(config);
    const keywordsInstruction = getKeywordsInstruction(config);
    const seoInstruction = getSeoInstruction(config);
    const customInstructions = getCustomInstructions(config);
    const internalLinksInstruction = getInternalLinksInstruction(config);

    const prompt = `You are an impartial gambling industry analyst writing a factual introduction for a review article.

${langInstruction}

**Writing Style:** Write in an IMPARTIAL, INFORMATIVE tone. This is NOT a marketing pitch. Present information objectively and help readers understand what to expect. Avoid promotional language like "amazing", "incredible", "must-try". Instead use neutral language like "this guide examines", "we analyze", "readers will find".
${keywordsInstruction}
${seoInstruction}
${customInstructions}
${internalLinksInstruction}

${IN_TEXT_CITATION_RULES_HTML}

**Citations Index:**
${citationsIndex}

**Article Narrative/Angle:** ${config.introNarrative}

**Platforms being reviewed:**
${platformList}

**Requirements:**
- Write approximately ${config.introWordCount} words
- Set the scene and explain why readers should care about this comparison
- Mention the key criteria that will be used for evaluation (licensing, payment methods, game selection, user experience, withdrawal speed, customer support)
- Do NOT include the platform list in the introduction (that comes in a separate section)
- Include at least 2 in-text citations inside the introduction paragraphs
- Output should be HTML formatted (use <p> tags for paragraphs)`;

    const response = await withRetry(() => ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    introduction: { type: Type.STRING }
                },
                required: ["introduction"]
            }
        }
    }));

    const parsed = parseJsonResponse<{ introduction: string }>(response.text);
    return ensureInTextCitations(parsed.introduction, allCitations, 2);
};

export const generatePlatformQuickList = async (
    platformResearch: PlatformResearch[],
    language: Language,
    allCitations: Citation[]
): Promise<{ name: string; shortDescription: string }[]> => {
    const data = platformResearch.map(p => ({
        name: p.name,
        shortDescription: p.shortDescription,
        infosheet: p.infosheet,
        keyFeatures: p.keyFeatures
    }));

    const langInstruction = getLanguageInstruction(language, 'quickList');
    const citationsIndex = buildCitationsIndexBlock(allCitations);

    const prompt = `Rewrite the following platform overview blurbs in a consistent style.

${langInstruction}

${IN_TEXT_CITATION_RULES_HTML}

**Citations Index:**
${citationsIndex}

**Platform Data:**
${JSON.stringify(data, null, 2)}

Return JSON:
{
  "platformQuickList": [
    { "name": "...", "shortDescription": "..." }
  ]
}

Rules:
- Each shortDescription should be 1-2 sentences.
- Each shortDescription must include 1-2 clickable in-text citations like <a href="URL" target="_blank" rel="noopener noreferrer">[n]</a>.
- Output shortDescription as HTML (no outer <p> required).`;

    const response = await withRetry(() => ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    platformQuickList: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                shortDescription: { type: Type.STRING }
                            },
                            required: ["name", "shortDescription"]
                        }
                    }
                },
                required: ["platformQuickList"]
            }
        }
    }));

    const parsed = parseJsonResponse<{ platformQuickList: { name: string; shortDescription: string }[] }>(response.text);
    return (parsed.platformQuickList || []).map(p => ({
        ...p,
        shortDescription: ensureInTextCitations(p.shortDescription, allCitations, 1)
    }));
};

// Check if platform has valid research data
const hasValidResearchData = (research: PlatformResearch): boolean => {
    const info = research.infosheet;
    // Check if we have meaningful data (not just empty or placeholder values)
    const hasLicense = info.license && info.license !== 'Unknown' && info.license !== 'N/A';
    const hasDeposit = info.minDeposit && info.minDeposit !== 'Unknown' && info.minDeposit !== 'N/A';
    const hasPayout = info.payoutSpeed && info.payoutSpeed !== 'Unknown' && info.payoutSpeed !== 'N/A';
    const hasCitations = research.citations && research.citations.length > 0;
    
    // Platform has valid data if it has at least 2 of the key fields OR has citations
    return (hasLicense && hasDeposit) || (hasLicense && hasPayout) || hasCitations;
};

// Get "no data" message - always in English for consistency across Asian markets
const getNoDataMessage = (): string => {
    return '⚠️ Research data not available - requires manual review';
};

export const generateComparisonTable = async (
    platformResearch: PlatformResearch[],
    language: Language
): Promise<ComparisonTableRow[]> => {
    const noDataMsg = getNoDataMessage();
    
    const researchData = platformResearch.map(p => {
        const hasData = hasValidResearchData(p);
        return {
            name: p.name,
            hasResearchData: hasData,
            license: hasData ? p.infosheet.license : noDataMsg,
            minDeposit: hasData ? p.infosheet.minDeposit : noDataMsg,
            payoutSpeed: hasData ? p.infosheet.payoutSpeed : noDataMsg
        };
    });

    const langInstruction = getLanguageInstruction(language, 'comparison');

    const prompt = `Based on the following platform data, generate a comparison table with ratings.

${langInstruction}

**Platform Data:**
${JSON.stringify(researchData, null, 2)}

**STAR RATING AGGREGATION METHOD:**
The overall star rating (1-5 stars) is calculated as follows:
1. Take the average of all 6 category scores (Payment Methods, UX, Withdrawal Speed, Game Selection, Support, Bonuses)
2. Convert the 1-10 average to 1-5 stars:
   - Average 9.0-10: ⭐⭐⭐⭐⭐ (5 stars)
   - Average 7.5-8.9: ⭐⭐⭐⭐ (4 stars)
   - Average 6.0-7.4: ⭐⭐⭐ (3 stars)
   - Average 4.5-5.9: ⭐⭐ (2 stars)
   - Average below 4.5: ⭐ (1 star)

**IMPORTANT:** If a platform has "hasResearchData: false", it means the research agent could NOT retrieve information for this platform. In that case:
- Keep the "⚠️" warning messages as-is in the table
- Do NOT rate this platform (use "N/A" or "—" for rating)
- Do NOT make up or invent data for this platform

For platforms WITH valid data, provide:
- platformName: The platform name
- license: The licensing authority
- minDeposit: Minimum deposit amount
- payoutSpeed: Typical payout timeframe
- rating: Overall star rating using the aggregation method above`;

    const response = await withRetry(() => ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    rows: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                platformName: { type: Type.STRING },
                                license: { type: Type.STRING },
                                minDeposit: { type: Type.STRING },
                                payoutSpeed: { type: Type.STRING },
                                rating: { type: Type.STRING }
                            },
                            required: ["platformName", "license", "minDeposit", "payoutSpeed", "rating"]
                        }
                    }
                },
                required: ["rows"]
            }
        }
    }));

    const parsed = parseJsonResponse<{ rows: ComparisonTableRow[] }>(response.text);
    return parsed.rows;
};

export const generatePlatformReview = async (
    research: PlatformResearch,
    config: ArticleConfig,
    affiliateUrl?: string
): Promise<PlatformReview> => {
    const verticalConfig = getVerticalConfig(config.vertical || 'gambling');
    const langInstruction = getLanguageInstruction(config.language, 'review');
    const citationsIndex = buildCitationsIndexBlock(research.citations);
    const prosTarget = Math.max(3, config.sectionWordCounts.prosConsItems);
    const consMax = Math.max(1, prosTarget - 1);
    
    // Build dynamic scoring categories from vertical config
    const scoringCategoriesText = verticalConfig.scoringCategories
        .map((cat, idx) => `${idx + 1}. ${cat.label} - Score based on: ${cat.description}`)
        .join('\n');
    
    // Check if we have valid research data
    const hasData = hasValidResearchData(research);
    const noDataMsg = getNoDataMessage();

    const toneInstruction = getToneInstruction(config);
    const keywordsInstruction = getKeywordsInstruction(config);
    const seoInstruction = getSeoInstruction(config);
    const customInstructions = getCustomInstructions(config);
    const internalLinksInstruction = getInternalLinksInstruction(config);

    // If no research data, return a placeholder review indicating manual review needed
    if (!hasData) {
        return {
            platformName: research.name,
            overview: `<p><strong>${noDataMsg}</strong></p><p>The research agent was unable to retrieve comprehensive information for ${research.name}. A human editor should manually research and complete this section with accurate details about licensing, payment methods, game selection, and user experience.</p>`,
            ratings: [],
            pros: ['Information pending manual research'],
            cons: ['Research data not available'],
            verdict: `<p><strong>${noDataMsg}</strong></p><p>This platform requires manual research and verification before a proper verdict can be provided.</p>`,
            infosheet: research.infosheet,
            citations: research.citations || [],
            affiliateUrl
        };
    }

    const prompt = `You are an impartial ${verticalConfig.name.toLowerCase()} industry analyst writing a factual review for "${research.name}".

${langInstruction}

**Writing Style:** Write in an IMPARTIAL, FACTUAL tone. This is NOT a marketing pitch. Present facts objectively, acknowledge both strengths and weaknesses fairly. Avoid promotional language like "amazing", "incredible", "must-try". Instead use neutral language like "offers", "provides", "features".
${keywordsInstruction}
${seoInstruction}
${customInstructions}
${internalLinksInstruction}

${IN_TEXT_CITATION_RULES_HTML}

**Citations Index:**
${citationsIndex}

**Research Data:**
${JSON.stringify(research, null, 2)}

**SCORING METHODOLOGY (apply strictly):**
Each category is scored 1-10 based on these criteria:
- **10 (Exceptional):** Industry-leading, significantly better than competitors, verified by multiple sources
- **9 (Excellent):** Top-tier performance with minor room for improvement
- **8 (Very Good):** Above average, meets high standards with some limitations
- **7 (Good):** Solid performance, meets expectations without excelling
- **6 (Adequate):** Acceptable but has notable gaps or limitations
- **5 (Average):** Mediocre, neither good nor bad, room for improvement
- **4-1 (Below Average to Poor):** Significant issues, not recommended for this category

**Rating Categories:**
${scoringCategoriesText}

**Requirements:**
- Overview: Write approximately ${config.sectionWordCounts.overview} words as a detailed, factual overview paragraph
- Ratings: Apply the scoring methodology above strictly based on research findings
- Pros: Provide about ${prosTarget} items - must be factual, not promotional
- Cons: Provide between 1 and ${consMax} items - be honest about real drawbacks
- Verdict: Write approximately ${config.sectionWordCounts.verdict} words as a balanced conclusion

IMPORTANT: 
- Use in-text citations within paragraphs, NOT a references list at the end
- If sources conflict, use the most authoritative source (official site > review site > forum)
- Include at least 2 in-text citations in Overview and at least 1 in Verdict

Output HTML for overview and verdict (use <p> tags).`;

    const response = await withRetry(() => ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    overview: { type: Type.STRING },
                    ratings: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                category: { type: Type.STRING },
                                score: { type: Type.NUMBER }
                            },
                            required: ["category", "score"]
                        }
                    },
                    pros: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    },
                    cons: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    },
                    verdict: { type: Type.STRING }
                },
                required: ["overview", "ratings", "pros", "cons", "verdict"]
            },
            thinkingConfig: { thinkingBudget: 512 }
        }
    }));

    const parsed = parseJsonResponse<{ overview: string; ratings: RatingCategory[]; pros: string[]; cons: string[]; verdict: string }>(response.text);

    const parsedPros = Array.isArray(parsed.pros) ? parsed.pros : [];
    const parsedCons = Array.isArray(parsed.cons) ? parsed.cons : [];
    const fallbackPros = Array.isArray(research.pros) ? research.pros : [];
    const fallbackProsFromFeatures = Array.isArray(research.keyFeatures)
        ? research.keyFeatures.map(f => String(f)).filter(Boolean)
        : [];

    const fallbackProsFromInfosheet = buildFallbackProsFromInfosheet(research, config.language);

    const safePros =
        parsedPros.length > 0
            ? parsedPros
            : (
                fallbackPros.length > 0
                    ? fallbackPros
                    : (fallbackProsFromFeatures.length > 0 ? fallbackProsFromFeatures.slice(0, 3) : fallbackProsFromInfosheet)
            );

    const safeCons = safePros.length > parsedCons.length
        ? parsedCons
        : parsedCons.slice(0, Math.max(0, safePros.length - 1));

    const overviewHtml = ensureInTextCitations(parsed.overview, research.citations, 2);
    const verdictHtml = ensureInTextCitations(parsed.verdict, research.citations, 1);

    return {
        platformName: research.name,
        overview: overviewHtml,
        infosheet: research.infosheet,
        ratings: parsed.ratings || [],
        pros: safePros,
        cons: safeCons,
        verdict: verdictHtml,
        affiliateUrl,
        citations: research.citations
    };
};

export const generateFAQs = async (
    platformResearch: PlatformResearch[],
    config: ArticleConfig
): Promise<FAQ[]> => {
    const platformNames = platformResearch.map(p => p.name).join(', ');
    const langInstruction = getLanguageInstruction(config.language, 'faqs');
    const faqCitations = deduplicateCitations(platformResearch.flatMap(p => p.citations));
    const citationsIndex = buildCitationsIndexBlock(faqCitations);

    const toneInstruction = getToneInstruction(config);
    const keywordsInstruction = getKeywordsInstruction(config);
    const seoInstruction = getSeoInstruction(config);
    const customInstructions = getCustomInstructions(config);

    const prompt = `Generate 5-7 frequently asked questions about the following gambling platforms: ${platformNames}.

${langInstruction}

**Tone:** ${toneInstruction}
${keywordsInstruction}
${seoInstruction}
${customInstructions}

${IN_TEXT_CITATION_RULES_HTML}

**Citations Index:**
${citationsIndex}

**Article Context:** ${config.introNarrative}

Create questions that:
1. Are commonly searched by users looking for gambling platform reviews
2. Address concerns about safety, legitimacy, and features
3. Compare platforms where relevant
4. Are SEO-friendly

Provide concise but informative answers (2-3 sentences each).

Return JSON:
{
  "faqs": [
    { "question": "...", "answer": "<p>...<a href=\"URL\" target=\"_blank\" rel=\"noopener noreferrer\">[n]</a></p>" }
  ]
}

Rules:
- Answers must be HTML (use <p> tags).
- Each answer must include at least 1 in-text citation link.`;

    const response = await withRetry(() => ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    faqs: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING },
                                answer: { type: Type.STRING }
                            },
                            required: ["question", "answer"]
                        }
                    }
                },
                required: ["faqs"]
            }
        }
    }));

    const parsed = parseJsonResponse<{ faqs: FAQ[] }>(response.text);
    return (parsed.faqs || []).map(faq => ({
        ...faq,
        answer: ensureInTextCitations(faq.answer, faqCitations, 1)
    }));
};

// --- SERP Competitor Analysis using Gemini with Google Search Grounding ---

export interface SerpCompetitor {
    rank: number;
    domain: string;
    url: string;
    title: string;
    metaDesc: string;
    headings: string[];
}

export const analyzeSerpCompetitors = async (
    keyword: string,
    maxResults: number = 5
): Promise<SerpCompetitor[]> => {
    const prompt = `Search Google for "${keyword}" and analyze the top ${maxResults} ranking pages.

For each of the top ${maxResults} organic search results, extract:
1. The exact domain name from the URL
2. The page title
3. The meta description (or first paragraph if not available)
4. List ALL the H2 headings/sections from that page's content structure

This is for SEO competitive analysis. I need REAL data from ACTUAL pages currently ranking for this keyword.

Return as JSON:
{
  "competitors": [
    {
      "rank": 1,
      "domain": "exactdomain.com",
      "url": "https://exactdomain.com/page-path",
      "title": "Exact Page Title",
      "metaDesc": "Exact meta description or intro text",
      "headings": ["H2 Section 1", "H2 Section 2", "H2 Section 3", "H2 Section 4"]
    }
  ]
}`;

    try {
        // Use Gemini with Google Search grounding for real SERP data
        // Note: googleSearch tool cannot be used with responseMimeType json
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{
                    googleSearch: {}
                }]
            }
        });

        const parsed = parseJsonResponse<{ competitors: SerpCompetitor[] }>(response.text);
        return (parsed.competitors || []).slice(0, maxResults).map((c: any, i: number) => ({
            rank: c.rank || i + 1,
            domain: c.domain || 'unknown',
            url: c.url || `https://${c.domain}`,
            title: c.title || '',
            metaDesc: c.metaDesc || c.metaDescription || '',
            headings: Array.isArray(c.headings) ? c.headings : []
        }));
    } catch (error) {
        console.error('Failed to analyze SERP competitors with Gemini:', error);
    }
    
    return [];
};

// --- Responsible Gambling Disclaimer Generation ---

export const generateResponsibleGamblingDisclaimer = async (
    language: Language
): Promise<string> => {
    const langInstruction = getLanguageInstruction(language, 'review');
    
    const prompt = `Generate a responsible gambling disclaimer appropriate for the target market.

${langInstruction}

**Requirements:**
- Write a professional, legally-appropriate responsible gambling disclaimer
- Include warnings about gambling risks and addiction
- Mention seeking help from professional organizations
- Reference age restrictions for gambling
- Keep it concise (2-3 sentences)
- Make it culturally appropriate for the target language/market
- Do NOT include any HTML tags, just plain text

Generate the disclaimer text only, no additional commentary.`;

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt
        });
        return response.text?.trim() || getDefaultDisclaimer(language);
    } catch (error) {
        console.error('Failed to generate responsible gambling disclaimer:', error);
        return getDefaultDisclaimer(language);
    }
};

const getDefaultDisclaimer = (language: Language): string => {
    const disclaimers: Record<Language, string> = {
        [Language.ENGLISH]: 'Gambling involves risk and should be done responsibly. Please only gamble with money you can afford to lose. If you or someone you know has a gambling problem, please seek help from professional organizations. You must be of legal gambling age in your jurisdiction.',
        [Language.THAI]: 'การพนันมีความเสี่ยงและควรเล่นอย่างมีความรับผิดชอบ กรุณาเล่นเฉพาะเงินที่คุณสามารถเสียได้เท่านั้น หากคุณหรือคนที่คุณรู้จักมีปัญหาการติดพนัน กรุณาขอความช่วยเหลือจากองค์กรผู้เชี่ยวชาญ คุณต้องมีอายุถึงเกณฑ์ตามกฎหมายในการเล่นพนัน',
        [Language.VIETNAMESE]: 'Cờ bạc có rủi ro và nên chơi có trách nhiệm. Chỉ đặt cược với số tiền bạn có thể chấp nhận mất. Nếu bạn hoặc người quen có vấn đề về cờ bạc, hãy tìm kiếm sự giúp đỡ từ các tổ chức chuyên nghiệp. Bạn phải đủ tuổi hợp pháp để tham gia cờ bạc.',
        [Language.JAPANESE]: 'ギャンブルにはリスクが伴います。責任を持って行ってください。失っても問題ない金額でのみギャンブルしてください。ギャンブル依存症の問題がある場合は、専門機関に相談してください。ギャンブルには法定年齢に達している必要があります。',
        [Language.KOREAN]: '도박에는 위험이 따르며 책임감 있게 해야 합니다. 잃어도 괜찮은 돈으로만 도박하세요. 본인 또는 지인이 도박 문제가 있다면 전문 기관의 도움을 받으세요. 도박은 법적 연령에 도달해야 참여할 수 있습니다.'
    };
    return disclaimers[language] || disclaimers[Language.ENGLISH];
};

// --- Additional Sections Generation (learned from competitors) ---

// Standard sections that already exist in our article structure
const EXISTING_SECTION_PATTERNS = [
    'introduction', 'intro', 'overview',
    'comparison', 'compare', 'table',
    'review', 'reviews', 'platform',
    'faq', 'frequently asked', 'questions',
    'pros', 'cons', 'advantages', 'disadvantages',
    'verdict', 'conclusion', 'final thoughts',
    'rating', 'score', 'rankings',
    'list', 'top', 'best'
];

const isExistingSection = (heading: string): boolean => {
    const lower = heading.toLowerCase();
    return EXISTING_SECTION_PATTERNS.some(pattern => lower.includes(pattern));
};

export const suggestAdditionalSections = async (
    competitorHeadings: string[],
    existingPlatformNames: string[],
    targetCount: number,
    config: ArticleConfig
): Promise<string[]> => {
    // Filter out headings that match existing sections or platform names
    const platformPatterns = existingPlatformNames.map(n => n.toLowerCase());
    const uniqueHeadings = competitorHeadings.filter(h => {
        const lower = h.toLowerCase();
        if (isExistingSection(lower)) return false;
        if (platformPatterns.some(p => lower.includes(p))) return false;
        return true;
    });

    // Get unique suggestions
    const seen = new Set<string>();
    const candidates = uniqueHeadings.filter(h => {
        const normalized = h.toLowerCase().trim();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
    });

    if (candidates.length === 0 || targetCount <= 0) return [];

    // Use LLM to pick the best additional sections
    const langInstruction = getLanguageInstruction(config.language, 'review');
    const prompt = `You are an SEO content strategist. Based on competitor analysis, suggest ${targetCount} additional content sections for a gambling platform review article.

${langInstruction}

**Competitor headings found:**
${candidates.slice(0, 20).map((h, i) => `${i + 1}. ${h}`).join('\n')}

**Existing article structure (DO NOT duplicate these):**
1. Introduction
2. Platform List Overview
3. Comparison Table
4. Individual Platform Reviews (Overview, Infosheet, Pros/Cons, Verdict)
5. FAQs

**Requirements:**
- Suggest exactly ${targetCount} section titles that would ADD VALUE to the article
- Choose sections that appear frequently in competitor content
- Sections should be informative and relevant to gambling platform reviews
- Do NOT suggest sections that duplicate existing structure
- Keep titles concise (2-5 words)

Return JSON:
{
  "sections": ["Section Title 1", "Section Title 2"]
}`;

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt
        });
        const parsed = parseJsonResponse<{ sections: string[] }>(response.text);
        return (parsed.sections || []).slice(0, targetCount);
    } catch (error) {
        console.error('Failed to suggest additional sections:', error);
        // Fallback: return top candidates as-is
        return candidates.slice(0, targetCount);
    }
};

export const generateAdditionalSection = async (
    sectionTitle: string,
    config: ArticleConfig,
    platformResearch: PlatformResearch[]
): Promise<AdditionalSection> => {
    return generateAdditionalSectionWithKeywords(sectionTitle, config, platformResearch, []);
};

// Enhanced version that considers competitor patterns and blends keywords naturally
export const generateAdditionalSectionWithKeywords = async (
    sectionTitle: string,
    config: ArticleConfig,
    platformResearch: PlatformResearch[],
    competitorHeadings: string[]
): Promise<AdditionalSection> => {
    const langInstruction = getLanguageInstruction(config.language, 'review');
    const toneInstruction = getToneInstruction(config);
    const customInstructions = getCustomInstructions(config);
    
    const platformContext = platformResearch.map(p => `- ${p.name}: ${p.shortDescription}`).join('\n');
    
    // Get target keywords for natural integration
    const keywords = config.targetKeywords || [];
    const primaryKeyword = keywords.find(k => k.isPrimary)?.keyword || '';
    const secondaryKeywords = keywords.filter(k => !k.isPrimary).map(k => k.keyword);
    
    // Find related competitor headings for context
    const relatedHeadings = competitorHeadings
        .filter(h => {
            const lower = h.toLowerCase();
            const titleLower = sectionTitle.toLowerCase();
            // Find headings that share words with the section title
            const titleWords = titleLower.split(/\s+/).filter(w => w.length > 3);
            return titleWords.some(word => lower.includes(word));
        })
        .slice(0, 5);

    const keywordContext = keywords.length > 0 
        ? `\n**Target Keywords (blend naturally, don't force):**
- Primary: ${primaryKeyword || 'none'}
- Secondary: ${secondaryKeywords.join(', ') || 'none'}

IMPORTANT: Only use keywords where they fit naturally. User intent and readability come first. The top-ranking competitors have proven what works - follow their patterns.`
        : '';

    const competitorContext = relatedHeadings.length > 0
        ? `\n**How top competitors structure similar sections:**
${relatedHeadings.map(h => `- "${h}"`).join('\n')}

Learn from these patterns - they rank well because they match user intent.`
        : '';

    const prompt = `You are an expert gambling content writer. Generate content for the section titled "${sectionTitle}" for a gambling platform review article.

${langInstruction}
${toneInstruction}
${customInstructions}
${keywordContext}
${competitorContext}

**Platforms being reviewed:**
${platformContext}

**Requirements:**
- Write approximately 150-250 words
- Make content genuinely helpful and informative
- Match the user intent - what would someone searching for this topic want to know?
- Reference the platforms being reviewed where relevant
- Use HTML formatting with <p> tags and optionally <ul>/<li> for lists
- If keywords fit naturally, include them. If not, prioritize quality content.
- Follow patterns from successful competitor content

Generate the section content as HTML.`;

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt
        });
        let content = response.text || '';
        // Clean up response
        content = content.replace(/```html?/gi, '').replace(/```/g, '').trim();
        if (!content.startsWith('<')) {
            content = `<p>${content}</p>`;
        }
        
        return {
            title: sectionTitle,
            content
        };
    } catch (error) {
        console.error(`Failed to generate section "${sectionTitle}":`, error);
        return {
            title: sectionTitle,
            content: `<p>Content for ${sectionTitle} could not be generated.</p>`
        };
    }
};

// --- Full Article Generation Orchestrator ---

export const generateFullArticle = async (
    config: ArticleConfig,
    platformResearch: PlatformResearch[],
    onProgress?: (phase: string, detail?: string) => void,
    competitorHeadings?: string[]  // H2 headings from SERP competitor analysis
): Promise<GeneratedArticle> => {
    // Collect and deduplicate all citations early so the AI can cite them in-text
    const allCitations = deduplicateCitations(
        platformResearch.flatMap(p => p.citations)
    );

    onProgress?.('generating-intro');

    let platformQuickList: { name: string; shortDescription: string }[] = [];
    try {
        platformQuickList = await generatePlatformQuickList(
            platformResearch,
            config.language,
            allCitations
        );
    } catch (error) {
        console.warn('Failed to generate localized platform quick list, falling back to research short descriptions:', error);
        platformQuickList = platformResearch.map(p => ({
            name: p.name,
            shortDescription: ensureInTextCitations(p.shortDescription || '', allCitations, 1)
        }));
    }

    const intro = await generateIntroduction(config, platformQuickList, allCitations);

    let comparisonTable: ComparisonTableRow[] = [];
    if (config.includeSections.comparisonTable) {
        onProgress?.('generating-comparison');
        comparisonTable = await generateComparisonTable(platformResearch, config.language);
    }

    onProgress?.('generating-reviews');
    const platformReviews: PlatformReview[] = [];
    for (let i = 0; i < platformResearch.length; i++) {
        const research = platformResearch[i];
        const platformInput = config.platforms.find(p => p.name === research.name);
        onProgress?.('generating-reviews', `${research.name} (${i + 1}/${platformResearch.length})`);
        
        const review = await generatePlatformReview(
            research,
            config,
            platformInput?.affiliateUrl
        );
        platformReviews.push(review);
    }

    // Generate additional sections if targetSectionCount > 5
    let additionalSections: AdditionalSection[] = [];
    const targetSectionCount = config.targetSectionCount || 5;
    const additionalSectionsNeeded = Math.max(0, targetSectionCount - 5);
    
    if (additionalSectionsNeeded > 0) {
        onProgress?.('generating-additional', `Analyzing competitor patterns for ${additionalSectionsNeeded} additional sections...`);
        
        let sectionTitles: string[] = [];
        
        // Use competitor headings if available, otherwise fall back to defaults
        if (competitorHeadings && competitorHeadings.length > 0) {
            // Use LLM to suggest sections based on competitor analysis
            sectionTitles = await suggestAdditionalSections(
                competitorHeadings,
                platformResearch.map(p => p.name),
                additionalSectionsNeeded,
                config
            );
        }
        
        // Fallback to defaults if no suggestions or no competitor data
        if (sectionTitles.length === 0) {
            const defaultSectionSuggestions = [
                'Payment Methods Guide',
                'Mobile Gaming Experience', 
                'Bonus Terms Explained',
                'Security & Safety',
                'Customer Support Overview'
            ];
            sectionTitles = defaultSectionSuggestions.slice(0, additionalSectionsNeeded);
        }
        
        for (let i = 0; i < sectionTitles.length; i++) {
            const title = sectionTitles[i];
            onProgress?.('generating-additional', `${title} (${i + 1}/${sectionTitles.length})`);
            const section = await generateAdditionalSectionWithKeywords(
                title, 
                config, 
                platformResearch,
                competitorHeadings || []
            );
            additionalSections.push(section);
        }
    }

    let faqs: FAQ[] = [];
    if (config.includeSections.faqs) {
        onProgress?.('generating-faqs');
        faqs = await generateFAQs(platformResearch, config);
    }

    return {
        intro,
        platformQuickList,
        comparisonTable,
        platformReviews,
        additionalSections,
        faqs,
        allCitations
    };
};

/**
 * Generate only platform reviews - research platforms and generate review content
 * without intro, comparison table, FAQs, etc.
 * Used for Review Only mode where user wants to update/generate just the reviews
 */
export const generateReviewsOnly = async (
    config: ArticleConfig,
    onProgress?: (phase: string, detail?: string) => void
): Promise<{ 
    platformResearch: PlatformResearch[]; 
    platformReviews: PlatformReview[];
}> => {
    const platformNames = config.platforms.map(p => p.name);
    
    // Research all platforms
    onProgress?.('researching', `Researching ${platformNames.length} platform(s)...`);
    
    const platformResearch = await researchAllPlatforms(
        platformNames,
        config.vertical || 'gambling',
        (completed, total, platformName) => {
            onProgress?.('researching', `Researched ${platformName} (${completed}/${total})`);
        }
    );

    // Generate reviews for all platforms
    onProgress?.('generating-reviews', 'Generating platform reviews...');
    const platformReviews: PlatformReview[] = [];
    
    for (let i = 0; i < platformResearch.length; i++) {
        const research = platformResearch[i];
        const platformInput = config.platforms.find(p => p.name === research.name);
        onProgress?.('generating-reviews', `${research.name} (${i + 1}/${platformResearch.length})`);
        
        const review = await generatePlatformReview(
            research,
            config,
            platformInput?.affiliateUrl
        );
        platformReviews.push(review);
    }

    return {
        platformResearch,
        platformReviews
    };
};
