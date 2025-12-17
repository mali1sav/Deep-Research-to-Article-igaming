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
    ResearchModel,
    SeoMode,
    ToneOfVoice,
    TargetKeyword,
    AdditionalSection,
    VerticalType,
    SeoMetadata
} from '../types';
import { getVerticalConfig, VerticalConfig } from '../config/verticals';

// --- API Configuration ---
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';

// OpenRouter models
const OPENROUTER_RESEARCH_MODEL = 'alibaba/tongyi-deepresearch-30b-a3b'; // For deep research with web search
const OPENROUTER_CONTENT_MODEL = 'openai/gpt-4o-mini'; // For content generation (fast, reliable)

// --- Retry Helper with Exponential Backoff ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 6,  // Increased for better 503 handling
    baseDelayMs: number = 5000  // 5 second base delay
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
            
            // Longer delays for 503 overloaded errors (Gemini)
            const is503 = message.includes('503') || lower.includes('overloaded');
            const multiplier = is503 ? 2.5 : 2;  // 2.5x backoff for 503
            const delayMs = Math.min(baseDelayMs * Math.pow(multiplier, attempt), 60000); // Cap at 60s
            console.warn(`API call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${(delayMs/1000).toFixed(0)}s...`, error.message);
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
            "X-Title": "Platform Research"
        },
        body: JSON.stringify({
            model: OPENROUTER_RESEARCH_MODEL,
            messages: messages,
            reasoning: { enabled: true },
            provider: {
                order: ["atlas-cloud"],
                allow_fallbacks: true
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

// --- Perplexity Sonar API (Real-time web search with verified URLs) ---
async function callPerplexitySonar(prompt: string): Promise<{ content: string; citations: string[] }> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "Platform Research (Perplexity)"
        },
        body: JSON.stringify({
            model: "perplexity/sonar",
            messages: [{ role: 'user', content: prompt }],
            // Perplexity-specific options for fresh results
            web_search_options: {
                search_context_size: "high",  // Maximum search depth
                search_recency_filter: "month"  // Only sources from last 30 days
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity Sonar API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const message = result.choices[0].message;
    
    // Perplexity returns citations in the response
    const citations = message.citations || [];
    
    return {
        content: message.content,
        citations: citations
    };
}

// --- OpenRouter Content Generation (replaces Gemini) ---
async function callOpenRouterContent(prompt: string, jsonMode: boolean = true): Promise<string> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "Content Generation"
        },
        body: JSON.stringify({
            model: OPENROUTER_CONTENT_MODEL,
            messages: [{ role: 'user', content: prompt }],
            ...(jsonMode && { response_format: { type: "json_object" } })
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter Content API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.choices[0].message.content;
}

// --- Writing Model API (uses selected model: GPT 5.2 or Claude Sonnet 4.5) ---
async function callWritingModel(prompt: string, writingModel: WritingModel, jsonMode: boolean = true): Promise<string> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "Article Writing"
        },
        body: JSON.stringify({
            model: writingModel,  // Use selected writing model (GPT 5.2 or Claude)
            messages: [{ role: 'user', content: prompt }],
            ...(jsonMode && { response_format: { type: "json_object" } })
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Writing Model API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.choices[0].message.content;
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
    // Use Google Search URLs since AI-generated sourceUrls are often hallucinated/404
    return citations
        .map((c, i) => `${i + 1}. ${c.domain} - ${c.googleSearchUrl}`)
        .join('\n');
};

const IN_TEXT_CITATION_RULES_HTML = `
**CRITICAL - Citation Rules (MUST FOLLOW):**
- Use ONLY the Google Search URLs from the "Citations Index" below - these are guaranteed to work
- Add citations INSIDE paragraphs using format: <a href="GOOGLE_SEARCH_URL_FROM_INDEX" target="_blank" rel="noopener noreferrer">(domain.com)</a>
- Example: Licensed by Curacao eGaming <a href="https://www.google.com/search?q=curacaoegaming.lc" target="_blank" rel="noopener noreferrer">(curacaoegaming.lc)</a>
- Each source should appear ONLY ONCE in the entire article
- Only cite credibility-important info (licenses, company details, bonuses)
- NEVER fabricate or modify URLs - use EXACTLY the URLs from the Citations Index
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
    // Use real URL from Perplexity when available, otherwise fall back to Google Search
    const hasRealUrl = citation.sourceUrl && 
                       !citation.sourceUrl.includes('google.com/search') &&
                       citation.sourceUrl.startsWith('http');
    const href = hasRealUrl ? citation.sourceUrl : citation.googleSearchUrl;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">(${citation.domain})</a>`;
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

    // Use searchSuffix to disambiguate platform names
    const searchQuery = `${platformName} ${verticalConfig.searchSuffix}`;

    return `${verticalConfig.researchContext} "${platformName}" and provide comprehensive, factual information.

**CRITICAL SEARCH CONTEXT**: You are researching "${platformName}" as a ${verticalConfig.name.toLowerCase()} platform. 
Search for: "${searchQuery}"
DO NOT confuse this with platforms in other industries (e.g., if researching crypto, do NOT find gambling/casino sites).

Find and report REAL DATA for:
${fieldsList}
${verticalConfig.infosheetFields.length + 1}. **Key Features**: 3-5 notable features of this ${verticalConfig.platformTerm}
${verticalConfig.infosheetFields.length + 2}. **Pros**: Genuine advantages based on user reviews (3-6 items)
${verticalConfig.infosheetFields.length + 3}. **Cons**: Genuine disadvantages based on user reviews (2-5 items)

IMPORTANT:
- Search thoroughly and provide actual data you find
- If you cannot find specific information, state "Not publicly disclosed"
- If you cannot find this platform as a ${verticalConfig.name.toLowerCase()} platform, state "Platform not found in this industry"

**STRICT CITATION RULES - CRITICAL**:
- ONLY include URLs that you actually visited and verified exist
- DO NOT hallucinate or make up URLs
- DO NOT include URLs from search results pages (no google.com URLs)
- Prefer official platform websites (e.g., ${platformName.toLowerCase()}.com) and reputable review sites
- If you cannot verify a URL exists, DO NOT include it
- Maximum 3-5 high-quality, verified sources per ${verticalConfig.platformTerm}
- If no reliable sources found, return empty sources array - do NOT make up URLs

Format your response as JSON:
{
    "shortDescription": "1-2 sentence description",
    "infosheet": {
${infosheetJson}
    },
    "keyFeatures": ["..."],
    "pros": ["..."],
    "cons": ["..."],
    "sources": ["https://verified-url-you-actually-visited.com/path"]
}`;
};

export const researchPlatform = async (
    platformName: string, 
    vertical: VerticalType = 'gambling',
    researchModel: ResearchModel = ResearchModel.TONGYI_DEEP_RESEARCH
): Promise<PlatformResearch> => {
    const verticalConfig = getVerticalConfig(vertical);
    const prompt = buildResearchPrompt(platformName, verticalConfig);

    try {
        let finalContent: string;
        let perplexityCitations: string[] = [];

        // Use selected research model
        if (researchModel === ResearchModel.PERPLEXITY_SONAR) {
            // Perplexity Sonar - real-time web search with verified URLs
            console.log(`Using Perplexity Sonar for ${platformName} (fresh sources from last 30 days)`);
            const sonarResponse = await withRetry(
                () => callPerplexitySonar(prompt),
                5,
                3000
            );
            finalContent = sonarResponse.content;
            perplexityCitations = sonarResponse.citations;
        } else {
            // Tongyi Deep Research - original model
            console.log(`Using Tongyi Deep Research for ${platformName}`);
            const response1 = await withRetry(
                () => callOpenRouterDeepResearch([{ role: 'user', content: prompt }]),
                5,
                5000
            );

            // Check if first response already has good data - skip verification if so
            finalContent = response1.content;
            let skipVerification = false;
            
            try {
                const initialParsed = parseJsonResponse<any>(response1.content);
                const infosheet = initialParsed.infosheet || initialParsed;
                const hasGoodData = infosheet && 
                    Object.values(infosheet).filter(v => 
                        v && String(v).toLowerCase() !== 'unknown' && 
                        String(v).toLowerCase() !== 'not publicly disclosed'
                    ).length >= 5;
                skipVerification = hasGoodData;
            } catch {
                skipVerification = false;
            }

            if (!skipVerification) {
                await sleep(3000);
                const verifyPrompt = `Please verify the information above is accurate. If any fields show "Unknown" or "Not publicly disclosed", try harder to find the actual data. Provide your final verified JSON response.`;

                const verifyResponse = await withRetry(
                    () => callOpenRouterDeepResearch([
                        { role: 'user', content: prompt },
                        { 
                            role: 'assistant', 
                            content: response1.content,
                            reasoning_details: response1.reasoning_details
                        },
                        { role: 'user', content: verifyPrompt }
                    ]),
                    5,
                    5000
                );
                finalContent = verifyResponse.content;
            } else {
                console.log(`Skipping verification for ${platformName} - initial data quality is good`);
            }
        }

        const parsed = parseJsonResponse<ResearchResponse>(finalContent);
        
        // For Perplexity Sonar, use real URLs from citations; for Tongyi, use parsed sources
        let citations: Citation[];
        let allSources: string[];
        
        if (researchModel === ResearchModel.PERPLEXITY_SONAR && perplexityCitations.length > 0) {
            // Perplexity returns verified real URLs - use them directly
            citations = perplexityCitations.map(url => {
                try {
                    const urlObj = new URL(url);
                    const domain = urlObj.hostname.replace('www.', '');
                    return {
                        title: domain,
                        sourceUrl: url,  // Real verified URL from Perplexity
                        googleSearchUrl: buildGoogleSearchUrl(domain),
                        domain
                    };
                } catch {
                    return {
                        title: url,
                        sourceUrl: url,
                        googleSearchUrl: buildGoogleSearchUrl(url),
                        domain: url
                    };
                }
            });
            allSources = perplexityCitations;
        } else {
            // Tongyi or fallback - use parsed sources (may be hallucinated)
            citations = extractCitationsFromSources(parsed.sources || []);
            allSources = parsed.sources || [];
        }
        
        // Extract source domains for attribution
        const sourceDomains = allSources
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
            rawResearchSummary: finalContent,
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

// --- Research Cache (localStorage) ---
const RESEARCH_CACHE_KEY = 'platform_research_cache';
const CACHE_EXPIRY_HOURS = 24; // Cache valid for 24 hours

interface CachedResearch {
    data: PlatformResearch;
    timestamp: number;
    vertical: VerticalType;
}

interface ResearchCache {
    [platformName: string]: CachedResearch;
}

const getResearchCache = (): ResearchCache => {
    try {
        const cached = localStorage.getItem(RESEARCH_CACHE_KEY);
        return cached ? JSON.parse(cached) : {};
    } catch {
        return {};
    }
};

const saveToResearchCache = (platformName: string, data: PlatformResearch, vertical: VerticalType): void => {
    try {
        const cache = getResearchCache();
        cache[platformName.toLowerCase()] = {
            data,
            timestamp: Date.now(),
            vertical
        };
        localStorage.setItem(RESEARCH_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.warn('Failed to save research to cache:', error);
    }
};

const getFromResearchCache = (platformName: string, vertical: VerticalType): PlatformResearch | null => {
    try {
        const cache = getResearchCache();
        const cached = cache[platformName.toLowerCase()];
        
        if (!cached) return null;
        
        // Check if cache is expired
        const ageHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
        if (ageHours > CACHE_EXPIRY_HOURS) return null;
        
        // Check if vertical matches
        if (cached.vertical !== vertical) return null;
        
        // Only return if research was successful
        if (cached.data.researchStatus === 'error') return null;
        
        return cached.data;
    } catch {
        return null;
    }
};

export const clearResearchCache = (): void => {
    try {
        localStorage.removeItem(RESEARCH_CACHE_KEY);
    } catch (error) {
        console.warn('Failed to clear research cache:', error);
    }
};

export const getCachedPlatformNames = (vertical: VerticalType): string[] => {
    const cache = getResearchCache();
    return Object.entries(cache)
        .filter(([_, cached]) => {
            const ageHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
            return ageHours <= CACHE_EXPIRY_HOURS && 
                   cached.vertical === vertical && 
                   cached.data.researchStatus !== 'error';
        })
        .map(([name]) => name);
};

export const isPlatformCached = (platformName: string, vertical: VerticalType): boolean => {
    const cachedNames = getCachedPlatformNames(vertical);
    return cachedNames.includes(platformName.toLowerCase());
};

export const getCacheInfo = (vertical: VerticalType): { name: string; cachedAt: Date }[] => {
    const cache = getResearchCache();
    return Object.entries(cache)
        .filter(([_, cached]) => {
            const ageHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
            return ageHours <= CACHE_EXPIRY_HOURS && 
                   cached.vertical === vertical && 
                   cached.data.researchStatus !== 'error';
        })
        .map(([name, cached]) => ({
            name: cached.data.name || name,
            cachedAt: new Date(cached.timestamp)
        }));
};

// --- Review Cache (localStorage) - Phase 2 of two-phase workflow ---
const REVIEW_CACHE_KEY = 'platform_review_cache';

interface CachedReviewEntry {
    platformName: string;
    overview: string;
    infosheet: PlatformInfosheet;
    pros: string[];
    cons: string[];
    verdict: string;
    affiliateUrl?: string;
    citations: Citation[];
    timestamp: number;
    vertical: VerticalType;
}

interface ReviewCache {
    [platformName: string]: CachedReviewEntry;
}

const getReviewCache = (): ReviewCache => {
    try {
        const cached = localStorage.getItem(REVIEW_CACHE_KEY);
        return cached ? JSON.parse(cached) : {};
    } catch {
        return {};
    }
};

export const saveReviewToCache = (review: PlatformReview, vertical: VerticalType): void => {
    try {
        const cache = getReviewCache();
        cache[review.platformName.toLowerCase()] = {
            platformName: review.platformName,
            overview: review.overview,
            infosheet: review.infosheet,
            pros: review.pros,
            cons: review.cons,
            verdict: review.verdict,
            affiliateUrl: review.affiliateUrl,
            citations: review.citations,
            timestamp: Date.now(),
            vertical
        };
        localStorage.setItem(REVIEW_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.warn('Failed to save review to cache:', error);
    }
};

export const getReviewFromCache = (platformName: string, vertical: VerticalType): CachedReviewEntry | null => {
    try {
        const cache = getReviewCache();
        const cached = cache[platformName.toLowerCase()];
        
        if (!cached) return null;
        
        // Check if cache is expired
        const ageHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
        if (ageHours > CACHE_EXPIRY_HOURS) return null;
        
        // Check if vertical matches
        if (cached.vertical !== vertical) return null;
        
        return cached;
    } catch {
        return null;
    }
};

export const getCachedReviews = (vertical: VerticalType): CachedReviewEntry[] => {
    const cache = getReviewCache();
    return Object.values(cache)
        .filter(cached => {
            const ageHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
            return ageHours <= CACHE_EXPIRY_HOURS && cached.vertical === vertical;
        });
};

export const clearReviewCache = (): void => {
    try {
        localStorage.removeItem(REVIEW_CACHE_KEY);
    } catch (error) {
        console.warn('Failed to clear review cache:', error);
    }
};

export const clearAllCaches = (): void => {
    clearResearchCache();
    clearReviewCache();
};

/**
 * Delete a specific platform from BOTH research and review caches.
 * Used when user wants to re-research a platform.
 */
export const deletePlatformFromCache = (platformName: string): void => {
    const normalizedName = platformName.toLowerCase();
    
    // Remove from research cache
    try {
        const researchCache = JSON.parse(localStorage.getItem(RESEARCH_CACHE_KEY) || '{}');
        delete researchCache[normalizedName];
        localStorage.setItem(RESEARCH_CACHE_KEY, JSON.stringify(researchCache));
    } catch (error) {
        console.warn('Failed to delete from research cache:', error);
    }
    
    // Remove from review cache
    try {
        const reviewCache = getReviewCache();
        delete reviewCache[normalizedName];
        localStorage.setItem(REVIEW_CACHE_KEY, JSON.stringify(reviewCache));
    } catch (error) {
        console.warn('Failed to delete from review cache:', error);
    }
};

/**
 * Check if a platform has a cached REVIEW (not just research).
 * This is the authoritative check for whether a platform is "ready" in the corpus.
 */
export const isReviewCached = (platformName: string, vertical: VerticalType): boolean => {
    const cached = getReviewFromCache(platformName, vertical);
    return cached !== null;
};

// Get combined cache summary for UI
export const getCacheSummary = (vertical: VerticalType): {
    researchCount: number;
    reviewCount: number;
    researchPlatforms: string[];
    reviewPlatforms: string[];
    canAssemble: boolean;
} => {
    const researchPlatforms = getCachedPlatformNames(vertical);
    const cachedReviews = getCachedReviews(vertical);
    const reviewPlatforms = cachedReviews.map(r => r.platformName);
    
    return {
        researchCount: researchPlatforms.length,
        reviewCount: reviewPlatforms.length,
        researchPlatforms,
        reviewPlatforms,
        canAssemble: reviewPlatforms.length >= 3
    };
};

/**
 * Research platforms with controlled concurrency to avoid API overload.
 * Uses localStorage cache to persist completed research between errors.
 * Processes sequentially with delays to minimize 503 errors.
 */
export const researchAllPlatforms = async (
    platformNames: string[],
    vertical: VerticalType = 'gambling',
    onProgress?: (completed: number, total: number, platformName: string, fromCache?: boolean) => void,
    researchModel: ResearchModel = ResearchModel.TONGYI_DEEP_RESEARCH
): Promise<PlatformResearch[]> => {
    const total = platformNames.length;
    let completed = 0;
    const results: PlatformResearch[] = [];
    
    // Sequential processing with delays to avoid 503 errors
    const DELAY_BETWEEN_REQUESTS_MS = researchModel === ResearchModel.PERPLEXITY_SONAR ? 1500 : 3000;
    
    for (const name of platformNames) {
        // Check cache first
        const cachedResult = getFromResearchCache(name, vertical);
        
        if (cachedResult) {
            console.log(`Using cached research for ${name}`);
            results.push(cachedResult);
            completed++;
            onProgress?.(completed, total, name, true);
        } else {
            // Research and cache the result
            const result = await researchPlatform(name, vertical, researchModel);
            
            // Save to cache (even errors, but they won't be retrieved)
            saveToResearchCache(name, result, vertical);
            
            results.push(result);
            completed++;
            onProgress?.(completed, total, name, false);
            
            // Add delay before next request (except for the last one)
            if (completed < total) {
                await sleep(DELAY_BETWEEN_REQUESTS_MS);
            }
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
- Output should be HTML formatted (use <p> tags for paragraphs)
- Return JSON: { "introduction": "<p>Your intro here...</p>" }`;

    const response = await withRetry(() => callOpenRouterContent(prompt));
    const parsed = parseJsonResponse<{ introduction: string }>(response);
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

    const response = await withRetry(() => callOpenRouterContent(prompt));
    const parsed = parseJsonResponse<{ platformQuickList: { name: string; shortDescription: string }[] }>(response);
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
    config: ArticleConfig
): Promise<ComparisonTableRow[]> => {
    const noDataMsg = getNoDataMessage();
    const verticalConfig = getVerticalConfig(config.vertical || 'gambling');
    
    // Gather ALL available data from each platform's infosheet for LLM to choose from
    const researchData = platformResearch.map(p => {
        const hasData = hasValidResearchData(p);
        const info = p.infosheet as Record<string, any>;
        
        return {
            name: p.name,
            hasResearchData: hasData,
            // Include all infosheet data for LLM to analyze
            ...Object.fromEntries(
                Object.entries(info)
                    .filter(([k]) => !['dataSource', 'retrievedAt'].includes(k))
                    .map(([k, v]) => [k, hasData ? (v || noDataMsg) : noDataMsg])
            ),
            // Include pros/cons summary for context
            keyStrengths: hasData ? (p.pros || []).slice(0, 3).join(', ') : noDataMsg,
            keyWeaknesses: hasData ? (p.cons || []).slice(0, 2).join(', ') : noDataMsg
        };
    });

    const langInstruction = getLanguageInstruction(config.language, 'comparison');
    
    // Build available fields list from vertical config
    const availableFields = verticalConfig.infosheetFields
        .map(f => `- ${f.key}: ${f.label}`)
        .join('\n');
    
    // Get primary keyword for context
    const primaryKeyword = config.targetKeywords?.find(k => k.isPrimary)?.keyword || '';
    
    // Get article narrative/angle
    const articleNarrative = config.introNarrative || '';
    
    // Get custom instruction for additional context
    const customInstruction = config.customInstructions || '';

    const prompt = `You are an expert ${verticalConfig.name.toLowerCase()} analyst. Create a comparison table that helps readers make informed decisions.

${langInstruction}

**ARTICLE CONTEXT:**
- Vertical/Industry: ${verticalConfig.name}
- Primary Keyword: ${primaryKeyword || 'Not specified'}
- Article Angle/Narrative: ${articleNarrative || 'General comparison'}
- Platforms Being Compared: ${platformResearch.map(p => p.name).join(', ')}
${customInstruction ? `- Custom Instructions: ${customInstruction}` : ''}

**AVAILABLE PLATFORM DATA:**
${JSON.stringify(researchData, null, 2)}

**AVAILABLE DATA FIELDS:**
${availableFields}

**YOUR TASK:**
1. ANALYZE the article context (keyword, narrative, vertical, platforms)
2. CHOOSE 3-5 most relevant comparison columns that:
   - Match the article's angle/narrative
   - Are meaningful for the ${verticalConfig.name.toLowerCase()} vertical
   - Help readers compare these specific platforms
   - Have data available (don't choose columns with mostly "Unknown" values)
3. GENERATE the comparison table with your chosen columns + rating

**COLUMN SELECTION GUIDELINES:**
- If article is about "best value" → prioritize pricing/fees columns
- If article is about "security" → prioritize security/license columns
- If article is about "beginners" → prioritize ease of use/support columns
- Always include at least one differentiating factor between platforms
- Always include star rating as the last column

**STAR RATING (1-5 stars):**
- ⭐⭐⭐⭐⭐ = Exceptional
- ⭐⭐⭐⭐ = Very Good
- ⭐⭐⭐ = Good
- ⭐⭐ = Fair
- ⭐ = Poor
- "N/A" = No data available

**IMPORTANT:** If "hasResearchData: false", keep warning messages and use "N/A" for rating.

Return JSON format:
{
  "chosenColumns": ["column1", "column2", "column3"],
  "columnLabels": { "column1": "Display Label 1", "column2": "Display Label 2" },
  "rows": [
    { "platformName": "...", "column1": "...", "column2": "...", "column3": "...", "rating": "⭐⭐⭐⭐" }
  ]
}`;

    // Use writing model for smarter column selection
    const response = await withRetry(() => callWritingModel(prompt, config.writingModel));
    const parsed = parseJsonResponse<{ 
        chosenColumns?: string[];
        columnLabels?: Record<string, string>;
        rows: ComparisonTableRow[] 
    }>(response);
    
    // Log chosen columns for debugging
    if (parsed.chosenColumns) {
        console.log(`Comparison table columns chosen by LLM: ${parsed.chosenColumns.join(', ')}`);
    }
    
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
    
    // Check which sections are enabled
    const includeRatings = config.includeSections?.platformRatings !== false;
    const includeProsCons = config.includeSections?.prosCons !== false;
    const includeVerdict = config.includeSections?.verdict !== false;
    
    // Get primary keyword and article context for dynamic rating categories
    const primaryKeyword = config.targetKeywords?.find(k => k.isPrimary)?.keyword || '';
    const articleNarrative = config.introNarrative || '';
    
    // Build available scoring categories from vertical config (for LLM to choose from)
    const availableCategoriesText = includeRatings 
        ? verticalConfig.scoringCategories
            .map((cat, idx) => `${idx + 1}. ${cat.label} - ${cat.description}`)
            .join('\n')
        : '';
    
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
            overview: `<p><strong>${noDataMsg}</strong></p><p>The research agent was unable to retrieve comprehensive information for ${research.name}. A human editor should manually research and complete this section with accurate details.</p>`,
            ratings: [],
            pros: includeProsCons ? ['Information pending manual research'] : [],
            cons: includeProsCons ? ['Research data not available'] : [],
            verdict: includeVerdict ? `<p><strong>${noDataMsg}</strong></p><p>This platform requires manual research and verification before a proper verdict can be provided.</p>` : '',
            infosheet: research.infosheet,
            citations: research.citations || [],
            affiliateUrl
        };
    }

    // Build requirements based on what's enabled
    const requirements: string[] = [
        `- Overview: Write approximately ${config.sectionWordCounts.overview} words as a detailed, factual overview paragraph`
    ];
    if (includeRatings) {
        requirements.push('- Ratings: Apply the scoring methodology above strictly based on research findings');
    }
    if (includeProsCons) {
        requirements.push(`- Pros: Provide about ${prosTarget} items - must be factual, not promotional`);
        requirements.push(`- Cons: Provide between 1 and ${consMax} items - be honest about real drawbacks`);
    }
    if (includeVerdict) {
        requirements.push(`- Verdict: Write approximately ${config.sectionWordCounts.verdict} words as a balanced conclusion`);
    }

    // Build scoring section only if ratings enabled - let LLM choose relevant categories
    const userCustomInstruction = config.customInstructions || '';
    const scoringSection = includeRatings ? `
**ARTICLE CONTEXT FOR RATING:**
- Vertical: ${verticalConfig.name}
- Primary Keyword: ${primaryKeyword || 'Not specified'}
- Article Angle: ${articleNarrative || 'General review'}
${userCustomInstruction ? `- Custom Instructions: ${userCustomInstruction}` : ''}

**AVAILABLE RATING CATEGORIES (choose 4-6 most relevant):**
${availableCategoriesText}

**YOUR TASK:** Choose 4-6 rating categories that are MOST RELEVANT to:
1. The article's angle/narrative
2. The platform being reviewed
3. What matters most to readers searching for "${primaryKeyword || verticalConfig.name}"
${userCustomInstruction ? `4. User's custom instructions: "${userCustomInstruction}"` : ''}

**SCORING METHODOLOGY (apply strictly):**
Each category is scored 1-10 based on these criteria:
- **10 (Exceptional):** Industry-leading, significantly better than competitors
- **9 (Excellent):** Top-tier performance with minor room for improvement
- **8 (Very Good):** Above average, meets high standards
- **7 (Good):** Solid performance, meets expectations
- **6 (Adequate):** Acceptable but has notable gaps
- **5 (Average):** Mediocre, room for improvement
- **4-1 (Below Average to Poor):** Significant issues
` : '';

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
${scoringSection}
**Requirements:**
${requirements.join('\n')}

IMPORTANT: 
- Use in-text citations within paragraphs, NOT a references list at the end
- If sources conflict, use the most authoritative source (official site > review site > forum)
- Include at least 2 in-text citations in Overview${includeVerdict ? ' and at least 1 in Verdict' : ''}

Output HTML for overview${includeVerdict ? ' and verdict' : ''} (use <p> tags).

Return JSON format:
{
  "overview": "<p>HTML overview...</p>",
  ${includeRatings ? '"ratings": [{ "category": "...", "score": 8 }],' : ''}
  ${includeProsCons ? '"pros": ["..."], "cons": ["..."],' : ''}
  ${includeVerdict ? '"verdict": "<p>HTML verdict...</p>"' : ''}
}`;

    // Use selected writing model (GPT 5.2 or Claude) for better quality reviews
    const response = await withRetry(() => callWritingModel(prompt, config.writingModel));
    const parsed = parseJsonResponse<{ overview: string; ratings?: RatingCategory[]; pros?: string[]; cons?: string[]; verdict?: string }>(response);

    // Handle pros/cons only if enabled
    let safePros: string[] = [];
    let safeCons: string[] = [];
    
    if (includeProsCons) {
        const parsedPros = Array.isArray(parsed.pros) ? parsed.pros : [];
        const parsedCons = Array.isArray(parsed.cons) ? parsed.cons : [];
        const fallbackPros = Array.isArray(research.pros) ? research.pros : [];
        const fallbackProsFromFeatures = Array.isArray(research.keyFeatures)
            ? research.keyFeatures.map(f => String(f)).filter(Boolean)
            : [];

        const fallbackProsFromInfosheet = buildFallbackProsFromInfosheet(research, config.language);

        safePros =
            parsedPros.length > 0
                ? parsedPros
                : (
                    fallbackPros.length > 0
                        ? fallbackPros
                        : (fallbackProsFromFeatures.length > 0 ? fallbackProsFromFeatures.slice(0, 3) : fallbackProsFromInfosheet)
                );

        safeCons = safePros.length > parsedCons.length
            ? parsedCons
            : parsedCons.slice(0, Math.max(0, safePros.length - 1));
    }

    const overviewHtml = ensureInTextCitations(parsed.overview || '', research.citations, 2);
    const verdictHtml = includeVerdict ? ensureInTextCitations(parsed.verdict || '', research.citations, 1) : '';

    return {
        platformName: research.name,
        overview: overviewHtml,
        infosheet: research.infosheet,
        ratings: includeRatings ? (parsed.ratings || []) : [],
        pros: safePros,
        cons: safeCons,
        verdict: verdictHtml,
        affiliateUrl,
        citations: research.citations
    };
};

/**
 * Generate consistent ratings for ALL platforms together in one call.
 * This ensures relative scores are meaningful across platforms researched in different sessions.
 */
export const generateBatchRatings = async (
    cachedReviews: { platformName: string; infosheet: PlatformInfosheet; pros: string[]; cons: string[] }[],
    config: ArticleConfig
): Promise<{ platformName: string; ratings: RatingCategory[] }[]> => {
    const verticalConfig = getVerticalConfig(config.vertical || 'gambling');
    const langInstruction = getLanguageInstruction(config.language, 'review');
    
    const scoringCategoriesText = verticalConfig.scoringCategories
        .map((cat, idx) => `${idx + 1}. ${cat.label} - Score based on: ${cat.description}`)
        .join('\n');
    
    const platformSummaries = cachedReviews.map(review => {
        const info = review.infosheet as Record<string, any>;
        return `**${review.platformName}:**
- Pros: ${review.pros.join(', ')}
- Cons: ${review.cons.join(', ')}
- Key info: ${Object.entries(info).filter(([k, v]) => v && k !== 'dataSource' && k !== 'retrievedAt').map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ')}`;
    }).join('\n\n');

    const prompt = `You are an impartial ${verticalConfig.name.toLowerCase()} industry analyst. Rate ALL platforms below using the SAME scoring criteria for consistency.

${langInstruction}

**IMPORTANT - COMPARATIVE RATING:**
You must rate all ${cachedReviews.length} platforms TOGETHER so that scores are RELATIVE and COMPARABLE.
If Platform A has better security than Platform B, Platform A should score higher in Security.
Use the full 1-10 scale - not all platforms deserve 7-8.

**SCORING METHODOLOGY (apply strictly to ALL platforms):**
- **10 (Exceptional):** Industry-leading, best among these platforms
- **8-9 (Very Good to Excellent):** Above average, strong performance
- **6-7 (Good to Adequate):** Meets expectations, some limitations
- **4-5 (Below Average):** Notable gaps or issues
- **1-3 (Poor):** Significant problems, not recommended

**Rating Categories:**
${scoringCategoriesText}

**Platforms to Rate:**
${platformSummaries}

Rate each platform across all ${verticalConfig.scoringCategories.length} categories. Be honest and differentiate between platforms.

Return JSON format:
{
  "platformRatings": [
    {
      "platformName": "...",
      "ratings": [{ "category": "...", "score": 8 }]
    }
  ]
}`;

    const response = await withRetry(() => callOpenRouterContent(prompt));
    const parsed = parseJsonResponse<{ platformRatings: { platformName: string; ratings: RatingCategory[] }[] }>(response);
    return parsed.platformRatings || [];
};

/**
 * Assemble article from cached reviews - Phase 2 of two-phase workflow.
 * Generates batch ratings, comparison table, intro, and FAQs from cached data.
 */
export const assembleArticleFromCache = async (
    config: ArticleConfig,
    onProgress?: (phase: string, detail?: string) => void
): Promise<GeneratedArticle | null> => {
    const vertical = config.vertical || 'gambling';
    const cachedReviews = getCachedReviews(vertical);
    
    if (cachedReviews.length < 3) {
        console.warn('Not enough cached reviews to assemble article');
        return null;
    }
    
    // Get cached research for citations and full data
    const researchCache = getCachedPlatformNames(vertical);
    const allCitations: Citation[] = [];
    const platformResearch: PlatformResearch[] = [];
    
    for (const review of cachedReviews) {
        allCitations.push(...review.citations);
        // Get original research if available
        const research = getFromResearchCache(review.platformName, vertical);
        if (research) {
            platformResearch.push(research);
        }
    }
    
    const dedupedCitations = deduplicateCitations(allCitations);
    
    // Step 1: Generate batch ratings for consistency
    onProgress?.('generating-ratings', 'Rating all platforms together...');
    let batchRatings: { platformName: string; ratings: RatingCategory[] }[] = [];
    
    if (config.includeSections?.platformRatings !== false) {
        batchRatings = await generateBatchRatings(
            cachedReviews.map(r => ({
                platformName: r.platformName,
                infosheet: r.infosheet,
                pros: r.pros,
                cons: r.cons
            })),
            config
        );
    }
    
    // Step 2: Build platform reviews with consistent ratings
    const platformReviews: PlatformReview[] = cachedReviews.map(cached => {
        const ratings = batchRatings.find(r => 
            r.platformName.toLowerCase() === cached.platformName.toLowerCase()
        )?.ratings || [];
        
        const platformInput = config.platforms.find(p => 
            p.name.toLowerCase() === cached.platformName.toLowerCase()
        );
        
        return {
            platformName: cached.platformName,
            overview: cached.overview,
            infosheet: cached.infosheet,
            ratings,
            pros: cached.pros,
            cons: cached.cons,
            verdict: cached.verdict,
            affiliateUrl: platformInput?.affiliateUrl || cached.affiliateUrl,
            citations: cached.citations
        };
    });
    
    // Step 3: Generate platform quick list
    const platformQuickList = cachedReviews.map(r => ({
        name: r.platformName,
        shortDescription: r.overview.replace(/<[^>]*>/g, '').substring(0, 150) + '...'
    }));
    
    // Step 4: Generate introduction
    onProgress?.('generating-intro', 'Writing introduction...');
    const intro = await generateIntroduction(config, platformQuickList, dedupedCitations);
    
    // Step 5: Generate comparison table
    let comparisonTable: ComparisonTableRow[] = [];
    if (config.includeSections?.comparisonTable !== false && platformResearch.length > 0) {
        onProgress?.('generating-comparison', 'Building comparison table...');
        comparisonTable = await generateComparisonTable(platformResearch, config);
    }
    
    // Step 6: Generate FAQs
    let faqs: FAQ[] = [];
    if (config.includeSections?.faqs !== false && platformResearch.length > 0) {
        onProgress?.('generating-faqs', 'Generating FAQs...');
        faqs = await generateFAQs(platformResearch, config);
    }
    
    // Step 7: Generate SEO metadata
    onProgress?.('generating-seo', 'Generating SEO metadata...');
    const seoMetadata = platformResearch.length > 0 
        ? await generateSeoMetadata(platformResearch, config)
        : undefined;
    
    return {
        intro,
        platformQuickList,
        comparisonTable,
        platformReviews,
        additionalSections: [],
        faqs,
        allCitations: dedupedCitations,
        seoMetadata
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

    const response = await withRetry(() => callOpenRouterContent(prompt));
    const parsed = parseJsonResponse<{ faqs: FAQ[] }>(response);
    return (parsed.faqs || []).map(faq => ({
        ...faq,
        answer: ensureInTextCitations(faq.answer, faqCitations, 1)
    }));
};

// --- SEO Metadata Generation ---

const getLanguageName = (lang: Language): string => {
    const names: Record<Language, string> = {
        [Language.ENGLISH]: 'English',
        [Language.THAI]: 'Thai',
        [Language.VIETNAMESE]: 'Vietnamese',
        [Language.JAPANESE]: 'Japanese',
        [Language.KOREAN]: 'Korean'
    };
    return names[lang] || 'English';
};

export const generateSeoMetadata = async (
    platformResearch: PlatformResearch[],
    config: ArticleConfig
): Promise<SeoMetadata> => {
    const verticalConfig = getVerticalConfig(config.vertical || 'gambling');
    const platformNames = platformResearch.map(p => p.name).join(', ');
    const languageName = getLanguageName(config.language);
    const primaryKeyword = config.targetKeywords?.[0]?.keyword || config.introNarrative || platformNames;
    
    const prompt = `Generate SEO metadata for an evergreen ${verticalConfig.name.toLowerCase()} review article about: ${platformNames}

**Article Context:** ${config.introNarrative || `Comprehensive review of ${platformNames}`}
**Primary Keyword:** ${primaryKeyword}
**Content Vertical:** ${verticalConfig.name}
**Target Language for Title, Meta Description, Alt Text:** ${languageName}

Generate the following SEO-optimized metadata:

1. **title**: SEO-optimized page title (50-60 characters max)
   - Include primary keyword near the beginning
   - Make it compelling and click-worthy
   - Include current year for freshness signals
   - Write in ${languageName}

2. **metaDescription**: Meta description (150-160 characters max)
   - Summarize key value proposition
   - Include primary keyword naturally
   - Add a call-to-action element
   - Write in ${languageName}

3. **slug**: URL-friendly slug (ALWAYS in English, regardless of target language)
   - Lowercase, hyphenated
   - Include main keyword
   - Keep under 60 characters
   - Example format: "best-crypto-exchanges-2024" or "top-online-casinos-review"

4. **imagePrompt**: AI image generation prompt (ALWAYS in English)
   - Describe a professional, relevant featured image
   - Include style guidance (modern, professional, etc.)
   - Mention composition and mood
   - Should work for ${verticalConfig.name.toLowerCase()} content

5. **imageAltText**: Descriptive alt text for accessibility and SEO
   - Write in ${languageName}
   - Describe the image content
   - Include primary keyword naturally
   - Keep under 125 characters

Return JSON:
{
  "title": "...",
  "metaDescription": "...",
  "slug": "...",
  "imagePrompt": "...",
  "imageAltText": "..."
}`;

    const response = await withRetry(() => callOpenRouterContent(prompt));
    const parsed = parseJsonResponse<SeoMetadata>(response);
    
    // Ensure slug is lowercase and properly formatted
    const cleanSlug = (parsed.slug || 'article')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    return {
        title: parsed.title || '',
        metaDescription: parsed.metaDescription || '',
        slug: cleanSlug,
        imagePrompt: parsed.imagePrompt || '',
        imageAltText: parsed.imageAltText || ''
    };
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
        // Use OpenRouter for SERP analysis (note: no real-time search, uses training data)
        const response = await withRetry(() => callOpenRouterContent(prompt));
        const parsed = parseJsonResponse<{ competitors: SerpCompetitor[] }>(response);
        return (parsed.competitors || []).slice(0, maxResults).map((c: any, i: number) => ({
            rank: c.rank || i + 1,
            domain: c.domain || 'unknown',
            url: c.url || `https://${c.domain}`,
            title: c.title || '',
            metaDesc: c.metaDesc || c.metaDescription || '',
            headings: Array.isArray(c.headings) ? c.headings : []
        }));
    } catch (error) {
        console.error('Failed to analyze SERP competitors:', error);
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
        const response = await withRetry(() => callOpenRouterContent(prompt, false));
        return response?.trim() || getDefaultDisclaimer(language);
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
        const response = await withRetry(() => callOpenRouterContent(prompt));
        const parsed = parseJsonResponse<{ sections: string[] }>(response);
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
        const response = await withRetry(() => callOpenRouterContent(prompt, false));
        let content = response || '';
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
        comparisonTable = await generateComparisonTable(platformResearch, config);
    }

    onProgress?.('generating-reviews');
    const platformReviews: PlatformReview[] = [];
    const vertical = config.vertical || 'gambling';
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
        
        // Save review to cache for two-phase workflow
        saveReviewToCache(review, vertical);
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

    // Generate SEO metadata
    onProgress?.('generating-seo', 'Generating SEO metadata...');
    const seoMetadata = await generateSeoMetadata(platformResearch, config);

    return {
        intro,
        platformQuickList,
        comparisonTable,
        platformReviews,
        additionalSections,
        faqs,
        allCitations,
        seoMetadata
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
    const vertical = config.vertical || 'gambling';
    
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
        
        // Save review to cache for two-phase workflow
        saveReviewToCache(review, vertical);
    }

    return {
        platformResearch,
        platformReviews
    };
};
