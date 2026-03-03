# iFigmaLab: Remote MCP 전환 개발 계획

## 1. 배경 및 의사결정

### 1.1 현재 아키텍처 (AS-IS)

```
Figma Desktop App (MCP Server :3845)
        ↕ SSE (MCP Protocol)
Proxy Server (:3006, Express/Node.js)     ← @modelcontextprotocol/sdk SSEClientTransport
        ↕ HTTP/JSON (CORS bridge)
iFigmaLab Frontend (:3005, React)         ← Browser fetch
        ↕ HTTPS (직접 호출)
Google Gemini API
```

- Browser → localhost:3845 직접 접근 불가 (CORS, Private Network Access 제약)
- 별도 Express proxy server가 CORS 브릿지 + MCP Client 역할 수행
- Production(HTTPS) 환경에서는 proxy로도 Mixed Content 문제 해결 불가

### 1.2 변경 아키텍처 (TO-BE)

```
iFigmaLab Frontend (React SPA, Cloudflare Pages)
        ↕ HTTPS
Cloudflare Workers (경량 서버리스 함수)
        ├─ /api/figma/oauth/token    → Figma OAuth 토큰 교환 (client_secret 보관)
        ├─ /api/figma/mcp/*          → mcp.figma.com 프록시 (CORS 우회)
        ↕
Figma Remote MCP Server (https://mcp.figma.com/mcp)
        ↕
iFigmaLab Frontend
        ↕ HTTPS (직접 호출, 기존과 동일)
Google Gemini API
```

- Express proxy server 삭제 → Cloudflare Workers로 대체 (경량 서버리스)
- Cloudflare Workers 역할 2가지:
  1. **OAuth 토큰 교환**: Figma OAuth에 client_secret이 필수이므로 서버사이드 처리
  2. **MCP 프록시**: mcp.figma.com이 Browser CORS를 허용하지 않으므로 서버사이드 경유
- 사용자가 별도 서버를 실행할 필요 없음 (Cloudflare Pages + Workers 자동 배포)
- Gemini API 호출은 기존과 동일하게 Browser에서 직접 수행

### 1.3 결정 사항

| 항목 | 결정 |
|------|------|
| Desktop MCP 지원 | **제거** (Remote MCP로 완전 전환) |
| 기존 proxy 코드 | **완전 삭제** (server/ 디렉토리 전체) |
| 배포 환경 | Cloudflare Pages |
| Figma OAuth App | 신규 등록 필요 (Figma Developer Console) |

---

## 2. 삭제 대상 (기존 코드)

### 2.1 파일/디렉토리 삭제

```
server/                         ← 디렉토리 전체 삭제
├── index.ts                    Express proxy server
├── figma.ts                    SSE 기반 MCP Client
└── gemini.ts                   서버사이드 Gemini 래퍼

scripts/dev.js                  ← proxy 프로세스 기동 로직 포함, 재작성 또는 삭제
tsconfig.server.json            ← server 전용 TypeScript 설정 삭제
```

### 2.2 package.json에서 제거할 의존성

```json
// dependencies
"cors": "^2.8.5",
"express": "^4.18.3",

// devDependencies
"@types/cors": "^2.8.17",
"@types/express": "^4.17.21",
"tsx": "^4.0.0"
```

### 2.3 package.json에서 제거할 scripts

```json
"server": "tsx watch server/index.ts"
```

### 2.4 Atoms 제거 (src/components/FigmaAgent/atoms.ts)

```typescript
// 삭제 대상
proxyServerUrlAtom        // proxy server URL
figmaMcpServerUrlAtom     // Desktop MCP server URL
```

### 2.5 FigmaMcpPanel.tsx에서 제거할 UI/로직

- Proxy Server URL 입력 영역 + Apply/Auto-detect 버튼
- Proxy 미연결 시 가이드 UI (npx 명령어, 스크립트 다운로드)
- Figma MCP Server URL 입력 영역
- 10초 간격 proxy 폴링 로직 (checkStatus, useEffect polling)
- proxy/MCP 연결 상태 표시 (proxyReachable, connected)

