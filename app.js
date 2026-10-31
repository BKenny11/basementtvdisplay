(function () {
  'use strict';
  var app = document.getElementById('app');

  // The Google Sheet that holds the menu. It must be shared as "Anyone with the link: Viewer".
  var SHEET_ID = '1MRG1xUpZEYDi8NpmIcatDR8UpHEttfFGdvJxjh2BX7E';
  var SHEET_EDIT_URL = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit';
  var POLL_MS = 60 * 1000;
  var CACHE_KEY = 'basementtv.last';
  var INSET_KEY = 'basementtv.inset';
  var INSET_DEFAULT = 5, INSET_MAX = 15;
  var MODES = { 'menu': 'menu', 'menu + scores ticker': 'ticker', 'ticker': 'ticker', 'scoreboard': 'scores', 'scores': 'scores' };

  var inset = loadInset();
  var state = null;
  var current = '';
  var failed = false;

  function esc(x) {
    return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- data (Google Sheet) ---------- */
  function tabUrl(tab) {
    return 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv&headers=1&sheet=' +
      encodeURIComponent(tab) + '&t=' + Date.now();
  }
  function fetchTab(tab) {
    return fetch(tabUrl(tab), { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error(tab + ': HTTP ' + r.status);
      return r.text();
    }).then(function (t) {
      // A sheet that isn't shared publicly answers with a Google sign-in page instead of CSV.
      if (/^\s*</.test(t)) throw new Error(tab + ': sheet is not shared publicly');
      return rows(parseCSV(t));
    });
  }
  function parseCSV(text) {
    var out = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); out.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell || row.length) { row.push(cell); out.push(row); }
    return out;
  }
  // Turn CSV rows into objects keyed by lowercased header, so columns can be reordered in the sheet.
  function rows(csv) {
    if (!csv.length) return [];
    var keys = csv[0].map(function (h) { return h.trim().toLowerCase(); });
    return csv.slice(1).map(function (r) {
      var o = {};
      keys.forEach(function (k, i) { o[k] = (r[i] || '').trim(); });
      return o;
    });
  }
  function pick(o, names) {
    for (var i = 0; i < names.length; i++) if (o[names[i]]) return o[names[i]];
    return '';
  }
  function yes(v) { return /^(true|yes|y|x|1)$/i.test(String(v || '').trim()); }

  function fetchMenu() {
    // A missing Teams tab only turns off scores; it shouldn't take the menu down with it.
    var teamsTab = fetchTab('Teams').catch(function () { return []; });
    return Promise.all([fetchTab('Taps'), fetchTab('Menu'), fetchTab('Settings'), teamsTab]).then(function (res) {
      var taps = res[0], items = res[1], settings = {};
      res[2].forEach(function (r) { var k = pick(r, ['setting']).toLowerCase(); if (k) settings[k] = pick(r, ['value']); });
      var sections = [], byName = {};
      items.forEach(function (r) {
        var name = pick(r, ['item', 'name']);
        if (!name || yes(r.hide)) return;
        var title = pick(r, ['section']) || 'Specials';
        var sec = byName[title];
        if (!sec) { sec = byName[title] = { title: title, items: [] }; sections.push(sec); }
        sec.items.push({ name: name, price: pick(r, ['price']), desc: pick(r, ['description', 'desc']) });
      });
      return {
        title: settings['bar name'] || 'The Basement Bar',
        tagline: settings['tagline'] || '',
        mode: MODES[(settings['screen'] || '').toLowerCase()] || 'scores',
        taps: taps.filter(function (r) { return pick(r, ['beer', 'name']); }).map(function (r) {
          return { name: pick(r, ['beer', 'name']), brewery: r.brewery || '', style: r.style || '',
            abv: pick(r, ['abv %', 'abv']), price: r.price || '', out: yes(r.kicked) };
        }),
        sections: sections,
        teams: res[3].filter(function (r) { return r.league && r.team; }).map(function (r) {
          // Celebrate defaults to on; only an explicit unticked box turns it off.
          return { league: r.league, team: r.team, celebrate: !/^(false|no|n|0)$/i.test(r.celebrate || '') };
        })
      };
    });
  }
  function loadCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; }
  }
  function saveCache(j) { try { localStorage.setItem(CACHE_KEY, j); } catch (e) {} }

  /* ---------- display ---------- */
  var WAVES = '<svg class="waves" viewBox="0 0 1280 34" preserveAspectRatio="none" aria-hidden="true">' +
    '<path fill="#2c93bf" d="M0 6 C80 0 160 14 240 8 S400 0 480 8 S640 16 720 8 S880 0 960 8 S1120 16 1200 8 S1260 4 1280 6 V34 H0Z"/>' +
    '<path fill="#1f7fa8" d="M0 14 C90 8 170 20 260 14 S430 6 520 14 S690 22 780 14 S950 6 1040 14 S1200 22 1280 14 V34 H0Z"/>' +
    '<path fill="#f7f1df" opacity=".9" d="M0 24 C70 20 140 28 210 24 S350 18 420 24 S560 30 630 24 S770 18 840 24 S980 30 1050 24 S1190 18 1280 24 V27 C1190 21 1120 30 1050 27 S910 21 840 27 S700 33 630 27 S490 21 420 27 S280 33 210 27 S70 23 0 27Z"/>' +
    '<path fill="#e6cf9f" d="M0 27 C70 23 140 33 210 27 S350 21 420 27 S560 33 630 27 S770 21 840 27 S980 33 1050 27 S1190 21 1280 27 V34 H0Z"/></svg>';
  function head(s) {
    return '<div class="hd"><div><div class="ttl">' + esc(s.title) + '</div>' +
      (s.tagline ? '<div class="sub">' + esc(s.tagline) + '</div>' : '') +
      '</div><div class="clk"><div class="ct" id="clk-t"></div><div class="cd" id="clk-d"></div></div>' + WAVES + '</div>';
  }
  function tapsHTML(s) {
    if (!s.taps.length) return '<div class="empty">No taps listed</div>';
    return s.taps.map(function (t, i) {
      var out = !!t.out;
      var meta = [t.brewery, t.style].filter(Boolean).map(esc).join(' &middot; ');
      var abv = String(t.abv || '').replace(/\s*%\s*$/, '');
      var right = out ? '<div class="kick">Kicked</div>' :
        (abv ? '<div class="abv">' + esc(abv) + '%</div>' : '') + (t.price ? '<div class="tp">' + esc(t.price) + '</div>' : '');
      return '<div class="tap' + (out ? ' out' : '') + '"><div class="tn">' + (i + 1) + '</div><div><div class="tname">' +
        esc(t.name) + '</div>' + (meta ? '<div class="tmeta">' + meta + '</div>' : '') +
        '</div><div class="tr">' + right + '</div></div>';
    }).join('');
  }
  function sectionsHTML(s) {
    var out = s.sections.map(function (sec) {
      return '<div class="sec"><div class="lbl">' + esc(sec.title) + '</div>' + sec.items.map(function (it) {
        return '<div class="it"><span class="iname">' + esc(it.name) + '</span>' +
          (it.price ? '<span class="dots"></span><span class="iprice">' + esc(it.price) + '</span>' : '') + '</div>' +
          (it.desc ? '<div class="idesc">' + esc(it.desc) + '</div>' : '');
      }).join('') + '</div>';
    }).join('');
    return out || '<div class="empty">Nothing on the menu right now</div>';
  }
  // Scores, the ticker's contents and celebrations come from scores.js; these are just the slots it fills.
  function scoresBody() {
    return '<div class="main"><div class="board wide"><div class="col"><div class="lbl">Scoreboard</div>' +
      '<div class="gwrap" id="board"></div></div></div></div>';
  }
  function ticker() {
    return '<div class="tick"><div class="tk-l" id="tk-label">Scores</div><div class="tk-w" id="tk"></div></div>';
  }
  function statusBody() {
    return '<div class="main"><div class="board wide"><div class="col"><div class="lbl">Scoreboard</div><div class="empty">' +
      (failed ? 'Can’t reach the Google Sheet. Check that it’s shared as “Anyone with the link: Viewer”. Retrying every minute.' :
        'Loading…') + '</div></div></div></div>';
  }
  function render() {
    document.body.className = 'tv';
    var s = state || { title: 'The Basement Bar', tagline: '', mode: 'scores' };
    var body = !state ? statusBody() : s.mode === 'scores' ? scoresBody() :
      '<div class="main"><div class="board"><div class="col"><div class="lbl">On Tap</div>' + tapsHTML(s) + '</div></div>' +
      '<div class="board"><div class="col">' + sectionsHTML(s) + '</div></div></div>';
    var showTicker = state && (s.mode === 'ticker' || s.mode === 'scores');
    app.innerHTML = '<div id="screen"><div class="stage" id="stage">' + head(s) + body + (showTicker ? ticker() : '') +
      '</div></div><a class="editpill" href="' + SHEET_EDIT_URL + '" target="_blank" rel="noopener">Edit menu</a>';
    fit(); clock(); markMore();
    if (window.Scores) {
      if (state) Scores.setTeams(state.teams || []);
      Scores.attach({ ticker: document.getElementById('tk'), label: document.getElementById('tk-label'), board: document.getElementById('board') });
    }
  }
  function fit() {
    var s = document.getElementById('screen'), st = document.getElementById('stage');
    if (!s || !st) return;
    // Shrink the stage by the overscan margin on every side so TVs that crop the picture don't cut off the edges.
    var f = 1 - 2 * inset / 100;
    var k = Math.min(s.clientWidth * f / 1280, s.clientHeight * f / 720);
    st.style.transform = 'translate(-50%,-50%) scale(' + k + ')';
  }
  function loadInset() {
    var q = /[?&]inset=([\d.]+)/.exec(location.search), v;
    if (q) { v = parseFloat(q[1]); try { localStorage.setItem(INSET_KEY, String(v)); } catch (e) {} }
    else { try { v = parseFloat(localStorage.getItem(INSET_KEY)); } catch (e) {} }
    return isFinite(v) ? Math.max(0, Math.min(INSET_MAX, v)) : INSET_DEFAULT;
  }
  var calibTimer = null;
  function nudgeInset(d) {
    inset = Math.max(0, Math.min(INSET_MAX, Math.round((inset + d) * 2) / 2));
    try { localStorage.setItem(INSET_KEY, String(inset)); } catch (e) {}
    fit();
    var st = document.getElementById('stage');
    if (st) st.classList.add('calib');
    clearTimeout(calibTimer);
    calibTimer = setTimeout(function () { var s = document.getElementById('stage'); if (s) s.classList.remove('calib'); }, 3000);
    toast('Edge margin ' + inset + '%  ·  Up = smaller, Down = bigger');
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
  var lastToast = null;
  function toast(msg) {
    if (lastToast && lastToast.parentNode) lastToast.parentNode.removeChild(lastToast);
    var el = lastToast = document.createElement('div');
    el.className = 'toast'; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; }, 2500);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3000);
  }
  function poll(manual) {
    return fetchMenu().then(function (s) {
      var j = JSON.stringify(s);
      failed = false;
      if (j !== current) { state = s; current = j; saveCache(j); render(); }
      else if (manual) toast('Menu is up to date');
    }, function (err) {
      // Keep showing the last good menu; only show the error screen if there's nothing to show.
      failed = true;
      if (window.console) console.warn('Menu refresh failed:', err && err.message);
      if (!state) render();
      if (manual) toast('Couldn’t reach the menu sheet');
    });
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
    // Fire TV remote: Select/OK arrives as Enter, Play/Pause as MediaPlayPause (179).
    if (e.key === 'Enter' || e.keyCode === 13 || e.keyCode === 23) { e.preventDefault(); toggleFullscreen(); keepAwake(); }
    else if (e.key === 'MediaPlayPause' || e.keyCode === 179) {
      e.preventDefault(); toast('Refreshing menu and scores…'); poll(true); if (window.Scores) Scores.refresh();
    }
    // Fast-forward plays a sample score celebration.
    else if (e.key === 'MediaFastForward' || e.keyCode === 228 || e.key === 'c') { e.preventDefault(); if (window.Scores) Scores.demo(); }
    // Up grows the picture (less margin), Down shrinks it, to dial in the TV's overscan.
    else if (e.key === 'ArrowUp' || e.keyCode === 38) { e.preventDefault(); nudgeInset(-0.5); }
    else if (e.key === 'ArrowDown' || e.keyCode === 40) { e.preventDefault(); nudgeInset(0.5); }
  });
  document.addEventListener('visibilitychange', keepAwake);

  /* ---------- boot ---------- */
  window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(markMore);
  setInterval(clock, 15000);
  setInterval(poll, POLL_MS);
  // Full reload every 6 hours picks up code changes and clears any slow memory growth on the Fire TV.
  setTimeout(function () { try { location.reload(); } catch (e) {} }, 6 * 3600 * 1000);

  // Show the last menu we saw right away (useful if the Fire TV boots before Wi-Fi is up), then refresh.
  var cached = loadCache();
  if (cached && cached.taps) { state = cached; current = JSON.stringify(cached); }
  render();
  poll().then(keepAwake);
})();
