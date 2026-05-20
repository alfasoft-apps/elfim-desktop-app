# Windows quraşdırıcı (EXE / NSIS) və təhlükəsizlik

## Quraşdırıcı yaratmaq

### Tələblər

- Node.js 20+
- `npm install` (bir dəfə)

### Addımlar

```bash
cd ElfimDesktopApp

# Production API (`.env`):
# VITE_REST_API_ENDPOINT=https://admin.elfim.az/api

npm run build:win
```

Nəticə:

| Fayl | Təsvir |
|------|--------|
| `release/Elfim Auto Setup x.x.x.exe` | NSIS quraşdırıcı (istifadəçiyə verin) |
| `release/win-unpacked/` | Portativ qovluq (quraşdırmadan test) |

### Quraşdırıcı ölçüsü (~150–200 MB və daha çox)

**Əsas səbəb:** Electron hər builddə tam **Chromium** + **Node** mühiti daşıyır; bu tək başına yüzlərlə MB yer tutur. Tətbiqin öz `out/` paketi adətən Electron-un yanında kiçik qalır (`electron-builder` konfiqində yalnız `out/**/*` daxil edilir).

Kiçiltmə üçün (tam həll deyil): `compression: "maximum"`, lazımsız native asılılıqların qarşısını almaq, distributiv üçün ayrıca «slim» Electron forklarından istifadə (əlavə iş). Müştəriyə gözlənti: masaüstü Chromium əsaslı müştərilər adətən **100 MB+** gövdə ölçüsünə malik olur.

### İmzalama (isteğa bağlı, tövsiyə olunur)

İndi `CSC_IDENTITY_AUTO_DISCOVERY=false` ilə **imzasız** build edilir (lokal test üçün).

Müştəriyə paylamaq üçün Windows Code Signing sertifikatı alın və `electron-builder` ilə imzalayın — SmartScreen xəbərdarlığı azalır.

### Versiya

`package.json` → `"version"` dəyişin; quraşdırıcı adı avtomatik yenilənir.

---

## Lisenziya / barmaq izi (cihaz bağlama)

### Client (bu tətbiq)

- Hər API sorğusundan **əvvəl** canlı CPU/GPU/sistem toxumu keşlə müqayisə olunur.
- Uyğun gəlmirsə sorğu **403** qaytarır: *«Bu lisenziya bu kompüterə uyğun deyil…»*
- Əlavə olaraq hər **60 saniyədə** arxa planda yoxlama işləyir.
- Keş faylı: `%APPDATA%\elfim-desktop-app\.device-seed.enc` — **başqa PC-yə köçürülə bilməz** (AES-GCM + həmin maşının `userData`/hostname/username ilə açar).

### Server (Laravel)

`VerifyDesktopClientAccess` middleware: istifadəçidə `fingerprint_token` varsa, `X-Elfim-License-Fingerprint` başlığı **eyni olmalıdır**.

**Vacib:** Müştəri Parametrlərdən kodu kopyalayıb başqa yerdə HTTP client ilə göndərə bilər — server yalnız token müqayisə edir. Güclü model:

1. Admin paneldə istifadəçiyə **yalnız həmin PC-dən** ilk dəfə girişdə token yazın.
2. IP whitelist (`desktop_allowed_ips`) ilə birləşdirin.
3. Token dəyişəndə köhnə tokeni ləğv edin.

Token düstur: `SHA-256("1|" + hardwareSeed + "|" + email)` — e-poçt dəyişəndə token də dəyişir.

---

## Obfuskasiya (EXE / DLL açılmasın)

**Tam qoruma mümkün deyil** — Electron Node.js + Chromium daşıyır; təcrübəli mütəxəssis `asar` çıxara bilər. Məqsəd: asan təhlili çətinləşdirmək.

### 1. ASAR (default)

`electron-builder` kodu `app.asar` içində paketləyir. `package.json` build bölməsində:

```json
"asar": true,
"asarUnpack": []
```

### 2. JavaScript obfuskasiya (orta səviyyə)

Build-dən sonra `out/main` və `out/preload` üçün (renderer ayrıca):

- [javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator)
- və ya Vite plugin (məs. `rollup-plugin-obfuscator`) — **yalnız production** `build:win` üçün.

Diqqət: debug çətinləşir; performans bir qədər düşə bilər.

### 3. Bytenode (bytecode)

`main` / `preload` JS-i `.jsc` bytecode-a çevirmək — Electron ilə uyğunlaşdırma tələb edir.

### 4. Native modul

Ən həssas məntiq (barmaq izi) kiçik **C++ Node addon** (.node) — reverse engineering çətindir, amma development mürəkkəbdir.

### 5. Electron Fuses

`@electron/fuses` ilə ASAR integrity, Node mühitini məhdudlaşdırmaq — [Electron fuses](https://www.electronjs.org/docs/latest/tutorial/fuses).

### 6. Nə işləmir / tövsiyə olunmur

- Yalnız obfuskasiya ilə «tam kilid» gözləməyin.
- Şifrəni və API açarlarını koda yazmayın — `.env` build zamanı daxil edin, server tərəfində yoxlama aparın.

### Praktik minimum (bu layihə üçün)

1. `npm run build:win` — production build.
2. ASAR aktiv saxlayın.
3. Lisenziya yoxlaması **server + client** (artıq var).
4. Paylama: imzalı NSIS installer.
5. Lazım olsa: obfuscator yalnız `out/main/index.js` və `out/preload/index.js` üçün post-build skript.

---

## Loglar

API sorğu/cavab: `%APPDATA%\elfim-desktop-app\logs\api-http.log`  
Parse xətaları: `api-parse-error.log`  
Tətbiqdə: **Parametrlər → API logları → Log qovluğunu aç**
