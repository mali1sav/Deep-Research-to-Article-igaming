/**
 * Test file for Crypto Mining Platform Research
 * Tests: ECOS, Binance Cloud Mining, Kryptex
 * 
 * Purpose: Diagnose 503 errors and test query simplification
 * Run with: npx tsx test-crypto-mining-research.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
    console.error('❌ Missing OPENROUTER_API_KEY or VITE_OPENROUTER_API_KEY in .env');
    process.exit(1);
}

// Platforms to test
const PLATFORMS = ['ECOS', 'Binance Cloud Mining', 'Kryptex'];

// Test configuration
const TEST_CONFIG = {
    useSimplifiedQuery: false,  // Toggle to test simplified vs full query
    skipVerification: false,    // Enable verification (2nd API call) - matches production
    delayBetweenPlatforms: 5000, // 5 seconds between platforms
    maxRetries: 3,
    retryDelayMs: 10000,        // 10 seconds retry delay for 503
};

interface Message {
    role: 'user' | 'assistant';
    content: string;
    reasoning_details?: any;
}

interface TestResult {
    platform: string;
    success: boolean;
    duration: number;
    retries: number;
    error?: string;
    dataQuality?: {
        fieldsFound: number;
        totalFields: number;
        fields: Record<string, { value: string; found: boolean }>;
    };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callDeepResearch(messages: Message[], enableReasoning = true): Promise<any> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "Crypto Mining Research Test"
        },
        body: JSON.stringify({
            model: "alibaba/tongyi-deepresearch-30b-a3b",
            messages: messages,
            ...(enableReasoning && { reasoning: { enabled: true } }),
            // Try AtlasCloud provider first
            provider: {
                order: ["atlas-cloud"],
                allow_fallbacks: true
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status} - ${errorText}`);
    }

    return response.json();
}

// SIMPLIFIED query - minimal fields, shorter prompt
function buildSimplifiedPrompt(platformName: string): string {
    return `Research "${platformName}" crypto cloud mining platform. Find:
1. Company/Headquarters
2. Year founded
3. Mining types offered (BTC, ETH, etc.)
4. Minimum investment
5. Contract duration options
6. 2-3 Pros
7. 2-3 Cons

Return JSON:
{
    "company": "...",
    "founded": "...",
    "miningTypes": ["..."],
    "minInvestment": "...",
    "contractDuration": "...",
    "pros": ["..."],
    "cons": ["..."]
}`;
}

// FULL query - matches production prompt style
function buildFullPrompt(platformName: string): string {
    return `You are a cryptocurrency industry research analyst. Research the crypto cloud mining platform "${platformName}" and provide comprehensive, factual information.

**CRITICAL SEARCH CONTEXT**: You are researching "${platformName}" as a cryptocurrency cloud mining platform. 
Search for: "${platformName} cryptocurrency crypto cloud mining platform"
DO NOT confuse this with platforms in other industries.

Find and report REAL DATA for:
1. **Headquarters**: Where the company is headquartered or registered (e.g., "San Francisco, USA")
2. **Founded**: Year the platform was established (e.g., "2012")
3. **Regulation**: Regulatory licenses and compliance (e.g., "SEC registered", "FCA regulated", "No regulation")
4. **Supported Coins**: Cryptocurrencies available for mining (e.g., "BTC, ETH, LTC")
5. **Mining Fees**: Fee structure for cloud mining (e.g., "Maintenance fee: $0.05/TH/day")
6. **Minimum Investment**: Minimum amount to start mining (e.g., "$100")
7. **Contract Duration**: Available contract lengths (e.g., "1 year, 2 years, lifetime")
8. **Security**: Key security features (e.g., "2FA, SSL encryption")
9. **Payout Frequency**: How often mining rewards are paid (e.g., "Daily", "Weekly")
10. **Key Features**: 3-5 notable features of this platform
11. **Pros**: Genuine advantages based on user reviews (3-6 items)
12. **Cons**: Genuine disadvantages based on user reviews (2-5 items)

IMPORTANT:
- Search thoroughly and provide actual data you find
- If you cannot find specific information, state "Not publicly disclosed"

**STRICT CITATION RULES**:
- ONLY include URLs that you actually visited and verified exist
- DO NOT hallucinate or make up URLs
- Maximum 3-5 high-quality, verified sources

Format your response as JSON:
{
    "shortDescription": "1-2 sentence description",
    "infosheet": {
        "headquarters": "...",
        "founded": "...",
        "regulation": "...",
        "supportedCoins": "...",
        "miningFees": "...",
        "minInvestment": "...",
        "contractDuration": "...",
        "security": "...",
        "payoutFrequency": "..."
    },
    "keyFeatures": ["..."],
    "pros": ["..."],
    "cons": ["..."],
    "sources": ["https://verified-url.com"]
}`;
}

async function researchPlatformWithRetry(platformName: string): Promise<TestResult> {
    const startTime = Date.now();
    let retries = 0;
    let lastError = '';

    const prompt = TEST_CONFIG.useSimplifiedQuery 
        ? buildSimplifiedPrompt(platformName)
        : buildFullPrompt(platformName);

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🔬 Testing: ${platformName}`);
    console.log(`📝 Query type: ${TEST_CONFIG.useSimplifiedQuery ? 'SIMPLIFIED' : 'FULL'}`);
    console.log(`🔄 Verification: ${TEST_CONFIG.skipVerification ? 'SKIPPED' : 'ENABLED'}`);

    while (retries <= TEST_CONFIG.maxRetries) {
        try {
            console.log(`\n📤 Attempt ${retries + 1}/${TEST_CONFIG.maxRetries + 1}...`);
            
            // First API call
            const result1 = await callDeepResearch([
                { role: 'user', content: prompt }
            ]);

            const response1Time = Date.now() - startTime;
            console.log(`⏱️  First response: ${(response1Time / 1000).toFixed(1)}s`);

            let finalContent = result1.choices[0].message.content;

            // Optional verification call
            if (!TEST_CONFIG.skipVerification) {
                console.log(`📤 Sending verification...`);
                const verifyStart = Date.now();
                
                const result2 = await callDeepResearch([
                    { role: 'user', content: prompt },
                    { 
                        role: 'assistant', 
                        content: result1.choices[0].message.content,
                        reasoning_details: result1.choices[0].message.reasoning_details
                    },
                    { role: 'user', content: 'Verify and provide final JSON.' }
                ]);
                
                console.log(`⏱️  Verification: ${((Date.now() - verifyStart) / 1000).toFixed(1)}s`);
                finalContent = result2.choices[0].message.content;
            }

            // Parse and analyze result
            const duration = Date.now() - startTime;
            const dataQuality = analyzeDataQuality(finalContent, TEST_CONFIG.useSimplifiedQuery);

            console.log(`\n✅ Success for ${platformName}`);
            console.log(`⏱️  Total time: ${(duration / 1000).toFixed(1)}s`);
            console.log(`📊 Data quality: ${dataQuality.fieldsFound}/${dataQuality.totalFields} fields found`);

            return {
                platform: platformName,
                success: true,
                duration,
                retries,
                dataQuality
            };

        } catch (error: any) {
            lastError = error.message;
            const is503 = lastError.includes('503') || lastError.toLowerCase().includes('overloaded');
            
            console.log(`❌ Error: ${lastError.substring(0, 100)}...`);
            
            if (is503 && retries < TEST_CONFIG.maxRetries) {
                retries++;
                console.log(`⏳ 503 detected. Waiting ${TEST_CONFIG.retryDelayMs / 1000}s before retry...`);
                await sleep(TEST_CONFIG.retryDelayMs);
            } else {
                break;
            }
        }
    }

    return {
        platform: platformName,
        success: false,
        duration: Date.now() - startTime,
        retries,
        error: lastError
    };
}

function analyzeDataQuality(content: string, simplified: boolean): TestResult['dataQuality'] {
    const fields: Record<string, { value: string; found: boolean }> = {};
    
    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return { fieldsFound: 0, totalFields: 0, fields };
        }
        
        const parsed = JSON.parse(jsonMatch[0]);
        
        const checkFields = simplified 
            ? ['company', 'founded', 'miningTypes', 'minInvestment', 'contractDuration', 'pros', 'cons']
            : ['headquarters', 'founded', 'regulation', 'supportedCoins', 'miningFees', 'minInvestment', 'contractDuration', 'security', 'payoutFrequency'];
        
        const data = simplified ? parsed : (parsed.infosheet || parsed);
        
        let found = 0;
        for (const field of checkFields) {
            const value = data[field];
            const hasValue = value && 
                String(value).toLowerCase() !== 'unknown' && 
                String(value).toLowerCase() !== 'not publicly disclosed' &&
                (Array.isArray(value) ? value.length > 0 : true);
            
            fields[field] = {
                value: Array.isArray(value) ? value.join(', ') : String(value || 'Missing'),
                found: hasValue
            };
            
            if (hasValue) found++;
        }
        
        return { fieldsFound: found, totalFields: checkFields.length, fields };
    } catch {
        return { fieldsFound: 0, totalFields: 0, fields };
    }
}

async function runTests() {
    console.log('═'.repeat(60));
    console.log('🔬 CRYPTO MINING PLATFORM RESEARCH TEST');
    console.log('═'.repeat(60));
    console.log(`\n📋 Configuration:`);
    console.log(`   • Query type: ${TEST_CONFIG.useSimplifiedQuery ? 'SIMPLIFIED' : 'FULL'}`);
    console.log(`   • Verification step: ${TEST_CONFIG.skipVerification ? 'SKIPPED' : 'ENABLED'}`);
    console.log(`   • Delay between platforms: ${TEST_CONFIG.delayBetweenPlatforms / 1000}s`);
    console.log(`   • Max retries per platform: ${TEST_CONFIG.maxRetries}`);
    console.log(`\n📦 Platforms to test: ${PLATFORMS.join(', ')}`);
    
    const results: TestResult[] = [];
    const overallStart = Date.now();
    
    for (let i = 0; i < PLATFORMS.length; i++) {
        const platform = PLATFORMS[i];
        
        // Add delay between platforms (except first)
        if (i > 0) {
            console.log(`\n⏳ Waiting ${TEST_CONFIG.delayBetweenPlatforms / 1000}s before next platform...`);
            await sleep(TEST_CONFIG.delayBetweenPlatforms);
        }
        
        const result = await researchPlatformWithRetry(platform);
        results.push(result);
    }
    
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('═'.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalRetries = results.reduce((sum, r) => sum + r.retries, 0);
    
    console.log(`\n✅ Successful: ${successful.length}/${PLATFORMS.length}`);
    console.log(`❌ Failed: ${failed.length}/${PLATFORMS.length}`);
    console.log(`🔄 Total retries needed: ${totalRetries}`);
    console.log(`⏱️  Total test time: ${((Date.now() - overallStart) / 1000).toFixed(1)}s`);
    
    console.log('\n📋 Per-Platform Results:');
    for (const result of results) {
        const status = result.success ? '✅' : '❌';
        const time = (result.duration / 1000).toFixed(1);
        const quality = result.dataQuality 
            ? `${result.dataQuality.fieldsFound}/${result.dataQuality.totalFields} fields` 
            : 'N/A';
        
        console.log(`\n${status} ${result.platform}`);
        console.log(`   Duration: ${time}s | Retries: ${result.retries} | Data: ${quality}`);
        
        if (result.error) {
            console.log(`   Error: ${result.error.substring(0, 80)}...`);
        }
        
        if (result.dataQuality?.fields) {
            console.log('   Fields:');
            for (const [field, info] of Object.entries(result.dataQuality.fields)) {
                const icon = info.found ? '✓' : '✗';
                const value = info.value.length > 50 ? info.value.substring(0, 47) + '...' : info.value;
                console.log(`      ${icon} ${field}: ${value}`);
            }
        }
    }
    
    // Recommendations
    console.log('\n' + '─'.repeat(60));
    console.log('💡 RECOMMENDATIONS:');
    
    if (failed.length > 0) {
        const has503 = failed.some(f => f.error?.includes('503'));
        if (has503) {
            console.log('   • 503 errors detected - model is overloaded');
            console.log('   • Try: Increase delay between requests to 10-15 seconds');
            console.log('   • Try: Use simplified queries (fewer fields)');
            console.log('   • Try: Skip verification step (single API call)');
            console.log('   • Try: Research platforms one at a time with manual delay');
        }
    }
    
    if (successful.length > 0) {
        const avgTime = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
        console.log(`   • Average successful request: ${(avgTime / 1000).toFixed(1)}s`);
        
        const avgQuality = successful.reduce((sum, r) => sum + (r.dataQuality?.fieldsFound || 0), 0) / successful.length;
        console.log(`   • Average data completeness: ${avgQuality.toFixed(1)} fields`);
    }
    
    console.log('\n═'.repeat(60));
}

// Run
runTests().catch(console.error);
