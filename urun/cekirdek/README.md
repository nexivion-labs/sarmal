<!-- SARMAL:ELLE-KORUNAN:BAS -->
# Sarmal çekirdeği

Bu geliştirme girişi elle korunur; komut ve kaynak özeti canlı koddan üretilir.
<!-- SARMAL:ELLE-KORUNAN:SON -->

<!-- SARMAL:URETILEN:CEKIRDEK-README:BAS -->
<!-- SARMAL:DIATAXIS README -->
## Geliştirme yüzü

Çekirdek; belirteçleme, ayrıştırma, doğrulama, proje denetimi, nötr graf, belge üretimi ve 18 MCP aracının çalışma mantığını taşır. Kanonik hükmün evi bu dizin değil, üst kökteki `yasa/kanon/` sekizlisidir.

`npm run tip-denetle` TypeScript kapısını, `npm test` çekirdek süitini çalıştırır. Üst kökü denetlemek için `node src/sarmal.ts denetle ../..`, kalıcı belge yüzlerini tazelemek için `node src/sarmal.ts belge-yuzleri-uret ../..` kullanılır.

Belge üretim yolu iki parçalıdır. `belgele.ts` tekil `.sar` kaynağını Markdown'a yansıtır; `belge-yuzleri.ts` README, indeks ve Diátaxis bölgelerini canlı kanon, sınıflama ve sicilden üretir. `siniflama.ts` ise 101 tipin tam alan tablosunu ayrı Reference yüzünde kurar.
<!-- SARMAL:URETILEN:CEKIRDEK-README:SON -->
