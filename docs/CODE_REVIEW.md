# iFigmaLab — 전문 소프트웨어 코드 리뷰 v2

> 작성일: 2026-02-27
> 리뷰 기준 커밋: `95e0ef0` (Apply CODE_REVIEW action items)
> 리뷰 대상: `src/` 전체 (React 19 + Jotai + Webpack 5 Module Federation)
> 리뷰어 관점: 상용 소프트웨어 출시 기준

---

## 목차

1. [Executive Summary](#1-executive-summary)
2. [이전 리뷰 대비 개선 현황](#2-이전-리뷰-대비-개선-현황)
3. [잔존 이슈 — 보안 (Security)](#3-잔존-이슈--보안)
4. [잔존 이슈 — 아키텍처 (Architecture)](#4-잔존-이슈--아키텍처)
5. [잔존 이슈 — 코드 품질 (Code Quality)](#5-잔존-이슈--코드-품질)
6. [잔존 이슈 — 성능 (Performance)](#6-잔존-이슈--성능)
7. [신규 발견 이슈](#7-신규-발견-이슈)
8. [상용 배포 평가 점수표](#8-상용-배포-평가-점수표)
9. [개선 로드맵 (우선순위 순)](#9-개선-로드맵)

---

## 1. Executive Summary

**iFigmaLab**은 Figma 디자인 파일을 Google Gemini AI를 통해 독립 실행형 HTML로 변환하는 React 19 / TypeScript 5.7 웹 애플리케이션이다. Module Federation을 기반으로 마이크로프론트엔드로 배포 가능하며, Jotai로 전역 상태를 관리한다.

이전 코드 리뷰 이후 상당한 개선이 이루어졌다. 가장 중요한 보안 이슈(API 키 URL 노출, localStorage 평문 저장)가 부분적으로 해결되었고, 데드 코드 제거 및 테스트 추가가 완료되었다. 그러나 **상용 소프트웨어 출시** 기준으로는 여전히 해결이 필요한 영역이 존재한다.

### 종합 평가

| 영역 | 점수 | 비고 |
|------|------|------|
| 보안 | 62/100 | 암호화 구현은 개선, PIN 파생 취약점 잔존 |
| 아키텍처 | 70/100 | 구조 정리됨, God Component 잔존 |
| 코드 품질 | 74/100 | 테스트 추가됨, 의존성 누락 등 잔존 |
| 성능 | 65/100 | 탭 전환 언마운트, 폴링 미최적화 |
| 접근성/UX | 55/100 | ARIA 미비, i18n 부재 |
| 빌드/설정 | 80/100 | ForkTs 활성화, ESLint 추가됨 |
| 테스트 | 60/100 | 핵심 유닛 커버리지 확보, 통합 테스트 부재 |
| **종합** | **67/100** | **MVP 수준, 프로덕션 출시 전 보안/성능 보완 필요** |

---

## 2. 이전 리뷰 대비 개선 현황

### ✅ 해결 완료

| ID | 항목 | 해결 방법 |
|----|------|----------|
| S-01 | API 키 URL 쿼리 노출 | `x-goog-api-key` 헤더로 이동 (commit `85da4b3`) |
| S-02 | localStorage 평문 저장 | AES-GCM 암호화 구현 (commit `8bdaf3f`) |
| A-01 | ContentLayer 데드 코드 | 파일 삭제 (commit `66cd0e6`) |
| A-03 | `GEMINI_API_BASE` 중복 | `utils.ts` 단일 출처로 통합 |
| B-01 | ForkTsCheckerWebpackPlugin 미사용 | `webpack.config.js`에 활성화 |
| B-03 | ESLint 설정 없음 | `eslint.config.mjs` 추가 |
| B-04 | `moduleResolution: "node"` 구식 | `"bundler"`로 변경 |
| T-01 | 테스트 없음 | 유닛·통합 테스트 추가 |
| Q-06 | 디버그 로그 무제한 | 최신 500줄 유지 (`slice(-500)`) |

### ⚠️ 부분 해결

| ID | 항목 | 현황 |
|----|------|------|
| S-02 | API 키 암호화 | AES-256 구현됨, PIN 파생 방식은 취약 (하단 N-01) |
| T-01 | 테스트 | 유닛 커버리지 부분 확보, 통합 E2E 미작성 |

---

## 3. 잔존 이슈 — 보안

### 🔴 S-03 (잔존) — iframe `allow-same-origin` + `allow-scripts` 동시 허용

**위치:** [App.tsx:210](src/App.tsx#L210)

```tsx
// 현재 코드
<iframe
  srcDoc={viewHtml}
  sandbox="allow-scripts allow-same-origin"
  ...
/>
```

AI가 생성한 신뢰할 수 없는 HTML을 렌더링할 때 두 플래그를 동시에 허용하면, iframe 내 스크립트가 부모 문서의 DOM·localStorage·sessionStorage에 자유롭게 접근할 수 있다. 공격자가 Gemini 응답을 조작(Prompt Injection)하면 암호화된 API 키(`localStorage`)를 탈취할 수 있다.

**개선:**
```tsx
{/* AI 생성 콘텐츠: allow-same-origin 제거 */}
<iframe
  srcDoc={viewHtml}
  sandbox="allow-scripts"
  referrerPolicy="no-referrer"
  title="Generated Preview"
/>
```

> ⚠️ `allow-same-origin` 제거 시 iframe 내부 폰트 로드 등이 제한될 수 있다. 생성된 HTML이 외부 폰트를 사용하는 경우 CSP를 별도로 설정하거나, 폰트를 인라인(base64) 처리해야 한다.

---

### 🟠 N-01 (신규) — PIN 기반 암호화의 키 파생 취약점

**위치:** [AgentSetupPanel.tsx:125-131](src/components/FigmaAgent/ControlLayer/AgentSetupPanel.tsx#L125)

```ts
// 현재: CryptoJS.AES.encrypt (내부적으로 MD5 기반 KDF 사용)
const encrypted = CryptoJS.AES.encrypt(apiKey, pin).toString();
```

`crypto-js`의 `AES.encrypt(data, passphrase)` 형태는 내부적으로 MD5를 한 번만 반복하는 취약한 키 파생(EVP_BytesToKey)을 사용한다. 브루트포스에 매우 취약하다.

**개선 (Web Crypto API 사용):**
```ts
async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 310_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
```

> OWASP 권장 PBKDF2-SHA256, 310,000 iterations 적용. 브라우저 내장 Web Crypto API는 외부 라이브러리보다 사이드채널 공격에 강하다.

---

### 🟡 N-02 (신규) — Prompt Injection 방어 부재

**위치:** [InputPanel.tsx:132-165](src/components/FigmaAgent/ControlLayer/InputPanel.tsx#L132)

Figma MCP 데이터를 그대로 Gemini 프롬프트에 삽입한다. 디자인 데이터에 `<!-- IGNORE PREVIOUS INSTRUCTIONS ... -->` 같은 텍스트가 포함된 경우, 모델이 의도치 않은 동작을 할 수 있다.

**개선 방향:**
- Figma 데이터는 별도 `user` role 또는 구분자로 격리
- 텍스트 계층 내용에 대한 기본 sanitize 적용 (`\n---\n` 구분자)
- 응답 검증 강화 (DOCTYPE 외에 XSS 패턴 탐지)

---

## 4. 잔존 이슈 — 아키텍처

### 🟠 A-02 (잔존) — `InputPanel` God Component

**위치:** [InputPanel.tsx](src/components/FigmaAgent/ControlLayer/InputPanel.tsx) (439줄)

단일 컴포넌트가 다음 책임을 모두 수행한다:

| 책임 | 규모 |
|------|------|
| Gemini 생성 API 호출 (`handleSubmit`) | ~80줄 |
| 토큰 카운팅 API 호출 (`handleCountTokens`) | ~40줄 |
| 프롬프트 빌드 (`buildPromptParts`) | ~30줄 |
| 디버그 로그 관리 | ~20줄 |
| UI 렌더링 | ~200줄 |

**권장 분리 구조:**
```
hooks/
  useGeminiGenerate.ts    # generateContent API + 응답 파싱
  useTokenCounter.ts      # countTokens API
  useDebugLog.ts          # appendLog, clearLog
utils/
  promptBuilder.ts        # buildPromptParts (utils.ts로 이동)
```

> InputPanel은 위 훅을 조합하는 UI 컨테이너 역할만 담당해야 한다.

---

### 🟠 A-05 (잔존) — 사이드바 미구현 플레이스홀더

**위치:** [App.tsx:229-243](src/App.tsx#L229)

```tsx
<div className={styles.sidebarContent}>Left Panel</div>
<div className={styles.sidebarContent}>Right Panel</div>
```

리사이즈 핸들러, 마우스 이벤트, 상태 관리 등 사이드바 인프라(~80줄)가 구현되어 있으나 실제 콘텐츠가 없다. 불필요한 UI 복잡도를 추가하고 사용자를 혼란스럽게 한다.

**개선:**
- 기능 구현 전까지 사이드바 버튼 및 관련 로직 완전 제거
- 또는 `VITE_FEATURE_SIDEBAR=true` 환경 변수로 feature flag 처리

---

### 🟡 A-06 (잔존) — `react-router-dom` 미사용 의존성

**위치:** [package.json](package.json), [webpack.config.js:65](webpack.config.js#L65)

`react-router-dom`이 `dependencies` 및 Module Federation `shared`에 등재되어 있으나 소스 코드에서 임포트되지 않는다. 번들 사이즈 증가 (~50KB gzipped).

**개선:**
```json
// package.json dependencies에서 제거
// webpack.config.js shared에서 제거
```

---

### 🟡 N-03 (신규) — Provider 이중 래핑

**위치:** [App.tsx:237](src/App.tsx#L237), [FigmaAgent/index.tsx:20-24](src/components/FigmaAgent/index.tsx#L20)

```tsx
// App.tsx: Provider로 AgentSetupPanel 래핑
{activeTab === 'AGENT' && (
  <Provider store={sharedStore}><AgentSetupPanel /></Provider>
)}

// FigmaAgent/index.tsx: 내부에서 또 Provider 래핑
const FigmaAgent = ({ store }) => (
  <Provider store={store}>
    <FigmaAgentInner />
  </Provider>
);
```

**개선:** App 레벨에서 단일 `Provider`로 전체 Content 영역을 래핑:
```tsx
<Provider store={sharedStore}>
  {activeTab === 'AGENT' && <AgentSetupPanel />}
  {activeTab === 'MCP' && <FigmaAgentInner />}
  ...
</Provider>
```

---

## 5. 잔존 이슈 — 코드 품질

### 🟠 Q-05 (잔존) — `useEffect` 의존성 배열 누락

**위치:** [AgentSetupPanel.tsx:101-108](src/components/FigmaAgent/ControlLayer/AgentSetupPanel.tsx#L101), [FigmaMcpPanel.tsx:67-73](src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx#L67)

```ts
// AgentSetupPanel: fetchModels가 deps에 없음
useEffect(() => {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) { fetchModels(saved); }
}, []);  // ← fetchModels 누락 → stale closure 위험

// FigmaMcpPanel: checkStatus가 deps에 없음
useEffect(() => {
  checkStatus();
  timerRef.current = setInterval(checkStatus, POLL_INTERVAL);
  return () => { if (timerRef.current) clearInterval(timerRef.current); };
}, [proxyServerUrl]);  // ← checkStatus 누락
```

**개선:** `useCallback`으로 함수 안정화 후 deps 추가. ESLint `react-hooks/exhaustive-deps` 규칙을 error 레벨로 설정하면 자동 탐지 가능.

---

### 🟠 Q-02 (잔존) — `handleFetch`와 `handleFetchScreenshot` 중복 패턴

**위치:** [FigmaMcpPanel.tsx:75-144](src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx#L75)

두 함수가 동일한 패턴(nodeId 검증 → resolvedId 파싱 → `setNodeId` → fetch → JSON 파싱 → 에러 처리)을 반복한다.

**개선:**
```ts
async function fetchFigmaEndpoint<T>(
  endpoint: string,
  body: Record<string, string>,
  onSuccess: (data: T) => void,
  setLoading: (v: boolean) => void
): Promise<void> {
  setLoading(true);
  try {
    const res = await fetch(`${proxyServerUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    onSuccess(await res.json() as T);
  } catch (e) {
    // unified error handling
  } finally {
    setLoading(false);
  }
}
```

---

### 🟡 Q-08 (잔존) — 런타임 타입 검증 없는 `as` 캐스팅

**위치:** [FigmaMcpPanel.tsx:60](src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx#L60), [AgentSetupPanel.tsx](src/components/FigmaAgent/ControlLayer/AgentSetupPanel.tsx) 여러 곳

```ts
const data = await res.json() as { connected: boolean };
```

API 응답 구조가 바뀌면 조용히 오동작한다.

**개선 (간단한 타입 가드):**
```ts
function isStatusResponse(v: unknown): v is { connected: boolean } {
  return typeof v === 'object' && v !== null && 'connected' in v;
}
const data = await res.json();
if (!isStatusResponse(data)) throw new Error('Unexpected response');
```

> 장기적으로 `zod` 도입 권장.

---

### 🟡 Q-09 (잔존) — 매직 넘버

**위치:** [App.tsx:106](src/App.tsx#L106), [InputPanel.tsx:211](src/components/FigmaAgent/ControlLayer/InputPanel.tsx#L211)

```ts
Math.min(480, Math.max(160, ...))  // 사이드바 너비 범위
maxOutputTokens: 65536              // Gemini 최대 토큰
mcpData.slice(0, 500)              // 디버그 truncation
```

**개선:** 파일 상단 또는 `src/constants/` 에 의미있는 이름으로 선언.

---

### 🔵 Q-10 (잔존) — UI 문자열 언어 혼재

**위치:** 전반적

`'Fetch'`, `'Apply'`, `'SET'` (영어) vs `'가져오는 중...'`, `'캡처 중...'`, `'모델 정보 조회 중...'` (한국어)가 혼재한다. 일관성 없는 언어 혼용은 UX 혼란을 초래하며, 글로벌 배포 시 국제화가 어렵다.

**개선:** 언어 정책 결정 후 일관성 적용. 향후 `i18next` 도입 시 모든 문자열을 키 기반으로 관리.

---

### 🟡 N-04 (신규) — `parseNodeId` 렌더링마다 재계산

**위치:** [FigmaMcpPanel.tsx:194](src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx#L194)

```tsx
disabled={fetching || fetchingScreenshot || !connected || !parseNodeId(nodeId)}
```

**개선:**
```ts
const resolvedNodeId = useMemo(() => parseNodeId(nodeId), [nodeId]);
```

---

## 6. 잔존 이슈 — 성능

### 🟠 P-01 (잔존) — 탭 전환 시 컴포넌트 언마운트/리마운트

**위치:** [App.tsx:237-243](src/App.tsx#L237)

```tsx
{activeTab === 'AGENT' && <Provider store={sharedStore}><AgentSetupPanel /></Provider>}
{activeTab === 'MCP' && <FigmaAgent store={sharedStore} />}
{activeTab === 'VIEW' && <ViewPage html={viewHtml} />}
{activeTab === 'HELP' && <HelpPage />}
```

MCP 탭에서 다른 탭으로 이동하면 `FigmaAgent`가 언마운트되며 `setInterval` 폴링이 중단된다. 다시 MCP 탭으로 돌아오면 컴포넌트가 새로 마운트되어 연결 상태를 다시 확인해야 한다.

**개선:**
```tsx
{/* 언마운트 없이 CSS로 숨김 처리 */}
<div style={{ display: activeTab === 'MCP' ? 'flex' : 'none', height: '100%' }}>
  <FigmaAgent store={sharedStore} />
</div>
<div style={{ display: activeTab === 'AGENT' ? 'flex' : 'none', height: '100%' }}>
  <Provider store={sharedStore}><AgentSetupPanel /></Provider>
</div>
```

---

### 🟡 P-02 (잔존) — 사이드바 리사이즈 중 전체 리렌더링

**위치:** [App.tsx:102-133](src/App.tsx#L102)

드래그 중 `setLeftWidth`/`setRightWidth`가 매 `mousemove` 이벤트마다 호출되어 앱 전체가 리렌더링된다.

**개선:**
```ts
// 드래그 중에는 CSS 변수로 직접 DOM 조작
document.documentElement.style.setProperty('--left-panel-width', `${newWidth}px`);
// mouseup 시에만 React state 업데이트
```

---

### 🟡 N-05 (신규) — 폴링 전략 미최적화

**위치:** [FigmaMcpPanel.tsx:68-73](src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx#L68)

```ts
timerRef.current = setInterval(checkStatus, POLL_INTERVAL); // 10초 고정
```

연결이 끊어진 상태에서도 10초마다 네트워크 요청을 반복한다. 또한 연결 실패 시 지수 백오프 없이 즉시 재시도한다.

**개선:**
```ts
// Exponential backoff 적용
let delay = POLL_INTERVAL;
const poll = async () => {
  const ok = await checkStatus();
  delay = ok ? POLL_INTERVAL : Math.min(delay * 2, MAX_POLL_INTERVAL);
  timerRef.current = setTimeout(poll, delay);
};
```

---

### 🟡 P-03 (잔존) — `byteSize` 렌더링마다 재계산

**위치:** [InputPanel.tsx:94](src/components/FigmaAgent/ControlLayer/InputPanel.tsx#L94)

```ts
const byteSize = new TextEncoder().encode(mcpData).length;
```

**개선:**
```ts
const byteSize = useMemo(
  () => new TextEncoder().encode(mcpData).length,
  [mcpData]
);
```

---

## 7. 신규 발견 이슈

### 🟠 N-06 — `AgentSetupPanel` PIN 초기화/변경 불가

**위치:** [AgentSetupPanel.tsx](src/components/FigmaAgent/ControlLayer/AgentSetupPanel.tsx)

한 번 PIN을 설정하면 변경하거나 초기화하는 UI가 없다. 사용자가 PIN을 분실하면 암호화된 키를 복구할 수 없고, localStorage를 직접 삭제해야 한다.

**개선:**
- "PIN 변경" 버튼 추가 (이전 PIN 입력 → 복호화 → 신규 PIN으로 재암호화)
- "초기화" 버튼은 기존 저장 정보 삭제 확인 후 처리

---

### 🟡 N-07 — 프로덕션 소스맵 미설정

**위치:** [webpack.config.js](webpack.config.js)

`devtool` 옵션이 없어 프로덕션 배포 후 에러 스택 추적이 불가능하다.

**개선:**
```js
const isProd = process.env.NODE_ENV === 'production';
devtool: isProd ? 'source-map' : 'eval-cheap-module-source-map',
```

---

### 🟡 N-08 — `declarations.d.ts` SCSS 타입 `any` 처리

**위치:** [declarations.d.ts](src/declarations.d.ts)

```ts
declare module '*.module.scss';
```

모든 SCSS 클래스를 `any`로 처리해 타입 안전성이 없다.

**개선:** `typed-css-modules` (`tcm`) 플러그인으로 빌드 시 클래스명 타입 자동 생성.

---

### 🔵 N-09 — 환경 변수 하드코딩

**위치:** [atoms.ts:28-29](src/components/FigmaAgent/atoms.ts#L28), [FigmaMcpPanel.tsx 전반](src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx)

```ts
export const proxyServerUrlAtom = atom('http://localhost:3006');
export const figmaMcpServerUrlAtom = atom('http://localhost:3845');
```

로컬 기본값은 적절하나, 배포 환경마다 값이 다를 경우 빌드 시점 환경 변수로 주입할 수 없다.

**개선:**
```ts
export const proxyServerUrlAtom = atom(
  process.env.REACT_APP_PROXY_URL ?? 'http://localhost:3006'
);
```

---

### 🔵 N-10 — 접근성 (a11y) 부족

**위치:** [App.tsx:229-233](src/App.tsx#L229), [InputPanel.tsx](src/components/FigmaAgent/ControlLayer/InputPanel.tsx) 전반

- 사이드바 리사이저에 `role="separator"`, `tabIndex`, `onKeyDown` 없음
- 상태 변화(`generating`, `success`, `error`)가 `aria-live` 없이 시각적으로만 표현
- 모달/토스트에 포커스 트랩 없음

**개선:**
```tsx
<div
  className={styles.resizer}
  role="separator"
  aria-orientation="vertical"
  aria-label="좌측 패널 크기 조절"
  tabIndex={0}
  onKeyDown={handleResizerKeyDown}
  onMouseDown={handleLeftResizerMouseDown}
/>
<div role="status" aria-live="polite" aria-atomic="true" className={styles.srOnly}>
  {generateStatus === 'success' && 'HTML 생성이 완료되었습니다.'}
  {generateStatus === 'error' && `오류: ${generateError}`}
</div>
```

---

## 8. 상용 배포 평가 점수표

> 평가 기준: 실제 서비스 배포(Production Release) 기준. 각 항목 100점 만점.

### 8.1 보안 (Security) — 62/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| API 키 전송 보안 (헤더 사용) | 15 | ✅ 헤더(`x-goog-api-key`) 적용 | 15 |
| API 키 저장 보안 | 15 | ⚠️ AES 암호화 구현, 단 키 파생(EVP_BytesToKey) 취약 | 8 |
| iframe 샌드박싱 | 15 | ❌ `allow-same-origin` + `allow-scripts` 동시 허용 | 5 |
| Prompt Injection 방어 | 10 | ❌ 미구현 | 0 |
| 입력 검증/Sanitize | 10 | ⚠️ 기본 검증만 존재 | 5 |
| HTTPS 강제 | 10 | ⚠️ 코드 레벨 강제 없음 (배포 환경 의존) | 7 |
| 의존성 취약점 관리 | 10 | ⚠️ npm audit 미자동화 | 6 |
| 환경 변수 관리 | 10 | ⚠️ 일부 하드코딩 | 6 |
| **소계** | **95** | | **52** |
| **100점 환산** | | | **62** |

---

### 8.2 아키텍처 (Architecture) — 70/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| 관심사 분리 | 20 | ⚠️ InputPanel God Component(439줄) 잔존 | 12 |
| 상태 관리 일관성 | 20 | ✅ Jotai 원자 단위 관리, 단일 스토어 | 18 |
| 모듈/파일 구조 | 15 | ✅ 도메인별 폴더 구조 명확 | 13 |
| 데드 코드/미사용 의존성 | 15 | ⚠️ `react-router-dom` 미사용 잔존, 사이드바 플레이스홀더 | 8 |
| 확장성 | 15 | ✅ Module Federation 기반 확장 가능 | 12 |
| 컴포넌트 재사용성 | 15 | ⚠️ 공통 훅 분리 미흡 | 7 |
| **소계** | **100** | | **70** |

---

### 8.3 코드 품질 (Code Quality) — 74/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| TypeScript 타입 안전성 | 20 | ⚠️ strict 활성화, `as` 캐스팅 다수 | 14 |
| React 모범 사례 | 20 | ⚠️ useEffect deps 누락, useMemo 미적용 | 13 |
| 코드 중복 | 15 | ⚠️ handleFetch 중복 패턴 잔존 | 9 |
| 명명/가독성 | 15 | ✅ 명확한 변수/함수명, 주석 | 13 |
| 에러 처리 | 15 | ✅ try-catch 포괄적 적용 | 13 |
| 린팅/포매팅 | 15 | ✅ ESLint + TypeScript 검사 | 12 |
| **소계** | **100** | | **74** |

---

### 8.4 성능 (Performance) — 65/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| 불필요한 리렌더링 방지 | 25 | ❌ 탭 전환 시 언마운트, 리사이즈 중 전체 리렌더 | 10 |
| 메모이제이션 | 20 | ⚠️ byteSize, parseNodeId 미적용 | 10 |
| 네트워크 최적화 | 20 | ⚠️ 폴링 지수 백오프 없음 | 10 |
| 번들 사이즈 | 20 | ⚠️ `react-router-dom` 불필요 포함 | 14 |
| 코드 스플리팅 | 15 | ✅ Module Federation + 탭별 Lazy 가능 구조 | 11 |
| **소계** | **100** | | **55** |
| **100점 환산** | | | **65** |

---

### 8.5 접근성/UX (Accessibility & UX) — 55/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| ARIA 레이블/역할 | 20 | ⚠️ 기본 버튼 레이블 있으나 동적 상태 미반영 | 8 |
| 키보드 내비게이션 | 15 | ❌ 리사이저 키보드 조작 불가 | 3 |
| 스크린리더 지원 | 15 | ❌ `aria-live` 미적용 | 3 |
| i18n/지역화 | 15 | ❌ 한국어/영어 혼재, 다국어 체계 없음 | 4 |
| 사용자 피드백 | 20 | ✅ 디버그 로그, 토스트, 상태 표시 | 16 |
| 반응형 레이아웃 | 15 | ⚠️ 리사이즈 가능하나 모바일 미지원 | 6 |
| **소계** | **100** | | **40** |
| **100점 환산** | | | **55** |

---

### 8.6 빌드/설정 (Build & Config) — 80/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| TypeScript 타입 체크 빌드 통합 | 20 | ✅ ForkTsCheckerWebpackPlugin 활성화 | 18 |
| ESLint/코드 품질 자동화 | 20 | ✅ `eslint.config.mjs` + React Hooks 규칙 | 16 |
| 소스맵 설정 | 15 | ❌ 프로덕션 소스맵 미설정 | 5 |
| 환경별 빌드 분리 | 15 | ⚠️ `isProd` 분기 있으나 소스맵 미적용 | 8 |
| 의존성 정리 | 15 | ⚠️ `react-router-dom` 미사용 잔존 | 10 |
| CI/CD 연동 준비 | 15 | ⚠️ `--passWithNoTests` 플래그 (테스트 없어도 통과) | 7 |
| **소계** | **100** | | **64** |
| **100점 환산** | | | **80** |

---

### 8.7 테스트 (Testing) — 60/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| 핵심 유틸 유닛 테스트 | 25 | ✅ `utils.test.ts` — extractHtml, preprocessMcpData | 22 |
| 컴포넌트 통합 테스트 | 25 | ⚠️ AgentSetupPanel·InputPanel 일부 커버, FigmaMcpPanel 없음 | 13 |
| E2E 테스트 | 20 | ❌ Playwright/Cypress 없음 | 0 |
| 테스트 커버리지 목표 | 15 | ❌ 커버리지 측정/목표 미설정 | 0 |
| 에러 케이스 테스트 | 15 | ⚠️ Happy path 위주, 네트워크 에러 케이스 부족 | 5 |
| **소계** | **100** | | **40** |
| **100점 환산** | | | **60** |

---

### 8.8 종합 평가

```
┌─────────────────────────────────────────────────────────────────┐
│                  상용 배포 준비도 (Production Readiness)         │
├──────────────────────┬──────┬──────┬───────────────────────────┤
│ 평가 영역             │ 가중치│ 점수 │ 가중 점수                  │
├──────────────────────┼──────┼──────┼───────────────────────────┤
│ 보안                 │ 25%  │  62  │ 15.5                      │
│ 아키텍처              │ 15%  │  70  │ 10.5                      │
│ 코드 품질             │ 15%  │  74  │ 11.1                      │
│ 성능                 │ 15%  │  65  │  9.8                      │
│ 접근성/UX            │ 10%  │  55  │  5.5                      │
│ 빌드/설정             │ 10%  │  80  │  8.0                      │
│ 테스트               │ 10%  │  60  │  6.0                      │
├──────────────────────┼──────┼──────┼───────────────────────────┤
│ 종합 점수             │ 100% │  67  │ 66.4 / 100                │
└──────────────────────┴──────┴──────┴───────────────────────────┘

판정: ⚠️  MVP 수준 — 내부 베타/스테이징 배포 가능
      보안(iframe 샌드박싱, PIN 암호화) 및 성능(탭 전환 리마운트) 개선 후
      프로덕션 출시 권장
```

#### 등급 기준
| 점수 | 등급 | 의미 |
|------|------|------|
| 90~100 | 🟢 Production Ready | 즉시 배포 가능 |
| 75~89 | 🟡 Beta Ready | 소규모 사용자 배포 가능 |
| 60~74 | 🟠 Alpha/MVP | 내부 사용, 스테이징 환경 |
| ~59 | 🔴 Pre-Alpha | 추가 개발 필요 |

**현재 등급: 🟠 Alpha/MVP (67점)**

---

## 9. 개선 로드맵

### Sprint 1 — 보안 강화 (즉시, ~1주)

| # | ID | 항목 | 담당 파일 | 공수 |
|---|----|------|----------|------|
| 1 | S-03 | iframe `allow-same-origin` 제거 | App.tsx | 30m |
| 2 | N-01 | PIN 암호화 → PBKDF2 (Web Crypto API) | AgentSetupPanel.tsx | 3h |
| 3 | N-06 | PIN 변경/초기화 UI 추가 | AgentSetupPanel.tsx | 2h |
| 4 | N-07 | 프로덕션 소스맵 설정 | webpack.config.js | 30m |

### Sprint 2 — 성능·안정성 (2주 차)

| # | ID | 항목 | 담당 파일 | 공수 |
|---|----|------|----------|------|
| 5 | P-01 | 탭 전환 언마운트 방지 (CSS visibility) | App.tsx | 2h |
| 6 | Q-05 | useEffect deps 배열 수정 | AgentSetupPanel.tsx, FigmaMcpPanel.tsx | 1h |
| 7 | N-05 | 폴링 지수 백오프 | FigmaMcpPanel.tsx | 1h |
| 8 | P-02 | 리사이즈 CSS 변수 직접 조작 | App.tsx | 1h |
| 9 | N-04 | parseNodeId useMemo | FigmaMcpPanel.tsx | 30m |
| 10 | P-03 | byteSize useMemo | InputPanel.tsx | 30m |

### Sprint 3 — 코드 품질·아키텍처 (3~4주 차)

| # | ID | 항목 | 담당 파일 | 공수 |
|---|----|------|----------|------|
| 11 | A-02 | InputPanel 훅 분리 | 신규 hooks/ | 4h |
| 12 | Q-02 | handleFetch 공통화 | FigmaMcpPanel.tsx | 1h |
| 13 | A-05 | 사이드바 플레이스홀더 제거 | App.tsx | 1h |
| 14 | A-06 | `react-router-dom` 제거 | package.json, webpack.config.js | 15m |
| 15 | N-03 | Provider 이중 래핑 정리 | App.tsx, FigmaAgent/index.tsx | 1h |
| 16 | Q-08 | API 응답 타입 가드 | FigmaMcpPanel.tsx, AgentSetupPanel.tsx | 2h |
| 17 | N-09 | 환경 변수 외부화 | atoms.ts | 30m |

### Sprint 4 — 테스트·접근성 (5~6주 차)

| # | ID | 항목 | 담당 파일 | 공수 |
|---|----|------|----------|------|
| 18 | T-01 | FigmaMcpPanel 통합 테스트 | FigmaMcpPanel.test.tsx | 3h |
| 19 | T-01 | 에러 케이스 테스트 추가 | 기존 .test.tsx | 2h |
| 20 | N-10 | aria-live, role="separator" 추가 | App.tsx, InputPanel.tsx | 2h |
| 21 | Q-10 | UI 문자열 언어 정책 통일 | 전체 | 2h |
| 22 | N-02 | Prompt Injection 방어 기초 | InputPanel.tsx | 2h |

---

*이 리뷰는 커밋 `95e0ef0` 기준 코드베이스 스냅샷을 분석한 결과입니다. 각 이슈의 수정 방법은 실제 구현 맥락에 따라 조정이 필요할 수 있습니다.*
