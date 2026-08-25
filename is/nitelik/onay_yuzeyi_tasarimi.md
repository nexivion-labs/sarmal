# Onay yüzeyi tasarımı

## 1. Ölçüm

### Ölçüm yöntemi ve güncel sayılar

Belirtilen yedi dosyanın tamamı satır numaralarıyla okundu. Güncel kapı sayısı, `onay-tarayici.ts` ile aynı dışlama evreni ve aynı saf karar işlevi kullanılarak çalışma ağacındaki `.sar` dosyaları üzerinde yeniden üretildi. Bu yeniden üretimde 298 dosya, 4.415.868 bayt (4,211 MiB), sıfır ayrıştırma hatası ve on bir açık kapı bulundu. On bir kapı üç dosyadadır:

- `_Sarmal/plan/cokdillilik.sar:190` satırında `CDL-A07` vardır.
- `_Sarmal/plan/goc_plani.sar:1287`, `:1518` ve `:1703` satırlarında sırasıyla `GOC-PROJEKOD-A99`, `GOC-TERFI-A99` ve `GOC-BELGE-A99` vardır.
- `_Sarmal/plan/vitrin_ui.sar:275`, `:289`, `:304`, `:329`, `:352`, `:415` ve `:432` satırlarında sırasıyla `VIT-GRAF-A10`, `VIT-GRAF-A11`, `VIT-GRAF-A12`, `VIT-POSTA-A01`, `VIT-POSTA-A02`, `VIT-KIMLIK-A02` ve `VIT-KIMLIK-A03` vardır.

Görevde verilen canlı performans taban çizgisi 296 belge, 4,18 MiB okuma, 49,2 MiB önbellek ve beş kapıdır. Bugünkü çalışma ağacı bu taban çizgisinden iki kapsam içi `.sar` dosyası ve altı kapı ileridedir. Bu nedenle uygulama nöbeti sabit bir “296 dosya” sayısına değil, o koşumdaki kapsam içi dosya sayısına karşı açılan belge sayısını ölçmelidir. Bu incelemede VS Code eklenti konağının yığın belleği yeniden ölçülmedi; 49,2 MiB değeri görevde verilen canlı ölçümdür, bu belgenin yeniden ürettiği bir değer değildir.

Tam tarama önce `findFiles` ile kapsam içi bütün `.sar` dosyalarını bulur, sonra her biri için `openTextDocument` çağırır ve belgeyi `programAl` üzerinden ayrıştırır (`_Sarmal/eklenti/src/onay-tarayici.ts:65-74`). `programAl`, programı belge kimliği ve sürümüyle bellekte tutar (`_Sarmal/eklenti/src/onbellek.ts:18-30`). Dolayısıyla açılışta açılan belge sayısı, kapı sayısı değil, kapsam içi `.sar` sayısıdır: görevdeki canlı koşumda 296, bugünkü çalışma ağacında 298 belgedir. Bu çağrı sekme göstermez, ancak her belgeyi VS Code `TextDocument` yaşam döngüsüne ve paylaşımlı ayrıştırma önbelleğine sokar.

Ölçümün önemli bir sınırı vardır: eklentinin ana tanı hattı da başlangıçta aynı kapsamı ayrıca bulup her URI için `openTextDocument` çağırır (`_Sarmal/eklenti/src/eklenti.ts:140-158`) ve bu hattı başlangıçta tetikler (`:254-255`). Bu nedenle 298 sayısı, onay tarayıcısının doğrudan yaptığı açma çağrılarının sayısıdır; bütün eklentideki benzersiz URI sayısı yine 298 olsa da aynı URI'ler birden fazla tam turdan geçebilir. Aşağıdaki performans önerisi onay yüzeyinin ikinci açma ve ayrıştırma turunu kaldırır; ana tanı hattının bütün ürün belleğini sıfırladığı iddiasında bulunmaz.

### Bugünkü yüzeyler

Bugün dört karar giriş noktası vardır. Comments iş parçacığı aynı nesneyi hem Açıklamalar panelinde hem editör içinde çizdiği için fiziksel yerleşim sayısı beştir; buna karşılık kullanıcının seçebildiği karar akışlarının sayısı dörttür.

