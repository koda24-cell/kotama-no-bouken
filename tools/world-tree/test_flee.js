// 脚封じ中は迷宮の戦闘から逃げられない（撤退ダイアログの表示切り替え）を、最小のDOMスタブで確認
const { load } = require("./harness");
const g = load(process.argv[2] || require("path").resolve(__dirname, "../.."));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("NG:", m); } else console.log("ok:", m); };
const mk = id => ({ id, hidden: false, innerHTML: "", textContent: id, listeners: {}, addEventListener(t, f) { this.listeners[t] = f; }, after() {}, querySelector() { return els.text; } });
const els = { "retreat-button": mk("retreat-button"), "retreat-dialog": mk("retreat-dialog"), "retreat-dialog-title": mk("t"), "retreat-yes": mk("yes"), "retreat-no": mk("no"), "retreat-home": mk("home"), text: mk("p") };
g.$ = id => els[id] || null; g.setTimeout = f => f();
g.battleState = { encounterMode: true };
let bound = false; g.extEscapeBlocked = () => bound;
g.fieldSetupRetreatChoice();
els["retreat-dialog"].hidden = false;
els["retreat-button"].listeners.click();
ok(!els["retreat-yes"].hidden && !els["retreat-home"].hidden, "通常は「逃げる」「ホームへ帰還」を選べる");
bound = true; els["retreat-button"].listeners.click();
ok(els["retreat-yes"].hidden && els["retreat-home"].hidden && els["retreat-dialog-title"].innerHTML.includes("逃げられない"), "脚封じ中は逃げる・帰還のボタンが消える");
g.battleState.encounterMode = false; els["retreat-button"].listeners.click();
ok(!els["retreat-yes"].hidden, "ボス戦（迷宮の戦闘以外）の撤退は従来どおり");
console.log(fails ? `\n${fails} 件失敗` : "\nすべて成功"); process.exit(fails ? 1 : 0);
