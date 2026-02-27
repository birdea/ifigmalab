import React, { useState } from 'react';
import styles from '../FigmaAgent.module.scss';
import { useApiKeyEncryption } from '../../../hooks/useApiKeyEncryption';
import { useGeminiModels } from '../../../hooks/useGeminiModels';

/**
 * API Key 초기화, Model 선택 여부, 로컬 암호화 저장을 설정하는 Panel.
 */
const AgentSetupPanel: React.FC = () => {
  const [showKey, setShowKey] = useState(false);

  const {
    stagedModel,
    setStagedModel,
    geminiModels,
    selectedModel,
    setSelectedModel,
    modelInfoText,
    isFetchingInfo,
    isFetchingModels,
    modelsError,
    fetchModels,
    handleGetModelInfo
  } = useGeminiModels();

  const {
    apiKey,
    setApiKey,
    rememberKey,
    setRememberKey,
    pin,
    setPin,
    savedEncryptedKey,
    isLocked,
    unlockError,
    handleUnlock,
    handleResetPin,
    handleClearSaved
  } = useApiKeyEncryption(fetchModels);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
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

      {!isLocked ? (
        <>
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
              onChange={e => setRememberKey(e.target.checked)}
            />
            <label htmlFor="rememberApiKey" className={styles.rememberLabel}>
              로컬에 암호화하여 저장
            </label>
          </div>
          {rememberKey && (
            <div className={styles.formRow}>
              <label className={styles.formLabel}>암호화 PIN</label>
              <div className={styles.inputWithBtn}>
                <input
                  className={styles.formInput}
                  type={showKey ? 'text' : 'password'}
                  placeholder="4자리 이상 PIN 입력"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                />
                {pin.length >= 4 && apiKey ? (
                  <>
                    <span className={styles.savedBadge}>자동 저장됨</span>
                    {savedEncryptedKey && (
                      <button className={styles.resetPinBtn} onClick={handleResetPin} type="button">
                        PIN 변경 시 초기화
                      </button>
                    )}
                  </>
                ) : (
                  <span className={styles.pinRequiredHint}>
                    4자리 이상 필요
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={styles.lockedSection}>
          <div className={styles.lockedHint}>
            🔒 암호화된 API 키가 저장되어 있습니다.<br />PIN을 입력해 안전하게 잠금 해제하세요.
          </div>
          <div className={styles.inputWithBtn}>
            <input
              className={styles.formInput}
              type={showKey ? 'text' : 'password'}
              placeholder="PIN 번호 입력"
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleUnlock(); }}
            />
            <button className={styles.toggleBtn} onClick={() => setShowKey(v => !v)} type="button">
              {showKey ? 'Hide' : 'Show'}
            </button>
            <button className={styles.fetchBtn} onClick={handleUnlock} type="button">
              Unlock
            </button>
            <button className={styles.toggleBtn} onClick={handleClearSaved} type="button">
              Clear
            </button>
          </div>
          {unlockError && <div className={styles.errorTextNoMargin}>{unlockError}</div>}
        </div>
      )}

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
