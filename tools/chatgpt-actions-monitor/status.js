/* Shared pure functions. Loaded with importScripts in the MV3 worker; tested in Node. */
(function (root) {
  'use strict';
  const RUN_STATES = new Set(['queued', 'waiting', 'requested', 'pending', 'in_progress']);
  const BAD_STATES = new Set(['failure', 'timed_out', 'action_required', 'startup_failure', 'cancelled']);
  const normalize = value => String(value || '').trim();

  function conversationId(url) {
    try {
      const u = new URL(url);
      if (!['chatgpt.com', 'chat.openai.com'].includes(u.hostname)) return null;
      const m = u.pathname.match(/(?:^|\/)c\/([a-zA-Z0-9-]{8,})(?:\/|$)/);
      return m ? m[1] : null;
    } catch (_) { return null; }
  }

  function validRepo(repo) {
    return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(normalize(repo)) && !normalize(repo).includes('..');
  }

  function classify(run) {
    const s = `${run.name || ''} ${run.path || ''}`.toLowerCase();
    if (/clam|virus|malware|safety|security|scan/.test(s)) return 'safety';
    if (/performance|optimization|optimisation|impostor|\blod\b|batching|audit/.test(s)) return 'performance';
    if (/render|blender|eevee|cycles|model|foliage|water|magma|vfx/.test(s)) return 'render';
    return 'other';
  }

  function runState(run) {
    if (!run) return 'unknown';
    if (RUN_STATES.has(run.status)) return 'running';
    if (run.status !== 'completed') return 'unknown';
    if (run.conclusion === 'success') return 'success';
    if (BAD_STATES.has(run.conclusion)) return 'failure';
    return 'unknown';
  }

  function newestPerWorkflow(runs) {
    const sorted = [...runs].sort((a, b) => (Date.parse(b.created_at || '') || 0) - (Date.parse(a.created_at || '') || 0) || (b.id || 0) - (a.id || 0));
    const seen = new Set();
    return sorted.filter(run => {
      const key = run.path || run.name || String(run.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function matchRun(run, binding) {
    const query = normalize(binding.workflow).toLowerCase();
    const category = normalize(binding.category);
    if (query && !(`${run.name || ''} ${run.path || ''}`.toLowerCase().includes(query))) return false;
    if (category && category !== 'all' && classify(run) !== category) return false;
    return true;
  }

  function summarize(runs, error) {
    const active = runs.filter(r => runState(r) === 'running').length;
    const failed = runs.filter(r => runState(r) === 'failure').length;
    const success = runs.filter(r => runState(r) === 'success').length;
    const state = active ? 'running' : failed ? 'failure' : success ? 'success' : 'unknown';
    return {state, active, failed, success, total: runs.length, error: error || null,
      runs: [...runs].sort((a,b) => {
        const priority = {running:0, failure:1, success:2, unknown:3};
        return priority[runState(a)] - priority[runState(b)] || (Date.parse(b.created_at || '') || 0) - (Date.parse(a.created_at || '') || 0);
      }).slice(0, 12).map(r => ({id:r.id, name:r.name, status:runState(r), category:classify(r), url:r.html_url, created_at:r.created_at}))};
  }

  const api = {conversationId, validRepo, classify, runState, newestPerWorkflow, matchRun, summarize};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KotamaStatus = api;
})(typeof self !== 'undefined' ? self : globalThis);
