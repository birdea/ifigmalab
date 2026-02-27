import React, { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { apiKeyAtom, selectedModelAtom, GEMINI_MODELS, modelInfoTextAtom } from '../atoms';
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

const AgentSetupPanel: React.FC = () => {
  const [apiKey, setApiKey] = useAtom(apiKeyAtom);
  const [selectedModel, setSelectedModel] = useAtom(selectedModelAtom);
  const [showKey, setShowKey] = useState(false);
  const [modelInfoText, setModelInfoText] = useAtom(modelInfoTextAtom);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [rememberKey, setRememberKey] = useState(false);

  // localStorage에서 복원 (Remember가 체크된 경우에만 저장되어 있음)
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      setApiKey(saved);
      setRememberKey(true);
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
        `${GEMINI_API_BASE}/models/${selectedModel}?key=${apiKey}`
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
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value as typeof selectedModel)}
        >
          {GEMINI_MODELS.map(m => (
            <option key={m.id} value={m.id}>
              {m.label} — {m.tier}
            </option>
          ))}
        </select>
      </div>

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
