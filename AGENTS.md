# Sarmal — açık kaynak dil, motor ve eklenti

> **Bu dosya bir işaretçidir, anayasa metni değildir (DIL-1 · normatif içerik yalnız `.sar` kaynağında yaşar).**
> Burada yalnız KALICI kurallar ve adresler bulunur. Durum, devir, sıradaki iş,
> açık iş, tur sonucu ve karar gibi ZAMANLA DEĞİŞEN hiçbir içerik buraya yazılmaz —
> onların yeri durum ve devir dosyalarıdır. Bu dosyaya durum yazılırsa ikinci bir
> bayat kaynak doğar ve anlam sapması başlar.

## 1. Tek varlık, ayrı depolar (STR-3)

Bu depo Sarmal'ın açık kaynak evidir: dil, motor ve eklenti burada yaşar. Kapalı
ürün ayrı bir depoda yaşar; bu depo ona hiçbir bağımlılık taşımaz ve onun adını,
mimarisini ya da kalıplarını anlatmaz.

Çatının işaretçisi `../CLAUDE.md` dosyasındadır; dört projenin rolü, kilitli
hükümler ve OS zemin hükümleri orada yaşar. Oturuma onu okuyarak başla.

## 2. Anadizin = projenin büyük resmi

Deponun giriş dosyası `sarmal_anadizin.sar` dosyasıdır (DIL-1.2 · MIM-3).

Anadizin klasör hiyerarşisini, kitaplıkları, rafları, teknolojiyi ve zaman eksenini
ilan eder. **Bir işe başlamadan önce anadizini oku** — neyin
nerede yaşadığını, hangi rafın neye ayrıldığını ve projenin kapsam sınırını orada
görürsün. Yeni bir klasör ya da kitaplık doğuyorsa ilanı önce anadizine iner
(Yapı-Önce); ilansız yapı drifttir.

## 3. Kaynak gerçek (oku — ezberleme)

| Ne | Nerede |
|---|---|
| Giriş / mimari ilanı | `<varlık>_anadizin.sar` |
| **Kanon — tek yetkili yasa** | `yasa/kanon/*.sar` (8 bölüm: dil·mim·ogr·ork·str·tip·yas·yuz) |
| Ebedî çekirdek kural | `yasa/yonetisim/ebedi.sar` |
| Tip sistemi (SNF-0) | `oz/siniflama/kayit.json` — şemayı ARAÇTAN sor, dosyayı ham okuma |
| Kontrolcü anayasası | `oz/kayit/asistan_kontrolcu.sar` |
| Durum / son devir | `is/durum/durum_devir.sar` (TEK YETKİLİ) |
| Planlar (canlı iş) | `is/plan/` |
| Felsefe | `ogreti/felsefe/` |

**Kural, karar, ilke, metafor ve plan içeriği YALNIZ `.sar` dosyalarında yaşar.**
Markdown dosyaları ya türetilmiş yüzdür ya da insan yüzü; hiçbiri kanonun ikizi
değildir ve hiçbiri kaynak sayılmaz (YUZ-1.2).

## 4. Araç önceliği — ÖNCE SARMAL, sonra ham arama

Bu depoda Sarmal MCP sunucusu bağlıdır ve soruların çoğunun kesin cevabı onda
yaşar. **Ham `grep`, `sed`, `find` ile başlamak anti-desendir**; hızlı görünür ama
YANLIŞ GÜVEN verir: sayı üretir, sayı doğru görünür, oysa yanlış şeyi saymıştır.

**Sarmal aracına git:**

| Soru | Araç |
|---|---|
| Bu kod nerede tanımlı, kimler atıf veriyor? | `gezin` |
| Yapı nasıl, hangi düğüm neyi sarıyor, kopuk var mı? | `graf` |
| Bunu değiştirsem nereler etkilenir? | `etki` |
| Hangi tipler var, şeması ne, hangi alan zorunlu? | `siniflama` |
| Bir kavramın karşılığı ne? | `kavram` |
| Kapı hükmü, drift, sağlık | `denetle` · `denetle-proje` |
| Bir Adıma başlamadan bağlam | `sef` |
| Durum ilerletme | `durum-guncelle` |
| Kural metni | `kurallar` |
| Karşılama / öğrenme | `ogret` |

**Ham aramanın meşru kaldığı dar alan:** düğüm olmayan serbest metni bulmak,
bir dizenin kaç kez geçtiğini saymak, kod tabanında `.sar` dışı dosyalarda arama,
henüz ilan edilmemiş bir şeyi keşfetmek. Bunun dışında araca sor.

**Şema ve tip öğrenimi ASLA örnek dosyadan yapılmaz** — örnek bayat olabilir,
kanon canlıdır. Tipi `siniflama` aracına sor; uydurma tip adı kullanma.

## 5. Başla (onboarding)

1. `sarmal` MCP sunucusunu bağla.
2. `ogret` çağır → karşılama kartı; ardından `kurallar`, `siniflama`, `kavram`.
3. Anadizini oku.
4. Sağlığı doğrula: `cd urun/cekirdek && node src/sarmal.ts denetle ../..` → hedef ⛔0.

## 6. Asistan protokolü

- **TEK VARLIK:** denetimi depo kökünde koş ve raporda kapsamı adıyla an.
- **KARAR → PLAN:** kilitli karar plana iner; uygulama isteyen kararı plansız
  bırakma. Founder kilidi olmayan kararı UYGULAMA.
- **DURUM AKIŞI:** beklemede → geliştirmede → tamamlandı; kademe atlanmaz.
  Kapanış koşu kanıtı ve meyve kenarı ister.
- **TEK FORMAT:** içerik `.sar` dosyasında yaşar; işaretçi dosyaya içerik biriktirme.
- **KAPI:** üretici ile denetçi ayrıdır; her teslim kapıdan geçer ve sayısal iddia
  bağımsız ölçülmeden kabul edilmez.

## 7. Founder sözünün kayda geçirilmesi (yazım hükmü)

Bu bölüm bir işaretçidir ve hüküm metni değildir. Yazım ile üslup hükmü kanonun
DİL bölümünde **DIL-1.5 · Anlatım Bütünlüğü** maddesi olarak yaşar; hükmün
kendisi, gerekçesi, örneği ve beş şartının tam metni yalnız
`yasa/kanon/dil.sar` kaynağındadır ve burada yinelenmez (YUZ-1.2).

Kısaca hatırlatmak gerekirse Founder'ın söylediği hiçbir cümle kayda
konuşulduğu hâliyle girmez; söz akademik üslupla ve tam cümlelerle çevrilerek
geçer. Aynı hüküm yalnız Founder sözünün aktarımını değil, kanon maddelerini,
plan Adımlarının bütün metin alanlarını, belge bloklarını ve işleme
mesajlarının gövdesini de bağlar. Şartların bağlayıcı metnini okumak için
`kurallar` aracına DIL-1.5 maddesini sor ya da kanon dosyasını aç.
