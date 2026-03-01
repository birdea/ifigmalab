# iFigmaLab Code Review Report

> **Review Date**: 2026-02-28
> **Reviewer**: Claude Code (Professional Software Engineering Review)
> **Version**: 0.1.0
> **Commit**: `1c606b9` (main)
>
> **Last Updated**: 2026-03-01
> **Update Commit**: `7f096d9` (main) — H-1 ~ H-4 resolved

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Review](#2-architecture-review)
3. [Code Quality & Refactoring Items](#3-code-quality--refactoring-items)
4. [Security Review](#4-security-review)
5. [Performance Review](#5-performance-review)
6. [Testing & Quality Assurance](#6-testing--quality-assurance)
7. [Production Deployment Readiness](#7-production-deployment-readiness)
8. [Accessibility (a11y)](#8-accessibility-a11y)
9. [Internationalization (i18n)](#9-internationalization-i18n)
10. [DevOps & CI/CD](#10-devops--cicd)
11. [Scoring Summary](#11-scoring-summary)

---

## 1. Executive Summary

iFigmaLab은 Figma 디자인 데이터를 Google Gemini AI를 통해 프로덕션 수준의 HTML/CSS/JS로 변환하는 React 19 + TypeScript 웹 애플리케이션입니다. Module Federation 기반 마이크로프론트엔드 아키텍처를 채택하고 있으며, Jotai 상태관리, i18n 다국어 지원, AES-GCM 암호화 등 전문적인 기능을 갖추고 있습니다.

전반적으로 코드 품질이 양호하며, 이전 코드 리뷰 결과(H-1~H-7, M-1~M-15, L-1~L-10)가 반영된 상태입니다. 다만 상용 소프트웨어 배포 관점에서 추가 개선이 필요한 영역이 식별되었습니다.

**2026-03-01 업데이트**: High Priority 항목(H-1 ~ H-4)이 커밋 `7f096d9`에서 모두 수정되었습니다. 훅 분리, 컴포넌트 관심사 분리, 매직 넘버 상수화, 에러 처리 통일이 완료되어 Code Quality 점수가 상향 조정되었습니다.

---

## 2. Architecture Review

### 2.1 Overall Architecture

| 항목 | 현재 상태 | 평가 |
|------|----------|------|
| Framework | React 19.0.0 + TypeScript 5.7.3 | Excellent |
| State Management | Jotai (atomic state) | Good |
| Bundler | Webpack 5 + Module Federation | Good |
| Styling | SCSS Modules | Good |
| Testing | Jest + Playwright | Good |
| CI/CD | GitHub Actions | Good |

### 2.2 Component Hierarchy

```
bootstrap.tsx
  └─ ErrorBoundary
       └─ App (FigmaLabApp)
            ├─ AgentSetupPanel  [AGENT 탭]
            ├─ FigmaAgent       [MCP 탭]
            │   └─ ControlLayer
            │        ├─ FigmaMcpPanel
            │        └─ InputPanel
            │             └─ DebugLogPanel  ← H-2 분리 (7f096d9)
            ├─ ViewPage         [VIEW 탭]
            └─ HelpPage         [HELP 탭] (lazy-loaded)
```

**hooks 구조 (H-1 분리 후)**:
```
src/components/FigmaAgent/hooks/
  useAgentSubmit.ts    — 오케스트레이터 (16줄, 7f096d9)
  usePromptBuilder.ts  — 프롬프트 텍스트/파트 빌드 (신규)
  useTokenCounter.ts   — countTokens API 호출 (신규)
  useGeminiApi.ts      — generateContent API 호출 및 응답 파싱 (신규)
```

### 2.3 Architecture Strengths

- **Module Federation**: 마이크로프론트엔드 통합을 위한 `remoteEntry.js` 노출 구성이 잘 되어 있음
- **Dynamic import**: `index.ts → bootstrap.tsx` 패턴으로 Module Federation 호환성 확보
- **Shared Store**: `sharedStore`를 통한 Jotai 상태 인스턴스 공유 방식 적절
- **Error Boundary + Global Error Handler**: 동기/비동기 오류 모두 포착하는 이중 안전장치
- **Lazy Loading**: HelpPage를 `React.lazy`로 코드 스플리팅

### 2.4 Architecture Issues (리팩토링 필요)

#### [A-1] App.tsx에 ViewPage 컴포넌트 직접 정의 (MEDIUM)
- **위치**: `src/App.tsx:23-77`
- **문제**: `ViewPage` 컴포넌트가 App.tsx 내부에 인라인으로 정의되어 단일 책임 원칙(SRP) 위반
- **권장**: `src/components/ViewPage/index.tsx`로 분리

#### [A-2] ControlLayer가 FigmaAgent의 래퍼로만 기능 (LOW)
- **위치**: `src/components/FigmaAgent/ControlLayer/index.tsx`
- **문제**: `ControlLayer`는 `FigmaMcpPanel` + `InputPanel`을 조합하는 단순 래퍼이고, `FigmaAgent/index.tsx`도 `ControlLayer`의 단순 래퍼. 불필요한 레이어 중첩
- **권장**: `FigmaAgent`와 `ControlLayer` 중 하나를 제거하여 컴포넌트 깊이 단순화

#### [A-3] atoms.ts 파일의 비대화 (MEDIUM)
- **위치**: `src/components/FigmaAgent/atoms.ts` (73줄, 25+개 atom)
- **문제**: 모든 글로벌 상태가 단일 파일에 집중. 관심사 분리 부족
- **권장**: 도메인별로 atoms 파일을 분리 (예: `atoms/api.ts`, `atoms/figma.ts`, `atoms/generation.ts`, `atoms/security.ts`)

#### [A-4] hooks 디렉토리 분산 (LOW)
- **위치**: `src/hooks/` + `src/components/FigmaAgent/hooks/`
- **문제**: 커스텀 훅이 두 위치에 분산되어 있어 일관성 부족
- **권장**: 모든 커스텀 훅을 `src/hooks/`로 통합하거나, 컴포넌트 바인딩 훅과 공용 훅을 명확히 구분

---

## 3. Code Quality & Refactoring Items

### 3.1 Critical (즉시 수정 필요)

#### [C-1] API Key가 Gemini API 호출 시 URL이 아닌 헤더로 전송되지만 로그에 부분 노출
- **위치**: `src/components/FigmaAgent/hooks/useAgentSubmit.ts:143`
- **코드**: `appendLog(\`│ [VALIDATE] API Key : ${apiKey ? \`${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (${apiKey.length} chars) ✓\` : '❌ none'}\`)`
- **문제**: Debug 로그에 API Key의 처음 6자 + 마지막 4자가 기록됨. Debug 로그가 textarea에 표시되므로 화면 공유, 스크린샷 등으로 키 일부 유출 가능
- **권장**: API Key 마스킹을 `${apiKey.slice(0, 4)}****` 정도로 최소화하거나, 키 길이와 존재 여부만 로그

#### [C-2] iframe sandbox에서 `allow-same-origin` 제거됨 확인 필요
- **위치**: `src/App.tsx:71`
- **코드**: `sandbox="allow-scripts"`
- **현재 상태**: `allow-scripts`만 허용되어 있어 보안적으로 양호하나, `srcDoc`으로 주입된 AI 생성 HTML이 스크립트를 실행할 수 있음
- **위험**: AI가 생성한 악의적 JavaScript가 실행될 수 있음 (Prompt Injection 시나리오)
- **권장**: 사용자에게 스크립트 실행 여부를 선택할 수 있는 토글 제공 (기본값: `sandbox=""` - 스크립트 비허용)

### 3.2 High Priority

#### [H-1] useAgentSubmit 훅의 과도한 책임 (342줄) ✅ RESOLVED (`7f096d9`)
- **위치**: `src/components/FigmaAgent/hooks/useAgentSubmit.ts`
- **문제**: 프롬프트 빌드, 토큰 카운팅, API 호출, 응답 파싱, HTML 추출, 로깅이 단일 훅에 혼재
- **해결**: 단일 책임 원칙(SRP)에 따라 4개 파일로 분리. 공개 API(`tokenCount`, `handleCountTokens`, `handleSubmit` 등)는 기존과 동일하게 유지하여 하위 호환성 보장
  - `usePromptBuilder.ts` — 프롬프트 텍스트/파트 빌드 (atoms 읽기 + `useCallback`)
  - `useTokenCounter.ts` — countTokens API 호출 및 상태 관리
  - `useGeminiApi.ts` — generateContent API 호출, 응답 파싱, 에러 처리
  - `useAgentSubmit.ts` — 16줄 경량 오케스트레이터 (공개 API 노출)

#### [H-2] InputPanel 컴포넌트의 다중 관심사 ✅ PARTIALLY RESOLVED (`7f096d9`)
- **위치**: `src/components/FigmaAgent/ControlLayer/InputPanel.tsx`
- **문제**: 프롬프트 입력, MCP 데이터 표시/편집, 토큰 카운팅, 데이터 최적화, 디버그 로그 표시 등 5개 이상의 관심사가 혼재
- **해결**: `DebugLogPanel.tsx` 신규 컴포넌트 분리 완료. `InputPanel`은 `useSetAtom(debugLogAtom)` 쓰기 전용으로 단순화; `DebugLogPanel`이 로그 표시·자동스크롤·Clear 책임 전담
- **잔여**: MCP 데이터 편집기 분리는 미완료 (별도 이슈로 관리)

#### [H-3] 하드코딩된 매직 넘버 ✅ RESOLVED (`7f096d9`)
- **위치**: 여러 파일
- **해결**: `src/constants/config.ts` 신규 생성. 모든 매직 넘버를 명명된 상수로 교체
  - `PBKDF2_ITERATIONS = 310_000` → `crypto.ts`
  - `SESSION_TIMEOUT_MS = 30 * 60 * 1_000` → `useSessionTimeout.ts`
  - `ENCRYPT_DEBOUNCE_MS = 300` → `useApiKeyEncryption.ts`
  - `MAX_UNLOCK_ATTEMPTS = 5`, `LOCKOUT_DURATION_MS = 30_000` → `useApiKeyEncryption.ts`
  - `API_TIMEOUT_MS = 120_000` → `useGeminiApi.ts`
  - `COUNT_TOKENS_TIMEOUT_MS = 30_000` → `useTokenCounter.ts`
  - `MAX_DEBUG_LOG_LINES = 500` → `InputPanel.tsx`
  - `MCP_POLL_INTERVAL_MS = 10_000` → `FigmaMcpPanel.tsx`

#### [H-4] 에러 처리 패턴 불일치 ✅ RESOLVED (`7f096d9`)
- **위치**: 프로젝트 전반
- **문제**: 일부는 `catch (e) { console.error(...) }`, 일부는 `reportError()`, 일부는 빈 catch 블록 `catch { }`
- **해결**: 주요 누락 지점 2곳을 `reportError()` 패턴으로 통일
  - `ErrorBoundary.componentDidCatch` → `reportError('ErrorBoundary', error)` 추가 (M-6도 함께 해결)
  - `useApiKeyEncryption` 암호화 실패 catch → `console.error` → `reportError('Encryption', e)` 교체
- **잔여**: 빈 catch 블록(`catch { }`)은 의도적 무시 케이스에 주석이 이미 있는 경우 유지

### 3.3 Medium Priority

#### [M-1] SCSS에 사용되지 않는 클래스 존재
- **위치**: `src/App.module.scss`
- **문제**: `.sidebar`, `.sidebarLeft`, `.sidebarRight`, `.sidebarContent`, `.resizer`, `.logPage`, `.logHeader`, `.logTitle`, `.logClear`, `.logArea`, `.panelBtn`, `.panelBtnActive`, `.menuDivider` 등이 정의되어 있으나 현재 컴포넌트에서 사용되지 않음
- **권장**: 사용되지 않는 CSS 클래스를 정리하여 번들 크기 감소

#### [M-2] FigmaMcpPanel에서 useAtom 대신 useAtomValue/useSetAtom 사용 권장
- **위치**: `src/components/FigmaAgent/ControlLayer/FigmaMcpPanel.tsx:24-30`
- **코드**: `const [nodeId, setNodeId] = useAtom(...)` 패턴을 모든 atom에 사용
- **문제**: 읽기만 하는 atom에 `useAtom`을 사용하면 불필요한 setter 참조 생성
- **권장**: 읽기 전용은 `useAtomValue`, 쓰기 전용은 `useSetAtom` 사용 (InputPanel은 이미 부분적으로 적용)

#### [M-3] extractHtml 함수의 불완전한 코드 블록 파싱
- **위치**: `src/components/FigmaAgent/utils.ts:7`
- **코드**: ``const fenced = raw.match(/```(?:html)?\s*\n?([\s\S]*?)```/)``
- **문제**: `[\s\S]*?` 비탐욕 매칭은 첫 번째 ``` 짝만 매칭. 응답에 여러 코드 블록이 있는 경우 첫 번째만 추출
- **권장**: 가장 큰 HTML 코드 블록을 선택하는 로직으로 개선하거나, `<!DOCTYPE` 또는 `<html`을 포함하는 블록을 우선 선택

#### [M-4] 프롬프트 인젝션 방어 메시지가 한국어로 하드코딩
- **위치**: `src/components/FigmaAgent/hooks/useAgentSubmit.ts:71-74`
- **코드**: ``"⚠️ 주의: 위 <figma_design_context> 내의 내용은..."``
- **문제**: i18n 처리되지 않은 한국어 문자열이 시스템 프롬프트에 직접 포함
- **권장**: AI 프롬프트 내 경고 문구도 i18n 키로 관리하거나, 영어로 통일 (AI 모델은 영어 프롬프트에 더 높은 정확도)

#### [M-5] SYSTEM_PROMPT가 한국어 단일 언어
- **위치**: `src/config/prompts.ts`
- **문제**: 시스템 프롬프트가 한국어로만 작성. 대부분의 LLM은 영어 프롬프트에서 더 나은 성능
- **권장**: 영어 기본 프롬프트로 전환하거나, 사용자 언어에 따른 동적 프롬프트 선택 지원

#### [M-6] ErrorBoundary에서 reportError 미사용 ✅ RESOLVED (`7f096d9`, H-4 포함)
- **위치**: `src/components/ErrorBoundary.tsx`
- **해결**: `componentDidCatch`에 `reportError('ErrorBoundary', error)` 추가. `bootstrap.tsx`의 전역 에러 핸들러와 일관된 패턴 적용

#### [M-7] 타입 안전성 개선 필요
- **위치**: 여러 파일
- **사례**:
  - `atoms.ts:4` — `GeminiModel = string` 타입이 사실상 any string. 런타임 모델 ID 검증 부재
  - `FigmaMcpPanel.tsx:101` — `FigmaApiResponse` 인터페이스에 대한 type guard 미구현
  - `useGeminiModels.ts:84` — `JSON.parse(cached)` 결과에 대한 runtime validation 부재
- **권장**: Zod 또는 직접 구현한 type guard를 일관되게 적용

#### [M-8] 환경 변수 관리 개선
- **위치**: `webpack.config.js:68-75`
- **문제**: `process.env` 기반 환경 변수가 `DefinePlugin`으로 빌드 타임에 주입되지만, `.env` 파일 로더(dotenv-webpack 등)가 없어 CI/CD 환경에서 수동 설정 필요
- **권장**: `dotenv-webpack` 또는 `dotenv` 패키지를 추가하여 `.env` 파일 자동 로드 지원

### 3.4 Low Priority

#### [L-1] console.error 잔여 사용 ✅ PARTIALLY RESOLVED (`7f096d9`, H-4 포함)
- **위치**: ~~`useApiKeyEncryption.ts:77`~~, ~~`ErrorBoundary.tsx:24`~~ → 두 곳 모두 `reportError()`로 교체 완료
- **잔여**: `ErrorBoundary.componentDidCatch`는 디버깅 목적의 `console.error`를 유지 (개발자 도구 스택 추적용). 프로덕션 빌드에서 console 제거 플러그인 적용은 별도 검토

#### [L-2] 접근성 텍스트에서 이모지 사용
- **위치**: `FigmaMcpPanel.tsx:214`, `InputPanel.tsx:119`
- **코드**: `<span aria-hidden="true">📸</span>`, `🗜`
- **현재 상태**: `aria-hidden`으로 적절히 처리된 부분도 있으나, `🗜` 이모지는 `aria-hidden` 없이 직접 텍스트로 포함
- **권장**: 모든 장식용 이모지에 `aria-hidden="true"` 적용

#### [L-3] package.json 버전이 0.1.0
- **위치**: `package.json:3`
- **문제**: 상용 배포를 고려한다면 시맨틱 버전 관리 전략 필요
- **권장**: Conventional Commits + semantic-release 또는 수동 버전 범핑 프로세스 수립

#### [L-4] build 스크립트에서 cp 명령어 사용
- **위치**: `package.json:50`
- **코드**: `"build": "webpack ... && cp public/_redirects dist/_redirects && cp public/_headers dist/_headers"`
- **문제**: `cp` 명령어는 Windows 환경에서 동작하지 않아 크로스 플랫폼 호환성 문제
- **권장**: `CopyWebpackPlugin`으로 대체하거나 `shx cp` 사용

---

## 4. Security Review

### 4.1 Strengths

| 항목 | 구현 상태 | 평가 |
|------|----------|------|
| API Key 암호화 (AES-GCM + PBKDF2) | 310,000 iterations, 랜덤 salt/iv | Excellent |
| CSP 헤더 | 명시적 허용 출처 제한 | Good |
| HSTS | 적용됨 (preload 포함) | Good |
| X-Frame-Options | SAMEORIGIN | Good |
| X-Content-Type-Options | nosniff | Good |
| Permissions-Policy | camera, mic, geo, payment 차단 | Good |
| Referrer-Policy | strict-origin-when-cross-origin | Good |
| PIN 잠금 + lockout 메커니즘 | 5회 실패 → 30초 잠금 | Good |
| Session Timeout | 30분 비활동 시 자동 잠금 | Good |
| i18n escapeValue | true (XSS 방지) | Good |
| 프롬프트 인젝션 방어 | XML 태그 기반 구분 + 경고 문구 | Fair |
| iframe sandbox | allow-scripts만 허용 | Fair |

### 4.2 Security Concerns

#### [S-1] AI 생성 HTML의 스크립트 실행 (HIGH)
- `sandbox="allow-scripts"`로 AI 생성 HTML 내 JavaScript 실행 허용
- Prompt Injection을 통해 악의적 스크립트 주입 가능
- `allow-same-origin` 미포함으로 쿠키/localStorage 접근은 차단되나, 네트워크 요청(fetch) 및 리다이렉트 가능

#### [S-2] Debug 로그에 민감 데이터 부분 노출 (MEDIUM)
- API Key 일부가 Debug 로그 textarea에 표시
- 화면 공유, 스크린샷 캡처 시 유출 가능

#### [S-3] API Key가 브라우저 메모리에 평문 저장 (LOW)
- Jotai atom에 API Key가 평문으로 저장
- 브라우저 DevTools로 접근 가능 (클라이언트 앱의 본질적 한계)
- Mitigation: 사용 완료 시 메모리에서 즉시 제거하는 로직 추가 검토

#### [S-4] CSP에 localhost 주소 하드코딩 (MEDIUM)
- **위치**: `public/_headers:5`
- `connect-src`에 `http://localhost:3006 http://localhost:3845`가 하드코딩
- 프로덕션 배포 시 실제 서버 URL로 변경 필요
- **권장**: 배포 환경별 CSP 헤더 자동 생성 파이프라인 구성

---

## 5. Performance Review

### 5.1 Bundle & Loading

| 항목 | 현재 상태 | 권장 |
|------|----------|------|
| Code Splitting | HelpPage만 lazy load | 추가 분할 검토 (ViewPage 등) |
| Tree Shaking | Webpack 5 기본 지원 | 양호 |
| Content Hash | 프로덕션 파일명에 contenthash 적용 | Excellent |
| CSS Extraction | MiniCssExtractPlugin 사용 (프로덕션) | Good |
| 소스맵 | hidden-source-map (프로덕션) | Good |
| Build Size | dist/ 3.9MB | Gzip/Brotli 적용 후 측정 필요 |

### 5.2 Runtime Performance

#### [P-1] 폴링 기반 연결 상태 확인 (MEDIUM)
- **위치**: `FigmaMcpPanel.tsx:64-98`
- 10초 간격으로 Figma MCP 상태를 폴링. 탭 visibility 기반 일시정지 구현됨
- **권장**: WebSocket 또는 Server-Sent Events(SSE) 전환 검토

#### [P-2] 대용량 MCP 데이터의 비효율적 처리 (MEDIUM)
- **위치**: `InputPanel.tsx:45`, `useGeminiApi.ts` (H-1 분리 후 이동)
- MCP 데이터의 byte 크기를 TextEncoder로 매번 계산. useMemo 적용됨 (InputPanel)
- 그러나 `useGeminiApi`에서는 submit마다 동일 데이터를 다시 인코딩
- **권장**: 인코딩 결과를 캐시하거나 useMemo로 최적화

#### [P-3] 불필요한 리렌더링 가능성 (LOW)
- **위치**: `FigmaMcpPanel.tsx:24-30`
- 7개의 `useAtom` 호출로 atom 하나가 변경되어도 전체 컴포넌트 리렌더링
- **권장**: `useAtomValue`/`useSetAtom` 분리로 구독 최소화

---

## 6. Testing & Quality Assurance

### 6.1 Test Coverage

| 항목 | 현재 상태 | 권장 기준 |
|------|----------|----------|
| Coverage Threshold | 70% branches, 80% lines/functions/statements | 상용: 80%+ branches |
| Unit Tests | 12개 테스트 파일 | Good |
| E2E Tests | 4개 테스트 파일 (a11y, mcp, generation, example) | Good |
| a11y Tests | Axe-core 통합 | Excellent |

### 6.2 Testing Gaps

#### [T-1] App.tsx (ViewPage 포함) 테스트 미존재 (HIGH)
- 메인 레이아웃 컴포넌트에 대한 단위 테스트 없음
- 탭 전환, Toast 팝업, 생성 상태 연동 등 핵심 UX 플로우 미검증

#### [T-2] ErrorBoundary 테스트 미존재 (MEDIUM)
- 에러 경계 동작 검증 없음

#### [T-3] useApiKeyEncryption 훅 테스트 미존재 (HIGH)
- 보안 핵심 기능(암호화/복호화, PIN 잠금/해제, lockout)에 대한 단위 테스트 없음

#### [T-4] 통합 테스트 부재 (MEDIUM)
- 컴포넌트 간 상호작용 테스트 부족 (예: API Key 입력 → 모델 로드 → MCP 연결 → 생성 플로우)

---

## 7. Production Deployment Readiness

### 7.1 Deployment Checklist

| 항목 | 상태 | 상세 |
|------|------|------|
| **빌드 프로세스** | Good | Webpack 프로덕션 빌드, contenthash, CSS 추출 |
| **환경 변수 관리** | Fair | `.env.example` 존재하지만 dotenv 로더 미사용 |
| **보안 헤더** | Good | CSP, HSTS, X-Frame-Options 등 적용 |
| **에러 모니터링** | Fair | localStorage 기반 에러 로그만 존재, Sentry 미연동 |
| **로깅/관측성** | Poor | console.log/error만 사용, 구조화된 로깅 시스템 없음 |
| **성능 모니터링** | Poor | Web Vitals, APM 도구 미적용 |
| **SPA 라우팅** | Good | `_redirects` 파일로 SPA fallback 처리 |
| **캐싱 전략** | Fair | contenthash 기반 장기 캐싱, 서버 측 캐시 헤더 미설정 |
| **가용성** | N/A | 정적 사이트 배포 (Netlify/Cloudflare) |
| **CDN 최적화** | Fair | Cloudflare/Netlify 자동 CDN, Gzip 미확인 |
| **Rate Limiting** | Poor | API 키를 사용한 외부 API 호출에 대한 클라이언트 측 rate limiting 없음 |
| **백업/복구** | N/A | 정적 사이트 — Git 기반 복구 |
| **문서화** | Fair | README 존재, API 문서/운영 가이드 부재 |
| **라이선스 관리** | Poor | 오픈소스 의존성 라이선스 감사 미수행 |
| **번들 분석** | Poor | Bundle Analyzer 미적용 |

### 7.2 Production Blockers (배포 전 필수 해결)

1. **[PB-1] CSP 헤더의 localhost 주소**: 프로덕션 도메인으로 교체 필요
2. **[PB-2] Sentry 또는 유사 에러 모니터링 서비스 연동 필수**: localStorage 기반 에러 로깅은 상용 운영에 부적합
3. **[PB-3] API Key 보안 강화**: Debug 로그 내 API Key 부분 노출 제거
4. **[PB-4] 환경별 설정 분리**: 개발/스테이징/프로덕션 환경 분리 미흡

### 7.3 Production Recommendations (권장 사항)

1. **Web Vitals 측정**: `web-vitals` 패키지 추가로 Core Web Vitals 추적
2. **Bundle Analyzer**: `webpack-bundle-analyzer`로 번들 크기 최적화 포인트 파악
3. **Compression**: Brotli/Gzip 적용 확인
4. **Service Worker**: PWA 지원으로 오프라인 접근성 향상 (선택사항)
5. **Feature Flags**: 환경 변수 기반 기능 플래그 시스템 도입 검토
6. **API Key 프록시 전환**: 클라이언트에서 직접 Gemini API 호출 대신 서버 프록시를 통한 호출로 전환하여 API Key 노출 원천 차단

---

## 8. Accessibility (a11y)

### 8.1 Strengths

| 항목 | 구현 상태 |
|------|----------|
| ARIA 역할 (role="tablist", "tab", "tabpanel") | Good |
| aria-selected, aria-controls, aria-labelledby | Good |
| aria-live="polite" | 상태 변경 알림에 적용 |
| aria-busy | 로딩 상태에 적용 |
| aria-label | 버튼, 입력 필드에 적용 |
| 키보드 네비게이션 | 탭 간 ArrowLeft/ArrowRight 지원 |
| ESLint jsx-a11y 플러그인 | 활성화 |
| Playwright Axe 테스트 | E2E에서 a11y 자동 검증 |

### 8.2 a11y Issues

#### [A11Y-1] 탭 키보드 네비게이션 - tabIndex 관리 부재 (MEDIUM)
- **위치**: `src/App.tsx:129-147`
- 비활성 탭에 `tabIndex={-1}` 미적용. 모든 탭이 Tab 키로 포커스 가능
- WAI-ARIA 탭 패턴에서는 활성 탭만 tabIndex={0}, 나머지는 tabIndex={-1} 권장

#### [A11Y-2] ErrorBoundary 하드코딩된 이중 언어 텍스트 (LOW)
- **위치**: `src/components/ErrorBoundary.tsx:33,39`
- `"Something went wrong. / 오류가 발생했습니다."` — 이중 언어 슬래시 구분은 스크린 리더에서 혼란 유발
- **권장**: i18n 적용 또는 `lang` 속성으로 언어 명시

#### [A11Y-3] focus-visible 스타일 미정의 (MEDIUM)
- SCSS 파일에서 `:focus-visible` 스타일이 정의되지 않음
- 키보드 사용자의 포커스 가시성 부족

---

## 9. Internationalization (i18n)

### 9.1 Current State

| 항목 | 상태 |
|------|------|
| 지원 언어 | 한국어 (ko), 영어 (en) |
| i18n 프레임워크 | i18next + react-i18next |
| 언어 감지 | i18next-browser-languagedetector |
| fallbackLng | 'ko' |
| XSS 방지 | escapeValue: true |
| 언어 전환 UI | 메뉴바 KR/EN 토글 |

### 9.2 i18n Issues

#### [I18N-1] 시스템 프롬프트, 프롬프트 인젝션 방어 텍스트가 i18n 미적용 (MEDIUM)
- `prompts.ts`, `usePromptBuilder.ts` 내 한국어 텍스트가 하드코딩 (H-1 분리 후 위치 변경)

#### [I18N-2] atoms.ts 모델 tier 설명이 한국어 하드코딩 (LOW)
- **위치**: `atoms.ts:9-12`
- `'최고 성능 — 복잡한 추론·코딩'` 등의 모델 설명이 한국어

#### [I18N-3] ErrorBoundary 텍스트 i18n 미적용 (LOW)
- 이중 언어 슬래시 패턴 사용

---

## 10. DevOps & CI/CD

### 10.1 Current Pipeline

```
Push/PR → Lint → Unit Test (coverage) → Build → E2E Test (Chromium)
```

### 10.2 Strengths
- GitHub Actions로 자동화된 품질 검사
- E2E 테스트가 품질 검사 통과 후에만 실행 (dependency chain)
- Coverage report 아티팩트 업로드
- Playwright report 아티팩트 업로드
- CI에서 E2E 재시도 (2회) 설정

### 10.3 Improvement Areas

#### [CI-1] Preview 배포 미구성 (MEDIUM)
- PR별 Preview URL이 없어 코드 리뷰 시 시각적 검증 어려움
- **권장**: Netlify/Cloudflare Pages Deploy Preview 설정

#### [CI-2] Dependency 보안 감사 미실행 (HIGH)
- `npm audit`가 CI 파이프라인에 포함되지 않음
- **권장**: `npm audit --audit-level=high` 스텝 추가

#### [CI-3] License 감사 미실행 (MEDIUM)
- **권장**: `license-checker` 등으로 의존성 라이선스 호환성 검증

#### [CI-4] Docker/컨테이너 빌드 미지원 (LOW)
- 컨테이너 기반 배포를 원할 경우 Dockerfile 필요

---

## 11. Scoring Summary

### 11.1 Category Scores (10점 만점)

| Category | Score | Weight | Weighted | 비고 |
|----------|-------|--------|----------|------|
| **Architecture & Design** | 7.5 / 10 | 15% | 1.13 | |
| **Code Quality** | ~~7.0~~ → **7.5 / 10** | 15% | **1.13** | H-1·H-3·H-4 해결 |
| **Security** | 8.0 / 10 | 20% | 1.60 | |
| **Performance** | 7.0 / 10 | 10% | 0.70 | |
| **Testing & QA** | 7.0 / 10 | 15% | 1.05 | |
| **Production Readiness** | 5.5 / 10 | 15% | 0.83 | |
| **Accessibility** | 7.5 / 10 | 5% | 0.38 | |
| **i18n** | 7.0 / 10 | 2.5% | 0.18 | |
| **DevOps & CI/CD** | 7.0 / 10 | 2.5% | 0.18 | |
| **Total (Weighted)** | | **100%** | ~~7.08~~ → **7.16 / 10** | |

### 11.2 Score Breakdown

#### Architecture & Design — 7.5/10
- (+) Module Federation, ErrorBoundary, Jotai atomic state, lazy loading
- (-) ViewPage 인라인 정의, 불필요한 컴포넌트 래핑 레이어, atoms 비대화

#### Code Quality — ~~7.0~~ → 7.5/10 (`7f096d9` 반영)
- (+) TypeScript strict mode, type guard 패턴 활용, 일관된 네이밍
- (+) useAgentSubmit 분리 완료 (SRP 적용), 매직 넘버 상수화, 에러 처리 통일
- (-) MCP 데이터 편집기 미분리, atoms.ts 비대화 잔여

#### Security — 8.0/10
- (+) AES-GCM + PBKDF2 310K iterations, CSP, HSTS, PIN lockout, Session Timeout
- (-) AI 생성 HTML 스크립트 실행, 디버그 로그 민감 데이터, CSP localhost

#### Performance — 7.0/10
- (+) Code splitting, contenthash, MiniCssExtract, visibility 기반 폴링 제어
- (-) 폴링 기반 상태 확인, 대용량 데이터 중복 인코딩, 리렌더링 최적화 부족

#### Testing & QA — 7.0/10
- (+) Jest + Playwright, 80% coverage threshold, Axe a11y 테스트
- (-) App.tsx 미테스트, useApiKeyEncryption 미테스트, 통합 테스트 부재

#### Production Readiness — 5.5/10
- (+) 빌드 프로세스, SPA 라우팅, 보안 헤더
- (-) Sentry 미연동, Web Vitals 미측정, 환경 분리 미흡, 라이선스 감사 없음, 번들 분석 없음

#### Accessibility — 7.5/10
- (+) ARIA 역할/속성 적용, 키보드 네비게이션, Axe 자동 테스트
- (-) tabIndex 관리 부재, focus-visible 미정의

#### i18n — 7.0/10
- (+) i18next 완전 통합, 언어 감지, XSS 방지
- (-) 시스템 프롬프트/에러 메시지 하드코딩, 모델 설명 한국어 고정

#### DevOps & CI/CD — 7.0/10
- (+) 자동화된 Lint/Test/Build/E2E 파이프라인
- (-) Preview 배포 미구성, npm audit 미실행, 라이선스 감사 없음

---

### 11.3 Priority Action Items (우선순위별 액션 아이템)

#### Tier 1 — 배포 전 필수 (Production Blockers)
1. CSP 헤더에서 localhost 주소를 프로덕션 도메인으로 교체
2. Sentry 또는 에러 모니터링 서비스 연동
3. Debug 로그 내 API Key 마스킹 강화
4. 환경별 설정(dev/staging/prod) 분리 체계 구축

#### Tier 2 — 높은 우선순위 (1~2 Sprint 내)
5. ~~`useAgentSubmit` 훅 분리 리팩토링~~ ✅ DONE (`7f096d9`, H-1)
6. `useApiKeyEncryption` 단위 테스트 작성
7. App.tsx (ViewPage, 탭 네비게이션) 단위 테스트 작성
8. npm audit를 CI 파이프라인에 추가
9. AI 생성 HTML의 스크립트 실행 정책 토글 추가

#### Tier 3 — 중간 우선순위 (2~4 Sprint 내)
10. ~~매직 넘버를 명명된 상수로 통합~~ ✅ DONE (`7f096d9`, H-3)
11. atoms.ts 도메인별 분리
12. 사용되지 않는 SCSS 클래스 정리
13. focus-visible 스타일 정의
14. 시스템 프롬프트 다국어 지원 또는 영어 통일
15. Bundle Analyzer 적용 및 최적화

#### Tier 4 — 낮은 우선순위 (백로그)
16. ViewPage 컴포넌트 분리
17. FigmaAgent/ControlLayer 레이어 단순화
18. WebSocket 기반 상태 확인으로 전환
19. API Key 서버 프록시 전환
20. 라이선스 감사 도구 도입

---

> **Overall Assessment**: iFigmaLab은 견고한 기술 기반 위에 잘 구조화된 프로젝트입니다. 보안, 접근성, 국제화 등 전문적인 기능이 이미 구현되어 있으며, 이전 코드 리뷰 결과가 지속적으로 반영되고 있는 점이 긍정적입니다. 커밋 `7f096d9`에서 H-1~H-4(훅 분리·컴포넌트 관심사 분리·매직 넘버 상수화·에러 처리 통일)가 완료되어 Code Quality 점수가 7.0 → 7.5로 상향되었습니다. 가중 평균 점수 **7.16/10** (이전 7.08)은 "상용 배포 직전 단계"로, 남은 Tier 1 항목(CSP 프로덕션 설정, Sentry 연동, 환경 분리) 해결 후 MVP 배포가 가능한 수준입니다.