### 2.6 webpack.config.js에서 제거할 환경변수

```javascript
'process.env.PROXY_URL': ...
'process.env.FIGMA_MCP_URL': ...
```

---

## 3. 신규 추가 코드

### 3.1 Figma OAuth 인증

#### 3.1.1 사전 준비: Figma Developer Console에서 OAuth App 등록

- https://www.figma.com/developers/apps 에서 앱 생성
- Redirect URI 설정:
  - 개발: `http://localhost:3005/oauth/callback`
  - 프로덕션: `https://<project>.pages.dev/oauth/callback`
- 필요한 scopes: `files:read` (디자인 컨텍스트, 스크린샷 접근)
- Client ID를 환경변수로 관리: `FIGMA_OAUTH_CLIENT_ID`

#### 3.1.2 신규 파일: `src/services/figmaOAuth.ts`

OAuth 2.0 PKCE 플로우 구현 (토큰 교환은 Workers 경유):

```
[Browser]                              [Workers]                    [Figma]
1. generateCodeVerifier()
   generateCodeChallenge(verifier)
2. buildAuthUrl(clientId, redirectUri,
   codeChallenge, state)
   → window.open(figmaOAuthUrl)     ──────────────────────────→  인가 페이지
3.                                  ←─────────────────────────  redirect + code
4. POST /api/figma/oauth/token      →  code + client_secret   →  토큰 교환
   { code, codeVerifier }           ←  access_token            ←  응답
5. 저장: figmaAccessTokenAtom
```

**핵심**: Figma OAuth는 `client_secret` 필수 (PKCE만으로 불충분).
따라서 토큰 교환(step 4)은 반드시 Workers 서버사이드에서 처리.

#### 3.1.3 신규 파일: `src/hooks/useFigmaAuth.ts`

```typescript
// 제공할 인터페이스
{
  isAuthenticated: boolean;       // OAuth 토큰 유효 여부
  userInfo: { email, name } | null;  // whoami 결과
  login: () => void;              // OAuth 플로우 시작
  logout: () => void;             // 토큰 삭제
  accessToken: string;            // MCP 호출 시 사용
}
```

#### 3.1.4 신규 Atoms (atoms.ts에 추가)

```typescript
// Figma OAuth
export const figmaAccessTokenAtom = atomWithStorage<string>('figmaAccessToken', '');
export const figmaRefreshTokenAtom = atomWithStorage<string>('figmaRefreshToken', '');
export const figmaUserInfoAtom = atom<{ email: string; name: string } | null>(null);
```

### 3.2 Cloudflare Workers (MCP 프록시 + OAuth 토큰 교환)

#### 3.2.1 Workers 프로젝트 구조

```
workers/
├── wrangler.toml              ← Cloudflare Workers 설정
├── package.json               ← @modelcontextprotocol/sdk, 의존성
├── src/
│   ├── index.ts               ← 라우팅 (Hono 또는 itty-router)
│   ├── routes/
│   │   ├── oauth.ts           ← /api/figma/oauth/* 핸들러
│   │   └── mcp.ts             ← /api/figma/mcp/* 핸들러
│   └── lib/
│       └── mcpClient.ts       ← MCP Client (공식 SDK 사용, Workers는 Node.js 호환)
└── tsconfig.json
```

#### 3.2.2 MCP Client (Workers에서 실행)

```typescript
// workers/src/lib/mcpClient.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const FIGMA_MCP_ENDPOINT = 'https://mcp.figma.com/mcp';

export async function callFigmaTool(
  toolName: string,
  args: Record<string, unknown>,
  accessToken: string
) {
  const transport = new StreamableHTTPClientTransport(
    new URL(FIGMA_MCP_ENDPOINT),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const client = new Client(
    { name: 'ifigmalab', version: '1.0.0' },
    { capabilities: {} }
  );
  await client.connect(transport);
  try {
    return await client.callTool({ name: toolName, arguments: args });
  } finally {
    await client.close();
  }
}
```

