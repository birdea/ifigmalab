import React, { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { figmaNodeIdAtom, figmaConnectedAtom, mcpDataAtom, screenshotAtom, screenshotMimeTypeAtom, proxyServerUrlAtom, figmaMcpServerUrlAtom } from '../atoms';
import styles from '../FigmaAgent.module.scss';

const POLL_INTERVAL = 10_000;

/** 
 * Figma URL 또는 Node ID 파라미터를 입력받아 Figma MCP 처리 형태(콜론 구분)로 정규화합니다.
 * @param {string} raw - 사용자가 입력한 URL 형태의 문자열 또는 Node ID 포맷값
 * @returns {string | null} 정규화된 Node ID 또는 포맷 에러 시 null 반환
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

interface ConnectionStatus {
  connected: boolean;
}

function isConnectionStatus(v: unknown): v is ConnectionStatus {
  return typeof v === 'object' && v !== null && 'connected' in v && typeof (v as ConnectionStatus).connected === 'boolean';
}

/**
 * Figma MCP와의 통신 환경 설정을 관리하고, Figma 디자인 요소에서 상태를 가져오는 패널.
 */
const FigmaMcpPanel: React.FC = () => {
  const [nodeId, setNodeId] = useAtom(figmaNodeIdAtom);
  const [connected, setConnected] = useAtom(figmaConnectedAtom);
  const [, setMcpData] = useAtom(mcpDataAtom);
  const [screenshot, setScreenshot] = useAtom(screenshotAtom);
  const [screenshotMimeType, setScreenshotMimeType] = useAtom(screenshotMimeTypeAtom);
  const [proxyServerUrl] = useAtom(proxyServerUrlAtom);
  const [figmaMcpServerUrl, setFigmaMcpServerUrl] = useAtom(figmaMcpServerUrlAtom);
  const [fetching, setFetching] = React.useState(false);
  const [fetchingScreenshot, setFetchingScreenshot] = React.useState(false);
  const [fetchError, setFetchError] = React.useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resolvedNodeId = React.useMemo(() => parseNodeId(nodeId), [nodeId]);

  const checkStatus = React.useCallback(async () => {
    try {
      const res = await fetch(`${proxyServerUrl}/api/figma/status`);
      const data = await res.json();
      if (isConnectionStatus(data)) {
        const isConnected = data.connected;
        setConnected(isConnected);
        return isConnected;
      } else {
        setConnected(false);
        return false;
      }
    } catch {
      setConnected(false);
      return false;
    }
  }, [proxyServerUrl, setConnected]);

  useEffect(() => {
    let active = true;
    let delay = POLL_INTERVAL;

    const poll = async () => {
      if (!active) return;
      const ok = await checkStatus();
      if (!active) return;
      delay = ok ? POLL_INTERVAL : Math.min(delay * 2, 60000);
      timerRef.current = setTimeout(poll, delay);
    };

    poll();

    return () => {
      active = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [checkStatus]);

  const fetchFigmaData = React.useCallback(async <T,>(
    endpoint: string,
    setFetchingState: (val: boolean) => void,
    onSuccess: (json: T) => void
  ) => {
    if (!nodeId.trim()) {
      setFetchError('Node ID 또는 Figma URL을 입력해주세요.');
      return;
    }

    if (!resolvedNodeId) {
      setFetchError('올바른 Node ID(예: 22041:218191) 또는 Figma URL을 입력해주세요.');
      return;
    }

    setNodeId(resolvedNodeId);
    setFetchingState(true);
    setFetchError('');
    try {
      const res = await fetch(`${proxyServerUrl}/api/figma/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: resolvedNodeId, mcpServerUrl: figmaMcpServerUrl }),
      });
      const text = await res.text();
      let json: { error?: string, data?: string, mimeType?: string } = {};
      try { json = JSON.parse(text); } catch {
        throw new Error(`서버 응답 오류 (proxy-server 재시작 필요): ${text.slice(0, 120)}`);
      }
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      onSuccess(json as unknown as T);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e));
    } finally {
      setFetchingState(false);
    }
  }, [nodeId, resolvedNodeId, proxyServerUrl, figmaMcpServerUrl, setNodeId]);

  /** Proxy Server와 연계하여 Figma Node 정보를 Fetch 하여 로컬 상태에 주입합니다. */
  const handleFetch = React.useCallback(() => fetchFigmaData<{ data?: string }>(
    'fetch-context',
    setFetching,
    (json) => setMcpData(json.data ?? '')
  ), [fetchFigmaData, setFetching, setMcpData]);

  /** Proxy Server와 연계하여 대상 Figma Node 영역의 Screenshot을 Fetch 해옵니다. */
  const handleFetchScreenshot = React.useCallback(() => fetchFigmaData<{ data?: string, mimeType?: string }>(
    'fetch-screenshot',
    setFetchingScreenshot,
    (json) => {
      setScreenshot(json.data ?? '');
      setScreenshotMimeType(json.mimeType ?? 'image/png');
    }
  ), [fetchFigmaData, setFetchingScreenshot, setScreenshot, setScreenshotMimeType]);

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>Figma MCP 연동</div>

      <div className={styles.formRow}>
        <label className={styles.formLabel}>Server URL</label>
        <div className={styles.inputWithBtn}>
          <input
            className={styles.formInput}
            type="url"
            placeholder="http://localhost:3845"
            value={figmaMcpServerUrl}
            onChange={e => setFigmaMcpServerUrl(e.target.value)}
          />
          <button
            className={styles.fetchBtn}
            onClick={checkStatus}
            type="button"
          >
            적용
          </button>
          <span className={connected ? styles.statusConnected : styles.statusDisconnected}>
            {connected ? '(●) : 연결됨' : '(○) : 연결 안 됨'}
          </span>
        </div>
      </div>

      <div className={styles.formRow}>
        <label className={styles.formLabel}>Node ID</label>
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
            {fetching ? '가져오는 중...' : '데이터 가져오기'}
          </button>
          <button
            className={styles.fetchScreenshotBtn}
            onClick={handleFetchScreenshot}
            disabled={fetching || fetchingScreenshot || !connected || !resolvedNodeId}
            type="button"
          >
            {fetchingScreenshot ? '캡처 중...' : '📸 스크린샷'}
          </button>
        </div>
        {fetchError && <span className={styles.errorText}>{fetchError}</span>}
      </div>

      {screenshot && (
        <div className={styles.screenshotPreview}>
          <div className={styles.screenshotHeader}>
            <span className={styles.screenshotLabel}>📸 스크린샷 (AI 입력용)</span>
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
