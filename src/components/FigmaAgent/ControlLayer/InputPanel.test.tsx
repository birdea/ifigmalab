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
        expect(screen.getByText('Design Prompt')).toBeInTheDocument();
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

        const optimizeBtn = screen.getByText(/Optimize/);
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

        const submitBtn = screen.getByText('Submit ▶');
        expect(submitBtn).not.toBeDisabled();

        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText(/생성 완료/)).toBeInTheDocument();
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
});
