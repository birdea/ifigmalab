# iFigmaLab — 전문 코드 리뷰

> 작성일: 2026-02-27
> 리뷰 대상: `src/` 전체 (React 19 + Jotai + Webpack 5 Module Federation)
> 우선순위: 🔴 Critical / 🟠 High / 🟡 Medium / 🔵 Low

---

## 목차

1. [보안 (Security)](#1-보안-security)
2. [아키텍처 (Architecture)](#2-아키텍처-architecture)
3. [코드 품질 (Code Quality)](#3-코드-품질-code-quality)
4. [성능 (Performance)](#4-성능-performance)
5. [접근성 / UX (Accessibility & UX)](#5-접근성--ux-accessibility--ux)
6. [빌드 / 설정 (Build & Config)](#6-빌드--설정-build--config)
7. [테스트 (Testing)](#7-테스트-testing)
8. [개선 우선순위 요약](#8-개선-우선순위-요약)

---

## 1. 보안 (Security)

### 🔴 S-01 — API 키를 URL 쿼리 파라미터로 전송

**위치:** [InputPanel.tsx:131](src/components/FigmaAgent/ControlLayer/InputPanel.tsx#L131), [InputPanel.tsx:207](src/components/FigmaAgent/ControlLayer/InputPanel.tsx#L207), [AgentSetupPanel.tsx:74](src/components/FigmaAgent/ControlLayer/AgentSetupPanel.tsx#L74), [AgentSetupPanel.tsx:138](src/components/FigmaAgent/ControlLayer/AgentSetupPanel.tsx#L138)

**문제:**
```ts
// 현재 코드
const res = await fetch(`${GEMINI_API_BASE}/models/${model}:countTokens?key=${apiKey}`);
```
API 키를 URL 쿼리 파라미터로 전달하면 브라우저 히스토리, 서버 액세스 로그, 프록시 로그에 키가 평문으로 기록된다.

**개선:**
```ts
const res = await fetch(`${GEMINI_API_BASE}/models/${model}:countTokens`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,   // Gemini 공식 헤더
  },
  body: JSON.stringify({ ... }),
});
```

---

### 🔴 S-02 — API 키를 `localStorage`에 평문 저장

**위치:** [AgentSetupPanel.tsx:7](src/components/FigmaAgent/ControlLayer/AgentSetupPanel.tsx#L7), [AgentSetupPanel.tsx:115](src/components/FigmaAgent/ControlLayer/AgentSetupPanel.tsx#L115)

**문제:**
```ts
const LOCAL_STORAGE_KEY = 'figma_agent_api_key';
localStorage.setItem(LOCAL_STORAGE_KEY, apiKey);
```
`localStorage`는 동일 오리진의 모든 JS 코드(XSS 포함)가 접근 가능하다. 특히 iframe `sandbox="allow-same-origin allow-scripts"` 설정과 함께 사용될 경우 위험도가 증가한다.

또한 [atoms.ts:21](src/components/FigmaAgent/atoms.ts#L21)의 주석(`sessionStorage 연동은 컴포넌트에서 처리`)과 실제 구현(`localStorage`)이 불일치한다.

**개선 방향:**
- 단기: `sessionStorage`로 교체 (탭 닫으면 삭제)
- 장기: 백엔드 프록시를 통해 클라이언트가 API 키를 직접 보유하지 않는 구조로 전환

---

### 🟠 S-03 — iframe `allow-same-origin`과 `allow-scripts` 동시 허용

**위치:** [PreviewFrame.tsx:36](src/components/FigmaAgent/ContentLayer/PreviewFrame.tsx#L36), [App.tsx:80](src/App.tsx#L80)

**문제:**
```tsx
<iframe srcDoc={html} sandbox="allow-scripts allow-same-origin" />
```
AI가 생성한 신뢰할 수 없는 HTML을 렌더링할 때 `allow-same-origin`과 `allow-scripts`를 동시에 허용하면, iframe 내 스크립트가 부모 문서의 DOM, localStorage, sessionStorage에 접근할 수 있다.

**개선:**
```tsx
{/* AI 생성 콘텐츠는 allow-same-origin 제거 */}
<iframe srcDoc={html} sandbox="allow-scripts" referrerPolicy="no-referrer" />
```
단, `allow-same-origin` 제거 시 내부 스크립트의 일부 기능(폰트 로드 등)이 제한될 수 있으니 케이스별로 검토 필요.

---

### 🟡 S-04 — DevServer CORS 와일드카드

**위치:** [webpack.config.js:14](webpack.config.js#L14)

```js
headers: { "Access-Control-Allow-Origin": "*" }
```
개발 환경에서는 허용 범위이나, 프로덕션 빌드 시 이 설정이 의도치 않게 포함될 수 없도록 `devServer` 블록 내 설정임을 명시적으로 확인하고, 실제 배포 환경에서 별도 CORS 정책을 수립해야 한다.

---

## 2. 아키텍처 (Architecture)

### 🔴 A-01 — `ContentLayer` 및 하위 컴포넌트가 데드 코드

**위치:** [ContentLayer/index.tsx](src/components/FigmaAgent/ContentLayer/index.tsx), [PreviewFrame.tsx](src/components/FigmaAgent/ContentLayer/PreviewFrame.tsx), [StatusBar.tsx](src/components/FigmaAgent/ContentLayer/StatusBar.tsx)

**문제:**
컴포넌트 트리를 추적하면:
```
App.tsx
 ├── FigmaAgent (MCP 탭)
 │    └── ControlLayer
 │         ├── FigmaMcpPanel
 │         └── InputPanel
 └── AgentSetupPanel (AGENT 탭)
```
`ContentLayer`는 어디에도 임포트·사용되지 않는다. 결과적으로 `ContentLayer/index.tsx`, `PreviewFrame.tsx`, `StatusBar.tsx` 세 파일이 번들에 포함되지 않는 데드 코드다.

**개선:**
- 사용 의도가 있다면 `FigmaAgent/index.tsx`에서 `ContentLayer`를 렌더링하도록 연결.
- 사용 의도가 없다면 파일 삭제로 코드베이스 정리.

---

### 🟠 A-02 — `InputPanel`이 너무 많은 책임을 가짐 (God Component)

**위치:** [InputPanel.tsx](src/components/FigmaAgent/ControlLayer/InputPanel.tsx) (457줄)

**문제:** 단일 컴포넌트가 다음 역할을 모두 수행한다.
- Gemini API 호출 및 응답 파싱 (`handleSubmit`)
- 토큰 카운팅 API 호출 (`handleCountTokens`)
- 프롬프트 빌드 로직 (`buildPromptParts`)
- MCP 데이터 전처리 (`preprocessMcpData` — 파일 상단 함수)
- HTML 추출 (`extractHtml` — 파일 상단 함수)
- 디버그 로그 관리
- UI 렌더링

**개선 방향:**
```
hooks/
  useGeminiApi.ts        # API 호출 로직 (generateContent, countTokens)
  usePromptBuilder.ts    # buildPromptParts, SYSTEM_PROMPT
utils/
  htmlExtractor.ts       # extractHtml
  mcpDataProcessor.ts    # preprocessMcpData
```

---

### 🟠 A-03 — `GEMINI_API_BASE` 상수 중복 정의

**위치:** [InputPanel.tsx:18](src/components/FigmaAgent/ControlLayer/InputPanel.tsx#L18), [AgentSetupPanel.tsx:6](src/components/FigmaAgent/ControlLayer/AgentSetupPanel.tsx#L6)

```ts
// 두 파일 모두에 동일하게 선언됨
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
```

**개선:** `src/constants/api.ts` 같은 공통 모듈로 추출.

---

### 🟡 A-04 — Atoms 파일이 단일 파일에 과도하게 집중

**위치:** [atoms.ts](src/components/FigmaAgent/atoms.ts)

15개 이상의 atom이 하나의 파일에 정의되어 있다. 앱이 커질수록 의존성 추적과 유지보수가 어려워진다.

**개선:**
```
atoms/
  apiAtoms.ts       # apiKeyAtom, selectedModelAtom, geminiModelsAtom
  figmaAtoms.ts     # figmaNodeIdAtom, figmaConnectedAtom, mcpDataAtom, screenshotAtom...
  generateAtoms.ts  # generateStatusAtom, generateErrorAtom, generatedHtmlAtom...
  uiAtoms.ts        # showSourceAtom, debugLogAtom, modelInfoTextAtom
```

---

### 🟡 A-05 — 사이드바가 미구현 플레이스홀더

**위치:** [App.tsx:224](src/App.tsx#L224), [App.tsx:257](src/App.tsx#L257)

```tsx
<div className={styles.sidebarContent}>Left Panel</div>
<div className={styles.sidebarContent}>Right Panel</div>
```
리사이즈 핸들러, 상태 관리 등 사이드바 인프라는 구현되어 있지만 실제 콘텐츠가 없다. 미완성 기능이 프로덕션 코드에 포함되어 불필요한 복잡도를 더한다.

**개선:**
- 기능 구현 시까지 사이드바 토글 버튼 및 관련 코드를 제거하거나 feature flag로 감춤.
- 각 사이드바의 목적(무엇을 보여줄 것인지)을 먼저 정의.

---

### 🟡 A-06 — `react-router-dom` 의존성 미사용

**위치:** [package.json](package.json), [webpack.config.js:65](webpack.config.js#L65)

`react-router-dom`이 `dependencies`와 Module Federation `shared` 목록에 등재되어 있으나, 소스 코드 어디에도 임포트되지 않는다. 불필요한 번들 사이즈 증가.

**개선:** `package.json`과 `webpack.config.js`에서 제거.

---

## 3. 코드 품질 (Code Quality)

### 🟠 Q-01 — `buildPromptParts` 결과를 재사용하지 않고 로직 중복

**위치:** [InputPanel.tsx:109-120](src/components/FigmaAgent/ControlLayer/InputPanel.tsx#L109), [InputPanel.tsx:188-197](src/components/FigmaAgent/ControlLayer/InputPanel.tsx#L188)

**문제:** `handleSubmit` 내에서 `buildPromptParts()`를 호출해 `parts`를 구하지만, 곧바로 동일한 텍스트 조합 로직을 다시 인라인으로 작성한다.

```ts
const parts = buildPromptParts();  // ← 여기서 textContent 포함

// 아래에서 동일 로직 재작성 (중복!)
const designContextSection = mcpData.trim() ? `## Figma Design Data\n${mcpData}` : '';
const userPromptSection = prompt.trim() ? ... : '...';
const textContent = [systemPromptSection, '', designContextSection, userPromptSection].filter(Boolean).join('\n\n');
```

**개선:** `buildPromptParts`가 `{ parts, textContent }` 또는 별도 헬퍼로 분리된 `buildTextContent()`를 반환하도록 수정.

---

### 🟠 Q-02 — `handleFetch`와 `handleFetchScreenshot` 중복 코드

**위치:** [FigmaMcpPanel.tsx:75-108](src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx#L75), [FigmaMcpPanel.tsx:110-144](src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx#L110)

두 함수가 동일한 패턴(nodeId 검증 → resolvedId 파싱 → `setNodeId` → fetch → JSON 파싱 → 에러 처리)을 반복한다.

**개선:** 공통 로직을 추출:
```ts
async function fetchFigmaData(
  endpoint: string,
  body: Record<string, string>,
  onSuccess: (json: unknown) => void
): Promise<void> { ... }
```

---

### 🟠 Q-03 — `parseNodeId` 렌더링 중 반복 호출

**위치:** [FigmaMcpPanel.tsx:194](src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx#L194)

```tsx
disabled={fetching || fetchingScreenshot || !connected || !parseNodeId(nodeId)}
```
`parseNodeId`가 렌더링마다 호출된다. `nodeId` 변경 시에만 계산하면 충분하다.

**개선:**
```ts
const resolvedNodeId = useMemo(() => parseNodeId(nodeId), [nodeId]);
```

---

### 🟡 Q-04 — `TextEncoder` 인스턴스 반복 생성

**위치:** [InputPanel.tsx:94](src/components/FigmaAgent/ControlLayer/InputPanel.tsx#L94), [InputPanel.tsx:188](src/components/FigmaAgent/ControlLayer/InputPanel.tsx#L188), [InputPanel.tsx:347](src/components/FigmaAgent/ControlLayer/InputPanel.tsx#L347)

```ts
// 렌더링마다 실행
const byteSize = new TextEncoder().encode(mcpData).length;

// handleSubmit에서 또 생성
const enc = new TextEncoder();

// handleOptimize에서 또 생성
const before = new TextEncoder().encode(mcpData).length;
```

**개선:** 모듈 레벨 상수로 한 번만 생성.
```ts
const TEXT_ENCODER = new TextEncoder();
```

---

### 🟡 Q-05 — `useEffect` 의존성 배열 누락

**위치:** [AgentSetupPanel.tsx:101-108](src/components/FigmaAgent/ControlLayer/AgentSetupPanel.tsx#L101), [FigmaMcpPanel.tsx:67-73](src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx#L67)

```ts
// AgentSetupPanel: fetchModels가 deps에 없음
useEffect(() => {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) { fetchModels(saved); }
}, []);  // ← fetchModels 누락

// FigmaMcpPanel: checkStatus가 deps에 없음
useEffect(() => {
  checkStatus();
  timerRef.current = setInterval(checkStatus, POLL_INTERVAL);
  return () => { if (timerRef.current) clearInterval(timerRef.current); };
}, [proxyServerUrl]);  // ← checkStatus 누락
```

**개선:** `useCallback`으로 함수를 안정화하고 deps 배열에 포함.

---

### 🟡 Q-06 — 디버그 로그 문자열 무제한 증가

**위치:** [atoms.ts:60](src/components/FigmaAgent/atoms.ts#L60), [InputPanel.tsx:103-106](src/components/FigmaAgent/ControlLayer/InputPanel.tsx#L103)

```ts
const appendLog = (line: string) => {
  setDebugLog(prev => prev + `[${ts}] ${line}\n`);
};
```
API 호출마다 약 30줄씩 추가되며 로그를 비우지 않으면 메모리와 textarea 렌더링 성능이 점진적으로 저하된다.

**개선:** 최대 라인 수 제한 (예: 최신 500줄 유지) 또는 `string[]` 배열로 저장 후 슬라이싱.

---

### 🟡 Q-07 — 다운로드 핸들러의 `revokeObjectURL` 타이밍

**위치:** [ContentLayer/index.tsx:18-25](src/components/FigmaAgent/ContentLayer/index.tsx#L18)

```ts
const a = document.createElement('a');
a.href = url;
a.download = `figma-agent-${Date.now()}.html`;
a.click();
URL.revokeObjectURL(url);  // ← click 직후 즉시 해제: 일부 브라우저에서 다운로드 실패 가능
```

**개선:**
```ts
a.click();
setTimeout(() => URL.revokeObjectURL(url), 100);
```

---

### 🟡 Q-08 — 런타임 타입 검증 없는 `as` 캐스팅

**위치:** 여러 곳 (예: [FigmaMcpPanel.tsx:60](src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx#L60))

```ts
const data = await res.json() as { connected: boolean };
```
TypeScript의 `as` 캐스팅은 컴파일 타임에만 적용되며 런타임에는 검증하지 않는다. API 응답 스키마가 변경되면 조용히 오동작한다.

**개선:** 간단한 타입 가드 또는 `zod` 라이브러리 도입.
```ts
function isStatusResponse(v: unknown): v is { connected: boolean } {
  return typeof v === 'object' && v !== null && 'connected' in v;
}
```

---

### 🔵 Q-09 — 매직 넘버 상수화 필요

**위치:** [App.tsx:106](src/App.tsx#L106), [InputPanel.tsx:211](src/components/FigmaAgent/ControlLayer/InputPanel.tsx#L211)

```ts
Math.min(480, Math.max(160, ...))  // 사이드바 min/max 너비
maxOutputTokens: 65536              // Gemini 최대 출력 토큰
mcpData.slice(0, 500)               // 디버그 truncation 길이
rawResponse.slice(0, 800)
```

**개선:** 관련 상수를 상단에 의미있는 이름으로 선언.

---

### 🔵 Q-10 — 언어 일관성 (UI 문자열)

**위치:** 전반적

UI 문자열이 한국어와 영어로 혼재되어 있다 (예: `'Fetch'`, `'Apply'` vs `'가져오는 중...'`, `'캡처 중...'`). i18n 체계가 없는 상태에서 일관성 없는 언어 혼용은 UX 혼란을 초래한다.

**개선:** UI 언어 정책을 결정하고 (영어 통일 or 한국어 통일) 일관되게 적용. 향후 다국어 지원이 필요하다면 `i18next` 등 도입.

---

## 4. 성능 (Performance)

### 🟠 P-01 — 탭 전환 시 언마운트/리마운트 반복

**위치:** [App.tsx:237-241](src/App.tsx#L237)

```tsx
{activeTab === 'AGENT' && <Provider store={sharedStore}><AgentSetupPanel /></Provider>}
{activeTab === 'MCP' && <FigmaAgent store={sharedStore} />}
{activeTab === 'VIEW' && <ViewPage html={viewHtml} />}
{activeTab === 'HELP' && <HelpPage />}
```
탭 전환 시마다 이전 컴포넌트가 언마운트되고 다시 마운트된다. `FigmaAgent` 내부에서 폴링(`setInterval`)이 동작 중이므로, MCP 탭에서 다른 탭으로 이동하면 폴링이 중단된다.

**개선:**
```tsx
<div style={{ display: activeTab === 'MCP' ? 'block' : 'none' }}>
  <FigmaAgent store={sharedStore} />
</div>
```
또는 `React.memo` + `visibility` CSS를 조합.

---

### 🟡 P-02 — 사이드바 리사이즈 중 전체 리렌더링

**위치:** [App.tsx:102-133](src/App.tsx#L102)

드래그 중 `setLeftWidth`/`setRightWidth`가 매 `mousemove`마다 호출되어 `FigmaLabApp` 전체가 리렌더링된다.

**개선:**
```ts
// 드래그 중에는 CSS 변수로 직접 조작
document.documentElement.style.setProperty('--left-panel-width', `${newWidth}px`);
// mouseup 시에만 React state 업데이트
```

---

### 🟡 P-03 — `byteSize` 렌더링마다 재계산

**위치:** [InputPanel.tsx:94](src/components/FigmaAgent/ControlLayer/InputPanel.tsx#L94)

```ts
const byteSize = new TextEncoder().encode(mcpData).length;
```
`mcpData`가 수십 KB일 경우 렌더링마다 인코딩하는 비용이 크다.

**개선:**
```ts
const byteSize = useMemo(() => new TextEncoder().encode(mcpData).length, [mcpData]);
```

---

## 5. 접근성 / UX (Accessibility & UX)

### 🟠 UX-01 — 상태 변경이 스크린리더에 전달되지 않음

**위치:** [StatusBar.tsx](src/components/FigmaAgent/ContentLayer/StatusBar.tsx), [App.tsx:262-269](src/App.tsx#L262)

`status === 'success'` 등의 UI 변화가 시각적으로만 표현된다.

**개선:**
```tsx
<div role="status" aria-live="polite" aria-atomic="true">
  {status === 'success' && <span>✓ 완료</span>}
</div>
```

---

### 🟡 UX-02 — 키보드로 사이드바 리사이저 조작 불가

**위치:** [App.tsx:229-233](src/App.tsx#L229)

리사이저가 마우스 이벤트만 처리하며 키보드 접근이 불가능하다.

**개선:**
```tsx
<div
  role="separator"
  aria-orientation="vertical"
  tabIndex={0}
  onKeyDown={handleResizerKeyDown}
  onMouseDown={handleLeftResizerMouseDown}
/>
```

---

### 🟡 UX-03 — 토스트 자동 닫힘 5초

**위치:** [App.tsx:165](src/App.tsx#L165)

5초는 사용자마다 충분하지 않을 수 있으며, 특히 생성 완료 후 VIEW 탭으로 이동하는 CTA가 토스트에 포함되어 있어 놓칠 가능성이 있다.

**개선 방안:** 8~10초로 연장, 혹은 마우스를 토스트 위에 올렸을 때 타이머 일시 정지.

---

### 🔵 UX-04 — Provider 중복 래핑

**위치:** [App.tsx:237](src/App.tsx#L237), [FigmaAgent/index.tsx:22](src/components/FigmaAgent/index.tsx#L22)

```tsx
// App.tsx
{activeTab === 'AGENT' && <Provider store={sharedStore}><AgentSetupPanel /></Provider>}
{activeTab === 'MCP' && <FigmaAgent store={sharedStore} />}

// FigmaAgent/index.tsx
const FigmaAgent = ({ store }) => (
  <Provider store={store}>
    <FigmaAgentInner />
  </Provider>
);
```
`sharedStore`를 App 레벨에서 단일 `Provider`로 제공하면 각 컴포넌트가 개별 Provider를 감쌀 필요가 없다.

---

## 6. 빌드 / 설정 (Build & Config)

### 🟠 B-01 — `ForkTsCheckerWebpackPlugin`이 설치되었으나 미사용

**위치:** [package.json](package.json), [webpack.config.js](webpack.config.js)

`@testing-library/jest-dom`과 함께 `fork-ts-checker-webpack-plugin`이 `devDependencies`에 있지만, `webpack.config.js`의 `plugins` 배열에 포함되어 있지 않다. 동시에 `ts-loader`는 `transpileOnly: true`로 설정되어 있어 **빌드 시 TypeScript 타입 에러가 전혀 검출되지 않는다**.

**개선:**
```js
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

plugins: [
  new ForkTsCheckerWebpackPlugin(),
  // ... 기존 플러그인
]
```

---

### 🟡 B-02 — 프로덕션 소스맵 미설정

**위치:** [webpack.config.js](webpack.config.js)

`devtool` 옵션이 없어 프로덕션 빌드에서 에러 스택 추적이 불가능하다.

**개선:**
```js
devtool: isProd ? 'source-map' : 'eval-cheap-module-source-map',
```

---

### 🟡 B-03 — ESLint 설정 파일 없음

`package.json`에 `lint`/`format` 스크립트가 있으나 ESLint 설정 파일 (`.eslintrc.*`, `eslint.config.*`)이 없다. 스크립트가 실행되어도 유효한 규칙이 적용되지 않는다.

**개선:** 최소 설정 추가:
```json
// eslint.config.js (flat config)
import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
```

---

### 🔵 B-04 — `tsconfig.json` `moduleResolution: "node"` 구식 설정

**위치:** [tsconfig.json:16](tsconfig.json#L16)

`module: "ESNext"`와 함께 `moduleResolution: "node"`를 사용하는 것은 권장되지 않는다. Node 16+ 또는 Bundler 해석이 더 정확하다.

**개선:**
```json
"moduleResolution": "bundler"
```

---

### 🔵 B-05 — `declarations.d.ts` — SCSS 모듈 타입 선언 부정확

**위치:** [declarations.d.ts:1](src/declarations.d.ts#L1)

```ts
declare module '*.module.scss';
```
이 선언은 SCSS 모듈의 모든 클래스를 `any`로 처리한다. `css-loader`의 `namedExport: false` 설정과 일치하지만, 타입 안전성이 없다.

**개선:** `typed-css-modules`나 `sass-modules-types` 플러그인으로 실제 클래스명 타입 자동 생성.

---

## 7. 테스트 (Testing)

### 🟠 T-01 — 테스트 없음

`package.json`에 Jest 설정과 관련 라이브러리가 있고 `--passWithNoTests` 옵션으로 CI가 통과하도록 되어 있으나, 실제 테스트 파일이 전혀 없다.

**최소한 추가해야 할 테스트:**

| 대상 | 테스트 타입 | 이유 |
|------|------------|------|
| `parseNodeId` | Unit | 다양한 입력 형식 처리 로직이 복잡함 |
| `extractHtml` | Unit | AI 응답 파싱이 핵심 기능 |
| `preprocessMcpData` | Unit | 데이터 변환 로직 |
| `FigmaMcpPanel` | Integration | 연결 상태 표시, 에러 처리 |
| `AgentSetupPanel` | Integration | API 키 저장/복원, 모델 목록 fetch |

---

## 8. 개선 우선순위 요약

| # | ID | 제목 | 우선순위 | 예상 공수 |
|---|----|------|---------|----------|
| 1 | S-01 | API 키 URL 노출 → 헤더로 이동 | 🔴 Critical | 소 (1h) |
| 2 | S-02 | API 키 localStorage → sessionStorage | 🔴 Critical | 소 (1h) |
| 3 | A-01 | ContentLayer 데드 코드 제거 또는 연결 | 🔴 Critical | 소~중 |
| 4 | S-03 | iframe sandbox 재검토 | 🟠 High | 소 (30m) |
| 5 | B-01 | ForkTsCheckerWebpackPlugin 활성화 | 🟠 High | 소 (30m) |
| 6 | A-02 | InputPanel 책임 분리 (hooks/utils) | 🟠 High | 대 (4h+) |
| 7 | A-03 | GEMINI_API_BASE 상수 공통화 | 🟠 High | 소 (30m) |
| 8 | Q-01 | buildPromptParts 중복 제거 | 🟠 High | 소 (1h) |
| 9 | Q-02 | handleFetch/handleFetchScreenshot 중복 제거 | 🟠 High | 소 (1h) |
| 10 | P-01 | 탭 전환 시 언마운트 방지 | 🟠 High | 중 (2h) |
| 11 | T-01 | 핵심 유틸 단위 테스트 추가 | 🟠 High | 중 (3h) |
| 12 | Q-05 | useEffect deps 배열 수정 | 🟡 Medium | 소 (1h) |
| 13 | Q-06 | 디버그 로그 최대 크기 제한 | 🟡 Medium | 소 (1h) |
| 14 | A-06 | react-router-dom 미사용 의존성 제거 | 🟡 Medium | 소 (15m) |
| 15 | B-02 | 프로덕션 소스맵 추가 | 🟡 Medium | 소 (30m) |
| 16 | Q-08 | API 응답 런타임 타입 검증 | 🟡 Medium | 중 (2h) |
| 17 | UX-01 | aria-live 상태 알림 | 🟡 Medium | 소 (1h) |
| 18 | A-05 | 사이드바 플레이스홀더 정리 | 🟡 Medium | 소 |
| 19 | B-03 | ESLint 설정 파일 추가 | 🟡 Medium | 소 (1h) |
| 20 | Q-03/P-03 | useMemo 적용 | 🔵 Low | 소 (1h) |

---

*이 리뷰는 현재 코드베이스의 스냅샷을 기준으로 작성되었습니다. 각 이슈의 구체적인 수정 방법은 실제 구현 맥락에 따라 조정이 필요할 수 있습니다.*
