// Eklenti saf-modül sınamaları VS Code kabuğunu kurmaz. Üretimdeki activate
// kapısının yaptığı dil bağını test süreci için açıkça kurar; ikinci varsayılan
// değildir ve yalnız `npm test` ön-yüklemesidir.
import { yuzeyDiliniAyarla } from "../src/yuzey-metinleri.ts";

yuzeyDiliniAyarla("tr");
