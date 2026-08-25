# <img src="urun/eklenti/ikonlar/sarmal.svg" width="26" height="26" alt="Sarmal" valign="middle"> Katkı Rehberi · Contributing Guide

> **Bu dosya iki dillidir ve tek gövdedir.** Önce Türkçe bölüm gelir, hemen ardından
> İngilizce bölüm; ikisi aynı bilgiyi taşır. İki ayrı dosya tutulmaz, çünkü iki kaynaktan
> biri güncellenir öteki unutulur ve geride bayat bir kaynak kalır.
>
> **This document is bilingual and lives in a single file.** The Turkish section comes first,
> the English section follows, and both carry the same information. We do not keep two
> separate files, because when there are two sources one gets updated and the other is
> forgotten, leaving a stale copy behind.

---

# 🇹🇷 Türkçe 

## 1. Burada katkı yalnız kod değildir

Bu depo **Sarmal ile yönetilir.** Planın kendisi bir belge değil, denetlenen bir kaynaktır:
`.sar` dosyalarında yaşar ve motor onu diskteki gerçekle karşılaştırır. Bu yüzden buradaki
katkı iki parçalıdır — **yaptığınız iş** ve **o işin plandaki karşılığı.**

Pratikte bunun anlamı şudur: yeni bir kaynak dosyası eklerseniz plan tarafında onu ilan eden
bir düğüm de olmalıdır. Aksi hâlde motor o dosyayı `yetim-meyve` tanısıyla işaretler ve size
"kod plandan önde" der. Bu bir üslup tercihi değil, motorun her koşuda ölçtüğü bir kapıdır.

**Katkının kapısı denetimin sıfır hata vermesidir.** Motor hatayı `✖` ile, uyarıyı `⚠` ile
basar. Hata varsa katkı girmez.

## 2. Ön koşullar

Motorun **çalışma zamanı bağımlılığı yoktur.** Denetimi koşturmak için `npm install`
gerekmez; Node'un yerel TypeScript desteği yeterlidir.

| Gereken | Sürüm | Neden |
|---|---|---|
| Node.js | `>= 23.6` | Motor `.ts` kaynağını doğrudan koşar (tip-soyma). `urun/cekirdek/package.json` bunu `engines` alanında ilan eder. |
| npm | herhangi | Yalnız sınamalar ve tip denetimi için; motorun kendisi için değil. |

Kendi sürümünüzü doğrulayın:

```bash
node --version
```

## 3. Denetim kapısı — katkının asıl sınavı

Depo kökünden ya da çekirdek klasöründen koşturulur; ikisi de aynı ağacı denetler.

```bash
cd urun/cekirdek
node src/sarmal.ts denetle ..
```

Çıktı uzundur, çünkü motor bilgi satırlarını (`ℹ`) da basar. Okumanız gereken iki yer vardır:
**özet satırı** ve **karne satırı.**

Özet satırının iki biçimi vardır. Hata ya da uyarı varsa sayarak yazar:

```
── ÖZET: 0 hata · 1 uyarı ──
```

Hiç hata ve uyarı yoksa özet satırı yerine ağacın temiz olduğunu söyleyen satır gelir:

```
🟡 Yapı temiz (drift yok) AMA iş bitmedi — motor susmuyor.
```

İkincisi tam yeşildir; sarı nokta sapmayı değil, planda hâlâ açık Adım bulunduğunu anlatır ve
katkıyı engellemez. Karne satırı ise yapının sağlığını verir:

```
📋 Karne (ürün): 2152 düğüm · 489 Adım → 🟢 429 · 🟡 6 · 🔵 54 · ⛔ 0
```

Sayılar depo büyüdükçe değişir; bakacağınız yer sondaki **`⛔ 0`** hanesidir.

**Hata sayısı sıfır olmalıdır.** Uyarı katkıyı bloklamaz ama açıklanmayı hak eder;
birleştirme isteğinizde bıraktığınız uyarının neden bilinçli olduğunu yazın.

Hata ve uyarı satırlarını tek tek görmek isterseniz:

```bash
node src/sarmal.ts denetle .. 2>&1 | grep -E "^(✖|⚠)"
```

Betik içinde kullanacaksanız çıkış kodu daha güvenilirdir: motor hata varsa sıfırdan farklı,
temizse `0` döner.

```bash
node src/sarmal.ts denetle .. > /dev/null 2>&1; echo $?
```

İkinci varlık (kapalı ürün deposu) ayrı denetlenir ve açık araçtan bağımsızdır:

```bash
node src/sarmal.ts denetle ../../kapalı ürün
```

## 4. Sınamalar ve tip denetimi

