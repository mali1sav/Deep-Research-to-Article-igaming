import { VerticalConfig } from './types';

export const cryptoConfig: VerticalConfig = {
    id: 'crypto',
    name: 'Cryptocurrency',
    description: 'Exchanges, wallets, and DeFi platforms',
    
    platformTerm: 'platform',
    platformTermPlural: 'platforms',
    
    infosheetFields: [
        {
            key: 'headquarters',
            label: 'Headquarters',
            type: 'string',
            researchPrompt: 'Where the company is headquartered or registered',
            example: 'San Francisco, USA'
        },
        {
            key: 'founded',
            label: 'Founded',
            type: 'string',
            researchPrompt: 'Year the platform was established',
            example: '2012'
        },
        {
            key: 'regulation',
            label: 'Regulation',
            type: 'string',
            researchPrompt: 'Regulatory licenses and compliance (e.g., "SEC registered", "FCA regulated", "No regulation")',
            example: 'SEC, FinCEN registered'
        },
        {
            key: 'supportedCoins',
            label: 'Supported Coins',
            type: 'string',
            researchPrompt: 'Number of cryptocurrencies supported',
            example: '350+ cryptocurrencies'
        },
        {
            key: 'tradingFees',
            label: 'Trading Fees',
            type: 'string',
            researchPrompt: 'Maker/taker fee structure',
            example: '0.1% maker / 0.1% taker'
        },
        {
            key: 'withdrawalFees',
            label: 'Withdrawal Fees',
            type: 'string',
            researchPrompt: 'Typical withdrawal fee structure',
            example: 'Network fees only'
        },
        {
            key: 'securityFeatures',
            label: 'Security',
            type: 'string',
            researchPrompt: 'Key security features (cold storage, 2FA, insurance)',
            example: '98% cold storage, 2FA, $250M insurance'
        },
        {
            key: 'kycRequirement',
            label: 'KYC Requirement',
            type: 'string',
            researchPrompt: 'Identity verification requirements',
            example: 'Required for fiat, optional for crypto-only'
        },
        {
            key: 'stakingAvailable',
            label: 'Staking',
            type: 'string',
            researchPrompt: 'Whether staking/earning features are available and typical APY',
            example: 'Yes, up to 12% APY'
        }
    ],
    
    scoringCategories: [
        {
            key: 'coinSelection',
            label: 'Coin Selection',
            description: 'Variety of cryptocurrencies and trading pairs available'
        },
        {
            key: 'userExperience',
            label: 'User Experience',
            description: 'Platform usability, mobile app, and interface design'
        },
        {
            key: 'fees',
            label: 'Fees',
            description: 'Competitiveness of trading, withdrawal, and deposit fees'
        },
        {
            key: 'security',
            label: 'Security',
            description: 'Security measures, insurance, and track record'
        },
        {
            key: 'customerSupport',
            label: 'Customer Support',
            description: 'Quality and availability of support channels'
        },
        {
            key: 'stakingEarning',
            label: 'Staking & Earning',
            description: 'Passive income options, APY rates, and DeFi features'
        }
    ],
    
    researchContext: 'You are a cryptocurrency industry research analyst. Research the crypto exchange/wallet/DeFi platform',
    searchSuffix: 'cryptocurrency crypto platform',  // Helps disambiguate platform names from gambling sites
    
    comparisonColumns: ['Regulation', 'Trading Fees', 'Supported Coins', 'Rating'],
    
    disclaimerTitle: '⚠️ Cryptocurrency Risk Warning',
    disclaimerText: 'Cryptocurrency investments are highly volatile and risky. You could lose some or all of your investment. Past performance is not indicative of future results. Only invest what you can afford to lose. This content is for informational purposes only and does not constitute financial advice. Always do your own research (DYOR) before making any investment decisions. Cryptocurrency may not be regulated in your jurisdiction.',
    
    ctaPrefix: 'Try'
};
