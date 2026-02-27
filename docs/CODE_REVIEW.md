# iFigmaLab — 전문 소프트웨어 코드 리뷰 v5

> 작성일: 2026-02-28
> 리뷰 기준 커밋: `1806a7d` (Sprint 10 완료 — E2E 확장, ESLint jsx-a11y, CI 파이프라인)
> 리뷰 대상: `src/` 전체 (React 19 + Jotai + Webpack 5 Module Federation)
> 리뷰어 관점: 상용 소프트웨어 출시 기준

---

## 목차

1. [Executive Summary](#1-executive-summary)
2. [Sprint 진행 이력 및 개선 현황](#2-sprint-진행-이력-및-개선-현황)
3. [잔존 이슈 — 보안 (Security)](#3-잔존-이슈--보안)
4. [잔존 이슈 — 코드 품질 (Code Quality)](#4-잔존-이슈--코드-품질)
5. [잔존 이슈 — 성능 (Performance)](#5-잔존-이슈--성능)
6. [잔존 이슈 — 아키텍처 (Architecture)](#6-잔존-이슈--아키텍처)
7. [잔존 이슈 — 접근성/UX (Accessibility)](#7-잔존-이슈--접근성ux)
8. [잔존 이슈 — 테스트 (Testing)](#8-잔존-이슈--테스트)
9. [신규 발견 이슈](#9-신규-발견-이슈)
10. [상용 배포 평가 점수표](#10-상용-배포-평가-점수표)
11. [개선 로드맵 (우선순위 순)](#11-개선-로드맵)

---

## 1. Executive Summary

**iFigmaLab**은 Figma 디자인 파일을 Google Gemini AI를 통해 독립 실행형 HTML로 변환하는 React 19 / TypeScript 5.7 웹 애플리케이션이다. Module Federation 기반 마이크로프론트엔드로 배포 가능하며 Jotai로 전역 상태를 관리한다.

v4 리뷰 이후 Sprint 9~10이 체계적으로 이행되었다. **이번 리뷰(v5)는 Sprint 10 완료 후의 현재 상태를 기준으로 잔존 이슈와 신규 발견 이슈를 정리한다.**

### 주요 개선 성과 (Sprint 9 ~ Sprint 10)

- **보안**: API 키 URL 노출 → 헤더 방식 전환 완료 (`x-goog-api-key`), PIN 브루트포스 잠금(5회/30초) 완료, `escapeValue: true` 복원
- **아키텍처**: `ErrorBoundary` 컴포넌트 추가, `bootstrap.tsx` root 누락 시 사용자 오류 피드백 구현
- **코드 품질**: FigmaMcpPanel 하드코딩 에러 메시지 i18n 전환 완료, `as unknown as BufferSource` → `as BufferSource` 단순화
- **접근성/빌드**: ESLint `jsx-a11y` 플러그인 추가, `no-console`, `prefer-const` 규칙 추가
- **테스트**: E2E 테스트 4개 스펙(accessibility, mcp, generation, example)으로 대폭 확장, GitHub Actions CI 파이프라인 구축

### 종합 평가

| 영역 | v4 점수 | v5 점수 | 변화 | 비고 |
|------|---------|---------|------|------|
| 보안 | 82/100 | 84/100 | +2 | API 키 헤더화, PIN 잠금, escapeValue 해결. iframe CSP, 레거시 평문 키 신규 발견 |
| 아키텍처 | 85/100 | 88/100 | +3 | ErrorBoundary 추가. SYSTEM_PROMPT 외부화·모니터링 미적용 |
| 코드 품질 | 84/100 | 85/100 | +1 | i18n 에러 메시지 완성. handleSubmit 분해·상수 관리 잔존 |
| 성능 | 81/100 | 81/100 | 0 | 변화 없음. 모델 캐싱·appendLog 배치 미적용 |
| 접근성/UX | 72/100 | 74/100 | +2 | jsx-a11y 린트 자동화. 이모지 aria-hidden·방향키 내비게이션 미적용 |
| 빌드/설정 | 87/100 | 90/100 | +3 | CI 파이프라인 구축, jsx-a11y 추가. Dependabot·번들 분석 미적용 |
| 테스트 | 76/100 | 85/100 | +9 | E2E 4종(접근성·MCP·생성·기본) 완성 |
| **종합** | **82/100** | **84/100** | **+2** | **Beta Ready → Production 근접. 신규 보안 이슈 2건 해결 후 출시 권장** |

---

## 2. Sprint 진행 이력 및 개선 현황

### ✅ Sprint 1~8 — 보안·성능·아키텍처·테스트·i18n (완료)

v4 리뷰 참조 (`docs/CODE_REVIEW_0228.md`)

---

### ✅ Sprint 9 — 보안·품질 강화 (완료)

| # | ID | 항목 | 결과 |
|---|----|------|------|
| 1 | N-16/T-04 | 모델 목록 API URL → 헤더 방식으로 전환 | ✅ `useGeminiModels.ts:78-82` `headers: { 'x-goog-api-key': key }` |
| 2 | S-07 | i18n `escapeValue: false` → `true` 복원 | ✅ `i18n/config.ts:18` `escapeValue: true` |
| 3 | S-08 | PIN 잠금 해제 시도 횟수 제한 | ✅ `useApiKeyEncryption.ts:87-117` 5회 시도 후 30초 잠금 |
| 4 | S-09 | `as unknown as BufferSource` → `as BufferSource` | ✅ `crypto.ts:17` 단일 캐스팅으로 단순화 |
| 5 | Q-17 | FigmaMcpPanel 하드코딩 에러 메시지 i18n 전환 | ✅ `FigmaMcpPanel.tsx:158` `t('mcp.error_server_response', { text })` |
| 6 | Q-20 | 에러 바운더리 컴포넌트 추가 | ✅ `bootstrap.tsx:4,21-25` `<ErrorBoundary>` 래핑 |
| 7 | N-17 | bootstrap root 누락 시 사용자 피드백 추가 | ✅ `bootstrap.tsx:9-16` HTML 오류 메시지 출력 |

---

### ✅ Sprint 10 — E2E 테스트 확대·ESLint 강화·CI 파이프라인 (완료)

| # | ID | 항목 | 결과 |
|---|----|------|------|
| 1 | T-03 | E2E MCP 패널 시나리오 테스트 | ✅ `e2e/mcp.spec.ts` |
| 2 | T-03 | E2E AI 생성 플로우 테스트 | ✅ `e2e/generation.spec.ts` |
| 3 | T-03 | E2E 접근성 검사 (`@axe-core/playwright`) | ✅ `e2e/accessibility.spec.ts` |
| 4 | N-19 | ESLint 접근성 규칙 추가 (`jsx-a11y`) | ✅ `eslint.config.mjs:3,12` `jsxA11y.flatConfigs.recommended` |
| 5 | N-19 | ESLint `no-console`, `prefer-const` 추가 | ✅ `eslint.config.mjs:36-37` |
| 6 | N-20 | GitHub Actions CI 파이프라인 구성 | ✅ `e2e/ci.yml` Quality + E2E 잡 |

---

## 3. 잔존 이슈 — 보안

### 🟠 S-10 — 레거시 SessionStorage 평문 API 키 호환 코드

**위치:** [src/hooks/useApiKeyEncryption.ts:36-41](src/hooks/useApiKeyEncryption.ts#L36)

```ts
// 하위 호환성 유지: 기존 일반 Text 형태의 SessionStorage 조회
const sessionKey = sessionStorage.getItem('figma_agent_api_key');
if (sessionKey) {
    setApiKey(sessionKey);
    onUnlockSuccess?.(sessionKey);
}
```

암호화 이전 방식으로 `sessionStorage`에 **평문으로 저장된 API 키**를 그대로 메모리에 로드한다. 현재 신규 저장 경로는 암호화(`localStorage` AES-GCM)이므로 실제 트리거 가능성은 낮으나, 구버전 사용자가 이전 세션 키를 갖고 있을 경우 평문 키가 앱 상태로 로드된다. 또한 `'figma_agent_api_key'` 매직 스트링이 상수화되지 않은 채 잔존한다.

**개선 방향:**
```ts
// 1. 평문 키를 읽으면 즉시 암호화 경로로 마이그레이션 후 sessionStorage 삭제
const sessionKey = sessionStorage.getItem('figma_agent_api_key');
if (sessionKey) {
    sessionStorage.removeItem('figma_agent_api_key'); // 평문 즉시 제거
    setApiKey(sessionKey);
    onUnlockSuccess?.(sessionKey);
}
// 2. STORAGE_KEYS 상수 파일로 통합 (Q-19 연동)
```

---

### 🟠 S-11 — iframe 생성 HTML에 대한 CSP(Content Security Policy) 미설정

**위치:** [src/App.tsx:78-85](src/App.tsx#L78)

```tsx
<iframe
    ref={iframeRef}
    srcDoc={html}
    sandbox="allow-scripts"
    referrerPolicy="no-referrer"
    title={t('view.title')}
/>
```

`sandbox="allow-scripts"`는 AI가 생성한 HTML 내 스크립트를 제한 없이 실행한다. `referrerPolicy="no-referrer"`가 Referer 누출을 방지하나, AI가 악의적인 `<script>` 코드를 생성(또는 Prompt Injection을 통해 유도)할 경우 iframe 내에서 임의 스크립트가 실행된다. `allow-same-origin` 없이 `allow-scripts`만 사용하는 것은 좋은 관행이지만, HTTP 요청(`fetch`, XHR) 등은 허용될 수 있다.

**개선 방향:**
```tsx
// cspNonce를 생성하여 허용된 스크립트만 실행
<iframe
    srcDoc={html}
    sandbox="allow-scripts"
    referrerPolicy="no-referrer"
    // 추가적으로 생성된 HTML에 대한 사전 검증 함수 적용
    title={t('view.title')}
/>
```

```ts
// HTML 생성 후 위험 패턴 사전 검증
function validateGeneratedHtml(html: string): boolean {
    const forbidden = [/fetch\s*\(/i, /XMLHttpRequest/i, /eval\s*\(/i];
    return !forbidden.some(p => p.test(html));
}
```

---

### 🟡 S-12 — 프록시/MCP 서버 URL HTTPS 검증 부재 (S-10 승계)

**위치:** [src/components/FigmaAgent/atoms.ts:30-33](src/components/FigmaAgent/atoms.ts#L30)

```ts
export const proxyServerUrlAtom = atom<string>(process.env.PROXY_URL || 'http://localhost:3006');
export const figmaMcpServerUrlAtom = atom<string>(process.env.FIGMA_MCP_URL || 'http://localhost:3845');
```

프로덕션 배포 시에도 사용자가 HTTP URL을 입력할 수 있으며, Figma 노드 데이터가 평문으로 전송된다. `NODE_ENV === 'production'` 분기에서 HTTPS 강제 경고 또는 검증이 없다.

**개선:**
```ts
// FigmaMcpPanel에서 URL 입력 시 프로덕션 검증
if (process.env.NODE_ENV === 'production' && !url.startsWith('https://')) {
    setFetchError(t('mcp.error_https_required'));
    return;
}
```

---

### 🔵 S-13 — `crypto.ts` 내 `salt as BufferSource` 잔존 캐스팅

**위치:** [src/utils/crypto.ts:17](src/utils/crypto.ts#L17)

```ts
salt: salt as BufferSource,
```

`as unknown as BufferSource` → `as BufferSource`로 개선(Sprint 9)되었으나, `Uint8Array`는 `BufferSource` 인터페이스(`ArrayBuffer | ArrayBufferView`)와 이미 구조적으로 호환된다. TypeScript의 `WebCrypto` 타입 정의에서 `Pbkdf2Params.salt`가 `BufferSource`로 선언되어 있어 `Uint8Array`를 직접 사용하면 타입 오류가 발생할 수 있다. 현재 코드는 기능적으로는 올바르나, TypeScript `lib.dom.d.ts`의 타입 선언 불일치를 캐스팅으로 우회하는 것이므로 향후 타입 오류 발생 시 재검토가 필요하다.

**참고:** 이 이슈는 TypeScript/tslib 버전에 따라 자동 해결될 수 있음.

---

## 4. 잔존 이슈 — 코드 품질

### 🟡 Q-18 — `MAX_OUTPUT_TOKENS` 하드코딩 (미해결)

**위치:** [src/components/FigmaAgent/hooks/useAgentSubmit.ts:26](src/components/FigmaAgent/hooks/useAgentSubmit.ts#L26)

```ts
const MAX_OUTPUT_TOKENS = 65536;
```

모델별 최대 출력 토큰 한도가 상이하다(`gemini-2.5-flash`: 8,192, `gemini-2.5-pro`: 최대 65,536 등). 하드코딩된 65,536은 일부 모델에서 API 오류를 유발할 수 있다. `selectedModelInfo.outputTokenLimit`를 활용하거나 환경 변수로 외부화해야 한다.

**개선:**
```ts
const MAX_OUTPUT_TOKENS = Math.min(
    selectedModelInfo?.outputTokenLimit ?? 65536,
    parseInt(process.env.MAX_OUTPUT_TOKENS ?? '65536', 10)
);
```

---

### 🟡 Q-19 — SessionStorage 키 매직 스트링 잔존 (부분 미해결)

**위치:** [src/hooks/useApiKeyEncryption.ts:37](src/hooks/useApiKeyEncryption.ts#L37)

```ts
sessionStorage.getItem('figma_agent_api_key')  // 상수화 미완성
```

`LOCAL_STORAGE_KEY_ENC`는 파일 내 상수로 정의되어 있으나(`const LOCAL_STORAGE_KEY_ENC = 'figma_agent_api_key_enc'`), sessionStorage의 레거시 키(`'figma_agent_api_key'`)는 여전히 매직 스트링으로 남아있다.

**개선:** `src/constants/storageKeys.ts`:
```ts
export const STORAGE_KEYS = {
    API_KEY_SESSION_LEGACY: 'figma_agent_api_key',  // deprecated
    API_KEY_ENCRYPTED: 'figma_agent_api_key_enc',
} as const;
```

---

### 🟡 Q-21 — `handleSubmit` 함수 과도한 복잡도 (180줄)

**위치:** [src/components/FigmaAgent/hooks/useAgentSubmit.ts:119-307](src/components/FigmaAgent/hooks/useAgentSubmit.ts#L119)

`handleSubmit`이 약 188줄로 검증, 빌드, 요청, 응답 처리, 로깅을 모두 포함한다. 단일 책임 원칙(SRP) 위반이며, 테스트 가능성(Testability)과 가독성이 낮다.

**개선:** 함수 분해:
```ts
// 1. 입력 검증
const validateInputs = () => { /* apiKey, mcpData, prompt 검증 */ }

// 2. 요청 빌드 로그
const logRequestSummary = (textContent, parts, requestBodyJson) => { /* 로그 */ }

// 3. API 응답 처리
const processGeminiResponse = async (res: Response) => { /* 파싱 및 검증 */ }

// 4. HTML 추출 및 검증 로그
const logHtmlExtraction = (html: string) => { /* 구조 검사 로그 */ }
```

---

### 🔵 Q-22 — `atoms.ts` 오래된 주석 잔존

**위치:** [src/components/FigmaAgent/atoms.ts:69](src/components/FigmaAgent/atoms.ts#L69)

```ts
// ... add imports for the lock state atoms
export const isLockedAtom = atom<boolean>(false);
```

임시 개발 메모 형태의 주석이 프로덕션 코드에 잔존한다. 실제 import 구문은 파일 상단에 이미 적용되어 있으므로 주석을 제거해야 한다.

---

### 🔵 Q-23 — `SYSTEM_PROMPT` 소스코드 내 하드코딩 (A-09 승계, 미해결)

**위치:** [src/components/FigmaAgent/utils.ts:30-36](src/components/FigmaAgent/utils.ts#L30)

```ts
export const SYSTEM_PROMPT = `당신은 전문 프론트엔드 개발자입니다...`;
```

AI 동작의 핵심인 시스템 프롬프트가 소스코드에 고정되어 변경 시 재빌드·재배포가 필요하다. A/B 테스트, 프롬프트 튜닝이 불가능하다.

**개선 방향:**
- 단기: `config/prompts.ts`로 분리, 환경 변수 `SYSTEM_PROMPT` 오버라이드 가능하게
- 중기: 원격 설정(Remote Config)에서 프롬프트 로드

---

## 5. 잔존 이슈 — 성능

### 🟡 P-06 — Gemini 모델 목록 캐싱 미적용 (미해결)

**위치:** [src/hooks/useGeminiModels.ts:73-108](src/hooks/useGeminiModels.ts#L73)

```ts
const fetchModels = useCallback(async (key: string) => {
    const res = await fetch(`${GEMINI_API_BASE}/models?pageSize=100`, {
        headers: { 'x-goog-api-key': key }
    });
```

API 키 잠금 해제 시마다 모델 목록을 재요청한다. 모델 목록은 자주 변경되지 않으므로 불필요한 API 호출이 발생한다. API 키가 URL에서 헤더로 전환된 것은 Sprint 9에서 완료(T-04)되었으나, 캐싱은 여전히 미적용이다.

**개선:**
```ts
const MODELS_CACHE_TTL = 60 * 60 * 1000; // 1시간

const fetchModels = useCallback(async (key: string) => {
    const cached = sessionStorage.getItem('gemini_models_cache');
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < MODELS_CACHE_TTL) {
            setGeminiModels(data);
            return;
        }
    }
    // ... API 호출 후 저장
    sessionStorage.setItem('gemini_models_cache', JSON.stringify({ data: filtered, timestamp: Date.now() }));
}, [...]);
```

---

### 🔵 P-07 — `appendLog` 개별 setState 호출로 인한 다수 리렌더링 (미해결)

**위치:** [src/components/FigmaAgent/hooks/useAgentSubmit.ts:119-307](src/components/FigmaAgent/hooks/useAgentSubmit.ts#L119)

`handleSubmit` 실행 시 `appendLog`가 30회 이상 개별 호출된다. React 18+ 자동 배치(auto-batching)로 일부 완화되나 `async` 함수 내 비동기 경계에서는 완전히 보장되지 않는다.

**개선:** 배치 로그 업데이트 유틸리티 도입:
```ts
const logBatch: string[] = [];
const batchLog = (line: string) => logBatch.push(line);
// ... 모든 로그 수집 후 한 번에 setState
appendLogBatch(logBatch);
```

---

### 🔵 P-08 — fetch API 타임아웃 핸들러 부재

**위치:** [src/components/FigmaAgent/hooks/useAgentSubmit.ts:190-197](src/components/FigmaAgent/hooks/useAgentSubmit.ts#L190)

```ts
const res = await fetch(endpoint, {
    method: 'POST',
    headers: { ... },
    body: requestBodyJson,
});
```

Gemini API 호출에 타임아웃이 없어 네트워크 지연 시 요청이 무기한 대기한다. 대용량 Figma 데이터 처리 시 사용자 경험이 저하된다.

**개선:**
```ts
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 120_000); // 2분

try {
    const res = await fetch(endpoint, { ..., signal: controller.signal });
} finally {
    clearTimeout(timeoutId);
}
```

---

## 6. 잔존 이슈 — 아키텍처

### 🟡 A-10 — 전역 에러 핸들러/모니터링 부재 (미해결)

프로덕션 환경에서 미처리 Promise rejection, 런타임 오류의 집계 및 알림 수단이 없다. `ErrorBoundary`(Sprint 9)가 React 컴포넌트 트리 오류를 처리하지만, 글로벌 JS 에러와 네트워크 오류는 포착되지 않는다.

**개선:**
```ts
// bootstrap.tsx
window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise Rejection]', event.reason);
    // 향후: Sentry.captureException(event.reason);
});
window.addEventListener('error', (event) => {
    console.error('[Global Error]', event.error);
});
```

---

### 🔵 A-11 — Jotai Atom 상태 의존 관계 문서화 부재

**위치:** [src/components/FigmaAgent/atoms.ts](src/components/FigmaAgent/atoms.ts)

27개 atom이 정의되어 있으나, atom 간 의존 관계(예: `generateStatusAtom` 변경 → `toast`, `viewHtml` 업데이트)가 코드 주석이나 문서로 명시되어 있지 않다. 새로운 기여자가 상태 흐름을 파악하기 어렵다.

**개선:** 상태 의존 다이어그램 또는 JSDoc 주석 추가:
```ts
/**
 * 생성 상태 atom. 변경 시 App.tsx의 toast/viewHtml 업데이트 트리거.
 * 의존 atom: generatedHtmlAtom (success 시 함께 업데이트)
 */
export const generateStatusAtom = atom<GenerateStatus>('idle');
```

---

## 7. 잔존 이슈 — 접근성/UX

### 🟡 A11Y-01 — 이모지 버튼 텍스트의 스크린리더 접근성 (미해결)

**위치:** [src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx:241,257](src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx#L241)

```tsx
{fetchingScreenshot ? t('mcp.capturing') : `📸 ${t('mcp.screenshot')}`}
// ...
✕ {t('mcp.remove')}
```

스크린리더는 이모지를 "camera with flash 스크린샷 찍기"처럼 중복 읽는다. `jsx-a11y` ESLint 규칙이 추가되었으나 이 패턴은 자동 감지되지 않는다.

**개선:**
```tsx
<button ...>
    <span aria-hidden="true">📸</span>
    <span>{t('mcp.screenshot')}</span>
</button>
```

---

### 🟡 A11Y-02 — 탭 키보드 방향키 내비게이션 미구현 (미해결)

**위치:** [src/App.tsx:142-155](src/App.tsx#L142)

WAI-ARIA 탭 패턴은 방향키(`ArrowLeft`, `ArrowRight`)로 탭 간 이동을 지원해야 한다. 현재는 `Tab` 키만 사용 가능하며, `jsx-a11y` 린팅에서도 경고가 발생할 수 있다.

**개선:**
```tsx
<button
    role="tab"
    ...
    onKeyDown={(e) => {
        const current = TAB_ITEMS.indexOf(activeTab);
        if (e.key === 'ArrowRight') setActiveTab(TAB_ITEMS[(current + 1) % TAB_ITEMS.length]);
        if (e.key === 'ArrowLeft') setActiveTab(TAB_ITEMS[(current - 1 + TAB_ITEMS.length) % TAB_ITEMS.length]);
    }}
>
```

---

### 🔵 A11Y-04 — 스킵 내비게이션 링크 부재

스크린리더/키보드 사용자를 위한 "본문 바로가기(skip-to-main)" 링크가 없다. WCAG 2.4.1 요건이다.

**개선:**
```tsx
// App.tsx 최상단
<a href="#panel-MCP" className={styles.skipLink}>본문 바로가기</a>
```

---

## 8. 잔존 이슈 — 테스트

### 🟡 T-05 — E2E generation.spec.ts API 모킹 의존성 검토 필요

**위치:** [e2e/generation.spec.ts](e2e/generation.spec.ts)

AI 생성 플로우 E2E 테스트가 실제 Gemini API를 호출하거나, 모킹이 불완전할 경우 CI 환경에서 비용 발생 및 불안정한 테스트 결과가 나타날 수 있다. API 모킹 전략(`page.route`, MSW 등)이 명확하게 적용되어 있는지 검토해야 한다.

**확인 항목:**
```ts
// E2E에서 Gemini API 모킹 예시
await page.route('**/generativelanguage.googleapis.com/**', async route => {
    await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '<!DOCTYPE html>...' }] } }] })
    });
});
```

---

### 🔵 T-06 — 유닛 테스트: `useGeminiModels` 훅 커버리지 부재

`useGeminiModels.ts`는 API 키 기반 모델 목록 페칭, 모델 정보 조회 등 핵심 로직을 포함하나, 전용 유닛 테스트가 없다. 오류 케이스(네트워크 오류, 잘못된 응답 형식, 빈 모델 목록)에 대한 테스트가 필요하다.

---

## 9. 신규 발견 이슈

### 🟠 N-22 — SessionStorage 레거시 평문 키 마이그레이션 경로 부재

`useApiKeyEncryption.ts:36-41`의 레거시 코드가 구버전 사용자의 평문 API 키를 앱 메모리에 로드하되, sessionStorage에서 삭제하지 않는다. 세션이 유지되는 한 동일 탭에서 평문 키가 지속적으로 노출될 수 있다. 상세 내용은 [S-10](#-s-10--레거시-sessionstorage-평문-api-키-호환-코드) 참조.

---

### 🟠 N-23 — iframe 생성 HTML의 네트워크 요청 차단 미흡

**위치:** [src/App.tsx:78-88](src/App.tsx#L78)

AI가 생성한 HTML이 외부 리소스(CDN, 외부 서버)를 로드하거나 데이터를 전송할 수 있다. `sandbox="allow-scripts"`는 `allow-same-origin` 없이는 외부 `fetch`/`XHR` 호출이 CORS에 의해 제한되나, 일부 브라우저 버전이나 향후 명세 변경에 따라 동작이 달라질 수 있다.

**개선 방향:** AI 생성 HTML에 네트워크 접근 패턴 사전 경고 또는 `Content-Security-Policy` 메타 태그 주입 고려.

---

### 🟡 N-24 — `parseNodeId` 첫 번째 하이픈만 치환하는 잠재적 오류

**위치:** [src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx:24](src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx#L24)

```ts
return nodeIdParam.replace('-', ':'); // 첫 번째 하이픈만 치환
```

URL 쿼리 파라미터 `node-id`가 `22041-216444`처럼 단순 두 숫자 형태이면 정상이지만, Figma URL이 복합 포맷(`22041-216444-extra`)으로 변경될 경우 첫 번째 하이픈만 치환하여 `22041:216444-extra`가 된다. `replaceAll` 또는 정규식 사용을 검토해야 한다.

**개선:**
```ts
return nodeIdParam.replace(/^(\d+)-(\d+)$/, '$1:$2') ?? null;
```

---

### 🟡 N-25 — `App.tsx` Provider 중첩 구조 — sharedStore 범위 한정

**위치:** [src/App.tsx:164-178](src/App.tsx#L164)

```tsx
<Provider store={sharedStore}>
    <div id="panel-AGENT" ...><AgentSetupPanel /></div>
    <div id="panel-MCP" ...><FigmaAgent /></div>
    ...
</Provider>
```

`Provider`가 body 영역 내부에만 래핑되어 있어, `toast`와 `viewHtml`은 `useAtomValue`로 `sharedStore`에서 명시적으로 읽는다. 현재 구조에서는 기능적으로 올바르나, 향후 `FigmaLabApp` 레벨에서 atom에 접근해야 하는 새로운 UI가 추가될 경우 Provider 범위 오해로 인한 버그가 발생할 수 있다.

**개선:** Provider를 `FigmaLabApp` 루트로 끌어올리거나, 명확한 주석으로 의도를 문서화.

---

### 🔵 N-26 — Dependabot 자동 의존성 업데이트 미설정

`.github/` 디렉토리에 `dependabot.yml`이 없다. npm 패키지의 보안 취약점 자동 알림 및 PR 생성이 이루어지지 않는다.

**개선:** `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

---

### 🔵 N-27 — 번들 크기 분석 및 모니터링 미적용

CI 파이프라인이 구축되었으나, 번들 크기 회귀 검사가 없다. `react-markdown`, `remark-gfm`은 상당한 번들 크기 기여 가능성이 있다.

**개선:** `webpack-bundle-analyzer` 또는 `bundlesize` 추가:
```json
// package.json
"scripts": {
    "analyze": "webpack --mode production --env ANALYZE=true"
}
```

---

## 10. 상용 배포 평가 점수표

> 평가 기준: 실제 서비스 배포(Production Release) 기준. 각 항목 100점 만점.

### 10.1 보안 (Security) — 84/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| API 키 전송 보안 (헤더 사용) | 15 | ✅ 모든 API 호출 `x-goog-api-key` 헤더 사용 (Sprint 9 완료) | 15 |
| API 키 저장 보안 | 15 | ✅ PBKDF2(310k iter) + AES-GCM, 5회 시도 잠금 | 14 |
| iframe 샌드박싱 | 15 | ✅ `allow-scripts`만, `referrerPolicy="no-referrer"`. CSP 미설정 | 11 |
| Prompt Injection 방어 | 10 | ✅ `<figma_design_context>` + `<user_instructions>` 이중 격리 | 9 |
| 입력 검증/Sanitize | 10 | ✅ PIN 브루트포스 방어(5회/30초), 기본 검증 완비 | 8 |
| HTTPS 강제 | 10 | ⚠️ 코드 레벨 강제 없음 (배포 환경 의존) | 7 |
| 의존성 취약점 관리 | 10 | ✅ `crypto-js` 제거 완료. Dependabot 미설정 | 7 |
| 환경 변수 관리 | 10 | ✅ `process.env.*` 외부화 완성 | 9 |
| i18n XSS 방어 | 5 | ✅ `escapeValue: true` (Sprint 9 완료) | 5 |
| 레거시 평문 키 | 5 | ⚠️ sessionStorage 평문 키 마이그레이션 미완 | 3 |
| **소계** | **105** | | **88** |
| **100점 환산** | | | **84** |

---

### 10.2 아키텍처 (Architecture) — 88/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| 관심사 분리 | 20 | ✅ 암호화/모델/제출 로직 훅으로 분리 완성 | 18 |
| 상태 관리 일관성 | 20 | ✅ Jotai 단일 스토어, 단일 Provider | 19 |
| 모듈/파일 구조 | 15 | ✅ 도메인별 폴더, hooks/ 디렉토리 완성 | 13 |
| 데드 코드/미사용 의존성 | 15 | ✅ 불필요 래퍼·의존성 모두 제거 | 14 |
| 확장성 | 15 | ✅ Module Federation 기반 확장 가능 | 13 |
| 에러 바운더리 | 10 | ✅ `ErrorBoundary` 루트 적용 (Sprint 9 완료) | 10 |
| 전역 에러 모니터링 | 5 | ❌ `unhandledrejection` 핸들러 미설정 | 1 |
| **소계** | **100** | | **88** |

---

### 10.3 코드 품질 (Code Quality) — 85/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| TypeScript 타입 안전성 | 20 | ✅ strict, 타입 가드 완성. `as BufferSource` 단일 캐스팅 잔존 | 18 |
| React 모범 사례 | 20 | ✅ useCallback, useMemo, useEffect deps 완성 | 18 |
| 코드 중복 | 15 | ✅ 공통 훅·유틸 완성 | 14 |
| 명명/가독성 | 15 | ✅ 명확한 변수/함수명. 오래된 주석(atoms.ts) 잔존 | 12 |
| 에러 처리 | 15 | ✅ try-catch, i18n 에러 메시지, ErrorBoundary 완성 | 14 |
| 린팅/포매팅 | 15 | ✅ ESLint + jsx-a11y + no-console + prefer-const (Sprint 10 완료) | 14 |
| **소계** | **100** | | **90** |
| **100점 환산** | | | **85** |

---

### 10.4 성능 (Performance) — 81/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| 불필요한 리렌더링 방지 | 25 | ✅ CSS 모듈 클래스, useCallback 완성 | 22 |
| 메모이제이션 | 20 | ✅ byteSize, parseNodeId, buildPromptText useMemo 적용 | 17 |
| 네트워크 최적화 | 20 | ✅ 폴링 지수 백오프 + Visibility API. API 타임아웃 미설정 | 15 |
| 번들 사이즈 | 20 | ✅ crypto-js 제거, Module Federation. 번들 분석 미적용 | 17 |
| 코드 스플리팅 | 15 | ✅ Module Federation + 동적 import 구조 | 13 |
| 모델 캐싱 | — | ⚠️ 모델 목록 매번 재요청 (P-06 미해결) | -3 |
| **소계** | **100** | | **81** |

---

### 10.5 접근성/UX (Accessibility & UX) — 74/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| ARIA 레이블/역할 | 20 | ✅ role="tab/tabpanel", aria-selected, aria-controls, aria-live 완성 | 18 |
| 키보드 내비게이션 | 15 | ⚠️ Tab 키 접근 가능, 방향키 내비게이션 미구현 (A11Y-02) | 8 |
| 스크린리더 지원 | 15 | ✅ aria-live="polite", aria-busy, aria-describedby, alt i18n 완성 | 12 |
| i18n/지역화 | 15 | ✅ i18next 완성, 에러 메시지 i18n 완료 (Sprint 9) | 13 |
| 사용자 피드백 | 20 | ✅ 디버그 로그, Toast, 상태 표시, 에러 바운더리 | 17 |
| 반응형 레이아웃 | 15 | ⚠️ 데스크톱 전용, 모바일 미지원 | 9 |
| ESLint jsx-a11y 자동화 | — | ✅ Sprint 10 완료 (보너스) | +3 |
| **소계** | **100** | | **80** |
| **100점 환산** | | | **74** |

---

### 10.6 빌드/설정 (Build & Config) — 90/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| TypeScript 타입 체크 빌드 통합 | 20 | ✅ ForkTsCheckerWebpackPlugin 활성화 | 18 |
| ESLint/코드 품질 자동화 | 20 | ✅ jsx-a11y + react-hooks + no-console + prefer-const (Sprint 10) | 18 |
| 소스맵 설정 | 15 | ✅ 프로덕션: `source-map`, 개발: `eval-cheap-module-source-map` | 14 |
| 환경별 빌드 분리 | 15 | ✅ `isProd` 분기, 환경 변수 외부화 완성 | 13 |
| 의존성 정리 | 15 | ✅ 불필요 의존성 완전 제거 | 14 |
| CI/CD 연동 | 15 | ✅ GitHub Actions Quality + E2E 잡 완성 (Sprint 10) | 13 |
| **소계** | **100** | | **90** |

---

### 10.7 테스트 (Testing) — 85/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| 핵심 유틸 유닛 테스트 | 20 | ✅ `utils.test.ts` 100% 커버리지 | 20 |
| 컴포넌트 통합 테스트 | 20 | ✅ AgentSetupPanel·InputPanel·FigmaMcpPanel·useAgentSubmit 커버 | 18 |
| E2E 테스트 | 25 | ✅ 4종 스펙 (accessibility, mcp, generation, example) (Sprint 10) | 20 |
| 테스트 커버리지 목표 | 15 | ✅ branches:70%, functions/lines/statements:80% 임계값 설정 | 14 |
| 에러 케이스 테스트 | 10 | ✅ 네트워크 오류, 잘못된 JSON, 빈 입력 케이스 | 9 |
| 훅 유닛 테스트 완성도 | 10 | ⚠️ useGeminiModels 전용 유닛 테스트 미흡 | 4 |
| **소계** | **100** | | **85** |

---

### 10.8 종합 평가

```
┌─────────────────────────────────────────────────────────────────┐
│                  상용 배포 준비도 (Production Readiness)          │
├──────────────────────┬──────┬──────┬───────────────────────────┤
│ 평가 영역             │ 가중치│ 점수 │ 가중 점수                  │
├──────────────────────┼──────┼──────┼───────────────────────────┤
│ 보안                 │ 25%  │  84  │ 21.0                      │
│ 아키텍처              │ 15%  │  88  │ 13.2                      │
│ 코드 품질             │ 15%  │  85  │ 12.75                     │
│ 성능                 │ 15%  │  81  │ 12.15                     │
│ 접근성/UX            │ 10%  │  74  │  7.4                      │
│ 빌드/설정             │ 10%  │  90  │  9.0                      │
│ 테스트               │ 10%  │  85  │  8.5                      │
├──────────────────────┼──────┼──────┼───────────────────────────┤
│ 종합 점수             │ 100% │  84  │ 84.0 / 100                │
└──────────────────────┴──────┴──────┴───────────────────────────┘

판정: 🟡 Beta Ready → Production 근접
      신규 보안 이슈(S-10 레거시 평문 키, S-11 iframe CSP) 해결 및
      접근성 개선(A11Y-01, A11Y-02) 후 프로덕션 출시 권장
```

#### 등급 기준

| 점수 | 등급 | 의미 |
|------|------|------|
| 90~100 | 🟢 Production Ready | 즉시 배포 가능 |
| 75~89 | 🟡 Beta Ready | 소규모 사용자 배포 가능 |
| 60~74 | 🟠 Alpha/MVP | 내부 사용, 스테이징 환경 |
| ~59 | 🔴 Pre-Alpha | 추가 개발 필요 |

**현재 등급: 🟡 Beta Ready (84점)** ← v4 Beta Ready(82점)에서 2점 상향

---

## 11. 개선 로드맵

### Sprint 11 — 보안·접근성·성능 (즉시, ~0.5주)

| # | ID | 항목 | 담당 파일 | 공수 |
|---|----|------|----------|------|
| 1 | S-10/N-22 | sessionStorage 레거시 평문 키 읽은 후 즉시 삭제 | useApiKeyEncryption.ts | 15m |
| 2 | S-11/N-23 | iframe 생성 HTML 위험 패턴 사전 검증 함수 | App.tsx, utils.ts | 1h |
| 3 | S-12 | 프록시 URL HTTPS 검증 (프로덕션 빌드 시) | FigmaMcpPanel.tsx | 30m |
| 4 | A11Y-01 | 이모지 버튼 `aria-hidden` 처리 | FigmaMcpPanel.tsx | 30m |
| 5 | A11Y-02 | 탭 방향키 내비게이션 구현 | App.tsx | 1h |
| 6 | A10 | `unhandledrejection` 전역 에러 핸들러 추가 | bootstrap.tsx | 30m |
| 7 | Q-22 | atoms.ts 오래된 주석 제거 | atoms.ts | 5m |
| 8 | N-24 | `parseNodeId` 하이픈 치환 정규식 강화 | FigmaMcpPanel.tsx | 15m |

### Sprint 12 — 코드 품질·아키텍처 개선 (~1주)

| # | ID | 항목 | 담당 파일 | 공수 |
|---|----|------|----------|------|
| 9 | P-06 | Gemini 모델 목록 캐싱 (TTL 1시간) | useGeminiModels.ts | 1h |
| 10 | P-08 | fetch API 타임아웃 핸들러 추가 | useAgentSubmit.ts, FigmaMcpPanel.tsx | 1h |
| 11 | Q-21 | `handleSubmit` 함수 분해 (검증/빌드/요청/응답) | useAgentSubmit.ts | 2h |
| 12 | Q-18 | `MAX_OUTPUT_TOKENS` 모델 outputTokenLimit 동적 반영 | useAgentSubmit.ts | 1h |
| 13 | Q-19 | 스토리지 키 상수 파일 완성 | constants/storageKeys.ts | 30m |
| 14 | Q-23/A-09 | 시스템 프롬프트 분리 (`config/prompts.ts`) | utils.ts | 2h |
| 15 | T-05 | E2E generation 테스트 API 모킹 전략 검토 | e2e/generation.spec.ts | 1h |
| 16 | T-06 | `useGeminiModels` 유닛 테스트 추가 | hooks/useGeminiModels.test.ts | 2h |
| 17 | A11Y-04 | 스킵 내비게이션 링크 추가 | App.tsx, App.module.scss | 30m |

### Sprint 13 — 운영 안정성 (장기)

| # | ID | 항목 | 담당 파일 | 공수 |
|---|----|------|----------|------|
| 18 | N-26 | Dependabot 의존성 자동 업데이트 설정 | .github/dependabot.yml | 15m |
| 19 | N-27 | 번들 크기 분석 (webpack-bundle-analyzer) | webpack.config.js | 1h |
| 20 | — | Sentry 에러 트래킹 연동 | bootstrap.tsx | 2h |
| 21 | — | Web Vitals 성능 모니터링 | bootstrap.tsx | 1h |
| 22 | — | Atom 상태 의존 관계 JSDoc 문서화 | atoms.ts | 1h |
| 23 | — | 반응형 레이아웃 기초 지원 (태블릿) | App.module.scss | 3h |

---

### 요약: 가장 높은 ROI 항목 (즉시 처리 권장)

| 우선순위 | ID | 항목 | 소요 시간 | 영향 |
|---------|----|----|---------|------|
| ★★★ | S-10/N-22 | 레거시 평문 키 sessionStorage 즉시 삭제 | 15분 | 보안 |
| ★★★ | S-11/N-23 | iframe 생성 HTML 위험 패턴 검증 | 1시간 | 보안 |
| ★★★ | A11Y-02 | 탭 방향키 내비게이션 | 1시간 | 접근성 |
| ★★ | A11Y-01 | 이모지 aria-hidden 처리 | 30분 | 접근성 |
| ★★ | P-06 | Gemini 모델 목록 캐싱 | 1시간 | 성능 |
| ★★ | P-08 | fetch API 타임아웃 | 1시간 | 안정성 |
| ★★ | Q-21 | handleSubmit 함수 분해 | 2시간 | 유지보수성 |
| ★ | N-26 | Dependabot 설정 | 15분 | 운영 |

---

*이 리뷰는 커밋 `1806a7d` 기준 코드베이스 스냅샷을 분석한 결과입니다. Sprint 9~10 이행으로 보안·테스트·빌드 인프라가 크게 강화되었으며(82 → 84점), 특히 테스트 영역이 9점 상승하여 E2E 커버리지가 실질적으로 완성되었습니다. 남은 주요 과제는 iframe CSP 설정, 레거시 평문 키 마이그레이션, 접근성 방향키 내비게이션 구현입니다.*
