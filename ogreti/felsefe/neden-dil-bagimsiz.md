---
kod: FEL-1
baslik: "Neden Sarmal dil bağımsızdır — şef, çalgıcı değil"
ne: "Sarmal hedef kodu değil, teknoloji bağı taşıyan denetlenebilir niyeti üretir"
tur: felsefe
durum: güncel
guncellendi: 2026-08-03
---

# Neden Sarmal dil bağımsızdır?

Sarmal her hedef dilini kendi içinde uygulayan bir derleyici değildir. `.sar` kaynağı
hedef kodu değil; görev, kabul, sınır, bağımlılık, referans ve ürün kökeninden oluşan
denetlenebilir niyeti taşır. Bu ayrım STR-3.2'nin yürütücü bağımsızlığı ve MIM-1.4'ün
teknoloji bağı hükümleriyle korunur.

## İki ayrı katman

| Katman | Sorumluluk |
|---|---|
| Sarmal çekirdeği | `.sar` kaynağını ayrıştırır, grafı kurar, sınıflama ve kanona göre drift denetler |
| Üretim yürütücüsü | Adım konisini alır ve ilan edilmiş hedef teknolojide ürünü gerçekleştirir |

Sarmal'ın dil bağımsızlığı ikinci katmandan gelir: teknoloji seçimi `Teknoloji` ve `Takım`
düğümlerinde bildirilir, Katman bu seçime `bağımlı` kenarıyla bağlanır. ŞEF gerekli koniyi
kurar; üretimi yapan yürütücü hedefin ayrıntısını uygular. Kanonik hüküm belirli bir
yürütücü kimliğine veya sürümüne bağlanmaz.

## Şef ve çalgıcı benzetmesi

Nota hangi işin, hangi sırayla, hangi sınır ve kabul ölçütüyle yapılacağını söyler; çalgının
fiziksel ayrıntısını kendisi icra etmez. Sarmal da aynı biçimde niyeti ve koordinasyonu
taşır. Bu nedenle yeni teknoloji eklemek ikinci bir niyet dili kurmayı gerektirmez; canlı
sınıflamaya uygun bir teknoloji bildirimi ve açık bağı yeterlidir.

Özetle Sarmal hedef kodu sahiplenmediği için tek bir hedefe mahkûm değildir. Niyet Türkçe
öncelikli ve tek kaynaklıdır; hedef teknoloji açık kenarla seçilir, ürün ise Adımın
`üretir` bağı üzerinden Meyve ve dosya kökenine bağlanır. Başvuru için
[`oz/siniflama/kayit.md`](../../oz/siniflama/kayit.md) Reference yüzüne bakılır.
