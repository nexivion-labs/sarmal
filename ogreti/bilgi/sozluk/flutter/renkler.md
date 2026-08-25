---
kod: BLG-SOZLUK-RNK
baslik: "Flutter→Türkçe Sözlük — Renkler"
ne: "Flutter renk sistemi terimleri (Color, Gradient, BlendMode, ColorScheme) Türkçe karşılıkları"
tur: referans
durum: güncel
kaynak: Founder
guncellendi: 2026-07-01
---

# 🎨 Flutter → Türkçe — Renkler

> **Sarmal için:** Renk paleti (M-04) ve `renk:` parametreleri bu terminolojiden türetilir.

```
==================== RENKLER (COLORS) - TÜM DETAYLAR ==========================

Color: Renk (Flutter'daki temel renk sınıfı)
MaterialColor: Material Rengi (Tek bir renk tonunun farklı ağırlıklarını (50-900) içeren palet)
ColorSwatch: Renk Paleti (Sabit renklerin listesi)
ColorScheme: Renk Düzeni (Primary, Secondary, Tertiary, Error, Background, Surface vb.)
Hex Code (Hexadecimal): Onaltılık Renk Kodu (#FF5733 gibi)
ARGB / RGBA: ARGB / RGBA (Alfa (saydamlık), Kırmızı, Yeşil, Mavi değerleri)
Color.fromARGB: ARGB Değerlerinden Renk Oluşturma
Color.fromRGBO: RGB + Opaklık ile Renk Oluşturma
Color.fromHSL: HSL (Ton, Doygunluk, Parlaklık) ile Renk Oluşturma
HSLColor: HSL Renk Modeli (Hue, Saturation, Lightness)
HSVColor: HSV Renk Modeli (Hue, Saturation, Value/Brightness)
Opacity: Opaklık (Saydamlığın tersi; 1.0 tam opak, 0.0 tamamen saydam)
Transparency: Saydamlık / Şeffaflık
BlendMode: Karışım Modu (İki görselin birbiriyle nasıl birleşeceği)
  - BlendMode.multiply: Çarpma (Koyulaştırma)
  - BlendMode.screen: Ekran (Aydınlatma)
  - BlendMode.overlay: Kaplama
  - BlendMode.darken: Koyulaştır
  - BlendMode.lighten: Aydınlat
  - BlendMode.colorDodge: Renk Açma
  - BlendMode.colorBurn: Renk Yakma
  - BlendMode.hue: Ton (Sadece tonu aktar)
  - BlendMode.saturation: Doygunluk (Sadece doygunluğu aktar)
  - BlendMode.color: Renk (Ton + Doygunluk)
  - BlendMode.luminosity: Parlaklık
ColorFilter: Renk Filtresi (Bir görsele renk matrisi veya karışım modu uygulamak için)
ColorFilter.mode: Mod Filtrasyonu (Belirli bir renk ve karışım modu ile filtrele)
ColorFilter.matrix: Matris Filtrasyonu (5x4'lük renk matrisi ile gelişmiş ayar)
Brightness: Parlaklık
Saturation: Doygunluk
Hue: Renk Tonu (Derece olarak 0-360)
Shade: Ton / Gölge (Renk ağırlığı, örn: Colors.blue.shade200)
Tint: Renk Açma / Beyaz Katma
FilterQuality: Filtre Kalitesi (Görsel yeniden boyutlandırmada; none, low, medium, high)
Gradient: Renk Geçişi (Degrade)
  - LinearGradient: Doğrusal Renk Geçişi (Yukarıdan aşağıya veya çapraz)
  - RadialGradient: Dairesel Renk Geçişi (Merkezden dışa doğru)
  - SweepGradient: Taramalı / Açısal Renk Geçişi (Daire etrafında dönen, saat yönünde)
  - stops: Durak Noktaları (Gradyanın hangi oranda hangi renge dönüşeceği)
  - tileMode: Döşeme Modu (Gradyan tekrar etme şekli; clamp, repeated, mirrored)
Color.computeLuminance: Parlaklık Hesaplama (Rengin ne kadar koyu/açık olduğunu hesaplar)
Color.alpha: Alfa Değeri (Şeffaflık seviyesi 0-255)
Color.red / green / blue: Renk Değerleri (Kırmızı, yeşil, mavi kanalları 0-255)
Colors.transparent: Tamamen Saydam Renk
Colors.white / black / grey: Beyaz / Siyah / Gri renk sabitleri
AccentColor: Vurgu Rengi (Buton, sekmelerde kullanılan yardımcı renk)
PrimaryColor: Ana Renk (Uygulamanın ana teması)
SecondaryColor: İkincil Renk (Ana renge yardımcı, kontrast oluşturan)
SurfaceColor: Yüzey Rengi (Kartlar, paneller için arka plan)
BackgroundColor: Arka Plan Rengi
ErrorColor: Hata Rengi (Genellikle kırmızı tonları)
OnPrimary / OnSecondary: Üzerine Gelen Renk (Primary renk üzerine yazı/ikon koyarken kullanılacak kontrast renk)
```
