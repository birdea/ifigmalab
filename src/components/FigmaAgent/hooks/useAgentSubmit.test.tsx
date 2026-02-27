import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { createStore, Provider } from 'jotai';
import { useAgentSubmit } from './useAgentSubmit';
import {
    apiKeyAtom,
    mcpDataAtom,
    promptAtom,
    generateStatusAtom,
    generateErrorAtom,
    generatedHtmlAtom,
    screenshotAtom,
} from '../atoms';

// Mock TEXT_ENCODER for consistency in tests
jest.mock('../../../utils/utils', () => ({
    ...jest.requireActual('../../../utils/utils'),
    TEXT_ENCODER: {
        encode: (str: string) => new TextEncoder().encode(str)
    }
}));

describe('useAgentSubmit Branch Coverage', () => {
    let store: ReturnType<typeof createStore>;
    let appendLog: jest.Mock;

    beforeEach(() => {
        store = createStore();
        appendLog = jest.fn();
        global.fetch = jest.fn();
        jest.clearAllMocks();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store} > {children} </Provider>
    );

    describe('handleCountTokens', () => {
        it('returns early if no apiKey', async () => {
            store.set(apiKeyAtom, '');
            const { result } = renderHook(() => useAgentSubmit(appendLog), { wrapper });
            await act(async () => {
                await result.current.handleCountTokens();
            });
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('returns early if no input data', async () => {
            store.set(apiKeyAtom, 'key');
            store.set(mcpDataAtom, '');
            store.set(promptAtom, '');
            const { result } = renderHook(() => useAgentSubmit(appendLog), { wrapper });
            await act(async () => {
                await result.current.handleCountTokens();
            });
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('logs success on countTokens', async () => {
            store.set(apiKeyAtom, 'key');
            store.set(mcpDataAtom, 'data');
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ totalTokens: 1234 })
            });

            const { result } = renderHook(() => useAgentSubmit(appendLog), { wrapper });
            await act(async () => {
                await result.current.handleCountTokens();
            });
            expect(appendLog).toHaveBeenCalledWith(expect.stringContaining('✓ 1,234 tokens'));
            expect(result.current.tokenCount).toBe(1234);
        });

        it('logs error on countTokens fail', async () => {
            store.set(apiKeyAtom, 'key');
            store.set(mcpDataAtom, 'data');
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Error',
                json: async () => ({ error: { code: 500, message: 'Fail' } })
            });

            const { result } = renderHook(() => useAgentSubmit(appendLog), { wrapper });
            await act(async () => {
                await result.current.handleCountTokens();
            });
            expect(appendLog).toHaveBeenCalledWith(expect.stringContaining('❌ Error (500): Fail'));
        });

        it('logs catch error', async () => {
            store.set(apiKeyAtom, 'key');
            store.set(mcpDataAtom, 'data');
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network Error'));

            const { result } = renderHook(() => useAgentSubmit(appendLog), { wrapper });
            await act(async () => {
                await result.current.handleCountTokens();
            });
            expect(appendLog).toHaveBeenCalledWith(expect.stringContaining('❌ Network Error'));
        });

        it('logs error if response format is invalid', async () => {
            store.set(apiKeyAtom, 'key');
            store.set(mcpDataAtom, 'data');
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ unexpected: true })
            });

            const { result } = renderHook(() => useAgentSubmit(appendLog), { wrapper });
            await act(async () => {
                await result.current.handleCountTokens();
            });
            expect(appendLog).toHaveBeenCalledWith(expect.stringContaining('❌ Invalid API response format'));
        });
    });

    describe('handleSubmit', () => {
        it('stops if no apiKey', async () => {
            store.set(apiKeyAtom, '');
            const { result } = renderHook(() => useAgentSubmit(appendLog), { wrapper });
            await act(async () => {
                await result.current.handleSubmit();
            });
            expect(store.get(generateErrorAtom)).toBe('Gemini API Token을 먼저 입력해주세요.');
            expect(store.get(generateStatusAtom)).toBe('error');
        });

        it('stops if no input', async () => {
            store.set(apiKeyAtom, 'key');
            store.set(mcpDataAtom, '');
            store.set(promptAtom, '');
            const { result } = renderHook(() => useAgentSubmit(appendLog), { wrapper });
            await act(async () => {
                await result.current.handleSubmit();
            });
            expect(store.get(generateErrorAtom)).toBe('MCP 데이터 또는 프롬프트를 입력해주세요.');
        });

        it('handles JSON parse error', async () => {
            store.set(apiKeyAtom, 'key');
            store.set(mcpDataAtom, 'data');
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Map(),
                text: async () => 'invalid-json'
            });

            const { result } = renderHook(() => useAgentSubmit(appendLog), { wrapper });
            await act(async () => {
                await result.current.handleSubmit();
            });
            expect(appendLog).toHaveBeenCalledWith(expect.stringContaining('❌ JSON 파싱 실패'));
            expect(store.get(generateStatusAtom)).toBe('error');
        });

        it('handles invalid format response', async () => {
            store.set(apiKeyAtom, 'key');
            store.set(mcpDataAtom, 'data');
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Map(),
                text: async () => JSON.stringify({ mystery: 'content' })
            });

            const { result } = renderHook(() => useAgentSubmit(appendLog), { wrapper });
            await act(async () => {
                await result.current.handleSubmit();
            });
            expect(store.get(generateErrorAtom)).toBe('Invalid Gemini API response format');
        });

        it('handles API error response', async () => {
            store.set(apiKeyAtom, 'key');
            store.set(mcpDataAtom, 'data');
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                headers: new Map(),
                text: async () => JSON.stringify({ error: { message: 'API Key Expired', code: 400 } })
            });

            const { result } = renderHook(() => useAgentSubmit(appendLog), { wrapper });
            await act(async () => {
                await result.current.handleSubmit();
            });
            expect(store.get(generateErrorAtom)).toBe('API Key Expired');
            expect(appendLog).toHaveBeenCalledWith(expect.stringContaining('❌ API 오류 (code: 400): API Key Expired'));
        });

        it('handles finishReason cases STOP with usageMetadata', async () => {
            store.set(apiKeyAtom, 'key');
            store.set(mcpDataAtom, 'data');

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Map(),
                text: async () => JSON.stringify({
                    candidates: [{
                        finishReason: 'STOP',
                        content: { parts: [{ text: '<html></html>' }] }
                    }],
                    usageMetadata: {
                        promptTokenCount: 100,
                        candidatesTokenCount: 50,
                        totalTokenCount: 150
                    }
                })
            });

            const { result } = renderHook(() => useAgentSubmit(appendLog), { wrapper });
            await act(async () => {
                await result.current.handleSubmit();
            });

            expect(appendLog).toHaveBeenCalledWith(expect.stringContaining('✓  STOP'));
            expect(appendLog).toHaveBeenCalledWith(expect.stringContaining('prompt          : 100 tokens'));
        });

        it('handles finishReason cases MAX_TOKENS', async () => {
            store.set(apiKeyAtom, 'key');
            store.set(mcpDataAtom, 'data');

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Map(),
                text: async () => JSON.stringify({
                    candidates: [{
                        finishReason: 'MAX_TOKENS',
                        content: { parts: [{ text: '<html></html>' }] }
                    }]
                })
            });

            const { result } = renderHook(() => useAgentSubmit(appendLog), { wrapper });
            await act(async () => {
                await result.current.handleSubmit();
            });

            expect(appendLog).toHaveBeenCalledWith(expect.stringContaining('⚠️  MAX_TOKENS'));
        });

        it('handles finishReason cases SAFETY', async () => {
            store.set(apiKeyAtom, 'key');
            store.set(mcpDataAtom, 'data');

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Map(),
                text: async () => JSON.stringify({
                    candidates: [{
                        finishReason: 'SAFETY',
                        content: { parts: [] }
                    }]
                })
            });

            const { result } = renderHook(() => useAgentSubmit(appendLog), { wrapper });
            await act(async () => {
                await result.current.handleSubmit();
            });

            expect(appendLog).toHaveBeenCalledWith(expect.stringContaining('⚠️  SAFETY'));
        });

        it('handles screenshot input', async () => {
            store.set(apiKeyAtom, 'key');
            store.set(mcpDataAtom, 'data');
            store.set(screenshotAtom, 'base64-img');

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Map(),
                text: async () => JSON.stringify({
                    candidates: [{
                        finishReason: 'STOP',
                        content: { parts: [{ text: '<html></html>' }] }
                    }]
                })
            });

            const { result } = renderHook(() => useAgentSubmit(appendLog), { wrapper });
            await act(async () => {
                await result.current.handleSubmit();
            });

            expect(appendLog).toHaveBeenCalledWith(expect.stringContaining('screenshot      :'));
            expect(store.get(generatedHtmlAtom)).toBe('<html></html>');
        });

        it('handles network error (TypeError)', async () => {
            store.set(apiKeyAtom, 'key');
            store.set(mcpDataAtom, 'data');
            (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));

            const { result } = renderHook(() => useAgentSubmit(appendLog), { wrapper });
            await act(async () => {
                await result.current.handleSubmit();
            });
            expect(appendLog).toHaveBeenCalledWith(expect.stringContaining('❌ 연결 실패'));
        });
    });
});
