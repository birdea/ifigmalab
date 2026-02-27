/** 
 * Gemini 응답 텍스트에서 순수 HTML 블록을 추출합니다.
 * 마크다운 코드 블록 양식이 존재할 경우 이를 제거합니다.
 */
export function extractHtml(raw: string): string {
    // ```html ... ``` 블록 파싱
    const fenced = raw.match(/```(?:html)?\s*\n?([\s\S]*?)```/);
    if (fenced) return fenced[1].trim();
    // 이미 HTML 태그로 시작하면 그대로 반환
    const trimmed = raw.trim();
    if (trimmed.startsWith('<!') || trimmed.startsWith('<html')) return trimmed;
    return trimmed;
}

/** 
 * MCP Data에서 불필요한 Figma 내부 data-* 속성을 제거하고 공백을 압축합니다.
 */
export function preprocessMcpData(raw: string): string {
    let result = raw
        .replace(/\s+data-node-id="[^"]*"/g, '')
        .replace(/\s+data-name="[^"]*"/g, '')
        .replace(/\s+data-figma-[^=]*="[^"]*"/g, '');
    result = result.split('\n').map(line => line.trimEnd()).join('\n');
    result = result.replace(/\n{3,}/g, '\n\n');
    return result.trim();
}

/**
 * 바이트 단위를 읽기 쉬운 문자열로 변환합니다.
 */
export function formatBytes(n: number): string {
    if (n === 0) return '';
    if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
    if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${n} bytes`;
}

export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const SYSTEM_PROMPT = `당신은 전문 프론트엔드 개발자입니다. Figma 디자인 데이터를 바탕으로 완전히 독립 실행 가능한 HTML 파일을 작성해주세요.

요구사항:
- 반드시 완전한 HTML 파일 (<!DOCTYPE html><html>...</html>) 형태로 출력
- 외부 CDN/라이브러리 없이 순수 HTML/CSS/JS만 사용
- Figma 디자인의 레이아웃, 색상, 폰트, 간격을 최대한 정확하게 재현
- 마크다운 코드 블록(\`\`\`html) 없이 HTML 코드만 출력할 것`;

export interface GeminiPart {
    text?: string;
    inlineData?: { mimeType: string; data: string };
}

export interface GeminiResponse {
    candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
    }>;
    usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
    };
    error?: { message?: string; code?: number };
}
