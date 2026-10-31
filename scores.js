/* Live scores, team news and score celebrations for followed teams, from ESPN's public site API.
   app.js hands over the Teams tab rows (Scores.setTeams) and the DOM slots (Scores.attach); everything sports lives here. */
(function () {
  'use strict';
  var API = 'https://site.api.espn.com/apis/site/v2/sports/';
  var LIVE_POLL_MS = 30 * 1000, IDLE_POLL_MS = 60 * 1000;
  var NEWS_MS = 10 * 60 * 1000, SCHEDULE_MS = 3 * 3600 * 1000, BIG_ONLY_MS = 5 * 60 * 1000;
  var MAX_BIG = 12, NEWS_PER_TEAM = 2, NEWS_MAX = 10, BOARD_MAX = 12;
  // The marquee jumps one LED column (3px, matching the dot grid in style.css) at a time, like a bar sign.
  var TICKER_PX_PER_S = 75, TICKER_STEP_PX = 3, LOGO_PX = 12;
  var CELEBRATION_MS = 9000;

  var LEAGUES = [
    { key: 'nfl', label: 'NFL', path: 'football/nfl', sport: 'football', names: ['nfl'] },
    { key: 'college-football', label: 'NCAAF', path: 'football/college-football', sport: 'football', college: true, groups: 80,
      names: ['college football', 'ncaaf', 'ncaa football', 'cfb'] },
    { key: 'nba', label: 'NBA', path: 'basketball/nba', sport: 'basketball', names: ['nba'] },
    { key: 'wnba', label: 'WNBA', path: 'basketball/wnba', sport: 'basketball', names: ['wnba'] },
    { key: 'mens-college-basketball', label: 'NCAAB', path: 'basketball/mens-college-basketball', sport: 'basketball', college: true, groups: 50,
      names: ['college basketball', 'ncaab', 'ncaam', 'mens college basketball', "men's college basketball"] },
    { key: 'mlb', label: 'MLB', path: 'baseball/mlb', sport: 'baseball', names: ['mlb', 'baseball'] },
    { key: 'nhl', label: 'NHL', path: 'hockey/nhl', sport: 'hockey', names: ['nhl', 'hockey'] },
    { key: 'mls', label: 'MLS', path: 'soccer/usa.1', sport: 'soccer', names: ['mls'] },
    { key: 'premier-league', label: 'EPL', path: 'soccer/eng.1', sport: 'soccer', names: ['premier league', 'epl', 'english premier league'] }
  ];

  var followed = [];          // [{ league, team, celebrate, key }]
  var followedByKey = {};     // 'nfl:2' -> followed entry
  var teamsSig = '', resolving = false;
  var directories = {};       // league key -> Promise<[team]>
  var games = {};             // event id -> parsed game (followed teams only)
  var seenScore = {}, seenState = {}, lastTD = {};
  var news = [];              // [{ f, headline, at }]
  var nextGame = {};          // followed key -> parsed game
  var gameToday = {};         // league key -> true when a followed college team plays today (per schedule)
  var lastNews = 0, lastSchedule = 0, lastBoard = {};
  var pollTimer = null, polling = false;
  var slots = {};             // { stage, ticker, label, board }
  var tickerSig = '', pendingTicker = null, tickerIsPlaceholder = false;
  var queue = [], showing = false;

  function esc(x) {
    return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function low(x) { return String(x || '').toLowerCase().replace(/[^a-z0-9&' ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function getJSON(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error(url + ': HTTP ' + r.status);
      return r.json();
    });
  }
  function leagueFor(label) {
    var l = low(label);
    for (var i = 0; i < LEAGUES.length; i++) if (LEAGUES[i].names.indexOf(l) > -1 || LEAGUES[i].key === l) return LEAGUES[i];
    return null;
  }

  /* ---------- team lookup ---------- */
  function directory(lg) {
    if (!directories[lg.key]) {
      directories[lg.key] = getJSON('teams/' + lg.key + '.json').catch(function (e) { delete directories[lg.key]; throw e; });
    }
    return directories[lg.key];
  }
  // Match what was typed in the sheet ("Bills", "BUF", "Buffalo Bills", "Buffalo") against the league's teams.
  function resolve(lg, text) {
    var q = low(text);
    return directory(lg).then(function (list) {
      var fields = ['name', 'abbr', 'short', 'nick', 'loc'];
      for (var f = 0; f < fields.length; f++) {
        for (var i = 0; i < list.length; i++) if (low(list[i][fields[f]]) === q) return list[i];
      }
      for (var j = 0; j < list.length; j++) if (low(list[j].name).indexOf(q) === 0) return list[j];
      return null;
    });
  }

  function setTeams(rows) {
    var sig = JSON.stringify(rows || []);
    if (sig === teamsSig) return;
    teamsSig = sig;
    resolving = true;
    Promise.all((rows || []).map(function (r) {
      var lg = leagueFor(r.league);
      if (!lg || !r.team) return Promise.resolve(null);
      return resolve(lg, r.team).then(function (t) {
        if (!t) { warn('No ' + lg.label + ' team matches "' + r.team + '"'); return null; }
        return { league: lg, team: t, celebrate: r.celebrate !== false, key: lg.key + ':' + t.id };
      }, function () { return null; });
    })).then(function (list) {
      resolving = false;
      followed = list.filter(Boolean);
      followedByKey = {};
      followed.forEach(function (f) { followedByKey[f.key] = f; });
      games = {}; news = []; nextGame = {}; gameToday = {};
      lastNews = 0; lastSchedule = 0; lastBoard = {};
      restart();
    });
  }
  function warn(msg) { if (window.console) console.warn('[scores] ' + msg); }

  /* ---------- polling ---------- */
  function restart() {
    clearTimeout(pollTimer);
    if (!followed.length) { update(); return; }
    tick();
  }
  // includeBig: also count playoff / Top 25 games (for polling speed); otherwise only followed teams' games.
  function anyLive(includeBig) {
    for (var id in games) if (games[id].state === 'in' && (includeBig || !games[id].big)) return true;
    return false;
  }
  function tick() {
    if (polling) return;
    polling = true;
    var now = Date.now(), jobs = [];
    if (now - lastSchedule > SCHEDULE_MS) { lastSchedule = now; jobs.push(loadSchedules()); }
    Promise.all(jobs).then(function () {
      var more = [loadScoreboards()];
      if (now - lastNews > NEWS_MS) { lastNews = now; more.push(loadNews()); }
      return Promise.all(more);
    }).catch(function (e) { warn(e && e.message); }).then(function () {
      polling = false;
      update();
      clearTimeout(pollTimer);
      pollTimer = setTimeout(tick, anyLive(true) ? LIVE_POLL_MS : IDLE_POLL_MS);
    });
  }
  function leaguesInUse() {
    var seen = {}, out = [];
    followed.forEach(function (f) { if (!seen[f.league.key]) { seen[f.league.key] = 1; out.push(f.league); } });
    return out;
  }
  function loadScoreboards() {
    var now = Date.now();
    return Promise.all(leaguesInUse().map(function (lg) {
      var url = API + lg.path + '/scoreboard';
      if (lg.college) {
        // The full division scoreboard (~1 MB) is only needed on days a followed team plays. Otherwise ESPN's default
        // college scoreboard (the featured Top 25 games) is enough, checked every 5 minutes unless one of them is live.
        if (gameToday[lg.key]) url += '?groups=' + lg.groups + '&limit=500';
        else if (!leagueHasLive(lg) && now - (lastBoard[lg.key] || 0) < BIG_ONLY_MS) return null;
      }
      lastBoard[lg.key] = now;
      return getJSON(url).then(function (j) {
        for (var id in games) if (games[id].league === lg) delete games[id];
        (j.events || []).forEach(function (e) {
          var g = parseEvent(e, lg);
          if (!g) return;
          if (g.home.f || g.away.f) { games[g.id] = g; detect(g); }
          else if (isBig(g, now)) { g.big = true; games[g.id] = g; }
        });
      }, function (e) { warn(e.message); });
    }));
  }
  // Other teams' games worth a spot on the ticker (never celebrated): playoff games, and college games with a
  // Top 25 team. Upcoming ones show within a day of kickoff and finals for 12 hours, so a week's slate doesn't flood it.
  function isBig(g, now) {
    var t = Date.parse(g.date);
    if (g.state === 'pre' && t - now > 24 * 3600 * 1000) return false;
    if (g.state === 'post' && now - t > 12 * 3600 * 1000) return false;
    return g.postseason || (g.league.college && !!(g.home.rank || g.away.rank));
  }
  function leagueHasLive(lg) {
    for (var id in games) if (games[id].league === lg && games[id].state === 'in') return true;
    return false;
  }
  function loadSchedules() {
    var today = new Date().toDateString();
    gameToday = {};
    return Promise.all(followed.map(function (f) {
      return getJSON(API + f.league.path + '/teams/' + f.team.id + '/schedule').then(function (j) {
        var soon = null, now = Date.now();
        (j.events || []).forEach(function (e) {
          var t = Date.parse(e.date);
          if (new Date(t).toDateString() === today) gameToday[f.league.key] = true;
          var st = e.competitions && e.competitions[0] && e.competitions[0].status;
          var done = st && st.type && st.type.state === 'post';
          if (!done && t > now - 5 * 3600 * 1000 && (!soon || t < Date.parse(soon.date))) soon = e;
        });
        nextGame[f.key] = soon ? parseEvent(soon, f.league) : null;
      }, function (e) { warn(e.message); });
    }));
  }
  function loadNews() {
    return Promise.all(followed.map(function (f) {
      return getJSON(API + f.league.path + '/news?team=' + f.team.id + '&limit=20').then(function (j) {
        // The team feed mixes in league-wide roundups; keep stories tagged with this team and at most a few others.
        return (j.articles || []).filter(function (a) {
          var tagged = (a.categories || []).filter(function (c) { return c.type === 'team'; });
          var mine = tagged.some(function (c) { return String(c.teamId) === String(f.team.id); });
          // "Media" items are video highlight clips, which read oddly as headlines.
          return mine && tagged.length <= 4 && a.headline && a.type !== 'Media';
        }).slice(0, NEWS_PER_TEAM).map(function (a) { return { f: f, headline: a.headline, at: Date.parse(a.published) || 0 }; });
      }, function (e) { warn(e.message); return []; });
    })).then(function (lists) {
      var seen = {}, all = [];
      lists.forEach(function (l) { (l || []).forEach(function (n) { if (!seen[n.headline]) { seen[n.headline] = 1; all.push(n); } }); });
      var cutoff = Date.now() - 4 * 86400 * 1000;
      news = all.filter(function (n) { return n.at > cutoff; }).sort(function (a, b) { return b.at - a.at; }).slice(0, NEWS_MAX);
    });
  }

  function scoreOf(s) {
    if (s == null) return null;
    if (typeof s === 'object') s = s.displayValue != null ? s.displayValue : s.value;
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }
  function parseEvent(e, lg) {
    var c = e.competitions && e.competitions[0];
    if (!c || !c.competitors || c.competitors.length < 2) return null;
    var st = (c.status || e.status || {}), type = st.type || {};
    function side(x) {
      var t = x.team || {}, rank = x.curatedRank && x.curatedRank.current;
      return { id: String(t.id), abbr: t.abbreviation || '', name: t.shortDisplayName || t.displayName || t.name || '',
        logo: t.logo || (t.logos && t.logos[0] && t.logos[0].href) || '', color: t.color, alt: t.alternateColor,
        score: scoreOf(x.score), winner: !!x.winner, rank: rank >= 1 && rank <= 25 ? rank : null,
        f: followedByKey[lg.key + ':' + t.id] || null };
    }
    var a = side(c.competitors[0]), b = side(c.competitors[1]);
    var homeFirst = c.competitors[0].homeAway === 'home';
    var bc = c.broadcasts && c.broadcasts[0] && c.broadcasts[0].names && c.broadcasts[0].names[0];
    var note = c.notes && c.notes[0] && c.notes[0].headline || '';
    return { id: String(e.id), league: lg, date: e.date, state: type.state || 'pre', detail: type.shortDetail || type.detail || '',
      home: homeFirst ? a : b, away: homeFirst ? b : a, tv: bc || '',
      postseason: !!(e.season && e.season.type === 3), note: note, series: c.series && c.series.summary || '',
      lastPlay: c.situation && c.situation.lastPlay && c.situation.lastPlay.text || '' };
  }

  /* ---------- score detection ---------- */
  function detect(g) {
    [g.away, g.home].forEach(function (s) {
      if (!s.f) return;
      var k = g.id + ':' + s.id, prev = seenScore[k];
      seenScore[k] = s.score;
      // The first sighting only records the score, so reloading mid-game doesn't celebrate old points.
      if (prev == null || s.score == null || g.state !== 'in' || s.score <= prev || !s.f.celebrate) return;
      var title = scoreTitle(g.league.sport, s.score - prev, k);
      if (title) celebrate({ title: title, side: s, game: g, sub: g.lastPlay || g.detail });
    });
    var pk = g.id, was = seenState[pk];
    seenState[pk] = g.state;
    if (was === 'in' && g.state === 'post') {
      [g.away, g.home].forEach(function (s) {
        if (s.f && s.f.celebrate && s.winner) celebrate({ title: (s.f.team.nick || s.name) + ' win!', side: s, game: g, sub: 'Final' });
      });
    }
  }
  function scoreTitle(sport, d, k) {
    if (sport === 'football') {
      if (d >= 6) { lastTD[k] = Date.now(); return 'Touchdown!'; }
      // A 1 or 2 point bump right after a touchdown is the try, not a new score worth a full celebration.
      if (lastTD[k] && Date.now() - lastTD[k] < 4 * 60 * 1000) return null;
      if (d === 3) return 'Field goal!';
      if (d === 2) return 'Safety!';
      return null;
    }
    if (sport === 'hockey' || sport === 'soccer') return d > 1 ? d + ' goals!' : 'Goal!';
    if (sport === 'baseball') return d > 1 ? d + ' runs score!' : 'Run scores!';
    // Basketball scores every few seconds, so only wins are celebrated there.
    return null;
  }

  /* ---------- celebration overlay ---------- */
  function hex(c, fallback) { return /^[0-9a-f]{6}$/i.test(c || '') ? '#' + c : fallback; }
  function celebrate(ev) {
    queue.push(ev);
    if (!showing) nextCelebration();
  }
  function nextCelebration() {
    var ev = queue.shift(), stage = document.getElementById('stage');
    if (!ev || !stage) { showing = false; return; }
    showing = true;
    var s = ev.side, g = ev.game, team = s.f ? s.f.team : s;
    var c1 = hex(team.color || s.color, '#0f3a2a'), c2 = hex(team.alt || s.alt, '#e6b85c');
    if (c2.toLowerCase() === c1.toLowerCase() || c2.toLowerCase() === '#ffffff') c2 = '#e6b85c';
    var line = g.away.abbr + ' ' + num(g.away.score) + '  –  ' + num(g.home.score) + ' ' + g.home.abbr;
    var bits = '', colors = [c1, c2, '#e6b85c', '#ffffff'];
    for (var i = 0; i < 70; i++) {
      bits += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + colors[i % 4] +
        ';animation-delay:' + (Math.random() * 2.2).toFixed(2) + 's;animation-duration:' + (2.6 + Math.random() * 2.4).toFixed(2) + 's"></i>';
    }
    var el = document.createElement('div');
    el.className = 'cele';
    el.style.setProperty('--tc', c1);
    el.style.setProperty('--ta', c2);
    el.innerHTML = '<div class="cele-bg"></div><div class="cele-fx">' + bits + '</div><div class="cele-body">' +
      (team.logo || s.logo ? '<img class="cele-logo" alt="" src="' + esc(team.logo || s.logo) + '">' : '') +
      '<div class="cele-t' + (ev.title.length > 11 ? ' long' : '') + '">' + esc(ev.title) + '</div><div class="cele-team">' + esc(team.name || s.name) + '</div>' +
      '<div class="cele-line">' + esc(line) + '</div>' + (ev.sub ? '<div class="cele-sub">' + esc(ev.sub) + '</div>' : '') + '</div>';
    stage.appendChild(el);
    setTimeout(function () { el.classList.add('out'); }, CELEBRATION_MS - 600);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); nextCelebration(); }, CELEBRATION_MS);
  }
  function num(n) { return n == null ? '' : String(n); }

  // Remote Fast-Forward plays a sample so you can see the animation without waiting for a real score.
  function demo() {
    var f = followed[0];
    var t = f ? f.team : { name: 'Basement Bar', abbr: 'BAR', color: '0f3a2a', alt: 'e6b85c' };
    var me = { id: 'x', abbr: t.abbr, name: t.short || t.name, logo: t.logo, color: t.color, alt: t.alt, score: 21, f: f || null };
    var them = { id: 'y', abbr: 'OPP', name: 'Opponent', score: 17 };
    var sport = f ? f.league.sport : 'football';
    var title = { football: 'Touchdown!', hockey: 'Goal!', soccer: 'Goal!', baseball: 'Run scores!' }[sport] || (t.nick || t.name) + ' win!';
    celebrate({ title: title, side: me, game: { away: them, home: me }, sub: 'Sample celebration' });
  }

  /* ---------- views ---------- */
  function timeLabel(iso) {
    var d = new Date(iso), now = new Date();
    if (isNaN(d)) return '';
    var time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return time;
    if (d - now < 6 * 86400 * 1000 && d > now) return d.toLocaleDateString([], { weekday: 'short' }) + ' ' + time;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  // Followed teams' games (big = false), or the other teams' playoff / Top 25 games (big = true, best few only).
  function sortedGames(big) {
    var order = { 'in': 0, 'pre': 1, 'post': 2 }, list = [];
    for (var id in games) if (!!games[id].big === !!big) list.push(games[id]);
    function best(g) { return Math.min(g.home.rank || 99, g.away.rank || 99); }
    list.sort(function (a, b) {
      return (order[a.state] - order[b.state]) || (big && best(a) - best(b)) || (Date.parse(a.date) - Date.parse(b.date));
    });
    return big ? list.slice(0, MAX_BIG) : list;
  }
  // Teams with nothing on today's scoreboard show their next game instead.
  function upcoming() {
    var playing = {}, out = [], seen = {};
    for (var id in games) { var g = games[id]; if (g.home.f) playing[g.home.f.key] = 1; if (g.away.f) playing[g.away.f.key] = 1; }
    followed.forEach(function (f) {
      var n = nextGame[f.key];
      if (!playing[f.key] && n && !seen[n.id] && !games[n.id]) { seen[n.id] = 1; out.push(n); }
    });
    return out.sort(function (a, b) { return Date.parse(a.date) - Date.parse(b.date); });
  }
  /* ---------- pixel-art logos ---------- */
  var pixCache = {};  // logo URL -> pixelated data URL, or 1 while loading
  function pixSrc(url) { return typeof pixCache[url] === 'string' ? pixCache[url] : url; }
  function smallLogo(url) {
    var m = /^https:\/\/a\.espncdn\.com(\/i\/[^?]+)$/.exec(url);
    return m ? 'https://a.espncdn.com/combiner/i?img=' + m[1] + '&w=48&h=48' : url;
  }
  // Shrink each logo to a 12x12 grid with hard alpha edges, and lift very dark colors so they still read on a
  // black LED panel. The ticker draws it back up with image-rendering: pixelated, one logo pixel per LED.
  function loadPixel(url) {
    if (pixCache[url]) return;
    pixCache[url] = 1;
    var im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = function () {
      try {
        var c = document.createElement('canvas'), x = c.getContext('2d');
        c.width = c.height = LOGO_PX;
        x.drawImage(im, 0, 0, LOGO_PX, LOGO_PX);
        var d = x.getImageData(0, 0, LOGO_PX, LOGO_PX), p = d.data;
        for (var i = 0; i < p.length; i += 4) {
          p[i + 3] = p[i + 3] > 100 ? 255 : 0;
          var m = Math.max(p[i], p[i + 1], p[i + 2]);
          if (m < 110) { var k = m ? 110 / m : 0; p[i] = m ? p[i] * k : 80; p[i + 1] = m ? p[i + 1] * k : 80; p[i + 2] = m ? p[i + 2] * k : 80; }
        }
        x.putImageData(d, 0, 0);
        pixCache[url] = c.toDataURL();
      } catch (e) { pixCache[url] = url; }
      if (slots.ticker) pixelate(slots.ticker);
    };
    im.onerror = function () { pixCache[url] = url; };
    im.src = smallLogo(url);
  }
  function pixelate(root) {
    var imgs = root.querySelectorAll('img[data-px]');
    for (var i = 0; i < imgs.length; i++) {
      var u = imgs[i].getAttribute('data-px');
      if (typeof pixCache[u] === 'string') { if (imgs[i].getAttribute('src') !== pixCache[u]) imgs[i].src = pixCache[u]; }
      else loadPixel(u);
    }
  }

  function teamBit(s) {
    return (s.logo ? '<img class="tk-logo" alt="" data-px="' + esc(s.logo) + '" src="' + esc(pixSrc(s.logo)) + '">' : '') +
      (s.rank ? '<span class="tk-rk">' + s.rank + '</span>' : '') +
      '<span class="tk-ab' + (s.f ? ' me' : '') + '">' + esc(s.abbr) + '</span>';
  }
  // Playoff games carry the round ("World Series - Game 5") and the series state ("MIL leads series 3-1").
  function statusText(g) {
    if (g.state === 'pre') return timeLabel(g.date) + (g.tv ? ' · ' + g.tv : '');
    return g.detail + (g.postseason && g.series ? ' · ' + g.series : '');
  }
  function gameInner(g) {
    var lg = '<span class="tk-lg">' + esc(g.league.label) + '</span>' + (g.postseason && g.note ? '<span class="tk-nt">' + esc(g.note) + '</span>' : '');
    var st = '<span class="tk-st' + (g.state === 'in' ? ' on' : '') + '">' + esc(statusText(g)) + '</span>';
    if (g.state === 'pre') return lg + teamBit(g.away) + '<span class="tk-at">@</span>' + teamBit(g.home) + st;
    return lg + teamBit(g.away) + '<b class="tk-sc">' + num(g.away.score) + '</b>' + teamBit(g.home) + '<b class="tk-sc">' + num(g.home.score) + '</b>' + st;
  }
  function tickerItems() {
    var items = [], live = anyLive();
    if (resolving) return [{ key: 'wait', html: '<span class="ti">Checking scores…</span>' }];
    if (!followed.length) return [{ key: 'empty', html: '<span class="ti">Add your teams on the Teams tab of the menu sheet</span>' }];
    sortedGames().forEach(function (g) { items.push({ key: 'g' + g.id, gid: g.id, html: gameInner(g) }); });
    sortedGames(true).forEach(function (g) { items.push({ key: 'g' + g.id, gid: g.id, html: gameInner(g) }); });
    // While a followed team is playing, the ticker sticks to scores. Otherwise it fills in with what's next and the news.
    if (!live) {
      upcoming().forEach(function (g) { items.push({ key: 'n' + g.id, html: '<span class="tk-lg nx">Next</span>' + gameInner(g).replace(/^<span class="tk-lg">[^<]*<\/span>/, '') }); });
      news.forEach(function (n) {
        items.push({ key: 'h' + n.headline, html: '<span class="tk-tag">' + esc(n.f.team.nick || n.f.team.abbr) + '</span><span class="ti">' + esc(n.headline) + '</span>' });
      });
    }
    if (!items.length) items.push({ key: 'quiet', html: '<span class="ti">No games or news for your teams right now</span>' });
    return items;
  }
  function renderTicker() {
    var tk = slots.ticker;
    if (!tk) return;
    var items = tickerItems(), sig = items.map(function (i) { return i.key; }).join('|');
    if (slots.label) {
      var live = anyLive();
      slots.label.innerHTML = live ? '<span class="tk-dot"></span>Live' : news.length && !sortedGames().length ? 'News' : 'Scores';
      slots.label.classList.toggle('live', live);
    }
    // Same items as now: patch the scores in place so the ticker keeps scrolling smoothly.
    if (sig === tickerSig) {
      items.forEach(function (it) {
        if (!it.gid) return;
        var nodes = tk.querySelectorAll('[data-g="' + it.gid + '"]');
        for (var i = 0; i < nodes.length; i++) nodes[i].innerHTML = it.html;
      });
      pixelate(tk);
      return;
    }
    // Different items: swap them in when the scroll loops back around, or right away if the ticker is empty.
    pendingTicker = { sig: sig, items: items };
    var track = tk.firstChild;
    if (!track || tickerIsPlaceholder || getComputedStyle(track).animationName === 'none') applyTicker();
  }
  function applyTicker() {
    var tk = slots.ticker, p = pendingTicker;
    if (!tk || !p) return;
    pendingTicker = null;
    tickerSig = p.sig;
    // Status messages ("Checking scores…") are replaced as soon as real items arrive instead of waiting for the loop.
    tickerIsPlaceholder = p.items.length === 1 && !p.items[0].gid && /^(wait|empty|quiet)$/.test(p.items[0].key);
    var one = p.items.map(function (it) {
      return '<span class="tk-it"' + (it.gid ? ' data-g="' + it.gid + '"' : '') + '>' + it.html + '</span><span class="ti-d"></span>';
    }).join('');
    tk.innerHTML = '<div class="track"><div class="run">' + one + '</div></div>';
    var track = tk.firstChild, run = track.firstChild;
    // Repeat short content so a single run is wider than the ticker, then duplicate it for a seamless loop.
    var reps = 1;
    while (run.offsetWidth * reps < 1400 && reps < 8) reps++;
    if (reps > 1) run.innerHTML = new Array(reps + 1).join(one);
    // Pad the run to a whole number of LED columns so every step lands on the grid, including the loop seam.
    var w = run.offsetWidth, pad = (TICKER_STEP_PX - w % TICKER_STEP_PX) % TICKER_STEP_PX;
    if (pad) { run.style.paddingRight = pad + 'px'; w += pad; }
    track.appendChild(run.cloneNode(true)).setAttribute('aria-hidden', 'true');
    track.style.animationDuration = Math.max(20, w / TICKER_PX_PER_S) + 's';
    track.style.animationTimingFunction = 'steps(' + Math.round(w / TICKER_STEP_PX) + ')';
    track.addEventListener('animationiteration', applyTicker);
    pixelate(tk);
  }
  function boardHTML() {
    // Up to six big cards; busier days switch to a denser 4x3 grid of up to twelve.
    var list = sortedGames().concat(upcoming(), sortedGames(true)).slice(0, BOARD_MAX);
    if (resolving) return '<div class="stub">Checking scores…</div>';
    if (!followed.length) return '<div class="stub">Add your teams on the Teams tab of the menu sheet to fill the scoreboard.</div>';
    if (!list.length) return '<div class="stub">Checking scores…</div>';
    return '<div class="games' + (list.length > 6 ? ' dense' : '') + '">' + list.map(function (g) {
      var status = g.state === 'pre' ? timeLabel(g.date) + (g.tv ? ' · ' + g.tv : '') : g.detail;
      var row = function (s) {
        return '<div class="tm' + (s.f ? ' me' : '') + (g.state === 'post' && s.winner ? ' won' : '') + '">' +
          (s.logo ? '<img class="gl" alt="" src="' + esc(s.logo) + '">' : '<span class="gl"></span>') +
          '<span class="gn">' + (s.rank ? '<span class="tk-rk">' + s.rank + '</span>' : '') + esc(s.name) + '</span>' +
          (g.state === 'pre' ? '' : '<span class="sc">' + num(s.score) + '</span>') + '</div>';
      };
      var label = g.postseason && g.note ? g.note : g.league.label;
      return '<div class="game' + (g.state === 'in' ? ' live' : '') + '"><div class="gs"><span class="glg">' + esc(label) + '</span><span class="gst">' +
        (g.state === 'in' ? '<span class="tk-dot"></span>' : '') + esc(status) + '</span></div>' + row(g.away) + row(g.home) + '</div>';
    }).join('') + '</div>';
  }
  function update() {
    renderTicker();
    if (slots.board) slots.board.innerHTML = boardHTML();
  }
  // Called after every full render of the display, since that replaces the ticker and board elements.
  function attach(s) {
    slots = s || {};
    tickerSig = '';
    pendingTicker = null;
    update();
  }

  window.Scores = { setTeams: setTeams, attach: attach, boardHTML: boardHTML, demo: demo, refresh: function () { lastNews = 0; tick(); } };
})();
