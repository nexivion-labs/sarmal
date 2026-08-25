---
kod: FEL-5
baslik: "Prizma — tek kaynak, çok okuma yüzü"
ne: "Makine, insan ve Etmeni tek doğrulanmış anlam ağacında buluşturur"
tur: felsefe
durum: güncel
guncellendi: 2026-08-03
---

# Prizma — tek kaynak, çok okuma yüzü

Makine, insan ve Etmen aynı olguyu farklı biçimlerde okumak ister. Bu ihtiyaç aynı hükmün
birkaç dosyada elle tutulmasını meşru kılmaz. YUZ-1 uyarınca kaynak gerçek tektir; Prizma
o kaynağın doğrulanmış nötr anlamını okura uygun yüzlere yansıtır.

## Okurlar

| Okur | İhtiyaç | Türetilmiş yüz örneği |
|---|---|---|
| Makine | kesin alan ve tür | JSON |
| Etmen | etiketli, bağlamlı yapı | XML |
| Yapılandırma tüketicisi | okunur anahtar-değer düzeni | YAML |
| İnsan | akıcı anlatı ve başvuru | Markdown |
| Ağaç okuru | içerme ve kimlik görünümü | ağaç yüzü |

Yüz sayısı kaynak sayısı değildir. Her projektör aynı söz dizim ağacını okur; türetilmiş
çıktı kanonik hükmü değiştiremez ve ikinci doğruluk kaynağı sayılamaz.

## Neden üretim gerekir?

Elle tutulan ikizler insan hafızasına bağlıdır ve zamanla ayrışır. Üretici ise aynı girdiyi
aynı sırayla işler, kaynağın şekil ve kimliklerini korur ve ikinci koşuda sıfır fark verir.
`belgele.ts` insan Markdown yüzünü, `prizma.ts` veri yüzlerini, `agac.ts` içerme yüzünü
üretir. Kalıcı README ve Diátaxis bölgeleri de `belge-yuzleri.ts` ile aynı idempotans
disiplinini izler.

Prizma'nın değeri yeni bir eş-yetkili dil kurmak değil, her okurun aynı gerçeğe erişmesini
sağlamaktır. İlgili hükümler YUZ-1 ve YUZ-1.1'de; kanonik metin yalnız
`yasa/kanon/` altındaki sekiz bölüm dosyasındadır.
