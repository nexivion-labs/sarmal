<!-- SARMAL:KART_KUNYESI -->
# ⚖️ yasa ailesi — öğretim kartı

Bu aile kanonik sınıflama kaydında şöyle tanımlanır: kural düzlemi (değişmez). Ailede 6 tip yaşar.

Bu kartın olgusal bölgeleri kanonik sınıflama kaydından üretilmiştir: oz/siniflama/kayit.json · mühür: 2cc7ec5e

Anlatı bölgesi elle yazılır ve üreteç o bölgenin sınırını geçmez. Kartı tazelemek için `node arac/ogretim-uret.ts` çalıştırılır.
<!-- /SARMAL:KART_KUNYESI -->

<!-- SARMAL:ANLATI -->
## Anlatı

Yasa ailesi şu soruyu cevaplar: bir kural kimin sözüdür, neye dayanır ve çiğnendiğinde makine ne söyler? Çoğu projede kurallar bir belgede düzyazı olarak yaşar; oradaki bir cümlenin kim tarafından konduğu, hangi ilkeden türediği ve ihlalinin nasıl anlaşılacağı yazılı değildir. Bu aile kuralı bir metin olmaktan çıkarıp bir düğüme dönüştürür, çünkü ancak düğüme dönüşen kural ölçülebilir.

Ailenin metaforu değişmez kural düzlemidir ve bu düzlem projenin üstünde durur. Kural düğümü otoritesini, katmanını, kapsamını ve dayanağını taşır; ayrıca ihlalin hangi tanı adıyla bildirileceğini de bildirir, böylece kural ile motorun uyarısı arasında ad düzeyinde bir bağ kurulur. Anayasa bütün ajanları bağlayan ortak kural gövdesidir ve Kuralları içine sarar; aynı sarma yetkisi orkestrasyon ailesindeki Politika tipinde de vardır, çünkü işletim politikası da kendi kurallarını taşır. GenelKural aracın kendisiyle gelen yerleşik hükümdür, ÖzelKural ise kullanıcının kendi tanımladığı ve bir hedefe uygulanan kuraldır. Mevzuat bu ailenin en çok yanlış anlaşılan üyesidir, çünkü o bir kural değil kuralın kaynağıdır: dış hukuki norm kendi yargı alanını ve yaptırımını bildirir, sonra bir Politika ya da Adım üzerinden uygulamaya iner. Yasa tipi ise kuralların yaşadığı rafı ilan eder. Ailenin bilgi ailesiyle bağı `dayanak` kenarıyla kurulur ve o kenar "bu kuralı kim kararlaştırdı" sorusunu graftan okunur hâle getirir.

Canlı örnek Sarmal'ın kendi kanonundadır. `yasa/kanon/dil.sar` dosyasında `Kural türkçeOrthografi( kod: DIL-1.1,` ilanı yer alır; düğüm `otorite: anayasa, katman: niyet, kapsam: genel` alanlarını, üstündeki karara bağlanan `dayanak: DIL-1` kenarını ve ihlal bildirimini adlandıran `tanı: [ diakritik-kayıp ]` listesini taşır. Aynı maddenin insan okur metni onun hemen üstündeki belge bloğunda hükmü, gerekçesi ve örneğiyle birlikte durur, dolayısıyla makine taşıyıcısı ile okuma yüzü tek dosyada yaşar. Anayasanın Kuralı sarması da canlıdır: `oz/asistan_kontrolcu.sar` dosyasındaki `Anayasa( kod: ANY-KONTROLCU, ad: "kontrolcü-asistan-anayasası", sürüm: "1.0",` düğümü `Kural ölçmedenHükümYok( kod: KNT-1` maddesini içine alır. Bir madde metnini kaynağından okumak istersen `kurallar` aracına bölümünü, tek bir düğümün yerini arıyorsan `gezin` aracına kodunu sor.
<!-- /SARMAL:ANLATI -->

<!-- SARMAL:AILE_ISKELETI -->
## İskelet — sınıflama kaydından üretilir

Aşağıdaki iki tablo makine envanteridir. Elle yapılan düzenleme bir sonraki üretimde silinir; düzeltme kanonik kayda yazılır.

### Tipler ve zorunlu alanları

| Tip | Ne | Zorunlu alanlar |
|---|---|---|
| ⚖️ Anayasa | TÜM ajanlar için tek ortak kural (claude.md/gemini.md değil) | kod · ne |
| ⚖️ GenelKural | framework built-in kural | kod · ne |
| ⚖️ Kural | kural düğümüdür: otorite · ebedi · katman · kapsam alanlarını koşul, ihlal ve düzey üçlüsüyle birlikte taşır; Anayasa ve Politika bu düğümü sarar | kod · ne |
| ⚖️ Mevzuat | dış hukuki/düzenleyici norm (F-7): kural değil kuralın KAYNAĞI — kaynak/yargıAlanı/yaptırım + zorunluKılar: kenarı; uygulama Politika/Adım'da | kod · kaynak · yargıAlanı · ne · zorunluKılar |
| ⚖️ ÖzelKural | kullanıcının kendi tanımladığı, fonksiyona benzeyen kural düğümü | kod · ne · hedef |
| ⚖️ Yasa | kural rafı | kod · ne |

### İzinli sarma ilişkileri

| Tip | İçerebilir | İçine konabilir |
|---|---|---|
| Anayasa | Kural | Etmen · Raf |
| GenelKural | — | — |
| Kural | — | Anayasa · Mekanizma · Politika |
| Mevzuat | — | — |
| ÖzelKural | — | — |
| Yasa | — | Raf |
<!-- /SARMAL:AILE_ISKELETI -->
