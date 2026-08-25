# Onay akışının sistem mühendisliği teşhisi ve uçtan uca kullanıcı deneyimi

## 0. Hüküm

Bugünkü akışın temel sorunu, panel içi karar sürümünün tamamlanmamış bir geçiş olmasıdır. Posta Kutusu artık doğrudan karar satırları üretmektedir; buna rağmen CodeLens, satır sonu yönlendirmesi, “Kapıya git” eylemi, Comments denetleyicisi ve eski nöbetler hâlâ çizilmeyen Comments karar yüzeyini esas almaktadır. Kullanıcı bu nedenle aynı ürün içinde iki ayrı mimarinin davranışıyla karşılaşmaktadır.

İncelemede **yirmi bir kusur** bulunmuştur. En ağır üçü şunlardır:

1. CodeLens ve “Kapıya git” eylemi hâlâ çizilmeyen Comments yüzeyine gitmektedir; panel içi tasarım bütün giriş noktalarına uygulanmamıştır.
2. `kaydiIsle`, `doc.save()` sonucunu denetlemediği ve diski geri okumadığı için diske yazılmamış bir kararı başarı diye bildirebilmektedir.
3. Posta Kutusu sayısı değiştiğinde durum çubuğu tazelenmemektedir; kullanıcı panelde on dört kapı varken durum çubuğunda sıfır görebilmektedir.

Önerilen akışın bugünkünden farkı tek cümleyle şöyledir: **Bütün girişler tek Posta Kutusundaki aynı kapı ayrıntısına ulaşır, karar tek yazıcıda kanıtlanır ve kullanıcı ancak disk doğrulandıktan sonra başarı görür.**

Uygulamaya başlamadan önce yeni bir Founder kararı gerekmemektedir. Yanlış kararın güvenli geri alınması, kirli belge çatışmasının yalnız gerektiğinde sorulması ve Comments yüzeyinin görünür akıştan emekliye ayrılması aşağıda kesin davranışlar olarak tanımlanmıştır. Uygulama sonunda Founder'ın yapacağı görsel kabul, yeni bir mimari seçim değil, teslimat doğrulamasıdır.

## 1. İnceleme kapsamı ve ölçüm sınırı

Görevde belirtilen kaynaklar, paket bildirimi, iki nöbet ve önceki tasarım belgesi satır numaralarıyla okunmuştur. Ayrıca çağrı zincirini doğrulamak için `onbellek.ts`, `nabiz.ts`, `durum-cubugu.ts`, VS Code tür bildirimleri ve mevcut eklenti-konağı onay nöbeti incelenmiştir. Hiçbir kaynak dosya değiştirilmemiş ve hiçbir git komutu çalıştırılmamıştır.

İki hedef nöbet doğrudan, üretim dosyası yazan `npm` betikleri kullanılmadan koşturulmuştur:

```text
node --test sinama/onay-yuzeyleri.test.ts sinama/posta-kutusu.test.ts
```

Sonuç **50/50 geçmiştir**. Bu yeşil sonuç panel içi kararın çalıştığını kanıtlamamaktadır. Nöbetlerden biri hâlâ “kod merceği ve panel satırı aynı etkin Comments karar kapısına gider” hükmünü korumaktadır; hiçbiri kapı satırının altından dört karar çocuğu döndüğünü, altı bağımsız değişkenin doğru komuta indiğini, `doc.save()` başarısızlığını veya karar sonrasında panelin ve durum çubuğunun birlikte tazelendiğini koşturmamaktadır.

Görevde verilen canlı görüntü on dört kapıdır ve bu sayı tarihsel canlı ölçüm olarak kabul edilmiştir. İnceleme anındaki çalışma ağacı aynı saf kapı işlevi ve aynı dışlama kaynağıyla ayrıca okunmuştur: 300 kapsam içi `.sar` dosyasının hiçbirinde ayrıştırma hatası oluşmamış, mevcut disk kayıtları nedeniyle iki dosyada altı açık kapı kalmıştır. Bu iki sayı aynı ana ait değildir; aradaki fark, kaynakta bu arada yazılmış `onay:` kayıtlarıyla uyumludur. Tasarım hiçbir sabit kapı sayısına bağlanmamalıdır.

Gerçek VS Code penceresinde yeni bir tıklama deneyi yapılmamıştır. Comments penceresi hakkındaki canlı kanıt, görevde verilen dört halkalı izdir. Ağaç, komut ve kaydetme hükümleri kaynak kodu ile VS Code'un resmî API sözleşmesinden çıkarılmıştır.

Başvurulan resmî sözleşmeler şunlardır:

