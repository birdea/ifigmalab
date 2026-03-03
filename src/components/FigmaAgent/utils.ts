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

/** 응답이 HTML 출력인지 코드 파일 출력인지 판별 */
export function isHtmlOutput(raw: string): boolean {
    const trimmed = raw.trim();
    return /^<!DOCTYPE\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed);
}

export interface CodeFile {
    filename: string;
    content: string;
    language: string;
}

function detectLanguage(filename: string): string {
    if (/\.tsx?$/.test(filename)) return 'typescript';
    if (/\.jsx?$/.test(filename)) return 'javascript';
    if (/\.scss$/.test(filename)) return 'scss';
    if (/\.css$/.test(filename)) return 'css';
    if (/\.html?$/.test(filename)) return 'html';
    return 'text';
}

/**
 * "// === 파일명: xxx ===" 구분자로 분리된 코드 응답을 파싱합니다.
 * 구분자가 없으면 전체를 단일 파일로 반환합니다.
 */
export function parseCodeFiles(raw: string): CodeFile[] {
    // 마크다운 코드 블록 제거
    let content = raw.trim();
    const fenced = content.match(/```(?:\w+)?\s*\n?([\s\S]*?)```/);
    if (fenced) content = fenced[1].trim();

    const separator = /^\/\/\s*===\s*파일명:\s*(.+?)\s*===\s*$/gm;
    const files: CodeFile[] = [];
    let match: RegExpExecArray | null;
    const splits: { filename: string; start: number }[] = [];

    while ((match = separator.exec(content)) !== null) {
        splits.push({ filename: match[1].trim(), start: match.index + match[0].length });
    }

    if (splits.length === 0) {
        return [{ filename: 'output.txt', content: content, language: 'text' }];
    }

    for (let i = 0; i < splits.length; i++) {
        const end = i + 1 < splits.length
            ? content.lastIndexOf('\n', splits[i + 1].start - splits[i + 1].filename.length - 20)
            : content.length;
        const fileContent = content.slice(splits[i].start, end).trim();
        files.push({
            filename: splits[i].filename,
            content: fileContent,
            language: detectLanguage(splits[i].filename),
        });
    }

    return files;
}

/** 포맷에 따라 응답 텍스트에서 코드를 추출 */
export function extractContent(raw: string, format: 'html' | 'react'): string {
    if (format === 'html') return extractHtml(raw);
    // React 모드: 마크다운 코드 블록만 제거하고 원본 유지
    const fenced = raw.match(/```(?:\w+)?\s*\n?([\s\S]*?)```/);
    if (fenced) return fenced[1].trim();
    return raw.trim();
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

export { SYSTEM_PROMPT, getSystemPrompt } from '../../config/prompts';

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
