import { VerticalConfig } from './types';

export const gamblingConfig: VerticalConfig = {
    id: 'gambling',
    name: 'Online Gambling',
    description: 'Casinos, sportsbooks, and betting platforms',
    
    platformTerm: 'casino',
    platformTermPlural: 'casinos',
    
    infosheetFields: [
        {
            key: 'license',
            label: 'License',
            type: 'string',
            researchPrompt: 'Which gaming authority issued the license (e.g., "Curacao eGaming", "Malta Gaming Authority", "PAGCOR")',
            example: 'Curacao eGaming'
        },
        {
            key: 'country',
            label: 'Country',
            type: 'string',
            researchPrompt: 'Where the company is headquartered or registered',
            example: 'Malta'
        },
        {
            key: 'company',
            label: 'Company',
            type: 'string',
            researchPrompt: 'The actual company name that operates the platform',
            example: 'Dama N.V.'
        },
        {
            key: 'minDeposit',
            label: 'Min Deposit',
            type: 'string',
            researchPrompt: 'Actual minimum deposit amount',
            example: '$10'
        },
        {
            key: 'payoutSpeed',
            label: 'Payout Speed',
            type: 'string',
            researchPrompt: 'Typical withdrawal timeframe',
            example: '24-48 hours'
        },
        {
            key: 'supportedCurrencies',
            label: 'Currencies',
            type: 'array',
            researchPrompt: 'List of currencies accepted',
            example: 'USD, EUR, BTC'
        },
        {
            key: 'paymentMethods',
            label: 'Payment Methods',
            type: 'array',
            researchPrompt: 'List of deposit/withdrawal methods',
            example: 'Visa, Mastercard, Bitcoin, Bank Transfer'
        },
        {
            key: 'kycRequirement',
            label: 'KYC Requirement',
            type: 'string',
            researchPrompt: 'Whether KYC verification is required',
            example: 'Required before first withdrawal'
        },
        {
            key: 'welcomeBonus',
            label: 'Welcome Bonus',
            type: 'string',
            researchPrompt: 'Current welcome bonus offer',
            example: '100% up to $500 + 50 free spins'
        }
    ],
    
    scoringCategories: [
        {
            key: 'paymentMethods',
            label: 'Payment Methods',
            description: 'Variety and convenience of deposit/withdrawal options'
        },
        {
            key: 'userExperience',
            label: 'User Experience',
            description: 'Website/app usability, design, and navigation'
        },
        {
            key: 'withdrawalSpeed',
            label: 'Withdrawal Speed',
            description: 'How fast withdrawals are processed'
        },
        {
            key: 'gameSelection',
            label: 'Game Selection',
            description: 'Variety and quality of games available'
        },
        {
            key: 'customerSupport',
            label: 'Customer Support',
            description: 'Quality and availability of support channels'
        },
        {
            key: 'bonusesPromotions',
            label: 'Bonuses & Promotions',
            description: 'Value and fairness of bonus offers'
        }
    ],
    
    researchContext: 'You are a gambling industry research analyst. Research the online gambling/casino platform',
    
    disclaimerTitle: '⚠️ Responsible Gambling',
    disclaimerText: 'Gambling involves risk and should be done responsibly. Please only gamble with money you can afford to lose. If you or someone you know has a gambling problem, please seek help from professional organizations. Many jurisdictions have support services available 24/7. You must be of legal gambling age in your jurisdiction to participate in online gambling activities.',
    
    ctaPrefix: 'Visit'
};
