# AIRCOM wargaming app – v0.1.0 (2026-11-26)

Légi műveletek tervezésének és végrehajtásának oktatási célú wargame-felülete, magyar nyelven.
Statikus webalkalmazás (build nélkül), Vercelre telepíthető. A forgatókönyv fiktív. Nem hivatalos NATO-termék.

## Futtatás
    python3 -m http.server 8000     # majd http://localhost:8000

Vercel: Framework preset **Other**, build parancs nincs, kimeneti könyvtár a gyökér.

## Korlátok (v0.1)
- **Helyi demó:** az állapot a böngésző `localStorage`-ában van; csak ugyanazon böngésző lapjai szinkronizálnak.
- **Nincs hitelesítés:** a szerepkör szabadon választható, a jogosultságok és a címzett injectek csak a felületen érvényesülnek.
  Valós gyakorlathoz szerveroldali adatbázis és jogosultságkezelés szükséges.
- Ne vigyen be valós vagy minősített adatot.

## Szerkezet
| Fájl | Tartalom |
|---|---|
| `js/model.js` | Szerepkörök, ATO- és célkiválasztási fázisok, koordinációs intézkedések, wargame lépések |
| `js/store.js` | Adattár és fiktív kiinduló forgatókönyv |
| `js/map.js` | SVG-térkép |
| `js/views.js` | Nézetek |
| `js/app.js` | Belépő és útvonalak |

## Doktrinális alap
AJP-3.3 Ed C, AJP-3.3.5 Ed C, AJP-3.9 Ed B, AJP-3 Ed D, AJP-5 Ed B. A kód saját megfogalmazású összefoglalókat
és ponthivatkozásokat tartalmaz; a kiadványok nem részei a tárhelynek.
