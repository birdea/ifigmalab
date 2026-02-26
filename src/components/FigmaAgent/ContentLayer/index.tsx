import React from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { generatedHtmlAtom, showSourceAtom, generateStatusAtom, rawResponseAtom, mcpDataAtom } from '../atoms';
import StatusBar from './StatusBar';
import PreviewFrame from './PreviewFrame';
import styles from '../FigmaAgent.module.scss';

const ContentLayer: React.FC = () => {
  const html = useAtomValue(generatedHtmlAtom);
  const [showSource, setShowSource] = useAtom(showSourceAtom);
  const [showDebug, setShowDebug] = React.useState(false);
  const status = useAtomValue(generateStatusAtom);
  const rawResponse = useAtomValue(rawResponseAtom);
  const mcpData = useAtomValue(mcpDataAtom);

  const handleDownload = () => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `figma-agent-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.contentLayer}>
      <StatusBar />

      {status === 'loading' && (
        <div className={styles.loadingPlaceholder}>
          <div className={styles.loadingSpinner} />
          <span>AI가 코드를 생성하고 있습니다...</span>
        </div>
      )}

      {html && (
        <>
          <PreviewFrame />

          <div className={styles.contentActions}>
            <button
              className={styles.actionBtn}
              onClick={() => setShowSource(v => !v)}
              type="button"
            >
              {showSource ? '▲ Hide Source Code' : '▼ Show Source Code'}
            </button>
            <button className={styles.actionBtn} onClick={handleDownload} type="button">
              ⬇ Download HTML
            </button>
            <button
              className={`${styles.actionBtn} ${styles.actionBtnDebug}`}
              onClick={() => setShowDebug(v => !v)}
              type="button"
            >
              {showDebug ? '▲ Hide Debug' : '🔍 Debug Info'}
            </button>
          </div>

          {showSource && (
            <div className={styles.sourceBlock}>
              <pre className={styles.sourceCode}>{html}</pre>
            </div>
          )}

          {showDebug && (
            <div className={styles.debugBlock}>
              <div className={styles.debugSection}>
                <div className={styles.debugLabel}>
                  📋 MCP Data 전송 여부 ({mcpData.length} chars)
                </div>
                <pre className={styles.debugCode}>
                  {mcpData.length === 0
                    ? '⚠️ 비어있음 — Figma MCP 데이터가 없습니다. Fetch from Figma를 실행하거나 직접 붙여넣기 하세요.'
                    : mcpData.slice(0, 500) + (mcpData.length > 500 ? '\n...(truncated)' : '')}
                </pre>
              </div>
              <div className={styles.debugSection}>
                <div className={styles.debugLabel}>
                  🤖 AI Raw Response ({rawResponse.length} chars)
                </div>
                <pre className={styles.debugCode}>
                  {rawResponse.slice(0, 800) + (rawResponse.length > 800 ? '\n...(truncated)' : '')}
                </pre>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ContentLayer;
