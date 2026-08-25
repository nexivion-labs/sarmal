# Katman Haritası — büyük sistemleri küçük bir niyet diliyle tutmak

Bu harita bir ürünün içeriğini anlatmaz. Çok teknolojili bir sistemde kesişen mimari
kategorilerin Sarmal tiplerine nasıl yerleştiğini açıklar. Kanonik tip ve alan ayrıntısının
tek kaynağı `oz/siniflama/kayit.json`, insan Reference yüzü ise
[`oz/siniflama/kayit.md`](../../oz/siniflama/kayit.md) dosyasıdır.

## Tek sahip, çok başvuru

Ortak bir politika, sözleşme, mekanizma veya kimlik kökü plan adımlarına kopyalanmaz.
Bir kez ilan edilir ve çözülen KOD üzerinden başvurulur. Bu, ORK-1 ilişki sınıfları ile
YUZ-1 tek-kaynak sözleşmesinin mimari sonucudur: dağıtılmış kopya sahipliği belirsizleştirir,
referans ise tek sahibin değişikliğini bütün tüketicilere taşır.

## Kategori eşlemesi

| Mimari kategori | Sarmal karşılığı | Bağlama biçimi |
|---|---|---|
| Kesişen mekanizmalar | `Mekanizma`, `Politika`, `Kural`, `Metrik`, `Log`, `Güvenlik` | bir kez ilan, `referans` veya `bağımlı` |
| Orkestrasyon | `Orkestrasyon`, `Etmen`, `Beceri`, `Tetikleyici` | ŞEF konisine bağlanır |
| Yetki | `Etmen` yetkisi ve canlı yetki sözlüğü | kapalı varsayılan, açık izin |
| Teknoloji | `Teknoloji`, `Takım`, `Katman` | Katman somut teknoloji bağı taşır |
| Sözleşme | `Sözleşme`, `Uç`, `Tablo` | katmanlar sözleşme üzerinden kavuşur |
| Ürün | `Adım`, `Meyve`, `dosya` | `üretir` köken zinciri |
| Belge | `.sar` belge bloğu ve türetilmiş yüz | kaynak tek, okuma yüzü çok |

## Omurgadaki yer

Katı üretim yolu `ÇalışmaAlanı → Auth → Proje[*] → Faz → Blok → Katman →
AltKatman → Adım → üretir → Meyve → dosya` zinciridir. Mekanizmalar bu zincirin
altına çoğaltılmaz; ilgili Adımlar onları kimlikleriyle tüketir. Böylece plan büyüse bile
ortak altyapı tek sahipte ve ölçülebilir kalır.
