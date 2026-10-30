(function () {
  'use strict';
  var app = document.getElementById('app');
  var MODES = { menu: 'Menu', ticker: 'Menu + scores ticker', scores: 'Scoreboard' };
  var DATA_URL = 'menu.json';
  var POLL_MS = 2 * 60 * 1000;
  var GH_KEY = 'basementtv.github';

  var state = norm({});
  var baseline = '';
  var busy = false, editing = false, note = '', noteErr = false, loaded = false;
  var gh = loadGh();

  function norm(s) {
    s = s || {};
    s.title = s.title || 'The Basement Bar';
    s.tagline = s.tagline || '';
    s.mode = MODES[s.mode] ? s.mode : 'menu';
    s.taps = s.taps || [];
    s.sections = s.sections || [];
    s.sections.forEach(function (sec) { sec.items = sec.items || []; });
    delete s.rev;
    return s;
  }
  function esc(x) {
    return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function uid() { return 'x' + Math.random().toString(36).slice(2, 8); }
  function find(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function serialize(s) { return JSON.stringify(s, null, 2) + '\n'; }

  /* ---------- data ---------- */
  function fetchMenu() {
    // Query string busts the GitHub Pages CDN cache (max-age=600) so edits show up within one poll.
    return fetch(DATA_URL + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(norm);
  }

  /* ---------- github ---------- */
  function loadGh() {
    var g = {};
    try { g = JSON.parse(localStorage.getItem(GH_KEY)) || {}; } catch (e) {}
    // On https://OWNER.github.io/REPO/ the owner and repo can be inferred.
    var m = /^([^.]+)\.github\.io$/i.exec(location.hostname);
    if (!g.owner && m) g.owner = m[1];
    if (!g.repo && m) { var p = location.pathname.split('/').filter(Boolean)[0]; g.repo = p && !/\./.test(p) ? p : m[1] + '.github.io'; }
    g.branch = g.branch || 'main';
    g.token = g.token || '';
    return g;
  }
  function saveGh() { try { localStorage.setItem(GH_KEY, JSON.stringify(gh)); } catch (e) {} }
  function ghReady() { return !!(gh.owner && gh.repo && gh.token); }
  function ghUrl() { return 'https://api.github.com/repos/' + encodeURIComponent(gh.owner) + '/' + encodeURIComponent(gh.repo) + '/contents/' + DATA_URL; }
  function ghReq(method, url, body) {
    return fetch(url, {
      method: method, cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + gh.token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.message || ('HTTP ' + r.status)); e.status = r.status; throw e; }
        return j;
      });
    });
  }
  function b64enc(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64dec(str) { return decodeURIComponent(escape(atob(String(str).replace(/\s/g, '')))); }
  function ghRead() {
    return ghReq('GET', ghUrl() + '?ref=' + encodeURIComponent(gh.branch)).then(function (j) {
      return { sha: j.sha, data: norm(JSON.parse(b64dec(j.content))) };
    });
  }

  /* ---------- display ---------- */
  function head() {
    return '<div class="hd"><div><div class="ttl">' + esc(state.title) + '</div>' +
      (state.tagline ? '<div class="sub">' + esc(state.tagline) + '</div>' : '') +
      '</div><div class="clk"><div class="ct" id="clk-t"></div><div class="cd" id="clk-d"></div></div></div>';
  }
  function tapsHTML() {
    if (!state.taps.length) return '<div class="empty">No taps listed</div>';
    return state.taps.map(function (t, i) {
      var out = !!t.out;
      var meta = [t.brewery, t.style].filter(Boolean).map(esc).join(' &middot; ');
      var abv = String(t.abv || '').replace(/\s*%\s*$/, '');
      var right = out ? '<div class="kick">Kicked</div>' :
        (abv ? '<div class="abv">' + esc(abv) + '%</div>' : '') + (t.price ? '<div class="tp">' + esc(t.price) + '</div>' : '');
      return '<div class="tap' + (out ? ' out' : '') + '"><div class="tn">' + (i + 1) + '</div><div><div class="tname">' +
        esc(t.name || 'Untitled') + '</div>' + (meta ? '<div class="tmeta">' + meta + '</div>' : '') +
        '</div><div class="tr">' + right + '</div></div>';
    }).join('');
  }
  function sectionsHTML() {
    var out = '';
    state.sections.forEach(function (s) {
      var items = s.items.filter(function (it) { return !it.hide && it.name; });
      if (!items.length) return;
      out += '<div class="sec"><div class="lbl">' + esc(s.title) + '</div>' + items.map(function (it) {
        return '<div class="it"><span class="iname">' + esc(it.name) + '</span>' +
          (it.price ? '<span class="dots"></span><span class="iprice">' + esc(it.price) + '</span>' : '') + '</div>' +
          (it.desc ? '<div class="idesc">' + esc(it.desc) + '</div>' : '');
      }).join('') + '</div>';
    });
    return out || '<div class="empty">Nothing on the menu right now</div>';
  }
  function scoresBody() {
    var g = '';
    for (var i = 1; i <= 6; i++) {
      g += '<div class="game"><div class="gs">Game ' + i + '</div>' +
        '<div class="tm"><span class="sk"></span><span class="sc">&ndash;</span></div>' +
        '<div class="tm"><span class="sk"></span><span class="sc">&ndash;</span></div></div>';
    }
    return '<div class="main"><div class="scwrap"><div class="lbl">Scoreboard</div><div class="games">' + g +
      '</div><div class="stub">Live scores are not connected yet. This is the layout placeholder.</div></div></div>';
  }
  function ticker() {
    var seg = '<span class="ti">Live scores will scroll here</span><span class="ti-d"></span>';
    var run = seg + seg + seg + seg + seg + seg;
    return '<div class="tick"><div class="tk-l">Scores</div><div class="tk-w"><div class="track"><div class="run">' + run +
      '</div><div class="run" aria-hidden="true">' + run + '</div></div></div></div>';
  }
  function renderDisplay() {
    document.body.className = 'tv';
    var body = state.mode === 'scores' ? scoresBody() :
      '<div class="main"><div class="col col-l"><div class="lbl">On Tap</div>' + tapsHTML() + '</div><div class="col">' + sectionsHTML() + '</div></div>';
    app.innerHTML = '<div id="screen"><div class="stage" id="stage">' + head() + body + (state.mode === 'ticker' ? ticker() : '') +
      '</div></div><a class="editpill" href="#edit">Edit</a>';
    fit(); clock(); markMore();
  }
  function fit() {
    var s = document.getElementById('screen'), st = document.getElementById('stage');
    if (!s || !st) return;
    var k = Math.min(s.clientWidth / 1280, s.clientHeight / 720);
    st.style.transform = 'translate(-50%,-50%) scale(' + k + ')';
  }
  function markMore() {
    var cols = app.querySelectorAll('.col');
    for (var i = 0; i < cols.length; i++) {
      var old = cols[i].querySelector('.more');
      if (old) old.parentNode.removeChild(old);
      if (cols[i].scrollHeight > cols[i].clientHeight + 2) cols[i].insertAdjacentHTML('beforeend', '<div class="more">+ more</div>');
    }
  }
  function clock() {
    var t = document.getElementById('clk-t'), d = document.getElementById('clk-d');
    if (!t) return;
    var n = new Date();
    t.textContent = n.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    d.textContent = n.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  }
  function toast(msg) {
    var el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; }, 2500);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3000);
  }
  function poll() {
    if (editing) return;
    fetchMenu().then(function (s) {
      var j = serialize(s);
      if (j !== baseline) { state = s; baseline = j; if (!editing) renderDisplay(); }
    }, function () { /* keep showing the last good menu */ });
  }

  /* ---------- fire tv ---------- */
  function toggleFullscreen() {
    var d = document, el = d.documentElement;
    var fs = d.fullscreenElement || d.webkitFullscreenElement;
    if (fs) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
    var req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) { try { var p = req.call(el); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
  }
  var wakeLock = null;
  function keepAwake() {
    if (!navigator.wakeLock || document.visibilityState !== 'visible' || wakeLock) return;
    navigator.wakeLock.request('screen').then(function (l) {
      wakeLock = l; l.addEventListener('release', function () { wakeLock = null; });
    }, function () {});
  }
  document.addEventListener('keydown', function (e) {
    if (editing) return;
    // Fire TV remote: Select/OK arrives as Enter, Play/Pause as MediaPlayPause (179).
    if (e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 23) { e.preventDefault(); toggleFullscreen(); keepAwake(); }
    else if (e.key === 'MediaPlayPause' || e.keyCode === 179) { e.preventDefault(); toast('Refreshing menu…'); poll(); }
  });
  document.addEventListener('visibilitychange', keepAwake);

  /* ---------- editor ---------- */
  function field(id, attrs, value, ph, label, type) {
    return '<input type="' + (type || 'text') + '" id="' + id + '" ' + attrs + ' value="' + esc(value) + '" placeholder="' + esc(ph) + '" aria-label="' + esc(label) + '" autocomplete="off">';
  }
  function tapCard(t, i) {
    var a = 'data-t="' + t.id + '"';
    return '<div class="sub-card"><div class="hd-row"><span class="tapno">' + (i + 1) + '</span>' +
      field('t-' + t.id + '-name', a + ' data-f="name"', t.name, 'Beer name', 'Tap ' + (i + 1) + ' beer name') + '</div>' +
      '<div class="row">' + field('t-' + t.id + '-brewery', a + ' data-f="brewery"', t.brewery, 'Brewery', 'Brewery') +
      field('t-' + t.id + '-style', a + ' data-f="style"', t.style, 'Style', 'Style') + '</div>' +
      '<div class="row">' + field('t-' + t.id + '-abv', a + ' data-f="abv" inputmode="decimal"', t.abv, 'ABV %', 'ABV percent') +
      field('t-' + t.id + '-price', a + ' data-f="price"', t.price, 'Price', 'Price') +
      '<label class="chk"><input type="checkbox" id="t-' + t.id + '-out" ' + a + ' data-f="out"' + (t.out ? ' checked' : '') + '> Kicked</label></div>' +
      '<div class="acts"><button type="button" class="btn" data-act="upTap" data-t="' + t.id + '" aria-label="Move tap up"' + (i === 0 ? ' disabled' : '') + '>&uarr;</button>' +
      '<button type="button" class="btn" data-act="downTap" data-t="' + t.id + '" aria-label="Move tap down"' + (i === state.taps.length - 1 ? ' disabled' : '') + '>&darr;</button>' +
      '<button type="button" class="btn" data-act="delTap" data-t="' + t.id + '" data-label="Remove">Remove</button></div></div>';
  }
  function itemCard(s, it) {
    var a = 'data-s="' + s.id + '" data-i="' + it.id + '"';
    return '<div class="sub-card"><div class="row">' +
      field('i-' + it.id + '-name', a + ' data-f="name"', it.name, 'Item', 'Item name') +
      field('i-' + it.id + '-price', a + ' data-f="price"', it.price, 'Price', 'Price') + '</div>' +
      field('i-' + it.id + '-desc', a + ' data-f="desc"', it.desc, 'Short description (optional)', 'Description') +
      '<div class="acts"><label class="chk"><input type="checkbox" id="i-' + it.id + '-hide" ' + a + ' data-f="hide"' + (it.hide ? ' checked' : '') + '> Hide from TV</label>' +
      '<button type="button" class="btn" data-act="delItem" data-s="' + s.id + '" data-i="' + it.id + '" data-label="Remove">Remove</button></div></div>';
  }
  function sectionCard(s) {
    return '<section class="card"><div class="hd-row">' +
      field('s-' + s.id + '-title', 'data-s="' + s.id + '" data-f="title"', s.title, 'Section title', 'Section title') +
      '<button type="button" class="btn" data-act="delSection" data-s="' + s.id + '" data-label="Remove section">Remove section</button></div>' +
      s.items.map(function (it) { return itemCard(s, it); }).join('') +
      '<div class="qa"><input type="text" id="qa-' + s.id + '" data-qa="' + s.id + '" placeholder="Add an item, press Enter" aria-label="Add an item to ' + esc(s.title) + '" autocomplete="off">' +
      '<button type="button" class="btn" data-act="quickAdd" data-s="' + s.id + '">Add</button></div></section>';
  }
  function ghCard() {
    return '<details class="card" id="ghcard"' + (ghReady() ? '' : ' open') + '><summary>GitHub connection</summary>' +
      '<p class="hint">Publish saves <code>menu.json</code> to your repo, and the TV picks it up within a few minutes. ' +
      'Use a fine-grained token with <b>Contents: Read and write</b> on this repo only. It is stored in this browser only.</p>' +
      '<div class="row">' + field('gh-owner', 'data-gh="owner"', gh.owner, 'GitHub user', 'GitHub user') +
      field('gh-repo', 'data-gh="repo"', gh.repo, 'Repository', 'Repository') +
      field('gh-branch', 'data-gh="branch"', gh.branch, 'Branch', 'Branch') + '</div>' +
      field('gh-token', 'data-gh="token"', gh.token, 'github_pat_…', 'GitHub token', 'password') +
      '<div class="acts"><button type="button" class="btn" data-act="download">Download menu.json instead</button></div></details>';
  }
  function editorHTML() {
    if (!loaded) return '<div class="ed"><p class="hint" style="padding-top:24px">Loading menu…</p></div>';
    var h = '<div class="ed"><div class="bar"><div class="bar-t"><div class="bar-h">Display editor</div><div class="bar-s" id="status" role="status"></div></div>' +
      '<a class="lnk" href="#">View display</a><button type="button" class="btn primary" id="pub" data-act="publish">Publish</button></div>' +
      '<p class="hint">Edits stay on this page until you publish. The TV checks for changes every couple of minutes.</p>';
    h += ghCard();
    h += '<section class="card"><h2>Screen</h2><div class="seg" role="group" aria-label="Screen mode">' +
      Object.keys(MODES).map(function (k) {
        return '<button type="button" class="btn seg-b" id="mode-' + k + '" data-act="mode" data-mode="' + k + '" aria-pressed="' + (state.mode === k) + '">' + MODES[k] + '</button>';
      }).join('') + '</div></section>';
    h += '<section class="card"><h2>Bar</h2><label class="fl" for="g-title">Name</label>' +
      field('g-title', 'data-g="title"', state.title, 'Bar name', 'Bar name') +
      '<label class="fl" for="g-tagline">Tagline</label>' + field('g-tagline', 'data-g="tagline"', state.tagline, 'Optional', 'Tagline') + '</section>';
    h += '<section class="card"><div class="card-top"><h2>On tap</h2><button type="button" class="btn" data-act="addTap">Add tap</button></div>' +
      (state.taps.length ? state.taps.map(tapCard).join('') : '<p class="hint">No taps yet.</p>') + '</section>';
    h += state.sections.map(sectionCard).join('');
    h += '<button type="button" class="btn" data-act="addSection">Add menu section</button></div>';
    return h;
  }
  function rerender(focusId) {
    var id = focusId || (document.activeElement && document.activeElement.id);
    var det = document.getElementById('ghcard');
    var ghOpen = det ? det.open : null;
    app.innerHTML = editorHTML();
    det = document.getElementById('ghcard');
    if (det && ghOpen !== null) det.open = ghOpen;
    if (id) { var n = document.getElementById(id); if (n && n.focus) n.focus(); }
    updateBar();
  }
  function updateBar() {
    var p = document.getElementById('pub'), s = document.getElementById('status');
    if (!p) return;
    var dirty = serialize(state) !== baseline;
    p.disabled = !dirty || busy;
    s.textContent = note || (busy ? 'Publishing…' : !dirty ? 'Matches what the TV shows' :
      ghReady() ? 'Unpublished changes' : 'Unpublished changes. Connect GitHub to publish.');
    s.className = 'bar-s' + (noteErr ? ' err' : dirty && !note ? ' dirty' : '');
  }
  function setNote(msg, err) { note = msg || ''; noteErr = !!err; updateBar(); }
  function apply(el) {
    var v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.dataset.gh) { gh[el.dataset.gh] = v.trim(); saveGh(); return; }
    if (el.dataset.g) { state[el.dataset.g] = v; return; }
    var f = el.dataset.f;
    if (!f) return;
    if (el.dataset.t) { var t = find(state.taps, el.dataset.t); if (t) t[f] = v; return; }
    if (el.dataset.i) { var s = find(state.sections, el.dataset.s); var it = s && find(s.items, el.dataset.i); if (it) it[f] = v; return; }
    if (el.dataset.s) { var sec = find(state.sections, el.dataset.s); if (sec) sec[f] = v; }
  }
  function swap(arr, i, j) { var x = arr[i]; arr[i] = arr[j]; arr[j] = x; }
  function indexOf(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return i; return -1; }
  function addItem(sid, name) {
    var s = find(state.sections, sid); name = (name || '').trim();
    if (!s) return;
    if (!name) { var q = document.getElementById('qa-' + sid); if (q) q.focus(); return; }
    s.items.push({ id: uid(), name: name, price: '', desc: '', hide: false });
    note = ''; noteErr = false; rerender('qa-' + sid);
  }
  function arm(b) {
    b.dataset.armed = '1'; b.textContent = 'Tap again to remove'; b.classList.add('armed');
    setTimeout(function () {
      if (document.body.contains(b)) { delete b.dataset.armed; b.textContent = b.dataset.label || 'Remove'; b.classList.remove('armed'); }
    }, 2500);
  }
  var DESTRUCTIVE = { delTap: 1, delItem: 1, delSection: 1 };

  app.addEventListener('input', function (e) { if (!editing) return; note = ''; noteErr = false; apply(e.target); updateBar(); });
  app.addEventListener('change', function (e) { if (!editing) return; if (e.target.type === 'checkbox') { note = ''; noteErr = false; apply(e.target); updateBar(); } });
  app.addEventListener('keydown', function (e) {
    if (editing && e.key === 'Enter' && e.target.dataset && e.target.dataset.qa) { e.preventDefault(); addItem(e.target.dataset.qa, e.target.value); }
  });
  app.addEventListener('click', function (e) {
    if (!editing) return;
    var b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    var a = b.dataset.act;
    if (DESTRUCTIVE[a] && !b.dataset.armed) { arm(b); return; }
    note = ''; noteErr = false;
    if (a === 'publish') { publish(); return; }
    if (a === 'download') { download(); return; }
    if (a === 'mode') { state.mode = b.dataset.mode; rerender(); return; }
    if (a === 'addTap') { var id = uid(); state.taps.push({ id: id, name: '', brewery: '', style: '', abv: '', price: '', out: false }); rerender('t-' + id + '-name'); return; }
    if (a === 'upTap' || a === 'downTap') {
      var i = indexOf(state.taps, b.dataset.t), j = a === 'upTap' ? i - 1 : i + 1;
      if (i > -1 && j > -1 && j < state.taps.length) swap(state.taps, i, j);
      rerender(); return;
    }
    if (a === 'delTap') { var k = indexOf(state.taps, b.dataset.t); if (k > -1) state.taps.splice(k, 1); rerender('pub'); return; }
    if (a === 'quickAdd') { var q = document.getElementById('qa-' + b.dataset.s); addItem(b.dataset.s, q ? q.value : ''); return; }
    if (a === 'delItem') {
      var s = find(state.sections, b.dataset.s), n = s ? indexOf(s.items, b.dataset.i) : -1;
      if (n > -1) s.items.splice(n, 1);
      rerender('qa-' + b.dataset.s); return;
    }
    if (a === 'addSection') { var sid = uid(); state.sections.push({ id: sid, title: 'New section', items: [] }); rerender('s-' + sid + '-title'); return; }
    if (a === 'delSection') { var m = indexOf(state.sections, b.dataset.s); if (m > -1) state.sections.splice(m, 1); rerender('pub'); }
  });

  /* ---------- publish ---------- */
  function download() {
    var blob = new Blob([serialize(state)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = DATA_URL;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 0);
    setNote('Downloaded. Commit it to the repo to update the TV.');
  }
  function publish() {
    if (busy) return;
    if (!ghReady()) {
      var det = document.getElementById('ghcard'); if (det) det.open = true;
      var tok = document.getElementById(gh.owner && gh.repo ? 'gh-token' : 'gh-owner'); if (tok) tok.focus();
      setNote('Add your GitHub details first.', true); return;
    }
    busy = true; setNote('');
    var body = serialize(state);
    // Always fetch the current sha right before writing so we never clobber with a stale one.
    ghRead().then(function (cur) {
      return ghReq('PUT', ghUrl(), { message: 'Update bar menu', content: b64enc(body), sha: cur.sha, branch: gh.branch });
    }).then(function () {
      baseline = body; busy = false; setNote('Published. The TV will update in a few minutes.');
    }, function (err) {
      busy = false;
      var c = err && err.status;
      setNote(c === 401 ? 'GitHub rejected the token.' : c === 403 ? 'Token cannot write to this repo.' :
        c === 404 ? 'Repo or menu.json not found. Check the GitHub details.' : 'Could not publish: ' + (err && err.message || 'unknown error'), true);
    });
  }

  /* ---------- boot ---------- */
  function loadForEditor() {
    // Prefer the GitHub API copy: Pages can lag a minute or two behind the latest commit.
    var p = ghReady() ? ghRead().then(function (r) { return r.data; }, fetchMenu) : fetchMenu();
    return p.then(function (s) { state = s; baseline = serialize(s); loaded = true; },
      function () { loaded = true; baseline = serialize(state); note = 'Could not load menu.json. Starting blank.'; noteErr = true; });
  }
  function route() {
    var was = editing;
    editing = location.hash === '#edit';
    if (editing) {
      document.body.className = 'editing';
      if (!was) { loaded = false; rerender(''); loadForEditor().then(function () { if (editing) rerender(''); }); }
      else rerender('');
    } else {
      if (was && serialize(state) !== baseline) { state = norm(JSON.parse(baseline)); }
      renderDisplay();
      if (was) poll();
    }
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('resize', function () { if (!editing) fit(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!editing) markMore(); });
  setInterval(clock, 15000);
  setInterval(poll, POLL_MS);
  // Full reload every 6 hours picks up code changes and clears any slow memory growth on the Fire TV.
  setTimeout(function () { if (!editing) { try { location.reload(); } catch (e) {} } }, 6 * 3600 * 1000);

  if (location.hash === '#edit') { route(); }
  else {
    fetchMenu().then(function (s) { state = s; baseline = serialize(s); }, function () { baseline = serialize(state); })
      .then(function () { route(); keepAwake(); });
  }
})();
