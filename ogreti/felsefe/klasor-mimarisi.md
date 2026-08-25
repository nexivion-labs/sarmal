---
kod: FEL-3
baslik: "Klasör mimarisi = bildirilen ağacın fiziksel yüzü"
ne: "Geliştirici yapıyı ilan eder; İskeletçi kurar, Denetçi mutabakatı korur"
tur: felsefe
durum: güncel
guncellendi: 2026-08-03
---

# Klasör mimarisi = bildirilen ağacın fiziksel yüzü

Sarmal tek bir klasör kalıbını bütün projelere dayatmaz. Geliştirici ihtiyaç duyduğu
Kitaplık, Raf ve yol yapısını anadizin kaynağında bildirir. İskeletçi bu bildirimi diske
yansıtır; Denetçi gerçek disk ağacı ile bildirilen yapı arasındaki mutabakatı ölçer.

## Mantıksal ve fiziksel yüz

Planın katı mantıksal omurgası `Faz → Blok → Katman → AltKatman → Adım` zinciridir.
Fiziksel yerleşim ise `Kitaplık`, `Raf` ve `yol` alanlarıyla açıklanır. Bu iki yüz aynı
değildir: plan niyet ve iş ilişkisini, klasör yapısı kaynakların disk evini gösterir.
MIM-3 bu ayrımı ve mutabakatı tanımlar.

## Üç adımlı koruma

1. Kaynak, dosya veya rafın kimliğini ve beklenen yolunu bildirir.
2. İskelet üretimi eksik fiziksel yapıyı bu ilandan kurar.
3. Denetim gerçek yer ile ilan edilen yeri karşılaştırır; sapma tanı olarak görünür.

Bu mekanizmanın değeri klasör seçmek değil, seçilmiş mimariyi tekrar üretilebilir ve
ölçülebilir tutmaktır. Aynı fiziksel olgu iki yerde sahiplenilmez; anadizin mimariyi,
`plan/` rafı ise Fazdan Adıma iş omurgasını taşır. Kanonik hükmün tek adresi
`yasa/kanon/` altındaki sekiz bölüm dosyasıdır.
