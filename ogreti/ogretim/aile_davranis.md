<!-- SARMAL:KART_KUNYESI -->
# 💠 davranis ailesi — öğretim kartı

Bu aile kanonik sınıflama kaydında şöyle tanımlanır: UI-mantık köprüsü (canlandırma·durum) — teknoloji-bağımsız niyet. Ailede 2 tip yaşar.

Bu kartın olgusal bölgeleri kanonik sınıflama kaydından üretilmiştir: oz/siniflama/kayit.json · mühür: 97365b52

Anlatı bölgesi elle yazılır ve üreteç o bölgenin sınırını geçmez. Kartı tazelemek için `node arac/ogretim-uret.ts` çalıştırılır.
<!-- /SARMAL:KART_KUNYESI -->

<!-- SARMAL:ANLATI -->
## Anlatı

Davranış ailesi şu soruyu cevaplar: yüzey ile mantık arasındaki köprü nerede durur? Bir ekranın nasıl göründüğü yüzey ailesinde, verinin nereden geldiği arkayüz ailesinde yazılıdır; fakat ekranın o veriyi hangi alanlarda tuttuğu ve kullanıcının gözünde nasıl canlandığı ikisinin de tam olarak kapsamadığı bir ara alandır. Bu aile o ara alanı taşır ve iki üyeyle en küçük aile olmasına rağmen en dar boğazı tutar.

Ailenin metaforu köprüdür. Durum ekranın hafızasıdır; hangi alanları taşıdığını ilan eder ve o alanların kaynağını bir arkayüz ucuna bağlar, böylece veri akışının nereden başladığı graftan okunur. Yüzey tarafındaki giriş öğeleri de aynı duruma bağlanır ve bağ bir veri anahtarıyla kurulur, dolayısıyla bir metin alanının hangi alanı beslediği tahmin edilmez, yazılır. Canlandırma ise yüzeyin zaman içindeki değişimidir; türünü, süresini, hareket eğrisini ve tekrar sayısını bildirir. Ailenin en belirleyici özelliği teknoloji bağımsızlığıdır: her iki tip de bir çerçevenin durum yönetimi kütüphanesine ya da animasyon api'sine göre değil, niyet düzeyinde yazılır ve hedef çerçeveye çeviri ajanın işidir. Bu yüzden aynı davranış ağacı farklı çerçevelerde aynı sadakatle üretilebilir ve niyet, seçilen kütüphaneyle birlikte eskimez.

Canlı örnek biçim vitrinlerindedir. `ogreti/ornek/format/dalga3_yuzey.sar` dosyasındaki `Durum( kod: ORN-DRM-GIRIS,` düğümü giriş ekranının hafızasını ilan eder ve gövdesinde `eposta`, `sifre`, `hatirla` ile `yükleniyor` alanlarını türleriyle birlikte sayar. Aynı dosyadaki `MetinAlanı( kod: ORN-MTA-EPOSTA` düğümü ise `veriAnahtarı: girisDurumu.eposta` bağıyla o duruma bağlanır ve köprünün yüzey ucunu gösterir. `Canlandırma( kod: ORN-CNL-SARSMA` düğümü hatalı girişte formun yatay sarsılmasını niyet olarak yazar; ne bir kütüphane adı ne bir kod parçası geçer, yalnız istenen davranış bildirilir. Bu düğümler örnek rafında yaşadığı için `gezin` aracı onların tanımına gitmez ve o rafı bilerek dışarıda bırakır; kodu `bul` aracına sorarsan düğümün yerini söyler. Örneğin sahada yürüyen bir iş değil öğretme amaçlı bir vitrin olduğu da bilinerek okunmalıdır, çünkü açık araç kendisi bir arayüz inşa etmez.
<!-- /SARMAL:ANLATI -->

<!-- SARMAL:AILE_ISKELETI -->
## İskelet — sınıflama kaydından üretilir

Aşağıdaki iki tablo makine envanteridir. Elle yapılan düzenleme bir sonraki üretimde silinir; düzeltme kanonik kayda yazılır.

### Tipler ve zorunlu alanları

| Tip | Ne | Zorunlu alanlar |
|---|---|---|
| 💠 Canlandırma | animasyon niyeti: tür+süre+eğri+tekrar; ön-tanımlı ya da satır-içi değer | kod · ne |
| 💠 Durum | uygulama/ekran durumu (State) niyeti: alanlar+kaynak; UI'ya bağlanır | kod · ne |

### İzinli sarma ilişkileri

| Tip | İçerebilir | İçine konabilir |
|---|---|---|
| Canlandırma | — | Proje · Raf · Uygulama |
| Durum | — | Proje · Raf · Uygulama |
<!-- /SARMAL:AILE_ISKELETI -->
