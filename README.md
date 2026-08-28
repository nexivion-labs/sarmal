<!-- SARMAL:ELLE-KORUNAN:BAS -->
# Sarmal

Bu kısa giriş elle korunur; aşağıdaki ürün özeti kanonik kaynaklardan üretilir.
<!-- SARMAL:ELLE-KORUNAN:SON -->

<!-- SARMAL:URETILEN:KOK-README-TR:BAS -->
<!-- SARMAL:DIATAXIS README -->
Sarmal, yazılım niyetini bildirimsel `.sar` kaynaklarında tutan; planı, kuralları, ajan bağlamını ve denetim yüzlerini aynı kaynaktan besleyen açık bir çalışma alanı dilidir.

## Tek kaynak ve ölçülen yüzler

Kanonun tek adresi [`yasa/kanon/`](yasa/kanon/) altındaki sekiz bölüm dosyasıdır. Bu kaynaklarda 151 tekil madde yaşar: 37 Karar ve 114 Kural. Kalıcı belgeler hüküm kopyası değil, bu kaynaklardan üretilen okuma yüzleridir.

Yeni tanı kümesi 47 hata, 16 uyarı ve 11 bilgi düzeyindedir. Sabit sicilin yönlendirme matrisi 143 Problems, 4 Hatırlatıcılar ve 28 Bildirimler (Gözlemler) olarak ölçülür. Tanı metinlerinin 174'i, 18 MCP aracının açıklamaları, manifest, karşılama kartı ve ajan dil bağlamı Türkçe ve İngilizce yüz taşır. İngilizce başlangıç yüzü [README.en.md](README.en.md) dosyasındadır.

## Açık sınır

Sarmal [Apache-2.0](LICENSE.md) lisansı ile açıktır. kapalı ürün, **Sarmal ile yönetilen ayrı kapalı ürün**dür; bu belge o ürünün içeriğini anlatmaz.

Kendi etmenini yazma yeteneği de açık kapsamın parçasıdır: **Etmen · Beceri · Tetikleyici + sef**. `Etmen` kimliği ve yetkisi, `Beceri` uygulanabilir bilgisini, `Tetikleyici` ne zaman devreye gireceğini bildirir; `sef` ise Adım konisini bu bağlamla kurar.

## Başlangıç

Kurulum tek adımdır ve Node 23.6 ya da üstünü ister: `cd urun/cekirdek && npm link` komutu `sarmal` komutunu kabuğa bağlar; sürüm şartının kaynağı `urun/cekirdek/package.json` dosyasıdır. `cd urun/cekirdek && npm test` çekirdek davranışını sınar. İlk kanonik proje kartı için `sarmal ogret`, bütün çalışma alanını denetlemek için `sarmal denetle .`, bir şablonu görmek için `sarmal başla proje` kullanılır. Onay gerektiren işler kullanıcı yüzünde **ONAYLAR** paneline gider.

## Belge haritası

[NEDIR.md](NEDIR.md) kavramsal açıklamayı, [KAVRAMLAR.md](KAVRAMLAR.md) başvuru indeksini, [ROL-HARITASI.md](ROL-HARITASI.md) açık/kapalı rol sınırını, [urun/eklenti/README.md](urun/eklenti/README.md) eklentiyi kullanma görevini ve [oz/siniflama/kayit.md](oz/siniflama/kayit.md) tam tip/alan Reference tablosunu verir.
<!-- SARMAL:URETILEN:KOK-README-TR:SON -->
