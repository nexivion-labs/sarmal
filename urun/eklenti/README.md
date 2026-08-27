<!-- SARMAL:ELLE-KORUNAN:BAS -->
# Sarmal

Sarmal, bir projenin klasör hiyerarşisini, planını ve kurallarını bildirimsel .sar dosyalarıyla tanımlayan bir dildir. Kod üretmez, niyet üretir. Siz mimariyi ve işi ilan edersiniz; motor, ilan ile diskin birbirinden sapıp sapmadığını her kayıtta denetler ve sapmayı Türkçe gerekçeli tanılarla önünüze koyar. Böylece plan bir sunum belgesi olmaktan çıkar ve projenin yaşayan, denetlenen tek gerçeği hâline gelir.

Bu eklenti, Sarmal dilini Visual Studio Code içinde eksiksiz bir dil deneyimine dönüştürür. Sözdizimi renklendirmesi ve anlamsal vurgu, belge anahattı, katlama, imza yardımı, kanondan beslenen tamamlama, kaydette biçimleme ve tıklanarak açılan referans yolları kurulumla birlikte gelir. Denetim bulguları editörün kendi Sorunlar paneline düşer; yüz yetmişi aşkın tanının her biri Türkçe ve İngilizce gövde taşır, yalnız kusuru söylemekle kalmaz, çözüm yolunu da tam cümlelerle anlatır.

Editörün yan yüzeyleri planı görünür kılar. Yol Haritası paneli fazları, blokları ve adımları durumlarıyla listeler; Mini Graf bağımlılık iskeletini çizer; Onaylar paneli karar bekleyen kapıları toplar; Hatırlatıcılar ve Gözlemler panelleri motorun nöbetlerini insan diliyle aktarır. Durum çubuğu bu yüzeylerin sayaçlarını taşır ve tip sistemi kaydı bulunamadığında gömülü taban kanonla çalışıldığını açıkça söyler; hiçbir düşüş sessiz değildir.

Renk konusunda ilkemiz nettir: eklenti size hiçbir renk dayatmaz. Dilbilgisi yerleşik kapsam adları ürettiği için kurulum anında sizin kendi temanız Sarmal kaynağını boyar. Kanonun kendi paletini isteyenler için Sarmal Koyu ve Sarmal Açık temaları pakette hazırdır ve tema seçicisinden tek tıkla gelir; Kuzey Yıldızı ürün simgesi teması da aynı ailenin parçasıdır.

Sarmal tamamen yereldir. Eklentinin çalışma zamanı bağımlılığı sıfırdır, hiçbir ağ çağrısı yapmaz ve hiçbir veriyi dışarı taşımaz; bu iddia beyan değil ölçümdür ve gizlilik politikasında okuyucunun kendisinin tekrarlayabileceği bir yöntemle anlatılır. Yapay zekâ ajanlarıyla çalışanlar için Sarmal çekirdeği on sekiz araçlık bir MCP sunucusu taşır; ajanlar planı bu araçlarla okur, adımların bağlamını şeften alır ve durumu tek yetkili kapıdan ilerletir. Sarmal, Apache 2.0 lisansıyla yayımlanır ve Nexivion Labs tarafından geliştirilmektedir.
<!-- SARMAL:ELLE-KORUNAN:SON -->

<!-- SARMAL:URETILEN:EKLENTI-README:BAS -->
<!-- SARMAL:DIATAXIS How-To -->
<!-- SARMAL:GOREV:TAM -->
## Görev: eklentiyi çalıştırıp bir çalışma alanını denetlemek

1. `cd urun/eklenti && npm install` ile geliştirme bağımlılıklarını kurun.
2. `npm run build` ile eklenti tip kapısını çalıştırın.
3. Editörde depo kökünü (F5 yapılandırması `.vscode/launch.json` dosyasındadır) ya da `urun/eklenti` dizinini açıp geliştirme ana bilgisayarını başlatın.
4. Bir `.sar` dosyası açın; sorunları Problems, gözlemleri Bildirimler (Gözlemler), ileri bağlamı Hatırlatıcılar yüzünde izleyin.
5. Onay gerektiren bir eylemi **ONAYLAR** panelinden değerlendirin.

Eklenti manifesti ve karşılama yüzü Türkçe/İngilizce haneler taşır. Tanı metinlerinin 173'i ve 18 MCP aracının açıklamaları da iki dillidir. Yeni tanı dağılımı 46 hata, 16 uyarı ve 11 bilgidir; sabit yönlendirme matrisi 142/4/28 olarak ölçülür.

Sarmal Apache-2.0 lisanslıdır. Lisans bildirimi [LICENSE.md](LICENSE.md) dosyasındadır.
<!-- SARMAL:URETILEN:EKLENTI-README:SON -->
