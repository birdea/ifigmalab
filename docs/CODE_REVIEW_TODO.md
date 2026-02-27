# iFigmaLab - Code Review TODOs

> `docs/CODE_REVIEW.md`에 정리된 **부분 해결, 잔존 이슈 및 신규 발견 이슈**를 정리한 체크리스트입니다.

## Sprint 1 — 보안 강화 (Security)
- [x] **S-03**: iframe `allow-same-origin` 플래그 제거 (`App.tsx`)
- [x] **N-01**: PIN 기반 암호화의 키 파생 취약점 개선 (Web Crypto API, PBKDF2 적용) (`AgentSetupPanel.tsx`)
- [x] **N-06**: PIN 변경/초기화 UI 추가 (`AgentSetupPanel.tsx`)
- [x] **N-07**: 프로덕션 빌드 소스맵 미설정 개선 (`webpack.config.js`)

## Sprint 2 — 성능 및 안정성 (Performance)
- [x] **P-01**: 탭 전환 시 컴포넌트 언마운트/리마운트 방지 (CSS visibility 등 활용) (`App.tsx`)
- [x] **Q-05**: `useEffect` 의존성 배열 누락 수정 (`AgentSetupPanel.tsx`, `FigmaMcpPanel.tsx`)
- [x] **N-05**: 연결 확인 폴링 전략 최적화 (지수 백오프 적용) (`FigmaMcpPanel.tsx`)
- [x] **P-02**: 사이드바 리사이즈 중 전체 리렌더링 방지 (CSS 변수 직접 조작) (`App.tsx`)
- [x] **N-04**: `parseNodeId` 렌더링마다 재계산 방지 (`useMemo` 적용) (`FigmaMcpPanel.tsx`)
- [x] **P-03**: `byteSize` 렌더링마다 재계산 방지 (`useMemo` 적용) (`InputPanel.tsx`)

## Sprint 3 — 아키텍처 및 코드 품질 (Architecture & Code Quality)
- [x] **A-02**: `InputPanel` God Component 책임 분리 (`hooks/` 분리) (`InputPanel.tsx`)
- [x] **Q-02**: `handleFetch`와 `handleFetchScreenshot` 중복 패턴 공통화 (`FigmaMcpPanel.tsx`)
- [x] **A-05**: 미기능 사이드바 플레이스홀더 제거 혹은 Feature Flag 처리 (`App.tsx`)
- [x] **A-06**: 미사용 로우/공통 의존성 `react-router-dom` 제거 (`package.json`, `webpack.config.js`)
- [x] **N-03**: Provider 이중 래핑(Redundant Provider) 최적화 (`App.tsx`, `FigmaAgent/index.tsx`)
- [x] **Q-08**: 런타임 타입 파싱/타입 가드 추가 (`FigmaMcpPanel.tsx`, `AgentSetupPanel.tsx`)
- [x] **N-09**: 환경 변수 하드코딩 교체 (로컬 기본값 및 닷엔브 주입) (`atoms.ts` 등)
- [x] **Q-09**: 매직 넘버 상수화 (사이드바 너비, 토큰 수 등) (`App.tsx`, `InputPanel.tsx`)
- [x] **N-08**: `declarations.d.ts` 내 SCSS 타입 `any` 처리 개선

## Sprint 4 — 테스트 및 UX/접근성 (Testing & Accessibility)
- [ ] **T-01**: `FigmaMcpPanel` 등 통합 테스트 코드 추가 (`FigmaMcpPanel.test.tsx`)
- [ ] **T-01**: 네트워크 에러 등 실패 엣지 케이스 테스트 추가
- [ ] **N-10**: 접근성(a11y) 구조 개선 (`aria-live`, `role="separator"`, 포커스 트랩 구성) (`App.tsx`, `InputPanel.tsx`)
- [ ] **Q-10**: UI 문자열 언어 혼재(한국어/영어 일관성 부족) 통일 및 개선 체계 마련
- [ ] **N-02**: Prompt Injection 방어 부재 개선 (Gemini 파싱 프롬프트 방어/격리) (`InputPanel.tsx`)
