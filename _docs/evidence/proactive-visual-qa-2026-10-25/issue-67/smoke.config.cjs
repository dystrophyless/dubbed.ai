const { defineConfig } = require('D:/Program/python/Dubbed/frontend/node_modules/@playwright/test');
module.exports = defineConfig({
 testDir:'D:/Program/python/Dubbed/frontend/e2e',
 testMatch:'runtime-smoke.spec.ts',
 workers:1,
 outputDir:__dirname+'/smoke-output',
 reporter:[['json',{outputFile:__dirname+'/smoke-result.json'}]],
 use:{baseURL:'http://127.0.0.1:4367',browserName:'chromium',launchOptions:{args:['--mute-audio','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}}
});
