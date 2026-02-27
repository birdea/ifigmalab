import i18n from './config';

describe('i18n config', () => {
    it('should be initialized', () => {
        expect(i18n.isInitialized).toBe(true);
    });

    it('should have ko and en resources', () => {
        expect(i18n.options.resources).toHaveProperty('ko');
        expect(i18n.options.resources).toHaveProperty('en');
    });

    it('should fall back to ko', () => {
        expect(i18n.options.fallbackLng).toContain('ko');
    });
});
