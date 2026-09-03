// Çekirdeğin dil denetimi — ortak yapılandırmayı kaynak ve sınama ağacına uygular.
import tseslint from "typescript-eslint";
import { ortakYapilandirma } from "../eslint.ortak.mjs";
export default ortakYapilandirma({ tseslint, kaynaklar: ["src/**/*.ts", "sinama/**/*.ts"] });
