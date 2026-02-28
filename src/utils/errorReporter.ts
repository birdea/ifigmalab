/**
 * 경량 에러 리포터 — 프로덕션 장애를 localStorage에 지속 기록하여
 * 사용자가 이슈 리포트 시 붙여넣을 수 있도록 한다.
 *
 * Sentry 통합:
 *   1. npm install @sentry/react
 *   2. 환경 변수 SENTRY_DSN 설정
 *   3. initSentry() 호출부의 주석 해제
 */

const MAX_ERRORS = 50;
const ERROR_STORAGE_KEY = 'ifigmalab_error_log';

interface ErrorEntry {
    timestamp: string;
    type: string;
    message: string;
    stack?: string;
}

function getErrorLog(): ErrorEntry[] {
    try {
        return JSON.parse(localStorage.getItem(ERROR_STORAGE_KEY) ?? '[]');
    } catch {
        return [];
    }
}

function persistError(type: string, error: unknown): void {
    const entry: ErrorEntry = {
        timestamp: new Date().toISOString(),
        type,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
    };
    try {
        const log = getErrorLog();
        log.push(entry);
        if (log.length > MAX_ERRORS) log.splice(0, log.length - MAX_ERRORS);
        localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(log));
    } catch {
        // localStorage 용량 초과 등 무시
    }
}

export function reportError(type: string, error: unknown): void {
    persistError(type, error);
    // TODO: Sentry 연동 시 아래 주석 해제
    // Sentry.captureException(error, { tags: { type } });
}

export function getErrorReport(): string {
    return JSON.stringify(getErrorLog(), null, 2);
}

export function clearErrorLog(): void {
    localStorage.removeItem(ERROR_STORAGE_KEY);
}
