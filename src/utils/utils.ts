/**
 * 바이트 단위를 읽기 쉬운 문자열로 변환합니다.
 */
export function formatBytes(n: number): string {
    if (n === 0) return '';
    if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
    if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${n} bytes`;
}

export const TEXT_ENCODER = new TextEncoder();
