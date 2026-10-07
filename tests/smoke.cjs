// 用临时静态服务器验证页面，无应用后端；可通过环境变量改用 file://。
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const http = require('node:http');
const fs = require('node:fs');
(async () => {
  const root=path.resolve(__dirname,'..');
  const server=http.createServer((req,res)=>{
    const file=path.resolve(root,'.'+(req.url==='/'?'/index.html':req.url.split('?')[0]));
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser = await chromium.launch({headless:true,executablePath:process.env.BLOOM_CHROMIUM_PATH||undefined,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  try {
    const page=await browser.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.BLOOM_TEST_FILE?pathToFileURL(path.resolve(__dirname,'../index.html')).href:'http://127.0.0.1:'+server.address().port);
    assert.equal(await page.locator('[data-scene]').count(),5);
    await page.click('[data-difficulty="2"]');
    await page.click('[data-category="shopping"]');
    assert.equal(await page.locator('[data-scene]').count(),1);
    await page.click('[data-scene="shopping"]');
    await page.waitForSelector('#transcript');
    assert.match(await page.locator('.question').innerText(),/sustainable/);
    await page.fill('#transcript','I am agree that sustainable products are more better because they help protect our planet.');
    await page.click('#get-feedback');
    await page.waitForSelector('.correction');
    assert.equal(await page.locator('.correction').count(),2);
    await page.click('#save');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('bloom-practices-v1')||'[]').length===1);
    await page.click('[data-nav="history"]');await page.waitForSelector('.archive');
    await page.click('[data-view]');
    assert.match(await page.locator('.archive-detail').innerText(),/I agree/);
    await page.reload();await page.waitForSelector('.archive');
    assert.equal(await page.locator('.archive').count(),1);
    await page.click('#theme-button');
    assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
    await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    page.once('dialog',d=>d.accept());await page.click('[data-delete]');
    await page.waitForSelector('.empty-history');
    await page.click('[data-nav="home"]');await page.waitForSelector('[data-scene]');
    await page.setViewportSize({width:1440,height:1000});
    if(process.env.BLOOM_SCREENSHOT)await page.screenshot({path:process.env.BLOOM_SCREENSHOT,fullPage:true});
    await page.click('[data-scene="shopping"]');await page.waitForSelector('#record');
    // 排除外部识别服务；用 Chromium 的虚拟麦克风验证真实 MediaRecorder。
    await page.evaluate(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;});
    await page.click('#record');await page.waitForSelector('#record.recording');
    await page.waitForFunction(()=>document.querySelector('#record-time').textContent.startsWith('00:01'));
    await page.click('#record');await page.waitForSelector('audio');
    await page.waitForFunction(()=>!document.querySelector('#transcript').disabled);
    await page.fill('#transcript','I would choose sustainable products because they last longer.');
    await page.click('#get-feedback');await page.waitForSelector('.source-label');await page.click('#save');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('bloom-practices-v1')||'[]')[0]?.audio?.startsWith('data:audio/'));
    await page.click('[data-nav="history"]');await page.waitForSelector('[data-view]');await page.click('[data-view]');
    assert.equal(await page.locator('.archive-detail audio').count(),1);
    // 验证 GPT 协议、错误处理与安全渲染，不调用付费服务。
    await page.click('[data-nav="home"]');await page.click('[data-scene="shopping"]');
    await page.click('#settings-button');await page.selectOption('#feedback-mode','gpt');
    await page.fill('#api-key','test-placeholder');await page.click('#settings-form button[type="submit"]');
    let payload;
    await page.route('https://api.openai.com/v1/chat/completions',async route=>{
      payload=route.request().postDataJSON();
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({choices:[{message:{content:JSON.stringify({errors:[{original:'<script>bad</script>',replacement:'good',reason:'测试安全渲染'}],simple:'I prefer sustainable products.',advanced:'I tend to choose sustainable products because they are durable.',comment:'继续多说长句。',stars:3,note:'仅文字反馈。'})}}]})});
    });
    await page.fill('#transcript','I prefer sustainable products.');await page.click('#get-feedback');
    await page.waitForSelector('.correction');
    assert.equal(payload.model,'gpt-4o-mini');
    assert.equal(JSON.parse(payload.messages[1].content).transcript,'I prefer sustainable products.');
    assert.equal(await page.locator('.correction script').count(),0);
    assert.match(await page.locator('.source-label').innerText(),/GPT/);
    assert.equal(await page.evaluate(()=>JSON.stringify(localStorage).includes('test-placeholder')),false);
    await page.unroute('https://api.openai.com/v1/chat/completions');
    await page.route('https://api.openai.com/v1/chat/completions',route=>route.fulfill({status:401,body:'Unauthorized'}));
    await page.click('#get-feedback');await page.waitForFunction(()=>document.querySelector('#feedback-error').textContent.includes('401'));
    assert.equal(await page.locator('#get-feedback').isEnabled(),true);
    assert.deepEqual(errors,[]);
    console.log('PASS: filters, correction, persistence, history, theme, mobile, deletion, native recording + audio save, mocked GPT + 401 handling, safe rendering; no JS errors');
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