| Giriş noktası | Bugünkü işi | Karara giden yol |
|---|---|---|
| Komut paletindeki `sarmal.onayKuyrugu` komutu | Her çağrıda bütün çalışma alanını yeniden tarar, kapıları bir `QuickPick` listesinde gösterir, seçilen dosyayı açar ve ikinci bir karar listesi ile not kutusu gösterir. | `kuyrukKomutu` → `kararSor` → `kaydiIsle` zinciri `_Sarmal/eklenti/src/onay-kuyrugu.ts:196-239` satırlarında yaşar; komut bildirimi `_Sarmal/eklenti/package.json:380-384` satırlarındadır. |
| Kapı satırının CodeLens'i | Açık belgedeki her kapı için satır üstünde “karar ver” bağlantısı üretir ve aynı karar listesine gider. | Sağlayıcı ile komut `_Sarmal/eklenti/src/onay-kuyrugu.ts:299-324` satırlarındadır. |
| Comments iş parçacığı | Her kapı için bir karşılama yorumu, ayrıntılı bağlam, yanıt kutusu ve üç karar düğmesi üretir. Aynı iş parçacığı Açıklamalar panelinde ve dosya görünür olduğunda editör içinde yaşar. | Denetleyici ve iş parçacığı `_Sarmal/eklenti/src/onay-kuyrugu.ts:56-86`, yanıtın tek yazıcıya inişi `:149-155`, düğmelerin menü bildirimi `_Sarmal/eklenti/package.json:435-470` satırlarındadır. |
| Posta Kutusu TreeView'ı | Kapıları dosyaya göre iki kademeli ağaçta gösterir; görünüş rozeti toplamı sayar, bir kapı satırı dosyayı açıp yine `kararSor` akışına gider. | Sağlayıcı `_Sarmal/eklenti/src/posta-kutusu.ts:59-160`, görünüş kaydı `:168-177`, görünüş kimliği ve adı `_Sarmal/eklenti/package.json:592-597` satırlarındadır. |

Dört yol da aynı `kaydiIsle` işlevinde birleşir (`_Sarmal/eklenti/src/onay-kuyrugu.ts:109-147`). Bu tek yazıcı doğru bir mimari özelliktir; kusur, aynı yazıcıya ulaşmanın dört ayrı “asıl karar yeri” gibi sunulmasıdır.

### Tazelenme olayları

Posta Kutusu kendi tarayıcısını veya zamanlayıcısını kurmaz. `yerlestirHepsi`, `yerlestirDosya` ve `dusur` çağrılarıyla onay kuyruğunun olay hattından beslenir; içerik parmak izi değişmedikçe yeniden çizmez (`_Sarmal/eklenti/src/posta-kutusu.ts:70-89`). Hatırlatıcılar ve Gözlemler de kendilerine verilen kayıtları parmak izi değiştiğinde çizer, tarama veya karar mantığı kurmaz (`_Sarmal/eklenti/src/hatirlaticilar.ts:43-73`; `_Sarmal/eklenti/src/bildirimler.ts:45-68`). Bu komşu desen doğrudur.

Bugünkü olay matrisi şöyledir:

| Olay | Comments yüzeyi | Posta Kutusu | Ek maliyet |
|---|---|---|---|
| Eklenti etkinleşmesi | `tumunuTara`, bulunan her kapı için koşulsuz `kutuAc` çağırır. | Aynı bulgu dizisi `yerlestirHepsi` ile panele iner. | Kapsam içi bütün belgeler açılır ve ayrıştırılır; çağrı `_Sarmal/eklenti/src/onay-kuyrugu.ts:379-380` satırlarındadır. |
| `sarmal.onayKuyrugu` komutu | Bütün kapı iş parçacıkları elden çıkarılıp yeniden yaratılır, çünkü `kutuAc` önce aynı anahtardaki iş parçacığını kapatır. | Tam liste yeniden yerleştirilir. | Komut her çağrıda yeniden tam tarama yapar (`_Sarmal/eklenti/src/onay-kuyrugu.ts:59-62`, `:173-187`, `:196-197`). |
| Etkin editörün değişmesi | Yeni etkin belgenin eksik iş parçacıkları açılır, kapanmış kapıları elenir. | Yalnız o belgenin kayıtları yerleştirilir. | Olay `_Sarmal/eklenti/src/onay-kuyrugu.ts:368` satırındadır. |
| Belgenin kaydedilmesi | Belge hemen tazelenir. | Aynı turda aynı belge yerleştirilir. | Olay `_Sarmal/eklenti/src/onay-kuyrugu.ts:369` satırındadır. |
| Belgenin yazılırken değişmesi | Değişen belgeler geciktirilmiş tek turda tazelenir. | Aynı geciktirilmiş turdan beslenir. | Biriktirme ve geciktirme `_Sarmal/eklenti/src/onay-kuyrugu.ts:242-249`, olay kaydı `:370-374` satırlarındadır. |
| Dosyanın dışarıdan yaratılması veya değiştirilmesi | Dosya `openTextDocument` ile açılır ve iş parçacıkları tazelenir. | Aynı dosyanın panel kaydı tazelenir. | İzleyici ve açma işlemi `_Sarmal/eklenti/src/onay-kuyrugu.ts:251-258`, olay bağları `:375-376` satırlarındadır. |
| Dosyanın silinmesi | O dosyanın bütün iş parçacıkları elden çıkarılır. | Dosya defterden düşürülür. | İşlem `_Sarmal/eklenti/src/onay-kuyrugu.ts:260-266` ve `:377` satırlarındadır. |

### Aynı kapı için yaratılan nesneler ve çakışma

