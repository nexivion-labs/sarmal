<!-- SARMAL:KART_KUNYESI -->
# 📚 bilgi ailesi — öğretim kartı

Bu aile kanonik sınıflama kaydında şöyle tanımlanır: bilgi & tecrübe (karar·formül·sözlük·fikir·deney). Ailede 8 tip yaşar.

Bu kartın olgusal bölgeleri kanonik sınıflama kaydından üretilmiştir: oz/siniflama/kayit.json · mühür: ebd69128

Anlatı bölgesi elle yazılır ve üreteç o bölgenin sınırını geçmez. Kartı tazelemek için `node arac/ogretim-uret.ts` çalıştırılır.
<!-- /SARMAL:KART_KUNYESI -->

<!-- SARMAL:ANLATI -->
## Anlatı

Bilgi ailesi şu soruyu cevaplar: bu iş neden böyle yapıldı ve bunu nereden biliyoruz? Bir projede en çabuk kaybolan şey koddan çok kodun gerekçesidir. Altı ay sonra dosyaya bakan kişi ne yapıldığını okur, fakat hangi seçeneklerin elendiğini, hangi ölçümün karara dayanak olduğunu ve hangi düşüncenin henüz olgunlaşmadığını göremez. Bu aile o kaybolan katmanı düğüme çevirir.

Ailenin metaforu birikmiş tecrübedir ve üyeleri aynı bilginin farklı olgunluk kademelerini temsil eder. Fikir ham ve taahhütsüz olandır; kendi durumunu ve hangi koşulda yeniden ele alınacağını bildiren bir dönüş tetikleyicisi taşır, olgunlaşırsa Karara yükselir. Karar bağlayıcı olandır; hükmünü ve gerekçesini ayrı ayrı yazar, kilitlendiğinde uygulamayı bağlar ve besler ya da referans kenarıyla Adımın bağlam konisine girer. Çıkarım dışarıdan damıtılan içgörüdür ve kaynağını beyan etmek zorundadır, çünkü kaynağı yazılmayan içgörü doğrulanamaz. Deney hipotezini ve sonucunu taşır ve Kararı besler. Felsefe bir ilkeyi savunan manifestodur, tezini açıkça yazar ve hem Kararı hem Yasayı besler. Formül bilimsel dayanağı, Sözlük alan terimlerini, Mockup ise dış tasarım gerçeğini taşır ve özetlenmeden olduğu gibi referans alınır. Ailenin yasa ailesiyle ilişkisi tek yönlüdür ve bilinçlidir: karar hükmü doğurur, hüküm kanona iner, kanondaki kural da `dayanak` kenarıyla kendisini doğuran karara geri işaret eder.

Canlı örnek Sarmal'ın kendi fikir rafındadır. `oz/fikirler.sar` dosyasında `FKR-ANLATIM-KANITI` kodlu bir Fikir yaşar; durum alanına yazdığı `park` değeriyle beklemede olduğunu bildirir ve `dönüşTetikleyici` alanında "v1 yayın yüzeyi konuşulduğunda ya da Sarmal ilk kez depo dışından birine gösterileceği zaman" koşulunu yazar. Düğümün gövdesi hem savı hem karşı savı taşır, çünkü taahhütsüz bir fikrin dürüst kaydı ancak iki tarafı da yazınca tamamlanır. Ailenin en olgun üyesi de canlıdır: `ogreti/felsefe/prizma.sar` dosyasındaki `Felsefe( kod: FEL-5` düğümü tek kaynaktan doğan dört yüz tezini savunur ve dayandığı kanon maddelerine referans kenarıyla bağlanır. İki düğümü de `gezin` aracına kodlarını sorarak açabilirsin.
<!-- /SARMAL:ANLATI -->

<!-- SARMAL:AILE_ISKELETI -->
## İskelet — sınıflama kaydından üretilir

Aşağıdaki iki tablo makine envanteridir. Elle yapılan düzenleme bir sonraki üretimde silinir; düzeltme kanonik kayda yazılır.

### Tipler ve zorunlu alanları

| Tip | Ne | Zorunlu alanlar |
|---|---|---|
| 📚 Çıkarım | dış kaynaktan damıtılan içgörü: kaynak zorunlu, --> uygulama kenarı GÜÇLÜ TAVSİYE — 'uygulandığı yer' ölü sütun değil canlı ok | kod · ne · kaynak |
| 📚 Deney | hipotez + sonuç (experiment/spike); Karar'ı besler | kod · hipotez |
| 📚 Felsefe | Sarmal'ın bir ilkesini/vizyonunu savunan manifesto belgesi (FEL-*); tez + gerekçe taşır, Karar'ı ve Yasa'yı besler | kod · ne · tez |
| 📚 Fikir | ham/taahhütsüz fikir; olgunlaşırsa Karar'a yükselir | kod · ne · durum · dönüşTetikleyici |
| 📚 Formül | bilimsel formül/temel — adıma informs kenarı | kod · tez · kaynak · ne |
| 📚 Karar | karar kaydı; besler/referans ile Adım'ın bağlam-konisine girer | kod · karar · gerekçe · durum · ne |
| 🖼️ Mockup | dış tasarım gerçeğidir (Figma · HTML · görsel) — olduğu gibi referans alınır; ÖZETLENMEZ, yeri dosya: parametresiyle beyan edilir | kod · ne |
| 📚 Sözlük | alan terimleri sözlüğü (glossary) | kod · ne |

### İzinli sarma ilişkileri

| Tip | İçerebilir | İçine konabilir |
|---|---|---|
| Çıkarım | — | — |
| Deney | — | — |
| Felsefe | — | — |
| Fikir | — | — |
| Formül | — | — |
| Karar | — | Raf |
| Mockup | — | — |
| Sözlük | — | — |
<!-- /SARMAL:AILE_ISKELETI -->
