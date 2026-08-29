<!-- SARMAL:KART_KUNYESI -->
# 🔍 nitelik ailesi — öğretim kartı

Bu aile kanonik sınıflama kaydında şöyle tanımlanır: doğrulama & gözlem (sınama·metrik·log·güvenlik). Ailede 6 tip yaşar.

Bu kartın olgusal bölgeleri kanonik sınıflama kaydından üretilmiştir: oz/siniflama/kayit.json · mühür: fd91f4ed

Anlatı bölgesi elle yazılır ve üreteç o bölgenin sınırını geçmez. Kartı tazelemek için `node arac/ogretim-uret.ts` çalıştırılır.
<!-- /SARMAL:KART_KUNYESI -->

<!-- SARMAL:ANLATI -->
## Anlatı

Nitelik ailesi şu soruyu cevaplar: bunun doğru olduğunu nereden biliyoruz? Bir teslimin kabul edilmesi için yapıldığını söylemesi yetmez; hangi ölçümün alındığı, ölçümün neyi kapsadığı ve neyi kapsamadığı yazılı olmalıdır. Bu aile iddia ile kanıt arasındaki mesafeyi kapatır ve kapının hangi dayanakla açıldığını kaydeder.

Ailenin metaforu nöbettir. Sınama bir Adımı ya da gövdeyi kendi kabul ölçütüne karşı doğrulayan birimdir ve ailenin en tanıdık üyesidir. Değerlendirme daha yumuşak bir alanı ölçer ve hedefini, boyutlarını ve eşiklerini birlikte beyan etmek zorundadır, çünkü eşiği yazılmamış bir değerlendirme herkesin kendi eşiğini uydurmasına açık kalır. Metrik telemetriyi ve performans gerçeğini taşır. Log yapılandırılmış kayıt kanalını ilan eder ve burada süreç ailesiyle arasındaki ince fark önemlidir: Log kanalın kendisini tanımlar, tek bir çalışmanın kaydı ise süreç ailesindeki Koşum düğümüne aittir. Kapsama nöbetin nereye eriştiğini ve nereye erişmediğini bildirir, dolayısıyla yeşil bir kapının hangi yüzeyde yeşil olduğunu görünür kılar. Güvenlik ise güvenlik bulgusunu taşır. Aile bir bütün olarak tek bir disiplini uygular: sayısal hiçbir iddia kendi ölçümü olmadan kabul edilmez ve her kanıt cümlesi hangi komutla, hangi girdiyle ve hangi kapsamda alındığını söyler.

Canlı örnek Sarmal'ın kendi nitelik sicilindedir ve altı üyeden beşini tek dosyada gösterir. `is/nitelik/nitelik_sicili.sar` dosyasındaki `Sınama( kod: SNM-NOBET-SUITI,` düğümü motorun ve eklentinin her işlemede koşan çift nöbet süitini dosya ve sınama sayılarıyla birlikte kaydeder. Aynı dosyadaki `Metrik( kod: MTR-URETIR-DOLULUK,` düğümü meyve bağının doluluk oranını ölçülmüş yüzdelerle taşır ve hedefi de yazar. `Kapsama( kod: KPS-KAPI-YUZEY,` düğümü hangi bekçinin hangi yüzeyde koştuğunu bildirir ve tam yeşil hükmünün yalnız bir yüzeyden verilebileceğini kayda geçirir. `Güvenlik( kod: GVN-GATEWAY-FAILCLOSED,` düğümü ise beyansız araç talebinin reddedildiği güvenlik sınırını, onu kanıtlayan gerçek koşuyla birlikte anlatır. Bu kayıtların herhangi birini kodunu `gezin` aracına vererek açabilirsin.
<!-- /SARMAL:ANLATI -->

<!-- SARMAL:AILE_ISKELETI -->
## İskelet — sınıflama kaydından üretilir

Aşağıdaki iki tablo makine envanteridir. Elle yapılan düzenleme bir sonraki üretimde silinir; düzeltme kanonik kayda yazılır.

### Tipler ve zorunlu alanları

| Tip | Ne | Zorunlu alanlar |
|---|---|---|
| 🔍 Değerlendirme | grader/benchmark/prompt-regression (eval) | kod · hedef · boyutlar · eşikler · ne |
| 🔍 Güvenlik | güvenlik bulgusu (SAST/pentest/CVE) | kod · ne |
| 🔍 Kapsama | test kapsaması / mutation | kod · ne |
| 🔍 Log | yapılandırılmış log / olay-kaydı | kod · ne |
| 🔍 Metrik | telemetri/performans (OTel) | kod · ne |
| 🔍 Sınama | sınama/test birimi — bir Adım/Blok'u kabul'e karşı doğrular | kod · ne |

### İzinli sarma ilişkileri

| Tip | İçerebilir | İçine konabilir |
|---|---|---|
| Değerlendirme | — | — |
| Güvenlik | — | Mekanizma |
| Kapsama | — | — |
| Log | — | Mekanizma |
| Metrik | — | Mekanizma · Raf |
| Sınama | — | Raf |
<!-- /SARMAL:AILE_ISKELETI -->
