import { formatBytes } from './utils';

describe('formatBytes', () => {
    it('returns empty string for 0', () => {
        expect(formatBytes(0)).toBe('');
    });

    it('returns bytes for small values', () => {
        expect(formatBytes(512)).toBe('512 bytes');
    });

    it('returns KB for values >= 1024', () => {
        expect(formatBytes(1024)).toBe('1.0 KB');
        expect(formatBytes(2048)).toBe('2.0 KB');
    });

    it('returns MB for values >= 1048576', () => {
        expect(formatBytes(1048576)).toBe('1.0 MB');
        expect(formatBytes(2097152)).toBe('2.0 MB');
    });
});
