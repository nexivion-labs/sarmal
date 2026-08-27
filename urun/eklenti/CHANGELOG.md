# Değişiklik Günlüğü — Sarmal

Bu eklentinin kayda değer değişiklikleri burada tutulur.

## 0.9.161 — 2026-08-27 (dört panelin de kendi sayısı görünür)

- **Hatırlatıcılar, Gözlemler ve Fikirler artık sayı rozeti taşıyor.** Founder hükmü: rozet bugüne dek yalnız Onaylar panelinde vardı ve komşu üç panel sayısını yalnız durum çubuğunda söylüyordu, dolayısıyla bir panelin dolu mu boş mu olduğu ancak o panel açılarak öğreniliyordu. Sayı her panelin kendi listesinden ve durum çubuğunun okuduğu aynı kaynaktan türer; ikinci bir sayaç kurulmadığı için rozet ile durum çubuğu çelişemez. Bir panel boşaldığında rozeti tümüyle kaybolur: boş panelde sıfır yazan bir rozet sürekli bir işaret gibi durur ve dikkat çekmesi gereken sayıları değersizleştirir.
- **Rozet rengi panel başına ayrılamıyor ve bu ölçülmüş bir sınırdır.** Editör bildirimindeki rozet arayüzü yalnız gösterilecek sayıyı ve ipucu metnini taşır; renk alanı yoktur ve rozet rengi tema düzeyinde tek bir değerden gelir. Panelleri ayıran şey bu yüzden renk değil, rozetin yanındaki panel adı ile her rozetin kendi ipucu cümlesidir. Dört ipucu ayrı yazıldı ve her biri neyi saydığını söyler.
- **Rozet kararı tek kaynağa bağlandı.** Dört panel de aynı karara sorar; ikinci bir rozet yazımı kurulsaydı biri sessizce bayatlar ve bir panelin sayısı ötekiyle çelişirdi.

## 0.9.160 — 2026-08-27 (paneller çatıda bütün çalışma alanını gösterir)

- **Kapsam süzgeci artık eşitlik değil kapsama soruyor.** Kusuru Founder canlı pencerede buldu: çatı seçiliyken Hatırlatıcılar, Gözlemler ve Fikirler panelleri boşalıyordu. Sebep ölçüldü; süzgeç dosyanın varlık kökü ile odaktaki kökü birebir karşılaştırıyordu ve iç içe bir çatı düzeninde alt projelerin hiçbir dosyası bu sınavı geçemiyordu. Kural artık kapsama ilişkisidir ve tek yönlüdür: odaktaki kökün altında yaşayan her varlık görünür, üstünde ya da yanında yaşayan görünmez. Böylece çatı bütün çalışma alanını, bir alt proje yalnız kendi evini gösterir. Ters yön bilerek kapalı bırakıldı, çünkü açılsaydı bir alt projede çalışırken kardeş projelerin kayıtları da panele dolar ve odağın kendisi anlamsızlaşırdı.
- **Onaylar paneli de aynı süzgeçten geçiyor.** Ölçüm, kapsam kapısının eklenti gövdesinde yedi yerde çağrıldığını ama onay kuyruğunda hiç çağrılmadığını gösterdi; panel bu yüzden hangi varlık seçili olursa olsun bütün çalışma alanını listeliyor ve kullanıcı komşu panellerle çelişen iki tablo görüyordu. Kuyruk artık öteki üç yüzeyin okuduğu odak kapısına bağlıdır ve odak değişince yeniden yerleşir; ikinci bir zamanlayıcı kurulmadı, çünkü tarama zaten ana tanı hattının anlık görüntüsünden beslenmektedir.
- **Kapsama kuralı tek evde yaşıyor.** Kural yol haritasındaki varlık kümelerini kuran çekirdekte zaten vardı; ikinci bir kopya yazmak yerine o işlev adıyla dışa verildi ve yol ayırıcılarını eşitleyecek biçimde genişletildi. Ad benzerliği taşıyan kardeş bir kökün kapsanan sayılmadığı bir nöbetle kanıtlanır.

## 0.9.159 — 2026-08-27 (adsız satırda kod olduğu gibi kalır)

- **Adı olmayan düğümün kodu artık başlık düzenine sokulmuyor.** Kusuru Founder canlı pencerede buldu: `YTK-A01` gibi adsız bir düğüm Yol Haritası satırında `Ytk A01` görünüyordu, çünkü başlık dönüşümü ad bulunamayınca kodun kendisine uygulanıyordu. Hüküm şudur: dönüşüm yalnız ada uygulanır; kod bir kimliktir, başlık değildir ve yüzeyde olduğu gibi yazılır. Yüzey adı çekirdekte tek kapıdan alınır ve adsız düğümün kodunun aynen kalması sekiz sınamalık bir nöbetle kilitlenmiştir; nöbet, eski yazım geri konduğunda kırmızıya döner.

## 0.9.158 — 2026-08-27 (yol haritası kodu değil adı gösterir)

- **Panel artık kod yazmıyor.** Varlık satırları `PRJ-SARMAL · sarmal` yerine yalnız `Sarmal` diyor: kod makinenin kimliğidir, tip zaten ikonla söylenir ve geliştiricinin satırda okuduğu tek şey addır. Kod kaynakta yerinde durur.
- **Adlar Türkçe başlık düzeninde.** Her sözcüğün ilk harfi büyük, bağlaç ve edatlar küçük; kimlik yazımındaki tire ve alt çizgi sözcük ayracı sayılır, böylece `nexivion-labs` yüzeyde `Nexivion Labs` olur. Büyütme yerel duyarlı yapılır, çünkü varsayılan büyütme Türkçe'de i ile ı ayrımını bozar.
- **Faz'ın zaman bilgisi adın içinden çıktı.** Tarih artık `hedefTarih` alanından türer ve satırın kenarında gün ile ay olarak durur; yıl yalnız içinde bulunulan yıldan farklıysa yazılır. Böylece başlık kısalır, ilerleme sayacı kırpılmaz ve elle yazılmış bir ay adı alanla çelişemez.

## 0.9.156 — 2026-08-25 (yol haritasında mevsimler tarih sırasına dizilir)

- **Kardeş mevsimler artık ad ya da dosya sırasıyla değil tarih sırasıyla dizilir.** Kusuru Founder canlı pencerede buldu: kök proje altında yedi mevsim listeleniyordu ve sıra ne takvimi ne de ilanı yansıtıyordu, çünkü panel mevsimleri Adım grafının rütbesi ve dosya yoluyla, motor ise aynı dosyadaki kardeş mevsimleri satır sırasıyla diziyordu. Hüküm şudur: zaman ekseni tarihten türer. Motor kardeş Fazları `hedefTarih` beyanına göre zincirler, ay hassasiyetli beyan ay sonu sayılır, tarihsiz mevsim dizilişin sonuna düşer ve eşit tarihte kaynak sırası kazanır; panel aynı anahtarı motordan okur ve ikinci bir çeviri yazmaz. Koruma çekirdek süitinde bir nöbetle kuruldu: dosyada geç yazılan erken mevsim önce gelir, tarihsiz mevsim tarihli olanların arkasına düşer.

## 0.9.155 — 2026-08-25 (çalışma alanı satırı kendi istasyon simgesini taşır)

- **Kapsayan ile kapsananın simgesi ayrıştı.** Founder canlı bakışta çalışma alanı satırının projelerle aynı sefer simgesini taşıdığını gösterdi; küme kimliği simgede de ayrışmalıdır. Geometrik satır ailesine istasyon simgesi katıldı: çatı örtüsü altında kapsanan iki birim. Tren dili korunur — lokomotifler istasyonun çatısı altında yaşar: çalışma alanı satırı istasyonu, proje ile uygulama satırları seferi taşır. Seçim tipe bağlı saf bir işlevden okunur ve nöbetle korunur; satır ailesinin sayı ve tekillik nöbetleri yirmi simgelik yeni gerçeğe bağlandı.

## 0.9.154 — 2026-08-24 (yol haritasında varlıklar birbirini kapsayan kümeler gibi görünür)

- **İç içe varlıklar artık kökte kardeş gibi düz listelenmez.** Kusuru Founder canlı pencerede buldu: bir çalışma alanı ilanı başka projeleri klasör olarak kapsadığı hâlde panel kökünde kapsayan ile kapsanan yan yana dört ayrı satır olarak duruyordu. Hüküm şudur: varlıklar birbirini kapsayan kümeler gibi görünür. Panel artık varlık kökleri arasındaki kapsama ilişkisini kurar; kökte yalnız kapsayıcı durur, kapsanan projeler onun altına katlanabilir üyeler olarak iner ve kapsayıcı satır kaç projeyi sardığını açıklamasında söyler. Dosyaların hangi varlığa ait olduğunu bulan çözüm değişmemiştir; yalnız varlıkların birbirini kapsaması ağaca inmiştir.
- **Aktif varlık nabzı iç içe köklerde en derin kümeyi seçer.** Önceki davranış listede ilk eşleşen varlığı aktifliyordu ve iç içe köklerde yanlış kümeye vurabilirdi; çözüm en uzun önek eşleşmesine çevrildi. Küme ilişkisi editör eklentisinden bağımsız saf bir çekirdeğe ayrıldı ve beş sınamalık bir nöbetle korunur; koruma iki yönde bilerek bozularak kanıtlanmıştır: ilişki kurulumu söküldüğünde ve derin seçim ilk eşleşene düşürüldüğünde süit kırmızıya döner.

- **Otuz anlamsal renk kuralı paketin varsayılan ilanından söküldü.** 0.9.149 sürümü dizgi renklerinin dayatmasını kaldırmıştı, buna karşılık anlamsal simge renkleri varsayılan ilanla gelmeye devam ediyordu ve bu kurallar ekrana gerçekten ulaştıkları için seçtiğiniz temanın renklerini eziyordu. Hüküm şudur: renk dayatılmaz ve tam görünüm temayla gelir. Kurulumdan sonra hiçbir şey yazmazsanız Sarmal kaynağını kendi temanız boyar, çünkü dilbilgisi yerleşik TextMate kapsam adları üretir ve anlamsal simgeler o adlara köprülüdür; kanonun kendi paletini isteyen kullanıcı için otuz rengin tamamı iki Sarmal temasında yaşar ve tema seçicisinden tek tıkla gelir. Paleti temaya bağlanmadan kendi çalışma alanına sabitlemek isteyen kullanıcı için giydir komutu açık bir yol olarak durur.
- **Anlamsal vurgunun küresel zorlaması da kalktı.** Paket bugüne kadar anlamsal vurguyu bütün diller ve bütün temalar için varsayılan yoluyla açıyordu; bu tercih temaya aittir ve iki Sarmal teması onu kendi gövdesinde taşır. Sökümün geri dönmemesi üç nöbetle korunur ve üçü de koruma bilerek bozularak kanıtlanmıştır: renk ya da vurgu anahtarlarından biri pakete geri konduğunda süit kırmızıya döner, anlamsal tablo bu deponun kendi tercih dosyasından silindiğinde de döner.

