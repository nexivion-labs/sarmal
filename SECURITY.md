# 🛡️ Güvenlik Bildirimi · Security Policy

> **Bu dosya iki dillidir ve tek gövdedir.** Önce Türkçe bölüm gelir, hemen ardından
> İngilizce bölüm; ikisi aynı bilgiyi taşır.
>
> **This document is bilingual and lives in a single file.** The Turkish section comes first,
> the English section follows, and both carry the same information.

---

<a id="iletisim"></a>

## 📮 İletişim · Contact

> **Bu blok bu deponun TEK iletişim kaynağıdır.** Adres ve yanıt süresi sözü yalnız burada
> yazılıdır; hem Türkçe hem İngilizce bölüm ile `CONTRIBUTING.md` ve `CODE_OF_CONDUCT.md`
> buraya işaret eder. Böylece adres değiştiğinde tek bir satır değişir ve geride bayat bir
> kopya kalmaz.
>
> **This block is the single source of contact information for this repository.** The address
> and the response commitment are written only here; both language sections, as well as
> `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`, point back to it. When the address changes,
> exactly one line changes and no stale copy is left behind.

| | |
|---|---|
| **Adres · Address** | **fatih@nexivionlabs.io** |
| **İlk yanıt · First response** | 7 gün içinde · within 7 days |
| **İlk değerlendirme · Initial assessment** | 30 gün içinde · within 30 days |
| **Kapanana kadar durum bildirimi · Status updates until closed** | 30 günde bir · every 30 days |

Sarmal'ın bakımı **tek kişilik bir ekip** tarafından yapılmaktadır ve yukarıdaki süreler bu
gerçeğe göre seçilmiştir; abartılmamış, tutulabilir sözlerdir. Adanmış bir güvenlik adresi
(`security@…`) **henüz açılmamıştır**; açılana kadar bütün güvenlik bildirimleri yukarıdaki
adrese gider.

Sarmal is maintained by **a one-person team**, and the timeframes above were chosen to match
that reality — they are deliberately modest and meant to be kept. A dedicated security
address (`security@…`) **has not been opened yet**; until it is, all security reports go to
the address above.

---

# 🇹🇷 Türkçe

## 1. Bir açık bulduysanız

