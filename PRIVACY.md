# Gizlilik Politikası · Privacy Policy

**Yürürlük tarihi:** 2026-08-23 · **Effective date:** 2026-08-23

---

## Türkçe

### Kısa cevap

Sarmal hiçbir veri toplamaz. Motor sizin makinenizde koşar, planınız makinenizden
çıkmaz ve eklenti hiçbir sunucuya bağlanmaz. Hesap açmanız gerekmez, kimlik
vermeniz gerekmez ve kullanım istatistiği toplanmaz.

### Hangi veri toplanır

Hiçbiri. Sarmal eklentisi ve Sarmal MCP sunucusu şunların hiçbirini toplamaz:
kişisel bilgi, dosya içeriği, dosya adı, proje adı, kaynak kod, kullanım
istatistiği, hata raporu, cihaz kimliği ve ağ adresi.

### Bu iddia nasıl ölçüldü

İddia beyan değil ölçümdür ve ölçüm 2026-08-23 tarihinde yayımlanan paket
üzerinde yapılmıştır. Paketlenmiş eklenti gövdesinde hiçbir ağ istemcisi
bulunmamaktadır; gövde bir tane bile süreç çağırma kaydı taşımaz ve içindeki tek
adresler, gömülü sözdizimi tablolarının içinde metin olarak duran belge
bağlantılarıdır. Eklentinin çalışma zamanı bağımlılığı listesi boştur, yani
kurulum sırasında paket bildirimine kayıtlı ayrı bir üçüncü taraf paketi
indirilmez; buna karşılık derlenmiş eklenti gövdesine esbuild tarafından yedi
açık kaynak kitaplığın (highlight.js, markdown-it, linkify-it, mdurl,
entities, punycode.js, uc.micro) kaynak kodu gömülüdür ve bu kod kurulumla
birlikte makinenize inmektedir. Bu kitaplıkların hiçbiri ağ istemcisi
içermez, süreç çağırmaz ve veri toplamaz; sürüm, telif sahibi ve lisans
bilgileri tam olarak `NOTICE.md` dosyasında ve paketle birlikte giden
`eklenti/LICENSE.md` dosyasında beyan edilmiştir. Aynı ölçümü siz de
yapabilirsiniz: paketin içindeki tek gövde dosyasında bir ağ istemcisi ya da
süreç çağrısı arayın; gömülü kitaplıkların izlerini de aynı dosyada
`node_modules/<paket>/` biçimindeki yol dizelerini arayarak görebilirsiniz.

### Verileriniz nerede işlenir

Yalnız kendi makinenizde. Sarmal, açık `.sar` dosyalarınızı okur, planınızı
diskinizle karşılaştırır ve sonucu editörünüzün panellerinde gösterir. Bu işlem
tamamen yereldir; ne bir sunucuya istek gider ne de bir sonuç dışarıya yazılır.

### Üçüncü taraflarla paylaşım

Yoktur. Paylaşılacak bir veri toplanmadığı için paylaşım da yoktur.

### Saklama süresi

Sarmal hiçbir veriyi saklamaz. Ürettiği tek çıktı sizin kendi deponuzdaki
dosyalardır ve onların sahibi sizsiniz.

### Dürüst açıklama: depodaki tek dış bağlantı

Sarmal'ın kaynak deposunda bir dış model sağlayıcısına giden bir köprü dosyası
bulunmaktadır. Bu köprü yalnız geliştiricilerin kendi değerlendirme komutuyla
çalışır, bir anahtar verilmediğinde hiçbir şey yapmaz ve **yayımlanan eklenti
paketine girmez**. Ölçüm bunu göstermektedir: paketin dosya listesinde köprü
dosyası yoktur ve paketlenmiş gövde köprüye ait tek bir satır taşımaz. Bu
paragraf, "hiçbir ağ çağrısı yok" cümlesinin arkasındaki tek nüansı gizlememek
için yazılmıştır.

### İletişim

Gizlilikle ilgili her soru için: <fatih@nexivionlabs.io>

### Bu politika değişirse

Değişiklik bu dosyanın kendisine yazılır ve deponun geçmişinde görünür. Sarmal
sizin veriniz hakkındaki hükmünü sessizce değiştiremez, çünkü bu dosya deponun
kök yüzeyleri arasında ilan edilmiştir ve bir nöbet onun yerinde durduğunu her
işlemede denetler.

---

## English

### Short answer

Sarmal collects no data. The engine runs on your machine, your plan never leaves
it, and the extension connects to no server. No account is required, no identity
is requested, and no usage statistics are gathered.

### What data is collected

None. Neither the Sarmal extension nor the Sarmal MCP server collects any of the
following: personal information, file contents, file names, project names, source
code, usage statistics, crash reports, device identifiers, or network addresses.

### How this claim was measured

The claim is a measurement, not an assertion, and it was taken on 2026-08-23
against the published package. The packaged extension bundle contains no network
client whatsoever; it carries not a single process-spawning call, and the only
addresses inside it are documentation links sitting as plain text within embedded
syntax tables. The extension's runtime dependency list is empty, so installing it
does not download any separate third-party package listed in the manifest;
however, the source code of seven open-source libraries (highlight.js,
markdown-it, linkify-it, mdurl, entities, punycode.js, uc.micro) is embedded by
esbuild into the compiled extension bundle, and that code does land on your
machine at install time. None of these libraries contains a network client,
spawns a process, or collects data; their versions, copyright holders, and
license terms are declared in full in `NOTICE.md` and in the shipped
`eklenti/LICENSE.md`. You can repeat this measurement yourself: search the
single bundle file inside the package for a network client or a process call;
you can also see the traces of the embedded libraries by searching the same
file for path strings shaped like `node_modules/<package>/`.

### Where your data is processed

Only on your own machine. Sarmal reads the `.sar` files you have open, compares
your plan against your disk, and shows the result in your editor's panels. The
whole operation is local; no request leaves and no result is written outward.

### Sharing with third parties

None. No data is collected, so there is nothing to share.

### Retention

Sarmal retains nothing. Its only output is the files in your own repository, and
you own those.

### Honest disclosure: the one outbound bridge in the repository

Sarmal's source repository contains a bridge file that talks to an external model
provider. That bridge runs only under the maintainers' own evaluation command,
does nothing without a key, and **is not included in the published extension
package**. The measurement shows this: the package file listing contains no
bridge file, and the packaged bundle carries not one line belonging to it. This
paragraph exists so that the single nuance behind "no network calls" is not
hidden.

### Contact

For any privacy question: <fatih@nexivionlabs.io>

### If this policy changes

Any change is written into this file and becomes visible in the repository's
history. Sarmal cannot quietly change its ruling about your data, because this
file is declared among the repository's root surfaces and a guard verifies that
it is in place on every commit.