Açılışta her kapı için kesin olarak bir `Comment`, bir `CommentThread` ve Posta Kutusu defterinde bir kapı kaydı yaratılır. TreeView görünür olup VS Code öğeyi istediğinde aynı kapı için ayrıca bir `TreeItem` yaratılır. Bu nedenle tek kapının iki bağımsız etkileşimli temsili vardır: Comments iş parçacığı ile Posta Kutusu satırı. İş parçacığının içindeki karşılama yorumu da sayılırsa, görünür ağaç çizildiğinde kapı başına en az üç kapı düzeyli arayüz nesnesi vardır. Bugünkü on bir kapıda bu, on bir karşılama yorumu, on bir iş parçacığı ve görünüş çizildiğinde on bir kapı `TreeItem`ı demektir; üç dosya için ayrıca üç üst kademe `TreeItem`ı oluşur.

Posta modelinin tuttuğu `OnayKapisi` verisi tarayıcıdaki nesneye başvurur; karar gerçeği ikinci kez hesaplanmaz. Yine de yüzey nesneleri ve yaşam döngüleri ayrıdır. Ayrıca `QuickPickItem` ve `CodeLens` nesneleri komut çalıştığında veya görünür belge için sağlayıcı çağrıldığında geçici olarak bunlara eklenir. VS Code, bir `CommentThread` yaratıldığında onu hem görünür metin editörlerinde hem Açıklamalar panelinde göstereceğini açıkça bildirir. Dolayısıyla Comments tarafındaki iki fiziksel çizim, rastlantısal bir VS Code kusuru değil, API sözleşmesidir.

Tam çakışma `_Sarmal/eklenti/src/onay-kuyrugu.ts:178-186` satırlarındadır: aynı `bulgular` dizisinin her öğesi önce `kutuAc` ile Comments iş parçacığına, ardından `yerlestirHepsi` ile Posta Kutusu kaydına çevrilir. Üstelik iş parçacığı yaratılamayan kapı özellikle Posta Kutusunda tutulur (`:184-186`); bu, iki yüzeyin görünür sayılarının Comments oluşturma hatası veya Comments süzgeci yüzünden ayrışabileceğini kodun kendisinin kabul ettiğini gösterir.

## 2. Kök neden

Dosyanın tarihsel açıklaması ilk kararı açıkça kaydeder:

> “ESAS YÜZEY seçim listesidir (0.9.74): VS Code 1.128 Comments arayüzünü hiç çizmedi … Satır-üstü pencereler, VS Code'un onları çizdiği sürümlerde BONUS yüzeydir.”

Bu kayıt `_Sarmal/eklenti/src/onay-kuyrugu.ts:17-21` satırlarındadır. Aynı dosyanın komut açıklaması, 0.9.73 saha bulgusunu tekrarlar ve Comments yüzeyinden bağımsız uçtan uca bir yedek akış kurulduğunu söyler (`:190-195`). Bu karar verildiğinde Comments nesneleri yaşadığı hâlde hiçbir yerde çizilmiyordu; `QuickPick` akışı o gün için doğru bir dayanıklılık önlemiydi.

Daha sonra Founder, karar bekleyen işlerin komut paletinde aranmasını istemedi ve Posta Kutusu kalıcı paneli eklendi. Yeni panelin kendi açıklaması bunu “kapılar kenar çubuğunda, sayılarıyla, tek tıkla karara götüren satırlar” olarak tanımlar (`_Sarmal/eklenti/src/posta-kutusu.ts:4-9`). Panel eklenirken tarayıcı ve olay hattı doğru biçimde tekilleştirildi, fakat eski yedek yüzeylerin rolü yeniden tanımlanmadı. `tumunuTara` hâlâ açılışta her kapı için Comments iş parçacığı yaratmakta, komut hâlâ ayrı kuyruk listesi açmakta ve CodeLens hâlâ doğrudan karar yazdırmaktadır.

Kök neden basit bir ihmal değildir. Kök, geçerliliğini yitirmiş bir olağanüstü durum kararının ürün davranışı olarak kalmasıdır: çizilmeyen Comments yüzeyine karşı kurulan seçim listesi yedeği emekliye ayrılmamış, Comments yeniden görünür olduğunda “bonus” yüzey kalmış, ardından yeni asıl kuyruk bunların yanına eklenmiştir. İhmal, Posta Kutusu eklenirken eski yedeğin kaldırılmaması veya tek işlik karar ayrıntısına dönüştürülmemesidir.

Bu durum YUZ-1.2'nin yalnız veri katmanında sağlanıp sunum katmanında bozulmasıdır. Tarayıcı tektir (`_Sarmal/eklenti/src/onay-tarayici.ts:2-19`), karar yazıcısı tektir, fakat kullanıcının “bekleyen işlerin asıl listesi hangisidir?” sorusuna iki panel ve bir geçici liste ayrı ayrı cevap verir. Comments görünürlüğü, süzgeci ve nesne yaratma hataları Posta Kutusu defterinden ayrı yaşadığı için aynı kaynaktan beslenmek tek başına bayatlama riskini ortadan kaldırmaz.

## 3. Endüstri standardı

### Kuyruk ile karar yüzeyi aynı şey değildir

