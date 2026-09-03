// Eklentinin dil denetimi — ortak yapılandırmayı kaynak ve sınama ağacına uygular.
// Gömülü kanon ikizi üretilmiş bir dosyadır ve üreticinin çıktısı denetlenmez.
import tseslint from "typescript-eslint";
import { ortakYapilandirma } from "../eslint.ortak.mjs";
export default ortakYapilandirma({
  tseslint,
  kaynaklar: ["src/**/*.ts", "sinama/**/*.ts", "sinama_vscode/**/*.ts"],
  yoksay: ["src/gomulu-kanon.ts"],
});
