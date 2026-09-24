'use strict';
const $ = id => document.getElementById(id);
const viewNames = { home: '学习概览', search: '文献检索', zotero: 'Zotero 管理', reading: '精读与评价', writing: '论文写作', ethics: 'AI 学术规范' };
let generatedQuery = '';
let toastTimer;
const fields = ['population','intervention','population-mesh','intervention-mesh','outcome','include-outcome'];
function setMenu(open) {
  $('sidebar').classList.toggle('open', open);
  $('menu-toggle').setAttribute('aria-expanded', String(open));
  $('menu-toggle').setAttribute('aria-label', open ? '关闭导航' : '打开导航');
  $('scrim').hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
}
function renderView(focus = false) {
  const name = location.hash.slice(1) || 'home';
  const next = Object.prototype.hasOwnProperty.call(viewNames, name) ? name : 'home';
  document.querySelectorAll('.view').forEach(el => { el.hidden = el.id !== `view-${next}`; });
  document.querySelectorAll('[data-view]').forEach(el => {
    const active = el.dataset.view === next;
    el.classList.toggle('active', active);
    if (active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
  });
  $('current-view').textContent = viewNames[next];
  document.title = `${viewNames[next]} · 医学文献检索与写作`;
  setMenu(false);
  if (focus) { $('main').focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
}
window.addEventListener('hashchange', () => renderView(true));
$('menu-toggle').addEventListener('click', () => setMenu(!$('sidebar').classList.contains('open')));
$('scrim').addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('sidebar').classList.contains('open')) { setMenu(false); $('menu-toggle').focus(); } });
window.addEventListener('resize', () => { if (window.innerWidth > 720) setMenu(false); });
function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false; toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3500); }
async function copyText(value) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(value);
    else {
      const temporary = document.createElement('textarea'); temporary.value = value;
      temporary.style.position = 'fixed'; temporary.style.left = '-9999px'; document.body.appendChild(temporary); temporary.select();
      const ok = document.execCommand('copy'); temporary.remove(); if (!ok) throw new Error('copy unavailable');
    }
    toast('已复制，可以粘贴使用。');
  } catch (_) { toast('复制未成功，请选中文字后手动复制。'); }
}
function splitTerms(value, label) {
  if (typeof value !== 'string' || value.length > 1000) throw new Error(`${label}请使用不超过 1000 字符的文本。`);
  const terms = [...new Set(value.split(/[;；\n]+/).map(t => t.trim()).filter(Boolean))];
  if (terms.length > 20) throw new Error(`${label}最多填写 20 个同义词。`);
  for (const term of terms) {
    if (/[\[\]()<>"“”\x00-\x1f]/.test(term) || /\b(AND|OR|NOT)\b/.test(term)) throw new Error(`${label}只填写词语，用分号分隔；不要包含字段标签、括号、双引号或布尔运算符。`);
    if (term.includes('*') && !/^[A-Za-z][A-Za-z0-9 '-]{3,}\*$/.test(term)) throw new Error(`${label}的截词请使用至少 4 个字母后接一个 *，例如 alzheimer*。`);
  }
  return terms;
}
function quotedTerm(term, tag) { return (term.includes(' ') ? `"${term}"` : term) + `[${tag}]`; }
function meshTerm(value, label) {
  if (typeof value !== 'string' || value.length > 200) throw new Error(`${label}主题词过长。`);
  const term = value.trim();
  if (/[\[\]()<>"“”*;；\n\x00-\x1f]/.test(term)) throw new Error(`${label}请填写一个核验过的 MeSH 主题词，不要加字段标签或标点包装。`);
  return term ? `"${term}"[MeSH Terms]` : '';
}
function buildQuery(state) {
  const pop = splitTerms(state.population, '人群 / 疾病');
  const intervention = splitTerms(state.intervention, '干预 / 暴露');
  const pMesh = meshTerm(state.populationMesh, '人群 / 疾病');
  const iMesh = meshTerm(state.interventionMesh, '干预 / 暴露');
  if (!pop.length && !pMesh) throw new Error('请先填写研究人群或疾病的英文关键词。');
  const groups = [];
  const group = (terms, mesh) => [mesh, ...terms.map(term => quotedTerm(term, 'Title/Abstract'))].filter(Boolean);
  const pTerms = group(pop, pMesh), iTerms = group(intervention, iMesh);
  groups.push(`(${pTerms.join(' OR ')})`);
  if (iTerms.length) groups.push(`(${iTerms.join(' OR ')})`);
  if (state.includeOutcome) {
    const outcomes = splitTerms(state.outcome, '结局指标');
    if (!outcomes.length) throw new Error('已选择加入结局，请填写结局关键词，或取消勾选。');
    groups.push(`(${outcomes.map(term => quotedTerm(term, 'Title/Abstract')).join(' OR ')})`);
  }
  return groups.join('\nAND\n');
}
function readState() { return { population: $('population').value, intervention: $('intervention').value, populationMesh: $('population-mesh').value, interventionMesh: $('intervention-mesh').value, outcome: $('outcome').value, includeOutcome: $('include-outcome').checked }; }
function showError(message) { $('search-error').textContent = message; $('search-error').hidden = false; }
function renderQuery(query) { generatedQuery = query; $('query-output').textContent = query; $('open-pubmed').href = 'https://pubmed.ncbi.nlm.nih.gov/?term=' + encodeURIComponent(query); $('copy-query').disabled = false; $('open-pubmed').removeAttribute('aria-disabled'); $('open-pubmed').removeAttribute('tabindex'); $('search-error').hidden = true; }
function generate(showToast = false) {
  try { const query = buildQuery(readState()); renderQuery(query); if (showToast) toast('检索式已更新。请到 PubMed 核验。'); return query; }
  catch (error) { generatedQuery = ''; $('query-output').textContent = '请完善左侧输入后重新生成检索式。'; $('open-pubmed').removeAttribute('href'); $('open-pubmed').setAttribute('aria-disabled', 'true'); $('open-pubmed').setAttribute('tabindex', '-1'); $('copy-query').disabled = true; showError(error.message); return null; }
}
$('search-form').addEventListener('submit', event => { event.preventDefault(); generate(true); });
fields.forEach(id => $(id).addEventListener(id === 'include-outcome' ? 'change' : 'input', () => { $('outcome').disabled = !$('include-outcome').checked; generate(false); }));
$('load-example').addEventListener('click', () => {
  $('population').value = "Alzheimer disease; Alzheimer's disease; alzheimer*";
  $('intervention').value = 'exercise; physical activity'; $('population-mesh').value = ''; $('intervention-mesh').value = '';
  $('outcome').value = 'cognition; cognitive function'; $('include-outcome').checked = false; $('outcome').disabled = true; generate(); toast('已载入阿尔茨海默病与运动干预示例。');
});
$('copy-query').addEventListener('click', () => { if (generatedQuery) copyText(generatedQuery); });
$('open-pubmed').addEventListener('click', event => { if (!generatedQuery) event.preventDefault(); });
$('copy-evidence').addEventListener('click', () => copyText('文献精读与证据提取卡\n\n文献题名：\n作者 / 年份：\nDOI / PMID：\n研究问题：\n研究设计与场景：\n纳入标准与样本量：\n干预 / 暴露及对照：\n主要结局与随访时间：\n效应量与置信区间：\n偏倚与局限：\n对当前研究的启示：\n原文页码 / 段落：\n\n提取规则：没有报告的信息填写“未报告”；区分作者报告与个人判断。'));
$('copy-disclosure').addEventListener('click', () => copyText($('disclosure-text').textContent));
$('copy-prompt').addEventListener('click', () => copyText($('prompt-text').textContent));
$('copy-zotero-library').addEventListener('click', () => copyText($('zotero-library-text').textContent));
$('copy-zotero-note').addEventListener('click', () => copyText($('zotero-note-text').textContent));
$('disclosure-text').textContent = $('disclosure-text').textContent.replace(/\\n/g, '\n');
$('writing-checklist').addEventListener('change', () => { $('writing-count').textContent = `${document.querySelectorAll('#writing-checklist input:checked').length} / 5`; });
$('zotero-checklist').addEventListener('change', () => { $('zotero-count').textContent = `${document.querySelectorAll('#zotero-checklist input:checked').length} / 6`; });

const isAndroidContainer = location.hostname === 'appassets.androidplatform.net';
if (isAndroidContainer) {
  const installShell = $('install-app-shell');
  const networkStatus = $('network-status');
  const updateStatus = $('update-status');
  if (installShell) installShell.setAttribute('hidden', '');
  if (networkStatus) networkStatus.setAttribute('hidden', '');
  if (updateStatus) updateStatus.setAttribute('hidden', '');
}

if (!isAndroidContainer) {
  let installPrompt;
  const installButton = $('install-app');
  const installState = $('install-state');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

if (isStandalone) installState.textContent = '已安装到此设备';
else if (isIos) {
  installButton.hidden = false;
  installButton.textContent = '查看安装方法';
  installButton.addEventListener('click', () => { $('ios-install-help').hidden = false; });
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});

if (!isIos) installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  const choice = await installPrompt.userChoice;
  if (choice.outcome === 'accepted') installState.textContent = '正在安装到此设备';
  installPrompt = undefined;
  installButton.hidden = true;
});

window.addEventListener('appinstalled', () => {
  installButton.hidden = true;
  installState.textContent = '已安装到此设备';
  toast('应用安装完成。');
});

function renderNetworkStatus() { $('network-status').hidden = navigator.onLine; }
window.addEventListener('online', () => { renderNetworkStatus(); toast('网络已恢复。'); });
window.addEventListener('offline', renderNetworkStatus);
renderNetworkStatus();

  if ('serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      location.reload();
    });
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./service-worker.js');
        const showUpdate = worker => {
          if (!worker || !navigator.serviceWorker.controller) return;
          $('update-status').hidden = false;
          $('update-app').onclick = () => worker.postMessage({ type: 'SKIP_WAITING' });
        };
        showUpdate(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (worker) worker.addEventListener('statechange', () => { if (worker.state === 'installed') showUpdate(worker); });
        });
      } catch (_) {
        installState.textContent = '离线功能暂时不可用';
      }
    });
  }
}

