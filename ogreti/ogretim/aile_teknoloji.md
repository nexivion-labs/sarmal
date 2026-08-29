<!-- SARMAL:KART_KUNYESI -->
# 🔌 teknoloji ailesi — öğretim kartı

Bu aile kanonik sınıflama kaydında şöyle tanımlanır: bağımlı (adaptör: teknoloji·mcp·araç·model·ortam). Ailede 6 tip yaşar.

Bu kartın olgusal bölgeleri kanonik sınıflama kaydından üretilmiştir: oz/siniflama/kayit.json · mühür: fd91f4ed

Anlatı bölgesi elle yazılır ve üreteç o bölgenin sınırını geçmez. Kartı tazelemek için `node arac/ogretim-uret.ts` çalıştırılır.
<!-- /SARMAL:KART_KUNYESI -->

<!-- SARMAL:ANLATI -->
## Anlatı

Teknoloji ailesi şu soruyu cevaplar: iş neyin üstünde duruyor? Bir planın hangi dille yazılacağı, hangi çalışma ortamında koşacağı, hangi modeli çağıracağı ve hangi dış aracı kullanacağı çoğu depoda yalnız yapılandırma dosyalarından ve alışkanlıktan okunur. Bu aile o zemini ilan edilmiş bir düğüme çevirir, çünkü ilan edilmemiş bir bağımlılık ilk kırıldığında kimsenin sahiplenmediği bir sorun olur.

Ailenin metaforu zemin ve adaptördür. Teknoloji işin yaslandığı somut dış sistemdir; bir yazılım yığını olabildiği gibi işin yürütüldüğü bir kanal da olabilir. Takım tek başına duran teknolojileri bir arada benimsenen tutarlı bir yığın hâline getirir ve üyelerine bağımlılık kenarıyla bağlanır, böylece bir katman tek tek parçaları değil bütün bir takımı çağırabilir. Teknoloji kendi altında dört uzmanlaşmış üyeyi sarar. Araç komut satırından ya da programlama arayüzünden çağrılan dış aracı, MCP ajanların yönetilen araç erişim kapısını, Model yapay zekâ modelinin kaydını ve yönlendirmesini, Ortam ise geliştirme, hazırlık ve canlı ortam ayrımını taşır. Ailenin plan ailesiyle bağı sıkıdır ve kanonda hükme bağlanmıştır: her Katman tam olarak bir somut Teknolojiye `kullanır` kenarıyla bağlanır, çünkü teknolojisiz bir dalın sahipliği belirsizdir ve birden çok teknolojiye bağlı bir dal derleme, sınama ve sorumluluk sınırlarını birbirine karıştırır.

Canlı örnek Sarmal'ın kendi zemin ilanındadır. `is/plan/takimlar.sar` dosyasında `Teknoloji( kod: TEK-TYPESCRIPT`, `TEK-NODE`, `TEK-VSCODE-API`, `TEK-ESBUILD` ve `TEK-SARMAL` düğümleri tek tek ilan edilir. Aynı dosyadaki `Takım( kod: TAKIM-CEKIRDEK,` düğümü bunlardan üçünü `bağımlı: [ TEK-TYPESCRIPT, TEK-NODE, TEK-SARMAL ] )` kenarıyla toplar ve motorun yığınını tek kimlik hâline getirir; `TAKIM-EKLENTI` ise eklentinin ayrı yığınını taşır. Dosya dörtlünün canlı örneklerini de barındırır: `MCP( kod: MCP-SARMAL-SUNUCU` düğümü aracın kendi sunucusunu, `Ortam( kod: ORT-NVIDIA-CANLI` düğümü ise gerçek model koşularının yapıldığı canlı ortamı ilan eder. Bir takımın hangi teknolojileri topladığını görmek için kodunu `gezin` aracına sor; araç hem tanımı hem ona bağlanan her düğümü gösterir.
<!-- /SARMAL:ANLATI -->

<!-- SARMAL:AILE_ISKELETI -->
## İskelet — sınıflama kaydından üretilir

Aşağıdaki iki tablo makine envanteridir. Elle yapılan düzenleme bir sonraki üretimde silinir; düzeltme kanonik kayda yazılır.

### Tipler ve zorunlu alanları

| Tip | Ne | Zorunlu alanlar |
|---|---|---|
| 🔌 Araç | CLI/API dış araç (MCP-dışı) | kod · ne |
| 🔌 MCP | MCP server — ajanların governed araç-erişim kapısı | kod · ne |
| 🔌 Model | AI model registry/routing | kod · kimlik · ne |
| 🔌 Ortam | dev/staging/prod ortamı | kod · ne |
| 🔌 Takım | teknoloji takımı — bir arada benimsenen tutarlı yığın (bağımlı: üyeler); proje/etmen takımı bir bütün çağırır | kod · ne · bağımlı |
| 🔌 Teknoloji | işin yaslandığı somut dış sistem — yazılım yığını (Flutter · Next · FastAPI) ya da işin yürütüldüğü kanal (Google İşletme Profili · Meta hesapları) | kod · ne |

### İzinli sarma ilişkileri

| Tip | İçerebilir | İçine konabilir |
|---|---|---|
| Araç | — | Teknoloji |
| MCP | — | Teknoloji |
| Model | — | Teknoloji |
| Ortam | — | Teknoloji |
| Takım | — | Proje · Uygulama |
| Teknoloji | Araç · MCP · Model · Ortam | Proje · Uygulama |
<!-- /SARMAL:AILE_ISKELETI -->
