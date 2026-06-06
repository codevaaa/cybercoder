import * as vscode from 'vscode'

function nonce(): string {
  let t = ''
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) t += chars.charAt(Math.floor(Math.random() * chars.length))
  return t
}

/**
 * Complete UI rewrite — pixel-perfect Claude Code layout with:
 * - Collapsible tool steps with timing
 * - Thinking animation (bouncing dots)
 * - Memory prompt on empty state
 * - Inline diff rendering
 * - Mode highlight with active background
 * - Effort slider mapped to temperature
 * - CLI bridge status indicator
 * - Smooth animations
 */
export function getChatHtml(webview: vscode.Webview, _extUri: vscode.Uri): string {
  const n = nonce()
  const csp = [
    `default-src 'none'`,
    `img-src ${webview.cspSource} https: data:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${n}'`,
    `font-src ${webview.cspSource} https:`,
  ].join('; ')

  const mascotSvg = `<svg class="mascot" width="48" height="44" viewBox="0 0 17 15" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="#C96442"><rect x="3" y="0" width="1" height="1"/><rect x="13" y="0" width="1" height="1"/><rect x="4" y="1" width="1" height="1"/><rect x="12" y="1" width="1" height="1"/><rect x="3" y="2" width="11" height="1"/><rect x="2" y="3" width="2" height="1"/><rect x="6" y="3" width="1" height="1"/><rect x="10" y="3" width="1" height="1"/><rect x="13" y="3" width="2" height="1"/><rect x="1" y="4" width="15" height="1"/><rect x="1" y="5" width="15" height="1"/><rect x="1" y="6" width="3" height="1"/><rect x="6" y="6" width="5" height="1"/><rect x="13" y="6" width="3" height="1"/><rect x="1" y="7" width="1" height="1"/><rect x="3" y="7" width="1" height="1"/><rect x="13" y="7" width="1" height="1"/><rect x="15" y="7" width="1" height="1"/><rect x="5" y="8" width="2" height="1"/><rect x="10" y="8" width="2" height="1"/></g></svg>`

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="Content-Security-Policy" content="${csp}"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
:root{--accent:#C96442;--accent-hover:#d4714f;--accent-glow:rgba(201,100,66,0.15);--bg:var(--vscode-editor-background,#1a1918);--bg2:#222120;--bg3:#2a2826;--fg:var(--vscode-foreground,#e8e4de);--muted:#9a9590;--dim:#6b6560;--border:rgba(255,255,255,0.07);--success:#4ade80;--error:#f87171;--purple:#8B5CF6;--r-sm:6px;--r-md:10px;--r-lg:14px;--r-xl:18px;--ease:cubic-bezier(0.16,1,0.3,1)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',sans-serif;font-size:14px;line-height:1.5;color:var(--fg);background:var(--bg);height:100vh;display:flex;flex-direction:column;overflow:hidden;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.18)}
.scroll{flex:1;overflow-y:auto;display:flex;flex-direction:column}
.wrap{max-width:780px;width:100%;margin:0 auto;padding:0 24px;flex:1;display:flex;flex-direction:column}
.center{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:20px;padding:40px 16px}
.mascot-wrap{width:80px;height:80px;display:flex;align-items:center;justify-content:center;border-radius:20px;background:var(--bg2);border:1px solid var(--border)}
.hint{color:var(--muted);max-width:400px;line-height:1.7;font-size:14px}.hint b{color:var(--fg);font-weight:600}
.provs{display:flex;flex-direction:column;gap:10px;width:100%;max-width:380px;margin-top:8px}
.prov{padding:14px 18px;border-radius:var(--r-lg);border:1px solid var(--border);background:var(--bg2);cursor:pointer;text-align:center;transition:all .2s var(--ease)}
.prov:hover{border-color:var(--accent);transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.3)}
.prov.primary{background:var(--accent);border-color:var(--accent);color:#fff}.prov.primary:hover{background:var(--accent-hover)}
.prov .t{font-weight:600;font-size:14px}.prov .sub{font-size:12px;color:var(--muted);margin-top:3px}.prov.primary .sub{color:rgba(255,255,255,.8)}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r-lg);padding:16px 18px;max-width:440px;text-align:left;position:relative;transition:border-color .2s}
.card:hover{border-color:rgba(255,255,255,.12)}
.card h4{margin:0 0 8px;font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:8px}
.card p{margin:0;font-size:13px;color:var(--muted);line-height:1.6}
.card .x{position:absolute;top:12px;right:14px;cursor:pointer;color:var(--dim);font-size:16px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:var(--r-sm);transition:all .15s}
.card .x:hover{background:rgba(255,255,255,.06);color:var(--fg)}
.card a{color:var(--accent);text-decoration:none;cursor:pointer;font-weight:500}.card a:hover{text-decoration:underline}
.chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:10px}
.chip{font-size:12.5px;border:1px solid var(--border);background:var(--bg2);color:var(--fg);padding:8px 14px;border-radius:20px;cursor:pointer;transition:all .2s var(--ease);font-weight:500}
.chip:hover{border-color:var(--accent);background:var(--accent-glow);transform:translateY(-1px)}
.messages{padding:20px 0;display:flex;flex-direction:column;gap:20px}
.msg{display:flex;flex-direction:column;gap:6px;animation:fadeIn .3s var(--ease)}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.msg .role{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--dim);font-weight:600}
.msg.user .bubble{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r-lg);padding:12px 14px;white-space:pre-wrap;font-size:14px;line-height:1.6}
.msg.assistant .bubble{white-space:pre-wrap;line-height:1.65;font-size:14px}
pre{background:#141210;border:1px solid var(--border);border-radius:var(--r-md);padding:14px 16px;overflow-x:auto;margin:8px 0}
pre code{font-family:'JetBrains Mono','Fira Code',var(--vscode-editor-font-family,monospace);font-size:12.5px;color:#e0d6cc;line-height:1.6}
.code-header{display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:rgba(255,255,255,.03);border:1px solid var(--border);border-bottom:none;border-radius:var(--r-md) var(--r-md) 0 0;margin-top:8px}
.code-header+pre{border-radius:0 0 var(--r-md) var(--r-md);margin-top:0}
.code-lang{font-size:11px;color:var(--dim);font-weight:500;text-transform:uppercase;letter-spacing:.05em}
.code-actions{display:flex;gap:6px}
.code-btn{font-size:11px;padding:4px 10px;border-radius:var(--r-sm);border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;font-weight:500;transition:all .15s}
.code-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-glow)}
.tool-step{border:1px solid var(--border);border-radius:var(--r-md);margin:4px 0;overflow:hidden;transition:border-color .2s}
.tool-step.running{border-color:rgba(201,100,66,.3)}
.tool-step.ok{border-color:rgba(74,222,128,.2)}
.tool-step.fail{border-color:rgba(248,113,113,.2)}
.tool-header{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;transition:background .15s}
.tool-header:hover{background:rgba(255,255,255,.03)}
.tool-icon{width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
.tool-icon.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.tool-name{font-size:13px;font-weight:500;color:var(--fg);flex:1}
.tool-time{font-size:11px;color:var(--dim);font-family:'JetBrains Mono',monospace}
.tool-chevron{color:var(--dim);font-size:12px;transition:transform .2s}
.tool-step.expanded .tool-chevron{transform:rotate(90deg)}
.tool-body{display:none;padding:0 14px 12px;font-size:12px;color:var(--muted);font-family:'JetBrains Mono',monospace;white-space:pre-wrap;max-height:200px;overflow-y:auto;border-top:1px solid var(--border);padding-top:10px}
.tool-step.expanded .tool-body{display:block}
.thinking{display:inline-flex;align-items:center;gap:4px;padding:8px 0}
.thinking .dot{width:6px;height:6px;border-radius:50%;background:var(--accent);animation:bounce 1.4s ease-in-out infinite}
.thinking .dot:nth-child(2){animation-delay:.16s}
.thinking .dot:nth-child(3){animation-delay:.32s}
@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-8px)}}
.typing-cursor::after{content:'▋';color:var(--accent);animation:blink 1s steps(2) infinite;margin-left:2px}
@keyframes blink{50%{opacity:0}}
.diff-block{border-radius:var(--r-md);overflow:hidden;margin:8px 0;border:1px solid var(--border);font-family:'JetBrains Mono',monospace;font-size:12px}
.diff-header{padding:8px 12px;background:rgba(255,255,255,.03);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.diff-file{font-size:12px;color:var(--muted);font-weight:500}
.diff-line{padding:1px 12px;white-space:pre}
.diff-add{background:rgba(74,222,128,.08);color:#86efac}
.diff-del{background:rgba(248,113,113,.08);color:#fca5a5}
.diff-ctx{color:var(--dim)}
.composer{flex-shrink:0;padding:16px 0 20px;position:relative}
.composer-inner{max-width:780px;margin:0 auto;padding:0 24px}
.composer-box{border:2px solid var(--accent);border-radius:var(--r-xl);background:var(--bg2);padding:12px 14px;transition:all .2s var(--ease);box-shadow:0 0 0 0 var(--accent-glow)}
.composer-box:focus-within{box-shadow:0 0 0 4px var(--accent-glow);border-color:var(--accent-hover)}
textarea{width:100%;resize:none;background:transparent;color:var(--fg);border:none;outline:none;font-family:inherit;font-size:14px;line-height:1.5;min-height:40px;max-height:200px}
textarea::placeholder{color:var(--dim)}
.crow{display:flex;align-items:center;justify-content:space-between;margin-top:10px}
.cleft{display:flex;align-items:center;gap:2px}
.cright{display:flex;align-items:center;gap:8px}
.sqbtn{width:32px;height:32px;border-radius:var(--r-sm);background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all .15s}
.sqbtn:hover{background:rgba(255,255,255,.06);color:var(--fg)}
.send{width:32px;height:32px;border-radius:var(--r-sm);background:var(--accent);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;transition:all .15s}
.send:hover{background:var(--accent-hover);transform:scale(1.05)}
.send:disabled{opacity:.4;transform:none;cursor:default}
.mode-ind{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted);cursor:pointer;padding:5px 10px;border-radius:var(--r-sm);transition:all .15s;font-weight:500;border:1px solid transparent}
.mode-ind:hover{background:rgba(255,255,255,.06);color:var(--fg)}
.menu{position:absolute;bottom:90px;left:50%;transform:translateX(-50%);width:min(700px,92%);background:var(--bg2);border:1px solid var(--border);border-radius:var(--r-xl);box-shadow:0 20px 50px rgba(0,0,0,.5);max-height:400px;overflow-y:auto;z-index:50;padding:8px;animation:menuIn .2s var(--ease)}
@keyframes menuIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.menu.hidden{display:none}
.grouphdr{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--dim);padding:10px 12px 6px;font-weight:600}
.filter{margin:4px 4px 8px;padding:8px 12px;border-radius:var(--r-md);background:var(--bg3);border:1px solid var(--border);display:flex;gap:8px;align-items:center}
.filter input{flex:1;background:transparent;border:none;outline:none;color:var(--fg);font-size:13px}
.item{display:flex;align-items:flex-start;gap:12px;padding:10px 12px;border-radius:var(--r-md);cursor:pointer;transition:all .12s}
.item:hover{background:rgba(255,255,255,.05)}
.item .ic{width:24px;height:24px;color:var(--dim);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;margin-top:1px}
.item .tx{flex:1;min-width:0}
.item .tt{font-size:13.5px;font-weight:500;color:var(--fg)}
.item .ds{font-size:12px;color:var(--muted);line-height:1.5;margin-top:2px}
.item .chk{color:var(--accent);font-size:16px;font-weight:700}
.item .term{color:var(--dim);font-size:12px;font-family:'JetBrains Mono',monospace}
.effort{display:flex;align-items:center;justify-content:space-between;padding:12px 12px 8px;border-top:1px solid var(--border);margin-top:4px}
.effort-label{font-size:13px;font-weight:500}
.effort-val{color:var(--muted);font-size:12px;margin-left:6px}
.dots{display:flex;gap:6px}
.dot{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.12);cursor:pointer;transition:all .2s var(--ease)}
.dot:hover{background:rgba(139,92,246,.4);transform:scale(1.2)}
.dot.on{background:var(--purple);box-shadow:0 0 8px rgba(139,92,246,.4)}
.err{color:var(--error);font-size:13px;text-align:center;padding:8px 16px;background:rgba(248,113,113,.08);border-radius:var(--r-md);margin:8px 0;animation:fadeIn .2s}
.hidden{display:none !important}
.ver{font-size:10px;color:var(--dim);text-align:center;padding-top:8px}
.cli-badge{display:inline-flex;align-items:center;gap:4px;font-size:10px;background:rgba(74,222,128,.1);color:var(--success);padding:2px 8px;border-radius:10px;font-weight:600}
.cli-badge.off{background:rgba(255,255,255,.05);color:var(--dim)}
</style>
</head>
<body>
<div class="scroll"><div class="wrap">
<!-- Login -->
<div class="center hidden" id="login">
<div class="mascot-wrap">${mascotSvg}</div>
<div class="hint">CyberCoder can be used with your <b>Codeva subscription</b> or billed based on API usage.</div>
<div class="provs">
<div class="prov primary" data-login="subscription"><div class="t">Codeva Subscription</div><div class="sub">Use your Codeva Pro, Max, or Team plan</div></div>
<div class="prov" data-login="apikey"><div class="t">API Key</div><div class="sub">Paste a Codeva API key (sk_cyber_…)</div></div>
<div class="prov" data-login="byok"><div class="t">Anthropic / OpenAI / Groq / Ollama ↗</div><div class="sub">Use third-party or local providers (BYOK)</div></div>
</div>
<div class="hint" style="font-size:12px;margin-top:12px">Prefer the terminal? Run <b>cm</b> or <b>cybercoder</b> in a terminal.</div>
</div>
<!-- Empty -->
<div class="center hidden" id="empty">
<div class="mascot-wrap">${mascotSvg}</div>
<div class="hint">What can I help you with? Ask about this codebase, write code, or run commands.</div>
<div class="card" id="memoryCard"><span class="x" id="memoryCardX">✕</span><h4><span style="color:var(--accent)">💡</span> Tired of repeating yourself?</h4><p>CyberCoder can remember what you've told it. Project memory lives in <b>.cyber/</b> — it learns your preferences automatically. <a id="memoryLearn">Learn more</a></p></div>
<div class="card" id="autoCard" style="margin-top:8px"><span class="x" id="autoCardX">✕</span><h4><span style="color:var(--accent)">⚡</span> Auto mode is enabled</h4><p>Auto mode handles permission prompts automatically — runs low-risk actions, blocks risky ones. <a id="autoLearn">Learn more</a></p></div>
<div class="chips">
<button class="chip" data-p="Explain what the active file does">Explain this file</button>
<button class="chip" id="scanChip">🐞 Scan for bugs</button>
<button class="chip" data-p="Refactor the selected code for readability">Refactor</button>
<button class="chip" data-p="Write unit tests for the selected code">Write tests</button>
<button class="chip" data-p="Find and fix all TODO/FIXME items in this project">Fix TODOs</button>
</div>
</div>
<!-- Messages -->
<div class="messages hidden" id="messages"></div>
<div id="errbar" class="err hidden"></div>
</div></div>
<!-- Composer -->
<div class="composer hidden" id="composer">
<div class="menu hidden" id="modesMenu">
<div class="grouphdr">Modes <span style="float:right;text-transform:none;font-size:11px;color:var(--dim)">⇧+Tab to switch</span></div>
<div class="item" data-mode="ask"><span class="ic">✋</span><div class="tx"><div class="tt">Ask before edits</div><div class="ds">Ask for approval before making each edit</div></div><span class="chk" data-chk="ask">✓</span></div>
<div class="item" data-mode="edit"><span class="ic">⌨</span><div class="tx"><div class="tt">Edit automatically</div><div class="ds">Edit files without asking (shows diffs)</div></div><span class="chk hidden" data-chk="edit">✓</span></div>
<div class="item" data-mode="plan"><span class="ic">📋</span><div class="tx"><div class="tt">Plan mode</div><div class="ds">Explore code and present a plan before editing</div></div><span class="chk hidden" data-chk="plan">✓</span></div>
<div class="item" data-mode="auto"><span class="ic">⚡</span><div class="tx"><div class="tt">Auto mode</div><div class="ds">AI decides the best permission level per action</div></div><span class="chk hidden" data-chk="auto">✓</span></div>
<div class="item" data-mode="bypass"><span class="ic">🔓</span><div class="tx"><div class="tt">Bypass permissions</div><div class="ds">No approval needed — use with caution</div></div><span class="chk hidden" data-chk="bypass">✓</span></div>
<div class="effort"><span class="effort-label">Effort<span class="effort-val" id="effortLbl">Medium</span></span><div class="dots" id="effortDots"></div></div>
</div>
<div class="menu hidden" id="plusMenu">
<div class="grouphdr">Context</div>
<div class="item" data-ctx="attach"><span class="ic">📎</span><div class="tx"><div class="tt">Attach file…</div><div class="ds">Add a file to the conversation</div></div></div>
<div class="item" data-ctx="mention"><span class="ic">＠</span><div class="tx"><div class="tt">Mention file…</div><div class="ds">Reference a project file</div></div></div>
<div class="item" data-ctx="clear"><span class="ic">🗑</span><div class="tx"><div class="tt">Clear conversation</div></div></div>
<div class="item" data-ctx="rewind"><span class="ic">⟲</span><div class="tx"><div class="tt">Rewind to checkpoint</div></div></div>
<div class="grouphdr">Model & Settings</div>
<div class="item" data-ctx="model"><span class="ic">◇</span><div class="tx"><div class="tt">Switch model…</div></div><span class="term" id="modelLbl">auto</span></div>
<div class="item" data-ctx="thinking"><span class="ic">✦</span><div class="tx"><div class="tt">Extended thinking</div></div><span class="term" id="thinkLbl">off</span></div>
<div class="item" data-ctx="account"><span class="ic">◔</span><div class="tx"><div class="tt">Account & usage</div></div></div>
<div class="grouphdr">Customize</div>
<div class="item" data-ctx="agents"><span class="ic">◈</span><div class="tx"><div class="tt">Agents</div><div class="ds">Configure sub-agent behaviors</div></div></div>
<div class="item" data-ctx="hooks"><span class="ic">⚓</span><div class="tx"><div class="tt">Hooks</div><div class="ds">Pre/post lifecycle actions</div></div></div>
<div class="item" data-ctx="memory"><span class="ic">🧠</span><div class="tx"><div class="tt">Memory (.cyber)</div></div></div>
<div class="item" data-ctx="mcp"><span class="ic">⛓</span><div class="tx"><div class="tt">MCP servers</div></div></div>
<div class="item" data-ctx="terminal"><span class="ic">▶</span><div class="tx"><div class="tt">Open in Terminal</div></div></div>
<div class="grouphdr">Support</div>
<div class="item" data-ctx="help"><span class="ic">?</span><div class="tx"><div class="tt">Help & docs</div></div></div>
<div class="item" data-ctx="report"><span class="ic">⚑</span><div class="tx"><div class="tt">Report a problem</div></div><span class="term" id="verLbl"></span></div>
</div>
<div class="menu hidden" id="slashMenu">
<div class="filter">🔎<input id="slashFilter" placeholder="Filter commands…"/></div>
<div id="slashList"></div>
</div>
<div class="composer-inner"><div class="composer-box">
<textarea id="input" placeholder="Ask CyberCoder anything… (Ctrl+Esc to focus)" rows="1"></textarea>
<div class="crow"><div class="cleft">
<button class="sqbtn" id="plusBtn" title="Context & settings">＋</button>
<button class="sqbtn" id="slashBtn" title="Slash commands" style="font-size:14px">⌘</button>
</div><div class="cright">
<span class="cli-badge off" id="cliBadge"><span>●</span> CLI</span>
<div class="mode-ind" id="modeInd"><span id="modeIcon">✋</span> <span id="modeName">Ask</span></div>
<button class="send" id="sendBtn" title="Send (Enter)">↑</button>
<button class="sqbtn hidden" id="stopBtn" title="Stop generation">■</button>
</div></div>
</div><div class="ver" id="footerVer"></div></div>
</div>
<script nonce="${n}">
const vscode=acquireVsCodeApi(),$ =id=>document.getElementById(id);
let state={signedIn:false,plan:'free',mode:'ask',effort:2,thinking:false,model:'auto',version:'0.6.0',streaming:false,cliBridge:false};
let assistantEl=null,currentTool=null,toolStartTime=0;
const MODES={ask:{i:'✋',n:'Ask'},edit:{i:'⌨',n:'Edit'},plan:{i:'📋',n:'Plan'},auto:{i:'⚡',n:'Auto'},bypass:{i:'🔓',n:'Bypass'}};
const EFF=['Low','Med-Low','Medium','High','Max'];
const SLASH=[{c:'/clear',d:'Clear conversation',g:'Session'},{c:'/compact',d:'Compact context',g:'Session'},{c:'/plan',d:'Enter plan mode',g:'Planning'},{c:'/goal',d:'Set a high-level goal',g:'Planning'},{c:'/loop',d:'Iterative refinement',g:'Planning'},{c:'/code-review',d:'Review current file',g:'Review'},{c:'/security-review',d:'Security audit',g:'Review'},{c:'/comprehensive-review',d:'Deep workspace review',g:'Review'},{c:'/zen-review',d:'Minimal focused review',g:'Review'},{c:'/research',d:'Web research',g:'Skills'},{c:'/agent-browser',d:'Browse the web',g:'Skills'},{c:'/batch',d:'Batch operations',g:'Skills'},{c:'/run',d:'Run a command',g:'Skills'},{c:'/init',d:'Initialize .cyber/',g:'Config'},{c:'/usage',d:'Show token usage',g:'Info'},{c:'/verify',d:'Verify config',g:'Info'}];
const SLASH_ACT={'/security-review':'scanFile','/code-review':'scanFile','/comprehensive-review':'scanWorkspace','/zen-review':'scanWorkspace'};
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function hideMenus(){['modesMenu','plusMenu','slashMenu'].forEach(m=>$(m).classList.add('hidden'))}
function toggle(id){const el=$(id),was=el.classList.contains('hidden');hideMenus();if(was)el.classList.remove('hidden')}
function renderMD(t){
  var BT=String.fromCharCode(96),RE1=new RegExp('('+BT+BT+BT+'[\\\\w-]*\\\\n[\\\\s\\\\S]*?'+BT+BT+BT+')','g'),RE2=new RegExp('^'+BT+BT+BT+'([\\\\w-]*)\\\\n([\\\\s\\\\S]*?)'+BT+BT+BT+'$'),RE3=new RegExp(BT+'([^'+BT+']+)'+BT,'g');
  return t.split(RE1).map(p=>{
    const m=p.match(RE2);
    if(m){const lang=m[1]||'text';return '<div class="code-header"><span class="code-lang">'+lang+'</span><div class="code-actions"><button class="code-btn copy">Copy</button><button class="code-btn apply">Apply</button></div></div><pre><code>'+esc(m[2])+'</code></pre>'}
    let h=esc(p);h=h.replace(RE3,'<code style="background:rgba(255,255,255,.06);padding:2px 5px;border-radius:4px;font-size:12.5px">$1</code>');h=h.replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>');h=h.replace(/\\n/g,'<br>');return '<span>'+h+'</span>'
  }).join('')
}
function wireCode(el){el.querySelectorAll('.code-actions').forEach(b=>{const pre=b.closest('.code-header')?.nextElementSibling;const code=pre?pre.innerText:'';const c=b.querySelector('.copy'),a=b.querySelector('.apply');if(c&&!c.dataset.w){c.dataset.w='1';c.onclick=()=>{vscode.postMessage({type:'copy',content:code});c.textContent='Copied!';setTimeout(()=>c.textContent='Copy',1500)}}if(a&&!a.dataset.w){a.dataset.w='1';a.onclick=()=>vscode.postMessage({type:'applyEdit',content:code})}})}
function show(){
  const has=$('messages').children.length>0;
  $('login').classList.toggle('hidden',state.signedIn);
  $('empty').classList.toggle('hidden',!state.signedIn||has);
  $('messages').classList.toggle('hidden',!state.signedIn||!has);
  $('composer').classList.toggle('hidden',!state.signedIn);
  $('modeIcon').textContent=MODES[state.mode].i;$('modeName').textContent=MODES[state.mode].n;
  $('modelLbl').textContent=state.model;$('thinkLbl').textContent=state.thinking?'on':'off';
  $('verLbl').textContent='v'+state.version;$('footerVer').textContent='CyberCoder v'+state.version;
  const badge=$('cliBadge');if(state.cliBridge){badge.classList.remove('off');badge.title='CLI bridge active'}else{badge.classList.add('off');badge.title='API-only mode'}
}
function addMsg(role,text){const el=document.createElement('div');el.className='msg '+role;el.innerHTML='<div class="role">'+(role==='user'?'You':'CyberCoder')+'</div><div class="bubble">'+(role==='user'?esc(text):'')+'</div>';$('messages').appendChild(el);show();el.scrollIntoView({block:'end',behavior:'smooth'});return el}
function addToolStep(summary){toolStartTime=Date.now();const el=document.createElement('div');el.className='tool-step running';el.innerHTML='<div class="tool-header"><span class="tool-icon spin">⟳</span><span class="tool-name">'+esc(summary)+'</span><span class="tool-time"></span><span class="tool-chevron">▸</span></div><div class="tool-body"></div>';el.querySelector('.tool-header').onclick=()=>el.classList.toggle('expanded');$('messages').appendChild(el);el.scrollIntoView({block:'end',behavior:'smooth'});return el}
function finishTool(el,ok,output){if(!el)return;el.classList.remove('running');el.classList.add(ok?'ok':'fail');const ic=el.querySelector('.tool-icon');ic.classList.remove('spin');ic.textContent=ok?'✓':'✕';ic.style.color=ok?'var(--success)':'var(--error)';const ms=Date.now()-toolStartTime;el.querySelector('.tool-time').textContent=ms>1000?(ms/1000).toFixed(1)+'s':ms+'ms';if(output)el.querySelector('.tool-body').textContent=output.slice(0,2000)}
function send(){const t=$('input').value.trim();if(!t||state.streaming)return;$('input').value='';$('input').style.height='auto';hideMenus();vscode.postMessage({type:'send',text:t})}
function renderEffort(){const d=$('effortDots');d.innerHTML='';EFF.forEach((lbl,i)=>{const dot=document.createElement('div');dot.className='dot'+(i<=state.effort?' on':'');dot.title=lbl;dot.onclick=()=>{state.effort=i;$('effortLbl').textContent=lbl;renderEffort();vscode.postMessage({type:'setEffort',value:i})};d.appendChild(dot)})}
function renderSlash(){const q=($('slashFilter').value||'').toLowerCase(),l=$('slashList');l.innerHTML='';let lg='';SLASH.filter(s=>s.c.includes(q)||s.d.toLowerCase().includes(q)).forEach(s=>{if(s.g!==lg){lg=s.g;const h=document.createElement('div');h.className='grouphdr';h.textContent=s.g;l.appendChild(h)}const el=document.createElement('div');el.className='item';el.innerHTML='<div class="tx"><span class="tt">'+s.c+'</span><span class="ds" style="margin-left:12px">'+s.d+'</span></div>';el.onclick=()=>{hideMenus();if(SLASH_ACT[s.c])vscode.postMessage({type:'slash',action:SLASH_ACT[s.c]});else{$('input').value=s.c+' ';$('input').focus()}};l.appendChild(el)})}
$('input').addEventListener('input',()=>{const ta=$('input');ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,200)+'px'});
$('sendBtn').onclick=send;$('stopBtn').onclick=()=>vscode.postMessage({type:'stop'});
$('input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}if(e.key==='/'&&!$('input').value){e.preventDefault();$('input').value='/';renderSlash();toggle('slashMenu')}});
$('plusBtn').onclick=()=>toggle('plusMenu');$('slashBtn').onclick=()=>{renderSlash();toggle('slashMenu')};$('modeInd').onclick=()=>{renderEffort();toggle('modesMenu')};
$('slashFilter').oninput=renderSlash;
$('memoryCardX').onclick=()=>$('memoryCard').classList.add('hidden');
$('autoCardX').onclick=()=>$('autoCard').classList.add('hidden');
$('autoLearn').onclick=()=>vscode.postMessage({type:'ctx',action:'help'});
$('memoryLearn').onclick=()=>vscode.postMessage({type:'ctx',action:'memory'});
$('scanChip').onclick=()=>vscode.postMessage({type:'slash',action:'scanWorkspace'});
document.querySelectorAll('.chip[data-p]').forEach(c=>c.onclick=()=>{$('input').value=c.dataset.p;$('input').focus()});
document.querySelectorAll('.prov').forEach(p=>p.onclick=()=>vscode.postMessage({type:'login',method:p.dataset.login}));
document.querySelectorAll('#modesMenu .item[data-mode]').forEach(it=>it.onclick=()=>{state.mode=it.dataset.mode;document.querySelectorAll('#modesMenu .chk').forEach(c=>c.classList.add('hidden'));const chk=document.querySelector('[data-chk="'+state.mode+'"]');if(chk)chk.classList.remove('hidden');show();hideMenus();vscode.postMessage({type:'setMode',mode:state.mode})});
document.querySelectorAll('#plusMenu .item[data-ctx]').forEach(it=>it.onclick=()=>{hideMenus();vscode.postMessage({type:'ctx',action:it.dataset.ctx})});
document.addEventListener('click',e=>{if(!e.target.closest('.menu')&&!e.target.closest('.sqbtn')&&!e.target.closest('.mode-ind'))hideMenus()});
window.addEventListener('message',ev=>{const m=ev.data;switch(m.type){
case 'authState':state.signedIn=m.signedIn;state.plan=m.plan||'free';if(m.version)state.version=m.version;if(m.cliBridge!==undefined)state.cliBridge=m.cliBridge;show();break;
case 'cleared':$('messages').innerHTML='';show();break;
case 'modelChanged':state.model=m.model;show();break;
case 'thinkingChanged':state.thinking=m.value;show();break;
case 'cliBridgeStatus':state.cliBridge=m.active;show();break;
case 'addContext':$('input').value=($('input').value?$('input').value+'\\n':'')+'['+m.label+']';$('input').focus();break;
case 'userMessage':addMsg('user',m.text);break;
case 'assistantStart':state.streaming=true;$('sendBtn').classList.add('hidden');$('stopBtn').classList.remove('hidden');assistantEl=addMsg('assistant','');assistantEl.querySelector('.bubble').innerHTML='<div class="thinking"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';assistantEl._raw='';assistantEl._has=false;break;
case 'toolStart':currentTool=addToolStep(m.summary);if(m.summary.includes('spawn_subagent')||m.summary.includes('spawn_team')){currentTool.querySelector('.tool-icon').innerHTML='✱';currentTool.querySelector('.tool-icon').style.color='#FF5F00';currentTool.querySelector('.tool-name').innerHTML='Coalescing <span class="thinking"><div class="dot" style="background:#FF5F00;width:4px;height:4px"></div><div class="dot" style="background:#FF5F00;width:4px;height:4px"></div><div class="dot" style="background:#FF5F00;width:4px;height:4px"></div></span>'}break;
case 'toolEnd':finishTool(currentTool,m.ok,m.output||'');currentTool=null;break;
case 'toolOutput':if(currentTool)currentTool.querySelector('.tool-body').textContent+=m.text;break;
case 'assistantChunk':if(assistantEl){if(!assistantEl._has){assistantEl._has=true;assistantEl.querySelector('.bubble').innerHTML=''}assistantEl._raw+=m.text;assistantEl.querySelector('.bubble').innerHTML=renderMD(assistantEl._raw);assistantEl.querySelector('.bubble').classList.add('typing-cursor');wireCode(assistantEl);assistantEl.scrollIntoView({block:'end',behavior:'smooth'})}break;
case 'assistantDone':state.streaming=false;$('sendBtn').classList.remove('hidden');$('stopBtn').classList.add('hidden');if(assistantEl){assistantEl.querySelector('.bubble').classList.remove('typing-cursor');wireCode(assistantEl)}break;
case 'error':state.streaming=false;$('sendBtn').classList.remove('hidden');$('stopBtn').classList.add('hidden');if(assistantEl)assistantEl.querySelector('.bubble').classList.remove('typing-cursor');$('errbar').textContent=m.message;$('errbar').classList.remove('hidden');setTimeout(()=>$('errbar').classList.add('hidden'),8000);break;
case 'diff':if(assistantEl){let h='<div class="diff-block"><div class="diff-header"><span class="diff-file">'+esc(m.file)+'</span></div>';(m.hunks||[]).forEach(hk=>{(hk.lines||[]).forEach(ln=>{if(ln.startsWith('+'))h+='<div class="diff-line diff-add">'+esc(ln)+'</div>';else if(ln.startsWith('-'))h+='<div class="diff-line diff-del">'+esc(ln)+'</div>';else h+='<div class="diff-line diff-ctx">'+esc(ln)+'</div>'})});h+='</div>';assistantEl.querySelector('.bubble').innerHTML+=h}break;
}});
renderEffort();show();vscode.postMessage({type:'ready'});
</script>
</body>
</html>`
}