## 0.9.151 — 2026-08-23 (durum kaydının boyut sınırı emekli oldu, panel köken süzgecine geçti)

- **Durum kaydının yedi bin karakterlik boyut sınırı kaldırıldı.** Founder hükmü verdi, çünkü proje büyüdükçe kayıpsız oturum devri sınıra sığmıyor ve sınır anlatıyı kırpmaya zorluyordu; çapraz harita bu tanıyı yeni kanonda zaten emekli ilan etmişti ve motor emekli bir hükmü zorlamayı sürdürüyordu. Bekçi ve sınaması motordan söküldü, durum-boyutu tanısı usulüyle emekli listesine indi ve türetilmiş yüzler tek turda tazelendi. Kusuru Founder canlı pencerede buldu: kaynak düzeldiği hâlde kurulu paket eski bekçinin derlenmiş kopyasını taşıdığı için uyarı sönmemişti; bu sürüm motoru güncel hâliyle paketler ve uyarı söner.
- **Sorunlar panelinin süzgeci tanı kimliğinden üretici kökenine geçti.** Bağımsız denetim şu sızıntıyı ölçmüştü: aynı tanı kimliği iki ayrı üreticide yaşayabildiği için, yalnız komut satırına ayrılmış bir üreticinin uyarısı panele sızabiliyordu. Denetim gövdesi artık her tanıyı doğduğu üreticinin adıyla damgalar ve panel yalnız ilanda panel yüzeyi taşıyan üreticilerin tanılarını geçirir; kapsam ilanındaki elle tutulan tanı kimliği listeleri de tümden söküldü, ilan yalnız üretici ve yüzey taşır. Nöbet süiti sınır ve sızıntı sınamalarıyla genişledi ve iki mutasyonla kanıtlandı.

## 0.9.150 — 2026-08-23 (paketlenmiş motor iki yeni kanon maddesine yetişti)

- **Kanonun iddiasıyla ürünün bilgisi yeniden aynı hizaya geldi.** Kusuru Founder canlı pencerede buldu: Sorunlar paneli, kanonun ORK-3.4 ve YUZ-3.4 maddeleri için "bu hükmün motorda karşılığı yok" diyen iki hata gösteriyordu, oysa aynı denetim kaynaktan koşturulduğunda sıfır hata veriyordu. Ölçüm sebebi açıkça gösterdi: kurulu paket, iki kanon maddesi yazılmadan önce derlenmişti ve kendi taşıdığı tanı sicili eskiydi. Bu sürüm motoru güncel sicille paketler; iki hata söner ve iki yeni gözlem kapısı, yani öncelik beyanı taşımayan Adım ile beklediği iş bittiği hâlde açık duran hatırlatıcı, kullanıcının kendi projesinde de çalışmaya başlar.
- **Aynı kusurun sessizce dönmemesi için bir nöbet kuruldu.** Tanı üçlüsünün dördüncü bir kopyası olduğu, yani paketlenmiş gövdenin üçlünün donmuş bir fotoğrafını taşıdığı ve bu fotoğrafın bayatlayabildiği bu turda kayda geçti. Yeni nöbet, derlenmiş gövdenin motor sicilindeki yüz yetmiş dört kimliğin tamamını taşıdığını ve gövdenin sicil kaynağından eski olmadığını ölçer; bayat gövde yerine konularak kırmızıya döndüğü ve eksik iki kimliği adıyla söylediği gösterildi.

## 0.9.149 — 2026-08-22 (kanon ilandan bulunur, renk dayatılmaz)

- **Tip sistemi kaydı artık sabit klasör adıyla değil ilanla bulunuyor.** Eklenti kanonu bugüne kadar `_Sarmal` adını sabit varsayarak arıyordu; adı farklı olan ya da başka bir yerde yaşayan bir varlıkta arama sonuçsuz kalıyor ve eklenti sessizce gömülü taban kanona düşüyordu. Keşif artık varlık kökünü `*_anadizin.sar` ilanından bulur, belgenin bulunduğu ağaçtan yukarı yürür ve ilan edilmiş adayı ilansız klasöre tercih eder. İlanını henüz yazmamış bir depo da kanonsuz kalmaz, çünkü ilan araması sonuçsuz kalırsa bugünkü tek depo düzenini bulan son çare taraması devreye girer.
- **Sessiz düşüş sona erdi.** Kayıt gerçekten bulunamadığında durum çubuğunda uyarı zeminli görünür bir işaret belirir; ipucu sebebi ve çözümü tam cümlelerle söyler ve kanon bulunduğu anda işaret kendiliğinden kaybolur. İşin akışını kesen bir iletişim kutusu bilinçli olarak seçilmedi, çünkü kutu kapandıktan sonra durumu hiçbir yerden okuyamazsınız.
- **Biçim tercihleri pakete indi.** Satır kaydırma sütunu, sarma girintisi ve kılavuz çizgi tercihleri artık eklentinin kendi ilanından gelir; kurulumdan sonra hiçbir şey yazmayan kullanıcı da aynı biçimi görür. Kendi ayarınız her koşulda üstündür ve bir değer yazdığınızda varsayılan geri çekilir.
- **Renk artık dayatılmıyor.** Eklenti hiçbir dizgi rengini yapılandırmanıza sokmaz. Dilbilgisi yerleşik TextMate kapsam adları üretir ve anlamsal simgeler o adlara köprülenir, dolayısıyla **kendi temanız** Sarmal kaynağını kurulum anında boyar. Kanonun kendi paletini isteyen kullanıcı için iki Sarmal teması pakette hazır bekler ve tema seçicisinden tek tıkla açılır, tek tıkla kapanır.
- **Mini Graf artık mevsim bağını çiziyor.** Bir Blok fiziksel atası olmasa bile bağlandığı Faz'ın altında gruplanır ve bağ kapsama rayıyla görünür. Ölçüm on sekiz mevsim bağının tamamının grafa indiğini, kök sayısının kırk yediden yirmi dokuza düştüğünü gösterdi; köksüz kalan beş Blok'un tamamı mevsim beyan etmeyen ders ve örnek gövdeleridir.

## 0.9.148 — 2026-08-16 (panel metinleri gözle doğrulama turundan geçti)

- **Dört panelin boş durum cümleleri kısaldı ve "siz" üslubuna döndü.** Founder canlı incelemede boş panel açıklamalarının anlaşılır olmadığını bildirdi; cümlelere gömülü ham sözdizimi örnekleri dar panelde kod yığınına dönüyor ve okuyan neyin cümle neyin kod olduğunu ayıramıyordu. Yeni cümleler panelin ne olduğunu ve ne zaman dolacağını birkaç cümlede söyler; sözdizimi örneği metinden çıktı, Türkçe metinde İngilizce yüzey adı geçmez ve düzeltme gerektiren sapmaların gittiği yer ekrandaki adıyla Sorunlar sekmesi olarak anılır. İngilizce sürümler kendi içinde temiz İngilizcedir. Boş durum cümlesinin yapıştırılabilir örnek taşıması hükmü aynı tarihle emekliye ayrıldı ve beş nöbet yeni hükme çekildi.
- **Kullanıcıya dönük bütün cümleler "siz" üslubuna çevrildi.** İpucu kapanış cümleleri, kopyalama uyarısı, kapı ipuçları, mercek ipucu ve mini graf ipuçları dahil olmak üzere kullanıcının okuduğu hiçbir cümle artık sen diliyle konuşmaz. Süit beş yüz on yedi sınamayla yeşildir.
- **Aynı vardiyada VIT-GRAF-A13 zinciri kapandı.** Founder yedi kabul maddesini canlı pencerede tek tek doğruladı; tur iki ardıl iş doğurdu ve bunlar plana VIT-GRAF-A17 (üzerine gelince görünen kopyalama düğmesi) ile VIT-GRAF-A18 (ipucu anlatımının ıslahı) olarak indi.

## 0.9.147 — 2026-08-11 (paketlenmiş motor Katman göçüne yetişti)

- **Katmansız-teknoloji bekçisi artık kanonik kullanır kenarını okuyor.** Kaynak tarafında seksen dört Katman kanonun emrettiği kullanır yazımına göçünce, bir önceki sürümün paketlediği motor bu kenarı tanımadığı için göçen her Katman'ı teknolojisiz sanıp Sorunlar paneline altmış üç sahte uyarı bastı; kusuru Founder canlı pencerede buldu. Bu sürüm motoru güncel bekçiyle paketler: kullanır asıl yoldur, bağımlı yazımı geçiş yedeğidir ve graf çekirdeği kullanır kenarını zemin kaydına indirir. Sahte uyarılar söner; gerçekten teknolojisiz kalan Katman uyarı almaya devam eder. Ders kayda geçti: motor davranışını değiştiren her işleme, kurulu eklentinin aynı vardiyada paketlenip kurulmasını ister, aksi hâlde iki motor aynı kaynağa iki farklı hüküm verir.

## 0.9.146 — 2026-08-10 (düz yazı tonu geri alındı)

- **Bir önceki sürümün düz yazı tonu katmanı söküldü.** Founder canlı görünümde uzun anlatı dizgilerinin okunamaz hâle geldiğini bildirdi; seçilen açıklama tonu koyu temada fazla soluk kalıyordu ve asıl şikayet kaynak boyaması değil okuma modunun görünümüydü. Katman, ayarı ve dil girdileriyle birlikte tamamen kaldırıldı; kaynak dizgileri yeniden tema renginde çizilir. Ders kayda geçti: okunurluğa dokunan bir değişiklik kullanıcının kendi temasında gözle doğrulanmadan kurulmamalıdır.

## 0.9.145 — 2026-08-10 (turuncu duvar söndü — uzun anlatı sakin tona indi)

- **Uzun anlatı dizgileri artık temanın sakin açıklama tonunda çiziliyor.** Founder canlı görünümde kaynağın turuncu bir metin duvarına döndüğünü bildirdi: ne, görev ve koşu gibi alanların uzun metinleri temanın dizgi renginde boyanınca kod ile anlatı ayırt edilemiyordu. Yeni katman altmış dört karakteri aşan dizgi gövdelerini ve üç tırnaklı blokları açıklama tonuna indirir; tırnaklar, kısa kimlik dizgileri, tip adları ve anahtar kelimeler tema renginde vurgulu kalır. Böylece göz kimliği bir bakışta seçer, anlatıyı isteyince okur.
- **Katman kapatılabilir.** Ayarlardan duz yazı tonu kapatıldığında bütün dizgiler yine tema renginde çizilir; eşik ve kapsam kararı sürüm notunda değil kaynak dosyanın kendi başlığında gerekçesiyle yazılıdır.

