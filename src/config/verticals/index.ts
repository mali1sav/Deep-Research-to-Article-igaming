import { VerticalConfig, VerticalType } from './types';
import { gamblingConfig } from './gambling';
import { cryptoConfig } from './crypto';
import { walletConfig } from './wallet';

export * from './types';
export { gamblingConfig } from './gambling';
export { cryptoConfig } from './crypto';
export { walletConfig } from './wallet';

const verticalConfigs: Record<VerticalType, VerticalConfig> = {
    gambling: gamblingConfig,
    crypto: cryptoConfig,
    wallet: walletConfig
};

export const getVerticalConfig = (vertical: VerticalType): VerticalConfig => {
    return verticalConfigs[vertical] || gamblingConfig;
};

export const getAllVerticals = (): VerticalConfig[] => {
    return Object.values(verticalConfigs);
};

export const getVerticalOptions = (): { value: VerticalType; label: string }[] => {
    return Object.values(verticalConfigs).map(v => ({
        value: v.id,
        label: v.name
    }));
};
