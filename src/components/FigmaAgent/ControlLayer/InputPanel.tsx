import React, { useRef, useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  mcpDataAtom,
  promptAtom,
  apiKeyAtom,
  selectedModelAtom,
  localAppUrlAtom,
  generateStatusAtom,
  generateErrorAtom,
  generatedHtmlAtom,
  rawResponseAtom,
  debugLogAtom,
  screenshotAtom,
  screenshotMimeTypeAtom,
} from '../atoms';
import styles from '../FigmaAgent.module.scss';

const PROXY_BASE = 'http://localhost:3006';

/** data-node-id, data-name 등 data-* 속성 제거 + 연속 공백 줄 정리 */
function preprocessMcpData(raw: string): string {
  let result = raw
    .replace(/\s+data-node-id="[^"]*"/g, '')
    .replace(/\s+data-name="[^"]*"/g, '')
    .replace(/\s+data-figma-[^=]*="[^"]*"/g, '');
  result = result.split('\n').map(line => line.trimEnd()).join('\n');
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

const InputPanel: React.FC = () => {
  const [mcpData, setMcpData] = useAtom(mcpDataAtom);
  const [prompt, setPrompt] = useAtom(promptAtom);
  const [apiKey] = useAtom(apiKeyAtom);
  const [model] = useAtom(selectedModelAtom);
  const [localAppUrl] = useAtom(localAppUrlAtom);
  const screenshot = useAtomValue(screenshotAtom);
  const screenshotMimeType = useAtomValue(screenshotMimeTypeAtom);
  const [status, setStatus] = useAtom(generateStatusAtom);
  const [, setError] = useAtom(generateErrorAtom);
  const [, setGeneratedHtml] = useAtom(generatedHtmlAtom);
  const [, setRawResponse] = useAtom(rawResponseAtom);
  const [debugLog, setDebugLog] = useAtom(debugLogAtom);
  const debugRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === 'loading';
  const byteSize = new TextEncoder().encode(mcpData).length;
  const formatBytes = (n: number) =>
    n === 0 ? '' : n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} bytes`;

  // 로그 추가 + textarea 자동 스크롤
  const appendLog = (line: string) => {
    const ts = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    setDebugLog(prev => prev + `[${ts}] ${line}\n`);
  };

  useEffect(() => {
    if (debugRef.current) {
      debugRef.current.scrollTop = debugRef.current.scrollHeight;
    }
  }, [debugLog]);

  const handleSubmit = async () => {
    if (!apiKey) {
      setError('Gemini API Token을 먼저 입력해주세요.');
      setStatus('error');
      appendLog('❌ ERROR: Gemini API Token이 없습니다.');
      return;
    }
    if (!mcpData.trim() && !prompt.trim()) {
      setError('MCP 데이터 또는 프롬프트를 입력해주세요.');
      setStatus('error');
      appendLog('❌ ERROR: MCP 데이터와 프롬프트가 모두 비어 있습니다.');
      return;
    }

    setStatus('loading');
    setError('');
    setGeneratedHtml('');
    setRawResponse('');

    const mcpBytes = new TextEncoder().encode(mcpData).length;
    const promptBytes = new TextEncoder().encode(prompt).length;

    appendLog(`▶ Submit 시작`);
    appendLog(`  model      : ${model}`);
    appendLog(`  mcpData    : ${formatBytes(mcpBytes) || '0 bytes'} (${mcpData.length} chars)`);
    appendLog(`  prompt     : ${formatBytes(promptBytes) || '0 bytes'} (${prompt.length} chars)`);
    if (screenshot) {
      const ssBytes = new TextEncoder().encode(screenshot).length;
      appendLog(`  screenshot : ${formatBytes(ssBytes)} (base64, ${screenshotMimeType})`);
    }
    appendLog(`  → POST ${PROXY_BASE}/api/ai/generate`);

    const startTime = Date.now();

    try {
      const res = await fetch(`${PROXY_BASE}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey, model, mcpData, prompt,
          localAppUrl: localAppUrl || undefined,
          screenshot: screenshot ? { data: screenshot, mimeType: screenshotMimeType } : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json() as { error?: string };
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { html: string; rawResponse: string };
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rawBytes = new TextEncoder().encode(data.rawResponse).length;
      const htmlBytes = new TextEncoder().encode(data.html).length;

      appendLog(`✅ 응답 수신 (${elapsed}s)`);
      appendLog(`  rawResponse : ${formatBytes(rawBytes)} (${data.rawResponse.length} chars)`);
      appendLog(`  html        : ${formatBytes(htmlBytes)} (${data.html.length} chars)`);

      // HTML이 잘린 경우 감지
      const isHtmlComplete = data.html.trimEnd().endsWith('</html>');
      if (!isHtmlComplete) {
        appendLog(`  ⚠️  WARNING: HTML이 </html>로 끝나지 않음 → 출력 토큰 한도 초과 가능`);
      }

      // raw response 앞부분 미리보기
      const preview = data.rawResponse.slice(0, 200).replace(/\n/g, '↵');
      appendLog(`  rawResponse preview:\n    ${preview}${data.rawResponse.length > 200 ? '...' : ''}`);

      setGeneratedHtml(data.html);
      setRawResponse(data.rawResponse);
      setStatus('success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      appendLog(`❌ ERROR (${elapsed}s): ${msg}`);
      setError(msg);
      setStatus('error');
    }
  };

  const handleOptimize = () => {
    if (!mcpData.trim()) return;
    const before = new TextEncoder().encode(mcpData).length;
    const optimized = preprocessMcpData(mcpData);
    const after = new TextEncoder().encode(optimized).length;
    setMcpData(optimized);
    appendLog(`🗜 Optimize: ${formatBytes(before)} → ${formatBytes(after)} (${Math.round((1 - after / before) * 100)}% 감소)`);
  };

  const handleClearLog = () => setDebugLog('');

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>Input</div>

      <div className={styles.formCol}>
        <label className={styles.formLabel}>
          Figma MCP Data{' '}
          <span className={styles.formLabelHint}>
            (Figma MCP → get_design_context 결과를 붙여넣기)
          </span>
          {formatBytes(byteSize) && (
            <span className={styles.inputSizeBadge}>{formatBytes(byteSize)}</span>
          )}
        </label>
        <textarea
          className={styles.formTextarea}
          rows={6}
          placeholder={'const imgShape = "http://localhost:3845/assets/...";\n\nexport default function MyComponent() {\n  return (\n    <div className="flex ...">\n      ...\n    </div>\n  );\n}'}
          value={mcpData}
          onChange={e => setMcpData(e.target.value)}
        />
        {mcpData.trim() && (
          <button
            className={styles.optimizeBtn}
            onClick={handleOptimize}
            type="button"
          >
            🗜 Optimize (data-* 속성 제거)
          </button>
        )}
      </div>

      <div className={styles.formCol}>
        <label className={styles.formLabel}>Additional Prompt</label>
        <textarea
          className={styles.formTextarea}
          rows={3}
          placeholder="위 디자인을 그대로 HTML로 구현해줘. 스타일도 최대한 비슷하게 맞춰줘. (추가 지시사항 입력)"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
      </div>

      <div className={styles.submitRow}>
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={isLoading}
          type="button"
        >
          {isLoading ? '생성 중...' : 'Submit ▶'}
        </button>
      </div>

      {/* ── Debug Log ─────────────────────────────────────────── */}
      <div className={styles.debugLogWrap}>
        <div className={styles.debugLogHeader}>
          <span className={styles.debugLogTitle}>Debug Log</span>
          <button className={styles.debugLogClear} onClick={handleClearLog} type="button">
            Clear
          </button>
        </div>
        <textarea
          ref={debugRef}
          className={styles.debugLogArea}
          rows={10}
          readOnly
          value={debugLog || '— Submit 버튼을 누르면 로그가 표시됩니다 —'}
        />
      </div>
    </div>
  );
};

export default InputPanel;
