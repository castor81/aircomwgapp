/* AIRCOM wargaming app – folyamat- és szerepkörmodell (forrás: AJP-3.3(C), AJP-3.3.5(C), AJP-3.9(B), AJP-3(D), AJP-5(B)).
   A leírások saját megfogalmazású összefoglalók; a hivatkozás a doktrína fejezetét/pontját jelöli. */
window.ACW = window.ACW || {};
ACW.VERSION = '0.1.0';
ACW.DATE = '2026-11-26';

/* jogosultságok: ato, apport, apportOk, tgt, tgtOk, legal, msn, msnAAR, msnStat, acmReq, acmOk, dyn, wg, wgLog */
ACW.ROLES = [
  { id: 'ex', g: 'Játékvezetés', short: 'EXCON', name: 'Gyakorlatvezető', task: 'A játék vezénylése, injectek bejátszása.', ref: 'AJP-5 C.2', can: ['*'], home: 'excon' },
  { id: 'ref', g: 'Játékvezetés', short: 'REF', name: 'Döntőbíró és jegyző', task: 'Lépések értékelése, eredmények rögzítése.', ref: 'AJP-5 C.5', can: ['wg', 'wgLog'], home: 'wg' },
  { id: 'jfc', g: 'Összhaderőnemi szint', short: 'COM JFC', name: 'Összhaderőnemi parancsnok', task: 'Iránymutatás; apportionment és JPTL jóváhagyása.', ref: 'AJP-3.3 4.27–4.29', can: ['apportOk', 'tgt', 'tgtOk', 'wgLog'], home: 'tgt' },
  { id: 'cfacc', g: 'Légi komponens vezetése', short: 'CFACC', name: 'CFACC (egyben ACA, AMDC)', task: 'Légi erők tervezése és vezénylése; MAOP és ATO jóváhagyása.', ref: 'AJP-3.3 2.18–2.19', can: ['ato', 'apport', 'msn', 'wgLog'], home: 'ato' },
  { id: 'sd', g: 'JFAC törzs', short: 'SD', name: 'Strategy Division', task: 'Légi stratégia, AOD, értékelés.', ref: 'AJP-3.3 B.5', can: ['ato', 'apport', 'wgLog'], home: 'ato' },
  { id: 'isr', g: 'JFAC törzs', short: 'ISRD', name: 'ISR Division', task: 'Felderítés, célinformáció, JIPOE.', ref: 'AJP-3.3 B.10', can: ['tgt', 'dyn', 'wgLog'], home: 'tgt' },
  { id: 'gat', g: 'Combat Plans Division', short: 'GAT', name: 'Guidance, Apportionment and Targeting csoport', task: 'Apportionment-javaslat; az air PTL levezetése a JPTL-ből.', ref: 'AJP-3.3 B.7.a', can: ['tgt', 'apport', 'wgLog'], home: 'tgt' },
  { id: 'maop', g: 'Combat Plans Division', short: 'MAOP', name: 'MAOP csoport', task: 'Fő légi műveleti terv: képességek küldetésekhez rendelése.', ref: 'AJP-3.3 B.7.b', can: ['msn', 'wgLog'], home: 'msn' },
  { id: 'atot', g: 'Combat Plans Division', short: 'ATO', name: 'ATO-előállító csoport', task: 'ATO és SPINS előállítása, kiadása.', ref: 'AJP-3.3 B.7.c', can: ['ato', 'msn', 'wgLog'], home: 'msn' },
  { id: 'jacc', g: 'Combat Plans Division', short: 'JACC', name: 'Joint Airspace Coordination Centre', task: 'ACP, ACO; légtérkérések koordinálása.', ref: 'AJP-3.3 B.7.e; AJP-3.3.5 2.4', can: ['acmOk', 'wgLog'], home: 'acm' },
  { id: 'aar', g: 'Combat Plans Division', short: 'AAR', name: 'Légi utántöltő cella', task: 'AAR tervezése és a szükséges légtér igénylése.', ref: 'AJP-3.3 B.7.f', can: ['acmReq', 'msnAAR', 'wgLog'], home: 'msn' },
  { id: 'cod', g: 'Combat Operations Division', short: 'COD', name: 'Combat Operations Division', task: 'Futó ATO követése, átfeladatolás, időérzékeny célok.', ref: 'AJP-3.3 B.8', can: ['msnStat', 'dyn', 'wgLog'], home: 'msn' },
  { id: 'sbamd', g: 'Combat Operations Division', short: 'SBAMD', name: 'SBAMD/TBMD koordinációs cella', task: 'Földi telepítésű lég- és rakétavédelem koordinálása.', ref: 'AJP-3.3 B.8.b', can: ['acmReq', 'wgLog'], home: 'cop' },
  { id: 'prcc', g: 'Combat Operations Division', short: 'PRCC', name: 'Személymentő koordinációs cella', task: 'Személyek mentésének tervezése és vezénylése.', ref: 'AJP-3.3 B.8.c', can: ['acmReq', 'wgLog'], home: 'cop' },
  { id: 'woc', g: 'Végrehajtó elemek', short: 'WOC', name: 'Repterek és egységek (WOC)', task: 'Küldetések előkészítése, eredményjelentés.', ref: 'AJP-3.3 C.8', can: ['msnStat', 'wgLog'], home: 'msn' },
  { id: 'crc', g: 'Végrehajtó elemek', short: 'CRC', name: 'Control and Reporting Centre', task: 'Felismert légihelyzet-kép, harcirányítás, légtérirányítás.', ref: 'AJP-3.3 C.1', can: ['msnStat', 'acmReq', 'wgLog'], home: 'cop' },
  { id: 'legad', g: 'Támogatók', short: 'LEGAD', name: 'Jogi tanácsadó', task: 'A célok jogszerűségének vizsgálata.', ref: 'AJP-3.9 1. fej., 2. fázis', can: ['legal', 'wgLog'], home: 'tgt' },
  { id: 'red', g: 'Ellenfél', short: 'OPFOR', name: 'Ellenséges erő (Red)', task: 'Ellenséges COA képviselete a wargame-ben.', ref: 'AJP-5 C.4', can: ['wgLog'], home: 'wg' }
];

