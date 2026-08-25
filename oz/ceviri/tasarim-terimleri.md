---
code: CEV-terimler
title_en: "Design Vocabulary (TR↔EN) — shared UI/design language"
title_tr: "Tasarım Sözlüğü (TR↔EN) — ortak UI/tasarım dilimiz"
desc_tr: "UI/tasarım işinde Founder ile ajanın aynı şeye aynı adı vermesi için ortak TR↔EN sözlük (ölçü, yerleşim, bileşen, etkileşim, renk, hareket, tipografi, durumlar)."
type: reference
status: canonical
created: 2026-06-23
rol: "insan↔ajan iletişim sözlüğü (aynı odak: makine+AI+insan tek dilde — DIL-1); teknik eşleme için bkz. bilgi/tasarim_sozlugu/kayit.json (TEK KANON — TIP-3; eski ikiz stack-eslemesi.json emeklidir)"
---

# Tasarım Sözlüğü (TR ↔ EN) — ortak dilimiz · GENİŞ SÜRÜM

> Amaç: ikimizin aynı kelimeye aynı şeyi demesi. Sen "şu **kartın** **oluğu** dar, **iç boşluğu** artır, **hover**'da **parıltı** gelsin" dediğinde ben tam anlayayım.
> Bölümler: 0 Ölçü araçları · 1 Yerleşim · 2 Bileşenler · 3 Etkileşim · 4 Görsel · 5 Renk · 6 Hareket · 7 Tipografi · 8 Durumlar · 9 Ölçü&Birim · 10 Bizim ortak sözlük.

---

## 0. EKRANDA ÖLÇÜ ALMA (px ölçüp bana söyle)

| Yöntem | Nasıl | Ne için |
|---|---|---|
| **macOS cetvel** | `⌘⇧4` → sürükle (basmadan bırak / `Esc`) → canlı **G×Y px** görünür | Hızlı "şu alan ~320×480" demek için (kurulum yok) |
| **Chrome DevTools** | `⌘⌥I` → "Inspect" (`⌘⇧C`) → öğenin üstüne gel → **boyut + boşluk** kutusu çıkar | Web öğesinin tam px'i + padding/margin (en kesin) |
| **DevTools mesafe** | Elements'te bir öğeyi seç → başka öğeye `⌥`(Option) ile hover → **aradaki mesafe** | İki öğe arası boşluğu ölçmek |
| **Page Ruler Redux** (eklenti) | Chrome'a kur → ekrana sürükle-cetvel | Serbest dikdörtgen ölçüsü |
| **xScope** (Mac app, ücretli) | Profesyonel cetvel/kılavuz/ölçü | Tasarımcı işi, çok hassas |

> Bizim sayfa zaten HTML → **DevTools en iyisi**: sen ölçersin, ben CSS'te birebir uygularım. (İstersen sayfaya geçici bir "ölçü modu" da koyabilirim.)

---

## 1. YERLEŞİM (nerede duruyor)

| Türkçe | İngilizce | Ne demek |
|---|---|---|
| Yüzey / ekran | surface / screen | Tüm görünür alan |
| Panel | panel | Bağımsız bölge |
| Kenar çubuğu | sidebar | Solda/sağda dikey şerit |
| Bölme | pane | Ekranın bölündüğü parça |
| Sütun / satır | column / row | Dikey / yatay dizilim |
| Kapsayıcı | container | İçine öğe koyulan kutu |
| Tuval / çalışma alanı | canvas | Grafın çizildiği geniş alan |
| Araç çubuğu | toolbar | Üst filtre/buton şeridi |
| Durum çubuğu | status bar | Alt bilgi şeridi |
| Ray | rail | İnce tutamak şerit |
| Ayraç / sürükle-genişlet kolu | splitter / resize handle / gutter | İki bölme arası, çekince genişler |
| Oluk | gutter | Sütunlar/öğeler arası boşluk |
| Dock / rıhtım | dock | Alt uygulama/kasa çubuğu |
| Boşluk / negatif alan | whitespace | Bilerek boş ferah alan |
| İç boşluk / dış boşluk | padding / margin | Öğenin içi / dışı |
| Hizalama | alignment | Sola/ortaya/sağa yaslama |
| Esnek kutu | flexbox | Esneyerek dizilen yerleşim |
| Izgara | grid | Satır-sütun ızgarası |
| Katman sırası | z-index | Hangi öğe önde |
| Sabit | fixed | Kaydırınca yerinde kalan |
| Yapışkan | sticky | Belli noktada yapışan |
| Yüzen | floating | Üstte serbest duran |
| Taşma | overflow | Sığmayanın kaydırılması/kırpılması |
| Tam ekran | fullscreen | Tüm ekranı kaplama |
| Bölünmüş görünüm | split view | Yan yana iki alan |
| Duyarlı | responsive | Ekrana göre uyarlanan |
| Kırılma noktası | breakpoint | Yerleşimin değiştiği genişlik |

## 2. BİLEŞENLER (tek tek parçalar)