Workers는 Node.js 호환 런타임이므로 공식 SDK 사용 가능.
(참고: Browser에서 직접 사용하려면 `mcp-anywhere` fork 필요하지만, Workers 경유이므로 불필요)

#### 3.2.3 Frontend에서 Workers 호출

```typescript
// src/services/figmaApi.ts — Browser에서 Workers 엔드포인트 호출
const WORKERS_API = process.env.WORKERS_API_URL || 'http://localhost:8787';

export async function fetchDesignContext(figmaUrl: string, accessToken: string) {
  const res = await fetch(`${WORKERS_API}/api/figma/mcp/context`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ figmaUrl }),
  });
  return res.json();
}

export async function fetchScreenshot(figmaUrl: string, accessToken: string) {
  const res = await fetch(`${WORKERS_API}/api/figma/mcp/screenshot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ figmaUrl }),
  });
  return res.json();
}
```

### 3.3 입력 방식 변경: Node ID → Figma URL

#### 3.3.1 figmaNodeUtils.ts 변경

```typescript
// 기존: parseNodeId(raw) → nodeId (콜론 구분)
// 변경: parseFigmaUrl(raw) → { fileKey, nodeId } | Figma URL 유효성 검증

export interface FigmaUrlParts {
  fullUrl: string;
  fileKey: string;
  nodeId: string;    // 콜론 구분 (22041:216444)
}

export function parseFigmaUrl(raw: string): FigmaUrlParts | null {
  // Figma URL에서 fileKey와 node-id 추출
  // 형식: https://www.figma.com/design/{fileKey}/{fileName}?node-id={nodeId}
  const match = raw.match(/https?:\/\/(?:www\.)?figma\.com\/design\/([^/]+)\/[^?]*\?.*node-id=([^&]+)/);
  if (!match) return null;
  return {
    fullUrl: match[0],
    fileKey: match[1],
    nodeId: match[2].replace(/-/g, ':'),
  };
}
```

#### 3.3.2 Atoms 변경

```typescript
// 기존
export const figmaNodeIdAtom = atom<string>('');

// 변경 — Figma URL 전체를 저장
export const figmaUrlAtom = atom<string>('');
```

### 3.4 FigmaMcpPanel.tsx 재작성

패널의 구조가 대폭 단순화됨:

```
[변경 후 MCP 패널 구조]

