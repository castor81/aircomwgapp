/* COP térkép: fiktív hadszíntér, saját SVG (nagyítás, húzás, koordinációs intézkedések, incidensek) */
(function () {
  'use strict';
  const A = window.ACW, NS = 'http://www.w3.org/2000/svg';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  A.esc = esc;
  const BASES = [['ALFA', 210, 300], ['BRAVO', 175, 470], ['CHARLIE', 330, 215], ['X-RAY', 790, 230], ['YANKEE', 815, 500]];
  const SAM = [[430, 505], [480, 450], [745, 280], [720, 455]];

  function base() {
    let g = '';
    for (let x = 0; x <= 1000; x += 100) g += `<line x1="${x}" y1="0" x2="${x}" y2="700" class="gl"/><text x="${x + 4}" y="12" class="gt">${x / 100}</text>`;
    for (let y = 0; y <= 700; y += 100) g += `<line x1="0" y1="${y}" x2="1000" y2="${y}" class="gl"/>`;
    return `<rect x="-600" y="-500" width="2200" height="1700" class="sea"/>
      <path class="land blue" d="M60 150 C140 70 290 95 400 80 C470 70 520 90 545 100 C520 190 590 250 560 340 C535 420 610 500 575 640 C450 665 330 610 220 645 C140 655 70 600 85 515 C40 430 95 370 62 300 C40 240 25 190 60 150Z"/>
      <path class="land red" d="M545 100 C660 60 780 110 890 95 C975 130 935 240 965 310 C990 400 925 470 945 560 C880 650 760 610 680 655 C640 665 600 650 575 640 C610 500 535 420 560 340 C590 250 520 190 545 100Z"/>
      ${g}<path class="flot" d="M545 100 C520 190 590 250 560 340 C535 420 610 500 575 640"/>
      <text x="150" y="605" class="cty">KÉKFÖLD</text><text x="750" y="150" class="cty">VÖRÖSFÖLD</text>
      ${BASES.map((b, i) => `<g class="base ${i < 3 ? 'blue' : 'red'}" transform="translate(${b[1]} ${b[2]})"><rect x="-6" y="-6" width="12" height="12"/><line x1="-6" y1="6" x2="6" y2="-6"/><text x="10" y="4">${b[0]}</text></g>`).join('')}
      ${SAM.map((p, i) => `<path class="sam ${i < 2 ? 'blue' : 'red'}" d="M${p[0] - 7} ${p[1] + 6} L${p[0]} ${p[1] - 8} L${p[0] + 7} ${p[1] + 6}"/>`).join('')}`;
  }

  A.Map = function (host, opt) {
    opt = opt || {};
    const hidden = new Set();
    let view = [0, 40, 1000, 640], picking = null;
    host.classList.add('mapwrap');
    host.innerHTML = `<svg xmlns="${NS}" role="img" aria-label="Fiktív hadszíntér térképe" preserveAspectRatio="xMidYMid meet"><g>${base()}</g><g class="l-acm"></g><g class="l-inc"></g></svg>
      <div class="mapctl"><button data-z="0.8" title="Nagyítás">＋</button><button data-z="1.25" title="Kicsinyítés">－</button><button data-z="0" title="Alaphelyzet">⌂</button></div>
      <div class="maplay"></div><div class="mappop" hidden></div><div class="maptag">FIKTÍV GYAKORLÓ HADSZÍNTÉR</div>`;
    const svg = host.querySelector('svg'), acmG = svg.querySelector('.l-acm'), incG = svg.querySelector('.l-inc'), pop = host.querySelector('.mappop'), lay = host.querySelector('.maplay');
    const apply = () => svg.setAttribute('viewBox', view.join(' '));
    const pt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
    function zoom(f, c) {
      if (!f) { view = [0, 40, 1000, 640]; return apply(); }
      const w = Math.min(1600, Math.max(180, view[2] * f)); f = w / view[2];
      c = c || { x: view[0] + view[2] / 2, y: view[1] + view[3] / 2 };
      view = [c.x - (c.x - view[0]) * f, c.y - (c.y - view[1]) * f, w, view[3] * f]; apply();
    }
    svg.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY < 0 ? 0.88 : 1.14, pt(e)); }, { passive: false });
    let drag = null;
    svg.addEventListener('pointerdown', e => { drag = { p: pt(e), x: e.clientX, y: e.clientY, moved: false, target: e.target }; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener('pointermove', e => {
      if (!drag) return;
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) drag.moved = true;
      if (drag.moved) { const q = pt(e); view[0] -= q.x - drag.p.x; view[1] -= q.y - drag.p.y; apply(); }
    });
    svg.addEventListener('pointerup', e => {
      const d = drag; drag = null; if (!d || d.moved) return;
      if (picking) { const q = pt(e), f = picking; picking = null; host.classList.remove('picking'); return f(Math.round(q.x), Math.round(q.y)); }
      const el = d.target.closest('[data-id]'); if (el) show(el.dataset.id); else pop.hidden = true;
    });
    host.querySelector('.mapctl').onclick = e => { const b = e.target.closest('[data-z]'); if (b) zoom(+b.dataset.z); };
    lay.onchange = e => { const t = e.target.dataset.l; e.target.checked ? hidden.delete(t) : hidden.add(t); draw(); };
    const visInc = s => s.incidents.filter(i => !opt.filter || opt.filter(i));
    let openId = null;
    function show(id) {
      const s = A.get(), i = visInc(s).find(x => x.id === id), m = s.acms.find(x => x.id === id);
      if (!i && !m) { pop.hidden = true; return; }
      openId = id; pop.hidden = false;
      if (i) {
        const rel = s.chat.filter(c => c.inc === i.id);
        pop.innerHTML = `<button class="x" aria-label="Bezárás">✕</button><b>INC-${String(i.seq).padStart(2, '0')} · ${esc(i.title)}</b><p>${esc(i.body)}</p>${rel.map(c => `<p class="rel"><b>${esc(roleShort(c.role))}</b> ${esc(c.text)}</p>`).join('')}`;
      } else pop.innerHTML = `<button class="x" aria-label="Bezárás">✕</button><b>${esc(m.name)}</b><p>${esc(A.CM[m.type].name)} (${esc(m.type)})<br>Magasság: ${esc(m.alt)} · Idő (UTC): ${esc(m.time)}<br>Állapot: ${esc(m.status)} · Igénylő: ${esc(roleShort(m.by))}</p>`;
      pop.querySelector('.x').onclick = () => { pop.hidden = true; openId = null; };
    }
    const roleShort = id => (A.ROLES.find(r => r.id === id) || {}).short || id;
    function draw() {
      const s = A.get();
      acmG.innerHTML = s.acms.filter(m => m.status !== 'elutasítva' && !hidden.has(m.type) && (m.status === 'aktív' || opt.showReq)).map(m => {
        const c = A.CM[m.type].c, cls = 'acm' + (m.status === 'kérés' ? ' req' : ''), p = m.pts[0];
        if (A.CM[m.type].line) { const d = m.pts.map(q => q.join(',')).join(' '); const q = m.pts[Math.floor(m.pts.length / 2)]; return `<g class="${cls}" data-id="${esc(m.id)}" style="--c:${c}"><polyline class="corr" points="${d}"/><text x="${q[0]}" y="${q[1] - 14}">${esc(m.name)}</text></g>`; }
        return `<g class="${cls}" data-id="${esc(m.id)}" style="--c:${c}"><circle cx="${+p[0]}" cy="${+p[1]}" r="${+m.r}"/><text x="${+p[0]}" y="${p[1] - m.r - 5}">${esc(m.name)}</text></g>`;
      }).join('');
      incG.innerHTML = visInc(s).map(i => `<g class="inc s${+i.sev}" data-id="${esc(i.id)}" transform="translate(${+i.x} ${+i.y})"><path d="M0 -12 L11 8 L-11 8Z"/><text y="22">INC-${String(i.seq).padStart(2, '0')}</text></g>`).join('');
      const types = [...new Set(s.acms.map(m => m.type))];
      const sig = types.join() + '|' + [...hidden].join();
      if (lay.dataset.sig !== sig) { lay.dataset.sig = sig; lay.innerHTML = types.map(t => `<label style="--c:${A.CM[t].c}" title="${esc(A.CM[t].name)}"><input type="checkbox" data-l="${t}"${hidden.has(t) ? '' : ' checked'}>${t}</label>`).join(''); }
      if (openId && !pop.hidden) show(openId);
    }
    apply(); draw();
    return {
      draw,
      focus(id) { const i = A.get().incidents.find(x => x.id === id); if (!i) return; view = [i.x - 200, i.y - 128, 400, 256]; apply(); show(id); },
      pick(fn) { picking = fn; host.classList.add('picking'); }
    };
  };
})();
