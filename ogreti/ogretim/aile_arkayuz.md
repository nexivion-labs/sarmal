<!-- SARMAL:KART_KUNYESI -->
# 🌊 arkayuz ailesi — öğretim kartı

Bu aile kanonik sınıflama kaydında şöyle tanımlanır: sunucu yüzü (servis·uç·tablo·kuyruk) — yüzeyin simetriği. Ailede 12 tip yaşar.

Bu kartın olgusal bölgeleri kanonik sınıflama kaydından üretilmiştir: oz/siniflama/kayit.json · mühür: 2cc7ec5e

Anlatı bölgesi elle yazılır ve üreteç o bölgenin sınırını geçmez. Kartı tazelemek için `node arac/ogretim-uret.ts` çalıştırılır.
<!-- /SARMAL:KART_KUNYESI -->

<!-- SARMAL:ANLATI -->
## Anlatı

Arkayüz ailesi şu soruyu cevaplar: kullanıcının görmediği taraf neye benziyor? Bir ekranın nasıl görüneceği tartışılırken sunucu tarafı çoğu zaman yalnız kodda yaşar ve niyet düzeyinde hiç yazılmaz. Bu aile sunucu yüzünü de kullanıcı yüzüyle aynı dilde ve aynı ağaçta ifade eder, böylece iki taraf birbirinden habersiz ilerleyemez.

Ailenin metaforu yüzeyin simetriğidir. Servis iş mantığının kabıdır ve kendi altında uçları, olayları ve arka görevleri toplar; taban yolunu, sürümünü, günlük düzeyini ve gözlem ayarlarını da o taşır. Uç bir adrestir ve yalnız yolunu ile yöntemini bildirir; veri şemasını taşımaz, çünkü şema ürün ailesindeki Sözleşme düğümünde yaşar ve her uç bir sözleşmeye bağlanır. Bu kuvvetler ayrılığı ailenin en önemli disiplinidir, çünkü şemayı uca gömmek aynı şemanın birden çok yerde çoğalmasına yol açar. Tablo kalıcı veriyi, Kuyruk asenkron akışı, ArkaGörev istek dışı işi, Zamanlayıcı periyodik işi, Önbellek hız katmanını ve Olay yayınlanan bildirimi taşır. Kimlik üçlüsü ayrı tutulmuştur ve birleştirilemez: KimlikKökü kimlik alanının sınırını, KimlikPolitikası jeton ömrü ile parola ve kilitleme zeminini, KimlikSağlayıcısı ise dış sağlayıcıyı bildirir. Gizli bu ailenin en dikkatli üyesidir, çünkü yalnız sırrın adresini ilan eder ve değeri hiçbir koşulda dosyaya yazılmaz.

Canlı örnek biçim vitrinlerindedir. `ogreti/ornek/format/dalga3_arkayuz.sar` dosyasında bir kimlik servisi ilan edilir ve uçlarını içine sarar; `Uç( kod: ORN-UC-GIRIS, metod: POST, yol: "/kimlik/giris",` düğümü yalnız adresini ve yöntemini yazar, ardından gelen `sözleşme: ORN-SZL-GIRIS,` kenarıyla şemasını dışarıya devreder. `Sözleşme( kod: ORN-SZL-GIRIS, sürüm: "1.0",` düğümü ise `istek: { eposta: metin, sifre: metin },` ve karşılık gelen yanıt yüzüyle veri şemasının tek evini kurar. Aynı dosyanın devamında Tablo, Kuyruk, Önbellek, Zamanlayıcı, KimlikPolitikası ve Gizli düğümleri de bir kimlik servisinin ihtiyaçlarıyla birlikte ilan edilmiştir. Bu düğümler örnek rafında yaşadığı için `gezin` aracı onların tanımına gitmez ve o rafı bilerek dışarıda bırakır; kodu `bul` aracına sorarsan düğümün yerini söyler. Örneğin sahada yürüyen bir iş değil öğretme amaçlı bir vitrin olduğu da bilinerek okunmalıdır, çünkü açık araç kendisi bir sunucu inşa etmez.
<!-- /SARMAL:ANLATI -->

