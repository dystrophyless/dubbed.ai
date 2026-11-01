const { chromium } = require('D:/Program/python/Dubbed/frontend/node_modules/playwright');
const fs = require('node:fs/promises');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const result = { temp: process.env.TEMP, pages: [] };
  try {
    for (const url of ['http://127.0.0.1:5178/', 'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=A&locale=ru']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.goto(url);
      await page.locator('#record').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const client = await context.newCDPSession(page);
      const sheets = {};
      client.on('CSS.styleSheetAdded', ({header}) => sheets[header.styleSheetId] = header.sourceURL);
      await client.send('DOM.enable');
      await client.send('CSS.enable');
      const { root } = await client.send('DOM.getDocument');
      const values = {};
      for (const selector of ['#record', '#dialogue']) {
        const { nodeId } = await client.send('DOM.querySelector', {nodeId:root.nodeId, selector});
        const matched = await client.send('CSS.getMatchedStylesForNode', {nodeId});
        values[selector] = {
          fonts: (await client.send('CSS.getPlatformFontsForNode', {nodeId})).fonts,
          paddingRules: matched.matchedCSSRules.flatMap(({rule}) => rule.style.cssProperties.filter(p => p.name === 'padding').map(p => ({selector:rule.selectorList.text, value:p.value, source:sheets[rule.styleSheetId], line:(p.range?.startLine ?? 0)+1, media:rule.media})))
        };
      }
      result.pages.push({url, values});
      await context.close();
    }
    await fs.writeFile(__dirname + '/style-diagnostic.json', JSON.stringify(result,null,2));
    console.log(JSON.stringify(result,null,2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
