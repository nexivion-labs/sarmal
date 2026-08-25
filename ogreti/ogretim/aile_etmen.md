<!-- SARMAL:KART_KUNYESI -->
# 🤖 etmen ailesi — öğretim kartı

Bu aile kanonik sınıflama kaydında şöyle tanımlanır: kimlik + yetenek + bellek + tetikleyici. Ailede 5 tip yaşar.

Bu kartın olgusal bölgeleri kanonik sınıflama kaydından üretilmiştir: oz/siniflama/kayit.json · mühür: 97365b52

Anlatı bölgesi elle yazılır ve üreteç o bölgenin sınırını geçmez. Kartı tazelemek için `node arac/ogretim-uret.ts` çalıştırılır.
<!-- /SARMAL:KART_KUNYESI -->

<!-- SARMAL:ANLATI -->
## Anlatı

Etmen ailesi şu soruyu cevaplar: bu işi kim yapacak ve o kim neyi bilerek yapacak? Bir yapay zekâ ajanına iş vermek kolaydır; zor olan, aynı ajanın altı ay boyunca aynı disiplinle çalışmasını sağlamaktır. Talimatı her oturumda yeniden yazmak hem yorucudur hem de yazıldığı gün unutulan bir dersi ertesi gün geri getirir. Bu aile ajanın kimliğini, yeteneklerini ve hafızasını kalıcı düğümlere çevirir.

Ailenin metaforu kadrodur ve her üye kadronun bir yönünü taşır. Etmen kadronun üyesidir; türünü, uzmanlığını, yetkisini ve kendine ait izole belleğini bildirir, ayrıca bir Anayasaya bağlanarak hangi disipline tabi olduğunu ilan eder. Yetenek yığından bağımsız bir kabiliyet ilanıdır ve tek başına hiçbir teknolojiye ait değildir. Beceri o yeteneğin belirli bir yığındaki somut uygulanışıdır ve `sağlar` kenarıyla yeteneğe bağlanır; aynı yeteneğin iki ayrı çerçevedeki karşılığı iki ayrı Beceridir. Becerinin taşıdığı alanlar ailenin karakterini gösterir, çünkü beceri yalnız ne yapılacağını değil ne zaman kullanılacağını, kurallarını, örneğini ve kaçınılacak anti deseni de yazar. Bellek etmenin hafızasıdır ve dersler orada birikir; değerli bulunan ders Beceriye terfi eder ve böylece hafıza yavaşça disipline dönüşür. Tetikleyici bu ailenin otomasyon ucudur: yapısal bir koşulu bildirir ve koşul sağlandığı anda ilgili Beceriyi bağlama düşürür, dolayısıyla ajanın doğru anda doğru şeyi hatırlaması insana bırakılmaz.

Canlı örnek Sarmal'ın kendi öğrenme rafındadır ve dört tipi tek dosyada gösterir. `ogreti/ogrenme/arac_yonlendirme_becerisi.sar` dosyasında `Yetenek( kod: YTN-ARAC-YONLENDIRME, ne: "Soruyu ham taramaya değil doğru Sarmal aracına yöneltme" )` ilan edilir. Aynı dosyadaki `Beceri( kod: BCR-ARAC-YONLENDIRME,` düğümü `sağlar: YTN-ARAC-YONLENDIRME` kenarıyla o yeteneğe bağlanır, `yığın: evrensel` değeriyle teknolojiden bağımsız olduğunu bildirir ve `uygular: ANY-KONTROLCU` kenarıyla kontrolcü anayasasına tabi olduğunu yazar. `Tetikleyici( kod: TTK-ARAC-YONLENDIRME, tetikler: BCR-ARAC-YONLENDIRME,` düğümü ise `koşul: adım.durum == geliştirmede` yazarak beceriyi iş başlar başlamaz ajanın önüne koyar. Dosyanın başlığı bu becerinin doğum gününü de kaydeder, çünkü kart bir listeden değil ölçülmüş bir hatadan doğmuştur. Üç düğümü de kodlarını `gezin` aracına sorarak açabilirsin.
<!-- /SARMAL:ANLATI -->

<!-- SARMAL:AILE_ISKELETI -->
## İskelet — sınıflama kaydından üretilir

Aşağıdaki iki tablo makine envanteridir. Elle yapılan düzenleme bir sonraki üretimde silinir; düzeltme kanonik kayda yazılır.

### Tipler ve zorunlu alanları

| Tip | Ne | Zorunlu alanlar |
|---|---|---|
| 🤖 Beceri | etmene bağlı yetenek; Bellek'ten damıtılır (skill) | kod · sağlar · yığın · ne · neZaman · kurallar · örnek · antiDesen · uygular |
| 🤖 Bellek | etmenin izole hafızası (ogrenme/); hata/öğrenilen buraya | kod · tür · ne |
| 🤖 Etmen | kimlik+beceri+izole bellek+anayasa+hook+tetikleyici | kod · tür · uzmanlık · yetki · bellek · ne · uygular |
| 🤖 Tetikleyici | "ne zaman kullan" koşulu; eşleşince Beceri otomatik fire (TRG) | kod · koşul · ne |
| 🤖 Yetenek | stack-agnostik yetenek ilanı (F-2): Beceri `sağlar:` ile bağlanır — aynı yeteneğin Flutter/React uygulamaları ayrı Beceriler | kod · ne |

### İzinli sarma ilişkileri

| Tip | İçerebilir | İçine konabilir |
|---|---|---|
| Beceri | — | Etmen |
| Bellek | — | Etmen |
| Etmen | Beceri · Yetenek · Bellek · Anayasa · Kanca · Tetikleyici | Orkestrasyon · Raf |
| Tetikleyici | — | Etmen |
| Yetenek | — | Etmen |
<!-- /SARMAL:AILE_ISKELETI -->
