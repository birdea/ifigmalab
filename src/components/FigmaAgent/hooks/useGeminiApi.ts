import { useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtomValue, useSetAtom } from 'jotai';
import {
    apiKeyAtom,
    selectedModelAtom,
    mcpDataAtom,
    promptAtom,
    screenshotAtom,
    screenshotMimeTypeAtom,
    generateStatusAtom,
    generateErrorAtom,
    generatedHtmlAtom,
    rawResponseAtom,
} from '../atoms';
import { extractHtml, GEMINI_API_BASE, GeminiPart, GeminiResponse } from '../utils';
import { formatBytes, TEXT_ENCODER } from '../../../utils/utils';
import { API_TIMEOUT_MS } from '../../../constants/config';
import type { PromptSections } from './usePromptBuilder';

const _parsed = parseInt(process.env.MAX_OUTPUT_TOKENS ?? '', 10);
const MAX_OUTPUT_TOKENS = Number.isFinite(_parsed) ? _parsed : 65536;

function isGeminiResponse(v: unknown): v is GeminiResponse {
    return typeof v === 'object' && v !== null && ('candidates' in v || 'usageMetadata' in v || 'error' in v);
}

type BuildPromptText = () => PromptSections;
type BuildPromptParts = (textContent: string) => GeminiPart[];

