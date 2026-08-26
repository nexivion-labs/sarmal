<!-- SARMAL:KART_KUNYESI -->
# 🌱 temel ailesi — öğretim kartı

Bu aile kanonik sınıflama kaydında şöyle tanımlanır: üretken kök / iskelet (kasa→proje→uygulama). Ailede 3 tip yaşar.

Bu kartın olgusal bölgeleri kanonik sınıflama kaydından üretilmiştir: oz/siniflama/kayit.json · mühür: ebd69128

Anlatı bölgesi elle yazılır ve üreteç o bölgenin sınırını geçmez. Kartı tazelemek için `node arac/ogretim-uret.ts` çalıştırılır.
<!-- /SARMAL:KART_KUNYESI -->

<!-- SARMAL:ANLATI -->
## Anlatı

Temel ailesi tek bir soruyu cevaplar: bu üretimin sahibi kimdir ve sınırı nerede biter? Bir depoda yüzlerce dosya, onlarca plan ve binlerce satır bulunabilir; fakat hangi dosyanın hangi ürüne ait olduğu, hangi ağacın kendi kimliğini taşıdığı ve nerede bir ürünün bitip başkasının başladığı sorulmadan hiçbir denetim anlamlı olmaz. Bu aile o sınırı çizer ve çizdiği sınır bütün öteki ailelerin üstünde durduğu zemindir.

Ailenin metaforu bahçedir. ÇalışmaAlanı bahçenin kendisidir ve içinde birden çok ağacın paralel büyümesine izin verir. Proje o bahçede kök salmış üretken ağaçtır; bir ağacın tanısı, grafı ve sahipliği kendi Proje düğümünden türer, dolayısıyla iki ağaç aynı bahçeyi ve hatta aynı kimlik kökünü paylaşsa bile kimlikleri birleşmez. Uygulama ise aynı zeminde yetişen kardeş ağaçtır ve kendi kökünü kendi dosyasında taşır. Bu üçlü kanonun omurga akışının ilk basamağıdır. MIM-0 maddesi kanonik okumayı şu sırayla yazar: ÇalışmaAlanı, KimlikKökü, Proje, Faz, Blok, Katman, AltKatman, Adım, Meyve ve en sonunda diskteki dosya. Kimlik kademesinin bu zincirde Projeden önce durması bilinçlidir, çünkü kimlik alanının sınırı projeden önce çizilir ve ortak kimlik kullanan projeler o sınırı paylaşır. Kademe atlama yasağı ise MIM-0 maddesinde değil MIM-1 maddesinde yaşar ve mutlak da değildir: MIM-1 önce kimlik kademesinin ortak ya da Projeye özgü bir kimlik yapısıyla karşılanabileceğini söyler, ardından izinli bir esneklik açıkça beyan edilmedikçe kademenin atlanamayacağını hükme bağlar. Yasağın esnekliği yok saymadığı, yalnız beyansız esnekliği yasakladığı bu kayıttan okunur. Ailenin ürettiği kimlik yalnız bir etiket değildir, çünkü bütün tanılar, bütün graf yüzleri ve bütün sahiplik hükümleri bu kökten okunur.

Canlı örnek Sarmal'ın kendi kökünde durur. `sarmal_anadizin.sar` dosyasında `ANA` kodlu bir Proje ilan edilmiştir; adı `"sarmal"`, dili `tr` ve rejimi `katı` olarak yazılıdır, niyeti ise "Klasör/dosya hiyerarşisini widget ağacı gibi tanımlayan framework" cümlesiyle bildirilir. Aynı düğüm bütün kitaplıklarını ve raflarını doğrudan içine sarar, böylece aracın tüm yapısı tek bir kökün altında görünür; düğümü kendin açmak istersen `gezin` aracına `ANA` kodunu sor. Ailenin en üst üyesi de canlıdır fakat okurken dikkat ister. `ogreti/ornek/altin_yol/altin_yol_anadizin.sar` dosyasındaki `CAL-BAHCE` kodlu ÇalışmaAlanı hiçbir Uygulamayı doğrudan sarmaz; yalnız üç Raf ilan ederek bahçenin klasör ağacını çizer. İki uygulama kendi dosyalarında kök salar ve kodları `UYG-A` ile `UYG-B` biçimindedir. Bahçenin buluşma noktası `ogreti/ornek/altin_yol/ortak/auth.sar` dosyasında ilan edilen `SZL-AUTH` düğümüdür ve bu düğüm bir KimlikKökü değil bir Sözleşmedir; iki uygulama onu çağırarak tek girişte kavuşur. Bu örnek şunu da öğretir: bir iddianın doğru olması yetmez, gösterilen adreste görünmesi gerekir. Bu dosyalar örnek rafında yaşadığı için `gezin` aracı onların tanımına gitmez ve o rafı bilerek dışarıda bırakır; kodu `bul` aracına sorarsan düğüm yerini söyler.
<!-- /SARMAL:ANLATI -->

<!-- SARMAL:AILE_ISKELETI -->
## İskelet — sınıflama kaydından üretilir

Aşağıdaki iki tablo makine envanteridir. Elle yapılan düzenleme bir sonraki üretimde silinir; düzeltme kanonik kayda yazılır.

### Tipler ve zorunlu alanları

| Tip | Ne | Zorunlu alanlar |
|---|---|---|
| 🌱 ÇalışmaAlanı | bahçe/workspace — tek taban; birçok Uygulama'yı paralel sarar (M-01) | kod |
| 🌱 Proje | üretken kök (ANA); tek ağaç / Yapı-Önce ilanı | kod |
| 🌱 Uygulama | bir app (ağaç); ÇalışmaAlanı içinde paralel geliştirilir | kod |

### İzinli sarma ilişkileri

| Tip | İçerebilir | İçine konabilir |
|---|---|---|
| ÇalışmaAlanı | Kitaplık · Raf · Uygulama · Proje · Mekanizma · Faz · KimlikKökü | — |
| Proje | Kitaplık · Raf · Blok · Teknoloji · Takım · Orkestrasyon · Döngü · Ekran · Servis · Tablo · KimlikPolitikası · Kuyruk · ArkaGörev · Zamanlayıcı · Olay · Önbellek · Gizli · Tema · Canlandırma · Durum · Mekanizma · Faz · KimlikKökü | ÇalışmaAlanı · Kitaplık · Raf |
| Uygulama | Kitaplık · Raf · Blok · Teknoloji · Takım · Orkestrasyon · Döngü · Ekran · Servis · Tablo · KimlikPolitikası · Kuyruk · ArkaGörev · Zamanlayıcı · Olay · Önbellek · Gizli · Tema · Canlandırma · Durum · Mekanizma · Faz | ÇalışmaAlanı · Kitaplık · Raf |
<!-- /SARMAL:AILE_ISKELETI -->
