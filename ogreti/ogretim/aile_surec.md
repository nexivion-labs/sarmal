<!-- SARMAL:KART_KUNYESI -->
# ⚙️ surec ailesi — öğretim kartı

Bu aile kanonik sınıflama kaydında şöyle tanımlanır: yürütme izi (görev · koşum · iz · git) — çalışma anında oluşan kayıt. Ailede 6 tip yaşar.

Bu kartın olgusal bölgeleri kanonik sınıflama kaydından üretilmiştir: oz/siniflama/kayit.json · mühür: 97365b52

Anlatı bölgesi elle yazılır ve üreteç o bölgenin sınırını geçmez. Kartı tazelemek için `node arac/ogretim-uret.ts` çalıştırılır.
<!-- /SARMAL:KART_KUNYESI -->

<!-- SARMAL:ANLATI -->
## Anlatı

Süreç ailesi şu soruyu cevaplar: o gün fiilen ne oldu? Plan olması gerekeni anlatır, nitelik ailesi ölçümün sonucunu taşır; fakat işin hangi ajana verildiği, ne zaman koştuğu, hangi akıl yürütmeyle ilerlediği ve hangi işlemeyle mühürlendiği ayrı bir gerçektir. Bu aile o gerçeği, yani çalışma anında oluşan izi kaydeder.

Ailenin metaforu tutanaktır. Görev ajana atanan iş birimidir ve durumludur; atandı, koşuyor ve bitti kademelerini taşır, dolayısıyla orkestrasyonun en küçük dağıtım birimi odur. Koşum tek bir çalışmanın kaydıdır ve bir kanaldaki tek bir girdinin karşılığıdır. İz ajanın akıl yürütmesinin tutanağıdır ve kararın nasıl oluştuğunu gösterir. Komut ajana verilen emrin kendisidir ve istemin ham hâlini saklar, çünkü sonradan bir çıktı tartışılırken hangi emirle üretildiği bilinmezse tartışma dayanaksız kalır. Git işleme, dal ve sürüm kaydını, Sorun ise takip edilen kusuru taşır. Ailenin plan ailesiyle ilişkisi bilinçli bir ayrımdır: plan niyeti, süreç ise olanı anlatır ve ikisi birbirinin yerine geçemez. Nitelik ailesiyle ayrımı da incedir; nitelik ölçümün kendisini, süreç ise ölçümün alındığı koşuyu kaydeder.

Canlı örnek Sarmal'ın kendi koşum sicilindedir ve altı üyenin hepsini tek dosyada gösterir. `is/nitelik/kosum_sicili.sar` dosyasındaki `Koşum( kod: KSM-SEF-ILK-CANLI,` düğümü orkestrasyon döngüsünün ilk kayıtlı koşusunu tarih ve saatiyle birlikte taşır ve ham izinin hangi dosyada yaşadığını yazar. Aynı dosyadaki `İz( kod: IZ-SEF-URETICI-DENETCI,` düğümü aynı koşunun akıl yürütme tutanağıdır ve denetçi rolünün üreticinin belleğini görmeden yalnız çıktıyı yargıladığını kaydeder. `Komut( kod: KMT-SEF-HALKA-SENK-PROMPT,` düğümü o koşuda üretilen gerçek emir artefaktını gösterir. `Görev( kod: GRV-EMJ-A05-UYGULAMA, durum: bitti,` düğümü ise bir işin atanmasından bitişine kadar olan yolculuğunu tek düğümde kaydeder ve hangi Adımı gerçekleştirdiğini `gerçekleştirir` kenarıyla bildirir. Bu kayıtların herhangi birini kodunu `gezin` aracına vererek açabilirsin.
<!-- /SARMAL:ANLATI -->

<!-- SARMAL:AILE_ISKELETI -->
## İskelet — sınıflama kaydından üretilir

Aşağıdaki iki tablo makine envanteridir. Elle yapılan düzenleme bir sonraki üretimde silinir; düzeltme kanonik kayda yazılır.

### Tipler ve zorunlu alanları

| Tip | Ne | Zorunlu alanlar |
|---|---|---|
| ⚙️ Git | commit/PR/release/branch kaydı | kod · ne |
| ⚙️ Görev | ajana-atanan iş-birimi, durumlu (atandı/koşuyor/bitti); orkestrasyon primitifi | kod · ne |
| ⚙️ İz | ajan akıl-yürütme izi (trace/tutanak) | kod · ne |
| ⚙️ Komut | ajana verilen emir/prompt artefaktı (prompt) | kod · ne |
| ⚙️ Koşum | çalışma kaydı — canlı akış/telsiz izi (run) | kod · ne |
| ⚙️ Sorun | takip edilen bug/issue/feature | kod · ne |

### İzinli sarma ilişkileri

| Tip | İçerebilir | İçine konabilir |
|---|---|---|
| Git | — | — |
| Görev | — | — |
| İz | — | Mekanizma |
| Komut | — | — |
| Koşum | — | — |
| Sorun | — | — |
<!-- /SARMAL:AILE_ISKELETI -->