<!-- SARMAL:AILE_ISKELETI -->
## İskelet — sınıflama kaydından üretilir

Aşağıdaki iki tablo makine envanteridir. Elle yapılan düzenleme bir sonraki üretimde silinir; düzeltme kanonik kayda yazılır.

### Tipler ve zorunlu alanları

| Tip | Ne | Zorunlu alanlar |
|---|---|---|
| 🌊 ArkaGörev | arka plan işi (background job): tetik+kuyruk+zamanAşımı | kod · ne |
| 🌊 Gizli | gizli değer (secret) İLANI: sağlayıcı+ad — değerin kendisi asla yazılmaz | kod · ne |
| 🌊 KimlikKökü | kimlik alanı sınırı (MIM-1.1 · ORK-5): kullanıcı havuzunu, yürürlükteki KimlikPolitikası'nı ve sağlayıcı kümesini kapsar; ortak Auth'ta Projeler aynı kökü `kullanır` bağıyla paylaşır, Proje kimlikleri birleşmez | kod |
| 🌊 KimlikPolitikası | kimlik-doğrulama politikası: jeton ömrü+parola algoritması+kilitleme — kimlik alanı sınırı KimlikKökü tipinin, dış sağlayıcı KimlikSağlayıcısı tipinin işidir; üç rol ayrıdır ve birleştirilemez | kod · ne |
| 🌊 KimlikSağlayıcısı | dış kimlik sağlayıcısı (ORK-5.1): yalnız bir KimlikKökü altında yaşar; taban katalog google · github · linkedin · apple · microsoft · sso, genişletme yalnız katkılı örtüyle | kod · tür |
| 🌊 Kuyruk | asenkron iş kuyruğu; yenidenDene+geriÇekilme politikası | kod · ne |
| 🌊 Olay | olay/webhook niyeti: ad+yük(Sözleşme)+yayın yönü | kod · ne |
| 🌊 Önbellek | önbellek niyeti: sağlayıcı+ömür+anahtar; Uç değeri olarak da kullanılır | kod · ne |
| 🌊 Servis | iş mantığı kabı; tabanYol+sürüm+günlük+gözlem; Uç'ları sarar | kod · ne |
| 🌊 Tablo | veritabanı tablosu NİYETİ: şema(Sözleşme'den)+indeks; Göç üretir | kod · ne |
| 🌊 Uç | API ucu (endpoint): yol+yöntem+istek/yanıt sözleşmesi+yetki+hızSınırı | kod · yol · sözleşme |
| 🌊 Zamanlayıcı | zamanlanmış iş (cron): ifade+görev | kod · ne |

### İzinli sarma ilişkileri

| Tip | İçerebilir | İçine konabilir |
|---|---|---|
| ArkaGörev | — | Proje · Raf · Servis · Uygulama |
| Gizli | — | Proje · Raf · Uygulama |
| KimlikKökü | KimlikPolitikası · KimlikSağlayıcısı | ÇalışmaAlanı · Proje |
| KimlikPolitikası | — | KimlikKökü · Mekanizma · Proje · Uygulama |
| KimlikSağlayıcısı | — | KimlikKökü |
| Kuyruk | — | Proje · Raf · Uygulama |
| Olay | — | Proje · Raf · Servis · Uygulama |
| Önbellek | — | Proje · Raf · Uygulama |
| Servis | ArkaGörev · Olay · Uç | Mekanizma · Proje · Raf · Uygulama |
| Tablo | — | Proje · Raf · Uygulama |
| Uç | — | Mekanizma · Servis |
| Zamanlayıcı | — | Proje · Raf · Uygulama |
<!-- /SARMAL:AILE_ISKELETI -->