## 0.9.144 — 2026-08-10 (okuma modundaki yapı ağacı sıklaştı)

- **Yapı ağacı bloğundaki boş satırlar kaldırıldı.** Founder canlı görünümde bloğun seyrek ve çirkin durduğunu bildirdi; ölçüm kanon dosyasında elli dört satırın yirmi yedisinin boş olduğunu gösterdi, çünkü üreteç iç içe olmayan dosyalarda her düğümden sonra boş satır basıyordu. Önizleme artık çizimi sıkıştırarak çizer; üretecin kendisine dokunulmadı, çünkü komut satırı çıktısındaki ferahlık bilinçli bir tercih olabilir ve o karar ayrı bir kapının işidir.

## 0.9.143 — 2026-08-10 (okuma modu artık dışarıdan değişen dosyayı da görüyor)

- **Okuma modundaki önizleme, editör dışından değişen dosyada bayat kalmıyor.** Kusuru Founder canlı kullanımda buldu: bir ajan aracı ya da git işlemi dosyayı değiştirdiğinde önizleme eski görüntüyü göstermeye devam ediyordu, çünkü tazeleme yalnız editör içi yazım olayına bağlıydı ve gizlenen sekme eski çizimini saklıyordu. İki kapak eklendi: dosyanın kendisine bir disk izleyicisi bağlandı ve dışarıdan gelen her değişiklik taze çizim tetikliyor; sekme yeniden görünür olduğunda da çizim tazeleniyor.
- **Kaydedilmemiş değişiklik yoksa gerçek artık diskten okunuyor.** Belge nesnesi dışarıdan değişen dosyada tazelenmemiş olabiliyordu; önizleme, belgede kaydedilmemiş değişiklik varsa editör metnini, yoksa diskteki gerçeği çizer ve iki durumun hangisinde olduğunu kendisi ölçer.

## 0.9.142 — 2026-08-09 (emekli karar komutları dürüstleşti, onay metinleri sadeleşti)

- **Emekli üç karar komutu artık yapmadığı işi vaat etmiyor.** Açıklamalar panelindeki karar yüzeyi bir Founder hükmüyle emekliye ayrılmış ve karar Onaylar panelinin içine taşınmıştı; buna karşılık komutların kullanıcıya görünen adları "Onayla", "Şerhle onayla" ve "Reddet" olarak kalmıştı. Bu adlar bir hüküm vaat ediyor, oysa komut çağrıldığında hiçbir kayıt yazılmıyor ve kullanıcı yalnız Onaylar paneline yönlendiriliyordu. Üç adın her biri artık kararın nerede verildiğini kendi cümlesinde söyler. Komut kimlikleri, görünüş kimliği ve denetleyici kimliği bilerek korunmuştur, dolayısıyla kullanıcının panel yerleşimi ve menü koşulları sıfırlanmaz.
- **Aynı üç komut komut paletinden kaldırıldı.** Palet, karar yazmayan bir onay girdisi sunduğu sürece kuyruk ile karar yüzeyi arasındaki ayrım kullanıcının gözünde yeniden bulanıklaşıyordu. Komutlar satır içi Açıklamalar menüsünde kimliğiyle yaşamaya devam eder; Founder'ın beğendiği satır içi yol sökülmemiştir.
- **Onay yüzeyinin kullanıcıya giden metinlerinden emoji çıktı; süpürge yüzeyin tamamını kapsıyor.** Bu yalnız bir görünüm tercihi değil, aynı zamanda bir doğruluk düzeltmesidir: metinler onay, şerh ve ret satırlarını emojileriyle tarif ediyordu, oysa panelin karar satırları 0.9.138 sürümünde emojiden vektörel simge ailesine geçmişti; yani yardım metni artık var olmayan bir arayüzü anlatıyordu. Yardım ve yönlendirme metinlerinin yanında karar yazıcısının bütün durum ve hata iletileri de sadeleşti: karar zaten işlenirken gelen ikinci tıklama, kimlik çakışması, düzenlemenin uygulanamaması, diske yazılamama, bellekte ve diskte doğrulanamama, belgenin ayrıştırılamaması, ekleme noktasının doğrulanamaması ve bağlamın panoya kopyalanması. Bu iletiler zaten kendi düzey simgesiyle çizilen bir bildirim penceresinde görünüyor; metnin başındaki emoji ikinci ve yürütücüden yürütücüye değişen bir düzey işaretiydi.
- **DÜRÜST SINIR — tek istisna ve gerekçesi.** Satır sonundaki yanıp sönen onay süsü bu turda değiştirilmedi ve emojisini koruyor. Sebebi ölçülmüştür: o süs geribildirim yüzeyindeki ikiziyle aynı desenin iki yarısıdır ve yalnız birini değiştirmek iki yüzeyi ayrıştırırdı. İkisi birlikte ayrı bir işte ele alınacaktır. İstisna kaynakta adıyla yazılıdır ve bir nöbet hem tek olduğunu hem de hâlâ gerçek bir şeyi koruduğunu ölçer; süs emojiden arındığı gün istisnanın kendisi de silinmek zorunda kalır.
- **Kuralı koruyan nöbetin erişimi metin kataloğunun tamamına açıldı.** Önceki hâlinde nöbet elle seçilmiş bir avuç metni ölçüyordu, oysa adı yüzeyin tamamını iddia ediyordu; bu boşlukta yarın eklenen emojili bir metin denetimden geçebilirdi. Nöbet artık kaynaktaki iki sınır işareti arasındaki her metni süpürür ve onay modüllerine gömülmüş bir dizgenin katalogdan kaçmasını da ayrıca ölçer.

## 0.9.141 — 2026-08-09 (Fikirler kendi paneline taşındı)

- **Fikirler artık kenar çubuğunda kendi panelinde yaşıyor.** Hane 0.9.138 sürümünde Hatırlatıcılar panelinin içinde bir bölüm olarak açılmıştı ve yerleşimin geçici olduğu 0.9.140 sürümünün notunda yazılıydı. Yerleşim canlı görünümde ölçüldü: canlı rafa yazılan iki gerçek Fikir panelde bulunamadı, çünkü ikisi de yirmi dokuz hatırlatıcı kaydının altında kalmıştı. Fikir kendi başına bir düşünce evresidir ve başka bir tipin penceresine misafir edilmez; bu yüzden hane kendi görünüşünü, kendi simgesini ve kendi adını kazandı.
- **Panelin beslendiği yol değişmedi.** Kayıtlar yine denetim turunun zaten ürettiği ayrıştırma sonucundan okunur, dosya başına deftere yazılır ve tur sonunda tek kez çizilir; ikinci bir tarama, ikinci bir dosya okuması ve ikinci bir sayaç kurulmadı. Kapsam süzgeci de komşu panellerle aynı kaldı, dolayısıyla bir varlık gizlendiğinde iki panel çelişkili tablo göstermez.
- **İki panel de artık kendi boşluğunu kendi cümlesiyle anlatıyor.** Hatırlatıcılar panelinin boşluk ölçüsü iki haneyi birlikte sayıyordu; hane taşınınca ölçü yalnız hatırlatıcılara döndü ve yeni panel kendi boş durum cümlesini kazandı. Cümle Fikrin ne olduğunu, dönüş tetikleyicisinin neyi söylediğini ve olgunlaşan bir Fikrin Karar'a yükseldiğini anlatır; ayrıca kullanıcıya olduğu gibi yapıştırabileceği bir satır verir.
- **Durum çubuğu artık Fikirleri de kendi adıyla sayıyor.** Sayı yine panelin kendi listesinden türetilir ve ikinci bir sayaç tutulmaz; girdiye tıklandığında Fikirler paneli açılır.

## 0.9.140 — 2026-08-08 (yanlış bir sürüm notu düzeltildi)

- **Bir önceki sürümün Fikir yüzeyi notu yanlıştı ve düzeltildi.** Not, Fikir düğümlerinin artık panelde göründüğünü söylüyordu; oysa bağımsız denetim aynı gün bunun tersini ölçmüştü, çünkü ağaçtaki bütün Fikir düğümleri örnek rafında yaşıyor ve o raf panellerin kapsam dışı evrenindedir. Paneli açıp boş gören kullanıcı haklı olarak eklentiyi kusurlu sanabilirdi. Notun düzeltilmiş hâli yüzeyin kurulduğunu, buna karşılık ancak canlı bir rafa gerçek bir Fikir yazıldığında dolacağını açıkça söyler.
- **Ders kayda geçti.** Kullanıcıya giden sürüm notu ile teslimin kabul kanıtı arasında bugün hiçbir mekanik bağ yoktur; denetimin çürüttüğü bir iddia nota taahhüt olarak girebilmektedir. Bu boşluk hatırlatıcı kuyruğuna alındı ve notun ilgili işin kabul kanıtına bağlanıp bağlanmayacağı ayrıca karara bağlanacaktır.

## 0.9.139 — 2026-08-08 (öncelik kademeleri kanona indi)

- **Öncelik alanının anlamı artık kanonda yazılı.** Bir işin ne kadar acil olduğu bugüne kadar hiçbir yerde tanımlı değildi ve alan şemada durduğu hâlde hiçbir kayıt onu taşımıyordu; hüküm orkestrasyon bölümüne indi ve dört kademenin her birinin anlamı ölçülebilir biçimde yazıldı. En üst kademe yayını ya da başka bir işi fiilen bloklayan işi, ikincisi içinde bulunulan mevsimin işini, üçüncüsü sırasını bekleyen işi, dördüncüsü ise tarih taahhüdü verilmemiş işi gösterir.
- **İki tipin ayrı ayrı konuştuğu kademe kümesi tekleşti.** İş adımları büyük harfli üç kademe, hatırlatıcılar ise küçük harfli dört kademe tanıyordu; aynı kavramın iki biçimde yazılması aynı işin iki yüzeyde farklı aciliyette görünmesine yol açıyordu. Artık iki tip de aynı küçük harfli dörtlüyü kullanır ve emekliye ayrılan eski değerler tamamlama ile denetimden düşer.
- **Öncelik beyanı yürütme sırasını değiştirmez.** Bu sınır bilinçlidir ve hükümde açıkça yazılıdır: sıra yalnız iş grafından deterministik olarak türetilir, çünkü insan beyanının o hesabı bozması aynı plandan farklı koşumlar doğurur.