function stageSearch(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('需要包含检索概念的对象。');
  const allowed = ['population','intervention','populationMesh','interventionMesh','includeOutcome','outcome'];
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new Error('输入包含不支持的字段。');
  if (typeof input.population !== 'string' || !input.population.trim()) throw new Error('population 必须是非空字符串。');
  for (const key of allowed.filter(k => k !== 'includeOutcome')) if (key in input && typeof input[key] !== 'string') throw new Error(`${key} 必须是字符串。`);
  if ('includeOutcome' in input && typeof input.includeOutcome !== 'boolean') throw new Error('includeOutcome 必须是布尔值。');
  const state = { population: input.population, intervention: input.intervention || '', populationMesh: input.populationMesh || '', interventionMesh: input.interventionMesh || '', includeOutcome: input.includeOutcome || false, outcome: input.outcome || '' };
  const query = buildQuery(state);
  $('population').value = state.population; $('intervention').value = state.intervention; $('population-mesh').value = state.populationMesh; $('intervention-mesh').value = state.interventionMesh; $('include-outcome').checked = state.includeOutcome; $('outcome').value = state.outcome; $('outcome').disabled = !state.includeOutcome;
  renderQuery(query); location.hash = 'search'; renderView(true);
  return { query, pubmedUrl: $('open-pubmed').href, status: 'prepared', note: '检索式已在页面生成，尚未执行外部检索。' };
}
if (document.modelContext && document.modelContext.registerTool) {
  const lifecycle = new AbortController();
  const register = () => { try { Promise.resolve(document.modelContext.registerTool({ name: 'prepare_pubmed_query', title: '构建 PubMed 检索式', description: '填入页面检索表单并生成可复制检索式；不执行外部检索，不获取文献或命中数。同义词以分号分隔。', inputSchema: { type: 'object', properties: { population: { type: 'string', minLength: 1, maxLength: 1000 }, intervention: { type: 'string', maxLength: 1000 }, populationMesh: { type: 'string', maxLength: 200 }, interventionMesh: { type: 'string', maxLength: 200 }, includeOutcome: { type: 'boolean' }, outcome: { type: 'string', maxLength: 1000 } }, required: ['population'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: stageSearch }, { signal: lifecycle.signal })).catch(() => {}); } catch (_) {} };
  register(); window.addEventListener('pagehide', event => { if (!event.persisted) lifecycle.abort(); });
}
renderView(); generate();
