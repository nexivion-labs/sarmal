# 📬 Onay akışı — bağımsız denetim raporu

**Denetçi:** bağımsız denetim ajanı · **Tarih:** 2026-07-29 · **Sürüm:** eklenti 0.9.128
**Yasak uyuldu:** hiçbir kaynak dosya değiştirilmedi, hiçbir git komutu koşturulmadı.

---

## 0. Yöntem ve ölçüm zemini

Bu turda hiçbir iddia okuma tahmini üstüne kurulmadı. İki ayrı ölçüm aracı kullanıldı.

**Birinci araç — depo nöbetleri.** `cd _Sarmal/eklenti && npm test` koşturuldu:
**275 nöbetin 275'i geçti, hiçbiri kırmızı değil.** Yani bugünkü kusurların hiçbiri
birim süitinden görünmüyor; süit sağlam olduğu hâlde akış çalışmıyor. Bu tek başına
bir bulgudur ve raporun sonunda ayrıca söylenir.

**İkinci araç — gerçek VS Code kabuğunda yedi ayrı prob.** Depoya tek bir dosya bile
eklemeden, `@vscode/test-electron` sürücüsü kendi geçici çalışma alanlarımla ayrı
ayrı koşturuldu (`extensionDevelopmentPath` gerçek eklenti kökü, `extensionTestsPath`
benim geçici klasörüm). Prob 2, 6 ve 7'de panel satırları **gerçek liste komutlarıyla
tıklandı** (`list.focusFirst` · `list.focusDown` · `list.select`), yani ölçülen şey
sahte bir sağlayıcı değil, kullanıcının gördüğü ağacın kendisidir.

**Üçüncü araç — VS Code 1.130.0'ın kendi kaynağı.** `getParent`, ağaç öğesi kimliği ve
tazeleme davranışı hakkındaki iddialar `.vscode-test/vscode-darwin-1.130.0/…/out/vs/workbench/api/node/extensionHostProcess.js`
paketindeki `ExtHostTreeView` gövdesinden okundu; tahmin edilmedi.

**Ana hüküm.** Founder'ın "düzgün çalışmıyor" cümlesi **yazma kusuru değildir**;
yazma yolu çalışıyor ve bugün sekiz kapı gerçekten karara bağlanmış. Kusur, kararın
*etrafındaki* her şeydedir: karar verirken dosyanın tamamı yeniden biçimleniyor,
kaydedilmemiş kullanıcı işi zorla diske iniyor, panelde açtığın satır elinin altında
kapanıyor ve panelin kendi metinleri artık olmayan bir davranışı vadediyor.

---

## KUSUR 1 — Karar yazımı, dosya editörde açıkken belgenin TAMAMINI yeniden biçimliyor

**① Hüküm.** Tek bir alan eklemesi olması gereken karar yazımı, dosya bir editörde
açıksa `doc.save()` üzerinden kaydetmede-biçimle katılımcısını tetikliyor ve belgenin
tamamı yeniden yazılıyor.

**② Yer.**
- `_Sarmal/eklenti/src/onay-kuyrugu.ts:277` — `await doc.save();`
- `_Sarmal/eklenti/package.json:191-193` — `configurationDefaults` → `"[sarmal]": { "editor.formatOnSave": true }`
- `_Sarmal/eklenti/src/bicimlendir.ts:16-20` — biçimlendirici belgenin **tamamını** tek `TextEdit.replace` ile değiştirir
- `_Sarmal/eklenti/src/posta-kutusu.ts:227` — "Kapıya git" satırı editörü açan taraftır

**③ Somut başarısızlık senaryosu.** Founder Posta Kutusunda kapıyı açar, önce
"Kapıya git — Adımı dosyada aç" satırına tıklar (panel bunu ilk seçenek olarak
sunuyor, yani önerilen yol budur), dosya editörde açılır. Sonra aynı kapının altındaki
"Onayla" satırına tıklar. Karar yazılır, `doc.save()` koşar, dosya artık editörde açık
olduğu için kaydetmede-biçimle katılımcısı devreye girer ve Sarmal biçimlendiricisi
belgenin bütün girintilerini yeniden hizalar. Founder tek alan eklediğini sanır,
`git diff` kırk altı satır gösterir.

**④ Ölçüm.** Aynı oturumda kontrol ve deney (prob 5):

| Koşul | Değişen satır |
|---|---|
| Dosya editörde **kapalı** → doğrudan "Onayla" | **1** |
| Önce "Kapıya git" (editör açılır) → sonra "Onayla" | **9** (on satırın dokuzu) |

Biçimlendiricinin gerçekten yeniden hizaladığı, çekirdek `bicimle()` işlevi aynı
hizasız kaynak üstünde ayrıca koşturularak doğrulandı: `DEĞİŞTİ Mİ: true`, bütün
girintiler kanonik hâline çekildi. Ayrıca prob 5'te `editor.formatOnSave` değeri
`sarmal` dili için `true` okundu — bu değeri kullanıcı değil, **eklentinin kendi
paket bildirimi** koyuyor.