## 0.9.138 — 2026-08-08 (kurulu paket tazelendi, Fikir yüzeyi kuruldu)

- **Bu sürüm bir sürüm damgası borcunu kapatıyor.** Önceki numara 30 Temmuz'da damgalanmış, buna karşılık eklentiye 5 Ağustos'a kadar iş inmeye devam etmişti; yürütücü aynı numarayı taşıyan paketi tazelemediği için o iş kullanıcının editörüne hiç ulaşmadı. Bundan sonra her paketleme numarayı ilerletir, çünkü ölçüm bu tuzağın sessiz olduğunu ve geliştiriciyi yanılttığını gösterdi.
- **Fikir düğümleri için bir panel yüzeyi kuruldu.** Kanon Fikir'i taahhütsüz bir düşünce olarak tanımlıyordu, oysa yazılan fikrin görüneceği hiçbir yüzey yoktu; artık böyle bir yüzey vardır ve fikrin bekleme sebebi olan dönüş tetikleyicisi de okunabilir biçimde yüzeye çıkar. DÜRÜST SINIR: yüzey ancak canlı bir rafta gerçek bir Fikir düğümü varsa dolar. Örnek rafındaki Fikirler panellerin dışlama evrenindedir ve orada kalırlarsa görünmezler; dolayısıyla bölüm bugün boş açılabilir ve bu bir kusur değil, kapsam kuralının sonucudur. Yerleşim de geçicidir, çünkü Fikirlerin kendi panelini hak ettiğine hükmedilmiştir ve taşıma bir sonraki sürümde yapılacaktır.
- **İlan edilmemiş kaynak dosyası artık sessizce kabul edilmiyor.** Yapı-Önce hükmü bugüne kadar yalnız klasör düzeyinde zorlanıyordu; ilanlı bir rafın altına ilansız bir dosya konulduğunda motor onu görmüyordu. Yeni bekçi bu boşluğu kapatır ve şablon, örnek ile üretilen dosya raflarını yanlış yere düşürmez.
- **Onaylar panelinin arayüz işaretleri emojiden geometrik ikon ailesine geçti.** Emoji yürütücüden yürütücüye farklı çizildiği için panel yüzü tutarsız görünüyordu; otuz parçalık vektörel aile bu tutarsızlığı bitirir ve işaretler editörün kendi rengini alır.
- **Paketlenmiş eklentinin hiç açılamama kusuru kapandı.** Dosya yolları modül yüklenirken çözülüyordu ve paketleme sırasında boşalan bir değer yüzünden paket açılamıyordu; yollar artık ilk gerçek okumaya ertelenir ve üretilen içerik değişmez.

## 0.9.137 — 2026-07-30 (onay yazımı kanıtlandı, kapı beyana bağlandı)

- **Onay yazıcısı artık ekleme noktasını değiştirmeden önce doğruluyor.** Tırnaklı durum değeri, kaymış satır, aynı dosyada yinelenen kod ya da birleşik karakter düzeniyle uyuşmayan kaynak görülürse yazım güvenli biçimde durur; tahminle yanlış Adıma veya dizginin içine kayıt düşmez. Aynı koruma, tamamlandı geribildirimi yazan yüzeye de bağlandı.
- **Ayrıştırma sorunu artık kapanmış kapı ya da başarılı yazım gibi gösterilmiyor.** Bellek, yazım öncesi kaynak ve disk geri okuması ayrı ayrı kanıtlanır; belge okunamıyorsa kapı panelden sessizce düşürülmez ve kullanıcı dosyanın bozulmuş olabileceğini açıkça görür.
- **Onay kapıları serbest metin tahmininden kanonik beyana geçti.** Bir Adım `onayBekler: founder` taşıdığında kabul cümlesinin kalıbına bağlı olmadan Onaylar paneline girer, kararı yazılmışsa yeniden görünmez. Eski kabul cümleleri geçiş dönemi için okunmaya devam eder; böylece mevcut kapılar kaybolmaz.

## 0.9.136 — 2026-07-30 (Onaylar adı ve tutarlı panel yüzü)

- **ONAYLAR panelinin görünen adı kesinleşti.** Ad, Founder kararını bekleyen kapıları doğrudan söyler. Görünüşün iç kimliği bilerek korunmuştur, dolayısıyla kullanıcının panel yerleşimi sıfırlanmaz.
- **Gizlenip yeniden açılan panelde bayat sayı rozeti kalmıyor.** Önceden görünürlük değişimi yalnız gövdeyi yeniliyor, başlıktaki rozet eski sayıda asılı kalabiliyordu; rozet ile gövde artık aynı kurulum kapısından geçiyor ve aynı gerçeği gösteriyor.
- **Beş görünüşün başlığındaki yinelenen simgeler kaldırıldı.** Görünüşün kendi simgesi zaten aynı işi yaptığı için başlıkta ikinci bir simge kanalı tutmak gereksiz gürültü yaratıyordu; Yol Haritası, Hatırlatıcılar, Gözlemler, Onaylar ve Mini Graf aynı yalın başlık düzenine geçti.

## 0.9.135 — 2026-07-30 (Mini Graf hover yükü yarıya indi)

- **Yalnız zemin bağı taşıyan düğümler için çalışamayacak hover seçicileri artık üretilmiyor.** Zemin kenarlarının görünür olmasıyla her fare hareketinde değerlendirilen seçici sayısı 1.366'ya çıkmış ve editörde kasma hissi doğurmuştu; kural yürütme kenarına daraltılınca sayı 694'e indi. Gerçek bağımlılık vurgusu korunurken bu turun eklediği ölü maliyet kaldırıldı.
- **Tam grafın temel ölçek maliyeti dürüstçe açık bırakıldı.** Bu düzeltme hover yükünü önceki tabana döndürür; bütün çalışma alanını tek görünümde çizme kararı değişmediği için büyük grafların yeniden üretim maliyeti bu sürümde çözülmüş sayılmaz.

## 0.9.134 — 2026-07-30 (bağımlılık çizgileri yazıdan ayrıldı)

- **Bağımlılık eğrileri artık düğüm adlarının üzerinden geçmiyor.** Etiket merdiveni yazıları eğri koridoruna taşıyınca çizgiler özellikle Adım adlarıyla çakışmıştı; kavis sınırı etiket sütunundan türetilerek daraltıldı ve yazılara panel zemini renginde ince bir hale verildi.
- **İki koruma birlikte ölçülüyor.** Uzun bağımlılık atlamaları hem kavis tavanını hem de yazı halesini sınar; tema rengi ya da çizim sırası değişip okunabilirliği bozarsa nöbet bunu yakalar.

## 0.9.133 — 2026-07-30 (Mini Graf etiketleri hiyerarşiyi gösteriyor)

- **Blok, Katman, Adım ve Meyve adları artık tek sütunda düz liste gibi görünmüyor.** Mercekler kademeli olduğu hâlde bütün yazılar aynı noktadan başlıyordu; etiket konumu hiyerarşiden türetilerek beş sütunlu bir merdivene dönüştürüldü ve gözün düğümlerde gördüğü kademe yazıda da korundu.
- **Eksik meyve uyarıları genişlik uğruna kırpılmıyor.** İlk denemede alt yazının sonundaki “diskte yok” bilgisi kaybolduğu için bu yol geri alındı; grafın beyan ile gerçek arasındaki farkı söylemesi görsel sıkılıktan daha önemli kabul edildi.

## 0.9.132 — 2026-07-30 (meyve rayı ve zemin bağları Mini Grafa indi)

- **Bir Adımın ürettiği Meyveler artık Mini Grafta görünür.** Her Adım meyve sayısını sürekli gösterir, seçilen Adım ise meyvelerini altında açar; yüzlerce Meyveyi aynı anda çizip planı okunamaz kılmadan hiçbir üretim beyanı saklanmaz. Diskte bulunmayan Meyve, durum rengi uydurmak yerine boş cam ve kesikli çemberle ayrılır.
- **Katmanın Takım ve Teknoloji bağları yürütme bağı gibi çizilmiyor.** Bu ilişkiler sıra değil zemin kurduğu için yumuşak bağımlılık eğrisinden ayrılıp kesikli dirseğe geçti; yapraklara açılan 571 zemin bağı da kaynağının tipinden sınıflandırılarak yanlış yürütme kenarı olmaktan çıkarıldı.
- **Meyve varlığı doğru varlık kökünden ölçülüyor.** Köksüz bir belge açıldığında çalışma alanı köküne düşüp bütün Meyveleri “diskte yok” sayan ikinci odak kapısı kaldırıldı; yapışkan aktif varlık önce gelir. Meyve sayacı ve merceği de aynı kanonik simge kaynağını okur.

## 0.9.131 — 2026-07-29 (kararı verilen kapı geri gelmiyor)

- **Onaylanan kapının yavaş bir tam taramadan sonra yeniden görünmesi engellendi.** Önceden yalnız kirli belgeler eski anlık görüntünün üstüne yazılıyordu; karar yazıcısı belgeyi kaydedip temizlediği anda koruma kalkıyor ve daha önce başlamış tarama kapıyı diriltebiliyordu. Açık belge artık her durumda anlık görüntüden daha güncel kaynak kabul edilir.
- **Kullanıcının açtığı gerekçe kutusu odağı kendiliğinden alıyor, tazeleme ise odağı çalamıyor.** İlk Escape kutudan çıkarak taslağı korur, kapı satırındaki ikinci Escape kapıyı kapatır; böylece iptal ile boş gerekçe arasındaki ayrım kaybolmaz.
- **Bayat bir ikinci tıklama kullanıcıyı suçlamıyor.** Kapı zaten karara bağlanmışsa hiçbir şeyin bozulmadığı ve ikinci kayıt yazılmadığı açıkça bildirilir.

## 0.9.130 — 2026-07-29 (gerekçe kutusu kapının yanına geldi)

- **Şerh ve ret gerekçesi artık pencerenin uzağında değil, seçilen kapının hemen altında yazılıyor.** Founder panel ile eski giriş alanı arasındaki yaklaşık 1.300 piksellik dikkat yolunu bildirdi; konumlandırma imkânı olmadığı ölçülünce kutu panel gövdesine alındı ve üç karar seçeneği onun altına yerleştirildi.
- **Taslak her kapı için ayrı korunuyor.** Kullanıcı başka bir kapıya geçip geri döndüğünde yazdığını yerinde bulur; seçenek başına ayrı kutu açılmaz. Dolu gerekçeyle düz onay seçilirse metin sessizce atılmaz veya karar kendiliğinden şerhe çevrilmez, yazım durur ve yapılması gereken kutunun yanında anlatılır.

