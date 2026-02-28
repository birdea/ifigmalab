import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { createStore, Provider } from 'jotai';
import { useGeminiModels } from './useGeminiModels';
import { apiKeyAtom, selectedModelAtom } from '../components/FigmaAgent/atoms';
import { STORAGE_KEYS } from '../constants/storageKeys';

const wrapper = (store: ReturnType<typeof createStore>) =>
    ({ children }: { children: React.ReactNode }) =>
        React.createElement(Provider, { store }, children);

describe('useGeminiModels', () => {
    let store: ReturnType<typeof createStore>;

    beforeEach(() => {
        store = createStore();
        global.fetch = jest.fn();
        sessionStorage.clear();
        jest.clearAllMocks();
    });

    describe('fetchModels', () => {
        it('returns early when key is empty', async () => {
            const { result } = renderHook(() => useGeminiModels(), { wrapper: wrapper(store) });
            await act(async () => { await result.current.fetchModels(''); });
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('uses sessionStorage cache when valid', async () => {
            const cachedModels = [{ id: 'gemini-cached', label: 'Cached Model', tier: '' }];
            const cacheKey = `${STORAGE_KEYS.GEMINI_MODELS_CACHE}_testapi1`;
            sessionStorage.setItem(cacheKey, JSON.stringify({ data: cachedModels, timestamp: Date.now() }));

            const { result } = renderHook(() => useGeminiModels(), { wrapper: wrapper(store) });
            await act(async () => { await result.current.fetchModels('testapi1234'); });

            expect(global.fetch).not.toHaveBeenCalled();
            expect(result.current.geminiModels).toEqual(cachedModels);
        });

        it('selects first model when cached model is not selectedModel', async () => {
            const cachedModels = [
                { id: 'model-a', label: 'Model A', tier: '' },
                { id: 'model-b', label: 'Model B', tier: '' },
            ];
            store.set(selectedModelAtom, 'model-not-in-cache');
            const cacheKey = `${STORAGE_KEYS.GEMINI_MODELS_CACHE}_testapi2`;
            sessionStorage.setItem(cacheKey, JSON.stringify({ data: cachedModels, timestamp: Date.now() }));

            const { result } = renderHook(() => useGeminiModels(), { wrapper: wrapper(store) });
            await act(async () => { await result.current.fetchModels('testapi2345'); });

            expect(store.get(selectedModelAtom)).toBe('model-a');
        });

        it('fetches from API when cache is expired', async () => {
            const expiredTimestamp = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
            const cachedModels = [{ id: 'old-model', label: 'Old', tier: '' }];
            const cacheKey = `${STORAGE_KEYS.GEMINI_MODELS_CACHE}_freshke`;
            sessionStorage.setItem(cacheKey, JSON.stringify({ data: cachedModels, timestamp: expiredTimestamp }));

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    models: [{ name: 'models/gemini-new', displayName: 'New Model', supportedGenerationMethods: ['generateContent'] }]
                })
            });

            const { result } = renderHook(() => useGeminiModels(), { wrapper: wrapper(store) });
            await act(async () => { await result.current.fetchModels('freshkey123'); });

            expect(global.fetch).toHaveBeenCalled();
            expect(result.current.geminiModels[0].id).toBe('gemini-new');
        });

        it('sets modelsError on API error response', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                json: async () => ({ error: { code: 401, message: 'Invalid API key' } })
            });

            const { result } = renderHook(() => useGeminiModels(), { wrapper: wrapper(store) });
            await act(async () => { await result.current.fetchModels('badkey123'); });

            expect(result.current.modelsError).toContain('401');
        });

        it('sets modelsError on network error', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network Error'));

            const { result } = renderHook(() => useGeminiModels(), { wrapper: wrapper(store) });
            await act(async () => { await result.current.fetchModels('anykey123'); });

            expect(result.current.modelsError).toContain('Network Error');
        });

        it('handles invalid cache JSON gracefully', async () => {
            const cacheKey = `${STORAGE_KEYS.GEMINI_MODELS_CACHE}_badcach`;
            sessionStorage.setItem(cacheKey, 'invalid-json{{{');

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ models: [] })
            });

            const { result } = renderHook(() => useGeminiModels(), { wrapper: wrapper(store) });
            await act(async () => { await result.current.fetchModels('badcache123'); });

            // Should proceed to API call despite bad cache
            expect(global.fetch).toHaveBeenCalled();
        });
    });

    describe('handleGetModelInfo', () => {
        it('returns early when apiKey is empty', async () => {
            store.set(apiKeyAtom, '');
            const { result } = renderHook(() => useGeminiModels(), { wrapper: wrapper(store) });
            await act(async () => { await result.current.handleGetModelInfo(); });
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('sets modelInfoText on success', async () => {
            store.set(apiKeyAtom, 'valid-key');
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    name: 'models/gemini-2.5-flash',
                    displayName: 'Gemini 2.5 Flash',
                    inputTokenLimit: 100000,
                    outputTokenLimit: 8192,
                })
            });

            const { result } = renderHook(() => useGeminiModels(), { wrapper: wrapper(store) });
            await act(async () => { await result.current.handleGetModelInfo(); });

            expect(result.current.modelInfoText).toContain('gemini-2.5-flash');
        });

        it('sets modelInfoText on API error', async () => {
            store.set(apiKeyAtom, 'valid-key');
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 403,
                statusText: 'Forbidden',
                json: async () => ({ error: { code: 403, message: 'Forbidden' } })
            });

            const { result } = renderHook(() => useGeminiModels(), { wrapper: wrapper(store) });
            await act(async () => { await result.current.handleGetModelInfo(); });

            expect(result.current.modelInfoText).toContain('403');
        });

        it('sets modelInfoText on network error', async () => {
            store.set(apiKeyAtom, 'valid-key');
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network Error'));

            const { result } = renderHook(() => useGeminiModels(), { wrapper: wrapper(store) });
            await act(async () => { await result.current.handleGetModelInfo(); });

            expect(result.current.modelInfoText).toContain('Network Error');
        });
    });
});
