import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useAtom, useAtomValue } from 'jotai';
import {
  mcpDataAtom,
  promptAtom,
  generateStatusAtom,
  debugLogAtom,
  apiKeyAtom,
  screenshotAtom
} from '../atoms';
import styles from '../FigmaAgent.module.scss';
import {
  preprocessMcpData,
} from '../utils';
import { useAgentSubmit } from '../hooks/useAgentSubmit';
import { formatBytes, TEXT_ENCODER } from '../../../utils/utils';

/**
 * 사용자의 추가 Prompt와 Figma MCP 데이터를 모아 Gemini API로 전송하는 입력 패널 Component.
 * Token 수 계산 및 생성 요청(Validation 포함) 로직을 관리합니다.
 */
const InputPanel: React.FC = () => {
  const { t } = useTranslation();
  const [mcpData, setMcpData] = useAtom(mcpDataAtom);

  const [prompt, setPrompt] = useAtom(promptAtom);
  const [status] = useAtom(generateStatusAtom);
  const [debugLog, setDebugLog] = useAtom(debugLogAtom);
  const apiKey = useAtomValue(apiKeyAtom);
  const screenshot = useAtomValue(screenshotAtom);
  const logRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [debugLog]);

  const isLoading = status === 'loading';
  const hasApiKey = !!apiKey;
  const hasContent = !!(mcpData.trim() || prompt.trim());
  const isReady = hasApiKey && hasContent;
  const byteSize = useMemo(() => TEXT_ENCODER.encode(mcpData).length, [mcpData]);


  const appendLog = useCallback((line: string) => {
    const ts = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    setDebugLog(prev => {
      const newLine = `[${ts}] ${line}\n`;
      const combined = prev + newLine;
      const lines = combined.split('\n');
      if (lines.length > 500) {
        return lines.slice(lines.length - 500).join('\n');
      }
      return combined;
    });
  }, [setDebugLog]);

  const {
    tokenCount,
    setTokenCount,
    isCountingTokens,
    handleCountTokens,
    handleSubmit
  } = useAgentSubmit(appendLog);

  // 컨텐츠 변경 시 이전 토큰 카운트 초기화
  useEffect(() => {
    setTokenCount(null);
  }, [mcpData, prompt, screenshot, setTokenCount]);





  const handleOptimize = () => {
    if (!mcpData.trim()) return;
    const before = TEXT_ENCODER.encode(mcpData).length;
    const optimized = preprocessMcpData(mcpData);
    const after = TEXT_ENCODER.encode(optimized).length;
    setMcpData(optimized);
    appendLog(t('input.optimize_log', {
      before: formatBytes(before),
      after: formatBytes(after),
      percent: Math.round((1 - after / before) * 100)
    }));
  };


  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle} id="panel-title">{t('input.title')}</div>


      <div className={styles.formCol}>
        <div className={styles.contextLabelRow}>
          <label className={styles.formLabel} htmlFor="context-textarea">
            {t('input.context')}{' '}
            <span className={styles.formLabelHint}>
              {t('input.context_hint')}
            </span>

            {formatBytes(byteSize) && (
              <span className={styles.inputSizeBadge} aria-live="polite">
                {formatBytes(byteSize)}
              </span>
            )}
          </label>
          {mcpData.trim() && (
            <button
              className={styles.optimizeBtn}
              onClick={handleOptimize}
              type="button"
              aria-label={t('input.optimize_label')}
            >
              🗜 {t('input.optimize')}
            </button>

          )}
        </div>
        <textarea
          id="context-textarea"
          className={styles.formTextarea}
          rows={6}
          placeholder={'const imgShape = "http://localhost:3845/assets/...";\n\nexport default function MyComponent() {\n  return (\n    <div className="flex ...">\n      ...\n    </div>\n  );\n}'}
          value={mcpData}
          onChange={e => setMcpData(e.target.value)}
          aria-describedby="panel-title"
        />
      </div>

      <hr aria-hidden="true" />

      <div className={styles.formCol}>
        <label className={styles.formLabel} htmlFor="prompt-textarea">
          {t('input.prompt')}
        </label>
        <textarea
          id="prompt-textarea"
          className={styles.formTextarea}
          rows={3}
          placeholder={t('input.prompt_placeholder')}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
      </div>


      <div className={styles.readinessRow} aria-live="polite">
        <span className={hasApiKey ? styles.readyItem : styles.notReadyItem}>
          {hasApiKey ? `✓ ${t('input.api_key_ok')}` : `✗ ${t('input.api_key_ng')}`}
        </span>
        <span className={hasContent ? styles.readyItem : styles.notReadyItem}>
          {hasContent ? `✓ ${t('input.content_ok')}` : `✗ ${t('input.content_ng')}`}
        </span>

        {tokenCount !== null && (
          <span className={styles.tokenBadge}>{tokenCount.toLocaleString()} {t('input.tokens')}</span>
        )}
        {isReady && !isLoading && tokenCount === null && (
          <span className={styles.readyBadge}>{t('input.ready')}</span>
        )}

      </div>

      <div className={styles.submitRow}>
        <div className={styles.submitBtnGroup}>
          <button
            className={styles.countTokensBtn}
            onClick={handleCountTokens}
            disabled={!isReady || isCountingTokens || isLoading}
            type="button"
            aria-busy={isCountingTokens}
          >
            {isCountingTokens ? t('input.counting') : t('input.count_tokens')}
          </button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={isLoading || !isReady}
            type="button"
            aria-busy={isLoading}
          >
            {isLoading ? t('input.submitting') : t('input.submit')}
          </button>

        </div>
      </div>

      <hr aria-hidden="true" />

      {debugLog && (
        <div className={styles.debugLogWrap}>
          <div className={styles.debugLogHeader}>
            <span className={styles.debugLogTitle} id="debug-log-title">{t('input.debug_log')}</span>
            <button
              className={styles.debugLogClear}
              onClick={() => setDebugLog('')}
              type="button"
              aria-label={t('input.clear_log_label')}
            >
              {t('input.clear_log')}
            </button>
          </div>

          <textarea
            ref={logRef}
            className={styles.debugLogArea}
            readOnly
            value={debugLog}
            rows={8}
            aria-labelledby="debug-log-title"
            aria-live="polite"
          />
        </div>
      )}

    </div>
  );
};

export default InputPanel;
