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

export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export { SYSTEM_PROMPT } from '../../config/prompts';

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
