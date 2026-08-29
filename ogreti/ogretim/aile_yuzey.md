<!-- SARMAL:KART_KUNYESI -->
# 🎨 yuzey ailesi — öğretim kartı

Bu aile kanonik sınıflama kaydında şöyle tanımlanır: içerir (UI ağacı — kullanıcının gördüğü). Ailede 21 tip yaşar.

Bu kartın olgusal bölgeleri kanonik sınıflama kaydından üretilmiştir: oz/siniflama/kayit.json · mühür: fd91f4ed

Anlatı bölgesi elle yazılır ve üreteç o bölgenin sınırını geçmez. Kartı tazelemek için `node arac/ogretim-uret.ts` çalıştırılır.
<!-- /SARMAL:KART_KUNYESI -->

<!-- SARMAL:ANLATI -->
## Anlatı

Yüzey ailesi şu soruyu cevaplar: kullanıcı ne görüyor? Bir arayüz genellikle doğrudan hedef çerçevenin diliyle yazılır ve o an seçilen teknoloji, tasarımın kendisiymiş gibi kayda geçer. Bu aile ekranı teknolojiden önce niyet olarak yazar; ağacın kendisi Türkçe ve bildirimseldir, hedef çerçevenin koduna çevirmeyi ise ajan üstlenir.

Ailenin metaforu arayüz ağacıdır. Ekran o ağacın köküdür ve altındaki bütün yapıyı sarar. Aile içinde net bir ayrım vardır: düzen taşıyan tipler, yani Sütun, Satır, Yığın, Kapsayıcı, Kart, Liste, Sayfa, Bileşen, ÜstÇubuk, Gövde ile Form, öteki yüzey öğelerini içine alabilir; yaprak tipler, yani Metin, Düğme, Görsel, İkon, Tema, MetinAlanı, OnayKutusu, AçılırListe ve AnlıkBildirim ise hiçbir çocuk taşımaz. Bu kural ağacın derinliğini anlamlı tutar ve yaprağın içine yanlışlıkla yapı gömülmesini engeller. Ekran görsel sözleşmesine `tema` kenarıyla bağlanır ve tema değerleri hedef teknolojinin kendi tema dosyasında yaşar, çünkü rol adı ile somut renk değeri ayrı katmanlardır. Ailenin en değerli kenarları dışarıya çıkanlardır: Düğme bir arkayüz ucunu `çağırır`, başka bir ekrana `gider` ve Form verisini bir uca `gönderir`. Bu kenarlar önyüz ile arkayüzün kavuşma noktasıdır ve onlar yazılmadığında bir düğmenin ne yaptığı sorusu cevapsız kalır.

Canlı örnek derin ekran vitrinindedir. `ogreti/ornek/derin_ekran.yuzey.sar` dosyasındaki `Ekran( kod: EKR-Profil, görünürlük: açık, ne: "Kullanıcı profil ekranı", referans: ADM-PROFIL, tema: TEM-PROFIL ) {` düğümü hem kendisini üreten plan Adımına hem de tema sözleşmesine bağlanır. Ağaç oradan Yığın, Kart, Sütun ve Satır düzeyleriyle beş kademe derinleşir ve yapraklara iner. `Düğme( kod: DGM-Kaydet, görünürlük: açık, ne: "Kaydet", çağırır: UC-ProfilGuncelle ) { }` düğümü ise ailenin kavuşum disiplinini tek satırda gösterir, çünkü düğme yalnız bir etiket değil, aynı dosyada ilan edilmiş gerçek bir arkayüz ucuna bağlanan bir eylemdir. Bu düğümler örnek rafında yaşadığı için `gezin` aracı onların tanımına gitmez ve o rafı bilerek dışarıda bırakır; kodu `bul` aracına sorarsan düğümün yerini söyler. Son olarak bir uyarı gerekir: aşağıdaki makine tablosu yirmi bir tipin hepsinde içerebilir sütununa çizgi basar ve yukarıdaki düzen ile yaprak ayrımıyla çelişir; bağlayıcı olan kanonik yüzey kuralıdır, çünkü tabloyu yazan üreteç yalnız izinli sarma alanını okur ve yüzey kuralı eksenini görmez.
<!-- /SARMAL:ANLATI -->

<!-- SARMAL:AILE_ISKELETI -->
## İskelet — sınıflama kaydından üretilir

Aşağıdaki iki tablo makine envanteridir. Elle yapılan düzenleme bir sonraki üretimde silinir; düzeltme kanonik kayda yazılır.

### Tipler ve zorunlu alanları

| Tip | Ne | Zorunlu alanlar |
|---|---|---|
| 🎨 AçılırListe | açılır seçenek listesi (Dropdown); değerler+seçili taşır | kod |
| 🎨 AnlıkBildirim | kısa süreli alt bildirim (SnackBar/Toast); kaynak+süre | kod |
| 🎨 Bileşen | yeniden-kullanılır UI bileşeni (component) | kod |
| 🎨 Düğme | tıklanabilir eylem — yaprak (Button) | kod |
| 📱 Ekran | UI kökü (Scaffold=İskelet); Türkçe declarative niyet | kod |
| 🎨 Form | girdi alanlarını saran doğrulama kabı; doğrulamaAnı bildirir | kod |
| 🎨 Görsel | resim — yaprak (Image) | kod |
| 🎨 Gövde | ekranın ana içerik alanı (Body); kaydırma+güvenliAlan taşır | kod |
| 🎨 İkon | ikon — yaprak (Icon) | kod |
| 🎨 Kapsayıcı | boyut/renk/boşluk kutusu (Container) | kod |
| 🎨 Kart | gölgeli içerik kabı (Card) | kod |
| 🎨 Liste | kaydırılabilir liste (ListView) | kod |
| 🎨 Metin | yazı — yaprak (Text) | kod |
| 🎨 MetinAlanı | kullanıcıdan metin girişi (TextField); tür+doğrula taşır | kod |
| 🎨 OnayKutusu | çoklu seçim kutusu (Checkbox); durum alanına bağlanır | kod |
| 🎨 Satır | yatay diz (Row) | kod |
| 🎨 Sayfa | tasarım sayfası (design-builder page) | kod |
| 🎨 Sütun | dikey diz (Column) | kod |
| 🎨 Tema | renk/font/token teması (theme) | ne |
| 🎨 ÜstÇubuk | üst başlık/aksiyon çubuğu (AppBar); Ekran'ın tepesi | kod |
| 🎨 Yığın | üst üste yerleştir (Stack) | kod |

### İzinli sarma ilişkileri

| Tip | İçerebilir | İçine konabilir |
|---|---|---|
| AçılırListe | — | — |
| AnlıkBildirim | — | — |
| Bileşen | — | — |
| Düğme | — | — |
| Ekran | — | Proje · Raf · Uygulama |
| Form | — | — |
| Görsel | — | — |
| Gövde | — | — |
| İkon | — | — |
| Kapsayıcı | — | — |
| Kart | — | — |
| Liste | — | — |
| Metin | — | — |
| MetinAlanı | — | — |
| OnayKutusu | — | — |
| Satır | — | — |
| Sayfa | — | — |
| Sütun | — | — |
| Tema | — | Proje · Raf · Uygulama |
| ÜstÇubuk | — | — |
| Yığın | — | — |
<!-- /SARMAL:AILE_ISKELETI -->
