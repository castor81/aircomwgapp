/* adattár: helyi demó (localStorage + storage esemény) – ugyanazon böngésző lapjai között szinkronizál.
   Minden szöveges mező megjelenítéskor escape-elve van. A forgatókönyv teljes egészében fiktív. */
(function () {
  'use strict';
  const KEY = 'acw-state-v1';
  const A = window.ACW;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const now = () => new Date().toISOString();

  function seed() {
    const done = n => { const o = {}; A.PHASES.filter(p => p.n < n).forEach(p => p.prod.forEach(x => o[p.n + '|' + x] = true)); return o; };
    const ato = (id, phase) => ({ id, phase, prod: done(phase), closed: false });
    const m = (ato, type, cs, ac, count, tot, status) => ({ id: uid(), ato, type, cs, ac, count, tot, status });
    const t = (no, name, kind, stage, extra) => Object.assign({ id: uid(), no, name, kind, stage, list: stage >= 2 ? 'JTL' : '', legal: '', approved: stage >= 4, tst: false, f2: -1 }, extra || {});
    return {
      created: now(),
      atos: [ato('ATO A', 5), ato('ATO B', 4), ato('ATO C', 3), ato('ATO D', 1)],
      apport: { v: { DCA: 30, OCA: 20, SEAD: 15, AI: 15, CAS: 10, ISR: 10 }, ok: false },
      missions: [
        m('ATO A', 'DCA', 'FALCON 11', 'vadászrepülő', 4, '06:00', 'levegőben'), m('ATO A', 'AEW', 'EAGLE EYE 01', 'AEW&C', 1, '05:30', 'levegőben'),
        m('ATO A', 'AAR', 'TEXACO 21', 'utántöltő', 1, '06:15', 'levegőben'), m('ATO A', 'SEAD', 'VIPER 31', 'vadászbombázó', 4, '09:40', 'riasztva'),
        m('ATO A', 'AI', 'HAMMER 41', 'vadászbombázó', 4, '10:00', 'tervezett'), m('ATO B', 'ISR', 'OWL 51', 'pilóta nélküli', 2, '04:00', 'tervezett'),
        m('ATO B', 'CAS', 'BOAR 61', 'csatarepülő', 2, '07:30', 'tervezett')],
      targets: [
        t('T-001', 'Vörösföld északi korai előrejelző radar', 'létesítmény', 5, { legal: 'megfelelő' }),
        t('T-002', 'Közepes hatótávolságú légvédelmi üteg', 'eszköz', 4, { legal: 'megfelelő' }),
        t('T-003', 'Keleti repülőtér üzemanyagraktára', 'létesítmény', 3),
        t('T-004', 'Hadműveleti vezetési pont', 'létesítmény', 2),
        t('T-005', 'Folyami átkelőhely', 'létesítmény', 1),
        t('T-006', 'Mozgó rakétaindító (időérzékeny)', 'eszköz', 4, { legal: 'megfelelő', tst: true, f2: 0 })],
      acms: [
        { id: uid(), type: 'FEZ', name: 'FEZ KELET', pts: [[560, 330]], r: 105, alt: 'FL150–FL350', time: '00–24', status: 'aktív', by: 'jacc' },
        { id: uid(), type: 'MEZ', name: 'MEZ HÍDFŐ', pts: [[455, 475]], r: 62, alt: 'GND–FL250', time: '00–24', status: 'aktív', by: 'jacc' },
        { id: uid(), type: 'BDZ', name: 'BDZ ALFA', pts: [[210, 300]], r: 34, alt: 'GND–FL100', time: '00–24', status: 'aktív', by: 'jacc' },
        { id: uid(), type: 'ROZ', name: 'ROZ AAR TEXACO', pts: [[285, 170]], r: 52, alt: 'FL200–FL260', time: '05–11', status: 'aktív', by: 'jacc' },
        { id: uid(), type: 'TC', name: 'TC NYUGAT', pts: [[150, 520], [290, 410], [430, 360]], r: 0, alt: 'FL100–FL180', time: '00–24', status: 'aktív', by: 'jacc' },
        { id: uid(), type: 'ROZ', name: 'ROZ ISR DÉL', pts: [[400, 590]], r: 40, alt: 'FL180–FL220', time: '04–12', status: 'kérés', by: 'crc' }],
      incidents: [{ id: uid(), seq: 1, ts: now(), title: 'Azonosítatlan légi cél a FEZ keleti peremén', body: 'A CRC azonosítatlan, alacsonyan repülő célt jelent. Azonosítás folyamatban.', x: 660, y: 300, sev: 2, to: 'all' }],
      chat: [{ id: uid(), ts: now(), role: 'ex', text: 'A gyakorlat megkezdődött. Az ATO A végrehajtás alatt áll.', inc: '' }],
      wg: { seq: 0, cycle: 1, step: 0, pres: 6, endsAt: 0, left: 300, records: [] }
    };
  }

  let mem = null;
  const subs = new Set();
  function read() {
    try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (_) { }
    return mem;
  }
  function write(s) { mem = s; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) { } }
  A.uid = uid;
  A.get = () => read() || (write(seed()), mem);
  /* minden módosítás a legfrissebb állapotra épül, hogy a lapok ne írják felül egymást */
  A.mut = fn => { const s = A.get(); fn(s); write(s); subs.forEach(f => f()); };
  A.reset = () => { write(seed()); subs.forEach(f => f()); };
  A.on = f => { subs.add(f); return () => subs.delete(f); };
  window.addEventListener('storage', e => { if (e.key === KEY) subs.forEach(f => f()); });
})();
