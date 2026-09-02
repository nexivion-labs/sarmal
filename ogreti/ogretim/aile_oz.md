<!-- SARMAL:KART_KUNYESI -->
# 🗂️ oz ailesi — öğretim kartı

Bu aile kanonik sınıflama kaydında şöyle tanımlanır: meta / kayıt (sınıflama·durum·hatırlatıcı). Ailede 5 tip yaşar.

Bu kartın olgusal bölgeleri kanonik sınıflama kaydından üretilmiştir: oz/siniflama/kayit.json · mühür: 2cc7ec5e

Anlatı bölgesi elle yazılır ve üreteç o bölgenin sınırını geçmez. Kartı tazelemek için `node arac/ogretim-uret.ts` çalıştırılır.
<!-- /SARMAL:KART_KUNYESI -->

<!-- SARMAL:ANLATI -->
## Anlatı

Öz ailesi şu soruyu cevaplar: sistemin kendisi hakkındaki bilgi nerede yaşar? Bir dil kendi tiplerini nerede sayar, bir klasör ağacı nerede ilan edilir, bir oturum nerede kaldığını nereye yazar ve bugün çözülemeyen bir iş geleceğe nasıl taşınır? Bu soruların hepsi projenin kendine bakışıyla ilgilidir ve bu aile o bakışı taşır.

Ailenin metaforu aynadır: proje kendini bu ailede görür. Kitaplık dallanan klasördür ve içinde rafları taşır; Kitaplıktan Rafa, Raftan kitaba ve sayfaya inen okuma sırası ailenin kendi tanımında yazılıdır. Raf bir klasörün ilanıdır ve yerini `yol` alanından alır; içerik rafın içine sarılır, çünkü rafın kendisi ile üstünde duran şey ayrı şeylerdir. Bu iki tip mimari hükümle doğrudan bağlıdır: yapı önce ilan edilir, disk sonra ona uyar, dolayısıyla ilansız bir klasör drift sayılır ve diskte var olup ilanda olmayan yapı motorca bildirilir. Sınıflama tip sisteminin kendisidir ve gramerin doğrulandığı kaynaktır. DurumKaydı oturumun anlık görüntüsüdür ve nerede kalındığını, sıradaki işin ne olduğunu, hangi hükümlerin kilitli olduğunu birlikte taşır. Hatırlatıcı ise ileri bağlama düğümüdür ve ailenin en özgün üyesidir: bugün çözülemeyen bir borç unutulmaya bırakılmaz, bir çapaya ve bir dönüş koşuluna bağlanır, böylece o koşul gerçekleştiğinde borç kendiliğinden gündeme gelir.

Canlı örnek okumakta olduğunuz kartın kendi adresidir. `sarmal_anadizin.sar` dosyasında `Raf( kod: RAF-OGRETIM, yol: "ogretim/"` ilanı bulunur ve bu kartların yaşadığı klasörü kanona bağlar; ilan, kartların olgusal bölgelerinin sınıflama kaydından üretildiğini ve anlatı bölgesinin elle yazıldığını da bildirir. Aynı dosyadaki `Kitaplık( kod: KTP-OZ, yol: "oz/"` düğümü `Sınıflama( kod: SNF-0` düğümünü içine sarar ve tip kanonunun adresini gösterir. Ailenin ileri bağlama üyesi de canlıdır: `oz/hatirlaticilar.sar` dosyasındaki `HTR-TASIYICI-MUTABAKAT-KORLUGU` kodlu Hatırlatıcı durum alanında `açık` ve öncelik alanında `p1` değerleriyle bekler, çünkü kanon maddesinin makine taşıyıcısı ile belge metninin ayrışmasına izin veren açık henüz kapanmamıştır. Bu düğümlerin herhangi birini kodunu `gezin` aracına vererek açabilirsin.
<!-- /SARMAL:ANLATI -->

<!-- SARMAL:AILE_ISKELETI -->
## İskelet — sınıflama kaydından üretilir

Aşağıdaki iki tablo makine envanteridir. Elle yapılan düzenleme bir sonraki üretimde silinir; düzeltme kanonik kayda yazılır.

### Tipler ve zorunlu alanları

| Tip | Ne | Zorunlu alanlar |
|---|---|---|
| 🗂️ DurumKaydı | oturum/rehydrate anlık-görüntü kaydı (DRM — nerede kaldık) | kod · tarih · neredeyiz · sıradaki |
| 🗂️ Hatırlatıcı | ileri-bağlama düğümü (forward-binding) | kod · durum · çapa · ne |
| 📚 Kitaplık | dallanan klasör — kitaplıkta RAFLAR (ve bölüm olarak alt-kitaplıklar) durur; metafor: Kitaplık › Raf › Kitap › Sayfa | kod · yol · ne |
| 🗄️ Raf | klasör ilanıdır — yapının rafıdır; yeri yol: parametresinden gelir ve içerik rafın içine sarılır, çünkü raf ile içerik ayrı şeylerdir | kod · ne |
| 🗂️ Sınıflama | bu tip sistemi | kod · ne |

### İzinli sarma ilişkileri

| Tip | İçerebilir | İçine konabilir |
|---|---|---|
| DurumKaydı | — | — |
| Hatırlatıcı | — | — |
| Kitaplık | Kitaplık · Raf · Uygulama · Proje | ÇalışmaAlanı · Kitaplık · Proje · Uygulama |
| Raf | Altyapı · Anayasa · ArkaGörev · Ayar · Blok · Canlandırma · Durum · Ekran · Etmen · Gizli · Karar · Kuyruk · Mekanizma · Metrik · Olay · Orkestrasyon · Döngü · Proje · Servis · Sözleşme · Sınama · Sınıflama · Tablo · Tema · Uygulama · Yasa · Zamanlayıcı · Önbellek | ÇalışmaAlanı · Kitaplık · Proje · Uygulama |
| Sınıflama | — | Raf |
<!-- /SARMAL:AILE_ISKELETI -->
