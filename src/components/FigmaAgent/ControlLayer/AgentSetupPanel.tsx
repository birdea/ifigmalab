import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from '../FigmaAgent.module.scss';
import { useApiKeyEncryption } from '../../../hooks/useApiKeyEncryption';
import { useGeminiModels } from '../../../hooks/useGeminiModels';
import { useSessionTimeout } from '../../../hooks/useSessionTimeout';

/**
 * API Key 초기화, Model 선택 여부, 로컬 암호화 저장을 설정하는 Panel.
 */
const AgentSetupPanel: React.FC = () => {
  const { t } = useTranslation();
  const [showKey, setShowKey] = useState(false);
  useSessionTimeout();


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
      <div className={styles.panelTitle}>{t('setup.title')}</div>

      <div className={styles.providerRow}>
        <button className={`${styles.providerBtn} ${styles.providerBtnActive}`} type="button">
          Google Gemini
        </button>
        <button className={styles.providerBtn} type="button" disabled>
          Claude <span className={styles.providerTodo}>{t('common.todo')}</span>
        </button>
        <button className={styles.providerBtn} type="button" disabled>
          Codex <span className={styles.providerTodo}>{t('common.todo')}</span>
        </button>
      </div>


      {!isLocked ? (
        <>
          <div className={styles.formRow}>
            <label className={styles.formLabel}>{t('setup.api_token')}</label>
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
                {showKey ? t('setup.hide') : t('setup.show')}
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
              {t('setup.rememberKey')}
            </label>
          </div>

          {rememberKey && (
            <div className={styles.formRow}>
              <label className={styles.formLabel}>{t('setup.pin')}</label>
              <div className={styles.inputWithBtn}>
                <input
                  className={styles.formInput}
                  type={showKey ? 'text' : 'password'}
                  placeholder={t('setup.pin_placeholder')}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                />
                {pin.length >= 4 && apiKey ? (
                  <>
                    <span className={styles.savedBadge}>{t('setup.saved')}</span>
                    {savedEncryptedKey && (
                      <button className={styles.resetPinBtn} onClick={handleResetPin} type="button">
                        {t('setup.reset_pin')}
                      </button>
                    )}
                  </>
                ) : (
                  <span className={styles.pinRequiredHint}>
                    {t('setup.pin_required')}
                  </span>
                )}
              </div>
            </div>
          )}

        </>
      ) : (
        <div className={styles.lockedSection}>
          <div className={styles.lockedHint}>
            {t('setup.locked_hint')}
          </div>
          <div className={styles.inputWithBtn}>
            <input
              className={styles.formInput}
              type={showKey ? 'text' : 'password'}
              placeholder={t('setup.pin_input_placeholder')}
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleUnlock(); }}
            />
            <button className={styles.toggleBtn} onClick={() => setShowKey(v => !v)} type="button">
              {showKey ? t('setup.hide') : t('setup.show')}
            </button>
            <button className={styles.fetchBtn} onClick={handleUnlock} type="button">
              {t('setup.unlock')}
            </button>
            <button className={styles.toggleBtn} onClick={handleClearSaved} type="button">
              {t('setup.clear')}
            </button>
          </div>
          {unlockError && <div className={styles.errorTextNoMargin}>{unlockError}</div>}
        </div>

      )}

      <div className={styles.formRow}>
        <label className={styles.formLabel}>{t('setup.model')}</label>
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
          title={t('setup.refresh_hint')}
        >
          {isFetchingModels ? '...' : t('setup.refresh')}
        </button>
        <button
          className={stagedModel !== selectedModel ? styles.fetchBtn : styles.toggleBtn}
          onClick={() => setSelectedModel(stagedModel)}
          disabled={stagedModel === selectedModel}
          type="button"
          title={t('setup.apply_hint')}
        >
          {t('setup.apply')}
        </button>
      </div>

      <div className={styles.activeModelHint}>
        {t('setup.active_model')} <strong>{selectedModel}</strong>
      </div>

      {modelsError && <div className={styles.errorText}>{modelsError}</div>}

      <div className={styles.modelInfoRow}>
        <button
          className={styles.modelInfoBtn}
          onClick={handleGetModelInfo}
          disabled={!apiKey || isFetchingInfo}
          type="button"
        >
          {isFetchingInfo ? t('setup.fetching_info') : t('setup.get_info')}
        </button>
        {modelInfoText && (
          <pre className={styles.modelInfoArea}>{modelInfoText}</pre>
        )}
      </div>


    </div>
  );
};

export default AgentSetupPanel;
