/* nézetek: mindegyik view(root, ctx) egy frissítő függvényt ad vissza */
(function () {
  'use strict';
  const A = window.ACW, esc = A.esc;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const role = id => A.ROLES.find(r => r.id === id) || { short: id, name: id, can: [] };
  A.role = role;
  A.can = (r, p) => !!r && (role(r).can.includes('*') || role(r).can.includes(p));
  const hm = iso => new Date(iso).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  const opts = (list, sel) => list.map(([v, l]) => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(l)}</option>`).join('');
  const head = (title, sub, right) => `<div class="ph"><div><h2>${title}</h2><span class="muted">${sub}</span></div>${right || ''}</div>`;
  /* csak akkor írja újra a tartalmat, ha változott – így nem vész el a fókusz és a görgetés */
  const set = (el, html) => { if (el && el._h !== html) { el._h = html; el.innerHTML = html; return true; } return false; };
  const visibleTo = r => i => i.to === 'all' || r === 'ex' || i.to === r;

  function fsButton(panel) {
    const b = document.createElement('button'); b.className = 'fs'; b.title = 'Teljes képernyő'; b.textContent = '⛶';
    b.onclick = () => { const on = panel.classList.toggle('full'); b.textContent = on ? '✕' : '⛶'; b.title = on ? 'Bezárás (Esc)' : 'Teljes képernyő'; };
    panel.appendChild(b);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.full > .fs').forEach(b => b.click()); });

  /* ---------- Közös operatív kép + JCHAT ---------- */
  function cop(root, ctx) {
    const me = ctx.role;
    root.innerHTML = `<div class="cop"><section class="panel mapp"><h3>Közös operatív kép</h3><div class="mh"></div></section>
      <section class="panel chat"><h3>JCHAT</h3><div class="feed" aria-live="polite"></div>
      ${me ? `<form class="composer"><select name="inc" aria-label="Kapcsolódó incidens"></select><div class="row"><input name="t" maxlength="600" autocomplete="off" placeholder="Közlés (${esc(role(me).short)})…" aria-label="Közlés"><button class="btn pri">Küldés</button></div></form>` : ''}</section></div>`;
    const filter = visibleTo(me);
    const map = A.Map($('.mh', root), { filter, showReq: A.can(me, 'acmOk') || A.can(me, 'acmReq') });
    $$('.panel', root).forEach(fsButton);
    const feed = $('.feed', root), form = $('form', root);
    if (form) form.onsubmit = e => {
      e.preventDefault(); const t = form.t.value.trim(); if (!t) return;
      A.mut(s => s.chat.push({ id: A.uid(), ts: new Date().toISOString(), role: me, text: t, inc: form.inc.value })); form.t.value = ''; feed.scrollTop = feed.scrollHeight;
    };
    feed.onclick = e => { const b = e.target.closest('[data-inc]'); if (b) { $('.chat', root).classList.contains('full') && $('.chat .fs', root).click(); map.focus(b.dataset.inc); } };
    return () => {
      const s = A.get(), incs = s.incidents.filter(filter), byId = Object.fromEntries(incs.map(i => [i.id, i]));
      const items = s.chat.filter(c => !c.inc || byId[c.inc]).map(c => ({ ts: c.ts, role: c.role, text: c.text, inc: c.inc }))
        .concat(incs.map(i => ({ ts: i.ts, role: 'ex', title: i.title, text: i.body, inc: i.id, ev: true, to: i.to })))
        .sort((a, b) => a.ts < b.ts ? -1 : 1);
      const bottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 60;
      if (set(feed, items.map(m => `<article class="post${m.ev ? ' ev' : ''}"><header><b>${esc(role(m.role).short)}</b><time>${hm(m.ts)}</time>${m.to && m.to !== 'all' ? `<span class="badge">csak: ${esc(role(m.to).short)}</span>` : ''}${byId[m.inc] ? `<button class="jump" data-inc="${esc(m.inc)}" title="Ugrás a térképen">🗺 INC-${String(byId[m.inc].seq).padStart(2, '0')}</button>` : ''}</header>${m.title ? `<h4>${esc(m.title)}</h4>` : ''}<p>${esc(m.text)}</p></article>`).join('')) && bottom) feed.scrollTop = feed.scrollHeight;
      if (form) { const cur = form.inc.value; if (set(form.inc, opts([['', '— nincs incidenshez kötve —'], ...incs.map(i => [i.id, 'INC-' + String(i.seq).padStart(2, '0') + ' ' + i.title])], cur))) form.inc.value = byId[cur] ? cur : ''; }
      map.draw();
    };
  }

  /* ---------- légi feladattervezési ciklus ---------- */
  function ato(root, ctx) {
    const edit = A.can(ctx.role, 'ato'), app = A.can(ctx.role, 'apport'), ok = A.can(ctx.role, 'apportOk');
    let sel = null;
    root.innerHTML = head('Légi feladattervezési ciklus', 'Párhuzamosan futó ATO-k, fázisonkénti termékekkel (AJP-3.3, 4. fejezet)', edit ? '<button class="btn" data-new>＋ Új ATO</button>' : '') +
      '<div class="scroll"><div class="cyc"></div><div class="two"><div class="box" id="det"></div><div class="box" id="app"></div></div></div>';
    root.onclick = e => {
      const b = e.target.closest('button,[data-ato]'); if (!b) return;
      if (b.dataset.new !== undefined) return A.mut(s => s.atos.push({ id: 'ATO ' + String.fromCharCode(65 + s.atos.length % 26) + (s.atos.length >= 26 ? s.atos.length : ''), phase: 1, prod: {}, closed: false }));
      if (b.dataset.ato) { sel = b.dataset.ato; return upd(); }
      if (b.dataset.adv !== undefined && edit) A.mut(s => { const a = s.atos.find(x => x.id === sel); if (!a || !A.PHASES[a.phase - 1].prod.every(p => a.prod[a.phase + '|' + p])) return; if (a.phase < 6) a.phase++; else a.closed = true; });
      if (b.dataset.apok !== undefined && ok) A.mut(s => { if (sum(s.apport.v) === 100) s.apport.ok = !s.apport.ok; });
    };
    root.onchange = e => {
      const t = e.target;
      if (t.dataset.prod && edit) A.mut(s => { const a = s.atos.find(x => x.id === sel); a.prod[a.phase + '|' + t.dataset.prod] = t.checked; });
      if (t.dataset.ap && app) A.mut(s => { s.apport.v[t.dataset.ap] = Math.max(0, Math.min(100, Math.round(+t.value || 0))); s.apport.ok = false; });
    };
    const sum = v => Object.values(v).reduce((a, b) => a + b, 0);
    function upd() {
      const s = A.get(); if (!s.atos.some(a => a.id === sel)) sel = (s.atos.find(a => !a.closed) || s.atos[0]).id;
      set($('.cyc', root), `<div class="cyc-h"><span></span>${A.PHASES.map(p => `<span><b>${p.n}</b>${esc(p.name)}</span>`).join('')}</div>` + s.atos.map(a => `<button class="cyc-r${a.id === sel ? ' on' : ''}" data-ato="${esc(a.id)}"><span class="nm">${esc(a.id)}${a.closed ? ' ✓' : ''}</span>${A.PHASES.map(p => `<span class="cell ${a.closed || p.n < a.phase ? 'done' : p.n === a.phase ? 'cur' : ''}">${a.closed || p.n < a.phase ? '✓' : p.n === a.phase ? 'folyamatban' : ''}</span>`).join('')}</button>`).join(''));
      const a = s.atos.find(x => x.id === sel), p = A.PHASES[a.phase - 1], all = p.prod.every(x => a.prod[p.n + '|' + x]);
      set($('#det', root), a.closed ? `<h3>${esc(a.id)}</h3><p>A ciklus lezárult.</p>` : `<h3>${esc(a.id)} · ${p.n}. fázis</h3><p><b>${esc(p.name)}</b><br><span class="muted">Felelős: ${esc(p.lead)} · AJP-3.3 ${p.ref}</span></p>${p.prod.map(x => `<label class="chk"><input type="checkbox" data-prod="${esc(x)}"${a.prod[p.n + '|' + x] ? ' checked' : ''}${edit ? '' : ' disabled'}> ${esc(x)}</label>`).join('')}${edit ? `<button class="btn pri" data-adv${all ? '' : ' disabled'}>${p.n < 6 ? 'Tovább a következő fázisba' : 'Ciklus lezárása'}</button>` : '<p class="muted">Ezt a szerepkör csak megtekintheti.</p>'}`);
      const t = sum(s.apport.v);
      set($('#app', root), `<h3>Apportionment <span class="badge ${s.apport.ok ? 'ok' : ''}">${s.apport.ok ? 'JFC jóváhagyta' : 'javaslat'}</span></h3><p class="muted">A légi erőkifejtés megosztása (%) – AJP-3.3 4.27</p>${Object.entries(s.apport.v).map(([k, v]) => `<div class="bar"><span title="${esc(A.MTYPES[k])}">${k}</span><i><b style="width:${v}%"></b></i><input type="number" min="0" max="100" value="${v}" data-ap="${k}" aria-label="${k} százalék"${app ? '' : ' disabled'}></div>`).join('')}<p class="${t === 100 ? 'muted' : 'err'}">Összesen: ${t}%${t === 100 ? '' : ' – jóváhagyáshoz 100% szükséges'}</p>${ok ? `<button class="btn pri" data-apok${t === 100 ? '' : ' disabled'}>${s.apport.ok ? 'Jóváhagyás visszavonása' : 'Jóváhagyás'}</button>` : ''}`);
    }
    return upd;
  }

  /* ---------- célkiválasztás ---------- */
  const eligible = t => t.legal === 'megfelelő' && (t.list === 'JTL' || t.list === 'RTL');
  const revoke = t => { t.approved = false; t.f2 = t.tst ? 0 : -1; };
  function tgt(root, ctx) {
    const r = ctx.role, can = A.can(r, 'tgt'), ok = A.can(r, 'tgtOk'), legal = A.can(r, 'legal'), dyn = A.can(r, 'dyn');
    root.innerHTML = head('Célkiválasztás', 'Összhaderőnemi célkiválasztási ciklus és dinamikus lánc (AJP-3.9)') +
      `<div class="scroll">${can ? '<form class="box row wrap"><input name="n" required maxlength="120" placeholder="Új célnomináció (fiktív)"><select name="k"><option>létesítmény</option><option>eszköz</option><option>szervezet</option><option>személy</option><option>virtuális entitás</option></select><label class="chk"><input type="checkbox" name="tst"> időérzékeny</label><button class="btn pri">Felvétel</button></form>' : ''}<div class="kan"></div><div class="box" id="dyn"></div></div>`;
    const f = $('form', root);
    if (f) f.onsubmit = e => { e.preventDefault(); const n = f.n.value.trim(); if (!n) return; A.mut(s => s.targets.push({ id: A.uid(), no: 'T-' + String(s.targets.length + 1).padStart(3, '0'), name: n, kind: f.k.value, stage: 1, list: '', legal: '', approved: false, tst: f.tst.checked, f2: f.tst.checked ? 0 : -1 })); f.reset(); };
    root.onclick = e => {
      const b = e.target.closest('button[data-a]'); if (!b) return; const id = b.dataset.id;
      A.mut(s => {
        const t = s.targets.find(x => x.id === id); if (!t) return;
        const a = b.dataset.a;
        if (a === 'next' && (can || ok) && t.stage < 6) { if (t.stage === 3 && !(ok && eligible(t))) return; if (t.stage === 2 && !t.list) return; if (t.list === 'NSL') return; t.stage++; if (t.stage === 4) t.approved = true; }
        if (a === 'back' && (can || ok) && t.stage > 1) { t.stage--; if (t.stage < 4) revoke(t); }
        if (a === 'f2' && dyn && t.approved && t.f2 >= 0 && t.f2 < 6) t.f2++;
      });
    };
    root.onchange = e => {
      const t = e.target, id = t.dataset.id; if (!id) return;
      A.mut(s => { const x = s.targets.find(y => y.id === id); if (t.dataset.list !== undefined && (can || ok)) { x.list = t.value; if (t.value === 'NSL') { revoke(x); x.stage = 2; } } if (t.dataset.legal !== undefined && legal) x.legal = t.value; if (x.approved && !eligible(x)) { revoke(x); x.stage = 3; } });
    };
    return () => {
      const s = A.get();
      set($('.kan', root), A.TSTAGES.map(st => `<div class="col"><h4><b>${st.n}</b> ${esc(st.name)}</h4><small>${esc(st.out)}</small>${s.targets.filter(t => t.stage === st.n).map(t => {
        const blocked = t.list === 'NSL' || (t.stage === 2 && !t.list) || (t.stage === 3 && !eligible(t));
        const showNext = t.stage < 6 && (t.stage === 3 ? ok : can || ok);
        return `<div class="tcard${t.tst ? ' tst' : ''}"><b>${esc(t.no)}</b>${t.tst ? '<span class="badge ev">TST</span>' : ''}${t.approved ? '<span class="badge ok">JPTL</span>' : ''}<p>${esc(t.name)}</p><small>${esc(t.kind)}</small>
        ${t.stage >= 2 ? `<label>Lista <select data-list data-id="${esc(t.id)}"${can || ok ? '' : ' disabled'}>${opts([['', '—'], ['JTL', 'JTL'], ['RTL', 'RTL'], ['NSL', 'No-strike']], t.list)}</select></label><label>Jogi vizsgálat <select data-legal data-id="${esc(t.id)}"${legal ? '' : ' disabled'}>${opts([['', 'nincs'], ['megfelelő', 'megfelelő'], ['kifogás', 'kifogás']], t.legal)}</select></label>` : ''}
        <div class="row">${(can || ok) && t.stage > 1 ? `<button class="btn sm" data-a="back" data-id="${esc(t.id)}" title="Vissza">←</button>` : ''}${showNext ? `<button class="btn sm pri" data-a="next" data-id="${esc(t.id)}"${blocked ? ' disabled' : ''}>${t.stage === 3 ? 'JPTL jóváhagyás' : 'Tovább →'}</button>` : ''}</div></div>`;
      }).join('')}</div>`).join(''));
      const tst = s.targets.filter(t => t.tst);
      set($('#dyn', root), `<h3>Dinamikus lánc – F2T2EA</h3><p class="muted">Időérzékeny célok; léptetés csak jóváhagyott (JPTL) célnál. A modellben a jóváhagyó a COM JFC.</p>${tst.length ? tst.map(t => `<div class="chain"><b>${esc(t.no)}</b>${A.F2T2EA.map((n, i) => `<span class="${i < t.f2 ? 'done' : i === t.f2 ? 'cur' : ''}">${n}</span>`).join('')}${dyn ? `<button class="btn sm pri" data-a="f2" data-id="${esc(t.id)}"${t.approved && t.f2 < 6 ? '' : ' disabled'}>Következő lépés</button>` : ''}</div>`).join('') : '<p>Nincs időérzékeny cél.</p>'}<p class="muted">A 4. fázisba csak JTL vagy RTL listás, „megfelelő” jogi vizsgálatú cél léphet, a COM JFC jóváhagyásával. TVB: Target Validation Board; JTCB: Joint Targeting Coordination Board.</p>`);
    };
  }

  /* ---------- küldetések (MAOP / ATO) ---------- */
  function msn(root, ctx) {
    const r = ctx.role, full = A.can(r, 'msn'), aar = A.can(r, 'msnAAR'), stat = A.can(r, 'msnStat');
    let cur = '';
    root.innerHTML = head('MAOP és ATO', 'Küldetések tervezése a kiadásig, állapotkövetés a végrehajtás alatt', '<select id="as" aria-label="ATO választó"></select>') +
      `<div class="scroll">${full || aar ? `<form class="box row wrap"><select name="type" aria-label="Küldetéstípus">${opts(Object.entries(A.MTYPES).filter(([k]) => full || k === 'AAR').map(([k, v]) => [k, k + ' – ' + v]))}</select><input name="cs" required maxlength="24" placeholder="Hívójel"><input name="ac" required maxlength="40" placeholder="Repülőeszköz-típus"><input name="count" type="number" min="1" max="48" value="2" aria-label="Gépszám"><input name="tot" type="time" required aria-label="TOT (UTC)"><button class="btn pri">Küldetés felvétele</button><span class="muted" id="lock"></span></form>` : ''}<div class="box tblw"><table></table></div></div>`;
    const as = $('#as', root), f = $('form', root);
    const released = a => !a || a.closed || a.phase > 4;
    as.onchange = () => { cur = as.value; upd(); };
    if (f) f.onsubmit = e => { e.preventDefault(); const cs = f.cs.value.trim(), ac = f.ac.value.trim(); if (!cs || !ac) return; A.mut(s => { const a = s.atos.find(x => x.id === cur); if (released(a)) return; s.missions.push({ id: A.uid(), ato: cur, type: f.type.value, cs, ac, count: Math.max(1, +f.count.value || 1), tot: f.tot.value, status: 'tervezett' }); }); f.cs.value = ''; };
    root.addEventListener('change', e => { const id = e.target.dataset.st; if (id && stat) A.mut(s => { const m = s.missions.find(x => x.id === id), a = s.atos.find(x => x.id === m.ato); if (a.phase === 5 && !a.closed) m.status = e.target.value; }); });
    root.onclick = e => { const b = e.target.closest('[data-del]'); if (b) A.mut(s => { const m = s.missions.find(x => x.id === b.dataset.del); if (m && !released(s.atos.find(a => a.id === m.ato)) && (full || (aar && m.type === 'AAR'))) s.missions = s.missions.filter(x => x !== m); }); };
    function upd() {
      const s = A.get(); if (!s.atos.some(a => a.id === cur)) cur = (s.atos.find(a => a.phase === 5 && !a.closed) || s.atos[0]).id;
      set(as, opts(s.atos.map(a => [a.id, a.id + (a.closed ? ' – lezárt' : ' – ' + a.phase + '. fázis')]), cur)); as.value = cur;
      const a = s.atos.find(x => x.id === cur), list = s.missions.filter(m => m.ato === cur).sort((x, y) => x.tot < y.tot ? -1 : 1);
      if (f) { f.querySelector('button').disabled = released(a); $('#lock', root).textContent = released(a) ? 'Kiadott ATO: új küldetés nem vehető fel.' : ''; }
      set($('table', root), `<thead><tr><th>TOT (UTC)</th><th>Típus</th><th>Hívójel</th><th>Repülőeszköz</th><th>Gép</th><th>Állapot</th><th></th></tr></thead><tbody>${list.map(m => `<tr><td>${esc(m.tot)}</td><td title="${esc(A.MTYPES[m.type])}"><b>${esc(m.type)}</b></td><td>${esc(m.cs)}</td><td>${esc(m.ac)}</td><td>${+m.count}</td><td>${stat && a.phase === 5 && !a.closed ? `<select data-st="${esc(m.id)}" aria-label="${esc(m.cs)} állapota">${opts(A.MSTAT.map(x => [x, x]), m.status)}</select>` : esc(m.status)}</td><td>${!released(a) && (full || (aar && m.type === 'AAR')) ? `<button class="btn sm warn" data-del="${esc(m.id)}">törlés</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Még nincs küldetés ebben az ATO-ban.</td></tr>'}</tbody>`);
    }
    return upd;
  }

  /* ---------- légtérirányítás ---------- */
  function acm(root, ctx) {
    const r = ctx.role, req = A.can(r, 'acmReq') || A.can(r, 'acmOk'), ok = A.can(r, 'acmOk');
    let pts = [];
    root.innerHTML = head('Légtérirányítás (ACO)', 'Légtérkérés → JACC koordináció → ACO a közös operatív képen (AJP-3.3.5)') +
      `<div class="split"><div class="scroll">${req ? `<form class="box col2"><label>Típus<select name="type">${opts(Object.entries(A.CM).map(([k, v]) => [k, k + ' – ' + v.name]))}</select></label><label>Megnevezés<input name="name" required maxlength="40"></label><label>Magasságsáv<input name="alt" required maxlength="20" value="FL150–FL250"></label><label>Idő (UTC)<input name="time" required maxlength="20" value="06–12"></label><label>Sugár (körzetnél)<input name="r" type="number" min="15" max="200" value="45"></label><div class="row wrap"><button type="button" class="btn" id="pick">📍 Pont a térképen</button><span id="pc" class="muted">nincs kijelölt pont</span></div><button class="btn pri">Légtérkérés beadása</button><p class="err" id="er"></p></form>` : ''}<div class="box tblw"><table></table></div></div><div class="mh"></div></div>`;
    const map = A.Map($('.mh', root), { filter: visibleTo(r), showReq: true });
    const f = $('form', root);
    const pc = () => $('#pc', root).textContent = pts.length ? pts.length + ' pont kijelölve' : 'nincs kijelölt pont';
    if (f) {
      $('#pick', root).onclick = () => { const line = A.CM[f.type.value].line; if (!line) pts = []; map.pick((x, y) => { pts.push([x, y]); pc(); }); $('#pc', root).textContent = 'kattints a térképre…'; };
      f.type.onchange = () => { pts = []; pc(); };
      f.onsubmit = e => { e.preventDefault(); const t = f.type.value, need = A.CM[t].line ? 2 : 1; if (pts.length < need) return $('#er', root).textContent = 'Jelölj ki legalább ' + need + ' pontot a térképen.'; $('#er', root).textContent = ''; const name = f.name.value.trim(); if (!name) return; const p = pts.slice(); pts = []; pc(); A.mut(s => s.acms.push({ id: A.uid(), type: t, name, pts: A.CM[t].line ? p : [p[p.length - 1]], r: A.CM[t].line ? 0 : Math.max(15, Math.min(200, +f.r.value || 45)), alt: f.alt.value.trim(), time: f.time.value.trim(), status: 'kérés', by: r })); f.name.value = ''; };
    }
    root.addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b && ok) A.mut(s => { s.acms.find(x => x.id === b.dataset.id).status = b.dataset.d; }); });
    return () => {
      const s = A.get();
      set($('table', root), `<thead><tr><th>Típus</th><th>Megnevezés</th><th>Sáv / idő</th><th>Igénylő</th><th>Állapot</th></tr></thead><tbody>${s.acms.slice().reverse().map(m => `<tr><td><b>${esc(m.type)}</b></td><td>${esc(m.name)}</td><td>${esc(m.alt)}<br><small>${esc(m.time)}</small></td><td>${esc(role(m.by).short)}</td><td>${esc(m.status)}${ok ? `<div class="row">${m.status !== 'aktív' ? `<button class="btn sm pri" data-d="aktív" data-id="${esc(m.id)}">ACO-ba</button>` : ''}${m.status !== 'elutasítva' ? `<button class="btn sm warn" data-d="elutasítva" data-id="${esc(m.id)}">${m.status === 'aktív' ? 'visszavon' : 'elutasít'}</button>` : ''}</div>` : ''}</td></tr>`).join('')}</tbody>`);
      map.draw();
    };
  }

  /* ---------- wargame ---------- */
  function wg(root, ctx) {
    const r = ctx.role, run = A.can(r, 'wg'), log = A.can(r, 'wgLog');
    root.innerHTML = head('Wargame ciklus', 'Akció – reakció – ellenakció – kognitív fázis (AJP-5, C melléklet)', '<button class="btn" id="csv">Jegyzőkönyv (CSV)</button>') +
      `<div class="scroll"><div class="two"><div class="box timer"><div id="ti"></div><div class="clock" role="timer">00:00</div>${run ? '<div class="row wrap c"><button class="btn pri" data-w="go">▶ Indítás / szünet</button><button class="btn" data-w="prev">← Előző</button><button class="btn" data-w="next">Következő →</button><button class="btn" data-w="cycle">Új ciklus</button></div><div class="row wrap c"><label>Szekvencia <select id="sq"></select></label><label>Bemutatás <select id="pr"><option value="3">3 perc</option><option value="6">6 perc</option></select></label></div>' : '<p class="muted">A ciklust a gyakorlatvezető vagy a döntőbíró vezérli.</p>'}</div><ol class="box steps"></ol></div>
      ${log ? `<form class="box row wrap"><select name="cat" aria-label="Rovat">${opts(A.WGCAT.map(c => [c, c]))}</select><input name="t" required maxlength="800" class="grow" placeholder="Megállapítás rögzítése"><button class="btn pri">Rögzítés</button></form>` : ''}<div class="box tblw"><table></table></div></div>`;
    const steps = w => A.wgSteps(w.pres);
    const go = (w, i) => { const st = steps(w); w.step = Math.max(0, Math.min(st.length - 1, i)); w.left = st[w.step].m * 60; w.endsAt = 0; };
    root.onclick = e => {
      const b = e.target.closest('[data-w]'); if (!b || !run) return;
      A.mut(s => { const w = s.wg, a = b.dataset.w; if (a === 'go') { if (w.endsAt) { w.left = Math.max(0, Math.round((w.endsAt - Date.now()) / 1000)); w.endsAt = 0; } else if (w.left > 0) w.endsAt = Date.now() + w.left * 1000; } if (a === 'next') go(w, w.step + 1); if (a === 'prev') go(w, w.step - 1); if (a === 'cycle') { w.cycle++; go(w, 3); } });
    };
    root.onchange = e => { if (!run) return; if (e.target.id === 'sq') A.mut(s => { s.wg.seq = +e.target.value; s.wg.cycle = 1; go(s.wg, 0); }); if (e.target.id === 'pr') A.mut(s => { s.wg.pres = +e.target.value; go(s.wg, s.wg.step); }); };
    const f = $('form', root);
    if (f) f.onsubmit = e => { e.preventDefault(); const t = f.t.value.trim(); if (!t) return; A.mut(s => { const w = s.wg; w.records.push({ ts: new Date().toISOString(), role: r, seq: w.seq + 1, cycle: w.cycle, phase: steps(w)[w.step].p, cat: f.cat.value, text: t }); }); f.t.value = ''; };
    $('#csv', root).onclick = () => {
      const q = v => { v = String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
      const rows = [['idő', 'szerepkör', 'szekvencia', 'ciklus', 'fázis', 'rovat', 'megállapítás'], ...A.get().wg.records.map(x => [x.ts, role(x.role).short, x.seq, x.cycle, x.phase, x.cat, x.text])];
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + rows.map(x => x.map(q).join(';')).join('\r\n')], { type: 'text/csv' })); a.download = 'wargame_jegyzokonyv_' + new Date().toISOString().slice(0, 10) + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    const tick = () => { const w = A.get().wg, left = w.endsAt ? Math.max(0, Math.round((w.endsAt - Date.now()) / 1000)) : w.left; const c = $('.clock', root); if (!c) return; c.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0'); c.classList.toggle('over', left === 0); c.classList.toggle('run', !!w.endsAt && left > 0); };
    const iv = setInterval(tick, 500); ctx.onLeave(() => clearInterval(iv));
    return () => {
      const w = A.get().wg, st = steps(w), cur = st[w.step];
      set($('#ti', root), `<span class="badge">${esc(A.SEQ[w.seq])}</span><h3>${w.cycle}. ciklus · ${esc(cur.p)}</h3><p>${esc(cur.n)}</p>`);
      if (run) { const sq = $('#sq', root); set(sq, opts(A.SEQ.map((x, i) => [String(i), x.split(':')[0]]), String(w.seq))); sq.value = String(w.seq); $('#pr', root).value = String(w.pres); }
      set($('.steps', root), st.map((x, i) => `<li class="${i < w.step ? 'done' : i === w.step ? 'cur' : ''}"><b>${esc(x.p)}</b> ${esc(x.n)}<em>${x.m} p</em></li>`).join(''));
      set($('table', root), `<thead><tr><th>Ciklus</th><th>Fázis</th><th>Rovat</th><th>Megállapítás</th><th>Rögzítette</th></tr></thead><tbody>${w.records.slice().reverse().map(x => `<tr><td>${x.seq}/${x.cycle}</td><td>${esc(x.phase)}</td><td>${esc(x.cat)}</td><td>${esc(x.text)}</td><td>${esc(role(x.role).short)} · ${hm(x.ts)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Még nincs rögzített megállapítás.</td></tr>'}</tbody>`);
      tick();
    };
  }

  /* ---------- gyakorlatvezető ---------- */
  function excon(root) {
    let at = null, armed = 0;
    root.innerHTML = head('Gyakorlatvezetés', 'Injectek bejátszása a közös operatív képre és a JCHAT-be', '<button class="btn warn" id="rs">Új játék</button>') +
      `<div class="split"><div class="scroll"><form class="box col2"><label>Cím<input name="title" required maxlength="100"></label><label>Leírás<textarea name="body" rows="4" required maxlength="800"></textarea></label><label>Címzett<select name="to">${opts([['all', 'Mindenki (COP-on is)'], ...A.ROLES.filter(x => x.id !== 'ex').map(x => [x.id, x.short + ' – ' + x.name])])}</select></label><label>Súlyosság<select name="sev"><option value="1">1 – tájékoztató</option><option value="2" selected>2 – figyelmet igényel</option><option value="3">3 – kritikus</option></select></label><div class="row wrap"><button type="button" class="btn" id="pick">📍 Helyszín a térképen</button><span id="pc" class="muted">nincs kijelölve</span></div><button class="btn pri">Inject bejátszása</button><p class="err" id="er"></p></form><div class="box tblw"><table></table></div></div><div class="mh"></div></div>`;
    const map = A.Map($('.mh', root), { showReq: true }), f = $('form', root);
    $('#pick', root).onclick = () => { map.pick((x, y) => { at = [x, y]; $('#pc', root).textContent = `kijelölve (${x}, ${y})`; }); $('#pc', root).textContent = 'kattints a térképre…'; };
    f.onsubmit = e => { e.preventDefault(); if (!at) return $('#er', root).textContent = 'Előbb jelöld ki a helyszínt a térképen.'; $('#er', root).textContent = ''; const title = f.title.value.trim(), body = f.body.value.trim(); if (!title || !body) return; const p = at; at = null; $('#pc', root).textContent = 'nincs kijelölve'; A.mut(s => s.incidents.push({ id: A.uid(), seq: s.incidents.reduce((m, i) => Math.max(m, i.seq), 0) + 1, ts: new Date().toISOString(), title, body, x: p[0], y: p[1], sev: +f.sev.value, to: f.to.value })); f.title.value = ''; f.body.value = ''; };
    const rs = $('#rs', root);
    rs.onclick = () => { if (Date.now() - armed < 4000) { armed = 0; rs.textContent = 'Új játék'; A.reset(); } else { armed = Date.now(); rs.textContent = 'Megerősítés: minden adat törlődik'; setTimeout(() => { rs.textContent = 'Új játék'; }, 4000); } };
    root.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) map.focus(b.dataset.f); });
    return () => {
      const s = A.get();
      set($('table', root), `<thead><tr><th>Inject</th><th>Címzett</th><th>Idő</th><th></th></tr></thead><tbody>${s.incidents.slice().reverse().map(i => `<tr><td><b>INC-${String(i.seq).padStart(2, '0')}</b> ${esc(i.title)}</td><td>${i.to === 'all' ? 'mindenki' : esc(role(i.to).short)}</td><td>${hm(i.ts)}</td><td><button class="btn sm" data-f="${esc(i.id)}">🗺</button></td></tr>`).join('')}</tbody>`);
      map.draw();
    };
  }

  /* ---------- szerepkörök ---------- */
  function roles(root, ctx) {
    root.innerHTML = head('Szerepkörök', 'Feladatok és doktrinális hivatkozások') + `<div class="scroll"><div class="cards">${A.ROLES.map(r => `<article class="box${r.id === ctx.role ? ' me' : ''}"><small>${esc(r.g)}</small><h3>${esc(r.short)}</h3><b>${esc(r.name)}</b><p>${esc(r.task)}</p><span class="muted">${esc(r.ref)}</span></article>`).join('')}</div></div>`;
    return () => { };
  }

  A.VIEWS = {
    cop: { ic: '🗺', label: 'Közös operatív kép', fn: cop }, ato: { ic: '🔁', label: 'ATO ciklus', fn: ato }, tgt: { ic: '🎯', label: 'Célkiválasztás', fn: tgt },
    msn: { ic: '✈', label: 'MAOP / ATO', fn: msn }, acm: { ic: '🛡', label: 'Légtér (ACO)', fn: acm }, wg: { ic: '♟', label: 'Wargame', fn: wg },
    excon: { ic: '🎛', label: 'Gyakorlatvezetés', fn: excon, only: 'ex' }, roles: { ic: '👥', label: 'Szerepkörök', fn: roles }
  };
})();