/** Handles the Gemini generateContent API call and response parsing. */
export function useGeminiApi(
    appendLog: (line: string) => void,
    buildPromptText: BuildPromptText,
    buildPromptParts: BuildPromptParts,
) {
    const { t } = useTranslation();
    const apiKey = useAtomValue(apiKeyAtom);
    const model = useAtomValue(selectedModelAtom);
    const mcpData = useAtomValue(mcpDataAtom);
    const prompt = useAtomValue(promptAtom);
    const screenshot = useAtomValue(screenshotAtom);
    const screenshotMimeType = useAtomValue(screenshotMimeTypeAtom);

    const setStatus = useSetAtom(generateStatusAtom);
    const setError = useSetAtom(generateErrorAtom);
    const setGeneratedHtml = useSetAtom(generatedHtmlAtom);
    const setRawResponse = useSetAtom(rawResponseAtom);

    const submitAbortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        return () => {
            submitAbortRef.current?.abort();
        };
    }, []);

    const handleSubmit = useCallback(async () => {
        submitAbortRef.current?.abort();
        const controller = new AbortController();
        submitAbortRef.current = controller;

        const bar = '─'.repeat(40);

        appendLog(`┌${bar}`);
        appendLog(`│ Submit request`);
        appendLog(`├${bar}`);
        appendLog(`│ [VALIDATE] API Key      : ${apiKey ? `${apiKey.slice(0, 4)}**** (${apiKey.length} chars) ✓` : '❌ none'}`);
        appendLog(`│ [VALIDATE] MCP Data     : ${mcpData.trim() ? `${formatBytes(TEXT_ENCODER.encode(mcpData).length) || '0 bytes'} (${mcpData.length} chars) ✓` : 'empty'}`);
        appendLog(`│ [VALIDATE] Prompt       : ${prompt.trim() ? `${prompt.length} chars ✓` : 'empty'}`);
        appendLog(`│ [VALIDATE] Model        : ${model}`);
        appendLog(`│ [VALIDATE] Screenshot   : ${screenshot ? `${formatBytes(TEXT_ENCODER.encode(screenshot).length)} (${screenshotMimeType}) ✓` : 'none'}`);

        if (!apiKey) {
            appendLog(`│ [VALIDATE] ❌ No API Key → abort`);
            appendLog(`└${bar}`);
            setError(t('errors.api_key_required'));
            setStatus('error');
            return;
        }

        if (!mcpData.trim() && !prompt.trim()) {
            appendLog(`│ [VALIDATE] ❌ MCP Data and Prompt both empty → abort`);
            appendLog(`└${bar}`);
            setError(t('errors.content_required'));
            setStatus('error');
            return;
        }

        appendLog(`│ [VALIDATE] ✓ Validation passed`);

        setStatus('loading');
        setError('');
        setGeneratedHtml('');
        setRawResponse('');

        const { textContent, systemPromptSection, designContextSection, userPromptSection } = buildPromptText();
        const parts = buildPromptParts(textContent);

        const promptBytes = TEXT_ENCODER.encode(textContent).length;
        const systemBytes = TEXT_ENCODER.encode(systemPromptSection).length;
        const contextBytes = designContextSection ? TEXT_ENCODER.encode(designContextSection).length : 0;
        const userBytes = TEXT_ENCODER.encode(userPromptSection).length;
        const screenshotBytes = screenshot ? TEXT_ENCODER.encode(screenshot).length : 0;
        const estimatedTokens = Math.round(promptBytes / 4);

        const endpoint = `${GEMINI_API_BASE}/models/${model}:generateContent`;
        const requestBody = {
            contents: [{ role: 'user', parts }],
            generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
        };
        const requestBodyJson = JSON.stringify(requestBody);
        const requestBodyBytes = TEXT_ENCODER.encode(requestBodyJson).length;

        appendLog(`├${bar}`);
        appendLog(`│ [BUILD]    system prompt   : ${formatBytes(systemBytes)} (${systemPromptSection.length} chars)`);
        appendLog(`│ [BUILD]    design context  : ${contextBytes > 0 ? `${formatBytes(contextBytes)} (${designContextSection.length} chars)` : 'none'}`);
        appendLog(`│ [BUILD]    user prompt     : ${formatBytes(userBytes)} (${userPromptSection.length} chars)`);
        appendLog(`│ [BUILD]    screenshot      : ${screenshotBytes > 0 ? `${formatBytes(screenshotBytes)} (${screenshotMimeType})` : 'none'}`);
        appendLog(`│ [BUILD]    total text      : ${formatBytes(promptBytes)} / est. ~${estimatedTokens.toLocaleString()} tokens`);
        appendLog(`│ [BUILD]    parts count     : ${parts.length} (${screenshot ? 'image + text' : 'text only'})`);
        appendLog(`├${bar}`);
        appendLog(`│ [REQUEST]  model           : ${model}`);
        appendLog(`│ [REQUEST]  endpoint        : POST .../models/${model}:generateContent`);
        appendLog(`│ [REQUEST]  maxOutputTokens : ${MAX_OUTPUT_TOKENS.toLocaleString()}`);
        appendLog(`│ [REQUEST]  body size       : ${formatBytes(requestBodyBytes)}`);
        appendLog(`├${bar}`);
        appendLog(`│ [NETWORK]  Calling Gemini API...`);

        const startTime = Date.now();

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey,
                },
                body: requestBodyJson,
                signal: AbortSignal.any([controller.signal, AbortSignal.timeout(API_TIMEOUT_MS)]),
            });

            const networkMs = Date.now() - startTime;
            appendLog(`│ [NETWORK]  HTTP ${res.status} ${res.statusText} (${networkMs}ms)`);
            appendLog(`│ [NETWORK]  content-type    : ${res.headers.get('content-type') ?? '-'}`);

            const rawText = await res.text();
            const rawTextBytes = TEXT_ENCODER.encode(rawText).length;
            appendLog(`│ [NETWORK]  response size   : ${formatBytes(rawTextBytes)}`);

            let data: unknown;
            try {
                data = JSON.parse(rawText);
            } catch {
                appendLog(`│ [RESPONSE] ❌ JSON parse failed: ${rawText.slice(0, 200)}`);
                appendLog(`└${bar}`);
                throw new Error(`${t('errors.json_parse_failed')}${rawText.slice(0, 100)}`);
            }

            if (!isGeminiResponse(data)) throw new Error('Invalid Gemini API response format');

            if (!res.ok || data.error) {
                const error = data.error;
                const errMsg = error?.message ?? `HTTP ${res.status}`;
                const errCode = error?.code ?? res.status;
                appendLog(`│ [RESPONSE] ❌ API error (code: ${errCode}): ${errMsg}`);
                appendLog(`└${bar}`);
                throw new Error(errMsg);
            }

            appendLog(`├${bar}`);
            appendLog(`│ [RESPONSE] candidates      : ${data.candidates?.length ?? 0}`);

            const usage = data.usageMetadata;
            if (usage) {
                const inputCost = usage.promptTokenCount ?? 0;
                const outputCost = usage.candidatesTokenCount ?? 0;
                appendLog(`│ [TOKENS]   prompt          : ${inputCost.toLocaleString()} tokens`);
                appendLog(`│ [TOKENS]   candidates      : ${outputCost.toLocaleString()} tokens`);
                appendLog(`│ [TOKENS]   total           : ${(usage.totalTokenCount ?? 0).toLocaleString()} tokens`);
                appendLog(`│ [TOKENS]   ratio (out/in)  : ${inputCost > 0 ? (outputCost / inputCost * 100).toFixed(1) : '-'}%`);
            }

            const finishReason = data.candidates?.[0]?.finishReason;
            appendLog(`│ [RESPONSE] finishReason    : ${finishReason ?? 'unknown'}`);
            if (finishReason === 'MAX_TOKENS') {
                appendLog(`│ [RESPONSE] ⚠️  MAX_TOKENS — output may be truncated (maxOutputTokens exceeded)`);
            } else if (finishReason === 'STOP') {
                appendLog(`│ [RESPONSE] ✓  STOP — normal completion`);
            } else if (finishReason === 'SAFETY') {
                appendLog(`│ [RESPONSE] ⚠️  SAFETY — blocked by safety policy`);
            }

            const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            const rawBytes = TEXT_ENCODER.encode(rawResponse).length;
            const rawLines = rawResponse.split('\n').length;
            appendLog(`│ [RESPONSE] raw text        : ${formatBytes(rawBytes)} / ${rawLines.toLocaleString()} lines`);

            appendLog(`├${bar}`);
            const html = extractHtml(rawResponse);
            const htmlBytes = TEXT_ENCODER.encode(html).length;
            const htmlLines = html.split('\n').length;
            appendLog(`│ [EXTRACT]  html size       : ${formatBytes(htmlBytes)} / ${htmlLines.toLocaleString()} lines`);

            const hasDoctype = /<!DOCTYPE\s+html/i.test(html);
            const hasHead = /<head[\s>]/i.test(html);
            const hasBody = /<body[\s>]/i.test(html);
            const styleCount = (html.match(/<style[\s>]/gi) ?? []).length;
            const scriptCount = (html.match(/<script[\s>]/gi) ?? []).length;
            const isHtmlComplete = html.trimEnd().endsWith('</html>');

            appendLog(`│ [EXTRACT]  <!DOCTYPE>      : ${hasDoctype ? '✓' : '✗'}`);
            appendLog(`│ [EXTRACT]  <head>          : ${hasHead ? '✓' : '✗'}`);
            appendLog(`│ [EXTRACT]  <body>          : ${hasBody ? '✓' : '✗'}`);
            appendLog(`│ [EXTRACT]  <style> blocks  : ${styleCount}`);
            appendLog(`│ [EXTRACT]  <script> blocks : ${scriptCount}`);
            appendLog(`│ [EXTRACT]  </html> end     : ${isHtmlComplete ? '✓' : '⚠️  missing (possible token shortage)'}`);

            appendLog(`├${bar}`);
            const firstLines = html.split('\n').slice(0, 3).map(l => l.trimEnd()).join('↵');
            const lastLines = html.split('\n').slice(-3).map(l => l.trimEnd()).join('↵');
            appendLog(`│ [PREVIEW]  first 3 lines   : ${firstLines}`);
            appendLog(`│ [PREVIEW]  last  3 lines   : ${lastLines}`);

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            appendLog(`├${bar}`);
            appendLog(`│ ✅ Generation complete (${elapsed}s)`);
            appendLog(`└${bar}`);

            setGeneratedHtml(html);
            setRawResponse(rawResponse);
            setStatus('success');
        } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') return;

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const isTimeout = e instanceof DOMException && e.name === 'TimeoutError';
            const isNetworkError = e instanceof TypeError &&
                (e.message === 'Failed to fetch' || e.message.includes('NetworkError'));

            if (isTimeout) {
                appendLog(`│ [NETWORK]  ⏱️  Timeout (${elapsed}s) — request exceeded ${API_TIMEOUT_MS / 1000}s`);
            } else if (isNetworkError) {
                appendLog(`│ [NETWORK]  ❌ Connection failed (${elapsed}s)`);
                appendLog(`│ [DIAGNOSE] Cannot connect to Gemini API server.`);
                appendLog(`│ [DIAGNOSE] Please check your internet connection.`);
            } else {
                appendLog(`│ [ERROR]    ❌ Failure (${elapsed}s): ${e instanceof Error ? e.message : String(e)}`);
            }
            appendLog(`└${bar}`);

            setError(isTimeout ? t('errors.request_timeout') : (e instanceof Error ? e.message : String(e)));
            setStatus('error');
        }
    }, [apiKey, model, mcpData, prompt, screenshot, screenshotMimeType,
        buildPromptText, buildPromptParts,
        setStatus, setError, setGeneratedHtml, setRawResponse, appendLog, t]);

    return { handleSubmit };
}
