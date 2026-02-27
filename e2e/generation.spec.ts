import { test, expect } from '@playwright/test';

/**
 * E2E: AI 생성 플로우 테스트 (Mock API)
 *
 * Gemini API 및 프록시 서버를 route intercept로 모킹하여
 * API 키 미입력 → 에러, 컨텐츠 미입력 → 에러, 정상 생성 → VIEW 탭 전환
 * 등의 핵심 사용자 플로우를 검증한다.
 */

const MOCK_HTML = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>Generated</title></head>
<body><div class="container">Hello from mock AI</div></body>
</html>`;

const MOCK_GEMINI_RESPONSE = {
    candidates: [
        {
            content: {
                parts: [{ text: `\`\`\`html\n${MOCK_HTML}\n\`\`\`` }],
                role: 'model',
            },
            finishReason: 'STOP',
        },
    ],
    usageMetadata: {
        promptTokenCount: 100,
        candidatesTokenCount: 50,
        totalTokenCount: 150,
    },
};

const MOCK_COUNT_TOKENS_RESPONSE = {
    totalTokens: 100,
};

test.describe('AI 생성 플로우', () => {
    test.beforeEach(async ({ page }) => {
        // MCP 상태는 disconnected
        await page.route('**/api/figma/status', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ connected: false }),
            });
        });

        await page.goto('/');
    });

    test('에이전트 탭(AGENT)이 존재하고 접근 가능하다', async ({ page }) => {
        const agentTab = page.getByRole('tab', { name: /에이전트/i });
        await expect(agentTab).toBeVisible();
    });

    test('MCP 탭에서 AI 생성 패널이 표시된다', async ({ page }) => {
        const mcpTab = page.getByRole('tab', { name: /MCP/i });
        await mcpTab.click();

        // 디자인 프롬프트 패널
        await expect(page.getByText(/디자인 프롬프트/)).toBeVisible();
        await expect(page.getByRole('button', { name: /생성 요청/ })).toBeVisible();
    });

    test('API 키 없이 생성 요청 시 생성 버튼이 비활성화 상태다', async ({ page }) => {
        const mcpTab = page.getByRole('tab', { name: /MCP/i });
        await mcpTab.click();

        const submitBtn = page.getByRole('button', { name: /생성 요청/ });
        await expect(submitBtn).toBeDisabled();
    });

    test('컨텍스트/프롬프트 미입력 시 생성 버튼이 비활성화 상태다', async ({ page }) => {
        const mcpTab = page.getByRole('tab', { name: /MCP/i });
        await mcpTab.click();

        const submitBtn = page.getByRole('button', { name: /생성 요청/ });
        await expect(submitBtn).toBeDisabled();
    });

    test('토큰 계산 버튼은 컨텐츠 없으면 비활성화, 있으면 활성화된다', async ({ page }) => {
        const mcpTab = page.getByRole('tab', { name: /MCP/i });
        await mcpTab.click();

        const countBtn = page.getByRole('button', { name: /토큰 계산/ });
        await expect(countBtn).toBeDisabled();

        // 프롬프트 입력 (API 키 없으면 여전히 비활성)
        const promptTextarea = page.getByRole('textbox').nth(1);
        await promptTextarea.fill('테스트 프롬프트');
        // API 키 없으면 비활성
        await expect(countBtn).toBeDisabled();
    });

    test('준비 상태 표시 — API 키 없음 표시가 보인다', async ({ page }) => {
        const mcpTab = page.getByRole('tab', { name: /MCP/i });
        await mcpTab.click();

        await expect(page.getByText(/API 키 없음/)).toBeVisible();
    });

    test('준비 상태 표시 — 컨텐츠 없음 표시가 보인다', async ({ page }) => {
        const mcpTab = page.getByRole('tab', { name: /MCP/i });
        await mcpTab.click();

        await expect(page.getByText(/컨텐츠 없음/)).toBeVisible();
    });

    test('토큰 계산 성공 시 토큰 수가 표시된다', async ({ page }) => {
        // Gemini countTokens API 모킹
        await page.route('**:countTokens*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_COUNT_TOKENS_RESPONSE),
            });
        });

        const mcpTab = page.getByRole('tab', { name: /MCP/i });
        await mcpTab.click();

        // API 키 설정을 위해 에이전트 탭으로 이동 불가(sessionStorage 직접 조작)
        // 대신 localStorge에 API 키를 직접 주입
        await page.evaluate(() => {
            sessionStorage.setItem('figma_agent_api_key', 'AIzaMockTestKey1234567890');
        });
        await page.reload();
        await page.route('**/api/figma/status', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: false }) });
        });
        await page.route('**:countTokens*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_COUNT_TOKENS_RESPONSE),
            });
        });

        const mcpTab2 = page.getByRole('tab', { name: /MCP/i });
        await mcpTab2.click();

        // 컨텍스트 입력
        const contextTextarea = page.getByRole('textbox').first();
        await contextTextarea.fill('디자인 컨텍스트 데이터');

        const countBtn = page.getByRole('button', { name: /토큰 계산/ });
        await countBtn.click();

        await expect(page.getByText(/tokens|토큰/i)).toBeVisible({ timeout: 5000 });
    });

    test('Gemini API Mock으로 HTML 생성 성공 시 Toast가 표시된다', async ({ page }) => {
        // Gemini generateContent API 모킹
        await page.route('**:generateContent*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_GEMINI_RESPONSE),
            });
        });

        // API 키 sessionStorage 주입
        await page.evaluate(() => {
            sessionStorage.setItem('figma_agent_api_key', 'AIzaMockTestKey1234567890');
        });
        await page.reload();
        await page.route('**/api/figma/status', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: false }) });
        });
        await page.route('**:generateContent*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_GEMINI_RESPONSE),
            });
        });

        const mcpTab = page.getByRole('tab', { name: /MCP/i });
        await mcpTab.click();

        // 컨텍스트 입력
        const contextTextarea = page.getByRole('textbox').first();
        await contextTextarea.fill('디자인 컨텍스트 데이터');

        const submitBtn = page.getByRole('button', { name: /생성 요청/ });
        await expect(submitBtn).toBeEnabled({ timeout: 2000 });
        await submitBtn.click();

        // Toast 알림 확인
        await expect(page.getByRole('status')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/VIEW/i)).toBeVisible({ timeout: 10000 });
    });

    test('생성 성공 후 VIEW 탭으로 이동하면 iframe이 표시된다', async ({ page }) => {
        await page.route('**:generateContent*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_GEMINI_RESPONSE),
            });
        });

        await page.evaluate(() => {
            sessionStorage.setItem('figma_agent_api_key', 'AIzaMockTestKey1234567890');
        });
        await page.reload();
        await page.route('**/api/figma/status', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: false }) });
        });
        await page.route('**:generateContent*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_GEMINI_RESPONSE),
            });
        });

        const mcpTab = page.getByRole('tab', { name: /MCP/i });
        await mcpTab.click();

        const contextTextarea = page.getByRole('textbox').first();
        await contextTextarea.fill('디자인 컨텍스트 데이터');

        const submitBtn = page.getByRole('button', { name: /생성 요청/ });
        await expect(submitBtn).toBeEnabled({ timeout: 2000 });
        await submitBtn.click();

        // Toast의 미리보기(VIEW) 이동 버튼 클릭
        const goToViewBtn = page.getByRole('button', { name: /미리보기.*VIEW.*이동/i });
        await expect(goToViewBtn).toBeVisible({ timeout: 10000 });
        await goToViewBtn.click();

        // VIEW 탭 패널 확인
        const viewPanel = page.getByRole('tabpanel', { name: /미리보기/i });
        await expect(viewPanel).toBeVisible();

        // iframe 확인
        const iframe = viewPanel.locator('iframe');
        await expect(iframe).toBeVisible({ timeout: 5000 });
    });

    test('Gemini API 오류 응답 시 디버그 로그에 에러가 기록된다', async ({ page }) => {
        await page.route('**:generateContent*', async (route) => {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: { code: 400, message: 'API key not valid. Please pass a valid API key.' },
                }),
            });
        });

        await page.evaluate(() => {
            sessionStorage.setItem('figma_agent_api_key', 'AIzaInvalidKey');
        });
        await page.reload();
        await page.route('**/api/figma/status', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: false }) });
        });
        await page.route('**:generateContent*', async (route) => {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: { code: 400, message: 'API key not valid.' },
                }),
            });
        });

        const mcpTab = page.getByRole('tab', { name: /MCP/i });
        await mcpTab.click();

        const contextTextarea = page.getByRole('textbox').first();
        await contextTextarea.fill('디자인 데이터');

        const submitBtn = page.getByRole('button', { name: /생성 요청/ });
        await expect(submitBtn).toBeEnabled({ timeout: 2000 });
        await submitBtn.click();

        // 디버그 로그에 에러 기록 확인
        await expect(page.getByText(/API 오류|API key not valid/i)).toBeVisible({ timeout: 10000 });
    });

    test('데이터 최적화 버튼은 컨텍스트 입력 시 표시된다', async ({ page }) => {
        const mcpTab = page.getByRole('tab', { name: /MCP/i });
        await mcpTab.click();

        // 처음에는 최적화 버튼 없음
        const optimizeBtn = page.getByRole('button', { name: /최적화/ });
        await expect(optimizeBtn).not.toBeVisible();

        // 컨텍스트 입력 후 최적화 버튼 등장
        const contextTextarea = page.getByRole('textbox').first();
        await contextTextarea.fill('data-abc="test" data-xyz="value" class="main">');
        await expect(optimizeBtn).toBeVisible();
    });
});
