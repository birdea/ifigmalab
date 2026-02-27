/**
 * 앱 전체에서 사용하는 Storage 키 상수 (Q-19)
 * - 매직 스트링 중복 방지
 * - deprecated 키는 주석으로 명시하여 마이그레이션 추적 가능
 */
export const STORAGE_KEYS = {
    /** @deprecated 레거시 SessionStorage 평문 API 키 (하위 호환용, S-10) */
    API_KEY_SESSION_LEGACY: 'figma_agent_api_key',
    /** AES-GCM 암호화된 API 키 (현재 사용) */
    API_KEY_ENCRYPTED: 'figma_agent_api_key_enc',
    /** Gemini 모델 목록 캐시 (P-06) */
    GEMINI_MODELS_CACHE: 'gemini_models_cache',
} as const;
