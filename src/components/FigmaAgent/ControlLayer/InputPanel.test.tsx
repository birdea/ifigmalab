import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'jotai';
import InputPanel from './InputPanel';

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

describe('InputPanel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the component', () => {
        render(
            <Provider>
                <InputPanel />
            </Provider>
        );
        expect(screen.getByText('디자인 프롬프트')).toBeInTheDocument();
    });

    it('updates MCP data and prompt text', () => {
        render(
            <Provider>
                <InputPanel />
            </Provider>
        );

        const textareas = screen.getAllByRole('textbox');
        const mcpTextarea = textareas[0];
        const promptTextarea = textareas[1];

        fireEvent.change(mcpTextarea, { target: { value: 'mcp-data' } });
        fireEvent.change(promptTextarea, { target: { value: 'prompt-text' } });

        expect(mcpTextarea).toHaveValue('mcp-data');
        expect(promptTextarea).toHaveValue('prompt-text');
    });

    it('optimizes MCP data when Optimize button is clicked', () => {
        render(
            <Provider>
                <InputPanel />
            </Provider>
        );

        const mcpTextarea = screen.getAllByRole('textbox')[0];
        fireEvent.change(mcpTextarea, { target: { value: '<div data-node-id="123"></div>' } });

        const optimizeBtn = screen.getByText(/최적화/);
        fireEvent.click(optimizeBtn);

        expect(mcpTextarea).toHaveValue('<div></div>');
    });

    it('submits data to Gemini API and displays success result', async () => {
        const mockResponse = {
            candidates: [
                {
                    content: { parts: [{ text: '```html\n<h1>Success</h1>\n```' }] },
                    finishReason: 'STOP',
                }
            ],
            usageMetadata: {
                promptTokenCount: 100,
                candidatesTokenCount: 50,
                totalTokenCount: 150,
            }
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Map([['content-type', 'application/json']]),
            text: async () => JSON.stringify(mockResponse),
        });

        // Use custom store to set atoms
        const { createStore } = require('jotai');
        const { apiKeyAtom, mcpDataAtom } = require('../atoms');
        const customStore = createStore();
        customStore.set(apiKeyAtom, 'test-api-key');
        customStore.set(mcpDataAtom, 'some-mcp-data');

        render(
            <Provider store={customStore}>
                <InputPanel />
            </Provider>
        );

        const submitBtn = screen.getByText('생성 요청 ▶');
        expect(submitBtn).not.toBeDisabled();

        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText(/Generation complete|결과가 VIEW 페이지에 반영되었습니다/)).toBeInTheDocument();
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('generateContent'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'x-goog-api-key': 'test-api-key'
                })
            })
        );
    });

    it('shows and hides debug log', () => {
        const { createStore } = require('jotai');
        const { debugLogAtom } = require('../atoms');
        const store = createStore();

        const { rerender } = render(
            <Provider store={store}>
                <InputPanel />
            </Provider>
        );

        expect(screen.queryByText('디버그 로그')).not.toBeInTheDocument();

        store.set(debugLogAtom, 'some log line');
        rerender(
            <Provider store={store}>
                <InputPanel />
            </Provider>
        );
        expect(screen.getByText('디버그 로그')).toBeInTheDocument();

        const clearBtn = screen.getByText('지우기');
        fireEvent.click(clearBtn);
        expect(store.get(debugLogAtom)).toBe('');
    });

    it('handles token count display states', () => {
        const { createStore } = require('jotai');
        const { apiKeyAtom, promptAtom } = require('../atoms');
        const store = createStore();
        store.set(apiKeyAtom, 'key');
        store.set(promptAtom, 'prompt');

        render(
            <Provider store={store}>
                <InputPanel />
            </Provider>
        );

        expect(screen.getByText('준비 완료')).toBeInTheDocument();
    });
});
