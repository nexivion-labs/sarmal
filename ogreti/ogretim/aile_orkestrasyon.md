<!-- SARMAL:KART_KUNYESI -->
# 🎼 orkestrasyon ailesi — öğretim kartı

Bu aile kanonik sınıflama kaydında şöyle tanımlanır: yönetir (işletim: şablon·politika·akış·kanca). Ailede 7 tip yaşar.

Bu kartın olgusal bölgeleri kanonik sınıflama kaydından üretilmiştir: oz/siniflama/kayit.json · mühür: 97365b52

Anlatı bölgesi elle yazılır ve üreteç o bölgenin sınırını geçmez. Kartı tazelemek için `node arac/ogretim-uret.ts` çalıştırılır.
<!-- /SARMAL:KART_KUNYESI -->

<!-- SARMAL:ANLATI -->
## Anlatı

Orkestrasyon ailesi şu soruyu cevaplar: iş kendiliğinden nasıl yürür? Plan işin ne olduğunu, etmen ailesi işi kimin yapacağını söyler; fakat işin hangi sırayla dağıtılacağı, hangi anda hangi kontrolün devreye gireceği ve tekrar eden bir çalışmanın nerede duracağı ayrı bir bilgidir. Bu aile o işletim bilgisini taşır.

Ailenin metaforu orkestradır ve üyeler orkestranın farklı görevlerini üstlenir. Orkestrasyon şefliktir; etmen havuzunu yönetir, Adımdan istem üretir ve çalışma anında dağıtır. Döngü tekrarlayan iştir ve ailenin en disiplinli üyesidir, çünkü tetiğini, işlettiği zinciri ve durma koşulunu birlikte beyan etmek zorundadır; çıkışı olmayan bir döngü yazılamaz, dolayısıyla sonsuz tur baştan engellenir. İşAkışı aşamalı bir yolculuğun tanımıdır ve durakları görünür kılar. Kanca yaşam döngüsünün belirli bir anına bağlanır ve zorlamayı orada uygular; öncesinde, sonrasında ya da hata anında devreye girer. Şablon ajana verilecek bağlamın biçimidir ve istemin her seferinde yeniden icat edilmesini önler. Politika işletim kuralını taşır ve kendi Kurallarını içine sarar. Mekanizma ise kesişen altyapıyı ilan eder ve ailenin en çok işe yarayan disiplinini kurar: yönetişim, yetkilendirme, telemetri ya da denetim gibi her yeri kesen bir konu bir kez ilan edilir ve birçok Adım ona bağlanır, çünkü aynı içeriği adımlara dağıtmak onu ilk değişiklikte parçalar.

Canlı örnek Sarmal'ın kendi planındadır. `is/plan/reform_plani.sar` dosyasında `Döngü( kod: DNG-DOGFOOD, ad: "dogfood aile turları",` ilan edilmiştir; düğüm `tetik: el` ile elle başlatıldığını, `koşar: [ RF-T6-A01 ]` ile hangi işi işlettiğini ve `durunca: "durum(RF-T6-A01) == tamamlandı"` ile hangi koşulda duracağını yazar. Sınırı da aynı düğümde yaşar ve bir turda yalnız bir aileye dokunulacağını bildirir. Ailenin altyapı üyesi de canlıdır: `is/plan/mekanizma/mek_sef.sar` dosyasındaki `Mekanizma( kod: MEK-SEF,` düğümü kendisini `bağımlı: [ ORK-7 ]` kenarıyla kanon maddesine bağlar, orkestrasyon altyapısının sekiz çalışma anı sözleşmesini tek yerde toplar ve o sözleşmeleri kendi içine sarar. İki düğümü de kodlarını `gezin` aracına sorarak açabilirsin.
<!-- /SARMAL:ANLATI -->

<!-- SARMAL:AILE_ISKELETI -->
## İskelet — sınıflama kaydından üretilir

Aşağıdaki iki tablo makine envanteridir. Elle yapılan düzenleme bir sonraki üretimde silinir; düzeltme kanonik kayda yazılır.

### Tipler ve zorunlu alanları

| Tip | Ne | Zorunlu alanlar |
|---|---|---|
| 🔁 Döngü | tekrarlayan iştir: tetik ile döner, koşar zincirini işletir ve durunca ya da turLimiti ile DURUR; çıkışı olmayan döngü yazılamaz | kod · tetik · koşar |
| 🎼 İşAkışı | aşamalı iş akışı tanımı (workflow) | kod · ne |
| 🎼 Kanca | yaşam-döngüsü kancası (önce/sonra/hata); zorlama motoru | kod · evre · ne |
| 🎼 Mekanizma | kesişen altyapı modülüdür (yönetişim · RBAC · telemetri · hız sınırı · denetim); BİR KEZ ilan edilir, birçok Adım ona referans verir ya da bağımlı olur; içeriği adımlara dağıtılmaz, tek kaynakta durur | kod |
| 🎼 Orkestrasyon | etmen havuzunu yönetir; Adım'dan istem üretip çalışma anında dağıtır | kod |
| 🎼 Politika | işletim politikası / anti-desen (POL) | kod · alan · ne |
| 🎼 Şablon | ajana verilecek bağlam/prompt formatı (yeni — CAT-0 TPL deseni) | kod · ne |

### İzinli sarma ilişkileri

| Tip | İçerebilir | İçine konabilir |
|---|---|---|
| Döngü | — | Proje · Raf · Uygulama |
| İşAkışı | — | Orkestrasyon |
| Kanca | — | Etmen |
| Mekanizma | Politika · Kural · KimlikPolitikası · Uç · Servis · Metrik · Log · Güvenlik · Sözleşme · İz | ÇalışmaAlanı · Proje · Raf · Uygulama |
| Orkestrasyon | Etmen · İşAkışı · Şablon | Proje · Raf · Uygulama |
| Politika | Kural | Mekanizma |
| Şablon | — | Orkestrasyon |
<!-- /SARMAL:AILE_ISKELETI -->