Motora ya da eklentiye kod dokunduysanız üçünü de koşturun.

```bash
cd urun/cekirdek
npm test           # node --test "sinama/*.test.ts"
npm run tip-denetle # tsc --noEmit
```

Şu anda çekirdekte **899 sınama** vardır ve hepsi yeşildir. Kırmızı bir sınamayla katkı
gönderilmez; sahte yeşil tarihe girmez.

VS Code eklentisinin kendi derleme ve sınama komutları `urun/eklenti/package.json`
içindedir; eklentiye dokunuyorsanız `urun/eklenti/README.md` dosyasını okuyun.

## 5. İşleme öncesi kapı (git kancası) — kurun, atlamayın

Depoda gerçek bir işleme öncesi kancası vardır: **`kanca/pre-commit`**. Kanca
klasörü deponun içinde yaşar, `.git/hooks` altında değil; bu yüzden yeni bir kopyada
kendiliğinden etkin **olmaz** ve bir kez elle bağlanması gerekir:

```bash
git config core.hooksPath kanca
```

Kanca üç kapı işletir ve arıza-güvenlidir — Node ya da npm yoksa sizi kilitlemek yerine
sessizce atlar.

| # | Kapı | Ne yapar |
|---|---|---|
| ① | **Sapma denetimi** | `sarmal denetle .` koşar. Hata varsa işleme **bloklanır**; uyarı geçer. Sapma tarihe girmez. |
| ② | **Süit kapısı** | Yalnız `urun/cekirdek/{src,sinama}` ya da `urun/eklenti/{src,sinama}` altında `.ts` değişikliği hazırlandıysa ateşlenir ve ilgili `npm test` koşar. **Kırmızı süit işlemeyi bloklar.** Plan ve durum işlemeleri bu kapıda yavaşlamaz. |
| ③ | **Proje-özel kurallar** | `kanca/proje-kurallari.sh` varsa koşar. Bugün bu dosya **yoktur**; kapı bilerek ince tutulmuştur ve ileride doldurulacaktır. |

**Kancayı doğrulama-yok bayrağıyla atlamak yasaktır.** Kanca kendi çıktısında `--no-verify`
kaçışını gösterir, ama bu kaçış yalnız kancanın kendisinin arızalandığı hâl içindir; kırmızı
bir kapıyı susturmak için kullanılmaz.

## 6. Dal modeli — tek gövde

| Dal | Nedir |
|---|---|
| `main` | Tek kalıcı, kararlı gövde. **Doğrudan işleme yasaktır**; her şey daldan birleştirmeyle girer. |
| `<konu>` | Tek bir iş için açılan konu dalı. Bitince `main`'e birleşir ve **silinir**. |

Biten dal silinir, çünkü silinmeyen biten dal hayalet-işleme riskidir: birleşmiş sanılan bir
uç dalda unutulur ve kimse onu bir daha aramaz. Birleşmemiş işleme taşıyan bir dal
silinmeden önce `arsiv/<dal>` etiketiyle mühürlenir.

Geri dönüş noktaları açıklamalı etiketle konur (`geri/<konu>-<kapı>`); hafif etiket
kullanılmaz. Düzeltme için geri-al (`revert`) tercih edilir; sert sıfırlama ve zorla itme
yasaktır, çünkü denetim izi yalnız eklemeye açıktır.

## 7. İşleme disiplini

**İşleme atomiktir: bir işleme bir mantıksal değişikliktir.** Karışık sepet yasaktır — bir
düzeltme ile bir yeniden adlandırmayı aynı işlemeye koymayın, çünkü o işleme geri alınamaz
hâle gelir.

**Bütün işleme mesajları ve açıklamalar tam Türkçedir.** İngilizce sözcük geçmez; iç jargon
ve eski kod atfı geçmez.

Başlık biçimi `<tip>(<kapsam>): <özet>` şeklindedir. Özet emir ya da durum kipindedir,
en çok 72 karakterdir ve sonunda nokta yoktur.

Geçerli tipler: `özellik` · `düzeltme` · `düzenleme` · `belge` · `sınama` · `bakım` ·
`başarım` · `biçim`.

Kısa örnek:

```
belge(araç): katkı rehberini çift dilli tek dosya olarak ekle
```

Büyük bir işlemede gövde `Ne:` ve `Neden:` satırlarını taşır; gerekirse `Kapı:` (hangi
denetim geçti) ve `Kontrol noktası:` (hangi etiket kondu) eklenir:

```
özellik(araç): süit kapısını eklenti tarafına genişlet
Ne: İşleme öncesi kanca artık eklenti sınamalarını da koşuyor.
Neden: Eklenti kodu kırmızıyken işlemenin geçmesi sahte yeşil üretiyordu.
Kapı: denetle 0 hata · çekirdek süiti 899 yeşil.
```

Ortak-yazar satırı, iz satırı ve imza-altı **eklenmez** — ne işleme mesajına, ne
birleştirme isteği metnine.

## 8. Birleştirme isteği

Başlık `<dal>: <konu — kısa özet>` biçimindedir. Gövde dört bölümden oluşur:

```
## Ne
## Neden
## Kapı (kontrol)
## Geri-dönüş noktaları (etiketler)
```

`Kapı (kontrol)` bölümüne koşturduğunuz komutları ve gerçek çıktılarını yazın — özet satırı
ile sınama sayısı yeter. Koşturmadığınız bir komutu yazmayın.

Birleştirme kararı bu depoda tek yetkiyle verilir ve üretici ile denetleyen roller ayrıdır:
katkıyı siz gönderirsiniz, birleştirmeyi bakım sorumlusu onaylar. Kapı üç şart ölçer —
denetim sıfır hata, sınamalar yeşil, yazılı onay.

## 9. Ne değişmez

| Yer | Neden dokunulmaz |
|---|---|
| `yasa/` | Kurallar ve kararlar defteri. Bir kural ancak kendi süreciyle değişir, katkı içinde yan yol olarak değil. |
| kapalı ürün deposu | Ayrı bir varlıktır. Açık araç ile kapalı ürün arasında **çapraz bağımlılık yasaktır**; motorun `açık-gizli-sınır-ihlali` tanısı bunu ölçer. |
| `ogreti/ornek/uretilen/` | Yalnız çalışma zamanının yazdığı mat bölge; elle yazım sapmadır. |
| Üretilen yüz dosyaları | `SARMAL:BÖLGE` açılış ve kapanış yorum işaretleri arasındaki alan kaynaktan üretilir; elle düzenleme bir sonraki üretimde silinir. |

## 10. Öğrenmek için

Motor kendini öğretir. En hızlı giriş karşılama kartıdır ve kanondan üretildiği için
bayatlamaz:

```bash
node urun/cekirdek/src/sarmal.ts ogret
```

Yapay zekâ ajanıyla çalışıyorsanız aynı bilgi MCP sunucusundan gelir:

```bash
node urun/cekirdek/src/mcp.ts
```

Sunucu stdio üzerinden konuşur ve on yedi araç sunar (`ogret` · `denetle` · `kurallar` ·
`siniflama` · `gezin` · `graf` ve diğerleri).

Okuma haritası:

| İhtiyaç | Dosya |
|---|---|
| Kavramlar ve jargon | `KAVRAMLAR.md` |
| Ne yapıyoruz | `NEDIR.md` |
| Roller | `ROL-HARITASI.md` |
| Kurallar — tek yetkili yasa | `yasa/kanon/` (sekiz bölüm) |
| Değişmez çekirdek kural | `yasa/yonetisim/ebedi.sar` |
| Tip sistemi | `oz/siniflama/kayit.md` |
| Örnekler | `ogreti/ornek/OKU.md` |
| Şu an neredeyiz | `is/durum/durum_devir.sar` |
| Dal ve işleme yönetişiminin tam metni | `yasa/yonetisim/surum_yonetisimi.sar` |

## 11. İletişim ve davranış

