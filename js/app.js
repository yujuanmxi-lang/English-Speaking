/* 页面状态、浏览器录音和本地存档。密钥仅保存在内存，永不写入 localStorage。 */
(() => {
  'use strict';
  const $=s=>document.querySelector(s), app=$('#app'), storageKey='bloom-practices-v1';
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let records=[], storageAvailable=true;
  try { const data=JSON.parse(localStorage.getItem(storageKey)||'[]'); if(!Array.isArray(data)) throw Error(); records=data.filter(r=>r&&typeof r.id==='string'&&typeof r.text==='string'&&typeof r.scene==='string'&&r.feedback&&Array.isArray(r.feedback.errors)); } catch { storageAvailable=false; }
  const settings={mode:'demo',key:'',model:'gpt-4o-mini'};
  let difficulty=0,category='all',session=null,recorder=null,recognition=null,stream=null,chunks=[],audioBlob=null,audioURL=null,recording=false,starting=false,stopping=false,timer=null,seconds=0,request=null;
  try { document.documentElement.dataset.theme=localStorage.getItem('bloom-theme')||'light'; } catch {}
  function toast(message) { $('#toast').textContent=message; $('#toast').classList.add('visible'); clearTimeout(toast.timeout); toast.timeout=setTimeout(()=>$('#toast').classList.remove('visible'),4200); }
  function stars(n) {return '★'.repeat(n)+'☆'.repeat(3-n);}
  function xp() {return records.reduce((n,r)=>n+(Number(r.feedback.stars)||1)*20,0);}
  function disposeAudio() {if(audioURL) URL.revokeObjectURL(audioURL); audioURL=null;audioBlob=null;}
  function route() {
    if(recording||starting||stopping) {toast('请先结束录音，再切换页面。'); location.hash='#practice';return;}
    if(request) {request.abort();request=null;}
    const page=location.hash.slice(1)||'home';
    document.querySelectorAll('[data-nav]').forEach(e=>e.classList.toggle('active',e.dataset.nav===page));
    if(page==='history') renderHistory();else if(page==='practice'&&session) renderPractice();else renderHome();
  }
  function renderHome() {
    const points=xp(),level=Math.floor(points/100)+1;
    app.innerHTML=`<section class="hero"><div class="eyebrow">YOUR DAILY SPEAKING QUEST <span>✦</span></div><h1>把英语说出口，<br>让自信<span>慢慢开花。</span></h1><p>不必完美，只要开始。每天一小关，收集属于你的表达力。</p><div class="hero-tags"><span>♡ 无压力练习</span><span>✧ 文字纠错</span><span>↗ 每天一点进步</span></div><div class="hero-art" aria-hidden="true"><span class="sparkle s1">✧</span><div class="speech">Hello, world! <span>♡</span></div><div class="flower">✿</div><div class="mini-bubble">You’ve got this ✨</div><span class="sparkle s2">✦</span></div></section><section class="journey glass"><div><span class="level-badge">Lv. ${level}</span><strong>你的口语成长旅程</strong><small>${records.length} 次练习 · ${points} XP</small></div><div class="xp"><div class="xp-label"><span>下一等级</span><span>${points%100} / 100 XP</span></div><progress max="100" value="${points%100}"></progress></div></section><section class="map"><div class="section-heading"><div><div class="eyebrow">CHOOSE YOUR ADVENTURE</div><h2>今天，想去哪里聊聊？</h2></div><span class="tiny-label">15 个关卡等你探索 ✦</span></div><div class="filters"><div class="segmented" aria-label="难度">${['初级','中级','高级'].map((x,i)=>`<button data-difficulty="${i}" class="${difficulty===i?'selected':''}" aria-pressed="${difficulty===i}">${x}</button>`).join('')}</div><div class="category-filters">${['all',...BLOOM_SCENES.map(s=>s.id)].map(id=>`<button data-category="${id}" class="chip ${category===id?'selected':''}" aria-pressed="${category===id}">${id==='all'?'全部场景':BLOOM_SCENES.find(s=>s.id===id).category}</button>`).join('')}</div></div><div class="level-map">${BLOOM_SCENES.filter(s=>category==='all'||s.id===category).map((s,i)=>{const done=records.filter(r=>r.scene===s.id&&r.difficulty===difficulty);const score=done.length?Math.max(...done.map(r=>Number(r.feedback.stars)||1)):0;return `<button class="level-card glass card-${s.id}" data-scene="${s.id}"><div class="card-top"><span class="stage">STAGE ${String(BLOOM_SCENES.indexOf(s)+1).padStart(2,'0')}</span><span>${done.length?'已探索 ♡':'等你开启 ✧'}</span></div><div class="scene-icon">${s.icon}</div><span class="scene-category">${s.category} · ${['初级','中级','高级'][difficulty]}</span><h3>${s.name}</h3><p>${s.description}</p><div class="card-bottom"><span class="stars">${stars(score)}</span><span class="enter">开始冒险 ↗</span></div></button>`;}).join('')}</div><div class="tip">♡ 小小提示：先说一句，再试着加上一个理由。长句子，从小勇气开始。</div></section>`;
    app.querySelectorAll('[data-difficulty]').forEach(b=>b.onclick=()=>{difficulty=Number(b.dataset.difficulty);renderHome();});
    app.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;renderHome();});
    app.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>{disposeAudio();const scene=BLOOM_SCENES.find(s=>s.id===b.dataset.scene);session={scene,difficulty,text:'',feedback:null,saved:false};location.hash='#practice';});
  }
  function feedbackHTML(f) {
    return `<div class="feedback-title"><h3>✧ 你的表达，正在发光</h3><span class="stars">${stars(Number(f.stars)||1)}</span></div><span class="source-label">${escape(f.source)}</span><h4>语法与用词</h4>${f.errors.length?f.errors.map(e=>`<div class="correction"><del>${escape(e.original)}</del> → <strong>${escape(e.replacement)}</strong><p>${escape(e.reason)}</p></div>`).join(''):'<p>本次未检出错误。继续尝试更丰富的表达吧。</p>'}<div class="expression"><span>简单版 · KEEP IT CLEAR</span><p>${escape(f.simple)}</p></div><div class="expression advanced"><span>高级版 · MAKE IT BLOOM</span><p>${escape(f.advanced)}</p></div><p class="encouragement">♡ ${escape(f.comment)}</p><p class="fine">${escape(f.note)} 星级仅体现文本练习表现，不是发音或雅思评分。</p>`;
  }
  function renderPractice() {
    const s=session.scene,q=s.questions[session.difficulty];
    app.innerHTML=`<a class="back" href="#home">← 返回关卡地图</a><div class="section-heading practice-heading"><div><div class="eyebrow">${escape(s.category)} / ${['初级','中级','高级'][session.difficulty]}</div><h1>${s.icon} ${s.name}</h1></div><span class="stars">${stars(session.feedback?session.feedback.stars:0)}</span></div><div class="steps"><span class="done">01 阅读题目</span><span class="${session.text?'done':''}">02 开口表达</span><span class="${session.feedback?'done':''}">03 收获反馈</span></div><div class="practice-grid"><section class="glass practice-panel"><div class="eyebrow">YOUR CONVERSATION STARTS HERE</div><h2>轮到你说啦 <span>♡</span></h2><div class="question"><span class="avatar">✿</span><div><small>Bloom 的问题</small><p>${escape(q[0])}</p></div></div><p class="dialogue">“${escape(q[1])}”</p><div class="record-area"><button id="record" class="record-button" aria-label="开始录音">●</button><strong id="record-status">点击，开始你的表达</strong><span id="record-time">00:00 / 01:00</span><p class="fine">英文识别 · 最长 60 秒 · 也可以直接输入</p></div><div id="audio-container">${audioURL?`<audio controls src="${audioURL}"></audio>`:''}</div><label for="transcript">你的英文表达 <span class="fine">可编辑识别结果</span></label><textarea id="transcript" rows="5" maxlength="6000" placeholder="Speak a little. Grow a little. 或在这里输入英文…">${escape(session.text)}</textarea><p id="interim" class="fine" aria-live="polite"></p><p id="speech-note" class="fine"></p><button id="get-feedback" class="primary wide">获取${settings.mode==='gpt'?' GPT':'演示'}反馈 ✦</button><p id="feedback-error" class="error" role="alert"></p></section><section class="glass feedback-panel" id="feedback-panel">${session.feedback?feedbackHTML(session.feedback):`<div class="empty-feedback"><div class="empty-flower">✧</div><h2>每句话，都有成长空间</h2><p>录音或输入英文后，<br>你的纠错与表达建议会出现在这里。</p><div class="mini-tips"><span>01 先回答问题</span><span>02 加一句 because</span><span>03 分享一个例子</span></div><p class="fine">当前模式：${settings.mode==='gpt'?'GPT 文本反馈':'本地规则演示'}</p></div>`}</section></div><div class="save-bar"><p>✦ 今天的勇气，值得存档。</p><button id="save" class="secondary" ${!session.feedback||session.saved?'disabled':''}>${session.saved?'已存档 ♡':'保存练习 + XP'}</button></div>`;
    $('#transcript').oninput=e=>{session.text=e.target.value;session.feedback=null;session.saved=false;$('#save').disabled=true;$('#feedback-panel').innerHTML='<p>表达已修改，请重新获取反馈。</p>';};
    $('#record').onclick=()=>recording?stopRecording():startRecording();$('#get-feedback').onclick=getFeedback;$('#save').onclick=savePractice;
    const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
    $('#speech-note').textContent=Speech?'语音识别可能依赖浏览器厂商的在线服务；麦克风需授权。':'此浏览器不支持实时识别；仍可录音回放并手动输入英文。推荐 Chrome / Edge。';
  }
  async function startRecording() {
    if(starting||recording||stopping)return;
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('此环境不支持录音。请用 localhost / HTTPS 或手动输入英文。');return;}
    starting=true;$('#record').disabled=true;
    try {
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      chunks=[];seconds=0;disposeAudio();
      recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onstop=()=>{audioBlob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});audioURL=URL.createObjectURL(audioBlob);stream?.getTracks().forEach(t=>t.stop());stream=null;stopping=false;$('#record').disabled=false;$('#audio-container').innerHTML=`<audio controls src="${audioURL}"></audio>`;$('#get-feedback').disabled=false;$('#transcript').disabled=false;};
      recorder.onerror=()=>{stopRecording();toast('录音发生错误，请重新尝试。');};
      recorder.start();recording=true;session.saved=false;$('#save').disabled=true;$('#record').classList.add('recording');$('#record').textContent='■';$('#record-status').textContent='正在聆听，放心说…';$('#get-feedback').disabled=true;$('#transcript').disabled=true;
      timer=setInterval(()=>{seconds++;$('#record-time').textContent=`00:${String(seconds%60).padStart(2,'0')} / 01:00`;if(seconds>=60)stopRecording();},1000);
      const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(Speech) {
        recognition=new Speech();recognition.lang='en-US';recognition.continuous=true;recognition.interimResults=true;
        const currentSession=session;
        recognition.onresult=e=>{if(session!==currentSession)return;let final='',interim='';for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)final+=e.results[i][0].transcript+' ';else interim+=e.results[i][0].transcript;}if(final){currentSession.text=(currentSession.text+' '+final).trim();currentSession.feedback=null;currentSession.saved=false;if($('#transcript'))$('#transcript').value=currentSession.text;if($('#feedback-panel'))$('#feedback-panel').innerHTML='<p>录音结束后获取新的文字反馈。</p>';if($('#save'))$('#save').disabled=true;}if($('#interim'))$('#interim').textContent=interim;};
        recognition.onerror=e=>{if($('#speech-note'))$('#speech-note').textContent='语音识别不可用（'+e.error+'）；录音继续，请结束后手动转写。';};
        recognition.onend=()=>{if(recording)$('#speech-note').textContent='识别已结束，录音仍在继续；缺失的文字可手动补充。';};
        try{recognition.start();}catch{$('#speech-note').textContent='识别启动失败，可录音后手动输入。';}
      }
    } catch(error){stream?.getTracks().forEach(t=>t.stop());stream=null;toast(error.name==='NotAllowedError'?'麦克风权限未获允许，请授权或手动输入。':'无法开启麦克风：'+error.message);}
    finally{starting=false;$('#record').disabled=false;}
  }
  function stopRecording() {
    stopping=true;recording=false;$('#record').disabled=true;clearInterval(timer);recognition?.stop();recognition=null;
    if(recorder?.state==='recording')recorder.stop();
    $('#record').classList.remove('recording');$('#record').textContent='●';$('#record-status').textContent='录音完成，可以回放或重录';
  }
  async function getFeedback() {
    const text=$('#transcript').value.trim();if(!text){toast('先说一点或输入英文，再获取反馈吧。');return;}
    if(text.length>6000){toast('请将表达控制在 6000 字符以内。');return;}
    if(settings.mode==='gpt'&&!settings.key){toast('请在右上角设置中填写自己的 API Key。');$('#settings').showModal();return;}
    session.text=text;const current=session,button=$('#get-feedback');button.disabled=true;$('#transcript').disabled=true;$('#record').disabled=true;button.textContent='正在整理你的表达…';$('#feedback-error').textContent='';
    request=new AbortController();const controller=request;const timeout=setTimeout(()=>controller.abort(),45000);
    try {const result=settings.mode==='gpt'?await gptFeedback(current.scene.questions[current.difficulty][0],text,settings.key,settings.model,controller.signal):demoFeedback(current.scene.questions[current.difficulty][0],text);if(current!==session||!$('#feedback-panel'))return;current.feedback=result;current.saved=false;$('#feedback-panel').innerHTML=feedbackHTML(result);$('#save').disabled=false;$('#save').textContent='保存练习 + XP';app.querySelector('.practice-heading .stars').textContent=stars(result.stars);app.querySelectorAll('.steps span').forEach(e=>e.classList.add('done'));}
    catch(error){if($('#feedback-error'))$('#feedback-error').textContent=error.name==='AbortError'?'请求已取消或超时，请重试。':error.message+' 可切换到本地演示模式。';}
    finally{clearTimeout(timeout);if(request===controller)request=null;if(button.isConnected){button.disabled=false;$('#transcript').disabled=false;$('#record').disabled=false;button.textContent='获取'+(settings.mode==='gpt'?' GPT':'演示')+'反馈 ✦';}}
  }
  const blobData=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
  async function savePractice() {
    if(!session?.feedback||session.saved)return;
    const button=$('#save'),current=session;const snapshot={scene:current.scene.id,name:current.scene.name,difficulty:current.difficulty,question:current.scene.questions[current.difficulty][0],text:current.text,feedback:current.feedback};button.disabled=true;
    try {if(!storageAvailable)throw Error('浏览器存储不可用或存档格式损坏，请检查浏览器设置。');const audio=audioBlob?await blobData(audioBlob):null;const entry={id:window.crypto?.randomUUID?.()||String(Date.now()),date:new Date().toISOString(),...snapshot,audio};const next=[entry,...records];localStorage.setItem(storageKey,JSON.stringify(next));records=next;if(current.text===snapshot.text&&current.feedback===snapshot.feedback)current.saved=true;button.textContent='已存档 ♡';if(location.hash==='#history')renderHistory();toast('练习已保存！获得 '+entry.feedback.stars*20+' XP');}
    catch(error){button.disabled=false;toast(error.name==='QuotaExceededError'?'存储空间不足，录音未保存。请先删除旧存档，或重开关卡仅保存文字。':error.message);}
  }
  function renderHistory() {
    app.innerHTML=`<section class="history-hero"><div class="eyebrow">YOUR MEMORIES, YOUR GROWTH</div><h1>勇气存档 <span>♡</span></h1><p>收藏每一次开口，看见自己的进步。</p><div class="history-stats"><span><strong>${records.length}</strong> 次练习</span><span><strong>${xp()}</strong> XP 已收集</span><span><strong>${new Set(records.map(r=>r.scene)).size}</strong> 个场景已探索</span></div></section><div class="archive-list">${records.length?records.map((r,i)=>`<article class="glass archive"><div class="archive-icon">${BLOOM_SCENES.find(s=>s.id===r.scene)?.icon||'✦'}</div><div class="archive-main"><div class="eyebrow">SAVE ${String(records.length-i).padStart(3,'0')} · ${escape(new Date(r.date).toLocaleString('zh-CN'))}</div><h3>${escape(r.name)} <span class="difficulty-label">${['初级','中级','高级'][r.difficulty]||''}</span></h3><p>${escape(r.text.slice(0,110))}</p><span class="stars">${stars(Number(r.feedback.stars)||1)}</span></div><div class="archive-actions"><button class="secondary" data-view="${escape(r.id)}">打开存档 ↗</button><button class="text-button" data-delete="${escape(r.id)}">删除</button></div><div class="archive-detail" id="detail-${escape(r.id)}" hidden><h4>原题</h4><p>${escape(r.question)}</p><h4>我的表达</h4><p>${escape(r.text)}</p>${typeof r.audio==='string'&&/^data:audio\/[\w.+-]+(?:;codecs=[\w.,+-]+)?;base64,[A-Za-z0-9+/=]+$/.test(r.audio)?`<audio controls src="${escape(r.audio)}"></audio>`:'<p class="fine">此次练习未保存录音。</p>'}${feedbackHTML(r.feedback)}</div></article>`).join(''):`<div class="glass empty-history"><div class="empty-flower">♡</div><h2>你的第一个存档，正在路上</h2><p>完成一关并保存，成长故事就从这里开始。</p><a class="primary" href="#home">开启第一关 ↗</a></div>`}</div><p class="fine history-note">存档仅保存在当前浏览器。清除网站数据会删除记录；录音占用空间较多，可按需删除旧存档。</p>`;
    app.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{const detail=document.getElementById('detail-'+b.dataset.view);detail.hidden=!detail.hidden;b.textContent=detail.hidden?'打开存档 ↗':'收起存档 ↑';});
    app.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{if(!confirm('确定删除这条练习及录音吗？此操作无法撤销。'))return;const next=records.filter(r=>r.id!==b.dataset.delete);try{localStorage.setItem(storageKey,JSON.stringify(next));records=next;renderHistory();toast('存档已删除。');}catch{toast('删除失败，浏览器存储不可用。');}});
  }
  $('#settings-button').onclick=()=>$('#settings').showModal();$('#close-settings').onclick=()=>$('#settings').close();
  $('#settings-form').onsubmit=e=>{e.preventDefault();settings.mode=$('#feedback-mode').value;settings.key=$('#api-key').value.trim();settings.model=$('#model').value.trim()||'gpt-4o-mini';if(request){request.abort();request=null;}$('#settings').close();toast('设置已保存，密钥仅在当前页面内存中保留。');if(location.hash==='#practice'&&!recording&&!starting&&!stopping)renderPractice();};
  $('#theme-button').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('bloom-theme',theme);}catch{}$('#theme-button').textContent=theme==='dark'?'☀':'☾';};
  window.addEventListener('hashchange',route);
  window.addEventListener('beforeunload',e=>{if(recording||starting||session&& !session.saved&&(session.text||audioBlob)){e.preventDefault();e.returnValue='';}});
  route();if(!storageAvailable)toast('本地存储不可用或存档数据损坏；练习仍可进行，但无法保存。');
})();