**Bu, koordinatörün sorduğu "bilinçli mi, yan etki mi" sorusunun cevabıdır:
YAN ETKİDİR.** `kaydiIsle` hiçbir yerde biçimlendiriciyi çağırmıyor; biçimlendirme,
eklentinin kendi ilan ettiği `formatOnSave` varsayılanı ile karar yazıcısının
`doc.save()` çağrısının kesişmesinden doğuyor. Bilinçli olmadığı için de kimse onu
hesaba katmamış: satır numaraları kayıyor (bkz. Kusur 3) ve fark penceresi okunamaz
hâle geliyor.

**⑤ Ağırlık.** ÇOK AĞIR. Hem kullanıcı güvenini kıran gürültünün, hem de Kusur 3'ün
gerçek hayatta tetiklenmesinin kaynağı budur.

**⑥ Önerilen onarım (özet).** Karar yazımı `doc.save()` çağırmasın; `WorkspaceEdit`
uygulandıktan sonra kaydetmeyi çalışma alanının kendi kaydetme düzenine bırak (bu
depoda zaten `files.autoSave: afterDelay` açıktır, dosya bir saniye içinde kendiliğinden
iner). Kaydetmek şartsa `TextDocument.save()` yerine biçimlendirme katılımcısını
tetiklemeyen bir yol seçilmeli. Karar yazıcısının yan etkisi olarak belge biçimlemek
her hâlükârda kapatılmalıdır: karar yazmak biçim işi değildir.

---

## KUSUR 2 — Karar, o dosyadaki KAYDEDİLMEMİŞ kullanıcı düzenlemesini zorla diske indiriyor

**① Hüküm.** Bir kapıya karar vermek, aynı dosyada kullanıcının henüz kaydetmediği
bütün düzenlemeleri de sessizce diske yazıyor.

**② Yer.** `_Sarmal/eklenti/src/onay-kuyrugu.ts:277` — `await doc.save();`
(`postaKararVer` yolunda belge `openTextDocument` ile alınır: `onay-kuyrugu.ts:461`).

**③ Somut başarısızlık senaryosu.** Founder bir plan dosyasında deneme amaçlı bir
kaç satır yazmış, henüz kaydetmemiştir — kaydetmemesi bilinçlidir, çünkü beğenmezse
geri alacaktır. Sonra Posta Kutusuna geçip **başka bir kapıya** karar verir. Karar
aynı dosyadaysa `doc.save()` koşar ve kullanıcının denemesi de diske iner. Kullanıcı
hiçbir yerde "bu dosyayı kaydediyorum" uyarısı görmez.

**④ Ölçüm (prob 4, T2).** Belgeye kaydedilmemiş bir satır enjekte edildi, sonra o
dosyadaki kapıya karar verildi:

```
karar ÖNCESİ  · belge kirli mi: true  · diskte kullanıcı satırı var mı: false
karar SONRASI · belge kirli mi: false · diskte kullanıcı satırı var mı: true
```

Yani karar, kullanıcının istemediği bir kaydetmeyi gerçekleştirdi. Ölçüm kesindir.

**⑤ Ağırlık.** AĞIR — veri bütünlüğü sınıfı. Kusur 1 ile aynı satırdan doğar, ama
ayrı bir zarar üretir ve ayrı sayılmalıdır.

**⑥ Önerilen onarım (özet).** Kusur 1'in onarımı bunu da kapatır. Kaydetme kaldırılmıyorsa
en azından `doc.isDirty` ölçülmeli ve kirli belgede karar yazımı kullanıcıya
"bu dosyada kaydedilmemiş değişikliklerin var, karar onları da kaydedecek" diye
sorulmalıdır.

---

## KUSUR 3 — `kaydiIsle` kapıyı ÖNCE SATIRA göre arıyor; yanlış kapıya karar yazılabiliyor

**① Hüküm.** Karar yazıcısı kapıyı önce satır numarasıyla, kodu hiç denetlemeden
buluyor; satır kaymışsa karar **başka bir kapıya** yazılıyor.

**② Yer.** `_Sarmal/eklenti/src/onay-kuyrugu.ts:259`

```ts
const n = noktalar.find((x) => x.satir === satir) ?? (kod ? noktalar.find((x) => x.kod === kod) : undefined);
```

Kardeş işlev bunu **doğru** yapıyor ve fark tam olarak buradadır
(`onay-kuyrugu.ts:496-497`):

```ts
const n = noktalar.find((x) => x.satir === satir && x.kod === kod)
  ?? noktalar.find((x) => x.kod === kod);
```

**③ Somut başarısızlık senaryosu.** Aynı dosyada iki kapı vardır. Founder birinciye
karar verir; Kusur 1 yüzünden dosyanın tamamı yeniden biçimlenir ve satır numaraları
kayar. Panelin elindeki ikinci kapı kaydı bir an için bayattır. Founder ikinci kapının
"Onayla" satırına tıklar. `kaydiIsle` **kodu hiç bakmadan** bayat satırda ne varsa onu
kapı sayar ve kararı yanlış Adıma yazar. Kullanıcıya çıkan bildirim de yanlış kodu
söyler, dolayısıyla kullanıcı sonradan aradığında hangi kapının nasıl karara
bağlandığını çözemez.

