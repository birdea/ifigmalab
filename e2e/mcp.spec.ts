import { test, expect } from '@playwright/test';

/**
 * E2E: MCP 패널 시나리오 테스트
 *
 * 실제 Figma MCP 서버 없이 UI 동작 및 상태 전환을 검증한다.
 * 네트워크 요청은 route intercept로 모킹한다.
 */
test.describe('MCP 패널', () => {
    test.beforeEach(async ({ page }) => {
        // MCP 상태 조회 API: 기본값 disconnected
        await page.route('**/api/figma/status', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ connected: false }),
            });
        });

        await page.goto('/');

        // MCP 탭 클릭
        const mcpTab = page.getByRole('tab', { name: /MCP/i });
        await expect(mcpTab).toBeVisible();
        await mcpTab.click();
    });

    test('MCP 탭 패널이 표시된다', async ({ page }) => {
        const mcpPanel = page.getByRole('tabpanel', { name: /MCP/i });
        await expect(mcpPanel).toBeVisible();
    });

    test('연결 상태가 "연결 안 됨"으로 초기화된다', async ({ page }) => {
        await expect(page.getByText(/연결 안 됨/)).toBeVisible();
    });

    test('서버 URL 입력 후 적용 버튼으로 상태 체크가 가능하다', async ({ page }) => {
        // 연결 성공 모킹으로 교체
        await page.route('**/api/figma/status', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ connected: true }),
            });
        });

        const urlInput = page.getByPlaceholder('http://localhost:3845');
        await urlInput.fill('http://localhost:3845');

        const applyBtn = page.getByRole('button', { name: /적용/ });
        await applyBtn.click();

        await expect(page.getByText(/연결됨/)).toBeVisible({ timeout: 5000 });
    });

    test('Node ID 미입력 시 데이터 가져오기 클릭하면 에러가 표시된다', async ({ page }) => {
        const fetchBtn = page.getByRole('button', { name: /데이터 가져오기/ });
        await fetchBtn.click();

        await expect(page.getByText(/Node ID.*입력해주세요/)).toBeVisible({ timeout: 3000 });
    });

    test('잘못된 Node ID 입력 시 에러 메시지가 표시된다', async ({ page }) => {
        const nodeIdInput = page.getByPlaceholder(/22041:218191/);
        await nodeIdInput.fill('invalid-id-format');

        const fetchBtn = page.getByRole('button', { name: /데이터 가져오기/ });
        await fetchBtn.click();

        await expect(page.getByText(/올바른 Node ID/)).toBeVisible({ timeout: 3000 });
    });

    test('유효한 Node ID(하이픈 형식)를 콜론 형식으로 정규화하여 API 요청한다', async ({ page }) => {
        let requestedNodeId = '';

        await page.route('**/api/figma/fetch-context', async (route) => {
            const body = route.request().postDataJSON();
            requestedNodeId = body.nodeId;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: '<figma_design_context>mock data</figma_design_context>' }),
            });
        });

        const nodeIdInput = page.getByPlaceholder(/22041:218191/);
        await nodeIdInput.fill('22041-218191');

        const fetchBtn = page.getByRole('button', { name: /데이터 가져오기/ });
        await fetchBtn.click();

        await page.waitForTimeout(500);
        expect(requestedNodeId).toBe('22041:218191');
    });

    test('Figma URL에서 node-id를 추출하여 API 요청한다', async ({ page }) => {
        let requestedNodeId = '';

        await page.route('**/api/figma/fetch-context', async (route) => {
            const body = route.request().postDataJSON();
            requestedNodeId = body.nodeId;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: 'mock context' }),
            });
        });

        const figmaUrl = 'https://www.figma.com/design/abc123/MyDesign?node-id=22041-218191&t=xyz';
        const nodeIdInput = page.getByPlaceholder(/22041:218191/);
        await nodeIdInput.fill(figmaUrl);

        const fetchBtn = page.getByRole('button', { name: /데이터 가져오기/ });
        await fetchBtn.click();

        await page.waitForTimeout(500);
        expect(requestedNodeId).toBe('22041:218191');
    });

    test('서버 오류 응답 시 에러 메시지가 표시된다', async ({ page }) => {
        await page.route('**/api/figma/fetch-context', async (route) => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: '프록시 서버 오류' }),
            });
        });

        const nodeIdInput = page.getByPlaceholder(/22041:218191/);
        await nodeIdInput.fill('22041:218191');

        const fetchBtn = page.getByRole('button', { name: /데이터 가져오기/ });
        await fetchBtn.click();

        await expect(page.getByText(/프록시 서버 오류/)).toBeVisible({ timeout: 5000 });
    });

    test('스크린샷 버튼은 미연결 상태에서 비활성화된다', async ({ page }) => {
        const screenshotBtn = page.getByRole('button', { name: /스크린샷/ });
        await expect(screenshotBtn).toBeDisabled();
    });

    test('연결된 상태에서 유효한 Node ID 입력 시 스크린샷 버튼이 활성화된다', async ({ page }) => {
        await page.route('**/api/figma/status', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ connected: true }),
            });
        });

        const applyBtn = page.getByRole('button', { name: /적용/ });
        await applyBtn.click();
        await expect(page.getByText(/연결됨/)).toBeVisible({ timeout: 5000 });

        const nodeIdInput = page.getByPlaceholder(/22041:218191/);
        await nodeIdInput.fill('22041:218191');

        const screenshotBtn = page.getByRole('button', { name: /스크린샷/ });
        await expect(screenshotBtn).toBeEnabled({ timeout: 2000 });
    });
});
