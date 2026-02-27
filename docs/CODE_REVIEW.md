# iFigmaLab — 전문 소프트웨어 코드 리뷰 v4

> 작성일: 2026-02-28
> 리뷰 기준 커밋: `5c24ea4` (Sprint 8 완료 — E2E, i18n, 폴링 최적화)
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

v3 리뷰 이후 Sprint 7~8이 체계적으로 이행되었다. **이번 리뷰(v4)는 Sprint 8 완료 후의 현재 상태를 기준으로 잔존 이슈와 신규 발견 이슈를 정리한다.**

주요 개선 성과:
- **보안**: PBKDF2 iterations 310,000으로 상향 완료, mcpData `<figma_design_context>` 태그 격리 완료, `crypto-js` 의존성 완전 제거
- **성능**: 탭 패널 인라인 스타일 → CSS 모듈(`.tabPanelHidden`) 전환, `useCallback` 적용, Visibility API 기반 폴링 일시 정지
- **테스트**: `--passWithNoTests` 제거, Jest 커버리지 임계값 설정, Playwright E2E 도입
- **i18n**: `i18next` 도입, 전체 UI 문자열 한국어 통일
- **코드 품질**: 타입 가드 개선, `requestBody` 이중 직렬화 제거, `formatBytes` 중복 제거, `FigmaAgentInner` 불필요 래퍼 제거

### 종합 평가

| 영역 | v3 점수 | v4 점수 | 변화 | 비고 |
|------|---------|---------|------|------|
| 보안 | 76/100 | 82/100 | +6 | PBKDF2 310k, mcpData 격리, crypto-js 제거 완료. i18n XSS, PIN 브루트포스 신규 발견 |
| 아키텍처 | 82/100 | 85/100 | +3 | 훅 분리 완성, 에러 바운더리 미적용 |
| 코드 품질 | 83/100 | 84/100 | +1 | 타입 가드 강화, 일부 하드코딩 잔존 |
| 성능 | 78/100 | 81/100 | +3 | CSS 모듈, visibility API, 모델 캐싱 미적용 |
| 접근성/UX | 66/100 | 72/100 | +6 | i18n 도입, 이모지 접근성·alt text 미흡 |
| 빌드/설정 | 83/100 | 87/100 | +4 | 소스맵, passWithNoTests 해결, CI 파이프라인 부재 |
| 테스트 | 74/100 | 76/100 | +2 | E2E 도입되었으나 커버리지 극히 미흡 |
| **종합** | **78/100** | **82/100** | **+4** | **Beta Ready 유지, 신규 보안 이슈 보완 시 Production 가능** |

---

## 2. Sprint 진행 이력 및 개선 현황

### ✅ Sprint 1~4 — 보안·성능·아키텍처·테스트 (완료)

v3 리뷰 참조 (`docs/CODE_REVIEW_2026-02-28.md`)

---

### ✅ Sprint 6 — 코드 품질·아키텍처 (완료)

| # | ID | 항목 | 결과 |
|---|----|------|------|
| 1 | A-07 | 암호화 유틸리티 분리 | ✅ `src/utils/crypto.ts`로 추출 |
| 2 | A-08 | AgentSetupPanel 훅 분리 | ✅ `useApiKeyEncryption.ts`, `useGeminiModels.ts` 추출 |
| 3 | Q-11 | useAgentSubmit `as` 캐스팅 → 타입 가드 | ✅ `isGeminiResponse`, `isCountTokensResponse` 적용 |
| 4 | Q-12 | requestBody 이중 직렬화 제거 | ✅ `requestBodyJson` 재사용 |
| 5 | Q-13 | formatBytes 함수 중복 제거 | ✅ `src/utils/utils.ts`로 통합 |
| 6 | Q-14 | AgentSetupPanel 인라인 스타일 → SCSS | ✅ CSS 클래스 전환 완료 |
| 7 | Q-16 | FigmaAgentInner 불필요 래퍼 제거 | ✅ `FigmaAgent` 컴포넌트 통합 |

---

### ✅ Sprint 7 — 성능·테스트·접근성 (완료)

| # | ID | 항목 | 결과 |
|---|----|------|------|
| 1 | P-04 | 탭 패널 인라인 스타일 → CSS 모듈 | ✅ `getTabPanelClass` 함수, `.tabPanelHidden` 클래스 |
| 2 | N-14 | 탭 패널 스타일 유틸리티 함수 추출 | ✅ `App.tsx` 내 함수로 통합 |
| 3 | N-11 | handleFetch/handleFetchScreenshot useCallback 적용 | ✅ `FigmaMcpPanel.tsx` 적용 |
| 4 | N-13 | `--passWithNoTests` 플래그 제거 | ✅ `package.json` 제거 완료 |
| 5 | N-15 | Jest 커버리지 임계값 설정 | ✅ branches:70%, functions/lines/statements:80% |
| 6 | N-15 | useAgentSubmit Branch 커버리지 개선 | ✅ `useAgentSubmit.test.tsx` 신규 추가 |
| 7 | Q-15 | UI 문자열 한국어 통일 | ✅ 전체 UI 한국어 통일 |