**④ Ölçüm (prob 1, P4).** İki kapılı bir dosyada, `PRB-A01` kodu **`PRB-A02`'nin
satırıyla** çağrıldı:

```
A01 satırı (3): Adım( kod: PRB-A01, durum: beklemede, ne: "birinci kapı",
A02 satırı (5): Adım( kod: PRB-A02, durum: beklemede, onay: "onaylandı — 2026-07-29", ne: "ikinci kapı",
```

Karar **A02'ye** yazıldı. Talep edilen kapı A01'di. Ölçüm kesindir.

**⑤ Ağırlık.** AĞIR. Tek başına dar bir yarış penceresidir; Kusur 1 ile birlikte
gerçek hayatta ulaşılabilir hâle gelir.

**⑥ Önerilen onarım (özet).** `kaydiIsle` aramasını `postaKapisiAc` ile aynı sözleşmeye
çek: önce `satir && kod` birlikte, sonra yalnız `kod`. Yalnız satırla eşleşme hiçbir
zaman kabul edilmemeli — kod verilmişse kod bağlayıcıdır.

---

## KUSUR 4 — Panel tazelendiği anda açık kapı satırı kapanıyor; kullanıcının tıklaması boşa düşüyor

**① Hüküm.** Posta Kutusu ağacı tazelendiğinde kullanıcının az önce açtığı kapı
satırı kapanıyor (ya da liste odağı kayboluyor); sonraki tıklama karar satırına değil
hiçbir şeye gidiyor.

**② Yer.**
- `_Sarmal/eklenti/src/posta-kutusu.ts:128-132` — `cizdir()` → `this.degisti.fire()` (öğe belirtmeyen **tam** tazeleme)
- `_Sarmal/eklenti/src/posta-kutusu.ts:199-200` — kapı satırı her çizimde yeniden `Collapsed` doğuyor
- `_Sarmal/eklenti/src/posta-kutusu.ts:156-163` — `getChildren` hiçbir satıra `TreeItem.id` vermiyor
- Tetikleyiciler: `onay-kuyrugu.ts:526-535` (etkin editör · kaydetme · yazma · disk izleyicisi) ve `onay-kuyrugu.ts:519` (ana tanı turu)

**③ Somut başarısızlık senaryosu.** Founder bir kapı satırına tıklar, altında dört
karar satırı açılır. Tam o sırada arka planda bir `.sar` dosyası kaydedilir — bu
çalışma alanında `files.autoSave: afterDelay` **1000 ms** ile açıktır
(`.vscode/settings.json`), ayrıca ajanlar sürekli `.sar` yazar. Defterin parmak izi
değişir, `degisti.fire()` atar, ağaç baştan çizilir ve açık satır kapanır. Founder
"Onayla"nın olması gereken yere tıklar; orada artık başka bir satır vardır ya da
hiçbir şey olmaz. Kullanıcı gözünde bu tam olarak "tıklıyorum, bir şey olmuyor"dur.

**④ Ölçüm — kontrol ve deney, gezinme dizisi BİREBİR aynı.**

*Kontrol (prob 2, arada tazeleme yok):*
```
③ list.select (kapı satırını AÇ)              → aktif editör: (editör yok)
④ list.focusDown (1. karar satırı)            → aktif editör: (editör yok)
⑤ list.select (Kapıya git)                    → aktif editör: kapi.sar     ✅ satır AÇIK kalmış
⑦ list.select (ONAYLA)                        → dosyada onay var mı: true  ✅ akış tamamlandı
```

*Deney (prob 7, yalnız fark: genişletmeden sonra bir tazeleme sokuldu):*
```
kapı satırı açıldı
TAZELEME oldu · kapı: 2
list.focusDown + list.select                  → aktif editör: (editör yok) ⛔ satır kaybolmuş
```

Aynı komut dizisi, tek fark tazeleme. Kontrolde akış tamamlanıyor, deneyde hiçbir şey
olmuyor.

*Kesin olmayan kısım:* İç mekanizmanın "satır kapandı" mı yoksa "liste odağı kayboldu"
mu olduğunu ayıramadım; ikisi de aynı kullanıcı sonucunu verir. VS Code 1.130.0
kaynağında öğe tutamağı `TreeItem.id` varsa ondan, yoksa `${ata}/${sıra}:${etiket}`
biçiminde üretiliyor (`_createHandle`, `extensionHostProcess.js`); yani `id` verilmediği
sürece tutamak **kardeş sırasına** bağlıdır ve bir kapı listeden düştüğünde geri kalan
bütün satırların tutamağı kayar. Onarım her iki mekanizmayı da kapatır.

**⑤ Ağırlık.** AĞIR. Founder'ın "beni uğraştırma" cümlesinin en olası doğrudan karşılığı
budur: her karar için satırı yeniden açmak, üstelik neden kapandığını anlamadan.

