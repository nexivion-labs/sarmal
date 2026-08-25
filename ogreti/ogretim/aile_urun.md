<!-- SARMAL:KART_KUNYESI -->
# 🍎 urun ailesi — öğretim kartı

Bu aile kanonik sınıflama kaydında şöyle tanımlanır: üretilen yazılım (meyve 🍎 — kod·sınama-dışı artefakt). Ailede 7 tip yaşar.

Bu kartın olgusal bölgeleri kanonik sınıflama kaydından üretilmiştir: oz/siniflama/kayit.json · mühür: 97365b52

Anlatı bölgesi elle yazılır ve üreteç o bölgenin sınırını geçmez. Kartı tazelemek için `node arac/ogretim-uret.ts` çalıştırılır.
<!-- /SARMAL:KART_KUNYESI -->

<!-- SARMAL:ANLATI -->
## Anlatı

Ürün ailesi şu soruyu cevaplar: bu işten geriye ne kaldı? Bir Adımın tamamlandı damgası tek başına hiçbir şey kanıtlamaz, çünkü tamamlanma iddiası ile diskteki gerçek arasındaki bağ yazılı değilse plan gerçeğin önüne geçer ve kimse farkı göremez. Bu aile o bağı kurar ve her teslimi doğuran işe geri bağlar.

Ailenin metaforu meyvedir ve metafor plan ailesinin ağacını tamamlar. Adım yapraktır, Meyve ise o yaprağın doğurduğu izlenebilir teslimdir. Kanon bu bağı iki yönlü tutar: her Meyve tam olarak bir Adımın `üretir` kenarından doğar, üreticisi belirsiz bir Meyve kabul edilmez ve ürün grafı meyvenin üreten Adımını, türünü ve varsa proje içi dosya yerini birlikte gösterir. Kod, Ekran, Uç ile Sözleşme türündeki meyveler somut bir dosya beyan etmek zorundadır, çünkü bu türlerin karşılığı diskte gerçekten bulunur; Karar ve onay gibi türler ise kanonik muafiyet kataloğunda yer aldıkları için dosyasız kalabilir, fakat muafiyet listesi kapalıdır ve serbest istisna üretilemez. Ailenin öteki üyeleri teslimin türünü ayrıştırır: Kod üretilen kaynağı, Ayar yapılandırmayı, Altyapı dağıtım ve sürekli tümleştirme zeminini, Sözleşme arayüz ile veri şemasını, Veri veri kümesini ve Göç sıralı şema değişimini taşır. Bu ayrım rastgele değildir, çünkü her türün kabul kanıtı ve etki zinciri birbirinden farklıdır.

Canlı örnek bu kartın kendi üretecidir. `is/plan/meyve_haritasi.sar` dosyasında `Kod( kod: KOD-OGRETIM-URET, dosya: "arac/ogretim-uret.ts",` düğümü ilan edilir ve öğretim kartlarının iskeletini kanondan üreten betiği gösterir. Bu meyvenin üreticisi de yazılıdır: `is/plan/kaynak_disiplini.sar` dosyasındaki `KYN-OGR-A01` Adımı `üretir: [ KOD-OGRETIM-URET, KOD-SNM-OGRETIM-URET ]` kenarıyla hem üreteci hem onun sınamasını sahiplenir. Zincir bu yüzden kapalıdır ve tek yönde okunmaz: dosyadan meyveye, meyveden onu doğuran Adıma ve Adımdan üstündeki dala kadar her halka graftan izlenebilir. Zinciri kendin yürümek istersen `KOD-OGRETIM-URET` kodunu `gezin` aracına sor; araç hem tanımı hem ona `üretir` kenarıyla bağlanan Adımı gösterir.
<!-- /SARMAL:ANLATI -->

<!-- SARMAL:AILE_ISKELETI -->
## İskelet — sınıflama kaydından üretilir

Aşağıdaki iki tablo makine envanteridir. Elle yapılan düzenleme bir sonraki üretimde silinir; düzeltme kanonik kayda yazılır.

### Tipler ve zorunlu alanları

| Tip | Ne | Zorunlu alanlar |
|---|---|---|
| 🍎 Altyapı | Docker/K8s/Terraform/CI-CD | kod · ne |
| 🍎 Ayar | yapılandırma/env/build (config) | kod · ne |
| 🍎 Göç | DB migration / şema değişim script'i (sıralı) | kod · ne |
| 🍎 Kod | üretilen kaynak kod (meyve 🍎; dile göre adaptör) | kod · ne |
| 🍎 Meyve | meyve 🍎 — bir Adımın `üretir` bağıyla doğurduğu izlenebilir teslim (MIM-2): üreten Adım, tür ve dosya-zorunlu türlerde proje-içi dosya birlikte görünür; üreticisi belirsiz Meyve kabul edilmez | kod · tür |
| 🍎 Sözleşme | API sözleşmesi + DB şeması (OpenAPI/GraphQL) | kod · sürüm · ne |
| 🍎 Veri | veri kümesi / seed / fixture | kod · ne |

### İzinli sarma ilişkileri

| Tip | İçerebilir | İçine konabilir |
|---|---|---|
| Altyapı | — | Raf |
| Ayar | — | Raf |
| Göç | — | — |
| Kod | — | — |
| Meyve | — | Adım |
| Sözleşme | — | Mekanizma · Raf |
| Veri | — | — |
<!-- /SARMAL:AILE_ISKELETI -->
