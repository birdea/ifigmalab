import { usePromptBuilder } from './usePromptBuilder';
import { useTokenCounter } from './useTokenCounter';
import { useGeminiApi } from './useGeminiApi';

/**
 * Orchestrates prompt building, token counting, and Gemini API submission.
 * Public API is unchanged — callers do not need to know about the sub-hooks.
 */
export function useAgentSubmit(appendLog: (line: string) => void) {
    const { buildPromptText, buildPromptParts } = usePromptBuilder();
    const { tokenCount, setTokenCount, isCountingTokens, handleCountTokens } =
        useTokenCounter(appendLog, buildPromptText, buildPromptParts);
    const { handleSubmit } = useGeminiApi(appendLog, buildPromptText, buildPromptParts);

    return {
        tokenCount,
        setTokenCount,
        isCountingTokens,
        handleCountTokens,
        handleSubmit,
    };
}
