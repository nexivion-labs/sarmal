<!-- SARMAL:ELLE-KORUNAN:BAS -->
# Kavramlar

Bu giriş elle korunur; aşağıdaki gezinme indeksi canlı kaynaklardan üretilir.
<!-- SARMAL:ELLE-KORUNAN:SON -->

<!-- SARMAL:URETILEN:KOK-KAVRAMLAR:BAS -->
<!-- SARMAL:DIATAXIS indeks -->
## Kaynak indeksi

| Aranan kavram | Tek kaynak | Okuma yüzü |
|---|---|---|
| Kanonik hüküm | `yasa/kanon/` içindeki sekiz dosya | `150` madde; metin burada yinelenmez |
| Tip, alan, enum ve sarma | `oz/siniflama/kayit.json` | [tam Reference tablosu](oz/siniflama/kayit.md) |
| Tanı kimliği ve düzeyi | `urun/cekirdek/src/tani-sicili.ts` | 46 hata · 16 uyarı · 11 bilgi |
| Araç metni | `urun/cekirdek/src/mcp-metinleri.ts` | 18 iki dilli MCP aracı |
| Karşılama kartı | `urun/cekirdek/src/ogret.ts` | `sarmal ogret` |
| Ajan çıktı dili | `urun/cekirdek/src/dil-baglami.ts` | Türkçe / İngilizce |

## Üretim omurgası

Katı rejimde zincir `ÇalışmaAlanı → Auth → Proje[*] → Faz → Blok → Katman → AltKatman → Adım → üretir → Meyve → dosya` biçimindedir. Faz zamanı, Blok işi, Katman teknolojiyi, AltKatman departmanı ve Adım akışı taşır. Esnek rejim yalnız gerekçeli istisnadır.

## Tip aileleri

| Aile | Canlı sınıflama açıklaması |
|---|---|
| arkayuz | sunucu yüzü (servis·uç·tablo·kuyruk) — yüzeyin simetriği |
| bilgi | bilgi & tecrübe (karar·formül·sözlük·fikir·deney) |
| davranis | UI-mantık köprüsü (canlandırma·durum) — teknoloji-bağımsız niyet |
| etmen | kimlik + yetenek + bellek + tetikleyici |
| nitelik | doğrulama & gözlem (sınama·metrik·log·güvenlik) |
| orkestrasyon | yönetir (işletim: şablon·politika·akış·kanca) |
| oz | meta / kayıt (sınıflama·durum·hatırlatıcı) |
| plan | içerir (containment) — omurga |
| surec | yürütme izi (görev · koşum · iz · git) — çalışma anında oluşan kayıt |
| teknoloji | bağımlı (adaptör: teknoloji·mcp·araç·model·ortam) |
| temel | üretken kök / iskelet (kasa→proje→uygulama) |
| urun | üretilen yazılım (meyve 🍎 — kod·sınama-dışı artefakt) |
| yasa | kural düzlemi (değişmez) |
| yuzey | içerir (UI ağacı — kullanıcının gördüğü) |

Alan ayrıntısı bu indekste kopyalanmaz; `kayit.json`dan üretilen Reference yüzüne gidilir.

## Sarmal'ın kendi kavramları

Aşağıdaki kavramlar Sarmal'ın kendi mimarisine aittir ve `kavram` aracıyla
sorgulanabilir. Tanımın kendisi burada değil, sözlüğün tek kaynağında yaşar;
bu bölüm o kaynaktan üretilir ve her kavramın kanonik dayanağını gösterir.

| Kavram | Nerede yaşar | Kanonik dayanak |
|---|---|---|
| `kavuşum` · convergence | Blok gövdesi ve Katman ilişkisi | MIM-1.3 · Blok Kavuşum Gövdesi — yasa/kanon/mim.sar; zorlayan tanılar: kavuşumsuz-dilim, silo-blok, kavuşumsuz-paralellik, kavuşumsuz-ekran. |
| `koni` · cone | Adım düğümünün alanları | Zorunlu kenarlar ve konisiz-adım tanısı — yasa/kanon/ork.sar; alanların tam listesi oz/siniflama/kayit.json içindeki Adım şemasındadır. |
<!-- SARMAL:URETILEN:KOK-KAVRAMLAR:SON -->
