# Lisans / License

Sarmal ve Sarmal eklentisi **Apache License 2.0** altında yayımlanır.
Kullanım, kopyalama, değiştirme ve dağıtım koşulları Apache-2.0 metnine tabidir.

SPDX-License-Identifier: Apache-2.0

Copyright 2026 Nexivion Labs

Apache License 2.0 metni: <https://www.apache.org/licenses/LICENSE-2.0>

---

Sarmal and the Sarmal extension are released under the **Apache License 2.0**.
Use, reproduction, modification, and distribution are governed by Apache-2.0.

SPDX-License-Identifier: Apache-2.0

Copyright 2026 Nexivion Labs

Apache License 2.0 text: <https://www.apache.org/licenses/LICENSE-2.0>

---

## Üçüncü taraf varlıklar · Third-party assets

Bu bölüm bilinçli olarak burada durur ve tekilleştirilmemelidir: yazı tipi bu
paketle birlikte dağıtıldığı için atfın da paketle birlikte gitmesi gerekir.
Deponun tam bildirimi ve ölçüm kaydı `NOTICE.md` dosyasındadır.

This section is deliberately kept here and must not be de-duplicated: the font
ships inside this package, so its attribution must ship with it. The repository's
full notice and measurement record live in `NOTICE.md`.

**Codicons** (`temalar/yildiz.ttf`) — © Microsoft Corporation,
<https://github.com/microsoft/vscode-codicons>, licensed under
Creative Commons Attribution 4.0 International (CC BY 4.0),
<https://creativecommons.org/licenses/by/4.0/>. Renamed to `yildiz.ttf`;
no content modification was made here.

## Derlenmiş gövdeye gömülü npm kitaplıkları · npm libraries embedded in the compiled bundle

Aşağıdaki yedi kitaplığın kaynak kodu `dist/eklenti.js` gövdesine esbuild
tarafından değiştirilmeden gömülmüştür; hiçbiri ayrı bir dosya olarak
paketlenmez, doğrudan gövdenin içinde bu paketle birlikte dağıtılır. Ölçüm
kaydı ve yöntemi `NOTICE.md` dosyasındadır.

The source code of the seven libraries below is embedded, unmodified, into
the `dist/eklenti.js` bundle by esbuild; none of them ships as a separate
file, each travels inside the bundle with this package. The measurement
record and method live in `NOTICE.md`.

- **highlight.js** 11.11.1 — © Ivan Sagalaev, "Copyright (c) 2006, Ivan Sagalaev. All rights reserved.", licensed under the BSD 3-Clause License, <https://github.com/highlightjs/highlight.js/blob/11.11.1/LICENSE> (canonical text also at <https://opensource.org/license/bsd-3-clause>). Embedded unmodified in `dist/eklenti.js`.
- **markdown-it** 14.3.0 — © Vitaly Puzrin, Alex Kocharin, "Copyright (c) 2014 Vitaly Puzrin, Alex Kocharin.", licensed under the MIT License, <https://github.com/markdown-it/markdown-it/blob/14.3.0/LICENSE> (canonical text also at <https://opensource.org/license/mit>). Embedded unmodified in `dist/eklenti.js`.
- **linkify-it** 5.0.2 — © Vitaly Puzrin, "Copyright (c) 2015 Vitaly Puzrin.", licensed under the MIT License, <https://github.com/markdown-it/linkify-it/blob/5.0.2/LICENSE> (canonical text also at <https://opensource.org/license/mit>). Embedded unmodified in `dist/eklenti.js`.
- **mdurl** 2.0.0 — © Vitaly Puzrin, Alex Kocharin, "Copyright (c) 2015 Vitaly Puzrin, Alex Kocharin."; the `.parse()` function is additionally based on Joyent's node.js `url` code, "Copyright Joyent, Inc. and other Node contributors. All rights reserved."; licensed under the MIT License, <https://github.com/markdown-it/mdurl/blob/2.0.0/LICENSE> (canonical text also at <https://opensource.org/license/mit>). Embedded unmodified in `dist/eklenti.js`.
- **entities** 4.5.0 — © Felix Böhm, "Copyright (c) Felix Böhm All rights reserved.", licensed under the BSD 2-Clause License, <https://github.com/fb55/entities/blob/v4.5.0/LICENSE> (canonical text also at <https://opensource.org/license/bsd-2-clause>). Embedded unmodified in `dist/eklenti.js`.
- **punycode.js** 2.3.1 — © Mathias Bynens, "Copyright Mathias Bynens <https://mathiasbynens.be/>", licensed under the MIT License, <https://github.com/mathiasbynens/punycode.js/blob/v2.3.1/LICENSE-MIT.txt> (canonical text also at <https://opensource.org/license/mit>). Embedded unmodified in `dist/eklenti.js`; invoked at runtime by mdurl's `.parse()`.
- **uc.micro** 2.1.0 — © Mathias Bynens (as named in the package's own
  `LICENSE.txt`), "Copyright Mathias Bynens <https://mathiasbynens.be/>",
  licensed under the MIT License,
  <https://github.com/markdown-it/uc.micro/blob/2.1.0/LICENSE.txt> (canonical
  text also at <https://opensource.org/license/mit>). Embedded unmodified in
  `dist/eklenti.js`.