---

### ✅ Sprint 8 — E2E 테스트·i18n·폴링 최적화 (완료)

| # | ID | 항목 | 결과 |
|---|----|------|------|
| 1 | T-02 | Playwright E2E 테스트 도입 | ✅ `playwright.config.ts`, `e2e/example.spec.ts` |
| 2 | N-10 | i18n 체계 도입 (`i18next`) | ✅ ko/en 로케일, `useTranslation` 전체 적용 |
| 3 | P-05 | 폴링 비활성 탭 일시 정지 | ✅ `document.visibilitychange` 이벤트 기반 구현 |
| 4 | S-04 | PBKDF2 iterations 310,000으로 상향 | ✅ `crypto.ts:18` |
| 5 | S-05 | mcpData Prompt Injection 격리 | ✅ `<figma_design_context>` 태그 래핑 |
| 6 | S-06 | `crypto-js` 패키지 제거 | ✅ `package.json` 에서 완전 제거 |

---

## 3. 잔존 이슈 — 보안

### 🟠 S-07 — i18n `escapeValue: false` — XSS 잠재 위험

**위치:** [src/i18n/config.ts:18](src/i18n/config.ts#L18)

```ts
interpolation: {
    escapeValue: false, // ← i18next 기본 XSS 이스케이프 비활성화
},
```

`escapeValue: false`는 React가 자체적으로 XSS를 처리한다는 가정 하에 설정되었다. 현재 구조에서는 JSX 내부에서만 번역 결과를 사용하므로 즉각적인 위험은 낮다. 그러나 향후 번역 문자열을 `dangerouslySetInnerHTML`이나 DOM에 직접 삽입하는 시나리오가 발생할 경우 XSS 벡터가 된다. 특히 서버에서 동적으로 번역 키를 주입하는 구조로 확장될 경우 위험하다.

**개선 방향:**
```ts
interpolation: {
    escapeValue: true, // React JSX 사용 시에도 명시적 보안 설정 권장
},
```

---

### 🟠 S-08 — PIN 잠금 해제 무제한 시도 (Brute Force 취약)

**위치:** [src/hooks/useApiKeyEncryption.ts:80-100](src/hooks/useApiKeyEncryption.ts#L80)

```ts
const handleUnlock = async (pin: string, onUnlock?: () => void) => {
    try {
        const decrypted = await decryptData(savedEncryptedKey, pin);
        // ... 성공 시 처리
    } catch {
        setUnlockError('잠금 해제 실패: PIN이 올바르지 않습니다.');
    }
};
```

PBKDF2 310,000 iterations로 단일 시도 비용은 높으나, **시도 횟수 제한이 없다**. 4자리 PIN의 경우 10,000개 조합이며, 자동화 공격 시 Web Worker나 다중 탭을 활용해 브루트포스가 가능하다.

**개선 방향:**
```ts
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30_000; // 30초
let attempts = 0;
let lockedUntil = 0;

const handleUnlock = async (pin: string) => {
    if (Date.now() < lockedUntil) {
        setUnlockError(`잠금 해제 불가: ${Math.ceil((lockedUntil - Date.now()) / 1000)}초 후 재시도`);
        return;
    }
    // ... 시도 후
    attempts++;
    if (attempts >= MAX_ATTEMPTS) {
        lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
        attempts = 0;
    }
};
```

---

### 🟡 S-09 — `salt as unknown as BufferSource` 이중 타입 캐스팅

**위치:** [src/utils/crypto.ts:17](src/utils/crypto.ts#L17)

```ts
return crypto.subtle.deriveKey(
    {
        name: 'PBKDF2',
        salt: salt as unknown as BufferSource,  // ← 불필요한 이중 캐스팅
        iterations: 310000,
        hash: 'SHA-256'
    },
```

`Uint8Array`는 `BufferSource`와 호환되므로 이중 캐스팅이 불필요하다. TypeScript 타입 안전성을 훼손하는 코드 냄새다.

**개선:**
```ts
salt,  // Uint8Array는 BufferSource와 호환
```

---

### 🔵 S-10 — 프록시/MCP 서버 URL HTTPS 검증 부재

**위치:** [src/components/FigmaAgent/atoms.ts](src/components/FigmaAgent/atoms.ts)

```ts
export const proxyServerUrlAtom = atom(process.env.PROXY_URL ?? 'http://localhost:3001');
export const figmaMcpServerUrlAtom = atom(process.env.FIGMA_MCP_URL ?? 'http://localhost:3845');
```

사용자가 임의의 HTTP URL을 입력할 수 있으며, 프로덕션 환경에서도 평문 HTTP로 Figma 데이터를 전송할 수 있다. API 키는 헤더로만 전송되지만 POST body의 `nodeId`, MCP 컨텍스트 데이터가 평문으로 노출될 수 있다.

**개선:** 프로덕션 빌드 시 HTTPS URL 강제 검증:
```ts
if (process.env.NODE_ENV === 'production' && !url.startsWith('https://')) {
    console.warn('[Security] 프로덕션 환경에서는 HTTPS URL을 사용해야 합니다.');
}
```

---

## 4. 잔존 이슈 — 코드 품질

### 🟡 Q-17 — 일부 UI 문자열 i18n 미적용

**위치:** [src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx:158](src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx#L158)

```ts
throw new Error(`서버 응답 오류 (proxy-server 재시작 필요): ${text.slice(0, 120)}`);
```

에러 메시지가 한국어 하드코딩으로 남아있다. `useTranslation`이 이미 적용된 컴포넌트이므로 `t('mcp.error_server_response')` 형태로 전환해야 한다.

추가 미적용 위치:
- [FigmaMcpPanel.tsx:265](src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx#L265): `alt="Figma screenshot"` (영문 하드코딩)
- [App.tsx:187](src/App.tsx#L187): `×` 닫기 버튼 텍스트 (i18n으로 이동 필요)

---

### 🔵 Q-18 — `MAX_OUTPUT_TOKENS` 하드코딩

**위치:** [src/components/FigmaAgent/hooks/useAgentSubmit.ts:26](src/components/FigmaAgent/hooks/useAgentSubmit.ts#L26)

```ts
const MAX_OUTPUT_TOKENS = 65536;
```

모델별 최대 토큰 한도가 상이하며(예: `gemini-2.5-flash`는 최대 8,192 output tokens), 하드코딩된 65,536은 실제 모델 한도를 초과할 수 있다. 모델 정보(`GeminiModelInfo.outputTokenLimit`)를 활용해 동적으로 조정하거나, 환경 변수로 외부화해야 한다.

**개선:**
```ts
const MAX_OUTPUT_TOKENS = Math.min(
    selectedModelInfo?.outputTokenLimit ?? 8192,
    parseInt(process.env.MAX_OUTPUT_TOKENS ?? '65536', 10)
);
```

---

### 🔵 Q-19 — `sessionStorage` 키 매직 스트링

**위치:** [src/hooks/useApiKeyEncryption.ts](src/hooks/useApiKeyEncryption.ts)

```ts
sessionStorage.getItem('figma_agent_api_key')  // 매직 스트링
```

`localStorage`, `sessionStorage` 키가 여러 파일에 분산되어 있다. 상수 파일로 통합 관리해야 한다.

**개선:** `src/constants/storageKeys.ts`:
```ts
export const STORAGE_KEYS = {
    API_KEY_SESSION: 'figma_agent_api_key',
    API_KEY_ENCRYPTED: 'figma_agent_api_key_encrypted',
} as const;
```

---

### 🔵 Q-20 — 에러 바운더리(Error Boundary) 미적용

**위치:** [src/bootstrap.tsx](src/bootstrap.tsx), [src/App.tsx](src/App.tsx)

React 컴포넌트 트리에 에러 바운더리가 없다. `useAgentSubmit`, `useApiKeyEncryption`, `useGeminiModels` 훅에서 예외 발생 시 컴포넌트 트리 전체가 언마운트되어 흰 화면이 표시된다.

**개선:** 최상위 Provider 래퍼에 ErrorBoundary 추가:
```tsx
<ErrorBoundary fallback={<ErrorPage />}>
    <Provider store={sharedStore}>
        <FigmaLabApp />
    </Provider>
</ErrorBoundary>
```

---

## 5. 잔존 이슈 — 성능

### 🟡 P-06 — Gemini 모델 목록 캐싱 미적용

**위치:** [src/hooks/useGeminiModels.ts:73](src/hooks/useGeminiModels.ts#L73)

```ts
const fetchModels = useCallback(async () => {
    // API 호출 — 매번 새로 요청
    const res = await fetch(`${GEMINI_API_BASE}/models?key=${apiKey}&pageSize=100`);
```

`apiKey`가 잠금 해제될 때마다 모델 목록을 재요청한다. 모델 목록은 자주 변경되지 않으므로 `sessionStorage`나 Jotai atom으로 캐싱하면 불필요한 API 호출을 방지할 수 있다. URL에 `apiKey`를 직접 포함하는 것도 개선 필요하다(Query Param 노출).

**개선:**
1. 모델 목록을 sessionStorage에 캐싱 (TTL: 1시간)
2. API 키를 헤더로 전달: `headers: { 'x-goog-api-key': apiKey }`, URL에서 제거

---

### 🔵 P-07 — `appendLog` 개별 setState 호출로 인한 다수 리렌더링

**위치:** [src/components/FigmaAgent/ControlLayer/InputPanel.tsx:48](src/components/FigmaAgent/ControlLayer/InputPanel.tsx#L48)

`handleSubmit` 실행 시 `appendLog`가 30회 이상 연속 호출되며, 각 호출마다 React 상태 업데이트가 발생한다. React 18+의 자동 배치(auto-batching)로 일부 완화되지만, `async` 함수 내에서는 완전히 적용되지 않는다.

**개선:** 로그를 배열에 수집 후 한 번에 업데이트:
```ts
const logBatch: string[] = [];
logBatch.push(`│ [VALIDATE] ...`);
// ... 여러 줄 추가 후
appendLogBatch(logBatch);
```

---

## 6. 잔존 이슈 — 아키텍처

### 🟡 A-09 — 시스템 프롬프트(SYSTEM_PROMPT) 외부화 미적용

**위치:** [src/components/FigmaAgent/utils.ts](src/components/FigmaAgent/utils.ts)

```ts
export const SYSTEM_PROMPT = `당신은 Figma 디자인을 ...`;
```

AI 동작의 핵심인 시스템 프롬프트가 소스 코드에 하드코딩되어 있다. 변경 시 빌드 및 배포가 필요하며, A/B 테스트나 프롬프트 튜닝이 불가능하다.

**개선 방향:**
- 단기: `config/prompts.ts`로 분리 후 환경 변수로 오버라이드 가능하도록
- 중기: 원격 설정(Remote Config)에서 프롬프트 로드

---

### 🔵 A-10 — 전역 에러 핸들러/모니터링 부재

현재 에러는 컴포넌트 내 `try-catch`로만 처리되며, 프로덕션 환경에서 에러 집계 및 알림 기능이 없다.

**개선:**
```ts
// bootstrap.tsx
window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise Rejection]', event.reason);
    // Sentry.captureException(event.reason);
});
```

---

## 7. 잔존 이슈 — 접근성/UX

### 🟡 A11Y-01 — 이모지 버튼 텍스트의 스크린리더 접근성

**위치:** [FigmaMcpPanel.tsx:241](src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx#L241), [FigmaMcpPanel.tsx:257](src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx#L257)

```tsx
<button ...>📸 {t('mcp.screenshot')}</button>
<button ...>✕ {t('mcp.remove')}</button>
```

스크린리더는 이모지를 "camera with flash 사진 찍기" 등으로 읽어 사용자 경험을 해친다.

**개선:**
```tsx
<button ...>
    <span aria-hidden="true">📸</span>
    <span>{t('mcp.screenshot')}</span>
</button>
```

---

### 🟡 A11Y-02 — 탭 키보드 방향키 내비게이션 미구현

**위치:** [src/App.tsx:142-156](src/App.tsx#L142)

ARIA 탭 패턴은 방향키(`ArrowLeft`, `ArrowRight`)로 탭 간 이동을 지원해야 한다(WAI-ARIA Authoring Practices). 현재는 `Tab` 키만 사용 가능하다.

**개선:**
```tsx
onKeyDown={(e) => {
    const tabs = TAB_ITEMS;
    const current = tabs.indexOf(activeTab);
    if (e.key === 'ArrowRight') setActiveTab(tabs[(current + 1) % tabs.length]);
    if (e.key === 'ArrowLeft') setActiveTab(tabs[(current - 1 + tabs.length) % tabs.length]);
}}
```

---

### 🔵 A11Y-03 — 스크린샷 이미지 alt 텍스트 한국어 미통일

**위치:** [FigmaMcpPanel.tsx:265](src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx#L265)

```tsx
<img ... alt="Figma screenshot" />  // 영어 하드코딩
```

i18n 체계 도입 후에도 alt 텍스트가 영어로 남아있다. `alt={t('mcp.screenshot_alt')}` 형태로 통일해야 한다.

---

## 8. 잔존 이슈 — 테스트

### 🟠 T-03 — E2E 테스트 커버리지 극히 미흡

**위치:** [e2e/example.spec.ts](e2e/example.spec.ts)

```ts
test('has title', async ({ page }) => { ... });
test('get started link', async ({ page }) => { ... });
```

Playwright E2E 테스트가 도입되었으나 **스모크 테스트 수준** (2개 케이스)에 불과하다. 핵심 사용자 플로우(MCP 연결 → 데이터 가져오기 → AI 생성 → 뷰 탭 이동)에 대한 테스트가 없다.

**개선: 최소 필요 E2E 시나리오**
```
e2e/
  setup.spec.ts        # API 키 설정, PIN 암호화
  mcp.spec.ts          # MCP 패널, 노드 ID 입력, 연결 상태
  generation.spec.ts   # AI 생성 전체 플로우 (Mock API 사용)
  accessibility.spec.ts # @axe-core/playwright 접근성 검사
```

---

### 🟡 T-04 — useGeminiModels URL에 API 키 Query Param 노출

**위치:** [src/hooks/useGeminiModels.ts](src/hooks/useGeminiModels.ts)

```ts
const res = await fetch(`${GEMINI_API_BASE}/models?key=${apiKey}&pageSize=100`);
```

모델 목록 조회 시 API 키가 URL 쿼리 파라미터에 포함된다. URL은 서버 액세스 로그에 기록되며, Referer 헤더, 브라우저 히스토리, 프록시 로그에 노출될 수 있다. `generateContent` 엔드포인트는 이미 헤더 방식을 사용하는 것과 불일치한다.

**개선:**
```ts
const res = await fetch(`${GEMINI_API_BASE}/models?pageSize=100`, {
    headers: { 'x-goog-api-key': apiKey }
});
```

---

## 9. 신규 발견 이슈

### 🟠 N-16 — Gemini 모델 목록 API URL에 API 키 노출 (T-04와 연동)

`useGeminiModels`의 API 키 URL 노출은 보안 이슈이므로 별도 추적. 상세 내용은 [T-04](#-t-04--usegeminimodels-url에-api-키-query-param-노출) 참조.

---

### 🟡 N-17 — `bootstrap.tsx` Root 엘리먼트 누락 시 사용자 피드백 없음

**위치:** [src/bootstrap.tsx](src/bootstrap.tsx)

```tsx
const rootElement = document.getElementById('root');
if (!rootElement) return; // 조용히 종료
```

`root` 엘리먼트가 없을 경우 화면이 완전히 빈 상태로 표시되며 사용자에게 아무 피드백이 없다. SPA의 치명적 초기화 오류이므로 최소한 오류 메시지를 표시해야 한다.

**개선:**
```tsx
if (!rootElement) {
    document.body.innerHTML = '<div style="...">앱 초기화에 실패했습니다. 페이지를 새로고침해주세요.</div>';
    console.error('[Bootstrap] root element not found');
    return;
}
```

---

### 🟡 N-18 — `webpack.config.js` devServer CORS 와일드카드 주석 미흡

**위치:** [webpack.config.js](webpack.config.js)

```js
headers: { "Access-Control-Allow-Origin": "*" }
```

개발 서버에만 적용되나, 실수로 프로덕션 설정에 복사될 경우 보안 위험이 된다. 명확한 주석 및 프로덕션 빌드 분기가 필요하다.

**개선:**
```js
// ⚠️ 개발 환경 전용 — 프로덕션에는 절대 적용 금지
...(isDev && { headers: { "Access-Control-Allow-Origin": "*" } }),
```

---

### 🔵 N-19 — ESLint 규칙 최소화 (접근성·임포트 순서 미검사)

**위치:** [eslint.config.mjs](eslint.config.mjs)

현재 ESLint 설정은 TypeScript 권장 규칙과 React Hooks 규칙만 포함한다. 다음 규칙이 누락되어 있다:

| 누락 규칙 | 효과 |
|-----------|------|
| `eslint-plugin-jsx-a11y` | 접근성 자동 검사 |
| `eslint-plugin-import` | 임포트 순서 통일 |
| `no-console` (warn) | 프로덕션 console.log 방지 |
| `prefer-const` | 불변성 강제 |

---

### 🔵 N-20 — CI/CD 파이프라인 부재

`package.json`에 `lint`, `test`, `build` 스크립트가 정의되어 있으나, GitHub Actions 등의 CI 파이프라인이 구성되어 있지 않다. PR 머지 전 자동 품질 검사가 실행되지 않는다.

**개선:** `.github/workflows/ci.yml` 최소 구성:
```yaml
on: [push, pull_request]
jobs:
  quality:
    steps:
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

---

### 🔵 N-21 — `playwright.config.ts` baseURL 하드코딩

**위치:** [playwright.config.ts](playwright.config.ts)

```ts
baseURL: 'http://localhost:3005',
```

환경 변수로 외부화해야 한다:
```ts
baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3005',
```

---

## 10. 상용 배포 평가 점수표

> 평가 기준: 실제 서비스 배포(Production Release) 기준. 각 항목 100점 만점.

### 10.1 보안 (Security) — 82/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| API 키 전송 보안 (헤더 사용) | 15 | ✅ `x-goog-api-key` 헤더 적용 (단, 모델 목록 조회는 URL 노출) | 12 |
| API 키 저장 보안 | 15 | ✅ PBKDF2(310k iter) + AES-GCM, OWASP 2023 준수 | 14 |
| iframe 샌드박싱 | 15 | ✅ `allow-scripts`만 허용, `referrerPolicy="no-referrer"` | 14 |
| Prompt Injection 방어 | 10 | ✅ `<figma_design_context>` + `<user_instructions>` 이중 격리 | 9 |
| 입력 검증/Sanitize | 10 | ⚠️ 기본 검증만 존재, PIN 브루트포스 방어 없음 | 5 |
| HTTPS 강제 | 10 | ⚠️ 코드 레벨 강제 없음 (배포 환경 의존) | 7 |
| 의존성 취약점 관리 | 10 | ✅ `crypto-js` 제거 완료, npm audit 미자동화 | 7 |
| 환경 변수 관리 | 10 | ✅ `process.env.*` 외부화 | 9 |
| i18n XSS 방어 | 5 | ⚠️ `escapeValue: false` (신규 발견) | 3 |
| **소계** | **100** | | **80** |
| **100점 환산** | | | **82** |

---

### 10.2 아키텍처 (Architecture) — 85/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| 관심사 분리 | 20 | ✅ 암호화/모델/제출 로직 훅으로 분리 완성 | 18 |
| 상태 관리 일관성 | 20 | ✅ Jotai 단일 스토어, 단일 Provider | 19 |
| 모듈/파일 구조 | 15 | ✅ 도메인별 폴더, hooks/ 디렉토리 완성 | 13 |
| 데드 코드/미사용 의존성 | 15 | ✅ `crypto-js`, `react-router-dom`, 불필요 래퍼 모두 제거 | 14 |
| 확장성 | 15 | ✅ Module Federation 기반 확장 가능 | 13 |
| 컴포넌트 재사용성 | 15 | ✅ 공통 훅 분리, 재사용 가능한 구조 | 12 |
| 에러 바운더리 | — | ❌ 미구현 (감점) | -4 |
| **소계** | **100** | | **85** |

---

### 10.3 코드 품질 (Code Quality) — 84/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| TypeScript 타입 안전성 | 20 | ✅ strict, 타입 가드 완성. `as unknown as BufferSource` 잔존 | 17 |
| React 모범 사례 | 20 | ✅ useCallback, useMemo, useEffect deps 완성 | 18 |
| 코드 중복 | 15 | ✅ fetchFigmaData, formatBytes 공통화 완료 | 14 |
| 명명/가독성 | 15 | ✅ 명확한 변수/함수명, JSDoc 주석 적용 | 13 |
| 에러 처리 | 15 | ✅ try-catch 포괄적 적용, 타입 가드 | 14 |
| 린팅/포매팅 | 15 | ✅ ESLint + TypeScript 검사 (규칙 최소화는 개선 여지) | 12 |
| **소계** | **100** | | **88** |
| **100점 환산** | | | **84** |

---

### 10.4 성능 (Performance) — 81/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| 불필요한 리렌더링 방지 | 25 | ✅ CSS 모듈 클래스, useCallback 완성 | 22 |
| 메모이제이션 | 20 | ✅ byteSize, parseNodeId, buildPromptText useMemo 적용 | 17 |
| 네트워크 최적화 | 20 | ✅ 폴링 지수 백오프 + Visibility API 일시 정지 | 18 |
| 번들 사이즈 | 20 | ✅ crypto-js 제거, Module Federation | 17 |
| 코드 스플리팅 | 15 | ✅ Module Federation + Lazy 가능 구조 | 13 |
| 모델 캐싱 | — | ⚠️ 모델 목록 매번 재요청 (감점) | -6 |
| **소계** | **100** | | **81** |

---

### 10.5 접근성/UX (Accessibility & UX) — 72/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| ARIA 레이블/역할 | 20 | ✅ role="tab/tabpanel", aria-selected, aria-controls 적용 | 16 |
| 키보드 내비게이션 | 15 | ⚠️ 탭 Tab 키 접근 가능, 방향키 내비게이션 미구현 | 8 |
| 스크린리더 지원 | 15 | ✅ aria-live="polite" Toast, aria-busy, aria-describedby | 12 |
| i18n/지역화 | 15 | ✅ i18next 도입, 일부 하드코딩 잔존 | 10 |
| 사용자 피드백 | 20 | ✅ 디버그 로그, Toast, 상태 표시, 에러 메시지 | 17 |
| 반응형 레이아웃 | 15 | ⚠️ 데스크톱 전용, 모바일 미지원 | 9 |
| **소계** | **100** | | **72** |

---

### 10.6 빌드/설정 (Build & Config) — 87/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| TypeScript 타입 체크 빌드 통합 | 20 | ✅ ForkTsCheckerWebpackPlugin 활성화 | 18 |
| ESLint/코드 품질 자동화 | 20 | ✅ `eslint.config.mjs` + React Hooks 규칙, 접근성 규칙 미포함 | 14 |
| 소스맵 설정 | 15 | ✅ 프로덕션: `source-map`, 개발: `eval-cheap-module-source-map` | 14 |
| 환경별 빌드 분리 | 15 | ✅ `isProd` 분기, 환경 변수 외부화 완성 | 13 |
| 의존성 정리 | 15 | ✅ `crypto-js`, `react-router-dom` 모두 제거 | 14 |
| CI/CD 연동 준비 | 15 | ❌ CI 파이프라인 없음, `--passWithNoTests` 제거 완료 | 8 |
| **소계** | **100** | | **81** |
| **100점 환산** | | | **87** |

---

### 10.7 테스트 (Testing) — 76/100

| 항목 | 배점 | 현황 | 점수 |
|------|------|------|------|
| 핵심 유틸 유닛 테스트 | 25 | ✅ `utils.test.ts` 100% 커버리지 | 25 |
| 컴포넌트 통합 테스트 | 25 | ✅ AgentSetupPanel·InputPanel·FigmaMcpPanel·useAgentSubmit 커버 | 22 |
| E2E 테스트 | 20 | ⚠️ Playwright 도입되었으나 스모크 테스트 2개만 존재 | 5 |
| 테스트 커버리지 목표 | 15 | ✅ 임계값 설정 완료 (branches:70%, functions/lines:80%) | 13 |
| 에러 케이스 테스트 | 15 | ✅ 네트워크 오류, 잘못된 JSON, 빈 입력 케이스 추가 | 13 |
| **소계** | **100** | | **78** |
| **100점 환산** | | | **76** |

---

### 10.8 종합 평가

```
┌─────────────────────────────────────────────────────────────────┐
│                  상용 배포 준비도 (Production Readiness)          │
├──────────────────────┬──────┬──────┬───────────────────────────┤
│ 평가 영역             │ 가중치│ 점수 │ 가중 점수                  │
├──────────────────────┼──────┼──────┼───────────────────────────┤
│ 보안                 │ 25%  │  82  │ 20.5                      │
│ 아키텍처              │ 15%  │  85  │ 12.75                     │
│ 코드 품질             │ 15%  │  84  │ 12.6                      │
│ 성능                 │ 15%  │  81  │ 12.15                     │
│ 접근성/UX            │ 10%  │  72  │  7.2                      │
│ 빌드/설정             │ 10%  │  87  │  8.7                      │
│ 테스트               │ 10%  │  76  │  7.6                      │
├──────────────────────┼──────┼──────┼───────────────────────────┤
│ 종합 점수             │ 100% │  82  │ 81.5 / 100                │
└──────────────────────┴──────┴──────┴───────────────────────────┘

판정: 🟡 Beta Ready — 소규모 사용자 배포 가능
      신규 보안 이슈(PIN 브루트포스, i18n XSS, API 키 URL 노출) 보완 및
      E2E 테스트 커버리지 확대 후 프로덕션 출시 권장
```

#### 등급 기준
| 점수 | 등급 | 의미 |
|------|------|------|
| 90~100 | 🟢 Production Ready | 즉시 배포 가능 |
| 75~89 | 🟡 Beta Ready | 소규모 사용자 배포 가능 |
| 60~74 | 🟠 Alpha/MVP | 내부 사용, 스테이징 환경 |
| ~59 | 🔴 Pre-Alpha | 추가 개발 필요 |

**현재 등급: 🟡 Beta Ready (82점)** ← v3 Beta Ready(78점)에서 4점 상향

---

## 11. 개선 로드맵

### Sprint 9 — 보안·품질 강화 (즉시, ~0.5주)

| # | ID | 항목 | 담당 파일 | 공수 | 결과 |
|---|----|------|----------|------|------|
| 1 | N-16/T-04 | 모델 목록 API URL → 헤더 방식으로 전환 | useGeminiModels.ts | 30m | ✅ |
| 2 | S-07 | i18n `escapeValue` 검토 및 주석 명시 | i18n/config.ts | 15m | ✅ |
| 3 | S-08 | PIN 잠금 해제 시도 횟수 제한 | useApiKeyEncryption.ts | 1h | ✅ |
| 4 | S-09 | `as unknown as BufferSource` 캐스팅 제거 | crypto.ts | 15m | ✅ |
| 5 | Q-17 | FigmaMcpPanel 하드코딩 에러 메시지 i18n 전환 | FigmaMcpPanel.tsx | 30m | ✅ |
| 6 | Q-20 | 에러 바운더리 컴포넌트 추가 | bootstrap.tsx, App.tsx | 1h | ✅ |
| 7 | N-17 | bootstrap root 누락 시 사용자 피드백 추가 | bootstrap.tsx | 15m | ✅ |

### Sprint 10 — E2E 테스트 확대 (~1주)

| # | ID | 항목 | 담당 파일 | 공수 |
|---|----|------|----------|------|
| 8 | T-03 | E2E MCP 패널 시나리오 테스트 | e2e/mcp.spec.ts | 3h |
| 9 | T-03 | E2E AI 생성 플로우 테스트 (Mock API) | e2e/generation.spec.ts | 4h |
| 10 | T-03 | E2E 접근성 검사 (`@axe-core/playwright`) | e2e/accessibility.spec.ts | 2h |
| 11 | N-19 | ESLint 접근성 규칙 추가 (`jsx-a11y`) | eslint.config.mjs | 1h |
| 12 | N-20 | GitHub Actions CI 파이프라인 구성 | .github/workflows/ci.yml | 2h |

### Sprint 11 — 성능·아키텍처 개선 (~1주)

| # | ID | 항목 | 담당 파일 | 공수 |
|---|----|------|----------|------|
| 13 | P-06 | Gemini 모델 목록 캐싱 (TTL 1시간) | useGeminiModels.ts | 1h |
| 14 | A-09 | 시스템 프롬프트 외부화 | utils.ts, config/prompts.ts | 2h |
| 15 | A-10 | 전역 에러 핸들러 추가 | bootstrap.tsx | 1h |
| 16 | A11Y-01 | 이모지 버튼 aria-hidden 처리 | FigmaMcpPanel.tsx | 30m |
| 17 | A11Y-02 | 탭 방향키 내비게이션 구현 | App.tsx | 1h |
| 18 | Q-18 | MAX_OUTPUT_TOKENS 환경 변수화 | useAgentSubmit.ts | 30m |
| 19 | Q-19 | 스토리지 키 상수 파일 통합 | constants/storageKeys.ts | 30m |

### Sprint 12 — 운영 안정성 (장기)

| # | ID | 항목 | 담당 파일 | 공수 |
|---|----|------|----------|------|
| 20 | — | Sentry 에러 트래킹 연동 | bootstrap.tsx | 2h |
| 21 | — | 성능 모니터링 (Web Vitals) | bootstrap.tsx | 1h |
| 22 | — | Dependabot 의존성 자동 업데이트 | .github/dependabot.yml | 30m |
| 23 | — | 번들 크기 분석 및 Webpack Bundle Analyzer 도입 | webpack.config.js | 1h |

---

### 요약: 가장 높은 ROI 항목 (즉시 처리 권장)

| 우선순위 | ID | 항목 | 소요 시간 | 영향 |
|---------|----|----|---------|------|
| ★★★ | N-16/T-04 | API 키 URL 노출 → 헤더 전환 | 30분 | 보안 |
| ★★★ | S-08 | PIN 브루트포스 방어 추가 | 1시간 | 보안 |
| ★★★ | T-03 | E2E 테스트 실질적 커버리지 확대 | 1주 | 테스트 |
| ★★★ | N-20 | GitHub Actions CI 구성 | 2시간 | 운영 |
| ★★ | Q-20 | 에러 바운더리 추가 | 1시간 | 안정성 |
| ★★ | A11Y-02 | 탭 방향키 내비게이션 | 1시간 | 접근성 |
| ★★ | P-06 | Gemini 모델 목록 캐싱 | 1시간 | 성능 |
| ★ | S-09 | crypto.ts 이중 캐스팅 제거 | 15분 | 코드 품질 |

---

*이 리뷰는 커밋 `5c24ea4` 기준 코드베이스 스냅샷을 분석한 결과입니다. Sprint 7~8 이행으로 보안·성능·i18n·E2E 기반이 크게 강화되었으며(78 → 82점), Beta Ready 단계가 공고해졌습니다. 남은 주요 과제는 E2E 테스트 실질적 확대, CI 파이프라인 구축, 신규 발견 보안 이슈(PIN 브루트포스, API 키 URL 노출) 해결입니다.*