## 0.9.129 — 2026-07-29 (karar akışı yanlış hedefe ve yalancı başarıya kapandı)

- **Panel satırları kararlı kimlik kazandı ve tek tık davranışı açıkça kuruldu.** Her yeniden çizimde kimlik değişip açık kapının kapanmasına veya tıklamanın komşu dosyaya düşmesine yol açan kusur giderildi; ayrı “Kapıya git” çocuğu kaldırıldı ve gezinme editörü kirletmeden panel odağını korur.
- **Karar satıra değil kapı koduna yazılıyor.** Dosya arada değişip satırlar kaymış olsa bile gönderilen kod bağlayıcıdır; aynı dosyada yinelenen kod varsa eklenti hedef tahmin etmek yerine açık kimlik hatasıyla durur.
- **Kullanıcının kaydedilmemiş taslağı ve dosya biçimi korunuyor.** Çatışma yalnız belge gerçekten kirliyken sorulur, temiz belgede gereksiz onay çıkmaz. Eklentinin kendi kaydetmesi sırasında otomatik biçimleme yalnız o belge için askıya alınır; böylece karar tek satırı değiştirir, kullanıcının normal kaydetmesi ise biçimlenmeye devam eder.
- **Başarı bildirimi artık üç kanıta bağlıdır.** Kaydetme sonucu, bellekteki değer ve hedefli disk geri okuması doğrulanmadan karar başarılı sayılmaz; aynı kapıda eşzamanlı ikinci yazım engellenir. Şerh ve ret gerekçesi zorunlu tutulur, tarih kullanıcının yerel takviminden alınır ve çizilmeyen editör içi karar penceresi görünür akıştan çıkarılmıştır.

## 0.9.128 — 2026-07-29 (karar satırları ve ortak sayaç yüzeyi)

- **Karar seçenekleri kapının altında görünür hâle geldi.** Kapıya git, onayla, şerhle onayla ve reddet satırları panelin içinde açılır; not yalnız şerh veya ret gerektiğinde sorulur, kutuyu iptal etmekle boş bırakmak aynı işlem sayılmaz.
- **ONAYLAR, Hatırlatıcılar ve Gözlemler sayıları alt şeritte de izlenebilir.** Sayaçlar panellerin zaten tuttuğu kümelerden türetilir ve aynı tazeleme olayını paylaşır; ayrı tarama, zamanlayıcı veya ikinci sayaç kurulmaz. Editörün zaten gösterdiği hata ve uyarı sayıları yinelenmediği için aynı işaret iki kez görünmez.
- **Dosya grupları ilgili teknolojinin simgesini taşıyor.** Eşleme eklentinin dil bildiriminden türetilir; ikinci bir uzantı çizelgesi tutulmadığı için panel ile dosya yüzeyi sessizce ayrışamaz.

## 0.9.123–0.9.127 — 2026-07-29 (ayrı paket durumu yok)

- **Bu numaralar için depoda ayrı bir paket durumu veya sürüm işlemesi bulunmuyor.** Paket 0.9.122'den tek işlemeyle doğrudan 0.9.128'e yükseltilmiştir; bu yüzden 0.9.123–0.9.127 aralığına kullanıcıya dönük değişiklik atfedilmemiş, gerçek davranışlar 0.9.128 kaydında anlatılmıştır.

## 0.9.122 — 2026-07-29 (yanlış geçiş uyarısı kaldırıldı)

- **Kapılar arasında gezinirken her seferinde çıkan engelleyici onay kaldırıldı.** Eski yüzey taslak olup olmadığını göremediği hâlde her geçişte kayıp uyarısı veriyor ve yüzde yüz yanlış alarm üretiyordu; kullanıcıyı önemli uyarıları da okumadan geçmeye alıştıran bu davranış sona erdi.
- **ONAYLAR panelindeki dosya satırı artık kendi teknoloji simgesini güvenilir biçimde gösteriyor.** Simge, eklentinin dil bildirimindeki uzantı ve simge alanlarından türetilir; karşılığı olmayan dosyaya yanlış logo yakıştırılmaz ve ikinci bir eşleme tablosu tutulmaz.

## 0.9.121 — 2026-07-28 (kuyruk ile karar yüzeyi ayrıldı)

- **Açıklamalar paneli artık bütün kuyruğu göstermiyor.** Founder iki paneli yan yana gördü ve aynı kapıları iki yerde birden bulduğunu bildirdi. Kök neden emekli edilmemiş bir kararın kalıntısıydı: açıklama yüzeyi, editörün pencereleri çizmediği bir dönemde yedek olarak kurulmuştu ve o dönem geçtiği hâlde kaldırılmamıştı. Artık ONAYLAR bütün açık kapıların tek kalıcı kuyruğudur; açıklamalar ise yalnız senin seçtiğin tek kapının karar yüzeyidir ve o yüzey ancak sen bir kapıya tıklayınca doğar.
- **Açılış maliyeti kökten düştü.** Onay yüzeyi eskiden etkinleşirken çalışma alanındaki iki yüz doksan dokuz plan dosyasını açıyor ve on üç yorum penceresi yaratıyordu; ikisi de artık sıfırdır. Kapı listesi, tanı hattının zaten ürettiği anlık görüntüden okunur ve ikinci bir tarama turu açılmaz.
- **Dört giriş noktası kısayola dönüştü.** Komut paleti artık ayrı bir liste açmaz, ONAYLAR paneline odaklanır. Panel satırı ve satır üstü mercek aynı karar yüzeyine gider. Kararı yazan tek el değişmedi; kayıt biçimi, damgalar ve daha önce yazılmış kayıtların okunması aynen korunur.
- **Görünüm korundu.** Dosya satırının Sarmal dosya simgesi, kapı satırının sarı mesaj balonu, editör içindeki genişletilmiş bağlam ve yanıt kutusu yerinde durur. Panel, komut ve denetleyici kimlikleri değişmedi, dolayısıyla panel yerleşimin sıfırlanmaz.

## 0.9.120 — 2026-07-28 (ONAYLAR açıklama düzenine geçti)

- **Dosya satırı artık kendi `.sar` simgesini taşıyor.** Founder iki paneli yan yana gördü ve Açıklamalar panelinin düzenini seçti; dosya satırı VS Code'un simge temasından Sarmal simgesini alır, yani panelde de dosya ağacındaki gibi görünür. Etiket açıkça yazılır, böylece mutlak yol etikete sızmaz ve yalnız ipucunda yaşar.
- **Kapı satırı mesaj balonu taşıyor.** Bir kapı Founder'a sorulmuş bir sorudur ve yanıtlanmayı bekler; balon bunu kilit ya da zarftan daha dürüst anlatır. Ata ile çocuk yine ayrı kaynaklardan beslenir, dolayısıyla simgelerinin çakışması yapısal olarak imkânsızdır.

## 0.9.119 — 2026-07-28 (Gözlemler paneli sadeleşti)

- **Gözlemler panelinde şekil kademeyi, renk türü söylüyor.** Önceden simge iki işi birden taşıyordu ve sonuç gürültüydü: aynı kademede üç ayrı şekil yarışıyor, grup satırı ile altındaki kayıtlar aynı simgeyi kullanıyordu. Artık grup satırı katman simgesi taşır, kayıtlar tek tip küçük noktadır ve tür yalnız renkten okunur.
- **Kusur nöbete bağlandı.** Grup satırının çocuklarıyla aynı simgeyi taşıyamayacağı ve kayıt satırlarının tek şekil kullanacağı artık ölçülüyor; ikisi de mutasyonla kanıtlandı.

## 0.9.118 — 2026-07-28 (Gözlemler adı)

- **"Bildirimler" panelinin adı "Gözlemler" oldu.** Eski ad yanlıştı: panel bildirim göndermez, düzeltme istemeyen ölçümleri gösterir. Founder'ın sorusu bunu açığa çıkardı — "bildirim ne demek?" Panelin iç kimliği bilerek korundu, çünkü kimlik değişirse kullanıcının panel yerleşimi sıfırlanır; görünen ad ile iç kimlik ayrı yaşar.
- **Kenar çubuğu simgesi henüz değişmedi.** Simge seçimi Founder kararını bekliyor ve mevcut çizim artık ONAYLAR ile kavramsal olarak çakışıyor.

## 0.9.116 — 2026-07-28 (varlık ayrımı · panel okunabilirliği · metin hijyeni)

- **Mini Graf artık yalnız odaktaki varlığı gösterir ve odak değişince tazelenir.** Önceden çalışma alanının tamamını çiziyor ve odak olayını hiç dinlemiyordu; Sarmal dosyasına bakarken öteki varlığın düğümleri görünüyor, odak değişince görünüm donuyordu. Üç tanı yüzeyinin zaten kullandığı odak kapısına dördüncü tüketici olarak bağlandı.
- **Katman ile AltKatman grafta görsel olarak ayrıldı.** Kusur kanondaydı: iki simge çizelgesi birbirinden ayrışmış ve ikisi de aynı simgeyi taşır olmuştu.
- **Kimlik tekilliği artık varlık sınırına göre ölçülür.** İki bağımsız varlığın aynı kodu ilan etmesi meşrudur ve artık yinelenen kod uyarısı üretmez; önceden iki varlık tek isim uzayı sayılıyordu.
- **Bildirimler paneli okunur hâle geldi.** Mutlak dosya yolları etiket olmaktan çıktı ve ipucuna indi, grup başlıkları çıplak tanı kodu yerine okunabilir söz öbeği taşıyor, ağaç kademeleri tek tipe indi.
- **Üç panel bakışta ayrılır.** Her panelin proje satırı kendi simgesini taşır ve bildirim kayıtları türlerine göre görsel olarak ayrışır; renk yalnız kanonik tema rolünden okunur.
- **Görünüş başlıkları kapsayıcının adını tekrar etmiyor.**
- **Arayüz metinlerinden iç karar numaraları kaldırıldı.** Üzerine gelince açılan açıklamalar, otomatik tamamlama etiketleri ve panel cümleleri artık kuralın kendisini anlatır; numara arayan ajan için köken alanı ayrıca tutulur. Metin hijyeni kapısı zorlanan hâle geldi.


## 0.9.115 — 2026-07-28 (yüzey turu · tanılar üç panele ayrıldı)

