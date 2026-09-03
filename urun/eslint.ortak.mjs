// eslint.ortak.mjs — 🧹 İki paketin ortak dil denetimi (BKM-KBK-A02).
//
//   Kapsam bilinçle dardır: yalnız HATA sınıfı kurallar ve kullanılmayan kod.
//   Biçim (girinti, tırnak, satır uzunluğu, noktalı virgül) Sarmal'ın kendi
//   biçimlendiricisinin işidir ve burada tek bir biçim kuralı yaşamaz; bu ayrım
//   bir nöbetle korunur (cekirdek/sinama/dil-denetimi-kapsami.test.ts).
//
//   Temel, typescript-eslint'in önerilen kümesidir. Aşağıdaki iki uyarlama
//   susturma değil DARALTMADIR ve gerekçeleri satırındadır:
//   · no-unused-vars: alt çizgiyle başlayan ad bilinçli olarak kullanılmayan
//     parametre ya da yakalanan hata demektir; bu yazım kod tabanında zaten
//     yaşar ve okuyana niyeti söyler.
//   · no-empty: yalnız yorum taşıyan boş blok kabul edilir, çünkü depoda
//     "/* düş */" gibi yorumlu boş yakalama blokları bilinçli düşüş noktalarıdır.

// Bu dosya paket köklerinin ÜSTÜNDE yaşar ve kendi node_modules'ı yoktur;
// typescript-eslint her paketin kendi kurulumundan parametreyle gelir.
export function ortakYapilandirma({ tseslint, kaynaklar, yoksay = [] }) {
  return tseslint.config(
    { ignores: ["node_modules/**", "dist/**", "dist-sinama/**", ".vscode-test/**", ...yoksay] },
    ...tseslint.configs.recommended.map((c) => ({ ...c, files: kaynaklar })),
    {
      files: kaynaklar,
      rules: {
        "@typescript-eslint/no-unused-vars": ["error", {
          argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_", varsIgnorePattern: "^_",
        }],
        "no-empty": ["error", { allowEmptyCatch: false }],
      },
    },
  );
}

/** Nöbetin ölçtüğü sözleşme: burada BİÇİM kuralı yaşamaz. */
export const BICIM_KURALLARI_YASAK = [
  "indent", "quotes", "semi", "max-len", "comma-dangle", "eol-last", "no-trailing-spaces",
  "object-curly-spacing", "array-bracket-spacing", "arrow-parens", "brace-style", "linebreak-style",
];
