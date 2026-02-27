import React, { useEffect, useRef, useCallback } from 'react';
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
  formatBytes,
} from '../utils';
import { useAgentSubmit } from '../hooks/useAgentSubmit';

const TEXT_ENCODER = new TextEncoder();

/**
 * 사용자의 추가 Prompt와 Figma MCP 데이터를 모아 Gemini API로 전송하는 입력 패널 Component.
 * Token 수 계산 및 생성 요청(Validation 포함) 로직을 관리합니다.
 */
const InputPanel: React.FC = () => {
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
  const byteSize = React.useMemo(() => TEXT_ENCODER.encode(mcpData).length, [mcpData]);

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
    appendLog(`🗜 데이터 최적화: ${formatBytes(before)} → ${formatBytes(after)} (${Math.round((1 - after / before) * 100)}% 감소)`);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle} id="panel-title">디자인 프롬프트 (Design Prompt)</div>

      <div className={styles.formCol}>
        <div className={styles.contextLabelRow}>
          <label className={styles.formLabel} htmlFor="context-textarea">
            컨텍스트 (Context){' '}
            <span className={styles.formLabelHint}>
              (Fetch 시 자동 입력 (또는 Figma MCP get_design_context 결과 붙여넣기))
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
              aria-label="데이터 사이즈 최적화 (data-* 속성 제거)"
            >
              🗜 최적화 (Optimize)
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

      <div className={styles.formCol} role="separator" aria-orientation="horizontal" />

      <div className={styles.formCol}>
        <label className={styles.formLabel} htmlFor="prompt-textarea">
          프롬프트 (Prompt)
        </label>
        <textarea
          id="prompt-textarea"
          className={styles.formTextarea}
          rows={3}
          placeholder="위 디자인을 그대로 HTML로 구현해줘. 스타일도 최대한 비슷하게 맞춰줘. (추가 지시사항 입력)"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
      </div>

      <div className={styles.readinessRow} aria-live="polite">
        <span className={hasApiKey ? styles.readyItem : styles.notReadyItem}>
          {hasApiKey ? '✓ API 키 (API Key)' : '✗ API 키 없음 (No API Key)'}
        </span>
        <span className={hasContent ? styles.readyItem : styles.notReadyItem}>
          {hasContent ? '✓ 컨텐츠 (Content)' : '✗ 컨텐츠 없음 (No Content)'}
        </span>
        {tokenCount !== null && (
          <span className={styles.tokenBadge}>{tokenCount.toLocaleString()} 토큰 (tokens)</span>
        )}
        {isReady && !isLoading && tokenCount === null && (
          <span className={styles.readyBadge}>준비 완료 (Ready)</span>
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
            {isCountingTokens ? '토큰 계산 중...' : '토큰 계산 (Count Tokens)'}
          </button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={isLoading || !isReady}
            type="button"
            aria-busy={isLoading}
          >
            {isLoading ? '생성 중...' : '생성 요청 (Submit) ▶'}
          </button>
        </div>
      </div>

      <div role="separator" aria-orientation="horizontal" />

      {debugLog && (
        <div className={styles.debugLogWrap}>
          <div className={styles.debugLogHeader}>
            <span className={styles.debugLogTitle} id="debug-log-title">디버그 로그 (Debug Log)</span>
            <button
              className={styles.debugLogClear}
              onClick={() => setDebugLog('')}
              type="button"
              aria-label="로그 지우기"
            >
              지우기 (Clear)
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
