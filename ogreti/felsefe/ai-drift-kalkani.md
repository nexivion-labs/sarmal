---
kod: FEL-2
baslik: "Sarmal = Drift Kalkanı + Kalıcı Hafıza"
ne: "Doğal dil ile ürün arasındaki niyeti denetlenebilir ve kalıcı bir grafa bağlar"
tur: felsefe
durum: güncel
guncellendi: 2026-08-03
---

# Sarmal = Drift Kalkanı + Kalıcı Hafıza

## Neden arada bir niyet dili var?

Doğal dilden doğrudan ürüne geçildiğinde görev, sınır ve kabul ölçütü yorum sırasında
sessizce değişebilir. Sarmal araya denetlenebilir bir niyet kaynağı koyar: insan isteğini
`.sar` grafında açıklar, motor bu grafı kurallara vurur, yürütücü yalnız doğrulanmış bağlamı
alır. Yanlış yorum ürünün içine yerleşmeden tanı yüzünde görünür.

## Kenarlar kalıcı hafızadır

Adımın görev, kabul, sınır, bağımlı, referans ve üretir bağları aynı konide buluşur.
ŞEF bu grafı izleyerek Etmen için gerekli bağlamı deterministik biçimde toplar. Hafıza bir
oturumun hatırlamasına değil, çözülen kimlik ve kenarlara dayanır; bu yüzden tekrar koşumda
aynı kaynak aynı bağlamı verir.

## Tek anayasa, simetrik zorlama

Anayasa ve kurallar tek kaynakta yaşar. İnsan, Etmen ve araç aynı hükümlerle sınanır;
kişiye veya yürütücüye özel ikinci bir kural defteri kurulmaz. Açık/gizli bağımlılık sınırı
STR-3.2'de, tanı sözleşmesi YAS-3'te, tek-kaynak/çok-yüz ilişkisi YUZ-1'de tanımlanır.

## Disk de grafın bir yüzüdür

`.sar` ağacı niyeti, disk ağacı gerçekleşen yapıyı gösterir. İskelet üretimi kaynaktan
diske gider; denetim diskten kaynağa mutabakat kurar. Bildirilmeyen, yanlış yerde duran ya
da iki kez sahiplenilen yapı böylece sıradan bir dosya ayrıntısı değil, ölçülebilir drift olur.

Özetle Sarmal, niyeti açık yazar, bağlamı kenarlardan kurar ve aynı kuralı bütün okurlara
uygular. İlgili açıklamalar: [dil bağımsızlığı](neden-dil-bagimsiz.md) ve
[makine hakem](fel-4-makine-hakem.md); kanonik hükümler yalnız `yasa/kanon/` altındadır.
