/* GitHub requests happen only in the extension worker. No content-script token access. */
importScripts('status.js');
const S = self.KotamaStatus;
const CACHE = new Map();
const inflight = new Map();
const API = 'https://api.github.com';
const MAX_BRANCHES = 12;

function cached(key, ttl, loader) {
  const now = Date.now();
  const entry = CACHE.get(key);
  if (entry && now - entry.at < ttl) return Promise.resolve(entry.value);
  if (inflight.has(key)) return inflight.get(key);
  const promise = loader().then(value => { CACHE.set(key, {at: Date.now(), value}); return value; }).finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

async function github(path, token) {
  const headers = {'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(API + path, {headers, cache: 'no-store'});
  if (!response.ok) {
    const left = response.headers.get('x-ratelimit-remaining');
    if ((response.status === 403 || response.status === 429) && left === '0') throw new Error('GitHub APIの利用上限です。トークン設定または時間を置いて再試行してください。');
    if (response.status === 404) throw new Error('GitHub上で対象が見つかりません（リポジトリ・PR・runを確認）。');
    throw new Error(`GitHub API HTTP ${response.status}`);
  }
  return response.json();
}

async function resolveBranch(binding, token, ttl) {
  if (binding.branch) return binding.branch;
  if (!binding.pr) return null;
  const repo = binding.repo;
  const pr = Number(binding.pr);
  if (!Number.isSafeInteger(pr) || pr <= 0) return null;
  const data = await cached(`pr:${repo}:${pr}:${Boolean(token)}`, ttl, () => github(`/repos/${repo}/pulls/${pr}`, token));
  return data.head?.ref || null;
}

async function getRuns(binding, token, ttl) {
  const repo = binding.repo;
  if (!S.validRepo(repo)) throw new Error('リポジトリ名は owner/repo の形式で入力してください。');
  if (binding.runId) {
    const id = Number(binding.runId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('run IDが不正です。');
    const run = await cached(`run:${repo}:${id}:${Boolean(token)}`, ttl, () => github(`/repos/${repo}/actions/runs/${id}`, token));
    return [run];
  }
  const branch = await resolveBranch(binding, token, ttl);
  if (!branch) throw new Error('ブランチ、PR番号、またはrun IDを指定してください。');
  const path = `/repos/${repo}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=100`;
  const data = await cached(`branch:${repo}:${branch}:${Boolean(token)}`, ttl, () => github(path, token));
  return S.newestPerWorkflow((data.workflow_runs || []).filter(run => S.matchRun(run, binding)));
}

async function statusForChat(bindings, token, ttl) {
  const all = [];
  const errors = [];
  for (const b of bindings.slice(0, MAX_BRANCHES)) {
    try { all.push(...await getRuns(b, token, ttl)); }
    catch (error) { errors.push(error.message || String(error)); }
  }
  const distinct = [...new Map(all.map(run => [run.id, run])).values()];
  const summary = S.summarize(distinct, errors.join(' / '));
  summary.updatedAt = Date.now();
  return summary;
}

async function getStatuses(ids) {
  const {chatBindings = {}, githubToken = ''} = await chrome.storage.local.get(['chatBindings', 'githubToken']);
  const ttl = githubToken ? 30000 : 60000;
  const output = {};
  await Promise.all([...new Set(ids)].slice(0, 60).map(async id => {
    if (!Array.isArray(chatBindings[id]) || !chatBindings[id].length) return;
    output[id] = await statusForChat(chatBindings[id], githubToken, ttl);
  }));
  return {statuses: output, refreshMs: ttl};
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'GET_STATUSES') {
    getStatuses(Array.isArray(message.ids) ? message.ids.filter(id => typeof id === 'string') : [])
      .then(sendResponse).catch(error => sendResponse({error: error.message}));
    return true;
  }
  if (message?.type === 'OPEN_RUN' && typeof message.url === 'string') {
    try {
      const url = new URL(message.url);
      if (url.protocol === 'https:' && url.hostname === 'github.com' && /^\/[\w.-]+\/[\w.-]+\/actions\/runs\/\d+$/.test(url.pathname)) {
        chrome.tabs.create({url: url.href});
      }
    } catch (_) { /* ignore invalid URLs */ }
  }
  return false;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.githubToken || changes.chatBindings)) CACHE.clear();
});