┌──────────────────────────────────────────┐
│ Figma Connection                         │
│                                          │
│ [🔗 Sign in with Figma]                 │  ← OAuth 로그인 버튼
│  ✓ user@email.com 연결됨                 │  ← 인증 상태 표시
│                                          │
│ Figma URL                                │
│ [https://figma.com/design/...?node-id=..]│  ← Figma URL 붙여넣기
│                                          │
│ [Fetch Context] [📸 Screenshot]          │  ← 기존과 동일한 액션 버튼
│                                          │
└──────────────────────────────────────────┘
```

#### 데이터 흐름:

```
1. 사용자가 "Sign in with Figma" 클릭 → OAuth 팝업 → accessToken 획득
2. 사용자가 Figma Desktop/Web에서 레이어 우클릭 → "Copy link to selection"
3. URL 붙여넣기: https://figma.com/design/ABC123/MyFile?node-id=22041-216444
4. "Fetch Context" 클릭:
   → parseFigmaUrl(url) → { fileKey: 'ABC123', nodeId: '22041:216444' }
   → callFigmaTool('get_design_context', { nodeId, fileKey }, accessToken)
   → 결과를 mcpDataAtom에 저장
5. "Screenshot" 클릭:
   → callFigmaTool('get_screenshot', { nodeId, fileKey }, accessToken)
   → 결과를 screenshotAtom에 저장
```

### 3.5 webpack.config.js 변경

```javascript
// 추가할 환경변수
'process.env.FIGMA_OAUTH_CLIENT_ID': JSON.stringify(process.env.FIGMA_OAUTH_CLIENT_ID || ''),
'process.env.FIGMA_OAUTH_REDIRECT_URI': JSON.stringify(process.env.FIGMA_OAUTH_REDIRECT_URI || ''),
```

### 3.6 scripts/dev.js 단순화

proxy 프로세스 기동이 불필요하므로 단순 webpack-dev-server 실행으로 변경:

```javascript
// 변경 후: webpack serve만 실행
// 또는 dev script를 직접 변경:
"dev": "webpack serve --mode development"
```

port auto-detection 등 유용한 로직이 있다면 frontend 전용으로 유지.

---

## 4. 변경되지 않는 코드 (유지)

다음 파일/모듈은 변경 없이 유지:

| 파일 | 사유 |
|------|------|
| `src/components/FigmaAgent/hooks/useGeminiApi.ts` | Gemini API 호출은 기존과 동일 |
| `src/components/FigmaAgent/hooks/usePromptBuilder.ts` | 프롬프트 빌드 로직 동일 |
| `src/components/FigmaAgent/hooks/useAgentSubmit.ts` | 오케스트레이션 로직 동일 |
| `src/components/FigmaAgent/ControlLayer/AgentSetupPanel.tsx` | Gemini API Key 관리 동일 |
| `src/components/FigmaAgent/ControlLayer/InputPanel.tsx` | 프롬프트 입력 동일 |
| `src/components/FigmaAgent/ControlLayer/DebugLogPanel.tsx` | 디버그 로그 동일 |
| `src/components/FigmaAgent/utils.ts` | HTML 추출 등 유틸리티 동일 |
| `src/config/prompts.ts` | 시스템 프롬프트 동일 |
| `src/utils/crypto.ts` | API Key 암호화 동일 |
| `src/App.tsx` | 탭 레이아웃, ViewPage 등 동일 |

---

## 5. 작업 순서 (Implementation Steps)

### Phase 1: 기존 코드 정리

1. `server/` 디렉토리 전체 삭제
2. `tsconfig.server.json` 삭제
3. `scripts/dev.js` 단순화 (proxy 기동 제거, frontend만 기동)
4. `package.json`에서 불필요한 의존성 및 scripts 제거
   - dependencies: `cors`, `express`, `@modelcontextprotocol/sdk` 제거
   - devDependencies: `@types/cors`, `@types/express`, `tsx` 제거
   - scripts: `server` 제거, `dev` 수정
5. `webpack.config.js`에서 proxy 관련 환경변수 제거 (`PROXY_URL`, `FIGMA_MCP_URL`)
6. `atoms.ts`에서 `proxyServerUrlAtom`, `figmaMcpServerUrlAtom` 제거
7. `FigmaMcpPanel.tsx`에서 proxy/Desktop MCP 관련 UI 및 로직 전체 제거

### Phase 2: Cloudflare Workers 구성

Figma OAuth + MCP 프록시 역할을 담당하는 서버리스 함수 구현.

1. Cloudflare Workers 프로젝트 생성 (`workers/` 디렉토리 또는 별도 repo)
   - Wrangler CLI 설정 (`wrangler.toml`)
   - `@modelcontextprotocol/sdk` 설치 (Workers는 Node.js 호환 런타임)
2. OAuth 토큰 교환 엔드포인트 구현
   - `POST /api/figma/oauth/token` — authorization code → access_token 교환
   - `POST /api/figma/oauth/refresh` — refresh_token → 새 access_token
   - `FIGMA_CLIENT_SECRET`을 Workers Secret으로 등록
3. MCP 프록시 엔드포인트 구현
   - `GET  /api/figma/mcp/status` — whoami (연결 확인)
   - `POST /api/figma/mcp/context` — get_design_context 호출
   - `POST /api/figma/mcp/screenshot` — get_screenshot 호출
   - OAuth access_token을 Authorization header로 전달받아 mcp.figma.com에 중계
4. CORS 설정 (Cloudflare Pages 도메인 허용)
5. 로컬 개발용 `wrangler dev` 연동

### Phase 3: Figma OAuth 구현 (Frontend)

1. Figma Developer Console에서 OAuth App 등록
   - Client ID, Client Secret 획득
   - Redirect URI 등록: `http://localhost:3005/oauth/callback`, `https://<project>.pages.dev/oauth/callback`
   - Scope: `files:read`
2. `src/services/figmaOAuth.ts` 작성
   - PKCE 생성 (code_verifier, code_challenge)
   - 인가 URL 빌드 → Figma OAuth 페이지로 리다이렉트 또는 팝업
   - Callback에서 authorization code 수신
   - Workers 경유 토큰 교환 (`/api/figma/oauth/token`)
   - Token 갱신 로직 (`/api/figma/oauth/refresh`)
3. `src/hooks/useFigmaAuth.ts` 작성
   - `isAuthenticated`, `userInfo`, `login()`, `logout()`, `accessToken` 제공
4. `atoms.ts`에 OAuth 관련 atoms 추가
   - `figmaAccessTokenAtom`, `figmaRefreshTokenAtom`, `figmaUserInfoAtom`
5. OAuth callback 처리 (popup redirect 수신 → token 저장)

### Phase 4: UI 전환

1. `figmaNodeUtils.ts` → `parseFigmaUrl()` 로 변경 (Figma URL에서 fileKey + nodeId 추출)
2. `atoms.ts`에서 `figmaNodeIdAtom` → `figmaUrlAtom` 변경
3. `FigmaMcpPanel.tsx` 재작성:
   - OAuth 로그인 버튼 + 인증 상태 표시
   - Figma URL 입력 필드 (Node ID 입력 대체)
   - Fetch Context / Screenshot 버튼 (Workers 엔드포인트 호출)
4. i18n 번역 키 업데이트 (ko.json, en.json)
5. `webpack.config.js`에 환경변수 추가 (`FIGMA_OAUTH_CLIENT_ID`, `FIGMA_OAUTH_REDIRECT_URI`, `WORKERS_API_URL`)

### Phase 5: 통합 테스트 및 배포

1. 로컬 개발 환경에서 E2E 테스트 (wrangler dev + webpack serve)
2. Cloudflare Pages 배포 설정
   - 환경변수: `FIGMA_OAUTH_CLIENT_ID`, `WORKERS_API_URL`
3. Cloudflare Workers 배포
   - Secrets: `FIGMA_CLIENT_ID`, `FIGMA_CLIENT_SECRET`
4. OAuth redirect URI 프로덕션 URL 등록 확인
5. Remote MCP Tool 파라미터 스키마 검증 (`client.listTools()` 호출하여 확인)

---

## 6. 리스크 검토 결과 (2026-03-04 완료)

### 6.1 MCP SDK Browser 호환성 — ⚠️ 공식 SDK 미지원, 대안 있음

**검증 결과**: 공식 `@modelcontextprotocol/sdk`는 **Node.js 전용**.
`StreamableHTTPClientTransport`가 `node:crypto`, `IncomingMessage` 등 Node.js API에 의존.

**대안 (택 1)**:
- **Option A**: [`mcp-anywhere`](https://github.com/fractal-mcp/mcp-anywhere) 사용
  - 공식 SDK의 browser-compatible fork
  - `node:crypto` → `globalThis.crypto`, `raw-body` → `request.text()` 등 Web API로 대체
  - API 호환성 100% 유지, drop-in replacement
- **Option B**: `fetch()` + `EventSource`로 MCP Streamable HTTP 프로토콜 직접 구현
  - SDK 의존 없이 경량 구현 가능
  - MCP 프로토콜 스펙 직접 구현해야 하므로 작업량 증가

**결정**: Cloudflare Workers에서 MCP 호출을 처리하므로 (6.4 CORS 이슈),
Workers는 Node.js 호환 런타임 → **공식 SDK 사용 가능**. Browser에서 MCP 직접 호출 불필요.

### 6.2 Figma OAuth — ⛔ client_secret 필수, SPA 단독 불가

**검증 결과**:
- Figma OAuth는 **PKCE를 지원** (`code_challenge` + `code_challenge_method=S256`)
- 그러나 토큰 교환 시 **`client_secret`이 반드시 필요** (HTTP Basic Auth로 전달)
- Authorization code는 **30초 내 만료** → 즉시 교환 필요

**Figma OAuth Endpoints**:
| 단계 | URL | 필수 파라미터 |
|------|-----|--------------|
| 인가 요청 | `https://www.figma.com/oauth` | `client_id`, `redirect_uri`, `scope`, `state`, `code_challenge`, `code_challenge_method` |
| 토큰 교환 | `https://api.figma.com/v1/oauth/token` | `client_id`, **`client_secret`** (Basic Auth), `code`, `redirect_uri`, `code_verifier` |

**결정**: Cloudflare Workers에 `/api/figma/oauth/token` 엔드포인트 구성.
- `client_secret`은 Workers 환경변수(Secret)로 안전하게 보관
- Browser → Workers → Figma API 토큰 교환
- PKCE도 함께 사용하여 이중 보안

### 6.3 Remote MCP Tool Parameters — ℹ️ 연동 시 검증 필요

Remote MCP의 `get_design_context`, `get_screenshot` 도구의 정확한 파라미터 스키마가
공식 문서에 명시되어 있지 않음. 실제 연동 시 `client.listTools()`로 스키마 확인 필요.

현재까지 파악된 정보:
- Remote MCP는 Figma URL에서 추출한 `fileKey`와 `nodeId`를 사용
- Desktop MCP는 `nodeId`만 사용 (열린 파일 자동 인식)
- 정확한 파라미터명은 연동 시 검증 필요

### 6.4 mcp.figma.com CORS — ⛔ Browser 직접 호출 불가

**검증 결과**:
- mcp.figma.com은 **CORS 허용 증거 없음**
- 공식 문서에 Browser 사용 사례 없음, 지원 클라이언트는 IDE/CLI만 명시
  (VS Code, Cursor, Claude Code, Codex 등)
- MCP 프로토콜 자체가 AI agent/IDE 도구용으로 설계됨

**결정**: Cloudflare Workers에 `/api/figma/mcp/*` 프록시 엔드포인트 구성.
- Workers에서 `@modelcontextprotocol/sdk` 사용하여 mcp.figma.com에 접속
- Browser는 Workers 엔드포인트만 호출 (same-origin 또는 CORS 허용)

### 6.5 종합: Cloudflare Workers 필수 구성

리스크 6.2와 6.4로 인해 Cloudflare Workers 엔드포인트가 필수:

```
Cloudflare Workers (/api/figma/*)
├── POST /api/figma/oauth/token     → Figma 토큰 교환 (client_secret 사용)
├── POST /api/figma/oauth/refresh   → Figma 토큰 갱신
├── GET  /api/figma/mcp/status      → MCP 연결 상태 (whoami)
├── POST /api/figma/mcp/context     → get_design_context 호출
└── POST /api/figma/mcp/screenshot  → get_screenshot 호출
```

이는 기존 Express proxy와 비교하여:
- 사용자가 별도 서버를 실행할 필요 없음 (Cloudflare 자동 배포)
- client_secret이 서버에 안전하게 보관됨
- CORS 문제 원천 해결 (same-origin 또는 Workers CORS 설정)
- Cold start ~0ms (Cloudflare edge)

---

## 7. 참고 자료

- [Figma Remote MCP Server 설치](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)
- [Figma MCP Tools and Prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)
- [Figma MCP Server Guide (GitHub)](https://github.com/figma/mcp-server-guide/)
- [Figma MCP Introduction](https://developers.figma.com/docs/figma-mcp-server/)
- [MCP Streamable HTTP Transport Spec](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http)
