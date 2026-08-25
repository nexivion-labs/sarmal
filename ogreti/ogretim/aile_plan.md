<!-- SARMAL:KART_KUNYESI -->
# 🌳 plan ailesi — öğretim kartı

Bu aile kanonik sınıflama kaydında şöyle tanımlanır: içerir (containment) — omurga. Ailede 7 tip yaşar.

Bu kartın olgusal bölgeleri kanonik sınıflama kaydından üretilmiştir: oz/siniflama/kayit.json · mühür: 97365b52

Anlatı bölgesi elle yazılır ve üreteç o bölgenin sınırını geçmez. Kartı tazelemek için `node arac/ogretim-uret.ts` çalıştırılır.
<!-- /SARMAL:KART_KUNYESI -->

<!-- SARMAL:ANLATI -->
## Anlatı

Plan ailesi şu soruyu cevaplar: büyük bir iş nasıl bölünür ve bölünen her parçanın hangi eksende durduğu nereden okunur? Bir yol haritası genellikle tek boyutlu bir liste olarak yazılır ve o listede zaman, iş sonucu, teknoloji ve departman birbirine karışır. Bu aile karışmayı önler, çünkü her kademeye ayrı bir eksen verir ve o eksenin dışına çıkmasına izin vermez.

Ailenin metaforu ağacın kendisidir ve her tip ağacın bir organına karşılık gelir. Faz mevsimdir ve zaman eksenini kurar; hangi işin hangi dönemde yürürlükte olduğu yalnız buradan okunur. Blok gövdedir ve iş eksenidir; uçtan uca bir sonucu üretmek için önyüz ile arkayüz adımlarını tek kimlik altında kavuşturur, tek bir teknolojinin kabı olmaz. Katman daldır ve teknoloji eksenidir; tam olarak bir somut Teknolojiye bağlanır, çünkü teknolojisiz bir dalın sahibi belirsizdir. AltKatman ufak daldır ve departman eksenidir; planlama, kodlama, sınama, inceleme ile güvenlik beşlisinden birini temsil eder ve teknoloji bağını kök dalından miras alır. Adım yapraktır ve en küçük iş birimidir; görev, kabul, sınır, dokunulmaz ile bağımlı alanlarından oluşan bağlam konisini o taşır. Kapı bir aşamayı doğrulayıp geçiren geçittir, Gereksinim ise istenen özelliğin ilanıdır. Ailenin en sıkı kuralı bağımlılığın mekanik olmasıdır: bir işin başka bir işten sonra geldiği düzyazıyla değil, yalnız `bağımlı` kenarıyla yazılır, çünkü düzyazı graf üretmez.

Canlı örnek bu kartın kendi doğum yeridir. `is/plan/kaynak_disiplini.sar` dosyasında `Katman( kod: KYN-OGRETIM, kullanır: TAKIM-CEKIRDEK, ad: "öğretim yüzü"` ilanı yer alır. O dalın altında `AltKatman( kod: KYN-OGRETIM-K1, departman: kodlama, ad: "öğretim üreteci"` bulunur ve departman eksenini bildirir. `KYN-OGR-A01` yaprağı öğretim üretecini yazmış, `Adım( kod: KYN-OGR-A02, durum: geliştirmede, öncelik: p1` yaprağı ise okumakta olduğunuz anlatıyı üretmiştir. Zaman ekseni de aynı ağaçta canlıdır: `is/plan/faz.sar` dosyasında `Faz( kod: FAZ-2026-AGUSTOS, ad: "ağustos orkestrasyon mevsimi"` mevsimi ilan edilir ve gövdeler ona çağrı kenarıyla bağlanır. Bu düğümlerin hangisini açmak istersen kodunu `gezin` aracına sor; araç tanımın yerini ve ona atıf veren her satırı birlikte söyler.
<!-- /SARMAL:ANLATI -->

<!-- SARMAL:AILE_ISKELETI -->
## İskelet — sınıflama kaydından üretilir

Aşağıdaki iki tablo makine envanteridir. Elle yapılan düzenleme bir sonraki üretimde silinir; düzeltme kanonik kayda yazılır.

### Tipler ve zorunlu alanları

| Tip | Ne | Zorunlu alanlar |
|---|---|---|
| 🍃 Adım | yaprak — en küçük iş birimidir ve koni alanlarını taşır (görev · referans · kabul · dokunulmaz · bağımlı · sınır); bağımlılık MEKANİKTİR, yalnız bağımlı: [KOD] kenarıyla yazılır | kod |
| ☘️ AltKatman | ufak dal — DEPARTMAN ekseni (MIM-1.5): planlama·kodlama·sınama·inceleme·güvenlik çekirdek beşlisinden birini `departman:` alanıyla temsil eder; teknoloji bağını KÖK Katman'dan MİRAS alır, kendi bağ beyan etmez; AltKatman içinde AltKatman derin-dal freni alır | kod · ad |
| 🪵 Blok | gövde — İŞ eksenidir; önyüz ve arkayüz adımlarını tek kimlik altında kavuşturur, fazlar arasında çağır kenarıyla sürer | kod |
| 🌀 Faz | mevsim ya da yıl halkası — ZAMAN eksenidir; Blok'ları sarar ve kardeş fazlar sıralıdır, sırayı motor türetir | kod · ad |
| 🌳 Gereksinim | istenen özellik / user-story (REQ) | kod · ne |
| 🚪 Kapı | kabul/geçit — bir aşamayı doğrulayıp geçiren kapı (GATE) | kod · kabul |
| 🌿 Katman | dal — TEKNOLOJİ eksenidir (önyüz · arkayüz · güvenlik gibi); bir Blok altında birden çok Katman yaşar ve her biri Takım bağı bekler | kod · ad |

### İzinli sarma ilişkileri

| Tip | İçerebilir | İçine konabilir |
|---|---|---|
| Adım | Meyve | AltKatman · Blok · Faz · Katman |
| AltKatman | AltKatman · Adım | AltKatman · Katman |
| Blok | Katman · Adım · Gereksinim · Kapı | Faz · Proje · Raf · Uygulama |
| Faz | Blok · Kapı · Katman · Adım | ÇalışmaAlanı · Proje · Uygulama |
| Gereksinim | — | Blok |
| Kapı | — | Blok · Faz |
| Katman | AltKatman · Adım | Blok · Faz |
<!-- /SARMAL:AILE_ISKELETI -->
