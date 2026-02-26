import React, { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { apiKeyAtom, selectedModelAtom, GEMINI_MODELS } from '../atoms';
import styles from '../FigmaAgent.module.scss';

const SESSION_KEY = 'figma_agent_api_key';

const AgentSetupPanel: React.FC = () => {
  const [apiKey, setApiKey] = useAtom(apiKeyAtom);
  const [selectedModel, setSelectedModel] = useAtom(selectedModelAtom);
  const [showKey, setShowKey] = useState(false);

  // sessionStorage에서 복원
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved && !apiKey) setApiKey(saved);
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setApiKey(val);
    sessionStorage.setItem(SESSION_KEY, val);
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

    </div>
  );
};

export default AgentSetupPanel;
