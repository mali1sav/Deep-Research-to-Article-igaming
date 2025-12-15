/**
 * Test file for OpenRouter Deep Research Model
 * Model: alibaba/tongyi-deepresearch-30b-a3b
 * 
 * Run with: npx tsx test-openrouter-research.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
    console.error('❌ Missing OPENROUTER_API_KEY or VITE_OPENROUTER_API_KEY in .env');
    process.exit(1);
}

const PLATFORM_TO_TEST = 'BK8';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    reasoning_details?: any;
}

interface OpenRouterResponse {
    choices: {
        message: {
            content: string;
            reasoning_details?: any;
        };
    }[];
}

async function callDeepResearch(messages: Message[], enableReasoning = true): Promise<OpenRouterResponse> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "Gambling Research Test"
        },
        body: JSON.stringify({
            "model": "alibaba/tongyi-deepresearch-30b-a3b",
            "messages": messages,
            ...(enableReasoning && { "reasoning": { "enabled": true } })
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    return response.json();
}

async function testGamblingPlatformResearch() {
    console.log('🔬 Testing OpenRouter Deep Research Model');
    console.log('📍 Model: alibaba/tongyi-deepresearch-30b-a3b');
    console.log(`🎰 Platform: ${PLATFORM_TO_TEST}`);
    console.log('─'.repeat(60));

    const researchPrompt = `You are a gambling industry research analyst. Research the online gambling/casino platform "${PLATFORM_TO_TEST}" and provide comprehensive, factual information.

Find and report REAL DATA for:
1. **License**: Which gaming authority issued the license (e.g., "Curacao eGaming", "Malta Gaming Authority", "PAGCOR")
2. **Country**: Where the company is headquartered or registered
3. **Company**: The actual company name that operates the platform
4. **Year Established**: When the platform launched
5. **Minimum Deposit**: Actual minimum deposit amount (e.g., "$10", "€20")
6. **Payout Speed**: Typical withdrawal timeframe (e.g., "24-48 hours", "1-3 business days")
7. **Supported Currencies**: List of currencies accepted
8. **Payment Methods**: List of deposit/withdrawal methods
9. **Key Features**: 3-5 notable features of this platform
10. **Pros**: Genuine advantages based on user reviews (3-6 items)
11. **Cons**: Genuine disadvantages based on user reviews (2-5 items)

IMPORTANT:
- Search thoroughly and provide actual data you find
- If you cannot find specific information, state "Not publicly disclosed" instead of making up data
- Include sources where you found the information

Format your response as JSON with this structure:
{
    "shortDescription": "1-2 sentence description",
    "infosheet": {
        "license": "...",
        "country": "...",
        "company": "...",
        "yearEstablished": "...",
        "minDeposit": "...",
        "payoutSpeed": "...",
        "supportedCurrencies": ["..."],
        "paymentMethods": ["..."]
    },
    "keyFeatures": ["..."],
    "pros": ["..."],
    "cons": ["..."],
    "sources": ["URLs or source names where you found this info"]
}`;

    try {
        console.log('\n📤 Sending initial research request...\n');
        const startTime = Date.now();

        // First API call with reasoning
        const result1 = await callDeepResearch([
            { role: 'user', content: researchPrompt }
        ]);

        const assistantMessage = result1.choices[0].message;
        console.log('⏱️  First response received in', ((Date.now() - startTime) / 1000).toFixed(1), 'seconds');
        
        if (assistantMessage.reasoning_details) {
            console.log('\n🧠 Reasoning details available:', 
                typeof assistantMessage.reasoning_details === 'string' 
                    ? assistantMessage.reasoning_details.substring(0, 500) + '...'
                    : JSON.stringify(assistantMessage.reasoning_details).substring(0, 500) + '...'
            );
        }

        console.log('\n📥 Initial Response:');
        console.log('─'.repeat(60));
        console.log(assistantMessage.content);
        console.log('─'.repeat(60));

        // Second API call - follow-up to verify data
        console.log('\n📤 Sending verification follow-up...\n');
        const verifyStartTime = Date.now();

        const messages: Message[] = [
            { role: 'user', content: researchPrompt },
            { 
                role: 'assistant', 
                content: assistantMessage.content,
                reasoning_details: assistantMessage.reasoning_details
            },
            { 
                role: 'user', 
                content: `Please verify the information above is accurate. If any fields show "Unknown" or "Not publicly disclosed", try harder to find the actual data. Also confirm:
                
1. Is the license information correct?
2. What is the actual minimum deposit?
3. What payment methods are available in Asia?

Provide your final verified JSON response.`
            }
        ];

        const result2 = await callDeepResearch(messages);
        console.log('⏱️  Verification response received in', ((Date.now() - verifyStartTime) / 1000).toFixed(1), 'seconds');

        console.log('\n📥 Verified Response:');
        console.log('─'.repeat(60));
        console.log(result2.choices[0].message.content);
        console.log('─'.repeat(60));

        // Try to parse the final JSON
        console.log('\n🔍 Attempting to parse JSON...');
        try {
            const content = result2.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log('\n✅ Successfully parsed JSON:');
                console.log(JSON.stringify(parsed, null, 2));
                
                // Quality check
                console.log('\n📊 Data Quality Check:');
                const infosheet = parsed.infosheet || {};
                const fields = ['license', 'country', 'company', 'yearEstablished', 'minDeposit', 'payoutSpeed'];
                let knownCount = 0;
                fields.forEach(field => {
                    const value = infosheet[field] || 'Missing';
                    const isKnown = value !== 'Unknown' && value !== 'Not publicly disclosed' && value !== 'Missing';
                    console.log(`  ${isKnown ? '✅' : '❌'} ${field}: ${value}`);
                    if (isKnown) knownCount++;
                });
                console.log(`\n📈 Data completeness: ${knownCount}/${fields.length} fields populated`);
            } else {
                console.log('⚠️  No JSON found in response');
            }
        } catch (parseError) {
            console.log('⚠️  Could not parse JSON:', parseError);
        }

        console.log('\n✅ Test completed successfully!');
        console.log(`⏱️  Total time: ${((Date.now() - startTime) / 1000).toFixed(1)} seconds`);

    } catch (error) {
        console.error('\n❌ Test failed:', error);
    }
}

// Run the test
testGamblingPlatformResearch();
