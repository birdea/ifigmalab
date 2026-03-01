import { useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { apiKeyAtom, mcpDataAtom, promptAtom, selectedModelAtom } from '../atoms';
import { GEMINI_API_BASE, GeminiPart } from '../utils';
import { COUNT_TOKENS_TIMEOUT_MS } from '../../../constants/config';
import type { PromptSections } from './usePromptBuilder';

interface CountTokensResponse {
    totalTokens?: number;
    error?: { message?: string; code?: number };
}

function isCountTokensResponse(v: unknown): v is CountTokensResponse {
    return typeof v === 'object' && v !== null && ('totalTokens' in v || 'error' in v);
}

type BuildPromptText = () => PromptSections;
type BuildPromptParts = (textContent: string) => GeminiPart[];

/** Handles token counting requests against the Gemini countTokens API endpoint. */
export function useTokenCounter(
    appendLog: (line: string) => void,
    buildPromptText: BuildPromptText,
    buildPromptParts: BuildPromptParts,
) {
    const apiKey = useAtomValue(apiKeyAtom);
    const mcpData = useAtomValue(mcpDataAtom);
    const prompt = useAtomValue(promptAtom);
    const model = useAtomValue(selectedModelAtom);

    const [tokenCount, setTokenCount] = useState<number | null>(null);
    const [isCountingTokens, setIsCountingTokens] = useState(false);

    const handleCountTokens = useCallback(async () => {
        if (!apiKey || (!mcpData.trim() && !prompt.trim())) return;
        setIsCountingTokens(true);
        setTokenCount(null);
        try {
            const { textContent } = buildPromptText();
            const parts = buildPromptParts(textContent);
            const res = await fetch(
                `${GEMINI_API_BASE}/models/${model}:countTokens`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey,
                    },
                    body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
                    signal: AbortSignal.timeout(COUNT_TOKENS_TIMEOUT_MS),
                }
            );
            const json = await res.json();
            if (!isCountTokensResponse(json)) throw new Error('Invalid API response format for countTokens');
            const data = json;
            if (!res.ok || data.error) {
                appendLog(`[COUNT TOKENS] ❌ Error (${data.error?.code ?? res.status}): ${data.error?.message ?? res.statusText}`);
            } else {
                const count = data.totalTokens ?? 0;
                setTokenCount(count);
                appendLog(`[COUNT TOKENS] ✓ ${count.toLocaleString()} tokens (model: ${model})`);
            }
        } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') return;
            const isTimeout = e instanceof DOMException && e.name === 'TimeoutError';
            appendLog(isTimeout
                ? `[COUNT TOKENS] ⏱️ Timeout (${COUNT_TOKENS_TIMEOUT_MS / 1000}s)`
                : `[COUNT TOKENS] ❌ ${e instanceof Error ? e.message : String(e)}`
            );
        } finally {
            setIsCountingTokens(false);
        }
    }, [apiKey, mcpData, prompt, model, buildPromptText, buildPromptParts, appendLog]);

    return { tokenCount, setTokenCount, isCountingTokens, handleCountTokens };
}
