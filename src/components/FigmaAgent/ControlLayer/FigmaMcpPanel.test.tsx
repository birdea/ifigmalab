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

    it('renders the component with default unknown state', () => {
        renderComponent();
        expect(screen.getByText('Figma MCP 연동')).toBeInTheDocument();
        expect(screen.getAllByText('(–) : 확인 불가')).toHaveLength(2);
    });

    it('checks status and updates connected state successfully', async () => {
        (global.fetch as jest.Mock).mockImplementation(async () => {
            return { ok: true, json: async () => ({ connected: true }) };
        });

        renderComponent();
        const applyBtn = screen.getAllByText('적용')[1];
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(screen.getAllByText('(●) : 연결됨')).toHaveLength(2);
        });
    });

    it('checks status and handles disconnected state if API fails', async () => {
        (global.fetch as jest.Mock).mockImplementation(async () => {
            throw new Error('Network error');
        });

        renderComponent();
        const applyBtn = screen.getAllByText('적용')[1];
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(screen.getByText('(○) : 연결 안 됨')).toBeInTheDocument(); // proxy
            expect(screen.getByText('(–) : 확인 불가')).toBeInTheDocument();  // MCP unknown
        });
    });

    it('fetches context context successfully given valid nodeId', async () => {
        (global.fetch as jest.Mock).mockImplementation(async (url) => {
            if (String(url).includes('/api/figma/status')) return { ok: true, json: async () => ({ connected: true }) };
            return { ok: true, text: async () => JSON.stringify({ data: 'mocked figma context' }) };
        });

        renderComponent();

        const nodeIdInput = screen.getByPlaceholderText(/22041:218191/);
        fireEvent.change(nodeIdInput, { target: { value: '1234:5678' } });

        const fetchBtn = screen.getByText('데이터 가져오기');
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

        const fetchBtn = screen.getByText('데이터 가져오기');
        fireEvent.click(fetchBtn);

        await waitFor(() => {
            expect(screen.getByText('Node ID 또는 Figma URL을 입력해주세요.')).toBeInTheDocument();
        });
    });

    it('displays error message when invalid nodeId is submitted for context fetch', async () => {
        renderComponent();

        const nodeIdInput = screen.getByPlaceholderText(/22041:218191/);
        fireEvent.change(nodeIdInput, { target: { value: 'invalid-string' } });

        const fetchBtn = screen.getByText('데이터 가져오기');
        fireEvent.click(fetchBtn);

        await waitFor(() => {
            expect(screen.getByText('올바른 Node ID(예: 22041:218191) 또는 Figma URL을 입력해주세요.')).toBeInTheDocument();
        });
    });

    it('fetch context handles network/server errors (Edge case)', async () => {
        (global.fetch as jest.Mock).mockImplementation(async (url) => {
            if (String(url).includes('/api/figma/status')) return { ok: true, json: async () => ({ connected: true }) };
            return { ok: false, status: 500, text: async () => JSON.stringify({ error: 'Internal Server Error' }) };
        });

        renderComponent();

        const nodeIdInput = screen.getByPlaceholderText(/22041:218191/);
        fireEvent.change(nodeIdInput, { target: { value: '1234:5678' } });

        const fetchBtn = screen.getByText('데이터 가져오기');
        fireEvent.click(fetchBtn);

        await waitFor(() => {
            expect(screen.getByText('Internal Server Error')).toBeInTheDocument();
        });
    });

    it('fetch context handles invalid JSON response (Edge case)', async () => {
        (global.fetch as jest.Mock).mockImplementation(async (url) => {
            if (String(url).includes('/api/figma/status')) return { ok: true, json: async () => ({ connected: true }) };
            return { ok: true, text: async () => '<html>Not JSON</html>' };
        });

        renderComponent();

        const nodeIdInput = screen.getByPlaceholderText(/22041:218191/);
        fireEvent.change(nodeIdInput, { target: { value: '1234:5678' } });

        const fetchBtn = screen.getByText('데이터 가져오기');
        fireEvent.click(fetchBtn);

        await waitFor(() => {
            expect(screen.getByText(/서버 응답 오류 \(proxy-server 재시작 필요\)/)).toBeInTheDocument();
        });
    });

    it('fetches screenshot successfully', async () => {
        (global.fetch as jest.Mock).mockImplementation(async (url) => {
            if (String(url).includes('/api/figma/status')) return { ok: true, json: async () => ({ connected: true }) };
            return { ok: true, text: async () => JSON.stringify({ data: 'base64image', mimeType: 'image/jpeg' }) };
        });

        renderComponent();

        const applyBtn = screen.getAllByText('적용')[1];
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(screen.getAllByText('(●) : 연결됨')[0]).toBeInTheDocument();
        });

        const nodeIdInput = screen.getByPlaceholderText(/22041:218191/);
        fireEvent.change(nodeIdInput, { target: { value: '1234:5678' } });

        const screenshotBtn = screen.getByRole('button', { name: /스크린샷/ });
        fireEvent.click(screenshotBtn);

        await waitFor(() => {
            expect(screen.getByAltText('Figma 스크린샷')).toBeInTheDocument();
            expect(screen.getByAltText('Figma 스크린샷')).toHaveAttribute('src', 'data:image/jpeg;base64,base64image');
        });
    });

    it('fetch screenshot handles API error (Edge case)', async () => {
        (global.fetch as jest.Mock).mockImplementation(async (url) => {
            if (String(url).includes('/api/figma/status')) return { ok: true, json: async () => ({ connected: true }) };
            return { ok: false, text: async () => JSON.stringify({ error: 'Screenshot generation failed limit reached' }) };
        });

        renderComponent();

        const applyBtn = screen.getAllByText('적용')[1];
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(screen.getAllByText('(●) : 연결됨')[0]).toBeInTheDocument();
        });

        const nodeIdInput = screen.getByPlaceholderText(/22041:218191/);
        fireEvent.change(nodeIdInput, { target: { value: '1234-5678' } }); // Valid alternative format

        const screenshotBtn = screen.getByRole('button', { name: /스크린샷/ });
        fireEvent.click(screenshotBtn);

        await waitFor(() => {
            expect(screen.getByText('Screenshot generation failed limit reached')).toBeInTheDocument();
        });
    });

    it('renders proxy server URL input with default value', () => {
        renderComponent();
        const input = screen.getByPlaceholderText('http://localhost:3006');
        expect(input).toBeInTheDocument();
        expect(input).toHaveValue('http://localhost:3006');
    });

    it('updates proxy server URL on input change', () => {
        renderComponent();
        const input = screen.getByPlaceholderText('http://localhost:3006');
        fireEvent.change(input, { target: { value: 'http://localhost:3010' } });
        expect(input).toHaveValue('http://localhost:3010');
    });

    it('auto-detect finds proxy and updates URL', async () => {
        (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
            // 3006~3008은 응답 없음, 3009에 proxy 존재 시뮬레이션
            if (String(url).includes('localhost:3009')) {
                return { ok: true, json: async () => ({ connected: false }) };
            }
            throw new Error('ECONNREFUSED');
        });

        renderComponent();

        const detectBtn = screen.getByText('자동 감지');
        fireEvent.click(detectBtn);

        await waitFor(() => {
            const input = screen.getByPlaceholderText('http://localhost:3006');
            expect(input).toHaveValue('http://localhost:3009');
        });
    });

    it('auto-detect shows detecting state and resets when no proxy found', async () => {
        (global.fetch as jest.Mock).mockImplementation(async () => {
            throw new Error('ECONNREFUSED');
        });

        renderComponent();

        const detectBtn = screen.getByText('자동 감지');
        fireEvent.click(detectBtn);

        // 버튼이 즉시 비활성화됨
        expect(detectBtn).toBeDisabled();

        // 스캔 완료 후 버튼 복구
        await waitFor(() => {
            expect(screen.getByText('자동 감지')).not.toBeDisabled();
        }, { timeout: 5000 });
    });

    it('pauses polling when tab is hidden and resumes when visible', async () => {
        jest.useFakeTimers();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ connected: true }),
        });

        renderComponent();

        // Initial poll happens on mount
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        const callCountAfterMount = (global.fetch as jest.Mock).mock.calls.length;

        // Hide tab
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true, configurable: true });
        fireEvent(document, new Event('visibilitychange'));

        // Advance timers - should NOT call fetch while hidden
        jest.advanceTimersByTime(20000);
        expect((global.fetch as jest.Mock).mock.calls.length).toBe(callCountAfterMount);

        // Show tab
        Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true, configurable: true });
        fireEvent(document, new Event('visibilitychange'));

        // Should resume polling
        jest.advanceTimersByTime(0);
        await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(callCountAfterMount));

        jest.useRealTimers();
    });
});

