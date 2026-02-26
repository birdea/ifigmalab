import React, { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { figmaNodeIdAtom, figmaConnectedAtom, mcpDataAtom, screenshotAtom, screenshotMimeTypeAtom } from '../atoms';
import styles from '../FigmaAgent.module.scss';

const PROXY_BASE = 'http://localhost:3006';
const POLL_INTERVAL = 10_000;

/** Figma URL 또는 raw node-id를 Figma 형식(콜론 구분)으로 정규화한다.
 *  - 텍스트 어느 위치에 있어도 Figma URL을 찾아 node-id 추출
 *  - "Implement this design from Figma.\n@https://...?node-id=22041-216444" → "22041:216444"
 *  - "1234-5678" → "1234:5678"
 *  - "1234:5678" → 그대로
 */
function parseNodeId(raw: string): string | null {
  // 1) 텍스트 전체에서 Figma URL을 검색 (@ 접두사 포함 여부 무관, 멀티라인 대응)
  const urlMatch = raw.match(/@?(https?:\/\/(?:www\.)?figma\.com\/[^\s]+)/);
  if (urlMatch) {
    try {
      const url = new URL(urlMatch[1]);
      const nodeIdParam = url.searchParams.get('node-id');
      if (!nodeIdParam) return null;
      // "22041-216444" → "22041:216444" (첫 번째 하이픈만 치환)
      return nodeIdParam.replace('-', ':');
    } catch {
      return null;
    }
  }

  const trimmed = raw.trim();

  // 2) 하이픈 구분자 → 콜론으로 변환 (예: "22041-218191")
  if (/^\d+-\d+$/.test(trimmed)) {
    return trimmed.replace('-', ':');
  }

  // 3) 이미 콜론 구분자인 경우 (예: "22041:218191")
  if (/^\d+:\d+$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

const FigmaMcpPanel: React.FC = () => {
  const [nodeId, setNodeId] = useAtom(figmaNodeIdAtom);
  const [connected, setConnected] = useAtom(figmaConnectedAtom);
  const [, setMcpData] = useAtom(mcpDataAtom);
  const [screenshot, setScreenshot] = useAtom(screenshotAtom);
  const [screenshotMimeType, setScreenshotMimeType] = useAtom(screenshotMimeTypeAtom);
  const [fetching, setFetching] = React.useState(false);
  const [fetchingScreenshot, setFetchingScreenshot] = React.useState(false);
  const [fetchError, setFetchError] = React.useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkStatus = async () => {
    try {
      const res = await fetch(`${PROXY_BASE}/api/figma/status`);
      const data = await res.json() as { connected: boolean };
      setConnected(data.connected);
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => {
    checkStatus();
    timerRef.current = setInterval(checkStatus, POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleFetch = async () => {
    if (!nodeId.trim()) {
      setFetchError('Node ID 또는 Figma URL을 입력해주세요.');
      return;
    }

    const resolvedId = parseNodeId(nodeId);
    if (!resolvedId) {
      setFetchError('올바른 Node ID(예: 22041:218191) 또는 Figma URL을 입력해주세요.');
      return;
    }

    // 파싱된 Node ID로 입력창 업데이트
    setNodeId(resolvedId);
    setFetching(true);
    setFetchError('');
    try {
      // proxy-server를 통해 MCP 프로토콜로 Figma Desktop App에 요청
      const res = await fetch(`${PROXY_BASE}/api/figma/fetch-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: resolvedId }),
      });
      const text = await res.text();
      let json: { data?: string; error?: string } = {};
      try { json = JSON.parse(text); } catch {
        throw new Error(`서버 응답 오류 (proxy-server 재시작 필요): ${text.slice(0, 120)}`);
      }
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setMcpData(json.data ?? '');
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e));
    } finally {
      setFetching(false);
    }
  };

  const handleFetchScreenshot = async () => {
    if (!nodeId.trim()) {
      setFetchError('Node ID 또는 Figma URL을 입력해주세요.');
      return;
    }

    const resolvedId = parseNodeId(nodeId);
    if (!resolvedId) {
      setFetchError('올바른 Node ID(예: 22041:218191) 또는 Figma URL을 입력해주세요.');
      return;
    }

    setNodeId(resolvedId);
    setFetchingScreenshot(true);
    setFetchError('');
    try {
      const res = await fetch(`${PROXY_BASE}/api/figma/fetch-screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: resolvedId }),
      });
      const text = await res.text();
      let json: { data?: string; mimeType?: string; error?: string } = {};
      try { json = JSON.parse(text); } catch {
        throw new Error(`서버 응답 오류 (proxy-server 재시작 필요): ${text.slice(0, 120)}`);
      }
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setScreenshot(json.data ?? '');
      setScreenshotMimeType(json.mimeType ?? 'image/png');
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e));
    } finally {
      setFetchingScreenshot(false);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>Figma MCP 연동</div>

      <div className={styles.formRow}>
        <span className={styles.formLabel}>Figma Desktop App → MCP</span>
        <span className={connected ? styles.statusConnected : styles.statusDisconnected}>
          {connected ? '● Connected' : '○ Disconnected'}
        </span>
        <span className={styles.mcpUrl}>localhost:3845</span>
      </div>

      <div className={styles.formRow}>
        <label className={styles.formLabel}>Node ID (선택)</label>
        <div className={styles.inputWithBtn}>
          <input
            className={styles.formInput}
            type="text"
            placeholder="22041:218191  또는  https://www.figma.com/design/...?node-id=22041-218191"
            value={nodeId}
            onChange={e => setNodeId(e.target.value)}
          />
          <button
            className={styles.fetchBtn}
            onClick={handleFetch}
            disabled={fetching || fetchingScreenshot}
            type="button"
          >
            {fetching ? '가져오는 중...' : 'Fetch from Figma'}
          </button>
          <button
            className={styles.fetchScreenshotBtn}
            onClick={handleFetchScreenshot}
            disabled={fetching || fetchingScreenshot}
            type="button"
          >
            {fetchingScreenshot ? '캡처 중...' : '📸 Screenshot'}
          </button>
        </div>
        {fetchError && <span className={styles.errorText}>{fetchError}</span>}
      </div>

      {screenshot && (
        <div className={styles.screenshotPreview}>
          <div className={styles.screenshotHeader}>
            <span className={styles.screenshotLabel}>📸 Screenshot (AI 입력용)</span>
            <button
              className={styles.screenshotClear}
              onClick={() => setScreenshot('')}
              type="button"
            >
              ✕ 제거
            </button>
          </div>
          <img
            className={styles.screenshotThumb}
            src={`data:${screenshotMimeType};base64,${screenshot}`}
            alt="Figma screenshot"
          />
        </div>
      )}
    </div>
  );
};

export default FigmaMcpPanel;