- VS Code, `Command.arguments` dizisindeki öğelerin komut işleyicisine bağımsız değişken olarak verildiğini açıkça söyler: [VS Code API — Command](https://code.visualstudio.com/api/references/vscode-api#Command).
- `getChildren`, verilen öğenin çocuklarını döndürür; `getParent` isteğe bağlıdır ve özellikle `TreeView.reveal` için gereklidir: [VS Code API — TreeDataProvider](https://code.visualstudio.com/api/references/vscode-api#TreeDataProvider).
- `TreeItem.id`, seçim ve açılma durumunu korur; verilmezse kimlik etiketten türetilir ve etiket değişince durum korunamaz: [VS Code API — TreeItem](https://code.visualstudio.com/api/references/vscode-api#TreeItem).
- `TextDocument.save()` başarısız kayıtta `false` döndürür: [VS Code API — TextDocument](https://code.visualstudio.com/api/references/vscode-api#TextDocument).
- `createCommentThread`, yaratılan iş parçacığının eşleşen görünür editörde ve Comments panelinde gösterileceğini vaat eder: [VS Code API — CommentController](https://code.visualstudio.com/api/references/vscode-api#CommentController).
- `CommentingRangeProvider`, yeni iş parçacığı yaratılmasına izin verilen aralıkları bildirir; var olan iş parçacığının çizim sözleşmesi değildir: [VS Code API — CommentingRangeProvider](https://code.visualstudio.com/api/references/vscode-api#CommentingRangeProvider).

## 2. Bugünkü uçtan uca akış

| Aşama | Bugünkü çağrı zinciri | Kullanıcının gördüğü |
|---|---|---|
| Etkinleşme | `eklenti.ts` önce Posta Kutusunu kurar, durum çubuğunu sıfır değerlerle çizer, ana tanı turunu başlatır ve daha sonra `onayKuyruguKaydi` işlevini bağlar. | Sarmal kenar çubuğu ile posta simgesi görünür; ilk tarama bitmeden sıfır değeri gösterilir. |
| Kapı üretimi | Ana tanı turu `Program` görüntüsünü `onay-tarayici.ts` dosyasına bildirir. `onay-kuyrugu.ts` aynı görüntüden kapıları çıkarıp `PostaKutusu.yerlestirHepsi` ile panele verir. | Dosya grupları, kapılar ve panel rozeti görünür. Bu kısım çalışmaktadır. |
| Kapı satırının açılması | `PostaKutusu.getChildren(kapı)`, `KARAR_SECENEKLERI` dizisinden dört karar çocuğu üretir. | “Kapıya git”, “Onayla”, “Şerhle onayla” ve “Reddet” satırları görünür. |
| Doğrudan karar | Karar çocuğu `sarmal.postaKararVer` komutunu altı bağımsız değişkenle çağırır. Şerh veya ret seçilmişse `showInputBox` açılır. | Düz onay için ikinci bir iletişim kutusu çıkmaz; şerh ve ret için tek satırlık not kutusu açılır. |
| Eski girişler | CodeLens `sarmal.onayKarar` komutuna, “Kapıya git” ise `sarmal.postaKapisiAc` komutuna gider. İkisi de `etkinKarariAc` üzerinden `createCommentThread` çağırır. | Dosya açılır ve satıra gidilir; karar penceresi çizilmediği için kullanıcı karar veremez. |
| Yazım | `kaydiIsle` kapıyı bulur, `WorkspaceEdit` ile `onay:` alanını ekler, `applyEdit` sonucunu denetler, `doc.save()` çağırır ve açık kapı listesinden kodun kaybolduğunu kontrol eder. | Başarı bildirimi ya da bazı hata bildirimleri görünür. |
| Tazelenme | Belge değişikliği 350 milisaniyelik geciktirilmiş `tazele` turunu, kaydetme ise anlık `tazele` çağrısını doğurur. `OnayDefteri` değiştiyse `onDidChangeTreeData` ateşlenir. | Normal kayıtta kapı panelden düşer ve görünüş rozeti azalır. Durum çubuğu aynı olaya bağlı olmadığı için eski sayıda kalır. |

## 3. Sorulan teknik noktaların kesin cevapları

### 3.1. Karar çocukları gerçekten dönüyor mu?

Evet. `posta-kutusu.ts:156-163` aralığında `getChildren` şu kesin davranışı taşır:

- Kök çağrısı dosya kümelerini döndürür.
- Dosya çağrısı o dosyanın kapılarını döndürür.
- Kapı çağrısı `KARAR_SECENEKLERI.map(...)` sonucunu döndürür.
- Karar çağrısı boş dizi döndürür.

`KARAR_SECENEKLERI` dört öğelidir. Dolayısıyla VS Code kapı satırını açtığında sağlayıcı dört karar çocuğu üretir. `TreeItemCollapsibleState.Collapsed` verildiği için VS Code bu çocukları istemek üzere `getChildren(kapı)` çağrısını yapar.

### 3.2. Sabit `undefined` döndüren `getParent` açılmayı bozuyor mu?

Hayır. Kullanıcının satırdaki oku açması, `collapsibleState` ile `getChildren` sözleşmesine dayanır; `getParent` bu davranışın şartı değildir. Bugünkü dört çocuğun görünmemesinin nedeni sabit `undefined` olamaz.

Ancak uygulama yine de yanlıştır. Sağlayıcı bir dosyanın, kapının ve karar satırının ebeveynlerini bildiği hâlde hepsini kök öğe ilan etmektedir. Bunun bugünkü doğrudan sonucu `TreeView.reveal(kapı)` işlevinin güvenilir biçimde kullanılamamasıdır. Önerilen CodeLens davranışı doğru kapıyı panelde açacağı için gerçek ebeveynlerin döndürülmesi zorunludur.

### 3.3. Altı komut bağımsız değişkeni sorun mu?

Hayır. `TreeItem.command.arguments` bir dizidir ve VS Code dizinin öğelerini kayıtlı komut işleyicisine konumsal bağımsız değişkenler olarak geçirir. Buradaki dizi:

```text
[dosya, satır, kod, damga, emoji, notIster]
```

şeklindedir; `postaKararVer` işleyicisinin altı parametresiyle aynı sıradadır. API bir öğe sayısı sınırı koymamaktadır. Sorun sayı değil, bu değerlerin yazıcıda nasıl doğrulandığıdır.

### 3.4. `sarmal.postaKararVer` komutunun `package.json` içinde ilan edilmesi gerekiyor mu?

Hayır. Bu komut, görünür ağaç öğesi yaratılmadan önce `vscode.commands.registerCommand` ile çalışma zamanında kaydedilmektedir. `TreeItem.command` için kayıtlı bir işleyici yeterlidir.

`contributes.commands` ilanı komutu Komut Paletine, menülere, klavye kısayollarına ve etkinleşme sözleşmesine açmak için gerekir. `sarmal.postaKararVer` yalnız etkin eklentinin kendi TreeItem'ı tarafından kullanılan iç komuttur; Komut Paletinde görünmemesi doğrudur. Bu nedenle eksik ilan bir kusur değildir ve önerilen uygulamada da sırf görünür kılmak için eklenmemelidir.

### 3.5. `onDidChangeTreeData` ne zaman ateşleniyor ve karar sonrasında kapı düşüyor mu?

`PostaKutusu.cizdir()` üç işi birlikte yapar: boş durum metnini tazeler, görünüş rozetini tazeler ve `degisti.fire()` çağırır. `cizdir()` yalnız şu durumlarda çağrılır:

- Tam yerleştirmede `OnayDefteri.tazele` parmak izi değişmişse.
- Tek dosya yerleştirmesinde `OnayDefteri.yaz` içerik değişmişse.
- Dosya düşürmede defterde gerçekten o dosya varsa.

Aynı içerik ikinci kez gelirse ağaç olayı ateşlenmez. Bu davranış doğrudur.

Normal başarılı karar yolunda `applyEdit`, `onDidChangeTextDocument` olayını; başarılı `doc.save()`, `onDidSaveTextDocument` olayını doğurur. İki yol da `tazele(doc)` işlevine ulaşır. Yeni `onay:` alanı açık kapı tanımını kapattığı için `OnayDefteri.yaz` değişiklik görür, ağaç olayı ateşlenir ve kapı panelden düşer. Bu kısım normal kayıtta çalışmaktadır.

İki sınır vardır:

1. `doc.save()` başarısız olduğu hâlde bellekteki belgeye `onay:` eklenmişse geciktirilmiş tazeleme kapıyı panelden düşürür. Diskte karar yoktur, fakat panel kapanmış gibi görünür.
2. Posta Kutusunun ağaç olayı durum çubuğuna bağlı değildir. Panel ile görünüş rozeti azalırken durum çubuğu eski sayıda kalır.

### 3.6. `kaydiIsle` hangi çıkışlarda sessiz veya yanlış başarısız oluyor?

| Çıkış | Bugünkü sonuç | Hüküm |
|---|---|---|
| Kapı yeniden bulunamaz. | Açık hata gösterilir ve dosya panelde tazelenir. | Sessiz değildir. |
| `applyEdit` `false` döndürür. | Açık hata gösterilir; pencerenin açık bırakıldığı söylenir. | Sessiz değildir, fakat panel içi sürümde “pencere” sözcüğü artık yanlıştır. |
| `applyEdit` reddedilen bir sözle sonuçlanır. | `try/catch` olmadığı için komut reddedilir; Sarmal'a ait açıklayıcı hata üretilmez. | Açık ürün hatası yoktur. |
| `doc.save()` `false` döndürür. | Dönüş değeri yok sayılır; bellek içi kapı kaybolduysa başarı bildirimi gösterilir. | Kanıtlanmamış başarıdır. |
| `doc.save()` reddedilen bir sözle sonuçlanır. | `try/catch` olmadığı için Sarmal'a ait açıklayıcı hata üretilmez. | Açık ürün hatası yoktur. |
| Yazım sonrası ayrıştırma kırılır. | `programAl` `undefined`, `belgeKapilari` boş dizi döndürür; kod artık açık kapılar arasında görünmediği için doğrulama geçer. | Bozuk belge başarı diye kabul edilir. |
| Kayıt yalnız bellekte vardır. | Doğrulama aynı `TextDocument` nesnesini okur; disk geri okunmaz. | Diske yazım kanıtlanmaz. |
| Belge karar öncesinde kirliyse. | `doc.save()` kullanıcının ilgisiz bütün taslak değişikliklerini de kaydeder. | Karar eylemi yetkisi dışındaki taslağı sessizce diske yazar. |

### 3.7. Aynı kapıya iki kez karar verilirse ne oluyor?

Birinci komut tamamen bittikten sonra eski bir satırdan ikinci komut çalıştırılırsa ikinci `kaydiIsle` çağrısı açık kapıyı bulamaz, açık hata gösterir ve yeniden yazmaz. Sıralı ikinci karar bu nedenle idempotent sonuca yakın davranmaktadır.

Hızlı çift tıklamada ise iki komut arasında uçuş kilidi yoktur. İki çağrı da ilk `applyEdit` belgeyi değiştirmeden önce kapıyı toplarsa ikisi aynı ekleme noktasına yazma girişiminde bulunur. VS Code çağrıları sıraladığında ikinci çağrı ya artık kapı bulamaz, ya ikinci düzenleme reddedilir, ya da aynı konuma ikinci `onay:` alanı eklenir. Kod bu yarışı tek bir sonuca bağlamamaktadır. Sistem mühendisliği açısından kusur, sonucun tıklama zamanlamasına bırakılmasıdır.

### 3.8. İlk kurulumda kullanıcı akışı nasıl keşfediyor?

Akış ilk kurulum deneyiminde anlatılmamaktadır. `package.json` içindeki başlangıç rehberi dil, denetim, okuma, öğrenim, biçimlendirme ve gezinmeyi anlatır; Posta Kutusu ile Founder kararını anlatan bir adım yoktur. Kullanıcı yalnız şu dolaylı işaretlerle karşılaşır:

- Sarmal kenar çubuğundaki Posta Kutusu görünüşü.
- Durum çubuğundaki etiketsiz posta simgesi ve sayı.
- Zaten bir kapı dosyasını açmışsa CodeLens ile satır sonu süsü.
- Adını biliyorsa Komut Paletindeki “Posta Kutusunu aç” komutu.

Bunların hiçbiri ilk kez gören kişiye “senden karar bekleniyor, karar burada verilir ve sonuç `onay:` olarak diske yazılır” bilgisini kendiliğinden öğretmez. Üstelik durum çubuğu ilk yerleşimde sıfırda kalabildiği için en görünür işaret de güvenilir değildir.

## 4. Kusur envanteri

### K-01 — Panel içi geçiş bütün giriş noktalarına uygulanmamıştır

**Başarısızlık senaryosu:** Kullanıcı bir kapının üstündeki CodeLens'e veya paneldeki “Kapıya git” çocuğuna tıklar. Dosya ve doğru satır açılır; ardından `etkinKarariAc` bir Comments iş parçacığı yaratır. Görevdeki canlı iz iş parçacığının kurulduğunu, fakat ekranda hiçbir karar penceresi çizilmediğini kanıtlamıştır. Kullanıcı karar veremez.

**Kök:** Yeni `sarmal.postaKararVer` yolu eklenmiş, fakat eski `sarmal.onayKarar` ile `sarmal.postaKapisiAc` yolları değiştirilmemiştir.

### K-02 — Arayüz metinleri eski mimariyi vaat etmektedir

**Başarısızlık senaryosu:** Kullanıcı kapı ipucunu okur. Metin “Tıklayınca önce bu satıra gidilir, sonra kararın sorulur” der. Gerçekte kapı satırı yalnız açılır ve karar çocuklarını gösterir. Boş durum metni de aynı eski vaadi tekrarlar; satır sonu ipucu ise kullanıcıyı çizilmeyen CodeLens karar penceresine yollar.

**Kök:** `yuzey-metinleri.ts` ve `onay-kuyrugu.ts` içindeki açıklamalar panel içi tasarımla birlikte güncellenmemiştir.

### K-03 — Durum çubuğu Posta Kutusu değişimine bağlı değildir

**Başarısızlık senaryosu:** Etkinleşmede `DurumCubugu.tazele()` Posta Kutusu henüz boşken çalışır ve posta sayısını sıfır yazar. Ana tarama daha sonra on dört kapıyı panele yerleştirir. Posta Kutusu kendi rozetini ve ağacını tazeler, fakat durum çubuğunu çağırmaz. Kullanıcı aynı anda panelde on dört, durum çubuğunda sıfır görür.

**Kök:** `PostaKutusu.onDidChangeTreeData` ile `DurumCubugu.tazele` arasında abonelik yoktur.

### K-04 — “Henüz taranmadı” ile “gerçekten boş” aynı durumdur

**Başarısızlık senaryosu:** Kullanıcı eklenti etkinleşir etkinleşmez Posta Kutusunu açar. Ana tarama bitmemiştir, fakat panel “Gelen kutun sıfır” der. Kullanıcı bekleyen karar olmadığını sanır. Tarama uzun sürerse yanlış bilgi uzun süre görünür.

**Kök:** Posta Kutusu modelinde `yükleniyor`, `hazır`, `hata` durumları yoktur; yalnız boş veya dolu defter vardır.

### K-05 — Tarama ve dış değişiklik hataları kapıları sessizce eksiltmektedir

**Başarısızlık senaryosu:** Founder onayı isteyen bir `.sar` dosyası okunamaz veya sözdizimi kırılır. Yedek tarama dosyayı `catch { continue; }` ile atlar; `bildirimleriCoz` başarısızlığı da boş sonuç gibi davranır. Disk izleyicisi dosyayı açamazsa `catch` gövdesi boş kalır. Panel düşük sayı gösterir veya eski kaydı taşır; hangi dosyanın neden eksik olduğu söylenmez.

**Kök:** Tarayıcı sonuç modeli yalnız kapıları taşır, tarama kusurlarını taşımamaktadır.

### K-06 — İlk karşılaşma akışı yoktur

**Başarısızlık senaryosu:** Yeni kullanıcı eklentiyi kurar, başlangıç rehberini tamamlar ve on dört kapı bulunan çalışma alanına girer. Rehber Posta Kutusunu hiç anmadığı için posta simgesinin ne olduğunu, bir kararın nasıl verildiğini ve nereye yazıldığını öğrenmez.

**Kök:** `package.json` içindeki walkthrough ile ilk sıfırdan-doluya geçiş arasında onay keşfi tasarlanmamıştır.

### K-07 — Karar bağlamı bağlı işleri taşımamaktadır

**Başarısızlık senaryosu:** Kullanıcı `VIT-POSTA-A03` kapısını açar. Satırda kod ile `ne` metnini, ipucunda yalnız tek onay ölçütünü görür. Adımın `bağımlı`, `referans`, `üretir` alanları ile üst Faz, Blok ve Katman bağlamı `OnayKapisi` modeline hiç alınmadığı için kararın hangi işi beklediğini veya hangi işleri açacağını panelden öğrenemez.

**Kök:** `OnayKapisi` yalnız `kod`, `ne`, `olcut` ve yazım konumunu taşımaktadır. `ne` boşsa mevcut `ad` alanına da dönülmemektedir.

### K-08 — Birden çok Founder ölçütünden yalnız ilki gösterilmektedir

**Başarısızlık senaryosu:** Bir Adımın kabul listesinde Founder onayı isteyen iki ayrı ölçüt vardır. `find(...)` yalnız ilk eşleşmeyi `olcut` alanına koyar. Kullanıcı ikinci şartı hiç görmeden karar verir; tek `onay:` alanı yazılınca kapı tamamen kapanır.

**Kök:** Kapı modeli eşleşen ölçütler dizisi yerine tek bir ölçüt taşımaktadır.

### K-09 — Kapı imzası geçerli Türkçe ifadeleri kaçırmaktadır

**Başarısızlık senaryosu:** Kabul ölçütü “Tasarımın onayı Founder tarafından verilmelidir” diye yazılır. Bu cümle açıkça Founder onayı şartıdır; ancak `ONAY_DESENI` yalnız “Founder” sözcüğünden sonra en çok kırk karakter içinde “onay” arar. “Onay” önce geldiği için Adım kapı olarak üretilmez.

**Kök:** Semantik kapı hükmü tek yönlü ve karakter mesafeli bir düzenli ifadeye indirgenmiştir.

### K-10 — Dosya gruplaması çok köklü çalışma alanında kimliği gizlemektedir

**Başarısızlık senaryosu:** İki proje de `plan.sar` adlı bir dosyada kapı taşır. İki kök satırının etiketi de yalnız `plan.sar` olur. Tam yol yalnız ipucundadır; kullanıcı satırları bakışta ayıramaz ve yanlış proje altındaki kapıyı açar.

**Kök:** Gruplama tam yola göre doğru yapılsa da görünen kimlik yalnız son dosya parçasıdır; çalışma alanı veya proje adı satıra taşınmamaktadır.

### K-11 — Ağaç kimliği ve ebeveyn zinciri kararlı değildir

**Başarısızlık senaryosu:** Kullanıcı bir kapıyı açar, sonra aynı Adımın `ne` metni düzenlenir. Kapı etiketi değişir. `TreeItem.id` verilmediği için VS Code kimliği etiketten türetir; yeni etiketi yeni öğe sayar ve açılma ile seçim durumu korunmaz. CodeLens'in ileride aynı kapıyı `reveal` etmesi de sabit `undefined` döndüren `getParent` yüzünden çalışmaz.

**Kök:** Dosya, kapı, bağlam ve karar satırlarına yol ile koddan türetilen kararlı kimlik verilmemiştir; ebeveyn haritası kurulmamıştır.

### K-12 — Birden çok açık kapıda karar satırları birbirinden ayırt edilememektedir

**Başarısızlık senaryosu:** Kullanıcı iki kapıyı birden açar. Panelde iki ayrı “Onayla”, “Şerhle onayla” ve “Reddet” kümesi görünür. Eylem etiketleri kapı kodunu taşımadığı ve yalnız bir kapının açık kalmasını sağlayan bir seçim modeli bulunmadığı için dar panelde hangi eylemin hangi kapıya ait olduğu bakışta belirsizleşir.

**Kök:** TreeView'ın birden çok öğeyi açabilen varsayılan davranışı dikkate alınmamış, eylem metinleri yalnız hükmü adlandırmıştır.

### K-13 — Bayat satır çapası yanlış kapıya karar yazabilmektedir

**Başarısızlık senaryosu:** Panel A kapısını 100. satırda tutarken dosya değişir; A 105. satıra kayar ve B kapısı 100. satıra gelir. Kullanıcı paneldeki A kararına tıklar. `kaydiIsle`, önce yalnız `x.satir === satir` koşuluyla B'yi seçer; gönderilen A kodunu ancak satırda hiçbir kapı yoksa kullanır. Karar B'ye yazılır.

**Kök:** Yeniden bulma sırası `(satır eşleşmesi) ?? (kod eşleşmesi)` şeklindedir; ilk eşleşme satır ile kodu birlikte doğrulamamaktadır.

### K-14 — Karar eylemi kullanıcının ilgisiz taslağını kaydetmektedir

**Başarısızlık senaryosu:** Kullanıcı aynı `.sar` dosyasında henüz tamamlanmamış ve kaydedilmemiş başka değişiklikler taşır. Posta Kutusundan bir kapıyı onaylar. `doc.save()` yalnız `onay:` ekini değil, belgedeki bütün kirli taslağı diske yazar ve kaydederken biçimlendirme de çalışabilir.

**Kök:** Yazıcı, karar öncesinde `doc.isDirty` durumunu ayrı bir çatışma olarak ele almamaktadır.

### K-15 — Kaydetme sonucu ve reddedilen sözler yönetilmemektedir

**Başarısızlık senaryosu:** `applyEdit` başarılı olur, fakat dosya izni, kaydetme katılımcısı veya başka bir kaydetme engeli nedeniyle `doc.save()` `false` döndürür. Kod dönüş değerini atar ve başarı yoluna devam eder. `applyEdit` veya `save` reddedilirse de Sarmal'a ait açık hata üretilmez.

**Kök:** `await doc.save()` sonucunun değişkene alınmaması ve yazım zincirinin bütününü saran bir `try/catch` bulunmamasıdır.

### K-16 — Doğrulama kaydı değil, yalnız kapının yokluğunu ölçmektedir

**Başarısızlık senaryosu:** Ekleme belgenin sözdizimini bozar. `programAl` ayrıştıramaz, `belgeKapilari` boş döner ve hedef kod açık kapılar arasında görünmez. Kod bunu “kayıt tuttu” kanıtı sayar. Aynı biçimde kayıt bellekte bulunup diskte bulunmadığında da kontrol geçer.

**Kök:** Doğrulama “doğru Adımda beklenen `onay` değeri var mı?” ve “aynı değer diskte geri okunuyor mu?” sorularını sormamaktadır.

### K-17 — Aynı kapı için uçuş kilidi ve idempotans makbuzu yoktur

**Başarısızlık senaryosu:** Kullanıcı düz “Onayla” satırına hızlıca iki kez tıklar. İki `postaKararVer` çağrısı da başlar; eylem satırı devre dışı kalmaz ve dosya+kod anahtarında işlem kilidi yoktur. Sonuç komutların zamanlamasına bağlı kalır.

**Kök:** Etkin Comments yüzeyi için bir defter vardır, fakat panel karar yazımı için işlem defteri yoktur.

### K-18 — Yanlış kararın ürün içi geri alma yolu yoktur

**Başarısızlık senaryosu:** Kullanıcı yanlışlıkla “Onayla” satırına tıklar. Kapı listeden düşer ve başarı bildirimi kapanır. Kararı geri almak için kaynağı bulup `onay:` alanını elle silmesi veya VS Code geri almasını hemen kullanması gerekir; ürün doğru kaydı ve güvenli silme sınırını göstermemektedir.

**Kök:** Başarı makbuzu, son karar tutamağı ve korumalı geri alma işlemi tasarlanmamıştır.

### K-19 — Şerh ve ret gerekçesi metinde zorunlu, kodda isteğe bağlıdır

**Başarısızlık senaryosu:** Kullanıcı “Reddet — gerekçe yazarak” satırına tıklar, not kutusunu boş bırakıp Enter'a basar. `yanit.trim()` boş olur ve yazıcı yalnız “reddedildi — tarih” kaydını yazar. Kullanıcı arayüzünün vaat ettiği gerekçe yoktur.

**Kök:** `showInputBox` için `validateInput` yoktur; yer tutucu da boş bırakmanın kabul edildiğini söyleyerek eylem etiketiyle çelişmektedir.

### K-20 — Karar tarihi kullanıcının yerel takviminden değil UTC'den doğmaktadır

**Başarısızlık senaryosu:** İstanbul'da 30 Temmuz saat 00.30'da karar verilir. UTC hâlâ 29 Temmuz olduğu için `toISOString().slice(0, 10)` kayda 29 Temmuz yazar. Kullanıcı bugün verdiği kararı dün verilmiş görür.

**Kök:** Tarih aynı `YYYY-MM-DD` biçiminde kalmakla birlikte yerel takvim yerine UTC takviminden üretilmektedir.

### K-21 — Nöbetler yeni ürün yolunu değil emekli mimariyi korumaktadır

**Başarısızlık senaryosu:** `sarmal.postaKararVer` çalışmaz, dört karar çocuğu hiç dönmez veya `doc.save()` başarısızlığı başarı sayılır. Hedef iki nöbet yine yeşil kalır. Bu incelemede tam olarak 50 nöbetin yeşil kaldığı ölçülmüştür.

**Kök:** `onay-yuzeyleri.test.ts` panel ile CodeLens'in Comments yüzeyine gitmesini beklemekte; `posta-kutusu.test.ts` ise sağlayıcının yeni `karar` düğümünü ve komutunu koşturmamaktadır.

## 5. Comments karar penceresinin çizilmemesi hakkındaki kök neden hükmü

**Kesin kök neden belirlenememiştir.**

Şu hükümler kesindir:

1. Görevdeki kalıcı iz, belge ve kapının bulunduğunu, editörün açıldığını, `createCommentThread` çağrısının başarıyla döndüğünü ve canlı yüzey sayısının bir olduğunu kanıtlamaktadır.
2. İş parçacığının URI'si görünür belgeyle eşleşmekte, aralığı geçerli bir satır aralığı olmakta, en az bir `Comment` taşımakta ve genişletilmiş duruma getirilmektedir.
3. Resmî API, bu nesnenin eşleşen görünür editörde ve Comments panelinde gösterilmesini vaat etmektedir.
4. Boş `commentingRangeProvider` yalnız kullanıcının yeni iş parçacığı başlatabileceği aralıkları boşaltır. Mevcut iş parçacığının çizilmesini sağlamak için eklenmiş olması resmî sözleşmeyle desteklenmemektedir ve canlı denemede de kusuru kapatmamıştır.

Bu kanıtlardan çıkan en dar hüküm şudur: hata Sarmal'ın kapı bulma, belge açma veya Comments nesnesi yaratma halkasında değil, yaratılan nesnenin VS Code tarafından görünür yüzeye izdüşürüldüğü çizim/ürün durumu sınırındadır. Bunun bir VS Code 1.128 gerilemesi, kullanıcıya ait Comments görünürlüğü durumu veya başka bir kabuk koşulu olduğu bu turda ölçülmemiştir.

Kesin kök neden için ayrı bir minimal eklentiyle aynı URI ve aralıkta tek iş parçacığı yaratılması, Comments görünürlük bağlam anahtarlarının kaydedilmesi ve VS Code geliştirici araçlarında yorum çizicisinin incelenmesi gerekir. Önerilen ürün akışı Comments çizimine bağımlı olmayacağı için bu araştırma uygulamayı bloke etmemelidir. Comments sorunu ayrı bir platform uyumluluk kaydı olarak tutulmalıdır.

## 6. Uçtan uca kullanıcı deneyimi tasarımı

### 6.1. Tasarımın değişmezleri

1. Posta Kutusu bekleyen kapıların **tek listesi ve tek görünür karar yüzeyi** olacaktır.
2. Bütün kapılar yalnız mevcut `onay-tarayici.ts` gözünden gelecektir. Yeni tarama, sayaç veya çizelge kurulmayacaktır.
3. Bütün kararlar ve geri alma işlemi aynı `kaydiIsle` yazım sınırından geçecektir.
4. `onay:` alanının biçimi, “onaylandı”, “şerhle onaylandı” ve “reddedildi” damgaları değişmeyecektir.
5. `sarmalPostaKutusu`, `sarmal.onayKuyrugu` ve `sarmal-onay` kimlikleri değişmeyecektir. Mevcut yardımcı komut kimlikleri de korunacaktır.
6. Her geçişte çıkan bir onay kutusu kurulmayacaktır. Yalnız gerçekten kirli hedef belge bulunduğunda koşullu çatışma sorusu gösterilecektir.
7. Başarı, `applyEdit`, kaydetme ve diskten geri okuma üçlüsü kanıtlanmadan gösterilmeyecektir.
8. Hata alan kapı listede kalacak, işlem kilidi açılacak ve yeniden deneme yolu görünür olacaktır.

### 6.2. Bilgi mimarisi

Posta Kutusu tek görünüş olarak kalacaktır. Ağaç şu yapıyı taşıyacaktır:

```text
Çalışma alanı veya proje · dosya
└─ KAPI-KODU — Adımın amacı
   ├─ Amaç: …
   ├─ Onay ölçütü 1/2: …
   ├─ Onay ölçütü 2/2: …
   ├─ Bağlı işler: A, B · açılan işler: C
   ├─ Kapıya git — Adımı dosyada aç
   ├─ Onayla · KAPI-KODU
   ├─ Şerhle onayla · KAPI-KODU
   └─ Reddet · KAPI-KODU
```

Bağlam satırları ikinci bir veri kaynağı değildir. Aynı ayrıştırılmış Adım düğümünden `ne` veya yedek olarak `ad`, eşleşen bütün kabul ölçütleri, `bağımlı`, `referans`, `üretir` ve üst düğüm yolu çıkarılır. Bağlı kodların durumları gerekiyorsa ana tanı hattının zaten verdiği aynı `Program` görüntüsünden çözülür.

Dosya başlığı tek köklü çalışma alanında kısa dosya adını korur. Aynı kısa ada sahip iki dosya varsa etiket en kısa ayırt edici göreli yolu ve çalışma alanı/proje adını gösterir. Tam mutlak yol yalnız ipucunda kalır.

Her öğe kararlı bir kimlik taşır:

- Dosya kimliği tam dosya yolundan doğar.
- Kapı kimliği `tam dosya yolu + kapı kodu` çiftinden doğar.
- Bağlam ve eylem kimliği kapı kimliği ile kendi rolünden doğar.

Sağlayıcı gerçek ebeveyni döndürür. Böylece CodeLens ve komutlar `TreeView.reveal` ile doğru kapıyı seçip bir kademe açabilir.

### 6.3. Bugünkü ve önerilen deneyim

| An | Bugünkü hâl | Önerilen hâl |
|---|---|---|
| **Keşif** | Bir görünüş rozeti, ilk yerleşimde bayat kalan etiketsiz durum çubuğu sayısı, yalnız ilgili dosyada görülen CodeLens ve adı bilinirse bulunan komut vardır. Başlangıç rehberi onayı anlatmaz. | Bekleyen işlerin tek listesi Posta Kutusudur. Aynı sayının iki türetilmiş işareti vardır: görünüş rozeti ve durum çubuğu. İlk kez sıfırdan doluya geçildiğinde yalnız bir defa “Senden N karar bekleniyor” bildirimi güncel sayıyla ve “Posta Kutusunu aç” eylemiyle gösterilir. Walkthrough kalıcı öğrenme yoludur. |
| **Gezinme** | Dosyalar kısa ada göre gruplanır, kapılar kaynak satırına göre sıralanır. Aynı adlı dosyalar ayırt edilemez; bağlı işi hazır olmayan kapılar da aynı sıradadır. Birden çok kapı aynı anda açılabilir. | Çalışma alanı/proje ile ayırt edilen dosya grupları kullanılır. Kapı satırı kodu, amacı ve “karara hazır/öncül bekliyor” durumunu bakışta söyler. Yalnız seçilen kapının ayrıntısı açık tutulur. Klavye gezinmesi ve TreeView süzmesi aynı görünüşte çalışır. |
| **Bağlam** | Amaç satırda sıfır tıkla, yalnız ilk Founder ölçütü fare ipucunda görünür. Bağımlılar, referanslar, ürünler ve üst bağlam görünmez; bunlar için dosyayı açıp metni elle okumak gerekir. | Kapı bir tıkla açıldığında amaç, bütün Founder ölçütleri, üst bağlam ve bağlı işler eylemlerle aynı yerde görünür. İlgili koda gitmek bir tıktır. Karar vermek için başka bir panel veya görünmez Comments penceresi gerekmez. |
| **Karar** | Düz onay, kapıyı açma ve “Onayla” satırına tıklama olmak üzere iki tıktır. Şerh ve ret aynı iki tıktan sonra not ve Enter ister. Boş gerekçe kabul edilir. İptal, not kutusunda Escape ile çalışır. | Düz onay yine iki tıktır; gereksiz onay kutusu eklenmez. Şerh ve ret, başlığında kapı kodu ile ölçütün kısa özetini taşıyan tek not kutusu açar; boş not doğrulama hatasıdır. Escape hiçbir kayıt yazmadan kapatır. İşlem sürerken eylemler “Karar işleniyor…” durumuna geçer ve yeniden tıklanamaz. |
| **Geri bildirim** | Bellek içi kapı kaybolunca başarı bildirimi çıkar. Panel düşer ve görünüş rozeti azalır; durum çubuğu bayat kalır. Kaydetme `false` döndüğünde bellek içi tazeleme kapıyı yanlışlıkla düşürür. | Satır önce geçici “işleniyor” durumu gösterir. Yalnız diskten aynı kayıt geri okunduktan sonra kapı tek olayla düşer; görünüş rozeti ve durum çubuğu aynı anda azalır. Başarı bildirimi kodu, damgayı ve “Geri al” eylemini taşır. Hata hâlinde satır kalır, açık neden ve “Yeniden dene/Kapıya git” yolu gösterilir. |
| **Geri alma** | Ürün içi yol yoktur. Kullanıcı kaynağı bulup alanı elle siler veya hemen genel editör geri almasını dener. | Son kanıtlı karar için başarı bildiriminde ve Posta Kutusunun geçici üst mesajında “Geri al” bulunur. Yazıcı yalnız aynı kapıda aynı karar değeri hâlâ değişmeden duruyorsa alanı kaldırır, kaydeder ve kapının geri geldiğini diskten doğrular. Kayıt dışarıdan değiştirilmişse geri alma reddedilir ve doğru satır açılır. |
| **İlk karşılaşma** | Altı walkthrough adımının hiçbiri Posta Kutusunu anlatmaz. İlk tarama sırasında panel gerçek dışı sıfır gösterir. | Panel önce “Kapılar taranıyor…” der; sonra ya gerçek boş cümlesi, ya kapılar, ya da dosya adlarıyla açık tarama hatası gösterir. Walkthrough adımı kapıyı, üç kararı, notu, diske yazımı ve geri almayı anlatır. İlk dolu kuyruk bildirimi yalnız bir kez çıkar. |

### 6.4. Giriş noktalarının yeni ve tek anlamı

| Giriş | Yeni davranış |
|---|---|
| `sarmal.onayKuyrugu` | Var olan Posta Kutusuna odaklanır. Yeni liste veya karar yüzeyi yaratmaz. |
| Durum çubuğundaki posta girdisi | Var olan Posta Kutusuna odaklanır. Sayıyı panelin defterinden türetir. |
| CodeLens `sarmal.onayKarar` | Dosya+kod kimliğiyle Posta Kutusunu açar, doğru kapıyı `reveal` eder ve ayrıntısını açar. Comments iş parçacığı yaratmaz. |
| Satır sonu süsü | CodeLens'in Posta Kutusunu açacağını dürüstçe söyler. |
| Kapı satırı | Aynı satırın altında bağlam ile eylemleri açar. Dosyaya kendiliğinden atlamaz. |
| `sarmal.postaKapisiAc` | Kaynağı doğru satırda açar; panelde seçilmiş kapı açık kalır. Comments iş parçacığı yaratmaz. |
| `sarmal.postaKararVer` | Not gereksinimini uygular ve tek yazıcıya iner. İç komut olarak kalır; `package.json` ilanı gerekmez. |
| `sarmal-onay` | Kimlik korunur, fakat görünür karar nesnesi üretmez. Eski Comments komutları uyumluluk için kayıtlı kalır ve kullanıcıyı Posta Kutusuna yönlendirir. |

### 6.5. Kanıtlı yazım işlemi

`kaydiIsle` aşağıdaki tek işlem hattını uygulamalıdır:

1. Dosya+kod anahtarı işlemdeyse ikinci çağrı açıkça “Bu karar zaten işleniyor” sonucunu almalıdır.
2. Hedef belge açılmalı ve dosya yazılabilirliği denetlenmelidir.
3. Belge karar öncesinde kirliyse yalnız o zaman koşullu bir çatışma sorusu gösterilmelidir: “Taslağı kaydet ve kararı işle”, “Kapıya git” veya “İptal”. Bu soru temiz belgede hiçbir zaman çıkmamalıdır.
4. Belge kaydedildikten sonra kapı en güncel ağaçta **dosya+kod** ile yeniden bulunmalıdır. Satır yalnız ek doğrulama ve gezinme bilgisi olmalıdır. Aynı dosyada aynı kod birden çok kez bulunursa yazım durmalı ve açık kimlik hatası gösterilmelidir.
5. Şerh ve ret notu boşsa `validateInput` kararı engellemelidir. Düz onay not sormamalıdır.
6. Karar tarihi mevcut `YYYY-MM-DD` biçiminde, kullanıcının yerel takvim gününden üretilmelidir. Üç damga aynen korunmalıdır.
7. `WorkspaceEdit` tek kez uygulanmalı ve `false` ile reddedilen söz açık hata olmalıdır.
8. `doc.save()` sonucu mutlaka `true` olmalıdır. `false` veya reddedilen söz başarı sayılamaz. Eklenen karar, belge sürümü değişmemişse güvenli ters düzenlemeyle bellekten geri alınmalı; bu da başarılamazsa dosya açılarak kullanıcıya tam durum söylenmelidir.
9. Bellekteki ayrıştırılmış Adımda hedef kodun `onay` değeri beklenen karar metnine birebir eşit olmalıdır.
10. Aynı dosya `workspace.fs.readFile` ile hedefli olarak geri okunmalı; aynı Adımda aynı değer diskte de bulunmalıdır. Bu tek dosyalık işlem doğrulaması ikinci çalışma alanı taraması değildir.
11. Ancak bu üç kanıttan sonra panel tazelenmeli, durum çubuğu aynı olayda yenilenmeli ve başarı bildirimi gösterilmelidir.
12. İşlem sonucu ne olursa olsun uçuş kilidi `finally` içinde açılmalıdır.

### 6.6. Geri alma sözleşmesi

Başarılı yazım şu geçici makbuzu bellekte tutmalıdır:

```text
dosya + kapı kodu + birebir onay değeri + yazım sürümü + yazılan alanın yapısal konumu
```

Bu makbuz ikinci bir karar çizelgesi veya çalışma alanı taraması değildir. Yalnız son kullanıcı eyleminin geri dönüş tutamağıdır.

“Geri al” seçildiğinde aynı `kaydiIsle` sınırı geri alma kipinde şu denetimleri yapmalıdır:

1. Hedef belge kirliyse aynı koşullu çatışma davranışı uygulanmalıdır.
2. Hedef Adım dosya+kod ile tekil bulunmalıdır.
3. `onay` değeri makbuzdaki değerle birebir aynı olmalıdır.
4. Değer değişmişse veya başka biri kaydı düzenlemişse hiçbir şey silinmemeli, açık hata gösterilmeli ve satır açılmalıdır.
5. Aynı alan kaldırılmalı, kaydetme `true` olmalı ve kapının aynı tek tarayıcı sonucunda geri geldiği diskten doğrulanmalıdır.
6. Başarıdan sonra panel, rozet ve durum çubuğu birlikte artmalıdır.

Eklenti yeniden başlatıldıktan sonra geçmiş kararları otomatik tarayan ayrı bir “karar geçmişi” kurulmayacaktır. Oturum dışı düzeltme, kaynaktaki görünür `onay:` kaydı üzerinden yapılır. Böylece ikinci tarama ve ikinci çizelge yasağı korunur.

## 7. Uygulama kalemleri ve nöbetleri

### 1. Zengin ve tekil kapı modelini kurmak

**Dosyalar:** `_Sarmal/eklenti/src/onay-cekirdek.ts`, `_Sarmal/eklenti/sinama/onay-yuzeyleri.test.ts`.

`OnayKapisi`, tek `olcut` yerine eşleşen bütün ölçütleri; `ne` yoksa `ad` yedeğini; `bağımlı`, `referans`, `üretir` özetlerini ve üst düğüm yolunu taşımalıdır. Kapı çözümü dosya+kod kimliğini esas almalı; aynı dosyada yinelenen kodu açık kusur olarak döndürmelidir. Founder-onay imzası, sözcük sırasına ve makul ifade çeşitlerine dayanıklı tek bir saf işlevde kalmalıdır.

**Nöbet şunu ölçmelidir:** İki Founder ölçütü iki öğe olarak korunmalı; “Founder onayı” ile “onay Founder tarafından” ifadeleri aynı kapıyı üretmeli; `ne` yokken `ad` görünmeli; bağlantı alanları kaybolmamalı; yinelenen kod yazılabilir hedef üretmemelidir.

**Tek başına uygulanıp sınanabilir mi?** Evet. Saf çekirdek VS Code istemeden kırmızı-yeşil sınanabilir ve henüz görünüşte kullanılmasa da mevcut tüketicilerle geriye uyumlu bir geçiş alanı korunabilir.

### 2. Tarama sonucuna hazır olma ve hata kanıtını eklemek

**Dosyalar:** `_Sarmal/eklenti/src/onay-tarayici.ts`, `_Sarmal/eklenti/src/onay-cekirdek.ts`, `_Sarmal/eklenti/sinama/onay-yuzeyleri.test.ts`.

Tek tarayıcı kapı dizisinin yanında `hazır` durumunu ve okunamayan ya da ayrıştırılamayan dosyaların yapılandırılmış kusurlarını döndürmelidir. Ana görüntü yolunda programı bulunmayan kapsam içi dosyaların nedenleri ana hattan taşınmalı; yedek yolun `catch { continue; }` çıkışları kaybolmamalıdır. İkinci bir tarama kurulmayacaktır.

**Nöbet şunu ölçmelidir:** Bir okunamayan ve bir kırık dosya bulunan fikstürde sağlam kapılar korunmalı, iki dosya kusuru adlarıyla dönmeli, ana görüntü varken sıfır ek arama ve okuma sözleşmesi değişmemelidir.

**Tek başına uygulanıp sınanabilir mi?** Evet. Sonuç tipi önce eklenip mevcut tüketiciye kapı dizisi verilmeye devam edilebilir.

### 3. Yeni akışın dürüst metinlerini hazırlamak

**Dosya:** `_Sarmal/eklenti/src/yuzey-metinleri.ts`.

Boş durum, yükleniyor, tarama hatası, kapı bağlamı, eylem, kirli belge çatışması, işlem sürüyor, kanıtlı başarı, kaydetme hatası, disk doğrulama hatası ve geri alma metinleri tek katalogda tanımlanmalıdır. “Tıklayınca satıra gider ve karar sorulur” ile Comments penceresi vaatleri kaldırılmalıdır.

**Nöbet şunu ölçmelidir:** Her metin tam cümle olmalı; kapı eylemleri kapı kodunu taşımalı; boş, yükleniyor ve hata durumları birbirinden farklı olmalı; hiçbir kullanıcı metni görünmez Comments yüzeyi vaat etmemelidir.

**Tek başına uygulanıp sınanabilir mi?** Evet. Metinler kullanılmadan önce saf katalog nöbetiyle sınanabilir.

### 4. Posta Kutusu ağacını kararlı ana-öğe/ayrıntı yüzüne çevirmek

**Dosyalar:** `_Sarmal/eklenti/src/posta-kutusu.ts`, `_Sarmal/eklenti/src/onay-cekirdek.ts`, `_Sarmal/eklenti/sinama/posta-kutusu.test.ts`, `_Sarmal/eklenti/sinama_vscode/suite/panel-gorunum.test.ts`.

Sağlayıcı yükleniyor/hazır/hata durumlarını göstermeli; çalışma alanı/proje ile ayırt edilen dosya etiketleri üretmeli; kapının doğrudan çocuklarında bağlam ve dört eylemi döndürmeli; dosya, kapı ve çocuklara kararlı `TreeItem.id` vermeli; gerçek `getParent` zincirini kurmalı ve dosya+kodla kapıyı bulan bir `gosterVeAc` kapısı sunmalıdır. Yalnız seçilen kapının ayrıntısı açık tutulmalıdır.

**Nöbet şunu ölçmelidir:** `getChildren(kapı)` bütün bağlam satırlarını ve tam dört eylemi döndürmeli; eylem komutlarının bağımsız değişken sırası doğru olmalı; her çocuğun ebeveyni kapı, kapının ebeveyni doğru dosya olmalı; iki aynı adlı dosyanın görünür etiketi ve kimliği ayrışmalı; etiket değişse de kapı kimliği sabit kalmalıdır.

**Tek başına uygulanıp sınanabilir mi?** Hayır. Kalem 1 ve 3 tamamlandıktan sonra tek teslimat olarak uygulanıp sınanabilir.

### 5. Bütün girişleri Posta Kutusuna yönlendirmek ve Comments'i görünür akıştan emekliye ayırmak

**Dosyalar:** `_Sarmal/eklenti/src/onay-kuyrugu.ts`, `_Sarmal/eklenti/src/yuzey-cekirdek.ts`, `_Sarmal/eklenti/sinama/onay-yuzeyleri.test.ts`, `_Sarmal/eklenti/sinama_vscode/suite/onay-yuzeyi.test.ts`.

CodeLens `sarmal.onayKarar` ile Posta Kutusundaki doğru kapıyı göstermeli ve açmalıdır. `sarmal.postaKapisiAc` yalnız dosya ile doğru satıra gitmeli, Comments iş parçacığı yaratmamalıdır. `sarmal-onay` denetleyici kimliği ve mevcut komut kimlikleri korunmalı; denetleyici görünür iş parçacığı üretmemelidir. Eski Comments karar komutları çağrılırsa Posta Kutusuna yönlendiren açık uyumluluk sonucu vermelidir.

**Nöbet şunu ölçmelidir:** Etkinleşme, CodeLens, kapıya git, kaydetme, dış değişiklik ve silme sonrasında yaratılan Comments iş parçacığı sayısı sıfır kalmalı; CodeLens doğru dosya+kod kapısını `reveal` etmeli; hiçbir giriş yeni liste veya ikinci karar yüzeyi yaratmamalıdır.

**Tek başına uygulanıp sınanabilir mi?** Hayır. Kalem 4'ün `gosterVeAc` kapısına bağımlıdır.

### 6. Yazım önkoşullarını ve uçuş kilidini kurmak

**Dosyalar:** `_Sarmal/eklenti/src/onay-kuyrugu.ts`, `_Sarmal/eklenti/src/onay-cekirdek.ts`, `_Sarmal/eklenti/sinama/onay-yuzeyleri.test.ts`.

Dosya+kod başına tek uçuş defteri kurulmalı; ikinci tıklama işleme alınmamalıdır. Hedef yalnız dosya+kodla yeniden bulunmalı, satır eşleşmesi tek başına hiçbir zaman karar hedefi seçmemelidir. Kirli belge yalnız bu koşul gerçekleştiğinde kaydet/kapıya git/iptal sorusuna girmelidir.

**Nöbet şunu ölçmelidir:** Bayat satırda başka kapı bulunsa bile gönderilen kodun kapısı seçilmeli; iki eşzamanlı çağrıdan yalnız biri yazma kapısına ulaşmalı; kirli belge kullanıcının seçimi olmadan kaydedilmemeli; temiz belgede ek soru sayısı sıfır olmalıdır.

**Tek başına uygulanıp sınanabilir mi?** Evet. Görünüşten bağımsız olarak komut doğrudan çağrılıp sahte işlem kabuğuyla sınanabilir.

### 7. Kaydetme ve disk doğrulamasını başarı kapısı yapmak

**Dosyalar:** `_Sarmal/eklenti/src/onay-kuyrugu.ts`, `_Sarmal/eklenti/src/onay-tarayici.ts`, `_Sarmal/eklenti/sinama/onay-yuzeyleri.test.ts`, `_Sarmal/eklenti/sinama_vscode/suite/onay-yuzeyi.test.ts`.

`applyEdit` ve `doc.save()` sonuçları denetlenmeli; bütün zincir açık `try/catch/finally` içinde olmalıdır. Bellekte hedef Adımın birebir karar değeri, ardından hedefli disk okumasında aynı değer doğrulanmalıdır. Başarısızlıkta kapı listede kalmalı; güvenli ters düzenleme uygulanabiliyorsa ek bellekten geri alınmalıdır.

**Nöbet şunu ölçmelidir:** `applyEdit=false`, `save=false`, reddedilen söz, ayrıştırma kırığı ve disk değeri uyuşmazlığı ayrı ayrı açık hata üretmeli; hiçbirinde başarı bildirimi çıkmamalı ve kapı düşmemelidir. Başarılı yol tam bir `onay:` kaydı için bir uygulama, bir kaydetme ve bir hedefli disk doğrulaması yapmalıdır.

**Tek başına uygulanıp sınanabilir mi?** Hayır. Kalem 6'nın tekil hedef ve uçuş sözleşmesine dayanmalıdır.

### 8. Not doğrulamasını, geri bildirimi ve korumalı geri almayı eklemek

**Dosyalar:** `_Sarmal/eklenti/src/onay-kuyrugu.ts`, `_Sarmal/eklenti/src/yuzey-metinleri.ts`, `_Sarmal/eklenti/sinama/onay-yuzeyleri.test.ts`, `_Sarmal/eklenti/sinama_vscode/suite/onay-yuzeyi.test.ts`.

Şerh ve ret boş notu kabul etmemeli; düz onay not sormamalıdır. Başarı bildirimi “Geri al” eylemi döndürmeli ve son kanıtlı karar makbuzu Posta Kutusunda geçici olarak erişilebilir olmalıdır. Geri alma aynı `kaydiIsle` sınırında, birebir değer ve disk doğrulamasıyla yapılmalıdır.

**Nöbet şunu ölçmelidir:** Escape sıfır yazım yapmalı; boş şerh ve ret girişinde yazım sayısı sıfır kalmalı; düz onayda InputBox sayısı sıfır olmalı; geri alma yalnız değişmemiş birebir değeri kaldırmalı; dışarıdan değiştirilmiş karar silinmemeli; başarılı geri almada kapı ile iki sayaç birlikte geri gelmelidir.

**Tek başına uygulanıp sınanabilir mi?** Hayır. Kalem 7'nin kanıtlı başarı makbuzuna dayanır.

### 9. Posta Kutusu ile durum çubuğunu aynı olaya bağlamak

**Dosyalar:** `_Sarmal/eklenti/src/eklenti.ts`, `_Sarmal/eklenti/src/posta-kutusu.ts`, `_Sarmal/eklenti/src/durum-cubugu.ts`, `_Sarmal/eklenti/sinama/onay-yuzeyleri.test.ts`.

`PostaKutusu.onDidChangeTreeData` veya aynı defter-değişti olayı `DurumCubugu.tazele` işlevine bağlanmalıdır. Sayı yine `postaKutusu.kapiSayisi` üzerinden türetilmeli; yeni sayaç tutulmamalıdır. İlk tarama, karar, geri alma, dosya silme ve dış değişiklik aynı olayla görünüş rozeti ile durum çubuğunu birlikte yenilemelidir.

**Nöbet şunu ölçmelidir:** İlk yerleşimde 0→N, kararda N→N−1, geri almada N−1→N ve silmede N→M geçişlerinde panel, görünüş rozeti ve durum çubuğu aynı kaynak sayısını göstermeli; aynı içerikte tazeleme sayısı sıfır olmalıdır.

**Tek başına uygulanıp sınanabilir mi?** Evet. Mevcut Posta Kutusu olayıyla bugün de bağımsız olarak uygulanabilir; geri alma ölçüsü Kalem 8'den sonra genişletilir.

### 10. İlk karşılaşmayı ürünün içine yerleştirmek

**Dosyalar:** `_Sarmal/eklenti/package.json`, `_Sarmal/eklenti/src/eklenti.ts`, `_Sarmal/eklenti/src/yuzey-metinleri.ts`, ilgili yeni rehber Markdown'ı.

Mevcut `sarmal.baslangic` walkthrough'una Posta Kutusu adımı eklenmeli; mevcut adım ve görünüş kimlikleri değişmemelidir. `globalState` ile yalnız ilk dolu kuyrukta bir kez keşif bildirimi gösterilmeli ve bildirimin eylemi mevcut `sarmal.onayKuyrugu` komutunu çalıştırmalıdır. Bildirim her etkinleşmede veya her kapıda tekrarlanmamalıdır.

**Nöbet şunu ölçmelidir:** Walkthrough Posta Kutusu kimliğini ve mevcut komut kimliğini taşımalı; ilk 0→N geçişinde bir bildirim, sonraki bütün yerleşimlerde sıfır bildirim çıkmalı; N=0 iken bildirim çıkmamalı; kimliklerin üçü de eski değerinde kalmalıdır.

**Tek başına uygulanıp sınanabilir mi?** Evet. Geçici olarak mevcut paneli açarak çalışabilir; metin doğruluğu Kalem 3 ile tamamlanır.

### 11. Eski nöbet hükümlerini yeni mimariye geçirmek

**Dosyalar:** `_Sarmal/eklenti/sinama/onay-yuzeyleri.test.ts`, `_Sarmal/eklenti/sinama/posta-kutusu.test.ts`.

“Panel satırı Comments karar yüzeyine gider ve yazmaz” hükmü kaldırılmalıdır. Yerine “kapı satırı bağlam ve dört eylem üretir; bütün görünür kararlar panelden tek yazıcıya iner; CodeLens yalnız paneli gösterir” hükmü gelmelidir. Kaynakta bir dize arayan nöbetler, VS Code'suz saf modelin kurulabildiği her yerde modeli veya enjekte edilen kabuğu gerçekten koşturmalıdır.

**Nöbet şunu ölçmelidir:** K-01'den K-21'e kadar bu belgede tanımlanan saf sözleşmeler boş olmayan fikstürlerle koşturulmalı; özellikle altı bağımsız değişken, not iptali, uçuş kilidi, yanlış satır, kirli belge, `save=false`, disk uyuşmazlığı ve geri alma korunmalıdır.

**Tek başına uygulanıp sınanabilir mi?** Hayır. Nöbetler ilgili kalemle birlikte parça parça taşınmalı; bütün uygulama bitene kadar eski yanlış hükmü yeşil tutan toplu bir son değişiklik yapılmamalıdır.

### 12. Gerçek VS Code kabuğunda uçtan uca kabul nöbetini kurmak

**Dosyalar:** `_Sarmal/eklenti/sinama_vscode/suite/onay-yuzeyi.test.ts`, gerekirse aynı suite altında yeni karar-yazımı yardımcıları.

Nöbet geçici bir `.sar` dosyasında panel sağlayıcısını gerçekten gezmeli, kapı çocuğunun komutunu aynı bağımsız değişkenlerle çalıştırmalı ve disk metnini geri okumalıdır. Comments çizim görünürlüğünü değil, Comments nesnesi sayısının sıfır kaldığını ölçmelidir.

**Nöbet şunu ölçmelidir:** Etkinleşmede yükleniyor→hazır geçişi, kapının panelde görünmesi, dört eylem, düz onay, şerh, ret, iptal, başarısız kaydetme, panelden düşme, durum çubuğu eşitliği, geri alma ve kapının geri gelişi ayrı ayrı kanıtlanmalıdır. Başarı sonunda diskte yalnız bir `onay:` alanı bulunmalıdır.

**Tek başına uygulanıp sınanabilir mi?** Hayır. Kalem 1-10 tamamlandıktan sonra son bütünleşme kapısıdır.

## 8. Değişmeyecek dosyalar ve kimlikler

`_Sarmal/eklenti/src/yuzey-cekirdek.ts` içindeki aşağıdaki değerler aynen kalmalıdır:

```text
sarmalPostaKutusu
sarmal.onayKuyrugu
sarmal-onay
```

`_Sarmal/eklenti/package.json` içindeki aynı görünüş ve komut kimlikleri değiştirilmemelidir. `sarmal.postaKararVer` iç komutunun paket bildirimine eklenmesi gerekmemektedir. `onay:` alanı, üç damga ve `degerBicimle` ile yazılan değer biçimi değişmemelidir.

`_Sarmal/eklenti/src/hatirlaticilar.ts` ile `_Sarmal/eklenti/src/bildirimler.ts` bu uygulamanın kapsamı dışındadır. Posta Kutusu ile durum çubuğu arasındaki abonelik için bu iki komşu panelin veri yolu değiştirilmemelidir.

## 9. Teslim kabul ölçütleri

Uygulama ancak aşağıdaki cümlelerin tamamı ölçüldüğünde bitmiş sayılmalıdır:

1. Açılışta Posta Kutusu “yükleniyor” durumundan kanıtlı “hazır” durumuna geçmektedir; yalancı sıfır göstermemektedir.
2. Ana görüntü varken onaya özel dosya araması, okuması ve ayrıştırması sıfırdır.
3. Paneldeki kapı sayısı, görünüş rozeti ve durum çubuğu sayısı her ölçüm anında eşittir.
4. Bir kapı açıldığında bütün Founder ölçütleri ve bağlı işler karardan önce görünmektedir.
5. CodeLens, komut ve kaynak eylemi hiçbir Comments iş parçacığı yaratmadan aynı panel kapısına ulaşmaktadır.
6. Düz onay iki tıkta tamamlanmakta ve her zaman çıkan bir onay kutusu göstermemektedir.
7. Şerh ile ret boş gerekçeyi kabul etmemekte; Escape sıfır yazım yapmaktadır.
8. Aynı kapıya hızlı çift tıklama yalnız bir yazım üretmektedir.
9. Kirli belge kullanıcı seçimi olmadan kaydedilmemektedir.
10. Bayat satır numarası başka kapıya karar yazamamaktadır.
11. `applyEdit=false`, `save=false`, reddedilen söz, ayrıştırma kırığı ve disk uyuşmazlığı başarı bildirimi üretememektedir.
12. Başarı bildirildiğinde aynı karar değeri doğru Adımda hem bellekte hem diskte vardır.
13. Kanıtlı başarıdan sonra kapı, görünüş rozeti ve durum çubuğu aynı olayda azalmakta; kullanıcı bu değişimi görmektedir.
14. “Geri al”, yalnız değişmemiş son kararı kaldırmakta ve kapıyı aynı olayda geri getirmektedir.
15. İlk dolu kuyruk bildirimi bir kez çıkmakta, daha sonra kullanıcıyı rahatsız etmemektedir.
16. `sarmalPostaKutusu`, `sarmal.onayKuyrugu` ve `sarmal-onay` kimlikleri birebir korunmaktadır.

Bu kabul ölçütleri sağlandığında Founder'ın “beni uğraştırma” hükmünün arayüz karşılığı yerine gelmiş olur: kullanıcı sistemi anlamak, görünmeyen bir pencereyi aramak, yanlış sayaca güvenmek veya kararın gerçekten yazılıp yazılmadığını denetlemek zorunda kalmaz.
