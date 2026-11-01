# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: record-journey.spec.ts >> approved long Russian line is used as an isolated stress fixture in A and B
- Location: e2e\record-journey.spec.ts:1769:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: locator('.dialogue-copy p')
Expected: "Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад."
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" locator('.dialogue-copy p') with timeout 5000ms
  - waiting for locator('.dialogue-copy p')

```

```yaml
- main:
  - button "Выход"
  - heading "Sintel · The search" [level=1]
  - region "Запись":
    - paragraph: Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.
    - img "Оригинал"
    - paragraph: "Исходная звуковая волна. Прослушивание: оригинал."
    - text: Позиция в диалоговом окне
    - slider "Позиция в диалоговом окне": "0"
    - text: 0:00 / 0:04 Громкость оригинала
    - slider "Громкость оригинала": "0.7"
    - complementary "Управление записью":
      - text: Реплика 3 / 3
      - button "Оригинал"
      - button "Записать"
      - button "Ваш дубль" [disabled]
      - paragraph: Запишите эту реплику, чтобы продолжить.
      - button "Назад"
      - button "Далее" [disabled]
```

# Test source

```ts
  1715 |   await page.getByRole('button', { name: 'Original', exact: true }).click();
  1716 |   await page.getByRole('button', { name: 'Pause', exact: true }).click();
  1717 |   await seek.focus();
  1718 |   await page.keyboard.down('ArrowRight');
  1719 |   await page.getByRole('button', { name: 'Exit', exact: true }).focus();
  1720 |   await page.keyboard.up('ArrowRight');
  1721 |   await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  1722 |   await page.screenshot({ path: path.join(evidenceDirectory, 'IR06-record-seek-cancel-blur-paused.png') });
  1723 | });
  1724 | 
  1725 | test('phone recovery toast expiry preserves the document floor and scroll position', async ({ page, browser }) => {
  1726 |   test.setTimeout(20_000);
  1727 |   await page.setViewportSize({ width: 390, height: 667 });
  1728 |   await page.addInitScript(() => { (window as Window & { __denyMicrophone?: boolean }).__denyMicrophone = true; });
  1729 |   await instrumentNativeMedia(page);
  1730 |   await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  1731 |   await page.getByRole('button', { name: 'Record', exact: true }).click();
  1732 |   const toast = page.locator('.recovery-toast');
  1733 |   await expect(toast).toBeVisible();
  1734 |   await page.waitForTimeout(400);
  1735 |   const before = await page.evaluate(() => ({
  1736 |     scrollY: window.scrollY,
  1737 |     maxScroll: document.documentElement.scrollHeight - window.innerHeight,
  1738 |     scrollHeight: document.documentElement.scrollHeight,
  1739 |   }));
  1740 |   expect(before.scrollY).toBeGreaterThan(0);
  1741 |   await page.screenshot({ path: path.join(evidenceDirectory, 'IR08-phone-denied-toast-before-expiry.png') });
  1742 |   await page.waitForTimeout(8_300);
  1743 |   await expect(toast).toHaveCount(0);
  1744 |   const after = await page.evaluate(() => ({
  1745 |     scrollY: window.scrollY,
  1746 |     maxScroll: document.documentElement.scrollHeight - window.innerHeight,
  1747 |     scrollHeight: document.documentElement.scrollHeight,
  1748 |   }));
  1749 |   await writeFile(path.join(evidenceDirectory, 'IR08-phone-toast-expiry-evidence.json'), JSON.stringify({
  1750 |     date: new Date().toISOString(),
  1751 |     browser: `Chrome ${browser.version()}`,
  1752 |     before,
  1753 |     after,
  1754 |   }, null, 2), 'utf8');
  1755 |   expect(after.scrollY).toBe(before.scrollY);
  1756 |   expect(after.maxScroll).toBe(before.maxScroll);
  1757 |   expect(after.scrollHeight).toBe(before.scrollHeight);
  1758 |   await expect(page.locator('.record-panel .notice')).toContainText('Microphone access was denied or interrupted. Recording did not begin');
  1759 |   await page.screenshot({ path: path.join(evidenceDirectory, 'IR08-phone-denied-toast-after-expiry.png') });
  1760 |   await writeFile(path.join(evidenceDirectory, 'IR08-phone-toast-expiry-evidence.json'), JSON.stringify({
  1761 |     date: new Date().toISOString(),
  1762 |     browser: `Chrome ${browser.version()}`,
  1763 |     before,
  1764 |     after,
  1765 |     durableGuidanceRetained: await page.locator('.record-panel .notice').isVisible(),
  1766 |   }, null, 2), 'utf8');
  1767 | });
  1768 | 
  1769 | test('approved long Russian line is used as an isolated stress fixture in A and B', async ({ page, browser }) => {
  1770 |   test.setTimeout(60_000);
  1771 |   await instrumentNativeMedia(page);
  1772 |   const longSentence = 'Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.';
  1773 |   const measurements: Array<Record<string, unknown>> = [];
  1774 |   for (const layout of ['A', 'B'] as const) {
  1775 |     await page.setViewportSize({ width: 1280, height: 600 });
  1776 |     await page.goto('/');
  1777 |     await expect(page.locator('.home-page')).toBeVisible();
  1778 |     await page.evaluate(({ selectedLayout, fixtureText }) => {
  1779 |       type PreparedWindow = { id: string; text: Record<string, string> };
  1780 |       type Projects = { loadPreparedProject: (...args: unknown[]) => Promise<{ windows: PreparedWindow[] } | null> };
  1781 |       type Services = { projects: Projects };
  1782 |       type Fiber = { alternate?: unknown; child?: unknown; sibling?: unknown; memoizedProps?: unknown };
  1783 |       const root = document.getElementById('root') as (HTMLElement & Record<string, unknown>) | null;
  1784 |       if (!root) throw new Error('The React root is unavailable for the isolated stress fixture.');
  1785 |       const rootKey = Object.keys(root).find((key) => key.startsWith('__reactContainer$'));
  1786 |       if (!rootKey) throw new Error('The active React root fiber is unavailable.');
  1787 |       const pending: unknown[] = [root[rootKey]];
  1788 |       const seen = new Set<unknown>();
  1789 |       let services: Services | null = null;
  1790 |       while (pending.length > 0) {
  1791 |         const fiber = pending.pop() as Fiber | null;
  1792 |         if (!fiber || seen.has(fiber)) continue;
  1793 |         seen.add(fiber);
  1794 |         if (fiber.alternate) pending.push(fiber.alternate);
  1795 |         const props = fiber.memoizedProps as { services?: Services } | null;
  1796 |         if (props?.services?.projects) services = props.services;
  1797 |         if (fiber.child) pending.push(fiber.child);
  1798 |         if (fiber.sibling) pending.push(fiber.sibling);
  1799 |       }
  1800 |       if (!services) throw new Error('The active typed project reader was not found.');
  1801 |       const originalLoad = services.projects.loadPreparedProject.bind(services.projects);
  1802 |       services.projects.loadPreparedProject = async (...args) => {
  1803 |         const project = await originalLoad(...args);
  1804 |         return project ? {
  1805 |           ...project,
  1806 |           windows: project.windows.map((window) => window.id === 'sintel-turn-3'
  1807 |             ? { ...window, text: { ...window.text, ru: fixtureText } }
  1808 |             : window),
  1809 |         } : null;
  1810 |       };
  1811 |       history.pushState({}, '', `/projects/sintel-prepared/record?layout=${selectedLayout}&locale=ru&turn=sintel-turn-3`);
  1812 |       window.dispatchEvent(new PopStateEvent('popstate'));
  1813 |     }, { selectedLayout: layout, fixtureText: longSentence });
  1814 |     await expect(page.getByRole('button', { name: 'Записать', exact: true })).toBeEnabled();
> 1815 |     await expect(page.locator('.dialogue-copy p')).toHaveText(longSentence);
       |                                                    ^ Error: expect(locator).toHaveText(expected) failed
  1816 |     await page.evaluate(() => document.fonts.ready);
  1817 |     await expect.poll(() => page.locator('.media-viewport video').evaluate((video: HTMLVideoElement) =>
  1818 |       video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0,
  1819 |     )).toBe(true);
  1820 |     await page.getByRole('button', { name: 'Записать', exact: true }).click();
  1821 |     await waitForSavedCandidate(page, layout);
  1822 | 
  1823 |     for (const viewport of [{ width: 1280, height: 600 }, { width: 1366, height: 650 }, { width: 390, height: 667 }]) {
  1824 |       await page.setViewportSize(viewport);
  1825 |       await page.waitForTimeout(150);
  1826 |       const result = await page.evaluate(() => {
  1827 |         const bounds = (selector: string) => {
  1828 |           const element = document.querySelector(selector);
  1829 |           if (!element) return null;
  1830 |           const rect = element.getBoundingClientRect();
  1831 |           return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  1832 |         };
  1833 |         return {
  1834 |           viewport: { width: innerWidth, height: innerHeight },
  1835 |           text: document.querySelector('.dialogue-copy p')?.textContent,
  1836 |           media: bounds('.media-viewport'),
  1837 |           panel: bounds('.record-panel'),
  1838 |           dialogue: bounds('.dialogue-copy'),
  1839 |           wave: bounds('.waveform-row'),
  1840 |           recordAndTake: ['#record', '#take'].map((selector) => {
  1841 |             const element = document.querySelector(selector);
  1842 |             if (!element) return null;
  1843 |             const rect = element.getBoundingClientRect();
  1844 |             const style = getComputedStyle(element);
  1845 |             return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, paddingTop: style.paddingTop, paddingRight: style.paddingRight };
  1846 |           }),
  1847 |           documentHeight: document.documentElement.scrollHeight,
  1848 |           horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  1849 |         };
  1850 |       });
  1851 |       expect(result.text).toBe(longSentence);
  1852 |       expect(result.horizontalOverflow).toBe(false);
  1853 |       if (layout === 'A' && viewport.width === 390) {
  1854 |         expect(result.recordAndTake).toHaveLength(2);
  1855 |         expect(result.recordAndTake.every((button) => button?.height === 72)).toBe(true);
  1856 |         expect(result.recordAndTake.every((button) => button?.paddingTop === '12px' && button.paddingRight === '8px')).toBe(true);
  1857 |       }
  1858 |       expect(result.dialogue?.bottom ?? Infinity).toBeLessThanOrEqual(result.wave?.y ?? -Infinity);
  1859 |       if (layout === 'A' && viewport.width >= 1248) expect(Math.abs((result.panel?.y ?? -999) - (result.media?.y ?? -1000))).toBeLessThanOrEqual(1);
  1860 |       measurements.push({ layout, ...result });
  1861 |       const name = `ru-long-${layout}-${viewport.width}x${viewport.height}.png`;
  1862 |       await page.screenshot({ path: path.join(evidenceDirectory, name), fullPage: viewport.width < 500 });
  1863 |     }
  1864 |   }
  1865 |   await writeFile(path.join(evidenceDirectory, 'ru-long-stress-fixture-evidence.json'), JSON.stringify({
  1866 |     date: new Date().toISOString(),
  1867 |     browser: `Chrome ${browser.version()}`,
  1868 |     sentence: longSentence,
  1869 |     source: 'isolated in-memory read-port override for sintel-turn-3; production seed text unchanged',
  1870 |     measurements,
  1871 |   }, null, 2), 'utf8');
  1872 | });
  1873 | 
```