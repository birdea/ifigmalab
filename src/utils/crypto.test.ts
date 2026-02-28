/** @jest-environment node */
import { encryptData, decryptData } from './crypto';

describe('crypto', () => {
    describe('encryptData / decryptData round-trip', () => {
        it('encrypts and decrypts text with correct PIN', async () => {
            const original = 'my-secret-api-key-1234';
            const pin = '1234';
            const encrypted = await encryptData(original, pin);
            expect(typeof encrypted).toBe('string');
            expect(encrypted).not.toBe(original);
            const decrypted = await decryptData(encrypted, pin);
            expect(decrypted).toBe(original);
        });

        it('produces different ciphertext on each call (random salt/IV)', async () => {
            const text = 'same-text';
            const pin = '5678';
            const enc1 = await encryptData(text, pin);
            const enc2 = await encryptData(text, pin);
            expect(enc1).not.toBe(enc2);
        });

        it('throws when decrypting with wrong PIN', async () => {
            const encrypted = await encryptData('secret', 'correct-pin');
            await expect(decryptData(encrypted, 'wrong-pin')).rejects.toThrow();
        });

        it('throws when decrypting malformed base64', async () => {
            await expect(decryptData('not-valid-base64!!!', '1234')).rejects.toThrow();
        });

        it('handles unicode text', async () => {
            const text = '한국어 텍스트 🔑';
            const pin = 'abcd';
            const encrypted = await encryptData(text, pin);
            const decrypted = await decryptData(encrypted, pin);
            expect(decrypted).toBe(text);
        });
    });
});