**Genel bir konu açmayın, tartışma başlatmayın ve işleme mesajında anlatmayın.** Bulguyu
yukarıdaki [İletişim](#iletisim) adresine e-posta ile gönderin.

Raporunuzda şunlar varsa değerlendirme hızlanır:

- Etkilenen bileşen — motor (`urun/cekirdek/`), VS Code eklentisi (`urun/eklenti/`) ya
  da işleme öncesi kancası (`kanca/pre-commit`).
- Yeniden üretme adımları; mümkünse en küçük `.sar` dosyası ya da en kısa komut.
- Kullandığınız Node sürümü (`node --version`) ve işletim sistemi.
- Sizce etkisi ne — hangi veriye, hangi dosyaya ya da hangi yetkiye erişilebiliyor.

Yayımlanmış bir açığın koordineli açıklanmasını tercih ediyoruz: düzeltme çıkana ya da
bildirimden itibaren 90 gün geçene kadar — hangisi önce olursa — bulguyu kamuya açmamanızı
rica ederiz. Bu bir dayatma değil, tek kişilik bir ekipten makul biçimde beklenebilecek
sürenin dürüst ifadesidir.

**Ödül programı yoktur.** Para ödülü veremiyoruz. İsterseniz bulgunun kayda geçmesinde adınız
anılır. İyi niyetle yapılan, veri sızdırmayan ve kimsenin çalışmasını bozmayan araştırmayı
hasmane saymayız.

## 2. Desteklenen sürümler

Sarmal henüz **v1'e ulaşmamıştır**; sürüm numaraları `0.x` aralığındadır ve arayüz
değişebilir. Bu yüzden destek sürüm numarasına değil, konuma bağlanmıştır:

| Ne | Destek |
|---|---|
| `main` dalındaki motor ve eklenti | ✅ Desteklenir. Güvenlik düzeltmeleri buraya girer. |
| Eklentinin en son yayımlanmış sürümü | ✅ Desteklenir. |
| Daha eski `0.x` sürümleri | ❌ Desteklenmez; geriye taşıma yapılmaz. Lütfen güncelleyin. |
| Bir dalın uç kaydı ya da bir etiketin eski hâli | ❌ Desteklenmez. |

v1 çıktığında bu tablo yerini anlamsal sürüm kuralına bırakacaktır; bugün öyle bir söz
vermiyoruz, çünkü tutulamayacak bir söz güvenlik belgesinin yapabileceği en kötü hatadır.

## 3. Kapsam

**Kapsam içi:**

- `urun/cekirdek/` — motor, komut satırı ve MCP sunucusu.
- `urun/eklenti/` — VS Code eklentisi.
- `kanca/pre-commit` — işleme öncesi kapısı.

**Kapsam dışı:**

- kapalı ürün deposu — ayrı ve kapalı bir varlıktır, bu depodaki açık aracın parçası değildir.
- `arsiv/` — tarihsel analiz ve tasarım artefaktıdır, çalışan kod değildir.
- `ogreti/ornek/` altındaki **bilerek hatalı** örnek dosyalar. Denetimde sekiz dosya
  "bilerek-hatalı" olarak işaretlidir ve tanıları kasten atlanır; bunlar ders malzemesidir.
- Üçüncü taraf hizmetlerin kendi altyapısı. Aşağıda anlatılan isteğe bağlı köprünün
  konuştuğu dış model sağlayıcısındaki bir açık o sağlayıcıya bildirilir.

## 4. Sarmal yerelde koşar — ölçülmüş gerçek

Bu bölüm Sarmal'ın güvenlik avantajıdır ve **iddia değil, ölçümdür**; her satırın altında
depoda koşturulmuş bir tarama vardır.

**Motor tamamen yereldir.** Ayrıştırma, doğrulama, denetim, biçimlendirme, iskelet üretimi,
prizma ve MCP sunucusu yalnız yerel dosya sistemine dokunur. **Plan verisi makinenizden
çıkmaz.** MCP sunucusu ağ soketi değil standart girdi/çıktı üzerinden konuşur; yani onu
kullanan yapay zekâ ajanı bile veriyi sizin makinenizde okur.

**Çalışma zamanı bağımlılığı yoktur.** Ne motorun ne de eklentinin paket bildiriminde
`dependencies` alanı vardır; ikisinde de yalnız `devDependencies` bulunur. Bu, tedarik zinciri
yüzeyini pratikte sıfıra indirir: denetimi koşturmak için `npm install` bile gerekmez.

**Telemetri yoktur.** Motor ve eklenti kaynağında telemetri, analitik ya da hata toplama
kütüphanesi taraması sıfır sonuç verir.

### Tek istisna — isteğe bağlı etmen köprüsü

Dürüstlük gereği: motor kaynağında **tek bir dış uç adresi** vardır ve
`urun/cekirdek/src/kopru/nvidia.ts` dosyasında yaşar. Bu köprü bir dış dil modeli
sağlayıcısına canlı çağrı yapar ve **kapalıdır, açıkça açılması gerekir**:

- Yalnız `--gercek` bayrağı verildiğinde devreye girer. Bayrak yoksa yerinde bir demo
  yerlisi kullanılır ve hiçbir ağ çağrısı yapılmaz.
- Bir API anahtarı ister. Anahtar `NVIDIA_API_KEY` ortam değişkeninden ya da
  `urun/cekirdek/.env` dosyasından okunur; anahtar yoksa köprü açıklayıcı bir hatayla
  durur. `.env` dosyası `.gitignore` içindedir ve depoya girmez.
- **Açtığınızda ne gider:** ilgili Adımın bağlam konisi, yani o adımın görev, referans, kabul
  ve sınır metni, dış sağlayıcıya gönderilir. Bunu bilerek açarsınız.
- Hata mesajlarında anahtar redakte edilir, böylece API anahtarınız günlüklere ve terminal
  çıktısına sızmaz.
- Köprünün araç çağrıları bir izin kapısından geçer. Kapı **varsayılan-olarak-reddeder** ve
  arıza hâlinde de reddeder: bir araç beyanda yazılı değilse ya da izin matrisi verilmemişse
  çağrı kabul edilmez.

**Bir uyarı.** Köprüyü `--gercek` ile bir depo kökünde koşturmak, üretici tarafa o ağaç
üzerinde yazma izni vermek demektir. Gerçek koşuları tek kullanımlık bir dizinde yapın.

### İşleme öncesi kancasının günlükleri

Kanca çıktısını `/tmp/sarmal-kapi.log`, `/tmp/sarmal-kapi-test.log` ve
`/tmp/sarmal-kapi-test-ekl.log` dosyalarına yazar. Bu günlükler projenizin dosya yollarını ve
tanı metinlerini içerir. Paylaşılan bir makinede çalışıyorsanız bunu bilin.

## 5. Sarmal'ın kendi güvenlik ilkesi

Depoda anayasa rütbesinde bir güvenlik kuralı vardır (`yasa/genel_kurallar/guvenlik.sar`)
ve şunu söyler: güvenlik bilgisi **yalnız koruma için** üretilir. Sızma önleme, kimlik ve veri
izolasyonu üretilir; istismar aracı, saldırı yükü ve zarar verme yöntemi üretilmez. Bu kural
mühürlüdür ve motor her denetimde varlığını doğrular.

Aynı çizgi size de uzanır: bir açığı bildirirken çalışan bir istismar kodu göndermeniz
gerekmez. Yeniden üretme adımları yeter.

---
---

# 🇬🇧 English

## 1. If you found a vulnerability

**Do not open a public issue, do not start a discussion, and do not describe it in a commit
message.** Send the finding by email to the address in [Contact](#iletisim) above.

Your report will be assessed faster if it includes:

- The affected component — the engine (`urun/cekirdek/`), the VS Code extension
  (`urun/eklenti/`), or the pre-commit hook (`kanca/pre-commit`).
- Reproduction steps, ideally the smallest `.sar` file or the shortest command that shows it.
- Your Node version (`node --version`) and operating system.
- Your view of the impact — what data, what file, or what privilege becomes reachable.

We prefer coordinated disclosure: please hold the finding until a fix ships or 90 days pass
from your report, whichever comes first. This is not a demand but an honest statement of what
can reasonably be expected from a one-person team.

**There is no bounty programme.** We cannot offer monetary rewards. If you would like, we will
credit you by name when the finding is recorded. Research carried out in good faith, without
exfiltrating data and without disrupting anyone's work, will not be treated as hostile.

## 2. Supported versions

Sarmal has **not reached v1 yet**; version numbers are in the `0.x` range and the interface
can still change. Support is therefore tied to position rather than to a version number:

| What | Support |
|---|---|
| Engine and extension on the `main` branch | ✅ Supported. Security fixes land here. |
| The latest published version of the extension | ✅ Supported. |
| Older `0.x` versions | ❌ Not supported; there are no backports. Please update. |
| The tip of a feature branch, or an older tag | ❌ Not supported. |

When v1 ships, this table will be replaced by a semantic versioning policy. We are not
promising that today, because a promise that cannot be kept is the worst mistake a security
document can make.

## 3. Scope

**In scope:**

- `urun/cekirdek/` — the engine, the command line and the MCP server.
- `urun/eklenti/` — the VS Code extension.
- `kanca/pre-commit` — the pre-commit gate.

**Out of scope:**

- kapalı ürün deposu — a separate, closed entity that is not part of the open tool in this
  repository.
- `arsiv/` — historical analysis and design artefacts, not running code.
- The **deliberately broken** example files under `ogreti/ornek/`. Eight files are marked
  "intentionally faulty" and their diagnostics are skipped on purpose; they are teaching
  material.
- The infrastructure of third-party services. A vulnerability in the external model provider
  reached by the optional bridge described below belongs to that provider.

## 4. Sarmal runs locally — a measured fact

This section is Sarmal's security advantage, and it is **a measurement rather than a claim**;
every line below rests on a scan actually run against this repository.

**The engine is entirely local.** Parsing, validation, auditing, formatting, skeleton
generation, the prism outputs and the MCP server touch nothing but the local file system.
**Your plan data never leaves your machine.** The MCP server speaks over standard input and
output rather than a network socket, so even the AI agent using it reads your data on your own
machine.

**There are no runtime dependencies.** Neither the engine nor the extension declares a
`dependencies` field in its package manifest; both carry only `devDependencies`. That reduces
the supply-chain surface to practically nothing — you do not even need `npm install` to run
the audit.

**There is no telemetry.** Scanning the engine and extension sources for telemetry, analytics
or crash-reporting libraries returns zero results.

### The single exception — an optional agent bridge

For the sake of honesty: the engine source contains **exactly one outbound endpoint**, and it
lives in `urun/cekirdek/src/kopru/nvidia.ts`. This bridge makes a live call to an external
language model provider, and it is **off by default and must be turned on explicitly**:

- It engages only when the `--gercek` ("for real") flag is passed. Without that flag a local
  demo stand-in is used and no network call is made at all.
- It requires an API key, read from the `NVIDIA_API_KEY` environment variable or from
  `urun/cekirdek/.env`. Without a key the bridge stops with an explanatory error. That
  `.env` file is listed in `.gitignore` and never enters the repository.
- **What leaves your machine when you enable it:** the context cone of the step being run —
  its task, references, acceptance criteria and boundary text — is sent to the external
  provider. You turn this on knowingly.
- The API key is redacted from error messages, so it does not leak into logs or terminal
  output.
- Tool calls made through the bridge pass a permission gate that is **deny-by-default and
  fail-closed**: if a tool is not written into the declaration, or if no permission matrix is
  supplied, the call is refused.

**One warning.** Running the bridge with `--gercek` inside a repository root grants the
generating side write access to that tree. Do real runs in a throwaway directory.

### Logs written by the pre-commit hook

The hook writes its output to `/tmp/sarmal-kapi.log`, `/tmp/sarmal-kapi-test.log` and
`/tmp/sarmal-kapi-test-ekl.log`. Those logs contain your project's file paths and diagnostic
text. Keep that in mind on a shared machine.

## 5. Sarmal's own security principle

The repository carries a constitutional security rule
(`yasa/genel_kurallar/guvenlik.sar`) which states that security knowledge is produced
**for protection only**. Intrusion prevention, identity and data isolation are in; exploit
tooling, attack payloads and methods of causing harm are out. The rule is sealed, and the
engine verifies its presence on every audit.

The same line extends to you: to report a vulnerability you do not need to send working
exploit code. Reproduction steps are enough.