Bu depoda geçerli iletişim adresi **tek bir yerde** yaşar: [`SECURITY.md` → İletişim](SECURITY.md#iletisim).
Adres oraya konmuştur ki değiştiğinde tek bir satır değişsin ve geride bayat bir kopya
kalmasın.

Katkı gönderen herkes [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) belgesine tâbidir. Bir
güvenlik açığı bulduysanız işleme ya da genel bir konu açmayın; [`SECURITY.md`](SECURITY.md)
dosyasındaki yolu izleyin.

---
---

# 🇬🇧 English

## 1. Here, a contribution is more than code

This repository **is governed by Sarmal.** The plan is not documentation — it is a checked
source. It lives in `.sar` files, and the engine compares it against what is actually on
disk. A contribution therefore has two parts: **the work you did** and **its counterpart in
the plan.**

In practice: if you add a source file, the plan must declare a node for it. Otherwise the
engine flags the file with a `yetim-meyve` ("orphan fruit") diagnostic and tells you the code
has run ahead of the plan. This is not a stylistic preference but a gate the engine measures
on every run. Note that the engine speaks Turkish: diagnostic identifiers and messages are
printed in Turkish, and this guide gives the identifiers exactly as you will see them.

**Zero errors from the audit is the gate for a contribution.** The engine prints errors with
`✖` and warnings with `⚠`. If there is an error, the contribution does not land.

## 2. Prerequisites

The engine has **no runtime dependencies.** You do not need `npm install` to run the audit;
Node's native TypeScript support is enough.

| Requirement | Version | Why |
|---|---|---|
| Node.js | `>= 23.6` | The engine runs its `.ts` sources directly via type stripping. Declared in the `engines` field of `urun/cekirdek/package.json`. |
| npm | any | Only for the test suite and the type check, never for the engine itself. |

Check your version:

```bash
node --version
```

## 3. The audit gate — the real exam

Run it from the repository root or from the core directory; both audit the same tree.

```bash
cd urun/cekirdek
node src/sarmal.ts denetle ..
```

The output is long, because the engine also prints informational lines (`ℹ`). There are two
places you need to read: the **summary line** and the **scorecard line**.

The summary line has two shapes. When there are errors or warnings, it counts them —
`hata` means error and `uyarı` means warning:

```
── ÖZET: 0 hata · 1 uyarı ──
```

When there are none at all, a line stating that the tree is clean takes its place:

```
🟡 Yapı temiz (drift yok) AMA iş bitmedi — motor susmuyor.
```

That second line means "structure is clean (no drift), but the work is not finished — the
engine will not go quiet." It is fully green: the yellow dot marks open steps still left in
the plan, not drift, and it does not block your contribution. The scorecard line reports the
health of the structure:

```
📋 Karne (ürün): 2152 düğüm · 489 Adım → 🟢 429 · 🟡 6 · 🔵 54 · ⛔ 0
```

The numbers move as the repository grows; the figure to watch is the trailing **`⛔ 0`**.

**The error count must be zero.** Warnings do not block a contribution, but they deserve an
explanation: if you leave one behind, say in your pull request why it is deliberate.

To list the error and warning lines one by one:

```bash
node src/sarmal.ts denetle .. 2>&1 | grep -E "^(✖|⚠)"
```

Inside a script the exit code is the more reliable signal: the engine returns non-zero when
there are errors and `0` when the tree is clean.

```bash
node src/sarmal.ts denetle .. > /dev/null 2>&1; echo $?
```

The second entity (kapalı ürün deposu) is audited separately and stays independent of the open
tool:

```bash
node src/sarmal.ts denetle ../../kapalı ürün
```

## 4. Tests and type checking

If you touched engine or extension code, run all three.

```bash
cd urun/cekirdek
npm test            # node --test "sinama/*.test.ts"
npm run tip-denetle # tsc --noEmit
```

The core currently has **899 tests** and all of them pass. Do not send a contribution with a
red test; a false green must never enter the history.

The VS Code extension has its own build and test scripts in `urun/eklenti/package.json`.
If you are working on the extension, read `urun/eklenti/README.md` first.

## 5. The pre-commit gate — install it, never skip it

The repository ships a real pre-commit hook: **`kanca/pre-commit`**. The hook
directory lives inside the repository rather than under `.git/hooks`, so it is **not** active
in a fresh clone and has to be wired up once:

```bash
git config core.hooksPath kanca
```

The hook runs three gates and is fail-safe — if Node or npm is missing it steps aside quietly
instead of locking you out.

| # | Gate | What it does |
|---|---|---|
| ① | **Drift audit** | Runs `sarmal denetle .`. Any error **blocks** the commit; warnings pass. Drift never enters the history. |
| ② | **Test suite gate** | Fires only when the staged changes include `.ts` files under `urun/cekirdek/{src,sinama}` or `urun/eklenti/{src,sinama}`, and runs the matching `npm test`. **A red suite blocks the commit.** Plan and status commits are not slowed down by this gate. |
| ③ | **Project-specific rules** | Runs `kanca/proje-kurallari.sh` if it exists. That file **does not exist today**; the gate is deliberately kept thin and will be filled in later. |

**Bypassing the hook with a no-verify flag is not allowed.** The hook prints the `--no-verify`
escape in its own output, but that escape exists for the case where the hook itself
malfunctions — never to silence a gate that went red.

## 6. Branch model — single trunk

| Branch | What it is |
|---|---|
| `main` | The one permanent, stable trunk. **Committing directly to it is forbidden**; everything arrives by merging a branch. |
| `<topic>` | A topic branch opened for a single piece of work. Once finished it merges into `main` and is **deleted**. |

A finished branch is deleted because an undeleted one is a ghost-commit risk: a tip everyone
assumed was merged sits forgotten on a branch nobody looks at again. A branch that still
carries unmerged commits is sealed with an `arsiv/<branch>` tag before deletion.

Rollback points are marked with annotated tags (`geri/<topic>-<gate>`); lightweight tags
are not used. Prefer `revert` for fixes — hard reset and force push are forbidden, because
the audit trail is append-only.

## 7. Commit discipline

**Commits are atomic: one commit is one logical change.** No mixed baskets — do not put a fix
and a rename in the same commit, because that commit can no longer be reverted cleanly.

**All commit messages and descriptions are written in full Turkish.** No English words, no
internal jargon, no references to retired identifiers. If you do not write Turkish, say so in
your pull request and a maintainer will help you word the message.

The subject line follows `<type>(<scope>): <summary>`. The summary is imperative or
descriptive, at most 72 characters, with no trailing period.

The valid types, with their meanings: `özellik` (feature) · `düzeltme` (fix) · `düzenleme`
(refactor) · `belge` (docs) · `sınama` (test) · `bakım` (chore) · `başarım` (performance) ·
`biçim` (formatting).

A short example:

```
belge(araç): katkı rehberini çift dilli tek dosya olarak ekle
```

For a larger change the body carries `Ne:` (what) and `Neden:` (why) lines, plus `Kapı:`
(which gate passed) and `Kontrol noktası:` (which tag was placed) when relevant:

```
özellik(araç): süit kapısını eklenti tarafına genişlet
Ne: İşleme öncesi kanca artık eklenti sınamalarını da koşuyor.
Neden: Eklenti kodu kırmızıyken işlemenin geçmesi sahte yeşil üretiyordu.
Kapı: denetle 0 hata · çekirdek süiti 899 yeşil.
```

Co-author lines, tool trailers and sign-off footers are **not added** — neither to commit
messages nor to pull request descriptions.

## 8. Pull requests

The title follows `<branch>: <topic — short summary>`. The body has four sections:

```
## Ne          (what)
## Neden       (why)
## Kapı (kontrol)                    (gate / checks)
## Geri-dönüş noktaları (etiketler)  (rollback points / tags)
```

In the gate section, list the commands you actually ran and their real output — the summary
line and the test count are enough. Never list a command you did not run.

Merges are approved by a single authority in this repository, and the author and reviewer
roles are kept separate: you send the contribution, a maintainer approves the merge. The gate
measures three conditions — zero audit errors, green tests, and written approval.

## 9. What never changes

| Location | Why it is off limits |
|---|---|
| `yasa/` | The rules and decisions ledger. A rule changes through its own process, never as a side road inside a contribution. |
| kapalı ürün deposu | A separate entity. **Cross-dependency between the open tool and the closed product is forbidden**, and the engine's `açık-gizli-sınır-ihlali` (open/closed boundary violation) diagnostic measures it. |
| `ogreti/ornek/uretilen/` | A matte zone written only by the runtime; editing it by hand is drift. |
| Generated surfaces | Anything between the `SARMAL:BÖLGE` opening and closing comment markers is produced from source; hand edits are wiped on the next generation. |

## 10. Learning your way around

The engine teaches itself. The fastest entry point is the welcome card, which is generated
from the canon and therefore never goes stale:

```bash
node urun/cekirdek/src/sarmal.ts ogret
```

If you work with an AI agent, the same knowledge is served over MCP:

```bash
node urun/cekirdek/src/mcp.ts
```

The server speaks over stdio and exposes seventeen tools (`ogret` · `denetle` · `kurallar` ·
`siniflama` · `gezin` · `graf` and others).

Reading map:

| What you need | File |
|---|---|
| Concepts and jargon | `KAVRAMLAR.md` |
| What this project is | `NEDIR.md` |
| Roles | `ROL-HARITASI.md` |
| Rules — the single authoritative law | `yasa/kanon/` (eight chapters) |
| Immutable core rule | `yasa/yonetisim/ebedi.sar` |
| Type system | `oz/siniflama/kayit.md` |
| Examples | `ogreti/ornek/OKU.md` |
| Where we stand today | `is/durum/durum_devir.sar` |
| Full text of branch and commit governance | `yasa/yonetisim/surum_yonetisimi.sar` |

These sources are written in Turkish. English translation of the teaching surface and of the
diagnostic messages is planned work, not finished work — please do not expect it yet.

## 11. Contact and conduct

The contact address for this repository lives in **exactly one place**:
[`SECURITY.md` → Contact](SECURITY.md#iletisim). It is kept there so that when it changes,
a single line changes and no stale copy is left behind.

Everyone who contributes is bound by [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). If you found
a security vulnerability, do not open a public issue or commit — follow the path described in
[`SECURITY.md`](SECURITY.md).
