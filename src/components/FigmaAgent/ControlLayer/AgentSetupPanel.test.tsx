import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'jotai';
import AgentSetupPanel from './AgentSetupPanel';

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

describe('AgentSetupPanel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        sessionStorage.clear();
        localStorage.clear();
    });

    it('renders the component', () => {
        render(
            <Provider>
                <AgentSetupPanel />
            </Provider>
        );
        expect(screen.getByText('AI Agent Setup')).toBeInTheDocument();
    });

    it('handles API key input and show/hide toggle', () => {
        render(
            <Provider>
                <AgentSetupPanel />
            </Provider>
        );

        const input = screen.getByPlaceholderText('AIza...');
        fireEvent.change(input, { target: { value: 'test-api-key' } });
        expect(input).toHaveValue('test-api-key');
        expect(input).toHaveAttribute('type', 'password');

        const toggleBtn = screen.getByText('Show');
        fireEvent.click(toggleBtn);
        expect(input).toHaveAttribute('type', 'text');
        expect(screen.getByText('Hide')).toBeInTheDocument();
    });

    it('saves API key to localStorage when "Remember" is checked and PIN is entered', () => {
        render(
            <Provider>
                <AgentSetupPanel />
            </Provider>
        );

        const input = screen.getByPlaceholderText('AIza...');
        const rememberCheckbox = screen.getByLabelText('로컬에 암호화하여 저장');

        fireEvent.change(input, { target: { value: 'test-api-key' } });
        fireEvent.click(rememberCheckbox);

        const pinInput = screen.getByPlaceholderText('4자리 이상 PIN 입력');
        fireEvent.change(pinInput, { target: { value: '1234' } });

        expect(localStorage.getItem('figma_agent_api_key_enc')).toBeTruthy();
    });

    it('fetches models when refresh button is clicked', async () => {
        const mockModels = {
            models: [
                { name: 'models/gemini-pro', displayName: 'Gemini Pro', supportedGenerationMethods: ['generateContent'] }
            ]
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockModels,
        });

        render(
            <Provider>
                <AgentSetupPanel />
            </Provider>
        );

        const input = screen.getByPlaceholderText('AIza...');
        fireEvent.change(input, { target: { value: 'test-api-key' } });

        const refreshBtn = screen.getByTitle('API에서 모델 목록 갱신');
        fireEvent.click(refreshBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('models'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'x-goog-api-key': 'test-api-key'
                    })
                })
            );
        });
    });

    it('updates staged model when select value changes', () => {
        render(
            <Provider>
                <AgentSetupPanel />
            </Provider>
        );

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'gemini-2.5-pro' } });
        expect(select).toHaveValue('gemini-2.5-pro');
    });

    it('sets the selected model when SET button is clicked', () => {
        render(
            <Provider>
                <AgentSetupPanel />
            </Provider>
        );

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'gemini-2.5-pro' } });

        const setBtn = screen.getByTitle('선택한 모델을 MCP에 적용');
        fireEvent.click(setBtn);

        expect(screen.getByText('gemini-2.5-pro')).toBeInTheDocument();
        expect(setBtn).toBeDisabled();
    });

    it('fetches model info when "Get Model Info" button is clicked', async () => {
        const mockModelInfo = {
            name: 'models/gemini-2.5-flash',
            displayName: 'Gemini 2.5 Flash',
            description: 'Fast and versatile',
            inputTokenLimit: 1000000,
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockModelInfo,
        });

        render(
            <Provider>
                <AgentSetupPanel />
            </Provider>
        );

        const input = screen.getByPlaceholderText('AIza...');
        fireEvent.change(input, { target: { value: 'test-api-key' } });

        const infoBtn = screen.getByText('Get Model Info');
        fireEvent.click(infoBtn);

        await waitFor(() => {
            expect(screen.getByText(/Fast and versatile/)).toBeInTheDocument();
        });
    });
});
