<!-- SARMAL:ELLE-KORUNAN:BAS -->
# Sarmal nedir?

Bu sayfa Sarmal'ın hangi derdi çözdüğünü, nasıl yaklaştığını ve nerede durduğunu anlatır. Kurulum ve ilk beş dakika için [README.md](README.md), kavram dizini için [KAVRAMLAR.md](KAVRAMLAR.md) okunur. Aşağıdaki açıklama kanonik omurgadan üretilir.
<!-- SARMAL:ELLE-KORUNAN:SON -->

<!-- SARMAL:URETILEN:KOK-NEDIR:BAS -->
<!-- SARMAL:DIATAXIS Explanation -->
## Problem

Yapay zekâ ajanlarıyla yürüyen bir projede bilgi üç yerde dağılır: plan sohbet geçmişinde, karar bir önceki oturumun bağlamında, gerçek ise diskte. Üçü birbirinden habersiz ilerler. Kod plandan önde koşar, tamamlandı denen iş kanıt taşımaz, bir kararın neden verildiği unutulur ve ajan her oturuma sıfırdan başlar. Bu kusur ajanın yeteneğiyle değil, projenin hafızasının makinenin okuyamadığı biçimlerde durmasıyla ilgilidir. Markdown belgeleri de bunu çözmez, çünkü bir belgenin gerçekle çeliştiğini hiçbir şey ölçmez; belge yazıldığı gün doğrudur ve sessizce bayatlar.

## Yaklaşım

Sarmal niyeti kodun yerine değil kodun önüne koyar. Plan, kural, karar ve durum tek bir kaynak biçiminde, `.sar` dosyalarında yazılır; bu dosyalar bir dilin cümleleridir, serbest metin değildir. Motor kaynağı okur, bir graf kurar ve her kaydetmede grafı gerçekle karşılaştırır: ilan edilen dosya diskte var mı, kapanmış görünen iş kanıt taşıyor mu, atıf verilen kod tanımlı mı, açılan klasör ilan edilmiş mi, bir Adım öncülü bitmeden başlamış mı. Ayrışma bir tanı olarak görünür ve tanının ağırlığı kanonda yazılıdır. Editör eklentisi bu tanıları panellerde gösterir, komut satırı aynı hükmü verir, MCP sunucusu aynı grafı ajana açar. Üç yüz de aynı kaynaktan türediği için ikinci bir gerçek doğmaz.

Sarmal kaynak kodun yerine geçen bir programlama dili değildir ve kod üretmez. Sürüm denetimine rakip değildir: Git satırın tarihini tutar, Sarmal aynı değişikliğin plan düzeyindeki anlamını. İş takip aracına rakip değildir: iş listesi tutmaz, işin beyanla tutarlılığını ölçer.

## Dört eksen

Bir plan dört eksende yazılır ve katı üretim omurgası `ÇalışmaAlanı → Proje → Faz → Blok → Katman → AltKatman → Adım → üretir → Meyve → dosya` zinciridir. Faz zamandır ve bir mevsimi ya da halkayı adlandırır. Blok iştir; bir Blok tek bir kimlik taşır ve mevsimler arasında sürebilir. Katman teknolojidir ve bir Takıma ya da Teknolojiye bağlanır; AltKatman o teknolojinin içindeki konu modülüdür. Adım akıştır ve en küçük yürütme birimidir: görevini, kabul ölçütünü, sınırını, dayandığı kararı ve ürettiği Meyveyi beyan eder; bağımlılığı yalnız `bağımlı` kenarıyla ve yalnız Adımdan Adıma yazılır. Meyve teslimdir ve dosya-zorunlu türlerde diskte çözülen bir yol taşır. Bu zincir dışında kalan her şey (kararlar, kurallar, sözleşmeler, etmenler, hatırlatıcılar, durum kayıtları) aynı grafta düğümdür ve Adımlar onlara kenarla bağlanır. Esnek rejim bilinçli bir istisnadır; gerekçesi açık yazılır.

## Kapı

Sarmal'ın kendi disiplini iki ayrımdan doğar. Birincisi üretici ile denetçinin ayrılığıdır: bir Adımı yapan el onu kabul edemez, kabul ölçütü bağımsız ölçülür ve sayısal iddia ölçülmeden kabul edilmez. İkincisi kanıt şartıdır: bir Adım kapanırken koşu kaydı ve teslim kenarı ister; kanıt olmayan kapanış tanı olarak görünür. Kanon 157 maddeden oluşur ve yalnız `yasa/kanon/` altındaki sekiz bölümde yaşar; her maddenin bir zorlama paragrafı vardır ve o paragraf hangi tanının maddeyi makineye zorlattığını söyler. Tanı sicili 47 hata, 16 uyarı ve 11 bilgi düzeyi taşır: hata bloklar, uyarı yerelde geçer fakat sürekli tümleştirmede kırmızıdır, bilgi yalnız gösterir. Kanonun iddia edip motorun zorlamadığı bir madde bir borçtur ve o borç da planda bir Adım olarak yaşar.

Ajan tarafında kapı ŞEF mekanizmasıdır. ŞEF bir Adımın konisini toplar, ajana verir, dönen çıktıyı sözleşmeye vurur ve mührü atar; ajan planı doğrudan değiştirmez, yalnız Adımın durumunu tek yazım kapısından ilerletir. Böylece bir ajanın yaptığı iş her zaman bir Adıma, o Adım bir Bloka ve Blok bir mevsime bağlı kalır.

## Sınır

Sarmal 157 maddelik bir kanonla ağır bir dildir ve bunu gizlemez; değeri üçüncü haftada, bir kararın gerekçesini ararken ya da drift yakalandığında hissedilir. Tatlı noktası uzun ömürlü, az kişiyle yürüyen, kararı yoğun ve işin çoğunu ajanların yaptığı projelerdir; büyük ekiplerin monorepolarında olgun araçlar vardır ve Sarmal ikinci bir gerçek kaynağı olur. Dilin yüzü bilinçle Türkçedir: anahtar sözcükler, tanılar ve kanon Türkçe yazılır, eklenti ile MCP metinleri iki dillidir; İngilizce eş anlamlı anahtar sözcükler ikinci sürümün kararıdır.

Sarmal Apache-2.0 ile açıktır. Sarmal ile yönetilen ayrı bir kapalı ürün vardır; açık dilin belgesi o ürünün içeriğini taşımaz. Bu ayrım, açık dilin kendi etmenini yazma yeteneğini kapsamasına engel değildir: Etmen, Beceri, Tetikleyici ve sef açık araç zinciridir.
<!-- SARMAL:URETILEN:KOK-NEDIR:SON -->
