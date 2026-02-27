import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock react-i18next
jest.mock('react-i18next', () => {
    const ko = require('./i18n/locales/ko.json');
    return {
        useTranslation: () => ({
            t: (key: string, options?: any) => {
                const parts = key.split('.');
                let result: any = ko;
                for (const part of parts) {
                    if (result[part] === undefined) {
                        return key;
                    }
                    result = result[part];
                }
                if (typeof result === 'string' && options) {
                    return result.replace(/{{(.*?)}}/g, (_, k) => options[k.trim()]);
                }
                return result;
            },
            i18n: {
                changeLanguage: () => Promise.resolve(),
                language: 'ko',
            },
        }),
        initReactI18next: {
            type: '3rdParty',
            init: jest.fn(),
        },
    };
});

