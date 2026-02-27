import React, { useEffect, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  mcpDataAtom,
  promptAtom,
  apiKeyAtom,
  selectedModelAtom,
  generateStatusAtom,
  generateErrorAtom,
  generatedHtmlAtom,
  rawResponseAtom,
  debugLogAtom,
  screenshotAtom,
  screenshotMimeTypeAtom,
} from '../atoms';
import styles from '../FigmaAgent.module.scss';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const SYSTEM_PROMPT = `당신은 전문 프론트엔드 개발자입니다. Figma 디자인 데이터를 바탕으로 완전히 독립 실행 가능한 HTML 파일을 작성해주세요.

요구사항:
- 반드시 완전한 HTML 파일 (<!DOCTYPE html><html>...</html>) 형태로 출력
- 외부 CDN/라이브러리 없이 순수 HTML/CSS/JS만 사용
- Figma 디자인의 레이아웃, 색상, 폰트, 간격을 최대한 정확하게 재현
- 마크다운 코드 블록(\`\`\`html) 없이 HTML 코드만 출력할 것`;

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { message?: string; code?: number };
}

/** Gemini 응답 텍스트에서 HTML 추출 (마크다운 코드블록 제거) */
function extractHtml(raw: string): string {
  // ```html ... ``` 또는 ``` ... ``` 블록 추출
  const fenced = raw.match(/```(?:html)?\s*\n?([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // 이미 HTML 태그로 시작하면 그대로 반환
  const trimmed = raw.trim();
  if (trimmed.startsWith('<!') || trimmed.startsWith('<html')) return trimmed;
  return trimmed;
}

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
  const screenshot = useAtomValue(screenshotAtom);
  const screenshotMimeType = useAtomValue(screenshotMimeTypeAtom);
  const [status, setStatus] = useAtom(generateStatusAtom);
  const [, setError] = useAtom(generateErrorAtom);
  const [, setGeneratedHtml] = useAtom(generatedHtmlAtom);
  const [, setRawResponse] = useAtom(rawResponseAtom);
  const [, setDebugLog] = useAtom(debugLogAtom);
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [isCountingTokens, setIsCountingTokens] = useState(false);

  const isLoading = status === 'loading';
  const hasApiKey = !!apiKey;
  const hasContent = !!(mcpData.trim() || prompt.trim());
  const isReady = hasApiKey && hasContent;
  const byteSize = new TextEncoder().encode(mcpData).length;
  const formatBytes = (n: number) =>
    n === 0 ? '' : n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} bytes`;

  // 컨텐츠 변경 시 이전 토큰 카운트 초기화
  useEffect(() => {
    setTokenCount(null);
  }, [mcpData, prompt, screenshot]);

  const appendLog = (line: string) => {
    const ts = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    setDebugLog(prev => prev + `[${ts}] ${line}\n`);
  };

  /** generateContent / countTokens 양쪽에서 사용하는 parts 빌더 */
  const buildPromptParts = (): GeminiPart[] => {
    const parts: GeminiPart[] = [];
    if (screenshot) {
      parts.push({ inlineData: { mimeType: screenshotMimeType, data: screenshot } });
    }
    const designContextSection = mcpData.trim() ? `## Figma Design Data\n${mcpData}` : '';
    const userPromptSection = prompt.trim()
      ? `## 추가 지시사항\n${prompt}`
      : '위 Figma 디자인 데이터를 HTML로 구현해줘. 스타일도 최대한 비슷하게 맞춰줘.';
    const textContent = [SYSTEM_PROMPT, '', designContextSection, userPromptSection]
      .filter(Boolean).join('\n\n');
    parts.push({ text: textContent });
    return parts;
  };

  const handleCountTokens = async () => {
    if (!apiKey || (!mcpData.trim() && !prompt.trim())) return;
    setIsCountingTokens(true);
    setTokenCount(null);
    try {
      const parts = buildPromptParts();
      const res = await fetch(
        `${GEMINI_API_BASE}/models/${model}:countTokens?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
        }
      );
      const data = await res.json() as { totalTokens?: number; error?: { message?: string; code?: number } };
      if (!res.ok || data.error) {
        appendLog(`[COUNT TOKENS] ❌ Error (${data.error?.code ?? res.status}): ${data.error?.message ?? res.statusText}`);
      } else {
        const count = data.totalTokens ?? 0;
        setTokenCount(count);
        appendLog(`[COUNT TOKENS] ✓ ${count.toLocaleString()} tokens (model: ${model})`);
      }
    } catch (e) {
      appendLog(`[COUNT TOKENS] ❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsCountingTokens(false);
    }
  };

  const handleSubmit = async () => {
    const bar = '─'.repeat(40);

    // ── Validation ────────────────────────────────────────────
    appendLog(`┌${bar}`);
    appendLog(`│ Submit 요청`);
    appendLog(`├${bar}`);
    appendLog(`│ [VALIDATE] API Key      : ${apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (${apiKey.length} chars) ✓` : '❌ 없음'}`);
    appendLog(`│ [VALIDATE] MCP Data     : ${mcpData.trim() ? `${formatBytes(new TextEncoder().encode(mcpData).length) || '0 bytes'} (${mcpData.length} chars) ✓` : '비어있음'}`);
    appendLog(`│ [VALIDATE] Prompt       : ${prompt.trim() ? `${prompt.length} chars ✓` : '비어있음'}`);
    appendLog(`│ [VALIDATE] Model        : ${model}`);
    appendLog(`│ [VALIDATE] Screenshot   : ${screenshot ? `${formatBytes(new TextEncoder().encode(screenshot).length)} (${screenshotMimeType}) ✓` : '없음'}`);

    if (!apiKey) {
      appendLog(`│ [VALIDATE] ❌ API Key 없음 → 중단`);
      appendLog(`└${bar}`);
      setError('Gemini API Token을 먼저 입력해주세요.');
      setStatus('error');
      return;
    }
    if (!mcpData.trim() && !prompt.trim()) {
      appendLog(`│ [VALIDATE] ❌ MCP Data, Prompt 모두 비어있음 → 중단`);
      appendLog(`└${bar}`);
      setError('MCP 데이터 또는 프롬프트를 입력해주세요.');
      setStatus('error');
      return;
    }
    appendLog(`│ [VALIDATE] ✓ 검증 통과`);

    setStatus('loading');
    setError('');
    setGeneratedHtml('');
    setRawResponse('');

    // ── Build prompt parts ────────────────────────────────────
    const enc = new TextEncoder();
    const parts = buildPromptParts();

    const systemPromptSection = SYSTEM_PROMPT;
    const designContextSection = mcpData.trim() ? `## Figma Design Data\n${mcpData}` : '';
    const userPromptSection = prompt.trim()
      ? `## 추가 지시사항\n${prompt}`
      : '위 Figma 디자인 데이터를 HTML로 구현해줘. 스타일도 최대한 비슷하게 맞춰줘.';
    const textContent = [systemPromptSection, '', designContextSection, userPromptSection]
      .filter(Boolean).join('\n\n');

    const promptBytes = enc.encode(textContent).length;
    const systemBytes = enc.encode(systemPromptSection).length;
    const contextBytes = designContextSection ? enc.encode(designContextSection).length : 0;
    const userBytes = enc.encode(userPromptSection).length;
    const screenshotBytes = screenshot ? enc.encode(screenshot).length : 0;
    const estimatedTokens = Math.round(promptBytes / 4);

    // ── Request ───────────────────────────────────────────────
    const endpoint = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`;
    const requestBody = {
      contents: [{ role: 'user', parts }],
      generationConfig: { maxOutputTokens: 65536 },
    };
    const requestBodyJson = JSON.stringify(requestBody);
    const requestBodyBytes = enc.encode(requestBodyJson).length;

    appendLog(`├${bar}`);
    appendLog(`│ [BUILD]    system prompt   : ${formatBytes(systemBytes)} (${systemPromptSection.length} chars)`);
    appendLog(`│ [BUILD]    design context  : ${contextBytes > 0 ? `${formatBytes(contextBytes)} (${designContextSection.length} chars)` : '없음'}`);
    appendLog(`│ [BUILD]    user prompt     : ${formatBytes(userBytes)} (${userPromptSection.length} chars)`);
    appendLog(`│ [BUILD]    screenshot      : ${screenshotBytes > 0 ? `${formatBytes(screenshotBytes)} (${screenshotMimeType})` : '없음'}`);
    appendLog(`│ [BUILD]    total text      : ${formatBytes(promptBytes)} / est. ~${estimatedTokens.toLocaleString()} tokens`);
    appendLog(`│ [BUILD]    parts count     : ${parts.length} (${screenshot ? 'image + text' : 'text only'})`);
    appendLog(`├${bar}`);
    appendLog(`│ [REQUEST]  model           : ${model}`);
    appendLog(`│ [REQUEST]  endpoint        : POST .../models/${model}:generateContent`);
    appendLog(`│ [REQUEST]  maxOutputTokens : 65,536`);
    appendLog(`│ [REQUEST]  body size       : ${formatBytes(requestBodyBytes)}`);
    appendLog(`├${bar}`);
    appendLog(`│ [NETWORK]  Gemini API 호출 중...`);

    const startTime = Date.now();

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const networkMs = Date.now() - startTime;
      appendLog(`│ [NETWORK]  HTTP ${res.status} ${res.statusText} (${networkMs}ms)`);
      appendLog(`│ [NETWORK]  content-type    : ${res.headers.get('content-type') ?? '-'}`);

      const rawText = await res.text();
      const rawTextBytes = enc.encode(rawText).length;
      appendLog(`│ [NETWORK]  response size   : ${formatBytes(rawTextBytes)}`);

      let data: GeminiResponse;
      try {
        data = JSON.parse(rawText) as GeminiResponse;
      } catch {
        appendLog(`│ [RESPONSE] ❌ JSON 파싱 실패: ${rawText.slice(0, 200)}`);
        appendLog(`└${bar}`);
        throw new Error(`응답 파싱 오류: ${rawText.slice(0, 100)}`);
      }

      if (!res.ok || data.error) {
        const errMsg = data.error?.message ?? `HTTP ${res.status}`;
        appendLog(`│ [RESPONSE] ❌ API 오류 (code: ${data.error?.code ?? res.status}): ${errMsg}`);
        appendLog(`└${bar}`);
        throw new Error(errMsg);
      }

      // ── Parse Gemini response ─────────────────────────────
      appendLog(`├${bar}`);
      appendLog(`│ [RESPONSE] candidates      : ${data.candidates?.length ?? 0}개`);

      const usage = data.usageMetadata;
      if (usage) {
        const inputCost = usage.promptTokenCount ?? 0;
        const outputCost = usage.candidatesTokenCount ?? 0;
        appendLog(`│ [TOKENS]   prompt          : ${inputCost.toLocaleString()} tokens`);
        appendLog(`│ [TOKENS]   candidates      : ${outputCost.toLocaleString()} tokens`);
        appendLog(`│ [TOKENS]   total           : ${(usage.totalTokenCount ?? 0).toLocaleString()} tokens`);
        appendLog(`│ [TOKENS]   ratio (out/in)  : ${inputCost > 0 ? (outputCost / inputCost * 100).toFixed(1) : '-'}%`);
      }

      const finishReason = data.candidates?.[0]?.finishReason;
      appendLog(`│ [RESPONSE] finishReason    : ${finishReason ?? 'unknown'}`);
      if (finishReason === 'MAX_TOKENS') {
        appendLog(`│ [RESPONSE] ⚠️  MAX_TOKENS — 출력이 잘렸을 수 있습니다 (maxOutputTokens 초과)`);
      } else if (finishReason === 'STOP') {
        appendLog(`│ [RESPONSE] ✓  STOP — 정상 종료`);
      } else if (finishReason === 'SAFETY') {
        appendLog(`│ [RESPONSE] ⚠️  SAFETY — 안전 정책으로 차단됨`);
      }

      const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const rawBytes = enc.encode(rawResponse).length;
      const rawLines = rawResponse.split('\n').length;
      appendLog(`│ [RESPONSE] raw text        : ${formatBytes(rawBytes)} / ${rawLines.toLocaleString()} lines`);

      appendLog(`├${bar}`);
      const html = extractHtml(rawResponse);
      const htmlBytes = enc.encode(html).length;
      const htmlLines = html.split('\n').length;
      appendLog(`│ [EXTRACT]  html size       : ${formatBytes(htmlBytes)} / ${htmlLines.toLocaleString()} lines`);

      const hasDoctype = /<!DOCTYPE\s+html/i.test(html);
      const hasHead = /<head[\s>]/i.test(html);
      const hasBody = /<body[\s>]/i.test(html);
      const styleCount = (html.match(/<style[\s>]/gi) ?? []).length;
      const scriptCount = (html.match(/<script[\s>]/gi) ?? []).length;
      const isHtmlComplete = html.trimEnd().endsWith('</html>');

      appendLog(`│ [EXTRACT]  <!DOCTYPE>      : ${hasDoctype ? '✓' : '✗'}`);
      appendLog(`│ [EXTRACT]  <head>          : ${hasHead ? '✓' : '✗'}`);
      appendLog(`│ [EXTRACT]  <body>          : ${hasBody ? '✓' : '✗'}`);
      appendLog(`│ [EXTRACT]  <style> blocks  : ${styleCount}`);
      appendLog(`│ [EXTRACT]  <script> blocks : ${scriptCount}`);
      appendLog(`│ [EXTRACT]  </html> 종료    : ${isHtmlComplete ? '✓' : '⚠️  없음 (토큰 부족 가능)'}`);

      appendLog(`├${bar}`);
      const firstLines = html.split('\n').slice(0, 3).map(l => l.trimEnd()).join('↵');
      const lastLines = html.split('\n').slice(-3).map(l => l.trimEnd()).join('↵');
      appendLog(`│ [PREVIEW]  first 3 lines   : ${firstLines}`);
      appendLog(`│ [PREVIEW]  last  3 lines   : ${lastLines}`);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      appendLog(`├${bar}`);
      appendLog(`│ ✅ 생성 완료 (${elapsed}s)`);
      appendLog(`└${bar}`);

      setGeneratedHtml(html);
      setRawResponse(rawResponse);
      setStatus('success');
    } catch (e) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const isNetworkError = e instanceof TypeError &&
        (e.message === 'Failed to fetch' || e.message.includes('NetworkError'));

      if (isNetworkError) {
        appendLog(`│ [NETWORK]  ❌ 연결 실패 (${elapsed}s)`);
        appendLog(`│ [DIAGNOSE] Gemini API 서버에 연결할 수 없습니다.`);
        appendLog(`│ [DIAGNOSE] 인터넷 연결 상태를 확인해주세요.`);
      } else {
        appendLog(`│ [ERROR]    ❌ 실패 (${elapsed}s): ${e instanceof Error ? e.message : String(e)}`);
      }
      appendLog(`└${bar}`);

      setError(e instanceof Error ? e.message : String(e));
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

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>Design Prompt</div>

      <div className={styles.formCol}>
        <label className={styles.formLabel}>
          Context{' '}
          <span className={styles.formLabelHint}>
            (Fetch 시 자동 입력 (또는 Figma MCP get_design_context 결과 붙여넣기))
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
        <label className={styles.formLabel}>Prompt</label>
        <textarea
          className={styles.formTextarea}
          rows={3}
          placeholder="위 디자인을 그대로 HTML로 구현해줘. 스타일도 최대한 비슷하게 맞춰줘. (추가 지시사항 입력)"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
      </div>

      <div className={styles.readinessRow}>
        <span className={hasApiKey ? styles.readyItem : styles.notReadyItem}>
          {hasApiKey ? '✓' : '✗'} API Key
        </span>
        <span className={hasContent ? styles.readyItem : styles.notReadyItem}>
          {hasContent ? '✓' : '✗'} Content
        </span>
        {tokenCount !== null && (
          <span className={styles.tokenBadge}>{tokenCount.toLocaleString()} tokens</span>
        )}
        {isReady && !isLoading && tokenCount === null && (
          <span className={styles.readyBadge}>Ready</span>
        )}
      </div>

      <div className={styles.submitRow}>
        <div className={styles.submitBtnGroup}>
          <button
            className={styles.countTokensBtn}
            onClick={handleCountTokens}
            disabled={!isReady || isCountingTokens || isLoading}
            type="button"
          >
            {isCountingTokens ? 'Counting...' : 'Count Tokens'}
          </button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={isLoading || !isReady}
            type="button"
          >
            {isLoading ? '생성 중...' : 'Submit ▶'}
          </button>
        </div>
      </div>

    </div>
  );
};

export default InputPanel;
