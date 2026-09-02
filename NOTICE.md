Sarmal
Copyright 2026 Nexivion Labs

This product includes software developed at Nexivion Labs (https://nexivionlabs.io).

Sarmal is licensed under the Apache License, Version 2.0; see LICENSE.md.
The third-party assets listed below are distributed under their own terms.

---

# Üçüncü Taraf Bildirimleri · Third-Party Notices

Bu depo aşağıdaki üçüncü taraf varlığı yeniden dağıtır. Her varlığın sahibi,
lisansı ve depodaki yeri burada beyan edilir.

> **Paketle birlikte giden nüsha.** Yazı tipi eklentinin paketiyle dağıtıldığı
> için atfın da o paketle birlikte gitmesi gerekir; paketlenen nüsha
> `eklenti/LICENSE.md` dosyasının üçüncü taraf bölümünde yaşar. İki metnin
> ayrışmaması bir nöbetle zorlanır (`eklenti/sinama/atif.test.ts`).

## Codicons (yazı tipi)

- **Depodaki dosya:** `eklenti/temalar/yildiz.ttf`
- **Eser:** Codicons simge yazı tipi (`codicon.ttf`)
- **Sahip:** Microsoft Corporation — https://github.com/microsoft/vscode-codicons
- **Lisans:** Creative Commons Attribution 4.0 International (CC BY 4.0)
  — https://creativecommons.org/licenses/by/4.0/
- **Değişiklik beyanı:** Dosya bu depoya `yildiz.ttf` adıyla alınmıştır. Bu
  depoda içeriğine bilinçli hiçbir değişiklik yapılmamıştır.

### Ölçüm (2026-08-22)

Beyanın dayanağı dosyanın kendi künyesinden okunmuştur: iç aile adı `codicon`,
sürüm dizesi `Version 1.15`, glif sayısı **603**, boyut **140.820 bayt**,
sha256 özetinin ilk on altı basamağı `229cbc7617bc2aa6`.

Aynı ölçüm bu makinede bulunan altı Visual Studio Code derlemesinin taşıdığı
`codicon.ttf` kopyalarına da uygulandı ve şu sonucu verdi: dört kopya 604 glif
ve 140.956 bayt, bir kopya 636 glif, bir kopya 638 glif taşımaktadır. Yani
depodaki dosya bu makinedeki hiçbir yürütücü kopyasıyla bayt düzeyinde aynı
değildir ve en yakınından bir glif eksiktir. Bunun beklenen açıklaması şudur:
Codicons dosyası sürümden sürüme büyür, buna karşılık içindeki sürüm dizesi
uzun süredir `Version 1.15` olarak sabit kalmaktadır; dolayısıyla iki dosyanın
sürüm dizesinin aynı olması onların aynı yayın olduğunu göstermez.

Ölçülmeyen şey açıkça beyan edilir: dosya, üst akıştaki karşılık gelen yayının
ikilisiyle karşılaştırılmamıştır, çünkü bu ölçüm ağ erişimi ister ve bu turda
yapılmamıştır. Bu sebeple beyan, dosyanın alındığı gibi durduğu ve bu depoda
değiştirilmediği yönündedir; hangi üst akış yayınından alındığı ise açık bir
borç olarak kalır ve yayın öncesinde kesinleştirilmelidir.

## Derlenmiş eklenti gövdesine gömülü npm kitaplıkları

- **Depodaki dosya:** `eklenti/dist/eklenti.js` (esbuild ile derlenmiş, küçültülmüş gövde)
- **Durum:** Aşağıdaki yedi kitaplığın kaynak kodu bu gövdeye esbuild tarafından
  gömülmüştür. Hiçbiri çalışma zamanı bağımlılığı olarak ayrı bir dosya hâlinde
  paketlenmez; doğrudan derlenmiş gövdenin içinde yaşar ve paket kurulduğunda
  kullanıcının makinesine iner.

### Ölçüm (2026-08-23)

Ölçüm `eklenti/dist/eklenti.js` dosyası üzerinde iki yöntemle yapılmıştır.
İlk yöntem, esbuild'in gövdeye bıraktığı kaynak dosya yolu izlerinin sayımıdır
(`node_modules/<paket>/...` biçimindeki dizeler): highlight.js için **398**,
markdown-it için **56**, linkify-it için **2**, mdurl için **9**, entities için
**9**, punycode.js için **13**, uc.micro için **7** iz sayılmıştır. İkinci
yöntem, her paketin kaynak dosyasına ait tam yol dizesinin gövdede birebir en
az bir kez geçtiğinin doğrulanmasıdır; şu dizeler gövdede birebir bulunmuştur:
`node_modules/highlight.js/lib/core.js`,
`node_modules/markdown-it/lib/helpers/index.mjs`,
`node_modules/linkify-it/index.mjs`, `node_modules/mdurl/lib/parse.mjs`,
`node_modules/entities/lib/esm/decode.js`,
`node_modules/punycode.js/punycode.js` ve
`node_modules/uc.micro/categories/Cc/regex.mjs`. Ayrıca gövdede
`import_punycode.default.toASCII` ve `import_punycode.default.toUnicode`
çağrıları bulunmaktadır; bu, punycode.js'in mdurl'ün `.parse()` işlevi
tarafından çalışma zamanında fiilen kullanıldığını, yalnız gövdede atıl
durduğunu değil, göstermektedir.

Gövdede geçen "copyright" sözcüğü yalnız iki kez bulunmaktadır ve ikisi de veri
niteliğindedir, bir telif bildirimi değildir: biri highlight.js'in Erlang dil
tanımı içindeki `-copyright` sözdizim anahtar kelimesi listesinin bir öğesidir,
diğeri bir istatistik dili sözcük tamamlama listesi içindeki "copyright"
girişidir. Bu, üst akış paketlerinin kendi `LICENSE` dosyalarındaki telif
bildirimlerinin küçültme sırasında gövdeye taşınmadığını doğrulamaktadır; atıf
bu nedenle bu belgede ve pakedin kendisiyle giden `eklenti/LICENSE.md`
dosyasında ayrıca sağlanmaktadır.

Her paketin sürüm ve lisans alanı, depodaki `node_modules/<paket>/package.json`
dosyasının kendi `version` ve `license` alanından okunmuştur; telif satırları
da paketin kendi `LICENSE` dosyasından birebir alınmıştır, uydurulmamıştır.

#### highlight.js 11.11.1 — BSD 3-Clause License

- **Telif sahibi:** Ivan Sagalaev
- **Telif satırı (birebir):** "Copyright (c) 2006, Ivan Sagalaev. All rights reserved."
- **Kaynak:** https://github.com/highlightjs/highlight.js
- **Lisansın tam metni:** paketin kendi `LICENSE` dosyası —
  https://github.com/highlightjs/highlight.js/blob/11.11.1/LICENSE (ayrıca
  kanonik metin: https://opensource.org/license/bsd-3-clause)
- **Dağıtım beyanı:** Kaynak kodu değiştirilmeden `eklenti/dist/eklenti.js`
  gövdesine esbuild ile gömülü olarak dağıtılmaktadır.

#### markdown-it 14.3.0 — MIT License

- **Telif sahibi:** Vitaly Puzrin, Alex Kocharin
- **Telif satırı (birebir):** "Copyright (c) 2014 Vitaly Puzrin, Alex Kocharin."
- **Kaynak:** https://github.com/markdown-it/markdown-it
- **Lisansın tam metni:** paketin kendi `LICENSE` dosyası —
  https://github.com/markdown-it/markdown-it/blob/14.3.0/LICENSE (ayrıca
  kanonik metin: https://opensource.org/license/mit)
- **Dağıtım beyanı:** Kaynak kodu değiştirilmeden `eklenti/dist/eklenti.js`
  gövdesine esbuild ile gömülü olarak dağıtılmaktadır.

#### linkify-it 5.0.2 — MIT License

- **Telif sahibi:** Vitaly Puzrin
- **Telif satırı (birebir):** "Copyright (c) 2015 Vitaly Puzrin."
- **Kaynak:** https://github.com/markdown-it/linkify-it
- **Lisansın tam metni:** paketin kendi `LICENSE` dosyası —
  https://github.com/markdown-it/linkify-it/blob/5.0.2/LICENSE (ayrıca
  kanonik metin: https://opensource.org/license/mit)
- **Dağıtım beyanı:** Kaynak kodu değiştirilmeden `eklenti/dist/eklenti.js`
  gövdesine esbuild ile gömülü olarak dağıtılmaktadır.

#### mdurl 2.0.0 — MIT License

- **Telif sahibi:** Vitaly Puzrin, Alex Kocharin; ayrıca `.parse()` işlevi
  Joyent'in node.js `url` koduna dayandığı için Joyent, Inc. ve diğer Node
  katkıcıları da paketin kendi LICENSE dosyasında ayrı bir telif sahibi olarak
  anılmaktadır.
- **Telif satırı (birebir):** "Copyright (c) 2015 Vitaly Puzrin, Alex Kocharin."
- **Ek telif satırı (.parse() için, birebir):** "Copyright Joyent, Inc. and
  other Node contributors. All rights reserved."
- **Kaynak:** https://github.com/markdown-it/mdurl
- **Lisansın tam metni:** paketin kendi `LICENSE` dosyası —
  https://github.com/markdown-it/mdurl/blob/2.0.0/LICENSE (ayrıca kanonik
  metin: https://opensource.org/license/mit)
- **Dağıtım beyanı:** Kaynak kodu değiştirilmeden `eklenti/dist/eklenti.js`
  gövdesine esbuild ile gömülü olarak dağıtılmaktadır.

#### entities 4.5.0 — BSD 2-Clause License

- **Telif sahibi:** Felix Böhm
- **Telif satırı (birebir):** "Copyright (c) Felix Böhm All rights reserved."
- **Kaynak:** https://github.com/fb55/entities
- **Lisansın tam metni:** paketin kendi `LICENSE` dosyası —
  https://github.com/fb55/entities/blob/v4.5.0/LICENSE (ayrıca kanonik metin:
  https://opensource.org/license/bsd-2-clause)
- **Dağıtım beyanı:** Kaynak kodu değiştirilmeden `eklenti/dist/eklenti.js`
  gövdesine esbuild ile gömülü olarak dağıtılmaktadır.

#### punycode.js 2.3.1 — MIT License

- **Telif sahibi:** Mathias Bynens
- **Telif satırı (birebir):** "Copyright Mathias Bynens <https://mathiasbynens.be/>"
- **Kaynak:** https://github.com/mathiasbynens/punycode.js
- **Lisansın tam metni:** paketin kendi `LICENSE-MIT.txt` dosyası —
  https://github.com/mathiasbynens/punycode.js/blob/v2.3.1/LICENSE-MIT.txt
  (ayrıca kanonik metin: https://opensource.org/license/mit)
- **Dağıtım beyanı:** Kaynak kodu değiştirilmeden `eklenti/dist/eklenti.js`
  gövdesine esbuild ile gömülü olarak dağıtılmaktadır; mdurl'ün `.parse()`
  işlevi tarafından çalışma zamanında fiilen çağrılmaktadır.

#### uc.micro 2.1.0 — MIT License

- **Telif sahibi:** Mathias Bynens (paketin kendi `LICENSE.txt` dosyasında
  yazan sahip budur; bu ölçülmüştür, yorumlanmamıştır — paket markdown-it
  kuruluşu altında yayımlanmaktadır fakat lisans dosyasındaki telif satırı
  değiştirilmemiş olarak durmaktadır)
- **Telif satırı (birebir):** "Copyright Mathias Bynens <https://mathiasbynens.be/>"
- **Kaynak:** https://github.com/markdown-it/uc.micro
- **Lisansın tam metni:** paketin kendi `LICENSE.txt` dosyası —
  https://github.com/markdown-it/uc.micro/blob/2.1.0/LICENSE.txt (ayrıca
  kanonik metin: https://opensource.org/license/mit)
- **Dağıtım beyanı:** Kaynak kodu değiştirilmeden `eklenti/dist/eklenti.js`
  gövdesine esbuild ile gömülü olarak dağıtılmaktadır.

---

This repository redistributes the following third-party asset.

> **The copy that ships.** The font is distributed inside the extension package,
> so the attribution must travel with it; the shipped copy lives in the
> third-party section of `eklenti/LICENSE.md`. A guard test keeps the two texts
> from drifting apart (`eklenti/sinama/atif.test.ts`).

## Codicons (font)

- **File in this repository:** `eklenti/temalar/yildiz.ttf`
- **Work:** Codicons icon font (`codicon.ttf`)
- **Owner:** Microsoft Corporation — https://github.com/microsoft/vscode-codicons
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
  — https://creativecommons.org/licenses/by/4.0/
- **Statement of changes:** The file was taken into this repository under the
  name `yildiz.ttf`. No content modification was made to it here.

### Measurement (2026-08-22)

The statement rests on the file's own metadata: internal family name `codicon`,
version string `Version 1.15`, glyph count **603**, size **140,820 bytes**,
first sixteen digits of the sha256 digest `229cbc7617bc2aa6`.

The same measurement was applied to the `codicon.ttf` copies shipped with six
Visual Studio Code builds present on this machine: four carry 604 glyphs and
140,956 bytes, one carries 636 glyphs, one carries 638. The file in this
repository is therefore not byte-identical to any editor copy on this machine
and is one glyph short of the closest one. The expected explanation is that
Codicons grows from release to release while its internal version string has
long remained `Version 1.15`; an identical version string is therefore not
evidence that two files are the same release.

What was not measured is stated plainly: the file was not compared against the
binary of the corresponding upstream release, because that comparison requires
network access and was not performed in this round. The statement is thus that
the file stands as received and was not modified here; which upstream release
it came from remains an open debt to be settled before publication.

## npm libraries embedded in the compiled extension bundle

- **File in this repository:** `eklenti/dist/eklenti.js` (the esbuild-compiled,
  minified bundle)
- **Status:** The source code of the seven libraries below has been embedded
  into this bundle by esbuild. None of them ships as a separate file or as a
  runtime dependency listed in the package manifest; each lives directly
  inside the compiled bundle and lands on the user's machine at install time.

### Measurement (2026-08-23)

The measurement was performed on `eklenti/dist/eklenti.js` using two methods.
The first counts the source-path traces esbuild leaves in the bundle (strings
shaped like `node_modules/<package>/...`): **398** for highlight.js, **56**
for markdown-it, **2** for linkify-it, **9** for mdurl, **9** for entities,
**13** for punycode.js, **7** for uc.micro. The second confirms that each
package's own source-file path string appears verbatim at least once in the
bundle; the following strings were found verbatim:
`node_modules/highlight.js/lib/core.js`,
`node_modules/markdown-it/lib/helpers/index.mjs`,
`node_modules/linkify-it/index.mjs`, `node_modules/mdurl/lib/parse.mjs`,
`node_modules/entities/lib/esm/decode.js`,
`node_modules/punycode.js/punycode.js`, and
`node_modules/uc.micro/categories/Cc/regex.mjs`. The bundle also contains the
calls `import_punycode.default.toASCII` and
`import_punycode.default.toUnicode`, which shows that punycode.js is actually
invoked at runtime by mdurl's `.parse()` function, not merely sitting inert in
the bundle.

The word "copyright" occurs only twice in the bundle, and both occurrences are
data, not a license notice: one is an entry in the `-copyright` syntax-keyword
list of highlight.js's Erlang language definition, the other is the word
"copyright" inside a statistical-language word-completion list. This confirms
that the upstream packages' own copyright notices from their `LICENSE` files
were not carried into the bundle during minification; attribution is therefore
provided separately in this document and in `eklenti/LICENSE.md`, the copy
that ships with the package.

Each package's version and license field was read from its own
`node_modules/<package>/package.json`, and each copyright line was taken
verbatim from the package's own `LICENSE` file rather than invented.

#### highlight.js 11.11.1 — BSD 3-Clause License

- **Copyright holder:** Ivan Sagalaev
- **Copyright line (verbatim):** "Copyright (c) 2006, Ivan Sagalaev. All rights reserved."
- **Source:** https://github.com/highlightjs/highlight.js
- **Full license text:** the package's own `LICENSE` file —
  https://github.com/highlightjs/highlight.js/blob/11.11.1/LICENSE (canonical
  text also at https://opensource.org/license/bsd-3-clause)
- **Distribution statement:** The source is embedded, unmodified, into the
  `eklenti/dist/eklenti.js` bundle by esbuild.

#### markdown-it 14.3.0 — MIT License

- **Copyright holder:** Vitaly Puzrin, Alex Kocharin
- **Copyright line (verbatim):** "Copyright (c) 2014 Vitaly Puzrin, Alex Kocharin."
- **Source:** https://github.com/markdown-it/markdown-it
- **Full license text:** the package's own `LICENSE` file —
  https://github.com/markdown-it/markdown-it/blob/14.3.0/LICENSE (canonical
  text also at https://opensource.org/license/mit)
- **Distribution statement:** The source is embedded, unmodified, into the
  `eklenti/dist/eklenti.js` bundle by esbuild.

#### linkify-it 5.0.2 — MIT License

- **Copyright holder:** Vitaly Puzrin
- **Copyright line (verbatim):** "Copyright (c) 2015 Vitaly Puzrin."
- **Source:** https://github.com/markdown-it/linkify-it
- **Full license text:** the package's own `LICENSE` file —
  https://github.com/markdown-it/linkify-it/blob/5.0.2/LICENSE (canonical
  text also at https://opensource.org/license/mit)
- **Distribution statement:** The source is embedded, unmodified, into the
  `eklenti/dist/eklenti.js` bundle by esbuild.

#### mdurl 2.0.0 — MIT License

- **Copyright holder:** Vitaly Puzrin, Alex Kocharin; the package's own
  LICENSE file also credits Joyent, Inc. and other Node contributors
  separately, because the `.parse()` function is based on Joyent's node.js
  `url` code.
- **Copyright line (verbatim):** "Copyright (c) 2015 Vitaly Puzrin, Alex Kocharin."
- **Additional copyright line (for .parse(), verbatim):** "Copyright Joyent,
  Inc. and other Node contributors. All rights reserved."
- **Source:** https://github.com/markdown-it/mdurl
- **Full license text:** the package's own `LICENSE` file —
  https://github.com/markdown-it/mdurl/blob/2.0.0/LICENSE (canonical text also
  at https://opensource.org/license/mit)
- **Distribution statement:** The source is embedded, unmodified, into the
  `eklenti/dist/eklenti.js` bundle by esbuild.

#### entities 4.5.0 — BSD 2-Clause License

- **Copyright holder:** Felix Böhm
- **Copyright line (verbatim):** "Copyright (c) Felix Böhm All rights reserved."
- **Source:** https://github.com/fb55/entities
- **Full license text:** the package's own `LICENSE` file —
  https://github.com/fb55/entities/blob/v4.5.0/LICENSE (canonical text also at
  https://opensource.org/license/bsd-2-clause)
- **Distribution statement:** The source is embedded, unmodified, into the
  `eklenti/dist/eklenti.js` bundle by esbuild.

#### punycode.js 2.3.1 — MIT License

- **Copyright holder:** Mathias Bynens
- **Copyright line (verbatim):** "Copyright Mathias Bynens <https://mathiasbynens.be/>"
- **Source:** https://github.com/mathiasbynens/punycode.js
- **Full license text:** the package's own `LICENSE-MIT.txt` file —
  https://github.com/mathiasbynens/punycode.js/blob/v2.3.1/LICENSE-MIT.txt
  (canonical text also at https://opensource.org/license/mit)
- **Distribution statement:** The source is embedded, unmodified, into the
  `eklenti/dist/eklenti.js` bundle by esbuild, and is actually invoked at
  runtime by mdurl's `.parse()` function.

#### uc.micro 2.1.0 — MIT License

- **Copyright holder:** Mathias Bynens (this is the owner named in the
  package's own `LICENSE.txt`; this is measured, not interpreted — the
  package is published under the markdown-it organization, but the copyright
  line in its license file stands unchanged)
- **Copyright line (verbatim):** "Copyright Mathias Bynens <https://mathiasbynens.be/>"
- **Source:** https://github.com/markdown-it/uc.micro
- **Full license text:** the package's own `LICENSE.txt` file —
  https://github.com/markdown-it/uc.micro/blob/2.1.0/LICENSE.txt (canonical
  text also at https://opensource.org/license/mit)
- **Distribution statement:** The source is embedded, unmodified, into the
  `eklenti/dist/eklenti.js` bundle by esbuild.
