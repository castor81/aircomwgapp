/* belépő (radar), szerepválasztás, útvonalak */
(function () {
  'use strict';
  const A = window.ACW, esc = A.esc, app = document.getElementById('app');
  let cleanup = [];
  const getRole = () => { try { const r = sessionStorage.getItem('acw-role'); return A.ROLES.some(x => x.id === r) ? r : null; } catch (_) { return A._role || null; } };
  const setRole = r => { A._role = r; try { r ? sessionStorage.setItem('acw-role', r) : sessionStorage.removeItem('acw-role'); } catch (_) { } };
  const brand = '<div class="brand"><svg viewBox="0 0 48 48" width="38" height="38" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#1b2a41"/><path d="M24 8l4 14 13 8v3l-13-4-1 8 4 3v2l-7-2-7 2v-2l4-3-1-8-13 4v-3l13-8z" fill="#d39a1c"/></svg><div>AIRCOM<small>wargaming app</small></div></div>';
  const note = 'Oktatási célú demó fiktív adatokkal. Nem hivatalos NATO-termék.';

  function radar(cv) {
    const g = cv.getContext('2d'), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const blips = Array.from({ length: 14 }, (_, i) => ({ a: (i * 2.399) % (Math.PI * 2), d: .18 + (i * .6180339) % .76, red: i % 4 === 0 }));
    let raf = 0, t0 = performance.now();
    function frame(t) {
      const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      const wide = w > 900, cx = wide ? w * .34 : w / 2, cy = h / 2, R = Math.min(h * .44, w * (wide ? .3 : .48)), sw = still ? 5.4 : ((t - t0) / 5200 * Math.PI * 2) % (Math.PI * 2);
      g.fillStyle = '#0d1a2b'; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
      g.strokeStyle = 'rgba(111,196,190,.35)'; g.lineWidth = 1;
      for (let i = 1; i <= 4; i++) { g.beginPath(); g.arc(cx, cy, R * i / 4, 0, 7); g.stroke(); }
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke(); }
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(111,230,200,${.22 * (1 - i / 40)})`; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, sw - (i + 1) * .025, sw - i * .025); g.fill(); }
      blips.forEach(b => { const age = ((sw - b.a + Math.PI * 4) % (Math.PI * 2)) / (Math.PI * 2), al = Math.max(.08, 1 - age * 1.3); const x = cx + Math.cos(b.a) * R * b.d, y = cy + Math.sin(b.a) * R * b.d; g.fillStyle = b.red ? `rgba(255,110,90,${al})` : `rgba(130,200,255,${al})`; g.beginPath(); b.red ? (g.moveTo(x, y - 6), g.lineTo(x + 6, y + 4), g.lineTo(x - 6, y + 4)) : g.arc(x, y, 4, 0, 7); g.fill(); });
      if (!still) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }

  function entry() {
    const groups = [...new Set(A.ROLES.map(r => r.g))];
    app.innerHTML = `<main class="entry"><canvas aria-hidden="true"></canvas><div class="gcard">${brand}<h1>Légi műveletek tervezése és végrehajtása</h1><form><label>Szerepkör<select name="r" required><option value="">— válassz szerepkört —</option>${groups.map(gr => `<optgroup label="${esc(gr)}">${A.ROLES.filter(r => r.g === gr).map(r => `<option value="${r.id}">${esc(r.short === r.name ? r.name : r.short + ' – ' + r.name)}</option>`).join('')}</optgroup>`).join('')}</select></label><p class="muted" id="task">A demóban a belépés kód nélküli.</p><button class="btn go">Belépés a gyakorlatra</button></form><a href="#/cop">🖥 Közös operatív kép (kivetítő nézet)</a><small>${note}<br>v${A.VERSION} · ${A.DATE}</small></div></main>`;
    cleanup.push(radar(app.querySelector('canvas')));
    const f = app.querySelector('form');
    f.r.onchange = () => { const r = A.ROLES.find(x => x.id === f.r.value); app.querySelector('#task').textContent = r ? r.task : 'A demóban a belépés kód nélküli.'; };
    f.onsubmit = e => { e.preventDefault(); if (!f.r.value) return; setRole(f.r.value); location.hash = '#/app/' + A.role(f.r.value).home; };
  }

  function mountView(host, id, role) {
    const leave = []; const upd = A.VIEWS[id].fn(host, { role, onLeave: f => leave.push(f) }); upd();
    leave.push(A.on(upd)); cleanup.push(() => leave.forEach(f => f()));
  }
  const phaseLine = () => { const a = A.get().atos.find(x => x.phase === 5 && !x.closed); return a ? a.id + ' végrehajtás alatt' : 'nincs végrehajtás alatt álló ATO'; };
  function clock(el) {
    const f = () => { el.textContent = new Date().toISOString().slice(11, 19) + 'Z · ' + phaseLine(); };
    f(); const iv = setInterval(f, 1000); cleanup.push(() => clearInterval(iv));
  }

  function route() {
    cleanup.forEach(f => f()); cleanup = [];
    const h = location.hash.split('/');
    if (h[1] === 'cop') {
      app.innerHTML = `<div class="proj"><header class="top glass">${brand}<span class="clk"></span><span class="muted">${note}</span><a href="#/">Belépés</a></header><section class="main"></section></div>`;
      clock(app.querySelector('.clk')); return mountView(app.querySelector('.main'), 'cop', null);
    }
    const role = getRole();
    if (h[1] !== 'app' || !role) return entry();
    const r = A.role(role), allowed = Object.entries(A.VIEWS).filter(([, v]) => !v.only || v.only === role);
    const id = allowed.some(([k]) => k === h[2]) ? h[2] : r.home;
    app.innerHTML = `<div class="shell"><aside class="nav glass">${brand}<div class="who"><b>${esc(r.short)}</b><small>${esc(r.name)}</small></div><nav>${allowed.map(([k, v]) => `<a href="#/app/${k}" class="${k === id ? 'on' : ''}"${k === id ? ' aria-current="page"' : ''}><span aria-hidden="true">${v.ic}</span> ${v.label}</a>`).join('')}</nav><div class="navf"><a href="#/cop" target="_blank" rel="noopener">COP kivetítő ↗</a><button class="btn" id="lo">Kilépés</button><small>v${A.VERSION} · ${A.DATE}</small></div></aside><div class="col-main"><header class="top glass"><span class="clk"></span><span class="muted">${note}</span></header><section class="main glass"></section></div></div>`;
    app.querySelector('#lo').onclick = () => { setRole(null); location.hash = '#/'; };
    clock(app.querySelector('.clk')); mountView(app.querySelector('.main'), id, role);
  }
  window.addEventListener('hashchange', route);
  route();
})();
