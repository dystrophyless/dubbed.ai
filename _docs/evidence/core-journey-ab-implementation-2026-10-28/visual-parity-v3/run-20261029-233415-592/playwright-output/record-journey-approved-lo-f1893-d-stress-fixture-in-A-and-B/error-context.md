# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: record-journey.spec.ts >> approved long Russian line is used as an isolated stress fixture in A and B
- Location: e2e\record-journey.spec.ts:1771:1

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator: getByRole('button', { name: 'Записать', exact: true })
Expected: enabled
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeEnabled" getByRole('button', { name: 'Записать', exact: true }) with timeout 5000ms
  - waiting for getByRole('button', { name: 'Записать', exact: true })

```

```yaml
- main:
  - button "Выход"
  - heading "Sintel · The search" [level=1]
  - paragraph: Реплика 3 / 3
  - region "Запись":
    - paragraph: Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.
    - img "Оригинал · Ваш дубль"
    - paragraph: "Исходная звуковая волна с наложением вашего дубля. Прослушивание: оригинал."
    - text: Позиция в диалоговом окне
    - slider "Позиция в диалоговом окне": "0"
    - text: 0:00 / 0:04 Громкость оригинала
    - slider "Громкость оригинала": "0.7"
    - region "Управление записью":
      - button "Назад"
      - button "Оригинал"
      - button "Перезаписать"
      - button "Ваш дубль"
      - button "Далее"
      - text: Новый дубль
      - paragraph: «Далее» сохраняет этот дубль.
