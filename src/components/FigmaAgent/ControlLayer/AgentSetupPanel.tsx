import React, { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { apiKeyAtom, selectedModelAtom, geminiModelsAtom, modelInfoTextAtom } from '../atoms';
import styles from '../FigmaAgent.module.scss';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const LOCAL_STORAGE_KEY = 'figma_agent_api_key';

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

interface GeminiModelsListResponse {
  models?: Array<{
    name: string;
    displayName?: string;
    description?: string;
    supportedGenerationMethods?: string[];
  }>;
  error?: { message?: string; code?: number };
}

const AgentSetupPanel: React.FC = () => {
  const [apiKey, setApiKey] = useAtom(apiKeyAtom);
  const [selectedModel, setSelectedModel] = useAtom(selectedModelAtom);
  const [geminiModels, setGeminiModels] = useAtom(geminiModelsAtom);
  const [stagedModel, setStagedModel] = useState(selectedModel);
  const [showKey, setShowKey] = useState(false);
  const [modelInfoText, setModelInfoText] = useAtom(modelInfoTextAtom);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [rememberKey, setRememberKey] = useState(false);

  // selectedModel이 외부(fetchModels 등)에서 바뀔 때 staged도 동기화
  useEffect(() => {
    setStagedModel(selectedModel);
  }, [selectedModel]);

  const fetchModels = async (key: string) => {
    if (!key) return;
    setIsFetchingModels(true);
    setModelsError('');
    try {
      const res = await fetch(`${GEMINI_API_BASE}/models?key=${key}&pageSize=100`);
      const data = (await res.json()) as GeminiModelsListResponse;
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
        }
      }
    } catch (e) {
      setModelsError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsFetchingModels(false);
    }
  };

  // localStorage에서 복원 (Remember가 체크된 경우에만 저장되어 있음)
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      setApiKey(saved);
      setRememberKey(true);
      fetchModels(saved);
    }
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setApiKey(val);
    if (rememberKey) {
      if (val) {
        localStorage.setItem(LOCAL_STORAGE_KEY, val);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
  };

  const handleRememberToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setRememberKey(checked);
    if (checked && apiKey) {
      localStorage.setItem(LOCAL_STORAGE_KEY, apiKey);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  const handleGetModelInfo = async () => {
    if (!apiKey) return;
    setIsFetchingInfo(true);
    setModelInfoText('Loading...');
    try {
      const res = await fetch(
        `${GEMINI_API_BASE}/models/${stagedModel}?key=${apiKey}`
      );
      const data = (await res.json()) as GeminiModelInfo;
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
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>AI Agent Setup</div>

      <div className={styles.providerRow}>
        <button className={`${styles.providerBtn} ${styles.providerBtnActive}`} type="button">
          Google Gemini
        </button>
        <button className={styles.providerBtn} type="button" disabled>
          Claude <span className={styles.providerTodo}>(todo)</span>
        </button>
        <button className={styles.providerBtn} type="button" disabled>
          Codex <span className={styles.providerTodo}>(todo)</span>
        </button>
      </div>

      <div className={styles.formRow}>
        <label className={styles.formLabel}>Gemini API Token</label>
        <div className={styles.inputWithBtn}>
          <input
            className={styles.formInput}
            type={showKey ? 'text' : 'password'}
            placeholder="AIza..."
            value={apiKey}
            onChange={handleApiKeyChange}
            autoComplete="off"
          />
          <button className={styles.toggleBtn} onClick={() => setShowKey(v => !v)} type="button">
            {showKey ? 'Hide' : 'Show'}
          </button>
          <a
            className={styles.getKeyBtn}
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
          >
            GET
          </a>
        </div>
      </div>

      <div className={styles.rememberRow}>
        <input
          id="rememberApiKey"
          type="checkbox"
          checked={rememberKey}
          onChange={handleRememberToggle}
        />
        <label htmlFor="rememberApiKey" className={styles.rememberLabel}>
          API 키 기억하기
        </label>
        {rememberKey && apiKey && (
          <span className={styles.savedBadge}>저장됨</span>
        )}
      </div>

      <div className={styles.formRow}>
        <label className={styles.formLabel}>Model</label>
        <select
          className={styles.formSelect}
          value={stagedModel}
          onChange={e => setStagedModel(e.target.value)}
        >
          {geminiModels.map(m => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <button
          className={styles.toggleBtn}
          onClick={() => fetchModels(apiKey)}
          disabled={!apiKey || isFetchingModels}
          type="button"
          title="API에서 모델 목록 갱신"
        >
          {isFetchingModels ? '...' : 'Refresh'}
        </button>
        <button
          className={stagedModel !== selectedModel ? styles.fetchBtn : styles.toggleBtn}
          onClick={() => setSelectedModel(stagedModel)}
          disabled={stagedModel === selectedModel}
          type="button"
          title="선택한 모델을 MCP에 적용"
        >
          SET
        </button>
      </div>
      <div className={styles.activeModelHint}>
        현재 적용: <strong>{selectedModel}</strong>
      </div>
      {modelsError && <div className={styles.errorText}>{modelsError}</div>}

      <div className={styles.modelInfoRow}>
        <button
          className={styles.modelInfoBtn}
          onClick={handleGetModelInfo}
          disabled={!apiKey || isFetchingInfo}
          type="button"
        >
          {isFetchingInfo ? 'Loading...' : 'Get Model Info'}
        </button>
        {modelInfoText && (
          <pre className={styles.modelInfoArea}>{modelInfoText}</pre>
        )}
      </div>

    </div>
  );
};

export default AgentSetupPanel;