**⑥ Önerilen onarım (özet).** Üç şey birlikte: ① her satıra kararlı bir `TreeItem.id`
ver (dosya yolu + kapı kodu + seçenek damgası), böylece tutamak kardeş sırasından
bağımsızlaşır; ② `cizdir()` tam tazeleme yerine değişen **dosya öğesini** ateşlesin
(`degisti.fire(dosyaOgesi)`), bütün ağaç yeniden kurulmasın; ③ hangi kapının açık
olduğunu sağlayıcı kendi içinde tutsun ve `getTreeItem` o kapı için `Expanded` dönsün —
açıklık kullanıcının değil, modelin durumu olsun.

---

## KUSUR 5 — Panelin kendi metinleri artık OLMAYAN bir davranışı vadediyor

**① Hüküm.** Kapı satırının ipucu ve panelin boş-durum cümlesi hâlâ "tıklayınca satıra
gidilir, sonra kararın sorulur" diyor; oysa tıklama artık yalnız bir alt liste açıyor
ve karar satırlarının hiç ipucu yok.

**② Yer.**
- `_Sarmal/eklenti/src/yuzey-metinleri.ts:84-89` — boş-durum: *"Bir kapı düştüğünde satırın üzerine tıkla: önce kapının bulunduğu satıra gidilir, sonra kararın sorulur…"*
- `_Sarmal/eklenti/src/yuzey-metinleri.ts` · `postaKapiIpucu` son satırı — *"Tıklayınca önce bu satıra gidilir, sonra kararın sorulur: onayla, şerhle onayla ya da reddet."*
- `_Sarmal/eklenti/src/yuzey-metinleri.ts` · `KAPIYA_GIT_BASLIGI = "Kapıya git ve kararını ver"` — bu satır karar sormaz, yalnız dosyayı açar
- `_Sarmal/eklenti/src/posta-kutusu.ts:213-230` — `kararSatiri` hiç `tooltip` kurmuyor
- `_Sarmal/eklenti/src/yuzey-metinleri.ts` · `etkinKararGovdesi` — *"kararını alttaki düğmeyle ver"* diyor; o düğmeler çizilmeyen Comments yüzeyindedir (bkz. Kusur 6)

**③ Somut başarısızlık senaryosu.** Founder kapı satırının üstüne gelir, ipucunu okur:
"tıklayınca kararın sorulur". Tıklar. Karar sorulmaz; altında dört satır açılır ve o
satırların hiçbirinin ipucu yoktur. Kullanıcı sözü tutulmamış bir arayüzle karşılaşır
ve doğal hükmü "bu çalışmıyor" olur. Kusur burada teknik değil, **sözleşme
kusurudur**: yüzey kendi davranışını yanlış anlatıyor.

**④ Ölçüm.** Metinler kaynaktan birebir okundu; panelin gerçek davranışı prob 2'de
ölçüldü (tıklama satırı açıyor, karar sormuyor). İki gerçek uyuşmuyor.

**⑤ Ağırlık.** AĞIR. Yazılan kod doğru çalışsa bile kullanıcı yanlış beklentiyle
geldiği için "bozuk" hükmünü verir; bugünün asıl şikâyetinin en ucuz açıklaması budur.

**⑥ Önerilen onarım (özet).** Üç metin yeni gerçeğe çekilmeli: boş-durum cümlesi
"satırı aç, altındaki karar satırlarından birini seç" demeli; `postaKapiIpucu` son
satırı aynı şeyi söylemeli; her karar satırına ne yapacağını ve kararın nereye
yazılacağını anlatan bir ipucu konmalı. Metin ile davranışın aynı turda değişmesi
kural hâline getirilmeli — bu depoda metinler zaten tek katalogda yaşıyor, dolayısıyla
maliyeti düşüktür.

---

## KUSUR 6 — "Kapıya git" hâlâ çizilmeyen karar penceresini kuruyor

**① Hüküm.** Panel içi karara geçildiği hâlde "Kapıya git" satırı, bilinerek terk
edilen Comments karar yüzeyini yaratmaya devam ediyor; kullanıcı dosyaya gidiyor ve
orada boşluk buluyor.

**② Yer.** `_Sarmal/eklenti/src/posta-kutusu.ts:227` → `sarmal.postaKapisiAc` →
`_Sarmal/eklenti/src/onay-kuyrugu.ts:509` — `await etkinKarariAc(doc, n);`

**③ Somut başarısızlık senaryosu.** Founder "Kapıya git — Adımı dosyada aç" satırına
tıklar. Dosya açılır, imleç kapının satırına gider ve arka planda görünmeyen bir
Comments penceresi kurulur. Kullanıcı dosyada karar arayışına girer; satırın üstündeki
kod merceği ona "karar ver" der (`onay-kuyrugu.ts:417`), tıklar, gene görünmeyen bir
pencere kurulur. Kullanıcı iki kez tıklayıp hiçbir şey görmemiş olur ve panele geri
dönmesi gerektiğini kendiliğinden bilemez.

