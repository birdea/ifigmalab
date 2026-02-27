import React, { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { apiKeyAtom, selectedModelAtom, geminiModelsAtom, modelInfoTextAtom, isLockedAtom, savedEncryptedKeyAtom, pinAtom, rememberKeyAtom } from '../atoms';
import styles from '../FigmaAgent.module.scss';
import { GEMINI_API_BASE } from '../utils';

const LOCAL_STORAGE_KEY_ENC = 'figma_agent_api_key_enc';

// Utilities for Web Crypto API based PBKDF2 + AES-GCM
async function deriveKey(pin: string, salt: Uint8Array) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 310000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptData(text: string, pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(text)
  );
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptData(encryptedBase64: string, pin: string): Promise<string> {
  const combinedStr = atob(encryptedBase64);
  const combined = new Uint8Array(combinedStr.length);
  for (let i = 0; i < combinedStr.length; i++) {
    combined[i] = combinedStr.charCodeAt(i);
  }
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const data = combined.slice(28);
  const key = await deriveKey(pin, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  return new TextDecoder().decode(decrypted);
}

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

function isGeminiModelsListResponse(v: unknown): v is GeminiModelsListResponse {
  return typeof v === 'object' && v !== null && ('models' in v || 'error' in v);
}

function isGeminiModelInfo(v: unknown): v is GeminiModelInfo {
  return typeof v === 'object' && v !== null && ('name' in v || 'error' in v);
}


/**
 * API Key 초기화, Model 선택 여부, 로컬 암호화 저장을 설정하는 Panel.
 */
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

  // Jotai 상태로 변경하여 탭을 이동해도 잠금 파트가 유지되도록 처리
  const [rememberKey, setRememberKey] = useAtom(rememberKeyAtom);
  const [pin, setPin] = useAtom(pinAtom);
  const [savedEncryptedKey, setSavedEncryptedKey] = useAtom(savedEncryptedKeyAtom);
  const [isLocked, setIsLocked] = useAtom(isLockedAtom);

  const [unlockError, setUnlockError] = useState('');

  // selectedModel이 외부(Fetch 작업 등)에서 변경될 경우, 내부 Staged 상태와 동기화
  useEffect(() => {
    setStagedModel(selectedModel);
  }, [selectedModel, setStagedModel]);

  const fetchModels = React.useCallback(async (key: string) => {
    if (!key) return;
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
        }
      }
    } catch (e) {
      setModelsError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsFetchingModels(false);
    }
  }, [selectedModel, setGeminiModels, setSelectedModel]);

  // Component Mount 시 LocalStorage 암호화 Key 검사 (세션당 1회 실행)
  useEffect(() => {
    // 이미 언락했거나(key가 있거나) 체크했으면 스킵
    if (apiKey || savedEncryptedKey) return;

    const enc = localStorage.getItem(LOCAL_STORAGE_KEY_ENC);
    if (enc) {
      setSavedEncryptedKey(enc);
      setIsLocked(true);
      setRememberKey(true);
    } else {
      // 하위 호환성 유지: 기존 일반 Text 형태의 SessionStorage 조회 복원
      const sessionKey = sessionStorage.getItem('figma_agent_api_key');
      if (sessionKey) {
        setApiKey(sessionKey);
        fetchModels(sessionKey);
      }
    }
  }, [apiKey, savedEncryptedKey, setSavedEncryptedKey, setIsLocked, setRememberKey, setApiKey, fetchModels]);

  // 조건 충족 시 API Key를 암호화하여 로컬에 보관
  useEffect(() => {
    // 잠겨있는 상태(Unlock 화면)일 때는 저장 로직이 돌면 안 됨!
    if (isLocked) return;

    let isActive = true;
    const saveEncrypted = async () => {
      // apiKey가 있을 때만 암호화 저장 진행
      if (rememberKey && apiKey && pin.length >= 4) {
        try {
          let needsSave = true;
          // 기존 암호화된 키가 있다면 복호화해서 같은 값인지 확인
          if (savedEncryptedKey) {
            try {
              const decryptedKey = await decryptData(savedEncryptedKey, pin);
              if (decryptedKey === apiKey) {
                needsSave = false; // 암호화된 값이 동일할 경우 새로 쓰지 않음
              }
            } catch {
              // 복호화 실패 시 (e.g. PIN 변경) 새로 암호화하여 덮어씀
            }
          }

          if (needsSave && isActive) {
            const encrypted = await encryptData(apiKey, pin);
            localStorage.setItem(LOCAL_STORAGE_KEY_ENC, encrypted);
            setSavedEncryptedKey(encrypted);
          }
        } catch (e) {
          console.error('Encryption failed', e);
        }
      } else if (!rememberKey && savedEncryptedKey) {
        // rememberKey 토글 해제 시 보관된 암호화 정보 제거
        if (isActive) {
          localStorage.removeItem(LOCAL_STORAGE_KEY_ENC);
          setSavedEncryptedKey('');
        }
      }
    };
    saveEncrypted();
    return () => { isActive = false; };
  }, [rememberKey, apiKey, pin, isLocked, savedEncryptedKey, setSavedEncryptedKey]);

  const handleUnlock = async () => {
    try {
      const decryptedKey = await decryptData(savedEncryptedKey, pin);
      if (!decryptedKey) throw new Error('Invalid PIN');

      setApiKey(decryptedKey);
      setIsLocked(false);
      setUnlockError('');
      fetchModels(decryptedKey);
    } catch {
      setUnlockError('PIN 번호가 일치하지 않습니다.');
    }
  };

  const handleResetPin = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY_ENC);
    setSavedEncryptedKey('');
    setPin('');
  };

  const handleClearSaved = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY_ENC);
    setSavedEncryptedKey('');
    setIsLocked(false);
    setApiKey('');
    setPin('');
    setRememberKey(false);
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
  };

  const handleGetModelInfo = async () => {
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
                    <span className={styles.savedBadge} style={{ alignSelf: 'center', whiteSpace: 'nowrap', marginLeft: '8px' }}>자동 저장됨</span>
                    {savedEncryptedKey && (
                      <button className={styles.toggleBtn} onClick={handleResetPin} type="button" style={{ marginLeft: '8px' }}>
                        PIN 변경 시 초기화
                      </button>
                    )}
                  </>
                ) : (
                  <span className={styles.providerTodo} style={{ fontSize: '0.8rem', alignSelf: 'center', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                    4자리 이상 필요
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={styles.formRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ fontSize: '0.9rem', color: '#e2e8f0', marginBottom: '4px' }}>
            🔒 암호화된 API 키가 저장되어 있습니다.<br />PIN을 입력해 안전하게 잠금 해제하세요.
          </div>
          <div className={styles.inputWithBtn} style={{ width: '100%', marginBottom: '4px' }}>
            <input
              className={styles.formInput}
              type={showKey ? 'text' : 'password'}
              placeholder="PIN 번호 입력"
              value={pin}
              onChange={e => { setPin(e.target.value); setUnlockError(''); }}
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
          {unlockError && <div className={styles.errorText} style={{ marginTop: '0' }}>{unlockError}</div>}
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
