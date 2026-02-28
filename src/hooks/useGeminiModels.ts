import { useState, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { apiKeyAtom, selectedModelAtom, geminiModelsAtom, modelInfoTextAtom } from '../components/FigmaAgent/atoms';
import { GEMINI_API_BASE } from '../components/FigmaAgent/utils';
import { STORAGE_KEYS } from '../constants/storageKeys';

const MODELS_CACHE_TTL = 60 * 60 * 1000; // 1시간

interface GeminiModelInfo {
    name: string;
    displayName?: string;
    description?: string;
    version?: string;
    inputTokenLimit?: number;
    outputTokenLimit?: number;
    supportedGenerationMethods?: string[];
    thinking?: boolean;
    temperature?: number;
    maxTemperature?: number;
    topP?: number;
    topK?: number;
    error?: { message?: string; code?: number };
}

interface GeminiModelsListResponse {
    models?: Array<{
        name: string;
        displayName?: string;
        description?: string;
        supportedGenerationMethods?: string[];
    }>;
    error?: { message?: string; code?: number };
}

function isGeminiModelsListResponse(v: unknown): v is GeminiModelsListResponse {
    return typeof v === 'object' && v !== null && ('models' in v || 'error' in v);
}

function isGeminiModelInfo(v: unknown): v is GeminiModelInfo {
    return typeof v === 'object' && v !== null && ('name' in v || 'error' in v);
}

function formatModelInfo(info: GeminiModelInfo): string {
    const lines: string[] = [
        `name               : ${info.name}`,
        `displayName        : ${info.displayName ?? '-'}`,
        `description        : ${info.description ?? '-'}`,
        `version            : ${info.version ?? '-'}`,
        `inputTokenLimit    : ${info.inputTokenLimit?.toLocaleString() ?? '-'} tokens`,
        `outputTokenLimit   : ${info.outputTokenLimit?.toLocaleString() ?? '-'} tokens`,
        `supportedMethods   : ${(info.supportedGenerationMethods ?? []).join(', ') || '-'}`,
        `thinking           : ${info.thinking != null ? String(info.thinking) : '-'}`,
        `temperature        : ${info.temperature ?? '-'} (max: ${info.maxTemperature ?? '-'})`,
        `topP               : ${info.topP ?? '-'}`,
        `topK               : ${info.topK ?? '-'}`,
    ];
    return lines.join('\n');
}

export function useGeminiModels() {
    const [apiKey] = useAtom(apiKeyAtom);
    const [selectedModel, setSelectedModel] = useAtom(selectedModelAtom);
    const [geminiModels, setGeminiModels] = useAtom(geminiModelsAtom);
    const [modelInfoText, setModelInfoText] = useAtom(modelInfoTextAtom);

    const [stagedModel, setStagedModel] = useState(selectedModel);
    const [isFetchingInfo, setIsFetchingInfo] = useState(false);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [modelsError, setModelsError] = useState('');

    // selectedModel이 외부(Fetch 작업 등)에서 변경될 경우, 내부 Staged 상태와 동기화
    useEffect(() => {
        setStagedModel(selectedModel);
    }, [selectedModel]);

    const fetchModels = useCallback(async (key: string) => {
        if (!key) return;

        // P-06: sessionStorage TTL 캐시 확인 (1시간) — 캐시 키에 API Key 식별자 포함
        const cacheKey = `${STORAGE_KEYS.GEMINI_MODELS_CACHE}_${key.slice(0, 8)}`;
        try {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached) as { data: typeof geminiModels; timestamp: number };
                if (Date.now() - timestamp < MODELS_CACHE_TTL && data.length > 0) {
                    setGeminiModels(data);
                    if (!data.some(m => m.id === selectedModel)) {
                        setSelectedModel(data[0].id);
                    }
                    return;
                }
            }
        } catch {
            // 캐시 파싱 실패 시 무시하고 API 호출 진행
        }

        setIsFetchingModels(true);
        setModelsError('');
        try {
            const res = await fetch(`${GEMINI_API_BASE}/models?pageSize=100`, {
                headers: {
                    'x-goog-api-key': key,
                }
            });
            const json = await res.json();
            if (!isGeminiModelsListResponse(json)) throw new Error('Invalid API response format for models list');
            const data = json;
            if (!res.ok || data.error) {
                setModelsError(`Error (${data.error?.code ?? res.status}): ${data.error?.message ?? res.statusText}`);
            } else {
                const filtered = (data.models ?? [])
                    .filter(m => (m.supportedGenerationMethods ?? []).includes('generateContent'))
                    .map(m => ({
                        id: m.name.replace('models/', ''),
                        label: m.displayName ?? m.name.replace('models/', ''),
                        tier: m.description ?? '',
                    }));
                if (filtered.length > 0) {
                    setGeminiModels(filtered);
                    if (!filtered.some(m => m.id === selectedModel)) {
                        setSelectedModel(filtered[0].id);
                    }
                    // P-06: 결과를 sessionStorage에 캐시 저장 (API Key별 캐시 키 사용)
                    try {
                        sessionStorage.setItem(cacheKey, JSON.stringify({ data: filtered, timestamp: Date.now() }));
                    } catch {
                        // sessionStorage 용량 초과 시 무시
                    }
                }
            }
        } catch (e) {
            setModelsError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsFetchingModels(false);
        }
    }, [selectedModel, setGeminiModels, setSelectedModel]);

    const handleGetModelInfo = useCallback(async () => {
        if (!apiKey) return;
        setIsFetchingInfo(true);
        setModelInfoText('Loading...');
        try {
            const res = await fetch(
                `${GEMINI_API_BASE}/models/${stagedModel}`, {
                headers: {
                    'x-goog-api-key': apiKey,
                }
            }
            );
            const json = await res.json();
            if (!isGeminiModelInfo(json)) throw new Error('Invalid API response format for model info');
            const data = json;
            if (!res.ok || data.error) {
                setModelInfoText(`Error (${data.error?.code ?? res.status}): ${data.error?.message ?? res.statusText}`);
            } else {
                setModelInfoText(formatModelInfo(data));
            }
        } catch (e) {
            setModelInfoText(`Network error: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsFetchingInfo(false);
        }
    }, [apiKey, stagedModel, setModelInfoText]);

    return {
        geminiModels,
        selectedModel,
        setSelectedModel,
        stagedModel,
        setStagedModel,
        modelInfoText,
        isFetchingInfo,
        isFetchingModels,
        modelsError,
        fetchModels,
        handleGetModelInfo
    };
}
