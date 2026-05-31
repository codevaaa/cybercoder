import * as vscode from 'vscode'

/** A nonce for the webview CSP. */
function nonce(): string {
  let t = ''
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) t += chars.charAt(Math.floor(Math.random() * chars.length))
  return t
}

/**
 * Wide chat panel HTML (editor area), styled like Claude Code:
 *  - centered mascot login + empty states
 *  - conversation with streamed code blocks (Copy / Apply)
 *  - composer with +/slash menus, modes menu (Ask/Edit/Plan/Auto/Bypass) +
 *    effort slider, customize/support actions, slash commands
 * The sessions list lives in the activity-bar tree, not here (matches Claude).
 */
export function getChatHtml(webview: vscode.Webview, _extUri: vscode.Uri): string {
  const n = nonce()
  const csp = [
    `default-src 'none'`,
    `img-src ${webview.cspSource} https: data:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${n}'`,
    `font-src ${webview.cspSource}`,
  ].join('; ')

  const mascot = /* html */ `<svg class="mascot" width="74" height="66" viewBox="0 0 17 15" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g fill="#C96442">
      <rect x="3" y="0" width="1" height="1"/><rect x="13" y="0" width="1" height="1"/>
      <rect x="4" y="1" width="1" height="1"/><rect x="12" y="1" width="1" height="1"/>
      <rect x="3" y="2" width="11" height="1"/>
      <rect x="2" y="3" width="2" height="1"/><rect x="6" y="3" width="1" height="1"/><rect x="10" y="3" width="1" height="1"/><rect x="13" y="3" width="2" height="1"/>
      <rect x="1" y="4" width="15" height="1"/><rect x="1" y="5" width="15" height="1"/>
      <rect x="1" y="6" width="3" height="1"/><rect x="6" y="6" width="5" height="1"/><rect x="13" y="6" width="3" height="1"/>
      <rect x="1" y="7" width="1" height="1"/><rect x="3" y="7" width="1" height="1"/><rect x="13" y="7" width="1" height="1"/><rect x="15" y="7" width="1" height="1"/>
      <rect x="5" y="8" width="2" height="1"/><rect x="10" y="8" width="2" height="1"/>
    </g>
  </svg>`

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  :root{
    --accent:#C96442; --accent-hover:#b9573a;
    --bg: var(--vscode-editor-background,#1f1e1d);
    --bg2:#26241f; --fg: var(--vscode-foreground,#e6e3dc);
    --muted:#8a8780; --border:rgba(255,255,255,0.08); --input-bg:#26241f;
  }
  *{box-sizing:border-box}
  body{margin:0;font-family:var(--vscode-font-family);font-size:14px;color:var(--fg);background:var(--bg);height:100vh;display:flex;flex-direction:column;overflow:hidden}
  .titlebar{display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;font-weight:600;font-size:15px;flex-shrink:0}
  .titlebar .star{color:var(--accent)}

  .scroll{flex:1;overflow-y:auto;display:flex;flex-direction:column}
  .wrap{max-width:760px;width:100%;margin:0 auto;padding:0 20px;flex:1;display:flex;flex-direction:column}

  /* centered states */
  .center{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:16px;padding:30px 10px}
  .mascot{image-rendering:pixelated}
  .hint{color:var(--muted);max-width:420px;line-height:1.6}
  .provs{display:flex;flex-direction:column;gap:12px;width:100%;max-width:420px;margin-top:6px}
  .prov{padding:14px 16px;border-radius:10px;border:1px solid var(--border);background:var(--bg2);cursor:pointer;text-align:center}
  .prov.primary{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:700}
  .prov:hover{border-color:var(--accent)}
  .prov .t{font-weight:600}
  .prov .sub{font-size:12px;color:var(--muted);margin-top:3px}
  .prov.primary .sub{color:rgba(255,255,255,.85)}

  .card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px 16px;max-width:460px;text-align:left;position:relative}
  .card h4{margin:0 0 6px;font-size:13.5px;display:flex;align-items:center;gap:7px}
  .card p{margin:0;font-size:13px;color:var(--muted);line-height:1.55}
  .card .x{position:absolute;top:10px;right:12px;cursor:pointer;color:var(--muted)}
  .card a{color:var(--accent);text-decoration:none;cursor:pointer}
  .chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:6px}
  .chip{font-size:12.5px;border:1px solid var(--border);background:var(--bg2);color:var(--fg);padding:7px 12px;border-radius:9px;cursor:pointer}
  .chip:hover{border-color:var(--accent)}

  /* messages */
  .messages{padding:18px 0;display:flex;flex-direction:column;gap:16px}
  .msg{display:flex;flex-direction:column;gap:5px}
  .msg .role{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
  .msg.user .bubble{background:var(--input-bg);border:1px solid var(--border);border-radius:12px;padding:10px 12px;white-space:pre-wrap}
  .msg.assistant .bubble{white-space:pre-wrap;line-height:1.55}
  pre{background:#16140f;border:1px solid var(--border);border-radius:9px;padding:12px;overflow-x:auto}
  pre code{font-family:var(--vscode-editor-font-family,monospace);font-size:12.5px;color:#e0d6cc}
  .code-actions{display:flex;gap:7px;margin-top:7px}
  .typing::after{content:'▋';color:var(--accent);animation:blink 1s steps(2) infinite}
  @keyframes blink{50%{opacity:0}}

  /* composer */
  .composer{flex-shrink:0;padding:14px 0 18px;position:relative}
  .composer-inner{max-width:760px;margin:0 auto;padding:0 20px}
  .composer-box{border:1px solid var(--border);border-radius:14px;background:var(--input-bg);padding:10px 12px}
  .composer-box:focus-within{border-color:var(--accent)}
  textarea{width:100%;resize:none;background:transparent;color:var(--fg);border:none;outline:none;font-family:inherit;font-size:14px;min-height:38px;max-height:200px}
  .crow{display:flex;align-items:center;justify-content:space-between;margin-top:8px}
  .cleft{display:flex;align-items:center;gap:4px}
  .cright{display:flex;align-items:center;gap:10px}
  .mode-ind{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);cursor:pointer;padding:4px 8px;border-radius:7px}
  .mode-ind:hover{background:rgba(255,255,255,0.06);color:var(--fg)}
  .send{width:30px;height:30px;border-radius:8px;background:var(--accent);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px}
  .send:disabled{opacity:.5}
  .sqbtn{width:30px;height:30px;border-radius:7px;background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:17px;display:flex;align-items:center;justify-content:center}
  .sqbtn:hover{background:rgba(255,255,255,0.06);color:var(--fg)}

  .menu{position:absolute;bottom:84px;left:50%;transform:translateX(-50%);width:min(620px,92%);background:var(--bg2);border:1px solid var(--border);border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.55);max-height:340px;overflow-y:auto;z-index:50;padding:6px}
  .menu.hidden{display:none}
  .grouphdr{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);padding:8px 10px 4px}
  .filter{margin:4px;padding:7px 10px;border-radius:7px;background:var(--input-bg);border:1px solid var(--border);display:flex;gap:6px;align-items:center}
  .filter input{flex:1;background:transparent;border:none;outline:none;color:var(--fg);font-size:13px}
  .item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:7px;cursor:pointer}
  .item:hover{background:rgba(255,255,255,0.07)}
  .item .ic{width:18px;color:var(--muted);text-align:center;flex-shrink:0}
  .item .tx{flex:1;min-width:0}
  .item .tt{font-size:13px}
  .item .ds{font-size:11.5px;color:var(--muted);line-height:1.4}
  .item .chk{color:var(--accent)}
  .item .term{color:var(--muted);font-size:11.5px}
  .effort{display:flex;align-items:center;justify-content:space-between;padding:10px}
  .dots{display:flex;gap:6px}
  .dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.18);cursor:pointer}
  .dot.on{background:var(--accent)}
  .err{color:#f08a7a;font-size:13px;text-align:center;padding:6px}
  .hidden{display:none !important}
  .ver{font-size:10px;color:var(--muted);text-align:center;padding-bottom:6px}
</style>
</head>
<body>
  <div class="titlebar"><span class="star">✳</span> CyberCoder</div>

  <div class="scroll">
    <div class="wrap">
      <!-- Login -->
      <div class="center hidden" id="login">
        ${mascot}
        <div class="hint">CyberCoder can be used with your Codeva subscription or billed based on API usage. How do you want to log in?</div>
        <div class="provs">
          <div class="prov primary" data-login="subscription"><div class="t">Codeva Subscription</div><div class="sub">Use your Codeva Pro, Max, or Team plan</div></div>
          <div class="prov" data-login="apikey"><div class="t">API Key</div><div class="sub">Paste a Codeva API key (sk_cyber_…)</div></div>
          <div class="prov" data-login="byok"><div class="t">Anthropic / OpenAI / Ollama ↗</div><div class="sub">Use third-party or local providers</div></div>
        </div>
        <div class="hint" style="font-size:12px">Prefer the terminal? Run <b>cm</b> or <b>codeva</b> in a terminal.</div>
      </div>

      <!-- Empty -->
      <div class="center hidden" id="empty">
        ${mascot}
        <div class="hint">What to do first? Ask about this codebase or we can start writing code.</div>
        <div class="card" id="autoCard">
          <span class="x" id="autoCardX">✕</span>
          <h4><span style="color:var(--accent)">⚡</span> Auto mode is enabled</h4>
          <p>Auto mode lets CyberCoder handle permission prompts automatically. It checks each tool call for risky actions and prompt injection, runs lower-risk ones, and blocks the rest. <a id="autoLearn">Learn more</a></p>
        </div>
        <div class="chips">
          <button class="chip" data-p="Explain what the active file does">Explain this file</button>
          <button class="chip" id="scanChip">🐞 Scan for bugs</button>
          <button class="chip" data-p="Refactor the selected code for readability">Refactor</button>
          <button class="chip" data-p="Write unit tests for the selected code">Write tests</button>
        </div>
      </div>

      <!-- Conversation -->
      <div class="messages hidden" id="messages"></div>
      <div id="errbar" class="err hidden"></div>
    </div>
  </div>

  <!-- Composer -->
  <div class="composer" id="composer">
    <!-- Modes menu -->
    <div class="menu hidden" id="modesMenu">
      <div class="grouphdr">Modes <span style="float:right;text-transform:none">⇧+Tab to switch</span></div>
      <div class="item" data-mode="ask"><span class="ic">✋</span><div class="tx"><div class="tt">Ask before edits</div><div class="ds">Ask for approval before making each edit</div></div><span class="chk" data-chk="ask">✓</span></div>
      <div class="item" data-mode="edit"><span class="ic">&lt;/&gt;</span><div class="tx"><div class="tt">Edit automatically</div><div class="ds">Edit your selected text or the whole file</div></div><span class="chk hidden" data-chk="edit">✓</span></div>
      <div class="item" data-mode="plan"><span class="ic">▤</span><div class="tx"><div class="tt">Plan mode</div><div class="ds">Explore the code and present a plan before editing</div></div><span class="chk hidden" data-chk="plan">✓</span></div>
      <div class="item" data-mode="auto"><span class="ic">⚡</span><div class="tx"><div class="tt">Auto mode</div><div class="ds">Automatically choose the best permission mode</div></div><span class="chk hidden" data-chk="auto">✓</span></div>
      <div class="item" data-mode="bypass"><span class="ic">⛔</span><div class="tx"><div class="tt">Bypass permissions</div><div class="ds">Don't ask for approval before running commands</div></div><span class="chk hidden" data-chk="bypass">✓</span></div>
      <div class="effort"><span style="font-size:13px">Effort <span style="color:var(--muted)" id="effortLbl">(Medium)</span></span><div class="dots" id="effortDots"></div></div>
    </div>

    <!-- Plus / context menu -->
    <div class="menu hidden" id="plusMenu">
      <div class="grouphdr">Context</div>
      <div class="item" data-ctx="attach"><span class="ic">📎</span><div class="tx"><div class="tt">Attach file…</div></div></div>
      <div class="item" data-ctx="mention"><span class="ic">＠</span><div class="tx"><div class="tt">Mention file from this project…</div></div></div>
      <div class="item" data-ctx="clear"><span class="ic">🗑</span><div class="tx"><div class="tt">Clear conversation</div></div></div>
      <div class="item" data-ctx="rewind"><span class="ic">⟲</span><div class="tx"><div class="tt">Rewind</div></div></div>
      <div class="grouphdr">Model</div>
      <div class="item" data-ctx="model"><span class="ic">◇</span><div class="tx"><div class="tt">Switch model…</div></div><span class="term" id="modelLbl">auto</span></div>
      <div class="item" data-ctx="thinking"><span class="ic">✦</span><div class="tx"><div class="tt">Thinking</div></div><span class="term" id="thinkLbl">off</span></div>
      <div class="item" data-ctx="account"><span class="ic">◔</span><div class="tx"><div class="tt">Account & usage…</div></div></div>
      <div class="grouphdr">Customize</div>
      <div class="item" data-ctx="agents"><span class="ic">◈</span><div class="tx"><div class="tt">Agents</div></div></div>
      <div class="item" data-ctx="hooks"><span class="ic">⚓</span><div class="tx"><div class="tt">Hooks</div></div></div>
      <div class="item" data-ctx="memory"><span class="ic">▦</span><div class="tx"><div class="tt">Memory (.cyber)</div></div></div>
      <div class="item" data-ctx="mcp"><span class="ic">⛓</span><div class="tx"><div class="tt">MCP servers</div></div></div>
      <div class="grouphdr">Support</div>
      <div class="item" data-ctx="help"><span class="ic">?</span><div class="tx"><div class="tt">View help docs</div></div></div>
      <div class="item" data-ctx="report"><span class="ic">⚑</span><div class="tx"><div class="tt">Report a problem</div></div><span class="term" id="verLbl"></span></div>
    </div>

    <!-- Slash menu -->
    <div class="menu hidden" id="slashMenu">
      <div class="filter">🔎<input id="slashFilter" placeholder="Filter actions…"/></div>
      <div class="grouphdr">Slash Commands</div>
      <div id="slashList"></div>
    </div>

    <div class="composer-inner">
      <div class="composer-box">
        <textarea id="input" placeholder="Ask CyberCoder to edit…"></textarea>
        <div class="crow">
          <div class="cleft">
            <button class="sqbtn" id="plusBtn" title="Context">＋</button>
            <button class="sqbtn" id="slashBtn" title="Slash commands" style="font-size:14px">⊘</button>
          </div>
          <div class="cright">
            <div class="mode-ind" id="modeInd"><span id="modeIcon">✋</span> <span id="modeName">Ask before edits</span></div>
            <button class="send" id="sendBtn" title="Send">↑</button>
            <button class="sqbtn hidden" id="stopBtn" title="Stop">■</button>
          </div>
        </div>
      </div>
      <div class="ver" id="footerVer"></div>
    </div>
  </div>

<script nonce="${n}">
  const vscode=acquireVsCodeApi(); const $=(id)=>document.getElementById(id)
  let state={signedIn:false,plan:'free',mode:'ask',effort:2,thinking:false,model:'auto',version:'0.1.0',streaming:false}
  let assistantEl=null
  const MODES={ask:{i:'✋',n:'Ask before edits'},edit:{i:'</>',n:'Edit automatically'},plan:{i:'▤',n:'Plan mode'},auto:{i:'⚡',n:'Auto mode'},bypass:{i:'⛔',n:'Bypass permissions'}}
  const SLASH=['/agent-browser','/batch','/clear','/code-review','/compact','/comprehensive-review','/context','/cross-review','/goal','/init','/insights','/loop','/plan','/playwright','/reload-skills','/research','/review','/run','/security-review','/simplify','/skill-creator','/team-onboarding','/usage','/verify','/zen-review']
  const SLASH_ACTIONS={'/security-review':'scanFile','/code-review':'scanFile','/comprehensive-review':'scanWorkspace','/review':'scanFile','/zen-review':'scanWorkspace','/cross-review':'scanWorkspace'}

  function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  function hideMenus(){['modesMenu','plusMenu','slashMenu'].forEach(m=>$(m).classList.add('hidden'))}
  function toggle(id){const el=$(id);const was=el.classList.contains('hidden');hideMenus();if(was)el.classList.remove('hidden')}
  function renderMD(t){return t.split(/(\`\`\`[\\w-]*\\n[\\s\\S]*?\`\`\`)/g).map(p=>{const m=p.match(/^\`\`\`([\\w-]*)\\n([\\s\\S]*?)\`\`\`$/);if(m){return '<pre><code>'+esc(m[2])+'</code></pre><div class="code-actions"><button class="chip copy" style="padding:3px 10px;font-size:11px">Copy</button><button class="chip apply" style="padding:3px 10px;font-size:11px">Apply</button></div>'}return '<span>'+esc(p).replace(/\\n/g,'<br>')+'</span>'}).join('')}
  function wireCode(s){s.querySelectorAll('.code-actions').forEach(b=>{const pre=b.previousElementSibling;const code=pre?pre.innerText:'';const c=b.querySelector('.copy'),a=b.querySelector('.apply');if(c&&!c.dataset.w){c.dataset.w=1;c.onclick=()=>vscode.postMessage({type:'copy',content:code})}if(a&&!a.dataset.w){a.dataset.w=1;a.onclick=()=>vscode.postMessage({type:'applyEdit',content:code})}})}

  function show(){
    const hasMsgs=$('messages').children.length>0
    $('login').classList.toggle('hidden',state.signedIn)
    $('empty').classList.toggle('hidden',!state.signedIn||hasMsgs)
    $('messages').classList.toggle('hidden',!state.signedIn||!hasMsgs)
    $('composer').classList.toggle('hidden',!state.signedIn)
    $('modeIcon').textContent=MODES[state.mode].i;$('modeName').textContent=MODES[state.mode].n
    $('modelLbl').textContent=state.model;$('thinkLbl').textContent=state.thinking?'on':'off'
    $('verLbl').textContent='v'+state.version;$('footerVer').textContent='v'+state.version
  }
  function addMsg(role,text){const el=document.createElement('div');el.className='msg '+role;el.innerHTML='<div class="role">'+(role==='user'?'You':'CyberCoder')+'</div><div class="bubble">'+(role==='user'?esc(text):'')+'</div>';$('messages').appendChild(el);show();$('messages').scrollIntoView(false);el.scrollIntoView({block:'end'});return el}
  function send(){const t=$('input').value.trim();if(!t||state.streaming)return;$('input').value='';hideMenus();vscode.postMessage({type:'send',text:t})}
  function renderEffort(){const d=$('effortDots');d.innerHTML='';['Low','Med-Low','Medium','High','Max'].forEach((lbl,i)=>{const dot=document.createElement('div');dot.className='dot'+(i<=state.effort?' on':'');dot.onclick=()=>{state.effort=i;$('effortLbl').textContent='('+lbl+')';renderEffort();vscode.postMessage({type:'setEffort',value:i})};d.appendChild(dot)})}
  function renderSlash(){const q=($('slashFilter').value||'').toLowerCase();const l=$('slashList');l.innerHTML='';SLASH.filter(s=>s.includes(q)).forEach(s=>{const el=document.createElement('div');el.className='item';el.innerHTML='<span class="tt">'+s+'</span>';el.onclick=()=>{hideMenus();if(SLASH_ACTIONS[s])vscode.postMessage({type:'slash',action:SLASH_ACTIONS[s]});else{$('input').value=s+' ';$('input').focus()}};l.appendChild(el)})}

  $('sendBtn').onclick=send
  $('stopBtn').onclick=()=>vscode.postMessage({type:'stop'})
  $('input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}})
  $('plusBtn').onclick=()=>toggle('plusMenu')
  $('slashBtn').onclick=()=>{renderSlash();toggle('slashMenu')}
  $('modeInd').onclick=()=>{renderEffort();toggle('modesMenu')}
  $('slashFilter').oninput=renderSlash
  $('autoCardX').onclick=()=>$('autoCard').classList.add('hidden')
  $('autoLearn').onclick=()=>vscode.postMessage({type:'ctx',action:'help'})
  $('scanChip').onclick=()=>vscode.postMessage({type:'slash',action:'scanWorkspace'})
  document.querySelectorAll('.chip[data-p]').forEach(c=>c.onclick=()=>{$('input').value=c.dataset.p;$('input').focus()})
  document.querySelectorAll('.prov').forEach(p=>p.onclick=()=>vscode.postMessage({type:'login',method:p.dataset.login}))
  document.querySelectorAll('#modesMenu .item').forEach(it=>it.onclick=()=>{state.mode=it.dataset.mode;document.querySelectorAll('#modesMenu .chk').forEach(c=>c.classList.add('hidden'));const chk=document.querySelector('[data-chk="'+state.mode+'"]');if(chk)chk.classList.remove('hidden');show();hideMenus();vscode.postMessage({type:'setMode',mode:state.mode})})
  document.querySelectorAll('#plusMenu .item').forEach(it=>it.onclick=()=>{hideMenus();vscode.postMessage({type:'ctx',action:it.dataset.ctx})})

  window.addEventListener('message',ev=>{const m=ev.data;switch(m.type){
    case 'authState':state.signedIn=m.signedIn;state.plan=m.plan||'free';if(m.version)state.version=m.version;show();break
    case 'cleared':$('messages').innerHTML='';show();break
    case 'modelChanged':state.model=m.model;show();break
    case 'thinkingChanged':state.thinking=m.value;show();break
    case 'addContext':$('input').value=($('input').value?$('input').value+'\\n':'')+'['+m.label+']';$('input').focus();break
    case 'userMessage':addMsg('user',m.text);break
    case 'assistantStart':state.streaming=true;$('sendBtn').classList.add('hidden');$('stopBtn').classList.remove('hidden');assistantEl=addMsg('assistant','');assistantEl.querySelector('.bubble').classList.add('typing');assistantEl._raw='';break
    case 'assistantChunk':if(assistantEl){assistantEl._raw+=m.text;assistantEl.querySelector('.bubble').innerHTML=renderMD(assistantEl._raw);wireCode(assistantEl);assistantEl.scrollIntoView({block:'end'})}break
    case 'assistantDone':state.streaming=false;$('sendBtn').classList.remove('hidden');$('stopBtn').classList.add('hidden');if(assistantEl){assistantEl.querySelector('.bubble').classList.remove('typing');wireCode(assistantEl)}break
    case 'error':state.streaming=false;$('sendBtn').classList.remove('hidden');$('stopBtn').classList.add('hidden');$('errbar').textContent=m.message;$('errbar').classList.remove('hidden');setTimeout(()=>$('errbar').classList.add('hidden'),6000);break
  }})

  renderEffort();show();vscode.postMessage({type:'ready'})
</script>
</body>
</html>`
}
