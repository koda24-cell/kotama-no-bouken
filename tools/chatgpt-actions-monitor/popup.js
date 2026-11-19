(() => {
  'use strict';
  const S = self.KotamaStatus;
  const $ = id => document.getElementById(id);
  let id = null;
  const fields = ['repo','branch','pr','runId','category','workflow'];
  const notice = msg => { $('notice').textContent = msg; };
  const getBindings = async () => (await chrome.storage.local.get('chatBindings')).chatBindings || {};

  function row(text, buttonText, action) {
    const el = document.createElement('div'); el.className = 'entry';
    const button = document.createElement('button'); button.textContent = buttonText;
    button.addEventListener('click', action);
    const span = document.createElement('span'); span.textContent = text;
    el.append(button, span); return el;
  }

  async function displayBindings() {
    const all = await getBindings();
    const items = all[id] || [];
    $('entries').replaceChildren();
    items.forEach((b, i) => {
      $('entries').appendChild(row(`${b.repo} / ${b.branch || (b.pr ? 'PR '+b.pr : 'run '+b.runId)} / ${b.workflow || b.category || 'すべて'}${b.runId && (b.branch || b.pr) ? ' / run '+b.runId : ''}`, '削除', async () => {
        const current = await getBindings();
        current[id] = (current[id] || []).filter((_, index) => index !== i);
        if (!current[id].length) delete current[id];
        await chrome.storage.local.set({chatBindings:current});
        await displayBindings(); await refresh();
      }));
    });
    if (!items.length) $('entries').textContent = 'まだ登録されていません。';
  }

  async function refresh() {
    if (!id) return;
    $('runs').textContent = 'GitHubから取得中…';
    try {
      const result = await chrome.runtime.sendMessage({type:'GET_STATUSES', ids:[id]});
      const status = result?.statuses?.[id];
      $('runs').replaceChildren();
      if (result?.error || status?.error) notice(result?.error || status?.error);
      if (!status) { $('runs').textContent = '登録後に表示します。'; return; }
      if (!status.runs.length) { $('runs').textContent = '一致する実行がありません。'; return; }
      for (const run of status.runs) {
        const div = document.createElement('div'); div.className = 'run';
        const dot = document.createElement('span'); dot.className = `dot ${run.status}`; dot.textContent = '● ';
        const link = document.createElement('a'); link.href = run.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.textContent = `${run.name} (${run.category})`;
        div.append(dot, link); $('runs').appendChild(div);
      }
    } catch (error) { $('runs').textContent = '取得失敗: ' + error.message; }
  }

  $('add').addEventListener('click', async () => {
    if (!id) return;
    const b = Object.fromEntries(fields.map(k => [k, $(k).value.trim()]));
    if (!S.validRepo(b.repo)) return notice('リポジトリは owner/repo 形式で指定してください。');
    if (!b.branch && !b.pr && !b.runId) return notice('ブランチ、PR番号、run IDのいずれかを入力してください。');
    if ((b.pr && !/^[1-9]\d*$/.test(b.pr)) || (b.runId && !/^[1-9]\d*$/.test(b.runId))) return notice('PR番号・run IDは正の整数で指定してください。');
    const all = await getBindings();
    const list = all[id] || [];
    if (list.length >= 12) return notice('1チャットにつき最大12件です。');
    if (list.some(x => JSON.stringify(x) === JSON.stringify(b))) return notice('同じ対象は登録済みです。');
    list.push(b); all[id] = list;
    await chrome.storage.local.set({chatBindings:all});
    notice('紐付けを保存しました。');
    await displayBindings(); await refresh();
  });
  $('refresh').addEventListener('click', refresh);
  $('saveToken').addEventListener('click', async () => {
    const token = $('token').value.trim();
    if (!token) return $('tokenStatus').textContent = 'トークンを入力してください。';
    await chrome.storage.local.set({githubToken:token});
    $('token').value = '';
    $('tokenStatus').textContent = '保存済み（ローカル）';
    await refresh();
  });
  $('deleteToken').addEventListener('click', async () => {
    await chrome.storage.local.remove('githubToken'); $('token').value = '';
    $('tokenStatus').textContent = '未設定'; await refresh();
  });

  (async () => {
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    id = S.conversationId(tab?.url || '');
    if (id) {
      $('editor').hidden = false;
      $('chat').textContent = `対象チャット: ${tab.title || id}`;
      await displayBindings(); await refresh();
    } else $('chat').textContent = 'ChatGPTで対象の会話を開くと登録できます。';
    const {githubToken} = await chrome.storage.local.get('githubToken');
    $('tokenStatus').textContent = githubToken ? '保存済み（ローカル）' : '未設定（匿名API）';
  })();
})();
