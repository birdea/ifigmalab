/** Gemini 응답 텍스트에서 HTML 추출 (마크다운 코드블록 제거) */
export function extractHtml(raw: string): string {
    // ```html ... ``` 또는 ``` ... ``` 블록 추출
    const fenced = raw.match(/```(?:html)?\s*\n?([\s\S]*?)```/);
    if (fenced) return fenced[1].trim();
    // 이미 HTML 태그로 시작하면 그대로 반환
    const trimmed = raw.trim();
    if (trimmed.startsWith('<!') || trimmed.startsWith('<html')) return trimmed;
    return trimmed;
}

/** data-node-id, data-name 등 data-* 속성 제거 + 연속 공백 줄 정리 */
export function preprocessMcpData(raw: string): string {
    let result = raw
        .replace(/\s+data-node-id="[^"]*"/g, '')
        .replace(/\s+data-name="[^"]*"/g, '')
        .replace(/\s+data-figma-[^=]*="[^"]*"/g, '');
    result = result.split('\n').map(line => line.trimEnd()).join('\n');
    result = result.replace(/\n{3,}/g, '\n\n');
    return result.trim();
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