Kuyruk, bütün bekleyen işleri taramak, saymak, süzmek, gruplamak ve bir işe gitmek içindir. Karar yüzeyi ise seçilmiş tek işin bağlamını okumak, not yazmak ve hüküm vermek içindir. Endüstri standardı bu iki işi bir ana-öğe/ayrıntı düzeninde ayırır; aynı listeyi iki ayrı panelde çoğaltmaz.

VS Code'un kendi [Views arayüz rehberi](https://code.visualstudio.com/api/ux-guidelines/views), TreeView'ın veri göstermek için kullanılmasını, görünüş sayısının düşük tutulmasını ve var olan işlevin tekrarlanmamasını açıkça önerir. [Tree View API rehberi](https://code.visualstudio.com/api/extension-guides/tree-view), kenar çubuğunda yerleşik VS Code görünüşleriyle aynı üslupta, hiyerarşik içerik göstermek için bu bileşeni tanımlar. Dosyaya göre gruplanan, rozetle sayılan ve seçildiğinde ayrıntıya götüren kapı kümesi bu amaca doğrudan uyar.

VS Code API'sinde `CommentThread`, “bir belgenin belirli aralığındaki konuşmayı temsil eden yorumlar topluluğu” olarak tanımlanır. Aynı [Comments API başvurusu](https://code.visualstudio.com/api/references/vscode-api), yaratılan iş parçacığının görünür editörlerde ve Açıklamalar panelinde gösterildiğini söyler. Kapı, kaynak satırına bağlı bir inceleme sorusu, bağlam metni ve isteğe bağlı not taşıdığı için Comments API tek işlik karar konuşmasına uygundur. Buna karşılık bütün çalışma alanı kuyruğunu Comments iş parçacıklarına çevirmek, API'nin zorunlu Açıklamalar izdüşümünü ikinci bir kuyruk paneline dönüştürür.

[Quick Pick rehberi](https://code.visualstudio.com/api/ux-guidelines/quick-picks), bu bileşeni bir eylem yürütmek, kısa girdi almak veya bir listeden geçici seçim yapmak için konumlandırır ve mevcut işlevin tekrar edilmemesini ister. Quick Pick bir komut içindeki kısa seçim için uygundur; sürekli görünmesi, sayılması ve gezinilmesi gereken çalışma kuyruğunun evi değildir. CodeLens de görünür kaynak bağlamına bağlı, tıklanabilir bir kısayoldur; çalışma alanı genelindeki kuyruğu temsil etmemelidir.

Yaygın araçlar aynı ayrımı uygular:

- VS Code'un resmî [GitHub Pull Requests and Issues anlatımı](https://code.visualstudio.com/docs/sourcecontrol/github), çekme isteklerini önce Pull Requests görünüşünde listeler; seçilmiş çekme isteğinin açıklama sayfasında onaylama, kapatma ve birleştirme işlemlerini, değişiklik dosyalarında ise satır içi yorumları sunar. Liste, tek incelemenin ayrıntısı ve satır bağlamı ayrı rollerdir.
- GitHub eklentisinin resmî deposu, varsayılan ağaç sorgularından birini doğrudan “Waiting For My Review” olarak tanımlar ve aynı eklentinin editör içi yorumla inceleme yaptığını belirtir. Bu davranış [microsoft/vscode-pull-request-github](https://github.com/microsoft/vscode-pull-request-github) deposunda belgelenmiştir.
- GitLab'ın resmî [VS Code proje iş akışı](https://docs.gitlab.com/editor_extensions/visual_studio_code/projects/) belgesi, atanmış ve inceleme bekleyen işlerle birleştirme isteklerini kenar çubuğunda listeler; bir öğe seçilince yeni sekmede Genel Bakış ve dosya listesi açılır, yorumlar ve konuşmalar dosya farkında satır içinde yürütülür. Yine kuyruk ile tek işin inceleme yüzeyi ayrıdır.
- VS Code'un yerleşik [Sorunlar davranışı](https://code.visualstudio.com/docs/editing/editingevolved), bütün hata ve uyarıları Sorunlar panelinde sayıp listeler; seçilmiş sorunun ayrıntısını ve olası Kod Eylemlerini editör içinde gösterir. Aynı tanının iki bağımsız sorun paneli yoktur.

Bu kaynaklardan çıkan tasarım sonucu bir çıkarımdır: Posta Kutusu bekleyen işlerin tek kalıcı kuyruğu olmalı; Comments, bütün kuyruğu taşımak yerine seçilmiş tek kapının kaynak bağlamına bağlı karar ayrıntısı olmalıdır. Komut paleti ve CodeLens yeni gerçek kaynakları değil, bu iki yüzeye giden kısayolları sağlamalıdır.

## 4. Öneri

### Seçenek A — Tek Posta Kutusu ve isteğe bağlı tek etkin karar iş parçacığı

Bu seçenek tavsiye edilir. Sistem iki işlevsel yüzeye ayrılır:

1. Posta Kutusu, çalışma alanındaki bütün açık kapıların tek kalıcı kuyruğudur.
2. Comments, kullanıcının seçtiği yalnız bir kapının etkin karar yüzeyidir; iş parçacığı ancak kullanıcı o kapıyı açtığında yaratılır ve aynı anda en fazla bir Sarmal onay iş parçacığı yaşar.

Comments API aynı iş parçacığını editör ile Açıklamalar panelinde birlikte gösterir. Bu iki çizim iki ayrı gerçek veya iki ayrı nesne değildir; VS Code'un aynı karar nesnesine verdiği iki yerleşimdir. Açıklamalar panelinde bütün kuyruk değil, yalnız etkin karar görünür. Denetleyici kimliği `sarmal-onay` korunur, fakat kullanıcıya görünen etiketi “Sarmal Onay Kuyruğu” yerine “Sarmal Etkin Karar” olur; böylece Açıklamalar paneli ikinci kuyruk gibi adlandırılmaz.

Dört giriş noktasının yeni işi tek cümleyle şöyledir:

| Giriş noktası | Yeni işi |
|---|---|
| Komut paletindeki `sarmal.onayKuyrugu` | Komut yeni bir liste veya karar iletişimi yaratmadan mevcut `sarmalPostaKutusu` görünüşüne odaklanır. |
| CodeLens | CodeLens yalnız bulunduğu satırdaki kapıyı Posta Kutusunda seçer ve aynı kapının tek etkin Comments karar yüzeyini açar. |
| Comments iş parçacığı | Comments yalnız seçilmiş kapının bağlamını, not kutusunu ve üç hüküm düğmesini taşır; kullanıcı kararı yalnız burada verir. |
| Posta Kutusu | Posta Kutusu bütün bekleyen kapıları sayar, dosyaya göre gruplar ve seçilen kapıyı karar yüzeyinde açar; kendisi hüküm yazmaz. |

Karar düğmelerinin üçü de mevcut `kaydiIsle` yazıcısını çağırır. `onay:` biçimi, damgalar, tarih, not ekleme, yazım doğrulaması ve dosyaya kaydetme davranışı değişmez. Posta Kutusu satırı ve CodeLens artık `kararSor` adlı ikinci karar arayüzünü açmaz; ikisi de aynı `etkinKarariAc` akışına gider. Etkin kapı kapanınca, dosya silinince veya karar başarıyla yazılınca iş parçacığı elden çıkarılır. Başka bir kapıya geçerken Comments API taslak metnini dışarı vermediği için kullanıcıya yazılmamış notun kaybolabileceği açıkça söylenir ve geçiş onayı alınır.

Açılışta kapı listesi yine yalnız `onay-tarayici.ts` üzerinden üretilir. Tercih edilen yol, ana tanı hattının zaten ürettiği URI–`Program` anlık görüntüsünü `onay-tarayici.ts` dosyasına vermek ve kapıları yalnız orada çıkarmaktır; `eklenti.ts` kapı tanımaz, yalnız ortak ayrıştırma sonucunu taşır. Ana tanı hattı kapalıysa veya henüz görüntü üretmediyse aynı tarayıcının yedeği dosyayı `workspace.fs.readFile` ile okur, saf ayrıştırıcıyla kapıları çıkarır, yalnız `OnayKapisi` sonuçlarını tutar ve tam AST'yi paylaşımlı belge önbelleğine koymaz. Açık veya değişmekte olan bir belge için bugünkü `belgeKapilari(doc)` yolu korunur; böylece kaydedilmemiş metin panelde geciktirilmiş olarak görünmeye devam eder.

Bu düzen, bugünkü çalışma ağacında onay yüzeyinin açılışta doğrudan yaptığı `openTextDocument` çağrısını 298'den sıfıra ve otomatik `CommentThread` sayısını on birden sıfıra indirir. Ortak anlık görüntü hazırsa ikinci dosya okuma ve ikinci ayrıştırma turu da sıfırdır; yedek yol gerekirse 4,211 MiB metni bir kez okur, fakat bunu 298 VS Code belgesine ve kalıcı onay AST önbelleğine çevirmez. Ana tanı hattının kendi belge açma ve önbellek davranışı bu tasarımın dışında ayrıca ölçülmeye devam eder.

Founder'ın beğendiği görünüm kaybolmaz. Posta Kutusu zaten dosya satırında `.sar` dosya simgesini `resourceUri` ile, kapı satırında sarı mesaj balonunu `comment` simgesiyle taşır (`_Sarmal/eklenti/src/posta-kutusu.ts:128-148`). Seçilmiş işte editör içindeki genişletilmiş mesaj, ayrıntılı bağlam ve yanıt kutusu da korunur. Değişen tek şey, bu zengin iş parçacıklarının on birinin birden açılışta yaratılmaması ve Açıklamalar panelinde ikinci bir kuyruk oluşturmamasıdır.

Bu seçeneğin artıları şunlardır:

- Kullanıcı bir tek kalıcı kuyruğa ve bir tek karar yerine sahip olur; “asıl olan hangisi?” sorusu ortadan kalkar.
- Founder'ın seçtiği dosya simgesi, mesaj balonu ve editör içi yanıt kutusu korunur.
- Açılışta onay yüzeyinin ek belge açma, Comments nesnesi yaratma ve AST önbelleğini büyütme maliyeti kökten azalır.
- Komut, CodeLens ve panel satırı erişilebilir kısayollar olarak kalır, fakat ayrı karar uygulamaları olmaktan çıkar.
- Görünüş kimliği ile diskteki `onay:` sözleşmesi değişmez.

Bu seçeneğin eksileri şunlardır:

- VS Code aynı etkin iş parçacığını Açıklamalar panelinde de göstereceği için seçilmiş kapının özeti Posta Kutusunda, ayrıntısı Açıklamalarda aynı anda görülebilir; ancak bunlar ayrı kuyruklar değil, ana öğe ile etkin ayrıntıdır.
- Kullanıcı başka kapıya geçerken yazılmamış Comments taslağını korumak için bir onay adımı gerekir.
- Ortak anlık görüntü bulunmadığında çalışan yedek tarama disk metnini saf biçimde ayrıştıracağı için açık belge ile disk sürümü arasındaki öncelik kuralı açıkça uygulanmalı ve sınanmalıdır.

### Seçenek B — Yalnız Posta Kutusu ve geçici karar listesi

Bu seçenekte Comments denetleyicisi tümüyle kaldırılır. Posta Kutusu tek kuyruk olarak kalır; kapı satırı veya CodeLens seçildiğinde bugünkü `kararSor` Quick Pick'i ve ardından not için `InputBox` açılır. Komut paleti yine yalnız Posta Kutusuna odaklanır.

Bu seçeneğin artıları şunlardır:

- Açıklamalar ile Posta Kutusu arasında hiçbir eşzamanlı kapı çizimi kalmaz.
- Comments yaşam döngüsü, süzgeci ve iş parçacığı hataları tümüyle ortadan kalkar.
- Açılışta sıfır Comments nesnesi yaratılır ve uygulama değişikliği Seçenek A'dan daha küçüktür.

Bu seçeneğin eksileri şunlardır:

- Founder'ın beğendiği editör içi genişletilmiş mesaj ve yanıt kutusu kaybolur.
- Dosya simgesi ile mesaj balonu Posta Kutusunda korunur, fakat Comments balonunun kaynak satırına yapışık bağlamı korunamaz.
- Karar, bağlamın yanında duran tek yüzey yerine ardışık Quick Pick ve InputBox adımlarına bölünür; özellikle şerhli onay ve ret gerekçesi daha zayıf bir inceleme deneyimine dönüşür.

### Tavsiye edilen karar

Seçenek A tavsiye edilir. Gerekçe, VS Code ve yaygın inceleme eklentilerindeki ana-öğe/ayrıntı standardını uygularken hem tek kuyruk ilkesini hem de Founder'ın açıkça beğendiği satır içi yorum ve yanıt deneyimini birlikte korumasıdır. Bu tasarım için açık bir mimari Founder kararı kalmamıştır; uygulama sonundaki canlı görünüm kabulü yine Founder'ın görsel kapısıdır, fakat iki seçenek arasında uygulamacıyı bekleten bir hüküm yoktur.

## 5. Uygulama kalemleri

1. `_Sarmal/eklenti/src/onay-tarayici.ts`, ana tanı hattının URI–`Program` anlık görüntüsünden kapı üreten tek işlevi taşımalıdır. Ana görüntü yoksa çalışan yedek yol `openTextDocument` ve paylaşımlı belge önbelleği yerine `workspace.fs.readFile` ile tek kullanımlık saf ayrıştırma yapmalıdır; açık belgeye özgü `belgeKapilari(doc)` yolu korunmalıdır. Nöbet, ana görüntü verildiğinde ek okuma, ek `findFiles` ve `openTextDocument` çağrılarının sıfır olduğunu; yedek yolda her kapsam içi dosyanın en çok bir kez okunduğunu ve iki yolun da güncel çalışma ağacında aynı on bir kapıyı döndürdüğünü ölçmelidir.

2. `_Sarmal/eklenti/src/eklenti.ts`, başlangıç tanı turunda zaten kurduğu `programlar` görüntüsünü kapı üretmeden `onay-tarayici.ts` dosyasına iletmelidir. Etkinleşme sırası, onay hattının ana turun sonucunu beklemesini ve ana turun görüntü üretemeyeceği kesinleşmeden yedek taramayı başlatmamasını sağlamalıdır; böylece iki tur yarışmaz. Tanı ayarı kapalıysa onay tarayıcısının tek yedek turu devreye girmelidir. Nöbet, ana tanı ile onay hattı arasında çalışma alanı kapsamının bir kez ayrıştırıldığını, onayın ikinci bir tam tur oluşturmadığını ve tanı ayarı kapalıyken Posta Kutusunun yine doğru sayıyı gösterdiğini ölçmelidir.

3. `_Sarmal/eklenti/src/onay-kuyrugu.ts` içindeki `tumunuTara`, her bulgu için `kutuAc` çağırmayı bırakmalı ve yalnız tek tarayıcı sonucunu Posta Kutusuna yerleştirmelidir. Nöbet, etkinleşme sonrasında canlı `CommentThread` sayısının sıfır, Posta Kutusu kapı sayısının tarayıcı sayısına eşit ve onaya ait bağımsız tam tarama sayısının sıfır olduğunu ölçmelidir.

4. Aynı dosyada en fazla bir iş parçacığı tutan `etkinKarariAc` sorumluluğu kurulmalı; Posta Kutusu satırı ile CodeLens bu sorumluluğa yönelmelidir. Yeni bir kapıya geçmeden önce önceki etkin iş parçacığı için geçiş onayı istenmeli, kapanan veya silinen kapının iş parçacığı otomatik elden çıkarılmalıdır. Nöbet, ilk seçimde bir iş parçacığı yaratıldığını, ikinci seçimin ardından canlı sayının yine bir olduğunu ve eski nesnenin elden çıkarıldığını ölçmelidir.

5. `_Sarmal/eklenti/src/onay-kuyrugu.ts` içindeki `sarmal.onayKuyrugu` komutu tam tarama ve Quick Pick kuyruğu açmak yerine mevcut `sarmalPostaKutusu` görünüşüne odaklanmalıdır. `kararSor` hiçbir giriş noktasının karar yazma yolu olmaktan çıkarılmalı; üç Comments düğmesi tek kullanıcı karar yüzeyi olmalıdır. Nöbet, komut çağrısında tam tarama, `QuickPick` ve `kaydiIsle` sayılarının sıfır olduğunu ölçmelidir.

6. `_Sarmal/eklenti/src/posta-kutusu.ts` içindeki kapı satırı komutu, dosyayı ve doğru kapıyı bulduktan sonra Quick Pick kararı yerine etkin Comments kararını açmalıdır. Dosya `resourceUri`si, sarı mesaj balonu, rozet, dosya gruplaması ve görünüş kimliği korunmalıdır. Nöbet, bir satır tıklamasının yalnız bir belge açtığını, bir etkin iş parçacığı yarattığını, doğrudan yazım yapmadığını ve dosya ile kapı simgelerinin değişmediğini ölçmelidir.

7. `_Sarmal/eklenti/package.json` içinde `sarmalPostaKutusu` görünüş kimliği, `sarmal-onay` denetleyicisini hedefleyen üç Comments menü koşulu ve `sarmal.onayKuyrugu` komut kimliği korunmalıdır. Yalnız kullanıcıya görünen komut adı “Onay kuyruğu” yerine “Posta Kutusunu aç” anlamını açıkça taşımalıdır. Nöbet, paket görünüş kimliği ile `_Sarmal/eklenti/src/yuzey-cekirdek.ts:43` sabitinin birebir `sarmalPostaKutusu` kaldığını ve menü koşullarının aynı denetleyici kimliğine baktığını ölçmelidir.

8. `_Sarmal/eklenti/src/onay-cekirdek.ts` içindeki üç koşullu kapı tespiti ile `OnayDefteri` tek gerçek olarak korunmalı; `kaydiIsle` tarafından yazılan `onay:` kayıt biçimi değiştirilmemelidir. `_Sarmal/eklenti/sinama/onay-kuyrugu.test.ts` nöbeti mevcut damgaların gidiş-dönüşte kapıyı kapattığını, eski disk kayıtlarının okunabildiğini ve tarayıcı kabuğu değişse de on bir güncel kapının saf kuralla aynı kaldığını ölçmelidir.

9. `_Sarmal/eklenti/sinama/posta-kutusu.test.ts` içindeki “komut ve panel aynı listeyi ayrı ayrı tüketir” varsayımı yeni role göre değiştirilmelidir. Yeni nöbet, çalışma alanı listesini yalnız Posta Kutusunun tuttuğunu, komutun o görünüşe odaklandığını, yazma yetkisinin yalnız Comments karar düğmelerinden `kaydiIsle` işlevine indiğini ve aynı içerikte yinelenen `onDidChangeTreeData` olayı üretilmediğini ölçmelidir.

10. Bir eklenti-konağı bütünleşme nöbeti etkinleşme, yazma, kaydetme, dış dosya değişikliği ve silme olaylarını ayrı ayrı saymalıdır. Kabul ölçüsü; ana tanı ile onay hattı arasında bir ortak çalışma alanı turu ve sıfır onaya özel tam tur, yazma selinde belge başına bir geciktirilmiş tazeleme, dış değişiklikte yalnız ilgili dosyanın yeniden okunması, silmede tek düşürme ve içerik değişmediyse sıfır ağaç yeniden çizimidir.

11. `_Sarmal/eklenti/src/hatirlaticilar.ts` ve `_Sarmal/eklenti/src/bildirimler.ts` değiştirilmemelidir. Uygulama nöbeti, bu iki komşu panelin görünüş kimliği, kayıt sayısı, parmak izi davranışı ve tazelenme olaylarının onay yüzeyi değişikliğinden önceki sonuçlarla aynı kaldığını ölçmelidir.

## 6. Riskler

| Risk | Etki ve önlem | Geri dönüş |
|---|---|---|
| Comments API etkin iş parçacığını Açıklamalar panelinde de zorunlu olarak gösterir. | Kullanıcı seçilmiş kapıyı Posta Kutusunda özet, Açıklamalarda ayrıntı olarak aynı anda görebilir. Denetleyici etiketi “Etkin Karar” olmalı, canlı Sarmal iş parçacığı sayısı biri aşmamalı ve Açıklamalar hiçbir zaman tüm kuyruğu yeniden kurmamalıdır. | Sorun sürerse Seçenek B'ye dönülerek Comments denetleyicisi kaldırılabilir; disk verisi veya panel kimliği göçü gerekmez. |
| Kullanıcı Comments yanıt kutusuna yazdığı notu göndermeden başka kapıya geçebilir. | Comments API taslak metnini eklentiye açmadığı için sessiz kayıp riski vardır. Her etkin kapı değişiminde açık bir geçiş onayı verilmelidir. | İş parçacığı değişimi iptal edilerek mevcut kapıda kalınabilir; diskte yazılmış hiçbir kayıt etkilenmez. |
| Komut paletindeki klavye ile süzülen Quick Pick kuyruğuna alışmış kullanıcıların alışkanlığı değişir. | Aynı komut kimliği korunur, fakat komut Posta Kutusunu açar. Kullanıcı görünüşün yerleşik ağaç süzmesini ve dosya gruplamasını kullanır; komutun artık ikinci bir gerçek yaratmadığı sürüm notunda açıkça anlatılmalıdır. | Komut adı ve gövdesi geri alınabilir, ancak tam kuyruk Quick Pick'inin geri getirilmesi YUZ-1.2 kusurunu yeniden açacağı için önerilmez. |
| Diskten saf tarama ile kaydedilmemiş açık belge farklı sonuç verebilir. | İlk taramada disk gerçeği kullanılır; açık belgenin `onDidChangeTextDocument` sonucu aynı dosya için daha yeni ve öncelikli sayılır. Tam tarama, kirli açık belgenin panel kaydını eski disk sonucu ile ezmemelidir. | Öncelik kuralı yanlış çalışırsa yalnız tarayıcı kabuğu eski belge yoluna döndürülebilir; kapı modeli ve disk biçimi değişmediği için veri göçü gerekmez. |
| Uzak veya büyük çalışma alanlarında bütün dosyaları okumak yine süre alabilir. | Ortak anlık görüntü kullanılırsa onay hattının ikinci okuması kalkar; yedek yol gerekirse aynı metni okur, fakat onay nedeniyle belge ve AST tutmaz. Nöbet toplam süreyi, onayın ek okunan baytını, tepe yığını ve iptal davranışını ayrı ölçmeli; daha sonra gerekirse aynı tek tarayıcı içinde kalıcı bir parmak izi dizini tasarlanmalıdır. | Tarama ertelenebilir veya görünüş görünür olduğunda başlatılabilir; ikinci tarayıcı kurulamaz ve rozetin hazır olma davranışı ayrıca değerlendirilmelidir. |
| CodeLens kullanıcı ayarıyla kapalı olabilir. | CodeLens yalnız kısayoldur; Posta Kutusu ile komut paleti aynı kapıya erişmeye devam eder. Bu nedenle karar akışı CodeLens'e bağımlı olmamalıdır. | Ek geri dönüş gerekmez. |
| Comments iş parçacığı yaratma işlemi seçilmiş kapıda hata verebilir. | Kapı Posta Kutusundan düşmemeli; kullanıcıya açık hata gösterilmeli ve yeniden deneme sunulmalıdır. Kuyruk gerçeği Comments başarısından bağımsız kalır. | Kullanıcı aynı kapıyı yeniden açabilir veya geçici olarak Seçenek B'nin karar listesine dönülebilir; `kaydiIsle` değişmez. |
| Görünüş veya komut kimliğinin yanlışlıkla değiştirilmesi kullanıcı yerleşimini ve alışkanlıklarını sıfırlayabilir. | `sarmalPostaKutusu`, `sarmal.onayKuyrugu` ve `sarmal-onay` kimlikleri sabit kalmalı; yalnız görünen adlar rolü açıklayacak biçimde değişmelidir. | Kimlikler aynı kaldığı için tasarımın kendisi yerleşim sıfırlamaz; bir sapma nöbet tarafından paketlemeden önce durdurulmalıdır. |
| Karar yazımının arayüzden ayrıştırılması eski `onay:` kayıtlarını etkileyebilir. | `kaydiIsle`, damgalar ve `degerBicimle` çağrısı aynen korunmalıdır; bu tur yalnız girişlerin rolünü değiştirir. | Şema ve disk biçimi değişmediği için uygulama geri alınabilir ve geçmiş kayıtlar her iki sürümde de okunur. |

Sonuç olarak kapıların iki işlevsel yüzeyi olmalıdır: Posta Kutusu tek kuyruk, isteğe bağlı tek Comments iş parçacığı tek karar yüzeyi olmalıdır. Komut paleti ile CodeLens bu yüzeylere giden kısayollar olarak kalmalı, kendileri karar yazan ayrı akışlar olmamalıdır.
