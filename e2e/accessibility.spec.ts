import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * E2E: 접근성 검사 (@axe-core/playwright)
 *
 * WCAG 2.1 AA 기준으로 각 탭 패널의 접근성 위반을 검사한다.
 * axe-core를 통해 자동화된 접근성 검사를 수행한다.
 */

test.describe('접근성 검사 (axe-core)', () => {
    test.beforeEach(async ({ page }) => {
        // MCP 상태 API 모킹
        await page.route('**/api/figma/status', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ connected: false }),
            });
        });

        await page.goto('/');
    });

    test('메인 페이지 — WCAG 2.1 AA 접근성 위반 없음', async ({ page }) => {
        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        expect(results.violations).toEqual([]);
    });

    test('탭 내비게이션 — ARIA role=tablist, role=tab 구조 유효성', async ({ page }) => {
        // tablist가 존재하는지 확인
        const tablist = page.getByRole('tablist');
        await expect(tablist).toBeVisible();

        // 모든 탭 버튼 확인
        const tabs = page.getByRole('tab');
        await expect(tabs).toHaveCount(4);

        // 각 탭에 aria-selected 속성이 있는지 확인
        const tabElements = await tabs.all();
        for (const tab of tabElements) {
            const ariaSelected = await tab.getAttribute('aria-selected');
            expect(['true', 'false']).toContain(ariaSelected);
        }
    });

    test('탭 패널 — role=tabpanel 및 aria-labelledby 구조 유효성', async ({ page }) => {
        const tabPanels = page.getByRole('tabpanel');
        const count = await tabPanels.count();
        expect(count).toBeGreaterThanOrEqual(1);

        // 현재 활성 탭 패널에 aria-labelledby가 있는지 확인
        const activePanels = await tabPanels.all();
        for (const panel of activePanels) {
            const ariaLabelledBy = await panel.getAttribute('aria-labelledby');
            expect(ariaLabelledBy).toBeTruthy();
        }
    });

    test('에이전트 탭 — 접근성 위반 없음', async ({ page }) => {
        const agentTab = page.getByRole('tab', { name: /에이전트/i });
        await agentTab.click();

        const results = await new AxeBuilder({ page })
            .include('#panel-AGENT')
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();

        expect(results.violations).toEqual([]);
    });

    test('MCP 탭 — 접근성 위반 없음', async ({ page }) => {
        const mcpTab = page.getByRole('tab', { name: /MCP/i });
        await mcpTab.click();

        const results = await new AxeBuilder({ page })
            .include('#panel-MCP')
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();

        expect(results.violations).toEqual([]);
    });

    test('VIEW 탭 — 접근성 위반 없음 (빈 상태)', async ({ page }) => {
        const viewTab = page.getByRole('tab', { name: /미리보기/i });
        await viewTab.click();

        const results = await new AxeBuilder({ page })
            .include('#panel-VIEW')
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();

        expect(results.violations).toEqual([]);
    });

    test('도움말 탭 — 접근성 위반 없음', async ({ page }) => {
        const helpTab = page.getByRole('tab', { name: /도움말/i });
        await helpTab.click();

        const results = await new AxeBuilder({ page })
            .include('#panel-HELP')
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();

        expect(results.violations).toEqual([]);
    });

    test('키보드 Tab 키로 탭 버튼 포커스 이동이 가능하다', async ({ page }) => {
        // 탭 내비게이션 영역으로 포커스 이동
        const firstTab = page.getByRole('tab').first();
        await firstTab.focus();

        // 포커스가 탭 버튼에 있는지 확인
        await expect(firstTab).toBeFocused();
    });

    test('타이틀 바에 앱 이름이 표시된다', async ({ page }) => {
        await expect(page.getByText('iFigmaLab')).toBeVisible();
    });

    test('img 요소에 alt 텍스트가 있다 (스크린샷 표시 시)', async ({ page }) => {
        // 스크린샷이 있는 경우 alt 텍스트 검증
        // — 실제 스크린샷 없이 axe 전체 검사로 대체
        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a'])
            .disableRules(['color-contrast']) // 색상 대비는 별도 디자인 이슈
            .analyze();

        // image-alt 규칙 위반이 없는지 확인
        const imageAltViolation = results.violations.find(v => v.id === 'image-alt');
        expect(imageAltViolation).toBeUndefined();
    });

    test('form 요소에 레이블이 연결되어 있다', async ({ page }) => {
        const mcpTab = page.getByRole('tab', { name: /MCP/i });
        await mcpTab.click();

        const results = await new AxeBuilder({ page })
            .include('#panel-MCP')
            .withTags(['wcag2a'])
            .analyze();

        // label 연결 위반이 없어야 함
        const labelViolations = results.violations.filter(v =>
            v.id === 'label' || v.id === 'label-content-name-mismatch'
        );
        expect(labelViolations).toHaveLength(0);
    });
});