ACW.PHASES = [
  { n: 1, name: 'Stratégia és tervfejlesztés', ref: '4.16', lead: 'SD', prod: ['AOD-módosítási javaslat', 'Apportionment-javaslat', 'Strategy-to-task mátrix'] },
  { n: 2, name: 'Manőver- és célfejlesztés', ref: '4.17', lead: 'SD / GAT', prod: ['Jóváhagyott AOD', 'Air-JPDAL'] },
  { n: 3, name: 'Fegyveralkalmazás-tervezés és légi elosztás', ref: '4.18–4.20', lead: 'GAT / MAOP', prod: ['Eszköz–cél párosítás', 'MAOP', 'CFACC MAOP-jóváhagyás'] },
  { n: 4, name: 'ATO-kidolgozás', ref: '4.21', lead: 'ATO / JACC', prod: ['ATO', 'Napi SPINS', 'ACO'] },
  { n: 5, name: 'Végrehajtás', ref: '4.22', lead: 'COD / CRC', prod: ['ATO-módosítások', 'Küldetésjelentések'] },
  { n: 6, name: 'Értékelés', ref: '4.23–4.25', lead: 'AOAB', prod: ['MOP/MOE értékelés', 'STT és apportionment visszacsatolás'] }
];

ACW.TSTAGES = [
  { n: 1, name: 'Szándék és iránymutatás', out: 'Célkiválasztási irányelvek' },
  { n: 2, name: 'Célfejlesztés', out: 'JTL / RTL / NSL (TVB)' },
  { n: 3, name: 'Képességelemzés', out: 'JPTL-tervezet' },
  { n: 4, name: 'Döntés és erőtervezés', out: 'Jóváhagyott JPTL (JTCB)' },
  { n: 5, name: 'Küldetéstervezés és végrehajtás', out: 'ATO-ba illesztve' },
  { n: 6, name: 'Értékelés', out: 'Hatásértékelés' }
];
ACW.F2T2EA = ['Find', 'Fix', 'Track', 'Target', 'Engage', 'Exploit', 'Assess'];

ACW.MTYPES = { DCA: 'Védelmi ellenlégi', OCA: 'Támadó ellenlégi', SEAD: 'Ellenséges légvédelem elnyomása', AI: 'Légi lefogás', CAS: 'Közvetlen légi támogatás', ISR: 'Felderítés', AEW: 'Légi korai előrejelzés', AAR: 'Légi utántöltés', AT: 'Légi szállítás', PR: 'Személymentés' };
ACW.MSTAT = ['tervezett', 'riasztva', 'levegőben', 'végrehajtva', 'törölve'];

/* koordinációs intézkedések (AJP-3.3.5 B melléklet) */
ACW.CM = {
  FEZ: { name: 'Fighter Engagement Zone', c: '#5aa9ff' },
  MEZ: { name: 'Missile Engagement Zone', c: '#ff7a59' },
  JEZ: { name: 'Joint Engagement Zone', c: '#c08cff' },
  WFZ: { name: 'Weapons Free Zone', c: '#ff4d6d' },
  BDZ: { name: 'Base Defence Zone', c: '#ffb020' },
  ROZ: { name: 'Restricted Operating Zone', c: '#4fe0b0' },
  HIDACZ: { name: 'High-Density Airspace Control Zone', c: '#e8e36b' },
  TC: { name: 'Transit Corridor', c: '#9fd3e8', line: true },
  TR: { name: 'Transit Route', c: '#8ee08a', line: true }
};

/* wargame (AJP-5 C melléklet) */
ACW.SEQ = ['1. szekvencia: saját COA #1 – legveszélyesebb ellenséges COA', '2. szekvencia: saját COA #1 – legvalószínűbb ellenséges COA'];
ACW.wgSteps = function (pres) {
  const s = [{ p: 'Előkészítés', n: 'Kiinduló helyzet', m: 5 }, { p: 'Előkészítés', n: 'Saját COA bemutatása', m: 5 }, { p: 'Előkészítés', n: 'Ellenséges COA bemutatása', m: 5 }];
  ['Akció (Blue)', 'Reakció (Red)', 'Ellenakció (Blue)'].forEach(p => s.push({ p, n: 'Tevékenységek bemutatása', m: pres }, { p, n: 'Megértést segítő kérdések', m: 1 }, { p, n: 'Eredmények rögzítése', m: 1 }));
  s.push({ p: 'Kognitív fázis', n: 'Összekötők és szakértők hozzájárulása', m: 5 }, { p: 'Kognitív fázis', n: 'Értékelés (döntőbíró, jegyzők)', m: 5 }, { p: 'Kognitív fázis', n: 'Jegyzők visszaolvasása', m: 1 }, { p: 'Kognitív fázis', n: 'Vezetői következtetések', m: 1 });
  return s;
};
ACW.WGCAT = ['COA-pontosítás / hiányosság', 'További erő- vagy erőforrásigény', 'Veszteségbecslés', 'Szinkronizációs igény', 'Új kockázat, trigger, indikátor', 'Döntési pont, branch, sequel', 'Döntő feltétel, CCIR', 'Súlypont-elemzés (CoG) módosítás', 'Egyéb tapasztalat', 'MOP/MOE pontosítás'];
