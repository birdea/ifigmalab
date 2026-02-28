import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// AbortSignal polyfills for jsdom (Node.js 20+ APIs not exposed by jsdom)
if (typeof AbortSignal.any !== 'function') {
    (AbortSignal as any).any = (signals: AbortSignal[]) => {
        const controller = new AbortController();
        for (const signal of signals) {
            if (signal.aborted) {
                controller.abort(signal.reason);
                return controller.signal;
            }
            signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
        }
        return controller.signal;
    };
}
if (typeof AbortSignal.timeout !== 'function') {
    (AbortSignal as any).timeout = (ms: number) => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(new DOMException('TimeoutError', 'TimeoutError')), ms);
        return controller.signal;
    };
}

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