- **Tanılar artık üç ayrı yüzeyde yaşıyor.** Düzeltilmesi gereken sapma Problems panelinde, bilinçli olarak sonraya bırakılan iş Hatırlatıcılar panelinde, salt bilgilendirme Bildirimler panelinde durur. Üç doğa aynı yerde yığıldığında gerçek sapma gürültüde kayboluyordu. Yönlendirme kararı motorda tek yerde yaşar; eklenti onu çağırır, ikinci bir eşleme tutmaz.
- **Panel gereksiz yere yeniden çizilmiyor.** Tam proje taramasında Bildirimler paneli yaklaşık yetmiş bir kez yeniden çiziliyordu; artık tur sonunda tam bir kez çizilir.
- **Üç panel de aktif varlık odağına uyar.** Problems bir varlığı gizlerken diğer iki panelin göstermeye devam etmesi kullanıcıya çelişkili iki tablo veriyordu.
- **Mini Graf tek görünüme indi.** Seçim artık grafı bir halkaya daraltmaz; Faz, Blok, Katman, AltKatman ve Adım düğümlerinin tamamı ortak proje rayında ve gerçek bağımlılık ağıyla görünür.
- **Arayüz metinlerinden iç karar numaraları kaldırıldı.** Üzerine gelince açılan açıklamalar, otomatik tamamlama etiketleri ve panel cümleleri artık kuralın kendisini anlatır; numara arayan ajan için köken alanı ayrıca tutulur.
- **Eksik ayar ilan edildi.** Satır içi tanı anahtarı koddan okunuyor fakat paket bildiriminde ilan edilmemişti; kullanıcı onu Ayarlar arayüzünde bulamıyordu.
- **Beceri bütçesi adil paya çevrildi.** Bir Adım için hazırlanan koni promptunda kartlar artık ilk gelenin aldığı sırayla değil, max-min adil bölüşümle yer alır; kırpılan kart damgalanır ve tam metninin adresini söyler.


## 0.9.55 — 2026-07-13 (oturum 39 · panel yalınlaştırma — Founder gözle-bulgusu)

- **En küçük Adım'da TEK sembol (Founder 2026-07-13):** beklemede/geliştirmede satırlarında kutucuk + ayrı durum çemberi (○) BİRLİKTE çiziliyordu — iki sembol kafa karıştırıyordu. Artık checkbox (☐/☑) TEK durum/eylem yüzeyidir; durum RENGİ satır decoration'ından okunur (K-96: geliştirmede=sarı label · tamamlandı=soluk). Yalnız `bloklu`'da checkbox yok → ikon (circle-slash) tek sembol kalır.
- **Katman ↔ AltKatman ayrımı netleşti:** AltKatman ikonu `symbol-module`→`list-tree` — Katman'ın `layers`'ından "içerde/alt modül" hissiyle net ayrılır (eski çift fazla benzerdi).

## 0.9.54 — 2026-07-13 (oturum 38 · RF-T2-A01: MOTOR GÜVEN TURU — panel yüzü)

- **Durum makinesi panelde (Founder kilidi reform ③):** kutucuk/`durumYaz` artık kanon `durumGecisleri` tablosundan geçer — **bloklu→tamamlandı panelden de YAZILAMAZ** (uyarı balonu + görsel geri alma); geri-alma (tamamlandı→beklemede/geliştirmede) yazılır ama status-bar bilgi notu düşer. Üç yazıcı (panel · MCP · koniYaz) aynı tabloyu okur, aynı cümleyi söyler.
- **Öz-bağımlılık panelde:** `bağımlı: [KENDİSİ]` (ve kendi kapsayıcısına bağımlılık) Problems'e HATA düşer — Terra'nın sessiz-atlama deneyi kapandı.
- **Muaf-asimetri kapandı:** `denetleHepsi` (workspace taraması) bilerek-hatalı işaretli dosyaları artık tek-dosya yolu gibi süzer — ders malzemesi paneli kirletemez (kapi_kapsami beyanıyla simetri).
- **Kenar sicili genişledi (çekirdek):** `çağırır/gider/gönderir/sözleşme/koşar` kırık hedefleri panelin tek-dosya denetiminde de görünür.

## 0.9.53 — 2026-07-12 (oturum 37 · RF-T1-A02: LIGHT-TEMA GÖRÜNÜRLÜK ONARIMI)