| Türkçe | İngilizce | Ne demek |
|---|---|---|
| Düğme | button | Basılan |
| Aç/kapa düğmesi | toggle | İki durum geçişi |
| Anahtar | switch | Açık/kapalı sürgü |
| Segmentli kontrol | segmented control | Bizim mod anahtarı |
| Onay kutusu / seçim düğmesi | checkbox / radio | İşaretle / tekli seç |
| Açılır liste | dropdown | Tıklayınca açılan liste |
| Menü / bağlam menüsü | menu / context menu | Liste menü / sağ-tık menü |
| Çip / hap | chip / pill | Küçük yuvarlak etiket-buton |
| Etiket | tag | Kategori etiketi |
| Rozet | badge | Minik durum işareti |
| Kart | card | Çerçeveli içerik kutusu |
| İpucu balonu | tooltip | Üzerine gelince minik açıklama |
| Açılır kutu | popover | Tıklayınca çıkan küçük panel |
| Kalıcı pencere | modal | Ortada, arkayı kilitleyen |
| Çekmece | drawer | Kenardan kayıp gelen panel |
| Sekme | tab | Geçiş başlıkları |
| Akordeon | accordion | Tıklayınca açılıp kapanan bölümler |
| Giriş alanı | input / field | Yazı kutusu |
| Arama çubuğu | search bar | Arama kutusu |
| Komut paleti | command palette | ⌘K tarzı hızlı komut kutusu |
| Kaydırıcı | slider | Sürükleyerek değer |
| İlerleme çubuğu | progress bar | Doluluk çubuğu |
| İkon | icon | Küçük simge |
| Ok / chevron | chevron | ‹ › ^ v yön oku |
| Avatar | avatar | Profil yuvarlağı |
| Ayırıcı | divider | İnce ayraç çizgi |
| Bildirim | toast / snackbar | Kısa süre çıkıp kaybolan uyarı |
| Afiş | banner | Üstte sabit duyuru şeridi |
| Kırıntı yolu | breadcrumb | "Ana > Alt > Şu an" yolu |
| Sayfalama | pagination | Sayfa numaraları |
| Tablo / liste | table / list | Veri ızgarası / dizi |
| Ağaç görünümü | tree view | İç içe açılan klasör/dal yapısı |
| İskelet yükleme | skeleton | Gri yer tutucu (yüklenirken) |
| Dönen / bekleme | spinner / loader | Dönen yükleme işareti |

## 3. ETKİLEŞİM (ne yapınca ne oluyor)

| Türkçe | İngilizce | Ne demek |
|---|---|---|
| Üzerine gelme | hover | Dokunmadan üstüne gelmek |
| Odak | focus | Klavyenin "buradayım" hâli |
| Tıklama | click / tap | Basmak |
| Çift tıklama | double click | İki kez basmak |
| Sağ tık | right click | Bağlam menüsü açar |
| Uzun basma | long press | Basılı tutmak |
| Sürükle-bırak | drag & drop | Tutup taşımak |
| Kaydırma | scroll | Yukarı/aşağı gezmek |
| Kaydırma jesti | swipe | Parmakla kaydırma |
| Çağırma | summon | Pencere getirmek |
| Belirme / materyalize | materialize | Hayalet gibi çıkma |
| Söndürme / kapatma | dismiss | Esc ile gönderme |
| Daralt / genişlet | collapse / expand | Küçült / büyüt |
| Yeniden boyutlandırma | resize | Boyut değiştirme |
| Kısayol | shortcut | Klavye tuş bileşimi |

## 4. GÖRSEL (nasıl görünüyor)

| Türkçe | İngilizce | Ne demek |
|---|---|---|
| Palet | palette | Renk takımı |
| Vurgu rengi | accent | Öne çıkan renk (mat teal) |
| Kontrast | contrast | Açık-koyu farkı |
| Saydamlık / opaklık | opacity | Görünürlük yüzdesi |
| Parıltı / ışıma | glow | Yumuşak ışık halesi |
| Gölge | shadow | Derinlik gölgesi |
| İç gölge | inner shadow | İçe doğru gölge (oyuk hissi) |
| Bulanıklık | blur | Arka bulanıklaştırma |
| Geçişli renk | gradient | Renkten renge geçiş |
| Cam efekti | glassmorphism | Buzlu cam |
| Köşe yuvarlaklığı | border radius | Köşe yumuşaklığı |
| Kenarlık / çizgi | border / stroke | İnce hat |
| Dış çizgi / halka | outline / ring | Öğeyi saran ince çember |
| Odak halkası | focus ring | Klavye odağındaki ince halka |
| Kaplama | overlay / scrim | Üste serilen yarı saydam kat |
| Doku / parazit | noise / grain | İnce kumlu doku |
| Vinyet | vignette | Köşelerin hafif kararması |
| Katman yüksekliği / derinlik | elevation / depth | Ne kadar önde durduğu |
| Görsel hiyerarşi | visual hierarchy | Göz önce neye gitsin |

## 5. RENK (ton & rol)

