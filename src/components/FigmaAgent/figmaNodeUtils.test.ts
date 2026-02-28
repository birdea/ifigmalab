import { parseNodeId } from './figmaNodeUtils';

describe('parseNodeId', () => {
    describe('plain node ID formats', () => {
        it('returns colon-separated ID for hyphen format', () => {
            expect(parseNodeId('22041-218191')).toBe('22041:218191');
        });

        it('returns as-is for colon format', () => {
            expect(parseNodeId('22041:218191')).toBe('22041:218191');
        });

        it('returns null for invalid format', () => {
            expect(parseNodeId('invalid-text')).toBeNull();
            expect(parseNodeId('abc-def')).toBeNull();
            expect(parseNodeId('')).toBeNull();
            expect(parseNodeId('   ')).toBeNull();
        });

        it('trims whitespace before parsing', () => {
            expect(parseNodeId('  22041-218191  ')).toBe('22041:218191');
            expect(parseNodeId('  22041:218191  ')).toBe('22041:218191');
        });
    });

    describe('Figma URL formats', () => {
        it('extracts node ID from Figma file URL', () => {
            const url = 'https://www.figma.com/file/abc123/MyDesign?node-id=22041-218191';
            expect(parseNodeId(url)).toBe('22041:218191');
        });

        it('extracts node ID from Figma design URL', () => {
            const url = 'https://www.figma.com/design/abc123/MyDesign?node-id=1234-5678&mode=dev';
            expect(parseNodeId(url)).toBe('1234:5678');
        });

        it('returns null for Figma URL without node-id param', () => {
            const url = 'https://www.figma.com/file/abc123/MyDesign';
            expect(parseNodeId(url)).toBeNull();
        });

        it('handles @ prefixed Figma URL', () => {
            const url = '@https://www.figma.com/file/abc123/MyDesign?node-id=100-200';
            expect(parseNodeId(url)).toBe('100:200');
        });

        it('extracts node ID from multiline text containing URL', () => {
            const text = 'Check this design:\nhttps://www.figma.com/file/abc/Design?node-id=5-10\nthanks';
            expect(parseNodeId(text)).toBe('5:10');
        });
    });
});