- **Founder Light bulgusu:** açık temada niyet metinleri ("niyet beyazı" #FFFFFF dizgi) beyaz zeminde KAYBOLUYORDU — EKL-F3-A05'in "açık eşler kanonda bekler, yüzeye uygulama sonra" borcu hiç kapanmamıştı. `[*Light*]` seçicisi settings.json'da çalışır (yasak yalnız configurationDefaults'taydı): renk-uret artık textMate kurallarını İKİ temaya üretir; niyet açık temada MÜREKKEP (#1F1F1F).
- **Kanon açık-paleti tamamlandı:** `sadeRenklerAcik`e tablo/anahtar/kuralAd/kenar eşleri eklendi — textMate'in kullandığı her anahtarın açık eşi var (nöbet testli).
- **Dal çizgileri tema-duyarlı:** sıcak altın glif açık temada koyu BRONZ'a döner (`light: before` override) — çizgiler beyaz zeminde kaybolmaz.
- **Giydir ikizi:** giydir-ayar.ts aynı `[*Light*]` bloğunu dış projelere de yazar (A03 birebirlik nöbeti korunur).

## 0.9.52 — 2026-07-12 (oturum 37 · RF-T1-A01: K-96 RENK KANUNU — reform TUR-1)

- **Renk = YALNIZ durum (K-96, renk kurulu 5/5):** panel satır rengi artık DURUM anahtarından — geliştirmede=**TAM SARI satır** · bloklu=**kırmızı** · bitmiş=**soluk yazı + yeşil-dolu kutu çifti**; bekleyen/kısmi nötr (salience bütçesi). Tip-yazı boyaması söküldü: `sarmal.ray.*` tema-renkleri ve kanon `rayRenkleri` paleti kalktı (tip kimliği = ikon şekli + kod öneki + girinti).
- **Blokaj `!` rozeti köke tırmanır:** altında bloklu Adım olan her kapsayıcı (varlık kökü dahil) `!` rozeti + hover "altında N bloklu adım" alır; ikon rengi çalınmaz. Kapsayıcının kendi `durum: bloklu` beyanı da sayaca girer (renk kurulu BUG ① kapandı).
- **Checkbox = eylem yüzeyi (K-93 ② revize):** kutu beklemede + geliştirmede + tamamlandı'da var, yalnız bloklu'da yok; kutu ve şekil-durumlu ikon birlikte yaşar — satır hizası zıplamaz (BUG ② kapandı). Adım ikonları: boş daire → dönen sync → (dolu kutu yeter) → circle-slash.
- **"Bitti" TEK tanım — `cekirdek/src/durum.ts`:** kapsayıcı durum türetmesi `durumTuret()`e tekleşti (teftişin 4-kopya-3-tanım bulgusu: dag karne · panel sayaç/ikon · denetçi açık-iş). "Sürüyor" evresi geliştirmedeki işi de sayar; 4 yeni birim test.
- **Kırık-dosya karşı-tanısı:** ayrıştırılamayan `.sar` panelden sessiz düşmez — kök satırda "⚠ N dosya ayrıştırılamadı" grubu, tıkla→dosya açılır.
- **Nöbet:** palette-drift süitinde K-95 ray testi yerine üç K-96 testi — ray paleti geri gelemez · kenar pembesi yaşar · dekorasyon anahtarları durum dilinde.
- **Kapsayıcıya tıkla → tanımına git (Founder bulgusu):** Faz/Blok/Katman satırı da artık dosyadaki tanımına atlar (önceden yalnız Adım atlıyordu); ok işareti aç/kapa görevinde kalır.
- **🌀 Çağır-çevrimi (panel aynası):** mevsim Faz'ının `çağır BLK-X` ile kapsadığı kök Blok'lar panelde Faz'ın ALTINA biner (K-91 ③ Provider deseni — kopya değil taşıma); Faz sayacı `[tamam/toplam]` çağrılan vagonların toplamını gösterir, blokaj rozeti mevsime kabarcıklanır. Faz hover'ında 🚄 tarife (`hedefTarih`) görünür. Dürüst sınır: motorun faz-vade AÇIK-İŞ taraması hâlâ fiziksel çocuklara bakar — çağır-içi vade çevrimi RAY-3 kalemi (RF-T5 envanterinde).

## 0.9.41 — 2026-07-12 (oturum 34 · BKM-SNV2-A03: Çalışma Alanını Giydir — F3 görünüm paritesi)

- **Yeni komut — `Sarmal: Çalışma Alanını Giydir`:** dış projede (sinav2 dersi) anlamsal renkler gelir ama textMate biçim kuralları + drift rozetleri + Kuzey Yıldızı ikon teması yalnız çalışma-alanı ayarıyla işlediğinden görünüm YARI-parite kalıyordu. Giydir, kanondaki tüm renk/dekor tablosunu **yalnız Workspace hedefine** yazar — kullanıcı ayarı EZİLMEZ.
- **İlk-tespit teklifi:** imzasız (.sar'lı ama giydirilmemiş) çalışma alanında bir kez sorar: "Giydir · Bu projede sorma" (`sarmal.otoGiydir` ayarı). Bizim repo renk-uret imzalı olduğundan SESSİZ.
- **Rakip susturma (sınırda):** indent-rainbow/errorlens yalnız KURULUYSA ve yalnız susturma anahtarıyla (`excludedLanguages`/`excludePatterns` ekleme — mevcut liste korunur); native karşılıklar zaten girinti.ts + satirici.ts.
- **Tek-tablo nöbeti:** `giydir-ayar.ts` renk-uret.mjs'in runtime ikizi; palette-drift süitine 3 eşitlik testi eklendi (textMate ↔ settings.json · rozet/ikon ↔ settings.json · anlamsal+[*Light*] ↔ package.json) — iki üretici sessizce ayrışamaz.

## 0.9.40 — 2026-07-11 (oturum 34 · BKM-SNV2-A04: siniflama-yüzü K-83 uyumu)

- **Adım şeması koni alanlarını tanır (A5):** `görev:metin · kabul:liste · sınır:metin · dokunulmaz:liste · referans:liste` kanona (kayit.json `semalar.Adım`) tipli-OPSİYONEL işlendi — tamamlama (`·` rozeti) ve imza yardımı kendiliğinden zenginleşti; zorunluluk konisiz-adım bekçisinin işi (çift kapı açılmadı).
- **Çekirdek yanı (aynı tur):** MCP `siniflama{Adım}` "şuraya konabilir: Blok · Faz · Katman" satırının güncel `izinliSarma`dan aktığı test-nöbetiyle sabitlendi — Sınav-2 A1 senaryosu (ajanın Adım'ı yalnız Katman'a konabilir sanması) yeniden üretilemez.

## 0.9.39 — 2026-07-11 (oturum 33 · bug-avı A11: ikinci-yazım körlükleri + kapı tutarlılığı)

- **DÜZELTME — gövde-özellikli alanlar artık görünür (E1):** `durum:`/`ne:` gövdede yazıldığında yol haritası paneli yanlış rozet basıyor, takdir kanalları ve anahat açıklaması boş kalıyordu — üç yüzeyin alan okumaları motorla hizalandı (parametre∪özellik; alanDeger dersi).
- **DÜZELTME — cross-file tanılar kendi düzeyinde (E5a):** DAG/döngü/gizli-bağımlılık tanıları panele sabit KIRMIZI basılıyordu; bilgi/uyarı düzeyleri artık doğru renkte.
- **Panel kapısı genişledi (E5b):** `yinelenen-kod` · `kopuk-zincir` · `kayıp-kenar` bekçileri Problems'a eklendi; hangi bekçinin hangi yüzeyde koştuğu artık beyanlı — `nitelik/kapi_kapsami.sar` (KRR-MUT-2 kapı ayağı).
- Çekirdek yanları (aynı tur): MCP `denetle` örtü-farkında (E2 — `dizin` argümanı + yol'dan find-up) · NVIDIA köprüsünde `güvenlik` rolü kendi kalıbında (E3) · Prizma tırnaklı `kod:` kimliği (E4).

## 0.9.38 — 2026-07-11 (oturum 32 · Founder canlı-test yakalayışı: satır-içi mesaj regresyonu)

- **DÜZELTME — satır-içi tanı mesajları geri geldi:** K-84 varlık-etiketi ("Sarmal · _Sarmal") satır-içi yazıcının `source === "Sarmal"` süzgecini sessizce boşa düşürüyordu — varlık-içi dosyalarda rozet görünüyor ama MESAJ görünmüyordu ("sadece uyarı yazıyor, sorunun ne olduğunu bildirmiyor" — Founder, Döngü testinde yakaladı). Süzgeç `sarmalKaynakli()` oldu; kasaya K-84 regresyon nöbeti eklendi (9/9).

## 0.9.37 — 2026-07-11 (oturum 32 · K-87: DÖNGÜ dile girdi — loop engineering'in evi)

- **Döngü widget'ı (K-87):** tekrarlayan iş artık dilin vatandaşı — `Döngü( kod, tetik, koşar, durunca/turLimiti )`. Tamamlama/hover/renk kanondan tanır (🔁 orkestrasyon ailesi). **Çıkışsız döngü YAZILAMAZ:** durunca ve/veya turLimiti şart — motor daha yazarken uyarır; sahte tetik `geçersiz-enum`.
- **Yeni tanılar:** `kırık-koşar` (koşar hedefi ilan edilmemiş — uyarı) · `durunca-sözlüğü` (koşucunun anlamayacağı durma koşulu — bilgi); Problems'ta canlı.
- **Koşucu (çekirdek):** `sarmal dongu-kos <KOD> [--izle --aralik ms]` — dört tetik (koşul·el·olay·zaman); İLERLEMESİZ-DÖNGÜ bekçisi özdeş iki turu erken keser (çıkış 5: insan baksın); her tur `.sarmal/trace`e yazılır, panel Koşum yüzü okur. `başla('döngü')` koni-dolu şablon verir.

## 0.9.36 — 2026-07-11 (oturum 32 · EKL-F11-A04: imza + tıklanır yollar + kaydette-biçimle — F11 FAZI TAMAM)

- **İmza yardımı:** `Adım(` yazınca parametre imzası KANONDAN açılır — zorunlu/`[isteğe-bağlı]` ayrımı, tür ve izinli değerler (enum) parametre notunda; Sarmal adla-yazım olduğundan aktif parametre virgülle değil son `ad:` sözcesiyle bulunur. Elle liste yok — kanon değişirse imza kendiliğinden değişir.
- **Tıklanır yollar:** `referans:`/`yol:`/`dosya:` alanlarındaki yollar ⌘+tık ile açılır; belge dizini → varlık kökü → çalışma-alanı sırasıyla çözülür; OLMAYAN dosyaya link üretilmez (kırık yol link değildir).
- **Kaydette-biçimle:** `[sarmal]` için `editor.formatOnSave` varsayılan açık (Go/Dart kültürü — Founder onayı); kullanıcı ayarı her zaman üstün.
- Kanıt: gerçek VS Code kasası **9/9**. Bu sürümle **IDE-aşinalık fazı (EKL-F11) TAMAM**: envanterdeki tüm seçili boşluklar kapandı — F12 · ⌥F12 · ⇧F12 · F2 · ⌘T · imza · linkler · formatOnSave + MCP `gezin` + CLI.

## 0.9.35 — 2026-07-11 (oturum 32 · EKL-F11-A03: F2 yeniden-adlandır + ⌘T sembol araması)

- **F2 Yeniden Adlandır:** bir `kod:`u değiştirin — tanım + TÜM atıflar (bağımlı listeleri, `çağır`lar, metin/yorum geçişleri, `.md`/`.ts` dokunuşları) tek WorkspaceEdit'te güncellenir; geri-al tek Cmd+Z. Varlık sınırına saygılı YAZAR: başka varlığın dosyasına dokunmaz. Geçersiz yeni-ad (boşluklu vb.) kapıda reddedilir; dosya-adına yansıyan kodda dürüst bilgi mesajı (dosya taşıma elle — K-85). K-85 göçünün "47 dosyada elle atıf" acısı artık tek tuş.
- **⌘T / Ctrl+T Sembol Araması:** herhangi bir `kod:` YA DA `ad:` yazın, tanımına atlayın — indeks tanımlara ad alanını da taşır (CLI/MCP `gezin` raporu da gösterir).
- Kanıt: gerçek VS Code kasası 8/8 (F2 üç-konumlu edit + ⌘T kod/ad araması otomasyonla doğrulandı) · çekirdek 393 test.

## 0.9.34 — 2026-07-11 (oturum 32 · K-86: kimlik-gezinme kararı + atıf evreni genişledi)

- **K-86 deftere işlendi:** kimlik-gezinme ailesi karar oldu — kod = gezilebilir kimlik, üç yüz tek çekirdek, ajan-yüzü gerekçesi, geniş atıf kapsamı.
- **Atıf evreni .sar+.md+.ts (K-86 ④):** ⇧F12 ve `gezin` artık KARARLAR/CHANGELOG/nitelik raporlarındaki ve kod yorumlarındaki dokunuşları da bulur (kanıt: VIT-K78-A06 atıfları 0→3; K-86'nın 12 dokunuşu tek sorguda). TANIM hep `.sar`'da — md'deki `kod:` satırı tanım üretemez. `.md` kaydetmek `.sar` denetimini tetiklemez (ayrı izleyici).
- **Gerçek VS Code kanıtı:** entegrasyon kasasına F12+⇧F12 testi eklendi (7/7) — test iki kusuru anında yakaladı ve ikisi de düzeltildi: kapsam-dışı (ornek/) açık dosyada F12 ölüydü (aktif belge artık her zaman indekslenir, kapanınca düşer) + referans listesinin tanımı da içerdiği VS Code davranışı.

## 0.9.33 — 2026-07-11 (oturum 32 · EKL-F11-A05: gezinme öğretisi + ajan yüzü)

- **Öğreti (Founder: "kullanıcının öğrenebileceği bir yere yazalım"):** README'ye 🎯 Kimlik gezinme bölümü + ipuçları (⌥F12 peek · kirli-tampon · yinelenen-tanım = drift işareti · varlık sınırı) + kısayol tablosuna F12/⌥F12/⇧F12; Doğuş Rehberi'ne 6. adım "Kimlik gezinme" (medya/rehber/06-gezinme.md).
- **MCP `gezin` aracı (ajanın F12/⇧F12'si):** AI ajanı bir kodun tanımını + tüm atıflarını dosya:satır:sütun ile TEK çağrıda alır — grep zinciri yerine kesin sorgu (daha az araç çağrısı, daha az bağlam). CLI ikizi: `sarmal gezin <KOD> [dizin]` (K-48 üç yüz tek çekirdek).
- **Mimari:** kimlik indeksi çekirdeğe indi (`cekirdek/src/kimlik.ts`) — eklenti/MCP/CLI aynı sınıfı çağırır; testler çekirdek süitine taşındı (391).

## 0.9.32 — 2026-07-11 (oturum 32 · EKL-F11: IDE-aşinalık — kimlik-gezinme)

- **Tanıma-git F12 (EKL-F11-A02):** `bağımlı:`/`uygular:`/`çağır` atıfından (ya da metin/yorum içindeki koddan) tanım düğümüne zıplama — beş ekosistemin (Py/TS/Dart/Rust/Go) ortak kas hafızası Sarmal'da. Yinelenen tanım varsa hepsi listelenir (dürüst ayna).
- **Referans-bul ⇧F12 (EKL-F11-A02):** bir `kod:`un TÜM atıfları panelde — bağımlı listeleri, `çağır`, string/yorum içi metin atıfları dahil. K-84 aktif-varlık sınırına saygılı: Nexivion'dayken Nexivion'da arar, köksüz dosyalar hep görünür.
- **Kimlik indeksi (EKL-F11-A01, altyapı):** çalışma-alanı geneli kod→konum haritası — AST katmanı (tanım + yapısal atıf) + metin katmanı (BÜYÜK-HARF kod deseni; söz-dizimi kırık dosyada da atıflar yaşar). Artımlı: dosya değişince yalnız o dosya taranır (~1.6ms); açılış taraması arka-planda (~180ms/155 dosya). Kaynak: `nitelik/ide_asinalik.md` envanteri (BKM-ARC-A02).

## 0.9.31 — 2026-07-11 (oturum 31 · K-85: adlandırma standardı)

- **Anadizin deseni (K-85 ①):** varlık girişi artık `<varlık>_anadizin.sar` — motor/eklenti sabit `ana.sar` aramaz, desen arar (`anadizinBul`, tek kaynak). Eski `ana.sar` GEÇİŞTE tanınır; denetle `eski-giriş-adı` bilgi tanısıyla yeni ada çağırır (dış projeler kırılmaz).
- **Ad-ayracı denetimi (K-85 ②):** `.sar` adında tire görünce ℹ️ `ad-ayracı` önerisi — Sarmal dosya adlarında ayraç alt-çizgidir (kademeli göç, zorlamaz).
- **Panel/K-84 uyumu:** varlık kökü tespiti (aktif-varlık odağı + kaynak etiketi) anadizin desenini kullanır.

## 0.9.30 — 2026-07-11 (oturum 31 · K-84: Problems aktif-varlık odağı)

- **Aktif-varlık odağı (K-84 ②③ · VIT-K78-A06):** Problems paneli artık bağlam-duyarlı — hangi varlığın (ana.sar kökünün) dosyasındaysanız panel yalnız O projenin tanılarını gösterir: Nexivion'dayken Nexivion, Sarmal'dayken Sarmal. Tüm tanılar kayıt defterinde durur, editör değişince panel yeniden yayınlanır; köksüz dosyaların tanıları hep görünür, köksüz dosyada son varlık yapışkan kalır (panel boşalmaz). Kapatmak için: `sarmal.aktifVarlikOdagi` (kapatınca 0.9.29 etiketiyle gene ayrışır).

## 0.9.29 — 2026-07-11 (oturum 31 · Problems varlık-ayrımı)

- **Problems varlık-ayrımı (VIT-K78-A05):** her tanının kaynağı artık bağlı olduğu varlıkla etiketlenir — `Sarmal · _Sarmal` / `Sarmal · _KapaliUrun` (dosyadan yukarı ana.sar kökü aranır, dizin-başına memo). Filtre kutusuna varlık adı yazınca tek projenin tanıları kalır; "her projenin doğası farklıdır" (Founder) — K-49/K-51 iki-varlık ayrılığının tanı yüzü.

## 0.9.28 — 2026-07-11 (oturum 31 · K-83: panel tip görselleri + rütbe-atlamalı sarma)

- **Panel tip görselleri (K-83 ② · VIT-GRAF-A07):** Yol Haritası kapsayıcı satırları kanon tip simgesiyle başlar (🪵 Blok · 🌿 Faz · 🍃 Katman — kaynak kayit.json, elle emoji yok) ve bitmemiş kapsayıcı ikonu tip rengine boyanır (Blok turuncu · Faz yeşil · Katman mavi, tema-token). K-78 ③ bitti-tiki (gövde-tonu 🪵✔) aynen korunur; Adım satırı değişmez.
- **Rütbe-atlamalı sarma (K-83 ① · BKM-DIL-A02, çekirdek):** ara kademeler isteğe bağlı — Blok doğrudan Katman/Adım, Faz doğrudan Adım sarabilir; TERS sarma yasak kalır. Tek kaynak: kayit.json izinliSarma (gömülü kanon build'de türer).
- **Tek-çocuk önerisi (K-83 ①/ek · BKM-DIL-A03, çekirdek):** tek Adım taşıyan Katman'a / tek Katman taşıyan Faz'a denetim ℹ️ bilgi tanısı verir ("çocuğu yukarı alabilirsin") — kapı/karne etkilenmez. İlk çalıştırma dürüst aynası: kendi planlarımızda 74 öneri.

## 0.9.27 — 2026-07-11 (oturum 31 · kenar grupları)

- **Kenarlar katlanabilir grupta (VIT-GRAF-A06):** Adım genişleyince düz `↳ etkiler · X` satır seli yerine TEK grup satırı gelir — `↳ bağımlı [N]` · `↳ etkiler [N]` (açıklamada ⚡doğrudan·🌊geçişli dökümü), kapalı başlar. Grup açılınca rozetli hedefler aynı tıkla→atla davranışıyla; `… +N daha` kırpma satırı grubun içinde (Founder geri bildirimi: "liste çok uzamış").

## 0.9.26 — 2026-07-11 (oturum 30 · panel gürültü temizliği)

- **Bilerek-hatalı dosyalar paneli kirletmez:** `// sarmal: bilerek-hatalı` işaretli ders dosyaları (ornek/) sekmede açıkken PROBLEMS'a kasıtlı hatalarını dökmez — CLI muafiyetinin ikizi, tek-kaynak regex. 0.9.25'in "açılan belge denetlensin" davranışı bu muafiyetle dengelendi (78 → ~32 gerçek kalem).
- **`sablon/` panel taramasından dışlandı** (CLI YOKSAY ile tutarlı) — şablon dosyaları plan tanısı üretmez.

## 0.9.25 — 2026-07-11 (oturum 30 · açılışta denetim)

- **Açılan `.sar` anında denetlenir:** `onDidOpenTextDocument` kancası eklendi — bir dosyayı açmak (yazmayı beklemeden) canlı denetimi tetikler; çalışma-alanı dışındaki dosyalar da (ör. hızlı deneme dosyaları) satır-içi tanı lenslerini hemen gösterir. Önceden yalnız yazınca ya da çalışma-alanı taramasıyla geliyordu.

## 0.9.24 — 2026-07-11 (oturum 30 · sade dil turu)

- **Sade tanı dili (K-81):** motorun kullanıcıya konuşan tüm metinleri (denetci·dag·kuralci·dogrulayici tanıları + geribildirim hover'ları) içeriden-kodlardan (SD-n·SNF-0·K-nn·"widget"·"çevirmen ajan") arındırıldı; öneriler çalıştırılabilir ipucuna bağlandı ("Geçerli tipleri gör: sarmal siniflama"). Kararlı hata kodları (`.kod`) sabit — davranış aynı, dil sade.

## 0.9.23 — 2026-07-10 (oturum 30 · şablon kütüphanesi)

- **Şablon kütüphanesi (BKM-OLG-A06):** dağınık şablonlar tek `sablon/` kütüphanesine toplandı (proje·blok·adım·**sözleşme**·**arkayüz**·ekran·etmen·mekanizma — eksik olan sözleşme+arkayüz dahil). `sarmal başla <tür>` CLI eklendi; MCP `basla` aracı da aynı tek kaynaktan (`sablon.ts`) okur. Panel `sablon/`'u dışlar (şablon dosyaları plan ağacını kirletmez).

## 0.9.22 — 2026-07-10 (oturum 30 · graf müfettişi)

- **Graf müfettişi (VIT-GRAF-A03):** YOL HARİTASI'nda Adım düğümü genişleyince graf kenarları konuşur — `↳ bağımlı` (hedef rozetli, tıkla→düğüme atla) · `↳ etkiler` (⚡doğrudan/🌊geçişli ileri kapanış) · `↳ kabul: N madde`. Taşan liste sessiz kırpılmaz ("… +N daha").
- **🃏 Koni kartı (VIT-GRAF-A04 · Founder kart fikri):** Adım satırındaki kart düğmesi → webview detay: kod+rozet, görev·kabul·sınır·dokunulmaz·referans, bağımlılar + etkilenenler (tıkla→atla), "dosyada aç". Yalnız okuma — yazım kutucuk/koniYaz kapısında kalır.
- **Kanonik graf yüzü (çekirdek · VIT-GRAF-A01/A02):** `sarmal graf <dizin> [--kok KOD]` — derleyicinin DAG çıktısı determinist JSON (içerme + bağımlılık kenarları + kopuk uçlar + karne); MCP `graf` aracıyla AI da aynı grafı okur.

## 0.9.21 — 2026-07-10 (oturum 29 · açık-işler cephesi)

- **Performans (EKL-F9-A06/A07/A08):** paylaşımlı AST önbelleği (renk·takdir·anahat·dallar·denetim tek parse) + tek kalp atışı (yildiz+takdir+hata-lensi aynı 750ms nabız) + 350ms geciktirici (tuş vuruşu başına tek hesap).
- **Vitrin (K-77):** dört-durum rozet standardı (🟢🟡🔵⛔) panel satırlarında + build-sonu karnesi + `sarmal etki <KOD>` etki-analizi yüzü + biçimlendirici iki-nokta hizalaması.
- **UI hükümleri (K-78):** hata lensi NABIZ atar · Hatırlatıcı ÜNLEM (❗) + yaşam döngüsü (kararlaştı→zincir) · Blok tamamlanma tiki gövde-tonu (adım-yeşili değil).
- **Canlı izleme (HALKA-IZLE):** YOL HARİTASI paneli orkestrasyon konuşmasını gösterir — işlenen Adım altında ✎üretici · 🕵️denetçi · 🛡️güvenlik koşum düğümleri (token+ajan imzası); tıklama tam konuşma webview'i (ham prompt+yanıt).
- **Ağaç yüzü (K-74):** Kitaplık/Raf hover'ında alt-ağaç önizlemesi + README oto-blok üretimi.
- **Yetki sözlüğü (EKL-F9-A10):** L1–L6 RBAC kademeleri kanondan tek-kaynak (tamamlama↔ipucu tutarlı).
- **Commit kapısı (EKL-F9-A11):** kod değişince çekirdek/eklenti testleri otomatik koşar — kırmızı test = commit blok.

## 0.3.0 — 2026-07-03

**v1 hazırlık sürümü** — kullanıma-hazır paketleme.

- ✨ **Başlangıç rehberi (walkthrough):** kurulum sonrası 5 adımlı "Sarmal'a Başla" sayfası — dil, canlı denetim, okuma modu, öğrenim modu, biçimlendirici.
- ⚙️ **Yeni ayar `sarmal.denetim`:** canlı drift tanıları tek ayarla açılıp kapatılabilir.
- 🖼️ Eklenti ikonu (Marketplace/Extensions paneli görünümü).
- 📦 Paket meta verileri: anahtar kelimeler, hata bildirim adresi, komut kategorileri.
- 📖 README kullanıcı yüzüne çevrildi; CHANGELOG ve LICENSE eklendi.

## 0.2.x — 2026-07-02 → 2026-07-03

- 📖 **Okuma modu:** yerli CustomEditor — aynı sekmede kod ↔ kitap görünümü (⇧⌘V); markdown-it + kod boyama (aile renkleri) + highlight.js (yabancı dil çitleri); amber bölüm rozetleri; hatalı belgede zarif Türkçe uyarı.
- 📝 **Belge blokları (`-->|` … `|<--`):** çok satırlı metin/şekil/şema blokları — Markdown akışı + XML bölüm etiketleri; şekiller karaktere karakter korunur.
- ✨ **Biçimlendirici:** nizami girinti + sınır nefesi; belge bloklarının içine dokunmaz.
- 🎓 **Öğrenim modu hover:** her öğe kendini anlatır — kural + "kime ne fayda" (👤🤖⚙️).
- 🌈 Girinti katman renkleri (ağaç gradyanı) + bracket-pair kılavuzları.
- 🧭 Anahat (Outline) ağacı, otomatik tamamlama, 💡 hızlı düzeltmeler.

## 0.1.x — 2026-07-01 → 2026-07-02

- 🌱 İlk sürüm: `.sar` dil tanımı, TextMate + anlamsal renklendirme (aile paleti),
  canlı drift denetimi (Türkçe tanılar + öneri motoru), 7 snippet, dosya ikonu.
