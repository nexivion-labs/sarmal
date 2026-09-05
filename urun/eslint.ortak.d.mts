// eslint.ortak.d.mts — eslint.ortak.mjs modülünün tip bildirimi.
//
//   Çekirdek sınaması (sinama/dil-denetimi-kapsami.test.ts) bu modülü içe alır ve
//   tip denetimi bildirimsiz bir .mjs modülünü örtük any saydığı için kırmızı
//   yanıyordu (TS7016). Bildirim yalnız dışa açık iki adı tanımlar; davranış .mjs
//   dosyasındadır ve burada yinelenmez.
export declare function ortakYapilandirma(secenekler: {
  tseslint: { config: (...blocks: unknown[]) => unknown[]; configs: { recommended: unknown[] } };
  kaynaklar: string[];
  yoksay?: string[];
}): unknown[];

/** Nöbetin ölçtüğü sözleşme: ortak yapılandırmada biçim kuralı yaşamaz. */
export declare const BICIM_KURALLARI_YASAK: readonly string[];