**④ Ölçüm (prob 5, B).** "Kapıya git" çağrısından hemen sonra:
`canlı yüzey: 1`. Yani çizilmediği bilinen yüzey gerçekten yaratılıyor. Karar
yazıldıktan sonra elden çıkarılıyor (`yaratilanYuzey: 1 · eldenCikarilanYuzey: 1`),
yani sızıntı yok — kusur sızıntı değil, **kullanıcıyı ölü bir yüzeye göndermek**.

**⑤ Ağırlık.** ORTA-AĞIR.

**⑥ Önerilen onarım (özet).** "Kapıya git" yalnız dosyayı açsın ve satıra gitsin;
`etkinKarariAc` çağrısı bu yoldan kaldırılsın. Kod merceğinin başlığı da karar vaat
etmek yerine "📬 bu kapı Posta Kutusunda kararını bekliyor" deyip paneli açmalıdır.
Comments yolu tümüyle emekliye ayrılacaksa bu, ayrı ve bilinçli bir karar olarak
verilmelidir; bugünkü hâl iki yolun yarısıdır.

---

## KUSUR 7 — Tırnaklı `durum:` değeri olan bir kapıya karar verilirse DOSYA BOZULUYOR

**① Hüküm.** `onay:` kaydının ekleneceği sütun, tırnaklı değerlerde tırnağın kendisini
saydığı için yanlış hesaplanıyor ve kayıt dizginin **içine** yazılıyor.

**② Yer.** `_Sarmal/eklenti/src/onay-cekirdek.ts:49`

```ts
durumSutun: durum.deger.sutun - 1 + (durum.deger.metin?.length ?? 0),
```

Belirteç, metin belirtecinin sütununu **açılış tırnağında** verir
(`_Sarmal/cekirdek/src/belirtec.ts:258`, sütun `bsSutun`), `metin` ise tırnaksız
içeriktir. İkisi toplanınca ekleme noktası dizginin son karakterinin önüne düşer.
Aynı desen `src/takdir.ts:71` satırında da vardır.

**③ Somut başarısızlık senaryosu.** Biri elle `durum: "beklemede"` yazar (kanon bunu
yasaklamaz; kapı toplayıcı da bu değeri kabul eder, çünkü `deger.metin` tırnaksız
karşılaştırılır). O kapıya karar verilir ve satır bozulur; dosya artık ayrışmaz,
bütün tanılar ve panel kayıtları o dosya için susar.

**④ Ölçüm (prob 1, P3).** `durum: "beklemede"` ile yazılmış bir kapıya karar verildi.
Sonuç satırı:

```
Adım( kod: PRB-TRN, durum: "beklemed, onay: "onaylandı — 2026-07-29"e", ne: "prob kapısı",
```

Ölçüm kesindir. **Bugünkü ağaçta ulaşılabilir değildir:** çalışma alanı genelinde
`durum: "` deseni `.sar` dosyalarında Adım durumu olarak **hiç** geçmiyor (iki eşleşme
var, ikisi de düzyazı/örnek metin). Yani bu bugün patlamıyor, ama patladığında
onarımı zor bir hasar bırakıyor.

**⑤ Ağırlık.** ORTA (gizli kusur, yıkıcı sonuç).

**⑥ Önerilen onarım (özet).** Ekleme noktasını sütun aritmetiğiyle değil, `deger-yaz.ts`
içindeki tırnak-farkında mantıkla hesapla — `satirdaDegerDegistir` zaten hem tırnaklı
hem çıplak değeri doğru tanıyor ve sınır bulunamazsa `null` dönüp çağıranı durduruyor.
Aynı fail-safe onay yazıcısında da olmalı: sınır ölçülemiyorsa **dokunma ve söyle**.

---

## KUSUR 8 — İlk karşılaşma: bu akış hiçbir yerde anlatılmıyor

**① Hüküm.** Eklentiyi ilk kuran biri Posta Kutusunu ve panel içi karar akışını
kendiliğinden keşfedemez; ne rehberde, ne BENİOKU'da, ne sağ tık menüsünde bir iz var.

**② Yer.**
- `_Sarmal/eklenti/README.md` — "posta" ve "onay" kelimeleri **hiç geçmiyor** (ölçüldü: sıfır eşleşme)
- `_Sarmal/eklenti/package.json:497-561` — `walkthroughs` altı adım anlatıyor, hiçbiri Posta Kutusu değil
- `_Sarmal/eklenti/package.json:428-434` — `view/item/context` yalnız Yol Haritası için tanımlı; `sarmalPostaKapisi` ve `sarmalPostaKarar` bağlam değerleri kod tarafında kuruluyor (`posta-kutusu.ts:208,218`) ama karşılığında **hiçbir menü girdisi yok**, yani satıra sağ tıklamak boş menü açıyor
- `viewsWelcome` katkısı yok; boş panel cümlesi yalnız `TreeView.message` üstünden veriliyor (`posta-kutusu.ts:137`)

