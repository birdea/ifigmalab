import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'jotai';
import FigmaMcpPanel from './FigmaMcpPanel';

// Mock fetch for all test cases
global.fetch = jest.fn() as jest.Mock;

describe('FigmaMcpPanel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const renderComponent = () => {
        return render(
            <Provider>
                <FigmaMcpPanel />
            </Provider>
        );
    };

    it('renders the component with default disconnected state', () => {
        renderComponent();
        expect(screen.getByText('Figma MCP 연동')).toBeInTheDocument();
        expect(screen.getByText('(○) : Disconnected')).toBeInTheDocument();
    });

    it('checks status and updates connected state successfully', async () => {
        (global.fetch as jest.Mock).mockImplementation(async () => {
            return { ok: true, json: async () => ({ connected: true }) };
        });

        renderComponent();
        const applyBtn = screen.getByText('Apply');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(screen.getByText('(●) : Connected')).toBeInTheDocument();
        });
    });

    it('checks status and handles disconnected state if API fails', async () => {
        (global.fetch as jest.Mock).mockImplementation(async () => {
            throw new Error('Network error');
        });

        renderComponent();
        const applyBtn = screen.getByText('Apply');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(screen.getByText('(○) : Disconnected')).toBeInTheDocument();
        });
    });

    it('fetches context context successfully given valid nodeId', async () => {
        (global.fetch as jest.Mock).mockImplementation(async (url) => {
            if (String(url).endsWith('/status')) return { ok: true, json: async () => ({ connected: true }) };
            return { ok: true, text: async () => JSON.stringify({ data: 'mocked figma context' }) };
        });

        renderComponent();

        const nodeIdInput = screen.getByPlaceholderText(/22041:218191/);
        fireEvent.change(nodeIdInput, { target: { value: '1234:5678' } });

        const fetchBtn = screen.getByText('Fetch');
        fireEvent.click(fetchBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/figma/fetch-context'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"nodeId":"1234:5678"'),
                })
            );
        });
    });

    it('displays error message when empty nodeId is submitted for context fetch', async () => {
        renderComponent();

        const fetchBtn = screen.getByText('Fetch');
        fireEvent.click(fetchBtn);

        await waitFor(() => {
            expect(screen.getByText('Node ID 또는 Figma URL을 입력해주세요.')).toBeInTheDocument();
        });
    });

    it('displays error message when invalid nodeId is submitted for context fetch', async () => {
        renderComponent();

        const nodeIdInput = screen.getByPlaceholderText(/22041:218191/);
        fireEvent.change(nodeIdInput, { target: { value: 'invalid-string' } });

        const fetchBtn = screen.getByText('Fetch');
        fireEvent.click(fetchBtn);

        await waitFor(() => {
            expect(screen.getByText('올바른 Node ID(예: 22041:218191) 또는 Figma URL을 입력해주세요.')).toBeInTheDocument();
        });
    });

    it('fetch context handles network/server errors (Edge case)', async () => {
        (global.fetch as jest.Mock).mockImplementation(async (url) => {
            if (String(url).endsWith('/status')) return { ok: true, json: async () => ({ connected: true }) };
            return { ok: false, status: 500, text: async () => JSON.stringify({ error: 'Internal Server Error' }) };
        });

        renderComponent();

        const nodeIdInput = screen.getByPlaceholderText(/22041:218191/);
        fireEvent.change(nodeIdInput, { target: { value: '1234:5678' } });

        const fetchBtn = screen.getByText('Fetch');
        fireEvent.click(fetchBtn);

        await waitFor(() => {
            expect(screen.getByText('Internal Server Error')).toBeInTheDocument();
        });
    });

    it('fetch context handles invalid JSON response (Edge case)', async () => {
        (global.fetch as jest.Mock).mockImplementation(async (url) => {
            if (String(url).endsWith('/status')) return { ok: true, json: async () => ({ connected: true }) };
            return { ok: true, text: async () => '<html>Not JSON</html>' };
        });

        renderComponent();

        const nodeIdInput = screen.getByPlaceholderText(/22041:218191/);
        fireEvent.change(nodeIdInput, { target: { value: '1234:5678' } });

        const fetchBtn = screen.getByText('Fetch');
        fireEvent.click(fetchBtn);

        await waitFor(() => {
            expect(screen.getByText(/서버 응답 오류 \(proxy-server 재시작 필요\)/)).toBeInTheDocument();
        });
    });

    it('fetches screenshot successfully', async () => {
        (global.fetch as jest.Mock).mockImplementation(async (url) => {
            if (String(url).endsWith('/status')) return { ok: true, json: async () => ({ connected: true }) };
            return { ok: true, text: async () => JSON.stringify({ data: 'base64image', mimeType: 'image/jpeg' }) };
        });

        renderComponent();

        const applyBtn = screen.getByText('Apply');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(screen.getByText('(●) : Connected')).toBeInTheDocument();
        });

        const nodeIdInput = screen.getByPlaceholderText(/22041:218191/);
        fireEvent.change(nodeIdInput, { target: { value: '1234:5678' } });

        const screenshotBtn = screen.getByText('📸 Screenshot');
        fireEvent.click(screenshotBtn);

        await waitFor(() => {
            expect(screen.getByAltText('Figma screenshot')).toBeInTheDocument();
            expect(screen.getByAltText('Figma screenshot')).toHaveAttribute('src', 'data:image/jpeg;base64,base64image');
        });
    });

    it('fetch screenshot handles API error (Edge case)', async () => {
        (global.fetch as jest.Mock).mockImplementation(async (url) => {
            if (String(url).endsWith('/status')) return { ok: true, json: async () => ({ connected: true }) };
            return { ok: false, text: async () => JSON.stringify({ error: 'Screenshot generation failed limit reached' }) };
        });

        renderComponent();

        const applyBtn = screen.getByText('Apply');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(screen.getByText('(●) : Connected')).toBeInTheDocument();
        });

        const nodeIdInput = screen.getByPlaceholderText(/22041:218191/);
        fireEvent.change(nodeIdInput, { target: { value: '1234-5678' } }); // Valid alternative format

        const screenshotBtn = screen.getByText('📸 Screenshot');
        fireEvent.click(screenshotBtn);

        await waitFor(() => {
            expect(screen.getByText('Screenshot generation failed limit reached')).toBeInTheDocument();
        });
    });
});