| Türkçe | İngilizce | Ne demek |
|---|---|---|
| Renk tonu | hue | Rengin kendisi (mavi/yeşil) |
| Doygunluk | saturation | Renk canlılığı |
| Parlaklık | brightness / value | Açık-koyu seviyesi |
| Açık ton | tint | Renge beyaz katma |
| Koyu ton | shade | Renge siyah katma |
| Zemin | background | En arka renk |
| Yüzey | surface | Üstüne içerik konan kat |
| Ön plan | foreground | Metin/öğe rengi |
| Sönük | muted | Soluk/ikincil renk |
| Anlamsal renkler | semantic | Başarı/uyarı/hata/bilgi renkleri |

## 6. HAREKET (animasyon dili)

| Türkçe | İngilizce | Ne demek |
|---|---|---|
| Animasyon | animation | Hareket |
| Geçiş | transition | İki durum arası yumuşak değişim |
| Yumuşama eğrisi | easing | Hızlanma/yavaşlama ritmi |
| Yay | spring | Esneyen, canlı hareket |
| Zıplama | bounce | Hafif sekme |
| Nefes / nabız | breathe / pulse | Yavaş büyüyüp küçülme |
| Solma | fade | Belirip kaybolma |
| Kayma | slide | Bir yönden girme/çıkma |
| Ölçeklenme | scale | Büyüyüp küçülme |
| Sıralı gecikme | stagger | Öğelerin peş peşe gelmesi |
| Gecikme | delay | Başlamadan önce bekleme |
| Döngü | loop | Tekrar eden |
| Dalga | ripple | Tıklamada yayılan halka |
| Süre | duration | Ne kadar sürsün |
| Anahtar kare | keyframe | Animasyonun ara durağı |

## 7. TİPOGRAFİ (yazı)

| Türkçe | İngilizce | Ne demek |
|---|---|---|
| Yazı tipi ailesi | font family | Hangi font (SF, Inter) |
| Ağırlık | weight | İnce/kalın (300–800) |
| Boyut | size | Punto (px) |
| Harf aralığı | letter spacing / tracking | Harfler arası mesafe |
| Harf çifti aralığı | kerning | İki harf arası ince ayar |
| Satır yüksekliği | line height / leading | Satırlar arası mesafe |
| Taban çizgisi | baseline | Harflerin oturduğu çizgi |
| Tek aralıklı | monospace | Kod fontu (eşit genişlik) |
| Üç nokta / kırpma | ellipsis / truncate | Sığmayanı "…" ile kesme |
| Büyük harf | uppercase | TÜMÜ BÜYÜK |

## 8. DURUMLAR (bir öğenin hâlleri)

| Türkçe | İngilizce | Ne demek |
|---|---|---|
| Dinlenme / boşta | idle / resting | Hiçbir şey olmuyorken |
| Aktif | active | Çalışan/seçili |
| Üzerinde | hover | Fare üstündeyken |
| Basılı | pressed | Basılı tutulurken |
| Seçili | selected | İşaretlenmiş |
| İşaretli | checked | Onay kutusu dolu |
| Belirsiz | indeterminate | Ne dolu ne boş (ara) |
| Pasif / devre dışı | disabled | Tıklanamaz |
| Salt-okunur | read-only | Görünür ama değiştirilemez |
| Yer tutucu | placeholder | Boş kutudaki soluk ipucu |
| Boş durum | empty state | İçi henüz boş ekran |
| Yükleniyor | loading | Bekleme |
| Hata | error | Sorun hâli |

## 9. ÖLÇÜ & BİRİM

| Türkçe | İngilizce | Ne demek |
|---|---|---|
| Piksel | px | Sabit nokta birimi |
| Görece birim | rem / em | Font boyutuna göre ölçek |
| Yüzde | % | Kapsayıcıya göre |
| Görüntü genişliği/yüksekliği | vw / vh | Ekranın %'si |
| Boşluk ölçeği | spacing scale | 4-8-12-16… düzenli boşluk adımları |
| En-boy oranı | aspect ratio | 16:10 gibi oran |
| Min/Maks genişlik | min/max width | Alt/üst sınır |

## 10. BİZİM ORTAK SÖZLÜK (projeye özel)

| Kelime | Ne demek |
|---|---|
| Kokpit | Tek ekranlı ana çalışma yüzeyi |
| Ufuk hüzmesi | Ortadaki ışık = AI'nin sesi/varlığı |
| Klasik mod / Derin odak | İki çalışma modu |
| Mission Control (mobil panel) | Sağdaki, her şeyi gösterecek mobil ekran |
| Düğüm / kenar | Graf'taki nokta / bağlantı çizgisi |
| Takımyıldızı | Grafın görünümü (düğüm + ışıklı iplik) |
| Sinir-uçları kenar | Düz değil, organik eğri bağlantı çizgisi |
| Inspector (müfettiş) | Seçili öğenin detay paneli |
| Metro / yol haritası | Adımların dikey ilerleme çizgisi |
| Kasa (vault) | Bir proje kabı |
| Drift | Tutarsızlık/bayatlık (sağlık uyarısı) |
| Materyalize / hayalet | Pencerenin yumuşakça belirip sönmesi |

---
> Eksik değilsin gözüm — bunlar sadece etiket. Bir de DevTools'tan ölçüp "şu 12px olsun" dersen, ben de tam oturturum. :)