**③ Somut başarısızlık senaryosu.** Yeni kullanıcı etkinlik çubuğunda Sarmal simgesini
görür, Posta Kutusunu açar, kuyruk boşsa yalnız bir paragraf okur — ve o paragraf da
Kusur 5 yüzünden yanlış davranışı anlatır. Kuyruk doluysa satırlara sağ tıklar, boş
menüyle karşılaşır. Karar satırlarının varlığını ancak satırı açmayı deneyerek
öğrenebilir; hiçbir yerde "satırı aç" denmiyor.

**④ Ölçüm.** Metin taramaları yukarıda; `sarmal.postaKararVer` ve `sarmal.postaKapisiAc`
komutlarının paket bildiriminde ilan edilmediği gerçek kabukta doğrulandı (aşağıda,
"çürüttüklerim" bölümü). Yani bu iki komut komut paletinden de bulunamaz — ki bulunmaları
zaten doğru değildir, çünkü bağımsız argüman isterler.

**⑤ Ağırlık.** ORTA.

**⑥ Önerilen onarım (özet).** ① Rehbere yedinci bir adım: "📬 Posta Kutusu — Founder
kararı burada verilir". ② `viewsWelcome` ile boş panelde tıklanabilir bir "Posta
Kutusu nasıl çalışır" bağlantısı. ③ `view/item/context` altına kapı satırı için
"Kapıya git" ve üç karar girdisi — sağ tık, satırı açmadan karar vermenin ikinci yolu
olur. ④ BENİOKU'ya kısa bir bölüm.

---

## KUSUR 9 — Not kutusunu iptal etmek tamamen sessiz

**① Hüküm.** "Şerhle onayla" ya da "Reddet" satırına tıklayıp not kutusunu Esc ile
kapatan kullanıcı hiçbir geri bildirim almıyor.

**② Yer.** `_Sarmal/eklenti/src/onay-kuyrugu.ts:478`

```ts
if (yanit === undefined) { izYaz(`karar İPTAL · ${kod}`); return; }
```

İz kanalına yazılıyor, kullanıcıya hiçbir şey söylenmiyor.

**③ Somut başarısızlık senaryosu.** Founder "Reddet" satırına tıklar, kutu açılır,
fikri değişir, Esc'e basar. Ekranda hiçbir şey olmaz. Az önce Kusur 4 yüzünden de
satırlar kendiliğinden kapandığını gördüğü için, bu sessizliği "gene çalışmadı"
diye okur. Sessizlik burada bilinçli bir tercihtir ama kullanıcı bunu bilemez.

**④ Ölçüm.** Kod okuması; prob 1'in P8 adımında not kutusunun gerçekten açıldığı ve
kabul edildiği ölçüldü (kayıt `onay: "reddedildi — 2026-07-29"` olarak indi). İptal
dalı ayrıca ölçülmedi — **kesin değil** demiyorum, kod dalı tek satır ve tartışmasız,
fakat kullanıcı üstünde etkisi ölçülmedi.

**⑤ Ağırlık.** HAFİF, ama Kusur 4 ile birleşince algılanan ağırlığı artıyor.

**⑥ Önerilen onarım (özet).** İptalde durum çubuğunda bir-iki saniyelik
"karar verilmedi — kapı kuyrukta duruyor" cümlesi yeter; kesintili bir bildirim kutusu
gerekmez.

---

## Koordinatörün üç sorusuna doğrudan cevap

**① Karar yazıldıktan sonra `onDidChangeTreeData` ateşleniyor mu, kapı satırı düşüyor mu?**
**Evet, ateşleniyor ve kapı gerçekten düşüyor.** Zincir şudur: `applyEdit` →
`onDidChangeTextDocument` (`onay-kuyrugu.ts:528`) ve `doc.save()` →
`onDidSaveTextDocument` (`onay-kuyrugu.ts:527`) → `tazele(doc)` →
`postaKutusu.yerlestirDosya(...)` → `OnayDefteri.yaz` içerik değiştiği için `true`
döner → `cizdir()` → `degisti.fire()`. Ölçüm: prob 2'de karar öncesi
`sonYerlesenKapi: 1`, karar sonrası `sonYerlesenKapi: 0`; prob 4 ve 5'te de sıfıra
indi. Yani "kullanıcı aynı kapıyı tekrar tekrar karara bağlıyor" senaryosu bugün
gerçekleşmiyor. Kapı düşüyor — düşerken **açık olan satırı da birlikte götürüyor**,
ki asıl kusur budur (Kusur 4).

