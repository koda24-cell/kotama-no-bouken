(() => {
  'use strict';
  const BADGE_CLASS = 'kotama-actions-badge';
  const ID_PATTERN = /(?:^|\/)c\/([a-zA-Z0-9-]{8,})(?:\/|$)/;
  let statuses = {};
  let bindings = {};
  let busy = false;
  let observerTimer = null;

  function chatId(href) {
    try {
      const u = new URL(href, location.origin);
      if (u.origin !== location.origin) return null;
      return u.pathname.match(ID_PATTERN)?.[1] || null;
    } catch (_) { return null; }
  }

  function chatLinks() {
    return [...document.querySelectorAll('nav a[href], aside a[href], [data-testid="history"] a[href]')]
      .map(a => ({a, id: chatId(a.href)})).filter(item => item.id);
  }

  function label(status) {
    if (status?.state === 'running') return `● 実行中 ${status.active}`;
    if (status?.state === 'failure') return `● 失敗 ${status.failed}`;
    if (status?.state === 'success') return `● 成功 ${status.success}`;
    return '● 未確認';
  }

  function tooltip(status) {
    if (!status) return 'GitHub Actions: 取得待ち';
    const time = status.updatedAt ? new Date(status.updatedAt).toLocaleTimeString('ja-JP') : '未取得';
    const details = status.runs.map(r => `${r.name} [${r.category}]: ${r.status}`).join('\n');
    return `GitHub Actions (${time})\n${status.error || ''}\n${details || '対象runなし'}`;
  }

  function render() {
    for (const {a, id} of chatLinks()) {
      const own = Array.isArray(bindings[id]) && bindings[id].length;
      let badge = [...a.querySelectorAll(`.${BADGE_CLASS}`)].find(b => b.dataset.kotamaId === id);
      if (!own) { if (badge) badge.remove(); continue; }
      if (!badge) {
        badge = document.createElement('span');
        badge.className = BADGE_CLASS;
        badge.dataset.kotamaId = id;
        badge.setAttribute('role', 'button');
        badge.setAttribute('tabindex', '0');
        badge.setAttribute('aria-label', 'GitHub Actionsの状態と実行ページ');
        const open = event => {
          if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
          event.preventDefault(); event.stopPropagation();
          const url = statuses[id]?.runs?.[0]?.url;
          if (url) chrome.runtime.sendMessage({type:'OPEN_RUN', url});
        };
        badge.addEventListener('click', open);
        badge.addEventListener('keydown', open);
        a.appendChild(badge);
      }
      const status = statuses[id];
      badge.dataset.state = status?.state || 'unknown';
      if (badge.textContent !== label(status)) badge.textContent = label(status);
      badge.title = tooltip(status);
    }
  }

  async function refresh() {
    if (busy) return;
    busy = true;
    try {
      const stored = await chrome.storage.local.get('chatBindings');
      bindings = stored.chatBindings || {};
      render();
      const ids = [...new Set(chatLinks().map(x => x.id))].filter(id => bindings[id]?.length);
      if (!ids.length) return;
      const result = await chrome.runtime.sendMessage({type:'GET_STATUSES', ids});
      if (result?.statuses) statuses = {...statuses, ...result.statuses};
      render();
    } catch (error) { console.warn('Kotama Actions monitor:', error.message); }
    finally { busy = false; }
  }

  // ChatGPT is an SPA; sidebar nodes may be recreated without a full navigation.
  const observer = new MutationObserver(() => {
    if (observerTimer) return;
    observerTimer = setTimeout(() => { observerTimer = null; render(); }, 350);
  });
  observer.observe(document.documentElement, {subtree:true, childList:true});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.chatBindings || changes.githubToken)) refresh();
  });
  refresh();
  setInterval(refresh, 30000);
})();
