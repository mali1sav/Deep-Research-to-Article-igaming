import { VerticalConfig } from './types';

export const walletConfig: VerticalConfig = {
    id: 'wallet',
    name: 'Crypto Wallet',
    description: 'Hardware, software, and mobile crypto wallets',
    
    platformTerm: 'wallet',
    platformTermPlural: 'wallets',
    
    infosheetFields: [
        {
            key: 'type',
            label: 'Type',
            type: 'string',
            researchPrompt: 'Wallet type: Hardware, Desktop, Mobile, Web, Browser Extension, or Paper',
            example: 'Hardware wallet'
        },
        {
            key: 'custody',
            label: 'Custody',
            type: 'string',
            researchPrompt: 'Custody model: Non-custodial (self-custody), Custodial, or Multi-sig',
            example: 'Non-custodial (self-custody)'
        },
        {
            key: 'supportedChains',
            label: 'Supported Chains',
            type: 'string',
            researchPrompt: 'Which blockchains are supported (Bitcoin, Ethereum, Solana, etc.) and approximate number',
            example: 'Bitcoin, Ethereum, 5000+ tokens'
        },
        {
            key: 'openSource',
            label: 'Open Source',
            type: 'string',
            researchPrompt: 'Is the wallet code open source? Fully, partially, or closed source',
            example: 'Fully open source (GitHub)'
        },
        {
            key: 'backupMethod',
            label: 'Backup Method',
            type: 'string',
            researchPrompt: 'How users backup their wallet: 12/24 word seed phrase, encrypted cloud backup, etc.',
            example: '24-word seed phrase'
        },
        {
            key: 'securityFeatures',
            label: 'Security Features',
            type: 'string',
            researchPrompt: 'Key security features: PIN, biometrics, secure element chip, passphrase support',
            example: 'Secure Element chip, PIN, passphrase support'
        },
        {
            key: 'dAppBrowser',
            label: 'dApp Browser',
            type: 'string',
            researchPrompt: 'Does it have built-in browser for DeFi, NFTs, Web3 apps?',
            example: 'Yes, with WalletConnect support'
        },
        {
            key: 'price',
            label: 'Price',
            type: 'string',
            researchPrompt: 'Cost: Free for software wallets, or hardware price',
            example: 'Free / $79 for hardware'
        },
        {
            key: 'company',
            label: 'Company',
            type: 'string',
            researchPrompt: 'Company name and country of origin',
            example: 'Ledger (France)'
        }
    ],
    
    scoringCategories: [
        {
            key: 'security',
            label: 'Security',
            description: 'Private key protection, secure element, audit history, open source transparency'
        },
        {
            key: 'chainSupport',
            label: 'Chain Support',
            description: 'Number of blockchains, tokens, and NFT standards supported'
        },
        {
            key: 'userExperience',
            label: 'User Experience',
            description: 'Ease of setup, interface design, transaction flow, beginner friendliness'
        },
        {
            key: 'features',
            label: 'Features',
            description: 'Staking, swaps, dApp browser, NFT gallery, multi-account support'
        },
        {
            key: 'backupRecovery',
            label: 'Backup & Recovery',
            description: 'Seed phrase handling, recovery options, inheritance features'
        },
        {
            key: 'reputation',
            label: 'Reputation',
            description: 'Track record, security incidents history, community trust, company transparency'
        }
    ],
    
    researchContext: 'You are a cryptocurrency wallet security researcher and reviewer. Research the crypto wallet product focusing on security, usability, and features. Note: Wallets do not have deposits/payouts like exchanges - focus on supported chains, security features, backup methods, and user experience.',
    searchSuffix: 'crypto wallet review',
    
    comparisonColumns: ['Type', 'Custody', 'Supported Chains', 'Price'],
    
    disclaimerTitle: '⚠️ Wallet Security Notice',
    disclaimerText: 'Always download wallets from official sources only. Never share your seed phrase or private keys with anyone. Hardware wallets provide the highest security for large holdings. Verify wallet addresses carefully before sending funds. This content is for informational purposes only.',
    
    ctaPrefix: 'Get'
};
