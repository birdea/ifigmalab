describe('SYSTEM_PROMPT env override (A-09)', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('uses default prompt when SYSTEM_PROMPT env var is not set', () => {
        delete process.env.SYSTEM_PROMPT;
         
        const { SYSTEM_PROMPT } = require('./prompts') as { SYSTEM_PROMPT: string };
        expect(SYSTEM_PROMPT).toContain('전문 프론트엔드 개발자');
    });

    it('uses SYSTEM_PROMPT env var when set', () => {
        process.env.SYSTEM_PROMPT = 'custom system prompt for testing';
         
        const { SYSTEM_PROMPT } = require('./prompts') as { SYSTEM_PROMPT: string };
        expect(SYSTEM_PROMPT).toBe('custom system prompt for testing');
    });
});