**② Yazan taraf ile paneli besleyen tarama farklı kaynağa mı bakıyor?**
**Hayır, bayat önbellek yok.** Yazan taraf `belgeKapilari(doc)` → `programAl(doc)`
kullanıyor; önbellek `(uri, doc.version)` anahtarlıdır (`onbellek.ts:22-31`) ve
`applyEdit` sürümü artırdığı için yazımdan sonra **kesinlikle yeniden ayrıştırılır**.
Paneli besleyen tam tarama ise ana tanı hattının anlık görüntüsünden gelir
(`onay-tarayici.ts:85-96`), o da aynı `TextDocument` içeriklerinden kuruludur; üstelik
kirli belgeler `acikBelgeleriUstuneYaz` ile ayrıca üstüne yazılır
(`onay-kuyrugu.ts:304-313`). Anahtarlama da tek evrendedir: her iki taraf da `fsPath`
kullanır (`eklenti.ts:219` ve `onay-kuyrugu.ts:245`) — ikiz anahtar yok.
*Kesin değil olan tek nokta:* tam tur, yazımdan **önce** başlamış bir anlık görüntüyle
biterse `yerlestirHepsi` toptan yerleştiği için kararı verilmiş kapı bir tur boyunca
geri gelebilir; `acikBelgeleriUstuneYaz` yalnız **kirli** belgeleri koruduğundan,
`doc.save()` sonrası belge temiz olduğu için bu kalkanın dışında kalır. Bu, 0.9.76'da
bildirilen "onayladım, kapı sonra geri geldi" olayının yapısal kökü olabilir. Zamanlama
yarışı olduğu için ölçemedim — **kesin değil**, ama Kusur 1'in onarımıyla (kaydetmenin
kaldırılmasıyla) bu pencere de daralır.

**③ Kullanıcı görünür bir onay alıyor mu?**
**Evet, üç ayrı işaret alıyor:** bilgi bildirimi
(`onay-kuyrugu.ts:285` — `✅ Karar işlendi — KOD: onaylandı`), panel başlığındaki
sayı rozetinin düşmesi (`posta-kutusu.ts:141-147`) ve kapı satırının listeden kaybolması.
Yani **"sessiz başarı" teşhisi bu turda doğrulanmadı** ve raporun ana hükmü değildir.
Kullanıcının "bir şey olmuyor" demesinin sebebi geri bildirimin yokluğu değil,
geri bildirimin **yanında olup bitenlerdir**: satır elinin altında kapanıyor (Kusur 4),
gittiği yerde boş bir yüzey buluyor (Kusur 6), ipucu ona başka bir şey vaat ediyor
(Kusur 5) ve `git diff` kırk altı satır gösteriyor (Kusur 1).

**Ek soru — yeniden biçimleme bilinçli mi?**
**Bilinçli değildir, yan etkidir** ve Kusur 1'de ölçümüyle birlikte yazıldı.
`kaydiIsle` biçimlendiriciyi hiç çağırmaz; biçimleme, eklentinin kendi
`configurationDefaults` bildirimindeki `editor.formatOnSave: true` ile karar
yazıcısının `doc.save()` çağrısının kesişmesinden doğar ve **yalnız dosya bir editörde
açıksa** olur (kapalı: 1 satır, açık: 9 satır). Bilinçsiz olduğu için satır kayması
hesaba katılmamış; Kusur 3 bu yüzden teorik olmaktan çıkıp erişilebilir hâle geliyor.

---

## Çürüttüklerim — düşündüm ama gerçek değil

**Ç1 — "`PostaKutusu.getParent()` sabit `undefined` döndüğü için açılabilir satırlar
ve `reveal` bozuluyor."** Gerçek değil. VS Code 1.130.0 kaynağında `getParent`
**yalnız** `reveal` yolunda kullanılıyor; ağaç çizimi, genişletme ve tıklama
tamamen `getChildren` + tutamak üstünden yürüyor. Bu görünüşte `reveal` hiç
çağrılmıyor: depoda `reveal` yalnız `yolharitasi.ts:1105` ve `yolharitasi.ts:977`
satırlarında geçiyor, Posta Kutusunda hiç yok. Ayrıca prob 2 açılabilir satırın
gerçek kabukta **çalıştığını** ölçtü (satır açıldı, alt satır tıklandı, karar yazıldı).
Yani bu bir kusur değildir; `reveal` ileride istenirse o zaman gerekir.

**Ç2 — "`sarmal.postaKararVer` ve `sarmal.postaKapisiAc` `package.json` içinde ilan
edilmediği için `TreeItem.command` çalışmıyor."** Gerçek değil ve **kesin cevabı
ölçtüm**. Prob 1 gerçek kabukta şunu bildirdi:

```
sarmal.postaKararVer  → kayıtlı: true   · package.json'da ilan: false
sarmal.postaKapisiAc  → kayıtlı: true   · package.json'da ilan: false
sarmal.onayKarar      → kayıtlı: true   · package.json'da ilan: false
```

ve prob 2 aynı komutu **gerçek ağaç tıklamasıyla** koşturup kararı diske yazdırdı.
Kaynak da bunu doğruluyor: `vscode.commands.registerCommand`, komutu ana süreçteki
komut siciline `$registerCommand` ile ekler; `contributes.commands` yalnız komut
paletinde görünme, menü girdisi, başlık ve ikon içindir. Depo içi ikinci kanıt:
`sarmal.onayKarar` da hiç ilan edilmemiştir ve kod merceği aylardır onunla çalışıyor.
**Dahası, bu iki komutu ilan etmek KUSUR OLURDU:** ikisi de zorunlu argüman ister ve
komut paletinden argümansız çağrıldıklarında çöker.

