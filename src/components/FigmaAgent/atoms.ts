import { atom } from 'jotai';

// 동적 로딩을 지원하기 위해 string으로 변경
export type GeminiModel = string;

export interface GeminiModelEntry { id: string; label: string; tier: string }

export const GEMINI_MODELS_DEFAULT: GeminiModelEntry[] = [
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tier: '최고 성능 — 복잡한 추론·코딩' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tier: '기본값 — 속도·비용 균형' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', tier: '저비용·저지연' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', tier: '안정' },
];

// 하위 호환 alias
export const GEMINI_MODELS = GEMINI_MODELS_DEFAULT;

export const DEFAULT_MODEL: GeminiModel = 'gemini-2.5-flash';

// API 키 — sessionStorage 연동은 컴포넌트에서 처리
export const apiKeyAtom = atom<string>('');

// 선택된 모델
export const selectedModelAtom = atom<GeminiModel>(DEFAULT_MODEL);

// 동적으로 가져온 모델 목록 (기본값은 하드코딩된 목록)
export const geminiModelsAtom = atom<GeminiModelEntry[]>(GEMINI_MODELS_DEFAULT);

// Figma MCP proxy server URL
export const proxyServerUrlAtom = atom<string>('http://localhost:3006');

// Figma Desktop App MCP server URL
export const figmaMcpServerUrlAtom = atom<string>('http://localhost:3845');

// Figma MCP Node ID
export const figmaNodeIdAtom = atom<string>('');

// Figma MCP 연결 상태
export const figmaConnectedAtom = atom<boolean>(false);

// MCP 데이터 입력
export const mcpDataAtom = atom<string>('');

// 추가 프롬프트
export const promptAtom = atom<string>('');

// 생성 상태
export type GenerateStatus = 'idle' | 'loading' | 'success' | 'error';
export const generateStatusAtom = atom<GenerateStatus>('idle');
export const generateErrorAtom = atom<string>('');

// 생성된 HTML
export const generatedHtmlAtom = atom<string>('');
export const rawResponseAtom = atom<string>('');

// 소스 코드 패널 표시 여부
export const showSourceAtom = atom<boolean>(false);

// Debug log
export const debugLogAtom = atom<string>('');

// 스크린샷 (base64 data + mimeType)
export const screenshotAtom = atom<string>('');
export const screenshotMimeTypeAtom = atom<string>('image/png');

// Model Info 조회 결과
export const modelInfoTextAtom = atom<string>('');
