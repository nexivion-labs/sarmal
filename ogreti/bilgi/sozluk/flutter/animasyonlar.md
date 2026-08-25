---
kod: BLG-SOZLUK-ANM
baslik: "Flutter→Türkçe Sözlük — Animasyonlar"
ne: "Flutter animasyon sistemi terimleri (Controller, Curve, Tween, Transition, Physics) Türkçe karşılıkları"
tur: referans
durum: güncel
kaynak: Founder
guncellendi: 2026-07-01
---

# 🎬 Flutter → Türkçe — Animasyonlar

```
==================== ANİMASYONLAR (ANIMATIONS) - TÜM DETAYLAR ==================

Animation: Animasyon (Değerlerin zaman içinde değişimini temsil eden soyut sınıf)
AnimationController: Animasyon Denetleyicisi (Animasyonu başlatan, durduran, ilerleten yönetici)
Ticker: Zamanlayıcı / Tick Üreteci (Her ekran yenilemede sinyal gönderir, animasyonu ilerletir)
TickerProvider: Tick Sağlayıcı (Ticker oluşturan yapı, State'e mixin eklenir)
  - SingleTickerProviderStateMixin: Tek Denetleyici Sağlayıcı (En sık kullanılan)
  - TickerProviderStateMixin: Çoklu Denetleyici Sağlayıcı (Birden fazla controller için)
AnimationStatus: Animasyon Durumu (Animasyonun anlık halini belirtir)
  - AnimationStatus.dismissed: Başlangıçta (0.0 değerinde, başlamadı)
  - AnimationStatus.forward: İleri Gidiyor (0.0'dan 1.0'a)
  - AnimationStatus.reverse: Geri Gidiyor (1.0'dan 0.0'a)
  - AnimationStatus.completed: Tamamlandı (1.0 değerinde, bitti)
Curve: Eğri (Animasyon hızını belirler; yavaş başlayıp hızlanma vb.)
  - Curves.linear: Doğrusal (Sabit hız)
  - Curves.easeIn: Yavaş Başlayıp Hızlanma
  - Curves.easeOut: Hızlı Başlayıp Yavaşlama
  - Curves.easeInOut: Yavaş Başla, Ortada Hızlan, Sonda Yavaşla
  - Curves.bounceIn: Zıplayarak Başlama
  - Curves.bounceOut: Zıplayarak Bitiş
  - Curves.elasticIn: Esnek Başlama (Yay gibi)
  - Curves.elasticOut: Esnek Bitiş
  - Curves.fastOutSlowIn: Hızlı Çıkış Yavaş Giriş (Material Design standart)
Tween: Ara Değer (Başlangıç ve bitiş değeri arasında geçiş yapar; int, double, color, size vb.)
  - ColorTween: Renk Ara Değer
  - SizeTween: Boyut Ara Değer
  - RectTween: Dikdörtgen Ara Değer
  - IntTween: Tam Sayı Ara Değer
  - ConstantTween: Sabit Ara Değer (Değişmeyen)
TweenSequence: Ardışık Ara Değer (Birden çok Tween'i sırayla oynatmak için)
Interval: Aralık (Animasyonun genel süresi içinde hangi yüzdelik dilimde başlayıp biteceğini belirtir)
Reverse: Tersine Çevirme (Animasyonu tersten oynatma)
Repeat: Tekrarlama (Animasyonu belirli sayıda veya sonsuz tekrarlama)
Mirror: Aynalama (Animasyonu ileri ve geri sürekli oynatma, repeat ile karıştırılmamalı)
Forward: İleri Oynat (0'dan 1'e)
Stop: Durdur (Animasyonu olduğu yerde durdurur)
Reset: Sıfırla (Animasyonu dismissed (0.0) durumuna getirir)
addListener: Dinleyici Ekle (Animasyonun her değer değişiminde tetiklenen fonksiyon)
addStatusListener: Durum Dinleyicisi Ekle (Animasyon durumu değiştiğinde tetiklenir - başladı, bitti vb.)
removeListener: Dinleyici Kaldır (Bellek sızıntısını önlemek için dispose'da çağrılır)
Dispose: Yok Et / Temizle (Controller'ı bellekten atmak için zorunlu işlem)

--- ANİMASYON TÜRLERİ (Örtülü vs Açık) ---
Implicit Animation (Örtülü Animasyon): Otomatik animasyon (Değişken değerini değiştir, Flutter aradaki geçişi halleder)
  - AnimatedContainer: Otomatik Geçişli Kapsayıcı (Renk, boyut, kenar değişince animasyon)
  - AnimatedOpacity: Otomatik Geçişli Saydamlık
  - AnimatedPadding: Otomatik Geçişli Boşluk
  - AnimatedPositioned: Otomatik Geçişli Konum (Stack içinde yer değiştirme)
  - AnimatedAlign: Otomatik Geçişli Hizalama
  - AnimatedDefaultTextStyle: Otomatik Geçişli Metin Stili
  - AnimatedDecoratedBox: Otomatik Geçişli Dekorasyon
  - AnimatedSwitcher: Otomatik Geçişli Değiştirici (İki farklı widget arasındaki geçişi animasyonla yapar)
  - AnimatedCrossFade: Otomatik Çapraz Geçiş (İki widget arasında yumuşak geçiş)
  - AnimatedList / AnimatedGrid: Animasyonlu Liste / Izgara (Ekleme/çıkarma animasyonlu)

Explicit Animation (Açık / Elle Yönetilen Animasyon): AnimationController ile manuel kontrol edilen animasyonlar
  - FadeTransition: Solma Geçişi (Controller ile yönetilen saydamlık)
  - ScaleTransition: Ölçek Geçişi (Büyüme/küçülme)
  - SizeTransition: Boyut Geçişi (Yükseklik/genişlik animasyonu)
  - SlideTransition: Kayma Geçişi (X/Y ekseninde hareket)
  - RotationTransition: Döndürme Geçişi (Açısal dönüş)
  - PositionedTransition: Konum Geçişi (Stack içinde konum değiştirme)
  - DecoratedBoxTransition: Dekorasyon Geçişi (Renk/gradyan değişimi)
  - AlignTransition: Hizalama Geçişi

--- FİZİK TABANLI ANİMASYONLAR (Physical / Simulation) ---
SpringSimulation: Yay Simülasyonu (Fizik kurallarına göre yay gibi sallanan animasyon)
  - springMass: Yay Kütlesi
  - springStiffness: Yay Sertliği (Ne kadar sert sallanacağı)
  - springDamping: Yay Sönümlemesi (Sallantının ne kadar çabuk duracağı)
FrictionSimulation: Sürtünme Simülasyonu (Kayarak duran animasyon)
BouncingScrollPhysics: Zıplayan Kaydırma Fiziği (Liste sonuna gelince zıplayan efekt)
ClampingScrollPhysics: Sıkıştıran Kaydırma Fiziği (Sert, kenara vurup duran)

--- ÖZEL ANİMASYON YAPILARI ---
Hero: Kahraman Animasyonu (Bir sayfadaki resim/butonun başka sayfaya taşınırken yaptığı akıcı geçiş)
HeroTag: Kahraman Etiketi (Hangi Hero'nun birbirine bağlanacağını belirten eşsiz anahtar)
Staggered Animation: Kademeli Animasyon (Birden çok animasyonun ardışık ve üst üste binmiş şekilde oynatılması)
SharedAxisTransition: Paylaşımlı Eksen Geçişi (Sayfa geçişlerinde eksen kaydırmalı animasyon)
CustomPainter: Özel Çizici (Canvas üzerinde sıfırdan çizim yapmak, animasyonlu çizimler için)
CustomTransition: Özel Geçiş (Kendi animasyon kurallarınızı yazmak için)
TweenAnimationBuilder: Ara Değer Oluşturucu (Herhangi bir widget'a özel tween değeri bağlamak için)
TransitionBuilder: Geçiş Oluşturucu (Animatör ile widget ağacını yeniden oluşturur)
```