```

# Test source

```ts
  1716 | 
  1717 |   await page.getByRole('button', { name: 'Original', exact: true }).click();
  1718 |   await page.getByRole('button', { name: 'Pause', exact: true }).click();
  1719 |   await seek.focus();
  1720 |   await page.keyboard.down('ArrowRight');
  1721 |   await page.getByRole('button', { name: 'Exit', exact: true }).focus();
  1722 |   await page.keyboard.up('ArrowRight');
  1723 |   await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  1724 |   await page.screenshot({ path: path.join(evidenceDirectory, 'IR06-record-seek-cancel-blur-paused.png') });
  1725 | });
  1726 | 
  1727 | test('phone recovery toast expiry preserves the document floor and scroll position', async ({ page, browser }) => {
  1728 |   test.setTimeout(20_000);
  1729 |     await page.setViewportSize({ width: 390, height: 844 });
  1730 |   await page.addInitScript(() => { (window as Window & { __denyMicrophone?: boolean }).__denyMicrophone = true; });
  1731 |   await instrumentNativeMedia(page);
  1732 |   await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  1733 |   await page.getByRole('button', { name: 'Record', exact: true }).click();
  1734 |   const toast = page.locator('.recovery-toast');
  1735 |   await expect(toast).toBeVisible();
  1736 |   await page.waitForTimeout(400);
  1737 |   const before = await page.evaluate(() => ({
  1738 |     scrollY: window.scrollY,
  1739 |     maxScroll: document.documentElement.scrollHeight - window.innerHeight,
  1740 |     scrollHeight: document.documentElement.scrollHeight,
  1741 |   }));
  1742 |   expect(before.scrollY).toBeGreaterThan(0);
  1743 |   await page.screenshot({ path: path.join(evidenceDirectory, 'IR08-phone-denied-toast-before-expiry.png') });
  1744 |   await page.waitForTimeout(8_300);
  1745 |   await expect(toast).toHaveCount(0);
  1746 |   const after = await page.evaluate(() => ({
  1747 |     scrollY: window.scrollY,
  1748 |     maxScroll: document.documentElement.scrollHeight - window.innerHeight,
  1749 |     scrollHeight: document.documentElement.scrollHeight,
  1750 |   }));
  1751 |   await writeFile(path.join(evidenceDirectory, 'IR08-phone-toast-expiry-evidence.json'), JSON.stringify({
  1752 |     date: new Date().toISOString(),
  1753 |     browser: `Chrome ${browser.version()}`,
  1754 |     before,
  1755 |     after,
  1756 |   }, null, 2), 'utf8');
  1757 |   expect(after.scrollY).toBe(before.scrollY);
  1758 |   expect(after.maxScroll).toBe(before.maxScroll);
  1759 |   expect(after.scrollHeight).toBe(before.scrollHeight);
  1760 |   await expect(page.locator('.record-panel .notice')).toContainText('Microphone access was denied or interrupted. Recording did not begin');
  1761 |   await page.screenshot({ path: path.join(evidenceDirectory, 'IR08-phone-denied-toast-after-expiry.png') });
  1762 |   await writeFile(path.join(evidenceDirectory, 'IR08-phone-toast-expiry-evidence.json'), JSON.stringify({
  1763 |     date: new Date().toISOString(),
  1764 |     browser: `Chrome ${browser.version()}`,
  1765 |     before,
  1766 |     after,
  1767 |     durableGuidanceRetained: await page.locator('.record-panel .notice').isVisible(),
  1768 |   }, null, 2), 'utf8');
  1769 | });
  1770 | 
  1771 | test('approved long Russian line is used as an isolated stress fixture in A and B', async ({ page, browser }) => {
  1772 |   test.setTimeout(60_000);
  1773 |   await instrumentNativeMedia(page);
  1774 |   const longSentence = 'Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.';
  1775 |   const measurements: Array<Record<string, unknown>> = [];
  1776 |   for (const layout of ['A', 'B'] as const) {
  1777 |     await page.setViewportSize({ width: 1280, height: 600 });
  1778 |     await page.goto('/');
  1779 |     await expect(page.locator('.home-page')).toBeVisible();
  1780 |     await page.evaluate(({ selectedLayout, fixtureText }) => {
  1781 |       type PreparedWindow = { id: string; text: Record<string, string> };
  1782 |       type Projects = { loadPreparedProject: (...args: unknown[]) => Promise<{ windows: PreparedWindow[] } | null> };
  1783 |       type Services = { projects: Projects };
  1784 |       type Fiber = { alternate?: unknown; child?: unknown; sibling?: unknown; memoizedProps?: unknown };
  1785 |       const root = document.getElementById('root') as (HTMLElement & Record<string, unknown>) | null;
  1786 |       if (!root) throw new Error('The React root is unavailable for the isolated stress fixture.');
  1787 |       const rootKey = Object.keys(root).find((key) => key.startsWith('__reactContainer$'));
  1788 |       if (!rootKey) throw new Error('The active React root fiber is unavailable.');
  1789 |       const pending: unknown[] = [root[rootKey]];
  1790 |       const seen = new Set<unknown>();
  1791 |       let services: Services | null = null;
  1792 |       while (pending.length > 0) {
  1793 |         const fiber = pending.pop() as Fiber | null;
  1794 |         if (!fiber || seen.has(fiber)) continue;
  1795 |         seen.add(fiber);
  1796 |         if (fiber.alternate) pending.push(fiber.alternate);
  1797 |         const props = fiber.memoizedProps as { services?: Services } | null;
  1798 |         if (props?.services?.projects) services = props.services;
  1799 |         if (fiber.child) pending.push(fiber.child);
  1800 |         if (fiber.sibling) pending.push(fiber.sibling);
  1801 |       }
  1802 |       if (!services) throw new Error('The active typed project reader was not found.');
  1803 |       const originalLoad = services.projects.loadPreparedProject.bind(services.projects);
  1804 |       services.projects.loadPreparedProject = async (...args) => {
  1805 |         const project = await originalLoad(...args);
  1806 |         return project ? {
  1807 |           ...project,
  1808 |           windows: project.windows.map((window) => window.id === 'sintel-turn-3'
  1809 |             ? { ...window, text: { ...window.text, ru: fixtureText } }
  1810 |             : window),
  1811 |         } : null;
  1812 |       };
  1813 |       history.pushState({}, '', `/projects/sintel-prepared/record?layout=${selectedLayout}&locale=ru&turn=sintel-turn-3`);
  1814 |       window.dispatchEvent(new PopStateEvent('popstate'));
  1815 |     }, { selectedLayout: layout, fixtureText: longSentence });
> 1816 |     await expect(page.getByRole('button', { name: 'Записать', exact: true })).toBeEnabled();
       |                                                                               ^ Error: expect(locator).toBeEnabled() failed
  1817 |     await expect(page.locator('#dialogue')).toHaveText(longSentence);
  1818 |     await page.evaluate(() => document.fonts.ready);
  1819 |     await expect.poll(() => page.locator('.media-viewport video').evaluate((video: HTMLVideoElement) =>
  1820 |       video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0,
  1821 |     )).toBe(true);
  1822 |     await page.getByRole('button', { name: 'Записать', exact: true }).click();
  1823 |     await waitForSavedCandidate(page, layout);
  1824 | 
  1825 |     for (const viewport of [{ width: 1280, height: 600 }, { width: 1366, height: 650 }, { width: 390, height: 844 }]) {
  1826 |       await page.setViewportSize(viewport);
  1827 |       await page.waitForTimeout(150);
  1828 |       const result = await page.evaluate(() => {
  1829 |         const bounds = (selector: string) => {
  1830 |           const element = document.querySelector(selector);
  1831 |           if (!element) return null;
  1832 |           const rect = element.getBoundingClientRect();
  1833 |           return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  1834 |         };
  1835 |         return {
  1836 |           viewport: { width: innerWidth, height: innerHeight },
  1837 |           text: document.querySelector('#dialogue')?.textContent,
  1838 |           media: bounds('.media-viewport'),
  1839 |           panel: bounds('.performance'),
  1840 |           dialogue: bounds('.script'),
  1841 |           wave: bounds('.waveform-row'),
  1842 |           recordAndTake: ['#record', '#take'].map((selector) => {
  1843 |             const element = document.querySelector(selector);
  1844 |             if (!element) return null;
  1845 |             const rect = element.getBoundingClientRect();
  1846 |             const style = getComputedStyle(element);
  1847 |             return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, paddingTop: style.paddingTop, paddingRight: style.paddingRight };
  1848 |           }),
  1849 |           documentHeight: document.documentElement.scrollHeight,
  1850 |           horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  1851 |         };
  1852 |       });
  1853 |       expect(result.text).toBe(longSentence);
  1854 |       expect(result.horizontalOverflow).toBe(false);
  1855 |       if (layout === 'A' && viewport.width === 390) {
  1856 |         expect(result.recordAndTake).toHaveLength(2);
  1857 |         expect(result.recordAndTake.every((button) => button?.height === 72)).toBe(true);
  1858 |         expect(result.recordAndTake.every((button) => button?.paddingTop === '12px' && button.paddingRight === '8px')).toBe(true);
  1859 |       }
  1860 |       expect(result.dialogue?.bottom ?? Infinity).toBeLessThanOrEqual(result.wave?.y ?? -Infinity);
  1861 |       if (layout === 'A' && viewport.width >= 1248) expect(Math.abs((result.panel?.y ?? -999) - (result.media?.y ?? -1000))).toBeLessThanOrEqual(1);
  1862 |       measurements.push({ layout, ...result });
  1863 |       const name = `ru-long-${layout}-${viewport.width}x${viewport.height}.png`;
  1864 |       await page.screenshot({ path: path.join(evidenceDirectory, name), fullPage: viewport.width < 500 });
  1865 |     }
  1866 |   }
  1867 |   await writeFile(path.join(evidenceDirectory, 'ru-long-stress-fixture-evidence.json'), JSON.stringify({
  1868 |     date: new Date().toISOString(),
  1869 |     browser: `Chrome ${browser.version()}`,
  1870 |     sentence: longSentence,
  1871 |     source: 'isolated in-memory read-port override for sintel-turn-3; production seed text unchanged',
  1872 |     measurements,
  1873 |   }, null, 2), 'utf8');
  1874 | });
  1875 | 
```