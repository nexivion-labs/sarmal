<!-- SARMAL:ELLE-KORUNAN:BAS -->
# Sarmal

[![kapı](https://github.com/nexivion-labs/sarmal/actions/workflows/kapi.yml/badge.svg)](https://github.com/nexivion-labs/sarmal/actions/workflows/kapi.yml)

## İNSAN MAKİNİST, AI HIZLI TREN, SARMAL HEDEFE SAPMADAN GÖTÜREN RAY

Sarmal, bir yazılım projesinin planını, kurallarını ve kararlarını `.sar` dosyalarında tutan açık kaynak bir dildir. Bu dosyalar insan için okunur, makine için denetlenebilir: motor her kaydetmede planı diskle karşılaştırır, VS Code eklentisi sonucu panellerde gösterir, MCP sunucusu aynı bilgiyi yapay zekâ ajanlarına verir. Sarmal kod üretmez; kodun neden ve hangi sırayla yazıldığını kaybolmaz hâle getirir.

## Hangi derdi çözüyor

Yapay zekâ ajanlarıyla çalışan bir projede plan sohbette kalır, karar bir önceki oturumun bağlamında kalır, kod plandan önde koşar ve üç hafta sonra kimse hangi işin neden yapıldığını söyleyemez. Ajan her oturuma sıfırdan başlar, insan bağlamı yeniden anlatır ve anlatılan şey her seferinde biraz değişir. Sorun ajanın zekâsı değil, projenin hafızasının makinenin okuyamadığı yerlerde durmasıdır.

Sarmal bu hafızayı tek bir kaynağa indirir. Plan dört eksende yazılır: zaman (Faz), iş (Blok), teknoloji (Katman) ve akış (Adım). Her Adım görevini, kabul ölçütünü, sınırını, dayandığı kararı ve ürettiği dosyayı beyan eder. Kararlar gerekçesiyle kaydedilir, kurallar tek bir kanonda toplanır ve motor bütün bu beyanları gerçekle karşılaştırır: ilan edilen dosya diskte var mı, tamamlandı denen iş kanıt taşıyor mu, atıf verilen karar gerçekten tanımlı mı, açılan klasör ilan edilmiş mi.

## Nasıl çalışıyor: gerçek bir örnek

Doğuş paketiyle doğan küçük bir projede şu Blok yazılmış olsun (`plan/randevu.sar`):

```sar
Blok( kod: BLK-RANDEVU-API, ad: "Randevu Ucu", mevsim: FAZ-RANDEVU-DOGUS,
  ne: "Randevu oluşturma ucunun yazımı" ) {
  Katman( kod: KAT-RANDEVU-ARKAYUZ, ad: "Arka Yüz", teknolojiBağımsız: "seçim kuruluş Adımında" ) {
    AltKatman( kod: ALT-RANDEVU-UC, ad: "Uç", departman: kodlama ) {
      Adım( kod: ADM-RANDEVU-01, ad: "Randevu ucu", durum: tamamlandı,
        görev: "POST /randevu ucunu yaz",
        kabul: [ "uç 201 döner" ],
        üretir: [ Meyve( kod: MYV-RANDEVU-UC, tür: Kod, dosya: "src/randevu.ts" ) ] )
      Adım( kod: ADM-RANDEVU-02, ad: "Randevu sınaması", durum: geliştirmede,
        bağımlı: [ ADM-RANDEVU-01 ], referans: [ KRR-RANDEVU-03 ],
        görev: "Ucun sınamasını yaz",
        kabul: [ "sınama yeşil" ] )
    }
  }
}
```

Birinci Adım tamamlandı diyor ama `src/randevu.ts` diskte yok; ikinci Adım hiç yazılmamış bir karara atıf veriyor. `sarmal denetle .` bunu şöyle bildirir (çıktı gerçektir, satırlar kırılmıştır):

```
✖ plan/randevu.sar:9:19 [meyve-dosyası-eksik] Meyve "MYV-RANDEVU-UC" (tür: Kod) dosya-zorunlu
  bir teslim ama beyan edilen yol diskte çözülmüyor ("src/randevu.ts").
✖ plan/randevu.sar:11:50 [kırık-referans] 'referans: KRR-RANDEVU-03' hedefi çözülmüyor —
  bu KOD hiçbir .sar'da tanımlı değil.
```

Dosya yazılıp atıf düzeltildiğinde motor bu kez başka bir şeyi fark eder: `src/` klasörü diskte var ama projenin giriş dosyasında ilan edilmemiştir.

```
✖ [beyansız-yapı] 'src/' diskte var ama randevu_anadizin.sar'da ilan edilmemiş — açılan her
  klasör giriş dosyasında bildirilmelidir; ilansız yapı zamanla plandan kopar.
```

Klasör ilan edilince karne temizdir: on altı düğüm, üç Adım, sıfır hata. Plan yalan söyleyemez, disk de; ikisi ayrıştığında bunu bir insanın fark etmesi gerekmez.

## Çalışma ağacı

Sarmal'da her şey bir ağaçtır ve ağacın kökü projenin giriş dosyasıdır. Doğuş paketiyle doğan bir proje diskte şöyle durur:

```
randevu/
├── randevu_anadizin.sar   giriş dosyası: Proje, Raflar, Teknoloji ve Takım burada ilan edilir
├── plan/                  Faz → Blok → Katman → AltKatman → Adım → Meyve → dosya
│   ├── ilk_plan.sar
│   └── randevu.sar
├── durum/durum_devir.sar  nerede kaldık: oturum sonu devir kaydı
├── ogrenme/               dersler ve geribildirim; Bellek buradan Beceriye yükselir
├── AGENTS.md              ajan yönergesi (CLAUDE.md ile bayt özdeş ikiz)
└── src/                   kod; diskte açılan her klasör giriş dosyasında ilan edilmek zorundadır
```

Mantık dört cümledir. Birincisi, yapı önce ilan edilir: giriş dosyası hangi klasörün ne için var olduğunu Raf olarak yazar ve ilansız klasör motor için drifttir. İkincisi, plan zamandan işe, işten teknolojiye, teknolojiden akışa iner: Faz bir mevsimdir, Blok tek kimlikli bir iş gövdesidir ve mevsimler arasında sürebilir, Katman bir Takıma ya da Teknolojiye bağlanır, AltKatman o teknolojinin içindeki konudur, Adım en küçük yürütme birimidir ve ürettiği Meyve diskte bir dosyaya çözülür. Üçüncüsü, her düğümün tekil bir kodu vardır ve düğümler yalnız kenarla bağlanır: `bağımlı` sırayı, `üretir` teslimi, `referans` dayanağı, `uygular` kuralı taşır; bir bağ tek yerde yazılır. Dördüncüsü, çalışma alanı birden çok projeyi kapsayabilir ve her proje kimliğini kendi kökünden türetir; bu depo da tam böyle yaşar: `is/` altındaki plan Sarmal'ın kendi ağacıdır.

## Ajanlar için ne değişiyor

Aynı dosyaları MCP sunucusu ajana on sekiz araçla açar. `sef` bir Adımın konisini, yani görevini, kabul ölçütünü, sınırını, dayanağını ve son koşu özetini tek istemde toplar; `gezin` bir kodun tanımını ve bütün atıflarını verir; `etki` bir düğüme dokununca hangi Adımların etkileneceğini söyler; `denetle-proje` bütün projenin hükmünü döndürür. Ajan dosya taramak yerine grafı sorar ve oturum değişince bağlam kaybolmaz, çünkü bağlam sohbette değil kaynaktadır. Üretici ile denetçi ayrıdır; bir Adımın kapanışı kanıt ister ve kanıt olmayan kapanışı motor gösterir.

## TEK TEKNOLOJİYLE, TEK AJANLA KÜÇÜK BİR PROJE YAPACAKSANIZ SARMAL SİZE TAVSİYE EDİLMEZ

Dürüst olalım: tek dilli, tek teknolojili, birkaç haftalık bir iş için Sarmal ağırdır. Yüz elli yedi maddelik bir kanon, yetmiş dört tanı ve altı kademeli bir plan ağacı, üç ekranlık bir uygulamanın taşıyamayacağı bir törendir; o işte iyi bir README ve Git yeter. Sarmal'ın değeri üçüncü haftada, bir kararın gerekçesini ararken ya da kod plandan koptuğunda hissedilir; ondan önce yalnız bedelini ödersiniz.

## BİRDEN ÇOK YAPAY ZEKÂ AJANIYLA ON CİVARI TEKNOLOJİYİ BİR ARAYA GETİRİYORSANIZ YA DA SEKTÖREL VEYA KİŞİSEL BİR İŞLETİM SİSTEMİ KURUYORSANIZ SARMAL BUNUN İÇİN YAPILDI

Birden çok ajanın aynı planda çalıştığı, arka yüzden mobil uygulamaya, veritabanından altyapıya on civarı teknolojinin tek ürün içinde buluştuğu, kararların aylarca geçerli kalması gereken ve işin çoğunu ajanların yaptığı projelerde Sarmal tam yerindedir. Ajanlar dosya taramak yerine aynı grafı sorar, her teknoloji kendi Katmanında kendi Takımına bağlanır, kararlar gerekçesiyle kalır ve plan ile disk ayrıştığında motor bunu insana taşır. Bir işletmenin ya da bir kişinin bütün işini ajan kadrosuyla yürüten bir işletim sistemi kurmak isteyen için Sarmal o kadronun ortak dili ve denetçisidir; bu deponun kendisi o düzenin ilk örneğidir.

Beş yüz kişilik bir monorepo için yine değildir; orada olgun araçlar vardır ve Sarmal ikinci bir gerçek kaynağı olur. Git'e rakip değildir: Git satırın tarihini tutar, Sarmal aynı değişikliğin plan düzeyindeki anlamını. İş takip aracına da rakip değildir: iş listesi tutmaz, işin gerçekle tutarlılığını ölçer.

Bu depo Sarmal'ın kendisiyle yönetilir: `is/` altındaki plan, durum kaydı ve hatırlatıcılar dilin kendi üstünde koştuğunun kanıtıdır ve olduğu gibi açıktır.

Aşağıdaki bölümler kanonik kaynaklardan üretilir; yalnız bu giriş elle yazılır.
<!-- SARMAL:ELLE-KORUNAN:SON -->

<!-- SARMAL:URETILEN:KOK-README-TR:BAS -->
<!-- SARMAL:DIATAXIS README -->
## Kurulum

Çekirdek Node 23.6 ya da üstünü ister: `cd urun/cekirdek && npm link` komutu `sarmal` komutunu kabuğa bağlar; sürüm şartının kaynağı `urun/cekirdek/package.json` dosyasıdır. Eklenti mağazada yayımlandığında oradan kurulur; o güne kadar `urun/eklenti` içinde `npm install && npm run build` ile derlenir ve F5 ile geliştirme penceresinde koşar ([urun/eklenti/README.md](urun/eklenti/README.md)). MCP sunucusu `node urun/cekirdek/src/mcp.ts` komutuyla stdio üzerinden başlar; Claude Code için `claude mcp add sarmal -- node <depo>/urun/cekirdek/src/mcp.ts` yeterlidir.

## İlk beş dakika

1. `sarmal doğuş <klasör> --tur proje --ad <Ad>` boş bir klasörde giriş dosyasını, ilk planı, durum kaydını ve ajan yönergesini doğurur.
2. `sarmal denetle <klasör>` ilk hükmü verir; doğan proje sıfır hata ile başlar ve tek açık Adımı kuruluş diyaloğudur.
3. Kuruluş Adımı kod yazmaz: teknolojiyi ve takımı giriş dosyasına ilan eder, doğuş paketinin bıraktığı yönerge metinlerini kendi cümlelerinle doldurur.
4. `sarmal sef <ADIM-KOD> <klasör>` bir Adımın konisini ajana verilecek istem olarak basar; `sarmal sonraki <klasör>` koşulabilir Adımları listeler.
5. `sarmal ogret` karşılama kartını, `sarmal başla` şablon kütüphanesini, `sarmal gezin <KOD> <klasör>` bir kodun tanımı ile atıflarını gösterir.

## Raf haritası

[`yasa/kanon/`](yasa/kanon/) kanonun tek adresidir: sekiz bölüm dosyasında 157 tekil madde yaşar, 38 Karar ve 119 Kural. [`oz/siniflama/`](oz/siniflama/) tip sistemidir; [`ogreti/`](ogreti/) şablonları, örnekleri ve öğretim yüzlerini taşır; [`is/`](is/) Sarmal'ın kendi planı, durum kaydı ve hatırlatıcılarıdır; [`urun/cekirdek/`](urun/cekirdek/) motor, komut satırı ve MCP sunucusu, [`urun/eklenti/`](urun/eklenti/) VS Code eklentisidir. Kalıcı belgeler hüküm kopyası değil, bu kaynaklardan üretilen okuma yüzleridir.

## Öğren

[NEDIR.md](NEDIR.md) kavramsal açıklamayı, [KAVRAMLAR.md](KAVRAMLAR.md) başvuru indeksini, [ROL-HARITASI.md](ROL-HARITASI.md) açık/kapalı rol sınırını, [urun/eklenti/README.md](urun/eklenti/README.md) eklentiyi kullanma görevini ve [oz/siniflama/kayit.md](oz/siniflama/kayit.md) tam tip/alan Reference tablosunu verir. Kendi etmenini yazma yeteneği açık kapsamın parçasıdır: **Etmen · Beceri · Tetikleyici + sef**. `Etmen` kimliği ve yetkisi, `Beceri` uygulanabilir bilgisini, `Tetikleyici` ne zaman devreye gireceğini bildirir; `sef` ise Adım konisini bu bağlamla kurar.

## Katkı ve lisans

Katkı yolu [CONTRIBUTING.md](CONTRIBUTING.md), davranış kuralları [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), güvenlik bildirimi [SECURITY.md](SECURITY.md) dosyasındadır. Sarmal [Apache-2.0](LICENSE.md) lisansı ile açıktır; üçüncü taraf atıfları [NOTICE.md](NOTICE.md) dosyasında yaşar. Sarmal ile yönetilen ayrı bir kapalı ürün vardır; bu belge o ürünün içeriğini anlatmaz.

## Ölçülen yüzler

Yeni tanı kümesi 47 hata, 16 uyarı ve 11 bilgi düzeyindedir. Sabit sicilin yönlendirme matrisi 143 Problems, 4 Hatırlatıcılar ve 28 Bildirimler (Gözlemler) olarak ölçülür. Tanı metinlerinin 174'i, 18 MCP aracının açıklamaları, manifest, karşılama kartı ve bu belge yüzleri iki dillidir; sayılar kaynaktan ölçülür ve elle yazılmaz.
<!-- SARMAL:URETILEN:KOK-README-TR:SON -->
