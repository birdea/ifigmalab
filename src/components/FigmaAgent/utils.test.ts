import { extractHtml, preprocessMcpData } from './utils';

describe('FigmaAgent utils', () => {
    describe('extractHtml', () => {
        it('extracts HTML from a markdown code block', () => {
            const raw = 'Here is the code: ```html\n<div>Test</div>\n```';
            expect(extractHtml(raw)).toBe('<div>Test</div>');
        });

        it('extracts HTML from a plain code block', () => {
            const raw = '```\n<html><body>Content</body></html>\n```';
            expect(extractHtml(raw)).toBe('<html><body>Content</body></html>');
        });

        it('returns the raw string if it starts with HTML tags', () => {
            const raw = '<!DOCTYPE html><html></html>';
            expect(extractHtml(raw)).toBe(raw);
        });

        it('trims the raw string if no blocks found', () => {
            const raw = '  just text  ';
            expect(extractHtml(raw)).toBe('just text');
        });

        it('extracts HTML when starts with <html', () => {
            const raw = '  <html lang="ko"><body></body></html>  ';
            expect(extractHtml(raw)).toBe('<html lang="ko"><body></body></html>');
        });

        it('returns raw when starts with <!', () => {
            const raw = '<!DOCTYPE html><html></html>';
            expect(extractHtml(raw)).toBe(raw);
        });
    });

    describe('preprocessMcpData', () => {
        it('removes data-node-id and data-name attributes', () => {
            const raw = '<div data-node-id="123" data-name="frame" class="test"></div>';
            expect(preprocessMcpData(raw)).toBe('<div class="test"></div>');
        });

        it('removes figma-specific data attributes', () => {
            const raw = '<div data-figma-id="abc"></div>';
            expect(preprocessMcpData(raw)).toBe('<div></div>');
        });

        it('cleans up extra whitespace and empty lines', () => {
            const raw = 'line 1\n\n\nline 2   ';
            expect(preprocessMcpData(raw)).toBe('line 1\n\nline 2');
        });
    });
});