**Ç3 — "`getChildren` her çağrıda yeni nesne ürettiği için VS Code satırları
eşleyemiyor."** Bu hâliyle gerçek değil. VS Code ağaç öğesini JavaScript nesne
kimliğiyle **eşlemiyor**; tutamağı `TreeItem.id` varsa ondan, yoksa
`${ataTutamağı}/${sıra}:${etiket}` biçiminde üretiyor (`_createHandle`,
`extensionHostProcess.js`, 1.130.0). Etiketler kararlı olduğu için yeni nesne üretmek
tek başına zarar vermiyor — prob 2 bunu ölçtü. **Ama yarısı gerçektir ve Kusur 4'ün
onarımına girmiştir:** `id` verilmediği için tutamak **kardeş sırasına** bağlıdır; bir
kapı listeden düştüğünde kalan bütün satırların tutamağı kayar ve açıklık durumu
komşuya göç edebilir. Yani kusur "nesne kimliği" değil, "**satır kimliğinin ilan
edilmemiş olması**"dır.

**Ç4 — "Yazan taraf ile okuyan taraf farklı önbelleğe bakıyor, sayaç bayat kalıyor."**
Ölçtüm, gerçek değil (yukarıda ② maddesinde ayrıntısıyla). Tek istisna, zamanlamaya
bağlı ve ölçemediğim tam-tur yarışıdır; onu **kesin değil** diye işaretledim.

**Ç5 — "Karar sonrası kullanıcı hiçbir geri bildirim almıyor (sessiz başarı)."**
Gerçek değil (yukarıda ③ maddesinde). Bildirim, rozet ve satır kaybı üçü de çalışıyor.

**Ç6 — "Panel açılışta ya da her tuş vuruşunda gereksiz yere baştan çiziliyor."**
Gerçek değil. `OnayDefteri` her yazımda parmak izi karşılaştırıyor
(`onay-cekirdek.ts:127-147`) ve içerik değişmediyse olay atmıyor; prob 1'de on dört
yerleşim turu boyunca ne yedek tarama ne fazladan dosya okuması oldu
(`yedekTur: 0 · okunanDosya: 0 · dosyaAramasi: 0`) ve açılan belge sayısı olaydan
açılan belge sayısına **birebir eşit** kaldı (`acilanBelge: 12 = olaydanAcilanBelge: 12`).
Bu katman sağlamdır; kusur tazelemenin sıklığında değil, tazelemenin **açık satırı
götürmesindedir**.

**Ç7 — "Kapı tespiti (`ONAY_DESENI`) yanlış kapı buluyor ya da kapıları kaçırıyor."**
Gerçek değil. Bütün problarda kapı doğru bulundu; 275 birim nöbeti bu mantığı
fikstürlerle koşturuyor ve hepsi yeşil.

---

## Kapanış — nöbetlerin göremediği şey

275 birim nöbeti yeşil, iki entegrasyon süiti (`aktivasyon` · `onay-yuzeyi` ·
`panel-gorunum`) de yeşil olduğu hâlde bu dokuz kusurun hiçbiri kırmızı vermiyor.
Sebep şudur: mevcut entegrasyon nöbetleri **sayaç ölçüyor** (kaç iş parçacığı yaşıyor,
kaç belge açıldı, kaç tur koştu) ama **kullanıcının gördüğü sonucu ölçmüyor** — ne
diskteki satırın ne olduğunu, ne kaç satırın değiştiğini, ne de panelde tıklanan
satırın hâlâ orada durup durmadığını.

Bu turda kullandığım üç ölçüm bu boşluğu kapatabilir ve depoya kalıcı nöbet olarak
girmeye değer:
① karar yazımından sonra **değişen satır sayısı = 1** olmalıdır (Kusur 1 ve 2'yi yakalar);
② `kaydiIsle` bayat satır + doğru kod ile çağrıldığında **kod bağlayıcı** olmalıdır (Kusur 3);
③ ağaç, `list.focusFirst / list.focusDown / list.select` dizisiyle gerçekten
tıklanmalı ve **araya bir tazeleme sokulduğunda aynı dizi aynı sonucu vermelidir**
(Kusur 4). Kontrol–deney kurulumu bu raporda hazırdır ve depoya taşınabilir.

Son bir uyarı: bu dokuz kusurun **altısı tek bir satırdan** (`onay-kuyrugu.ts:277`,
`await doc.save()`) ve **tek bir paket bildiriminden** (`package.json:193`,
`editor.formatOnSave: true`) besleniyor ya da onların gölgesinde büyüyor. Bugün beş
kez körlemesine yama denendiği için şunu açıkça yazıyorum: önce Kusur 1 ile Kusur 4
onarılmalı, sonra akış yeniden ölçülmelidir. Kalan kusurların bir kısmı ölçüldüğünde
kendiliğinden küçülecektir.

---

**Raporun tam yolu:**
`<geçici dizin>`
