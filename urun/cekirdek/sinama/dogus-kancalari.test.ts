// ═══════════════════════════════════════════════════════════════════════════
// dogus-kancalari.test.ts — 🚪 Doğuş kancalarının Node ve kabuk sürümlerinin eşliği
//   (HTR-DOGUS-WINDOWS-KANCALARI · HTR-DOGUS-KILIDI-BELGE-METNI · 2026-10-22)
//
//   Doğuş paketi yeni köklere kancaların Node sürümlerini kurar ve kanca ayarı
//   onları kabuksuz çağırır; kabuk sürümleri şablon rafında POSIX başvuru sürümü
//   olarak yaşar. Aşağıdaki nöbetler dört şeyi ölçer:
//     ① iki sürüm aynı girdiye aynı çıkış kodunu, aynı standart çıktıyı ve aynı
//        hata çıktısını verir (adlandırılmış senaryolar ve tohumlu rastgele komutlar);
//     ② kilit yazım hedefini yalnız gerçek hedef yolundan çıkarır: gerçek bir yeni
//        giriş ilanı yazımı reddedilir, yalnız metin olarak geçen bir ad reddedilmez;
//     ③ Windows yol biçimleri (sürücü harfi, ters bölü, UNC, Git Bash biçimi) Node
//        sürümünde doğru çözülür — bu ölçüm sahte bir disk üzerinde yapılır, çünkü
//        sınama Windows'ta koşmamaktadır;
//     ④ kanca ayarı kabuk olmadan, yürütücünün yaptığı gibi yol yer tutucusu
//        yerine konarak çağrıldığında iki kanca da uçtan uca çalışır.
// ═══════════════════════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, win32 } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { dogusYaz, kabukKancalari, SARMAL_KOK_DEGISKENI, SARMAL_KURULUM_KOKU } from "../src/dogus.ts";

/** Giriş ilanı soneki parçalardan kurulur: kaynak metni okuyan kancalar bu dosyayı yazım hedefi sanmasın. */
const ILAN = "_anadizin" + ".sar";
const TARIH = "2026-10-22";
const AD = "eslik";

interface Sonuc { kod: number | null; stdout: string; stderr: string }
type SahteDisk = { dosyaMi: (y: string) => boolean; dizinMi: (y: string) => boolean };
interface KilitModulu {
  hedefleriCikar(komut: string): string[];
  karar(girdi: unknown, cwd: string, platform?: string, disk?: SahteDisk): string | undefined;
}
interface KapiModulu {
  motorYokMetni(kok: string, motor: string, platform?: string): string;
  motorYolu(ortam?: Record<string, string | undefined>): string;
  yeniDegisenVarMi(kok: string, simdi?: number): boolean;
}

/** Kabuk sürümünün `node` olarak sınamayı koşturan sürümü bulması için yol önceliği. */
function ortam(ek: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const o: NodeJS.ProcessEnv = { ...process.env, PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ""}` };
  delete o[SARMAL_KOK_DEGISKENI];
  delete o.SARMAL_DIL;
  delete o.CLAUDE_PROJECT_DIR;
  for (const [k, v] of Object.entries(ek)) {
    if (v === undefined) delete o[k];
    else o[k] = v;
  }
  return o;
}

/** Doğuşla açılmış bir kök; kabuk sürümleri de aynı değerlerle yanına yazılır. */
function kancaliKok(ustAdi = "sarmal-kanca-"): { kok: string; sil: () => void } {
  const ust = mkdtempSync(join(tmpdir(), ustAdi));
  const kok = join(ust, "kok");
  mkdirSync(kok);
  dogusYaz(kok, AD, TARIH);
  for (const d of kabukKancalari(AD, TARIH)) writeFileSync(join(kok, d.yol), d.icerik, "utf8");
  return { kok, sil: () => rmSync(ust, { recursive: true, force: true }) };
}

/** Bir kancayı kabukla ya da Node ile koşturur. */
function kostur(yorumlayici: "sh" | "dash" | "node", betik: string, girdi: string, env: NodeJS.ProcessEnv, cwd?: string): Sonuc {
  const komut = yorumlayici === "node" ? process.execPath : yorumlayici;
  const s = spawnSync(komut, [betik], { input: girdi, encoding: "utf8", env, cwd, timeout: 120_000 });
  return { kod: s.status, stdout: s.stdout, stderr: s.stderr };
}

const DASH_VAR = spawnSync("dash", ["-c", "exit 0"]).status === 0;

/** Kilidin üç koşumu (sh, varsa dash, node) aynı mı; aynıysa Node sonucunu döndürür. */
function kilitEsligi(kok: string, girdi: string, env: NodeJS.ProcessEnv, etiket: string, cwd?: string, dashIle = true): Sonuc {
  const kanca = (u: string): string => join(kok, ".claude", "kanca", `dogus-kilidi.${u}`);
  const node = kostur("node", kanca("mjs"), girdi, env, cwd);
  const sh = kostur("sh", kanca("sh"), girdi, env, cwd);
  assert.deepEqual(sh, node, `${etiket}: sh ile Node ayrıştı`);
  if (DASH_VAR && dashIle) assert.deepEqual(kostur("dash", kanca("sh"), girdi, env, cwd), node, `${etiket}: dash ile Node ayrıştı`);
  return node;
}

function reddedildiMi(s: Sonuc): boolean {
  if (s.stdout.trim() === "") return false;
  const c = JSON.parse(s.stdout) as { hookSpecificOutput: { permissionDecision: string; permissionDecisionReason: string } };
  assert.equal(c.hookSpecificOutput.permissionDecision, "deny");
  assert.match(c.hookSpecificOutput.permissionDecisionReason, /DOĞUŞ KİLİDİ/u);
  return true;
}

test("kanca ayarı kancaları kabuksuz çağırır: komut node, tek argüman yer tutuculu betik yolu, kabuk sözdizimi yok", () => {
  const { kok, sil } = kancaliKok();
  try {
    const metin = readFileSync(join(kok, ".claude", "settings.json"), "utf8");
    const ayar = JSON.parse(metin) as { hooks: Record<string, Array<{ matcher: string; hooks: Array<Record<string, unknown>> }>> };
    const beklenen: Record<string, string> = { PreToolUse: "dogus-kilidi.mjs", PostToolUse: "denetim-kapisi.mjs" };
    for (const [olay, betik] of Object.entries(beklenen)) {
      const k = ayar.hooks[olay][0].hooks[0];
      assert.equal(k.command, "node", `${olay}: yorumlayıcı node olmalı`);
      assert.deepEqual(k.args, [`\${CLAUDE_PROJECT_DIR}/.claude/kanca/${betik}`], `${olay}: betik yolu tek argüman olmalı`);
      assert.equal(k.shell, undefined, `${olay}: kabuk seçilmemeli`);
      assert.ok(existsSync(join(kok, ".claude", "kanca", betik)), `${betik} doğmadı`);
    }
    assert.doesNotMatch(metin, /"sh |:-|\$\{CLAUDE_PROJECT_DIR:-/u, "ayarda kabuğa özgü sözdizimi kalmış");
    // Kabuk sürümleri doğan köke yazılmaz; yalnız şablon rafında yaşar.
    const yeni = mkdtempSync(join(tmpdir(), "sarmal-kanca-yalin-"));
    try {
      dogusYaz(yeni, AD, TARIH);
      for (const sh of ["dogus-kilidi.sh", "denetim-kapisi.sh"]) assert.ok(!existsSync(join(yeni, ".claude", "kanca", sh)), `${sh} doğan köke yazılmış`);
    } finally {
      rmSync(yeni, { recursive: true, force: true });
    }
  } finally {
    sil();
  }
});

test("doğuş kilidi eşliği: adlandırılmış senaryolarda sh, dash ve Node aynı sonucu verir; gerçek yazım reddedilir, yalnız anılan ad geçer", { timeout: 300_000 }, () => {
  const { kok, sil } = kancaliKok();
  try {
    const env = ortam();
    const Y = join(kok, `yeni${ILAN}`);
    const V = join(kok, `${AD}${ILAN}`);
    const NOT = join(kok, "not.md");
    mkdirSync(join(kok, "a b"));
    const bosluklu = join(kok, "a b", `yeni${ILAN}`);
    const bash = (command: string, cwd: string = kok): string => JSON.stringify({ tool_name: "Bash", cwd, tool_input: { command } });
    const arac = (tool_name: string, file_path: string): string => JSON.stringify({ tool_name, cwd: kok, tool_input: { file_path } });

    const reddedilenler: Array<[string, string]> = [
      ["Write yeni ilan", arac("Write", Y)],
      ["Edit yeni ilan", arac("Edit", Y)],
      ["boşluklu dizinde Write", arac("Write", bosluklu)],
      ["yönlendirme", bash(`echo x > ${Y}`)],
      ["ekleme yönlendirmesi", bash(`echo x >> ${Y}`)],
      ["boşluksuz yönlendirme", bash(`echo x >${Y}`)],
      ["zorlamalı yönlendirme", bash(`echo x >| ${Y}`)],
      ["hata çıktısı yönlendirmesi", bash(`ls 2> ${Y}`)],
      ["iki çıktının yönlendirmesi", bash(`ls &> ${Y}`)],
      ["tee", bash(`echo x | tee ${Y}`)],
      ["seçenekli tee", bash(`echo x | tee -a ${NOT} ${Y}`)],
      ["cp", bash(`cp ${V} ${Y}`)],
      ["seçenekli mv", bash(`mv -f ${NOT} ${Y}`)],
      ["install", bash(`install -m 644 ${V} ${Y}`)],
      ["touch", bash(`touch ${Y}`)],
      ["çift tırnaklı hedef", bash(`echo x > "${Y}"`)],
      ["tek tırnaklı hedef", bash(`echo x > '${Y}'`)],
      ["boşluklu dizine tırnaklı hedef", bash(`echo x > "${bosluklu}"`)],
      ["göreli hedef", bash(`echo x > yeni${ILAN}`)],
      ["alt kabuk", bash(`(echo x > ${Y})`)],
      ["küme", bash(`{ echo x; } > ${Y}`)],
      ["komut yerine koyma", bash(`x=$(echo a > ${Y})`)],
      ["ters tırnak", bash(`echo \`touch ${Y}\``)],
      ["süreç yerine koyma", bash(`diff <(touch ${Y}) /dev/null`)],
      ["bash -c", bash(`bash -c 'echo x > ${Y}'`)],
      ["sh -c", bash(`sh -c "cp ${V} ${Y}"`)],
      ["eval", bash(`eval "touch ${Y}"`)],
      ["sudo tee", bash(`sudo tee ${Y} < /dev/null`)],
      ["env ile cp", bash(`env A=1 cp ${V} ${Y}`)],
      ["atamalı touch", bash(`A=1 touch ${Y}`)],
      ["if gövdesi", bash(`if true; then touch ${Y}; fi`)],
      ["zincirin ikinci komutu", bash(`cd ${kok} && echo x > ${Y}`)],
      ["tam yollu cp", bash(`/bin/cp ${V} ${Y}`)],
      ["çizgili cp", bash(`cp -- ${V} ${Y}`)],
      ["tırnaksız ok gerçek yönlendirmedir", bash(`echo dogus paketi -> ${Y} yazar`)],
      // POSIX'te ters bölü ayırıcı değildir: bu yol çalışma dizininde TEK bir dosya adıdır ve yeni bir ilan yazar.
      ["Windows biçimli yol POSIX'te tek dosya adıdır", arac("Write", `C:\\Users\\kullanici\\yeni${ILAN}`)],
      ["ikinci satırda yazım", bash(`echo a\necho b > ${Y}`)],
      ["belgenin kendi satırında yönlendirme", bash(`cat <<EOF > ${Y}\nmetin\nEOF`)],
      ["belge gövdesinden sonraki komut", bash(`cat > ${NOT} <<EOF\nx\nEOF\necho x > ${Y}`)],
      ["sekmeli belge gövdesinden sonraki komut", bash(`cat > ${NOT} <<-EOF\n\tx\n\tEOF\necho x > ${Y}`)],
    ];
    const gecenler: Array<[string, string]> = [
      ["var olan ilana Write", arac("Write", V)],
      ["var olan ilana Edit", arac("Edit", V)],
      ["ilan olmayan dosya", arac("Write", join(kok, "not.md"))],
      ["satır sonu taşıyan yol", arac("Write", `${kok}/a\nyeni${ILAN}`)],
      ["okuma", bash(`cat ${V}`)],
      ["arama", bash(`grep x ${V} > /dev/null`)],
      // HTR-DOGUS-KILIDI-BELGE-METNI: düz metin ekleyen ve metninde bir ilan adını ANAN komutlar.
      ["metinde anılan ad ve tırnaklı >", bash(`printf '%s\\n' "Doğuş paketi kökün adıyla biten ornek${ILAN} dosyasını yazar > elle yazılmaz" >> ${NOT}`)],
      ["metinde ; touch", bash(`echo "a; touch ${Y}" >> ${NOT}`)],
      ["metinde cp", bash(`echo 'cp ${V} ${Y}' >> ${NOT}`)],
      ["metinde | tee", bash(`echo "x | tee ${Y}" >> ${NOT}`)],
      ["metinde 2>", bash(`echo '2> ${Y}' >> ${NOT}`)],
      ["işleme iletisinde touch", bash(`git commit -m "touch ${Y}"`)],
      ["tırnaklı ok", bash(`echo "dogus paketi -> ${Y} yazar" >> ${NOT}`)],
      ["belge gövdesi", bash(`cat > ${NOT} <<EOF\necho x > ${Y}\nEOF`)],
      ["tırnaklı etiketli belge gövdesi", bash(`cat > ${NOT} <<'NOT'\nyasak: touch ${Y}\nNOT`)],
      ["sekmeli belge gövdesi", bash(`cat > ${NOT} <<-EOF\n\techo x > ${Y}\n\tEOF`)],
      ["burada-dizgesi", bash(`cat <<< "echo x > ${Y}" > ${NOT}`)],
      ["yorum", bash(`echo x # > ${Y}`)],
      ["yorumdaki touch", bash(`echo x >> ${NOT} # touch ${Y}`)],
      ["bash -c içinde tırnaklı metin", bash(`bash -c 'echo "x > ${Y}"' >> ${NOT}`)],
      ["komut yerine koymada okuma", bash(`echo "$(cat ${V})" > ${join(kok, "kopya.txt")}`)],
      ["ilandan kopya", bash(`cp ${V} ${join(kok, "yedek.txt")}`)],
      ["var olan ilana yönlendirme", bash(`echo x >> ${V}`)],
      ["değişkenli yol", bash(`echo x > $D/yeni${ILAN}`)],
      ["jokerli yol", bash(`echo x > ${kok}/*${ILAN}`)],
      ["üst dizini olmayan göreli yol", bash(`echo x > olmayan/dizin/yeni${ILAN}`)],
      ["başka araç", JSON.stringify({ tool_name: "Read", cwd: kok, tool_input: { file_path: Y } })],
      ["bozuk girdi", "{bu json degil"],
      ["boş girdi", ""],
    ];
    for (const [ad, girdi] of reddedilenler) {
      assert.equal(reddedildiMi(kilitEsligi(kok, girdi, env, ad)), true, `${ad}: gerçek yazım reddedilmedi`);
    }
    for (const [ad, girdi] of gecenler) {
      const s = kilitEsligi(kok, girdi, env, ad);
      assert.equal(reddedildiMi(s), false, `${ad}: yazım olmayan komut reddedildi`);
      assert.equal(s.kod, 0);
    }
    // Ret gerekçesi hedefin TAM yolunu adlandırır; boşluklu yol parçalanmaz.
    const r = JSON.parse(kilitEsligi(kok, bash(`echo x > "${bosluklu}"`), env, "gerekçe").stdout) as { hookSpecificOutput: { permissionDecisionReason: string } };
    assert.ok(r.hookSpecificOutput.permissionDecisionReason.includes(`(${bosluklu} diskte yok)`), "gerekçe hedefin tam yolunu taşımıyor");
    // Girdide çalışma dizini yokken iki sürüm de kabuğun PWD değerini kullanır.
    const pwdli = ortam({ PWD: kok });
    const cwdsiz = JSON.stringify({ tool_name: "Bash", tool_input: { command: `echo x > yeni${ILAN}` } });
    const p = kilitEsligi(kok, cwdsiz, pwdli, "PWD", kok);
    assert.ok(p.stdout.includes(`(${kok}/yeni${ILAN} diskte yok)`), `PWD yolu korunmadı:\n${p.stdout}`);
  } finally {
    sil();
  }
});

/** Tohumlu sözde rastgele sayı üreteci (mulberry32): her koşu aynı komutları üretir. */
function uretec(tohum: number): () => number {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tohumlu rastgele kabuk komutu üretir: tırnak, belge, yerine koyma ve işleç parçalarını gelişigüzel dizer. */
function rastgeleKomutlar(kok: string, adet: number, tohum: number): string[] {
  const Y = join(kok, `yeni${ILAN}`);
  const V = join(kok, `${AD}${ILAN}`);
  const hedefler = [Y, V, `yeni${ILAN}`, `"${Y}"`, `'${Y}'`, `alt/yeni${ILAN}`, `$D/yeni${ILAN}`];
  const parcalar = [
    "echo", "x", "cp", "mv", "tee", "touch", "install", "-a", "--", "bash -c", "sh -c", "eval", "sudo", "env A=1", "A=1",
    ">", ">>", "2>", "&>", ">|", ">&", "<", "<>", "|", ";", "&&", "||", "&", "(", ")", "{", "}", "->",
    "'", "\"", "$(", "`", "\\", "#", "\n", "<<EOF", "<<-EOF", "<<'EOF'", "EOF", "\tEOF", "<<<", "$((1+2))", "${A}", "<(", ">(",
    "not.md", "if", "then", "fi",
  ];
  const r = uretec(tohum);
  const sec = <T>(d: readonly T[]): T => d[Math.floor(r() * d.length)];
  const komutlar: string[] = [];
  for (let i = 0; i < adet; i++) {
    const uzunluk = 3 + Math.floor(r() * 10);
    const ogeler: string[] = [];
    for (let j = 0; j < uzunluk; j++) ogeler.push(r() < 0.3 ? sec(hedefler) : sec(parcalar));
    ogeler.splice(Math.floor(r() * (ogeler.length + 1)), 0, sec(hedefler));
    komutlar.push(ogeler.map((o) => o + sec(["", " ", " ", " "])).join(""));
  }
  return komutlar;
}

test("doğuş kilidi eşliği: tohumlu rastgele 400 komutta awk çözücüsü ile Node çözücüsü aynı hedef listesini aynı sırayla çıkarır", { timeout: 300_000 }, async () => {
  const { kok, sil } = kancaliKok();
  try {
    const k = await import(pathToFileURL(join(kok, ".claude", "kanca", "dogus-kilidi.mjs")).href) as KilitModulu;
    // awk programı kabuk sürümünden olduğu gibi alınır; programda tek tırnak bulunmaz, ilk tek tırnak onu kapatır.
    const sh = readFileSync(join(kok, ".claude", "kanca", "dogus-kilidi.sh"), "utf8");
    const bas = sh.indexOf("LC_ALL=C awk '") + "LC_ALL=C awk '".length;
    const program = sh.slice(bas, sh.indexOf("'", bas));
    assert.ok(program.includes("function coz("), "awk programı kabuk sürümünden ayrılamadı");
    let dolu = 0;
    for (const [i, komut] of rastgeleKomutlar(kok, 400, 20261022).entries()) {
      const s = spawnSync("awk", [program], { input: komut, encoding: "utf8", env: { ...process.env, LC_ALL: "C" } });
      assert.equal(s.status, 0, s.stderr);
      const awk = s.stdout === "" ? [] : s.stdout.replace(/\n$/u, "").split("\n");
      const node = k.hedefleriCikar(komut);
      assert.deepEqual(awk, node, `rastgele #${i}: ${JSON.stringify(komut)}`);
      if (node.length > 0) dolu++;
    }
    // Kontrol ölçümü: kümenin önemli bir kısmı gerçekten hedef taşır; eşlik boş listelerden ibaret değildir.
    assert.ok(dolu > 100, `yalnız ${dolu} komut hedef taşıdı; küme ölçümü taşımıyor`);
  } finally {
    sil();
  }
});

test("doğuş kilidi eşliği: tohumlu rastgele 30 komutta iki kancanın tam çıktısı (çıkış kodu, ret gerekçesi) aynıdır", { timeout: 300_000 }, () => {
  const { kok, sil } = kancaliKok();
  try {
    const env = ortam();
    let ret = 0;
    for (const [i, komut] of rastgeleKomutlar(kok, 30, 22102026).entries()) {
      const s = kilitEsligi(kok, JSON.stringify({ tool_name: "Bash", cwd: kok, tool_input: { command: komut } }), env, `rastgele #${i}: ${JSON.stringify(komut)}`, undefined, false);
      if (reddedildiMi(s)) ret++;
    }
    // Kontrol ölçümü: kümede iki karar da vardır.
    assert.ok(ret >= 3 && ret <= 27, `rastgele kümede ret sayısı ${ret}: küme iki kararı da taşımıyor`);
  } finally {
    sil();
  }
});

test("doğuş kilidi: uzun belge gövdesi iki sürümde de çabuk ve aynı sonuçla geçer", { timeout: 120_000 }, () => {
  const { kok, sil } = kancaliKok();
  try {
    const Y = join(kok, `yeni${ILAN}`);
    const govde = Array.from({ length: 3000 }, (_, i) => `satir ${i}: echo x > ${Y}`).join("\n");
    const girdi = JSON.stringify({ tool_name: "Bash", cwd: kok, tool_input: { command: `cat > ${join(kok, "not.md")} <<'EOF'\n${govde}\nEOF\necho bitti` } });
    const bas = Date.now();
    const s = kilitEsligi(kok, girdi, ortam(), "uzun belge");
    assert.equal(reddedildiMi(s), false);
    assert.ok(Date.now() - bas < 15_000, `uzun belge ${Date.now() - bas} ms sürdü; kanca zaman aşımına (15 sn) yaklaşıyor`);
  } finally {
    sil();
  }
});

test("doğuş kilidi: hedefler komut metninin tamamından değil yalnız yazım yerlerinden çıkar", async () => {
  const { kok, sil } = kancaliKok();
  try {
    const k = await import(pathToFileURL(join(kok, ".claude", "kanca", "dogus-kilidi.mjs")).href) as KilitModulu;
    assert.deepEqual(k.hedefleriCikar(`echo "kök > a${ILAN} biçimi" >> not.md`), []);
    assert.deepEqual(k.hedefleriCikar(`printf '%s' 'touch b${ILAN}; cp x c${ILAN}' >> not.md`), []);
    assert.deepEqual(k.hedefleriCikar(`cp a b${ILAN} && echo x | tee -a c${ILAN} d.txt; touch e${ILAN}`), [`b${ILAN}`, `c${ILAN}`, `e${ILAN}`]);
    assert.deepEqual(k.hedefleriCikar(`echo x > "a b/c${ILAN}" 2>&1`), [`a b/c${ILAN}`]);
    assert.deepEqual(k.hedefleriCikar(`bash -c "x=\\$(touch i${ILAN})"`), [`i${ILAN}`], "iç içe kod bölgesi çözülmedi");
  } finally {
    sil();
  }
});

test("doğuş kilidi: Windows yol biçimleri doğru çözülür (sahte disk · sınama Windows'ta koşmaz)", async () => {
  const { kok, sil } = kancaliKok();
  try {
    const k = await import(pathToFileURL(join(kok, ".claude", "kanca", "dogus-kilidi.mjs")).href) as KilitModulu;
    const bicim = (y: string): string => win32.normalize(y).toLowerCase();
    const dosyalar = new Set([`C:\\Users\\kullanici\\proje\\${AD}${ILAN}`].map(bicim));
    const dizinler = new Set(["C:\\Users\\kullanici\\proje", "C:\\Users\\kullanici\\proje\\alt", "C:\\Users\\kullanici\\proje\\a b"].map(bicim));
    const disk: SahteDisk = { dosyaMi: (y) => dosyalar.has(bicim(y)), dizinMi: (y) => dizinler.has(bicim(y)) };
    const cwd = "C:\\Users\\kullanici\\proje";
    const w = (file_path: string): string | undefined => k.karar({ tool_name: "Write", cwd, tool_input: { file_path } }, cwd, "win32", disk);
    const b = (command: string): string | undefined => k.karar({ tool_name: "Bash", cwd, tool_input: { command } }, cwd, "win32", disk);

    // Sürücü harfli, ters bölülü ve eğik çizgili mutlak yollar
    assert.equal(w(`C:\\Users\\kullanici\\proje\\yeni${ILAN}`), `C:\\Users\\kullanici\\proje\\yeni${ILAN}`);
    assert.equal(w(`C:\\Users\\kullanici\\proje\\${AD}${ILAN}`), undefined, "var olan ilanı düzenlemek serbesttir");
    assert.equal(w(`c:/users/kullanici/proje/${AD}${ILAN}`), undefined, "eğik çizgili ve küçük harfli yazım aynı dosyayı göstermeli");
    assert.equal(w(`C:\\Users\\kullanici\\proje\\a b\\yeni${ILAN}`), `C:\\Users\\kullanici\\proje\\a b\\yeni${ILAN}`, "boşluklu Windows yolu parçalanmamalı");
    // UNC yolu mutlaktır
    assert.equal(w(`\\\\sunucu\\pay\\yeni${ILAN}`), `\\\\sunucu\\pay\\yeni${ILAN}`);
    // Bash: çift tırnak içindeki ters bölü olduğu gibi kalır
    assert.equal(b(`echo x > "C:\\Users\\kullanici\\proje\\yeni${ILAN}"`), `C:\\Users\\kullanici\\proje\\yeni${ILAN}`);
    assert.equal(b(`echo "kök > C:\\Users\\kullanici\\proje\\yeni${ILAN}" >> not.md`), undefined, "tırnak içindeki ad veridir");
    // Git Bash biçimi /c/… sürücü yoluna çevrilir
    assert.equal(b(`echo x > /c/Users/kullanici/proje/yeni${ILAN}`), `C:/Users/kullanici/proje/yeni${ILAN}`);
    assert.equal(b(`echo x >> /c/Users/kullanici/proje/${AD}${ILAN}`), undefined, "Git Bash biçimiyle var olan ilan tanınmalı");
    // Göreli yol çalışma dizinine eklenir; üst dizin yoksa adres çözülmüş sayılmaz
    assert.equal(b(`echo x > 'alt\\yeni${ILAN}'`), `C:\\Users\\kullanici\\proje/alt\\yeni${ILAN}`);
    assert.equal(b(`echo x > 'yok\\yeni${ILAN}'`), undefined);

    const kapi = await import(pathToFileURL(join(kok, ".claude", "kanca", "denetim-kapisi.mjs")).href) as KapiModulu;
    assert.match(kapi.motorYokMetni(cwd, "/urun/cekirdek/src/sarmal.ts", "win32"), new RegExp(`setx ${SARMAL_KOK_DEGISKENI} "`, "u"),
      "Windows'ta onarım cümlesi setx göstermeli");
    assert.match(kapi.motorYokMetni("/k", "/m", "darwin"), new RegExp(`export ${SARMAL_KOK_DEGISKENI}=`, "u"));
    assert.equal(kapi.motorYolu({ [SARMAL_KOK_DEGISKENI]: "C:\\Sarmal" }), "C:\\Sarmal/urun/cekirdek/src/sarmal.ts");
    assert.equal(kapi.motorYolu({}), "/urun/cekirdek/src/sarmal.ts", "tanımsız değişken kabuktaki gibi boş dizgeye açılmalı");
    // Bash dokunuşunun "son iki dakika" penceresi: taze kökte değişiklik vardır, on dakika sonra yoktur.
    assert.equal(kapi.yeniDegisenVarMi(kok), true);
    assert.equal(kapi.yeniDegisenVarMi(kok, Date.now() + 10 * 60_000), false);
  } finally {
    sil();
  }
});

/** Denetim kapısının iki sürümü aynı mı; aynıysa Node sonucunu döndürür. */
function kapiEsligi(kok: string, girdi: string, env: NodeJS.ProcessEnv, etiket: string): Sonuc {
  const kanca = (u: string): string => join(kok, ".claude", "kanca", `denetim-kapisi.${u}`);
  const node = kostur("node", kanca("mjs"), girdi, env, kok);
  const sh = kostur("sh", kanca("sh"), girdi, env, kok);
  assert.deepEqual(sh, node, `${etiket}: sh ile Node ayrıştı`);
  return node;
}

function baglam(s: Sonuc): string {
  return (JSON.parse(s.stdout) as { hookSpecificOutput: { additionalContext: string } }).hookSpecificOutput.additionalContext;
}

test("denetim kapısı eşliği: sessiz geçiş, motorsuzluk, temiz ağaç, iki dilli özet, mühür ve hatalı ağaç iki sürümde aynıdır", { timeout: 300_000 }, () => {
  const { kok, sil } = kancaliKok();
  try {
    const plan = join(kok, "is", "plan", "faz", "1_dogus.sar");
    const yaz = JSON.stringify({ tool_name: "Write", cwd: kok, tool_input: { file_path: plan } });
    const motorlu = (dil: string): NodeJS.ProcessEnv => ortam({ CLAUDE_PROJECT_DIR: kok, [SARMAL_KOK_DEGISKENI]: SARMAL_KURULUM_KOKU, SARMAL_DIL: dil });

    // Kapının uyanmadığı girdiler
    for (const [ad, girdi] of [
      ["kaynak olmayan dosya", JSON.stringify({ tool_name: "Write", cwd: kok, tool_input: { file_path: join(kok, "not.md") } })],
      ["başka araç", JSON.stringify({ tool_name: "Read", cwd: kok, tool_input: { file_path: plan } })],
      ["kaynak anmayan kabuk komutu", JSON.stringify({ tool_name: "Bash", cwd: kok, tool_input: { command: "ls" } })],
      ["bozuk girdi", "{bu json degil"],
    ] as const) {
      assert.deepEqual(kapiEsligi(kok, girdi, motorlu("tr"), ad), { kod: 0, stdout: "", stderr: "" }, `${ad}: kapı uyanmamalı`);
    }

    // Motor bulunamıyor: kapı susmaz, iki sürüm aynı satırı basar
    const motorsuz = kapiEsligi(kok, yaz, ortam({ CLAUDE_PROJECT_DIR: kok }), "motorsuz");
    assert.equal(motorsuz.kod, 0);
    assert.match(baglam(motorsuz), /DENETİM KOŞMADI/u);

    // Temiz ağaç: Türkçe ve İngilizce kipte özet satırı düşmez (HTR-KANCA-OZETI-IKI-DILLI-DEGIL)
    const tr = kapiEsligi(kok, yaz, motorlu("tr"), "temiz · tr");
    assert.equal(tr.kod, 0);
    // Taze kökte doğuş sırasının tek uyarısı vardır; özet satırı onu sayar.
    assert.match(baglam(tr), /^🚪✅ sarmal-kapı · .+ · ── ÖZET: 0 hata · 1 uyarı ──$/u);
    const en = kapiEsligi(kok, yaz, motorlu("en"), "temiz · en");
    assert.match(baglam(en), /^🚪✅ sarmal-kapı · .+ · ── SUMMARY: 0 errors · 1 warnings ──$/u,
      `İngilizce kipte özet düştü ve uyarı "denetim temiz" diye yutuldu:\n${baglam(en)}`);
    // Kabuk komutuyla dokunuş: son iki dakikada değişmiş kaynak vardır, kapı koşar
    const kabukla = kapiEsligi(kok, JSON.stringify({ tool_name: "Bash", cwd: kok, tool_input: { command: `touch ${plan}` } }), motorlu("tr"), "kabukla dokunuş");
    assert.match(baglam(kabukla), /🚪✅/u);

    // Mühür: liste iki sürümde de bayt sırasıyla basılır
    writeFileSync(join(kok, "ogreti", `@arsiv@_a.sar`), "// mühürlü eski kayıt\n", "utf8");
    writeFileSync(join(kok, "is", `@arsiv@_b.sar`), "// mühürlü eski kayıt\n", "utf8");
    const muhurlu = kapiEsligi(kok, yaz, motorlu("tr"), "mühür");
    assert.ok(`${muhurlu.stdout}${muhurlu.stderr}`.includes("📛 yeni mühür: is/@arsiv@_b.sar ogreti/@arsiv@_a.sar "),
      `mühür listesi sıralı değil:\n${muhurlu.stdout}${muhurlu.stderr}`);
    rmSync(join(kok, "ogreti", `@arsiv@_a.sar`));
    rmSync(join(kok, "is", `@arsiv@_b.sar`));

    // Hatalı ağaç: kapı kapanır (çıkış 2), hata satırları ve özet iki dilde de görünür
    const devir = join(kok, "is", "durum", "durum_devir.sar");
    const devirMetni = readFileSync(devir, "utf8");
    writeFileSync(devir, `${devirMetni}\nUydurmaTip( kod: UYD-1, ne: "deneme" )\n`, "utf8");
    for (const [dil, ozet] of [["tr", /\n── ÖZET: 1 hata · 1 uyarı ──\n$/u], ["en", /\n── SUMMARY: 1 errors · 1 warnings ──\n$/u]] as const) {
      const h = kapiEsligi(kok, yaz, motorlu(dil), `hatalı · ${dil}`);
      assert.equal(h.kod, 2, `hatalı ağaçta kapı kapanmadı (${dil})`);
      assert.equal(h.stdout, "");
      assert.match(h.stderr, /^✖ sarmal-kapı · .+ DENETİM HATA VERDİ/u);
      assert.match(h.stderr, /\n✖ is\/durum\/durum_devir\.sar:\d+:\d+ \[bilinmeyen-tip\]/u, "motorun hata satırları aktarılmadı");
      assert.match(h.stderr, ozet, `${dil} kipinde hata özeti düştü`);
    }
    writeFileSync(devir, devirMetni, "utf8");
    // Sözdizimi hatası: motor özet basmadan durur; kapı yine kapanır ve iki sürüm aynı satırları aktarır.
    writeFileSync(plan, `${readFileSync(plan, "utf8")}\nBozuk((\n`, "utf8");
    const sozdizim = kapiEsligi(kok, yaz, motorlu("tr"), "sözdizimi hatası");
    assert.equal(sozdizim.kod, 2);
    assert.match(sozdizim.stderr, /\[söz-dizim\]/u);
  } finally {
    sil();
  }
});

test("kanca ayarı kabuksuz uçtan uca: yer tutucu yerine konup node doğrudan çağrılınca iki kanca da çalışır (boşluklu kök)", { timeout: 120_000 }, () => {
  const { kok, sil } = kancaliKok("sarmal kanca bosluklu ");
  try {
    const ayar = JSON.parse(readFileSync(join(kok, ".claude", "settings.json"), "utf8")) as
      { hooks: Record<string, Array<{ hooks: Array<{ command: string; args: string[] }> }>> };
    const env = ortam({ CLAUDE_PROJECT_DIR: kok, [SARMAL_KOK_DEGISKENI]: SARMAL_KURULUM_KOKU, SARMAL_DIL: "tr" });
    // Yürütücünün kabuksuz biçimi: yer tutucu düz dize olarak yerine konur, komut PATH'ten çözülür.
    const cagir = (olay: string, girdi: unknown): Sonuc => {
      const k = ayar.hooks[olay][0].hooks[0];
      const s = spawnSync(k.command, k.args.map((a) => a.replaceAll("${CLAUDE_PROJECT_DIR}", kok)),
        { input: JSON.stringify(girdi), encoding: "utf8", env, timeout: 90_000 });
      return { kod: s.status, stdout: s.stdout, stderr: s.stderr };
    };
    const yeni = join(kok, `yeni${ILAN}`);
    assert.equal(reddedildiMi(cagir("PreToolUse", { tool_name: "Write", cwd: kok, tool_input: { file_path: yeni } })), true,
      "elle anadizin yazımı reddedilmedi");
    assert.equal(reddedildiMi(cagir("PreToolUse", { tool_name: "Bash", cwd: kok, tool_input: { command: `echo "kök > yeni${ILAN}" >> not.md` } })), false,
      "metinde anılan ad reddedildi");
    const sonra = cagir("PostToolUse", { tool_name: "Write", cwd: kok, tool_input: { file_path: join(kok, "is", "plan", "faz", "1_dogus.sar") } });
    assert.equal(sonra.kod, 0, sonra.stderr);
    assert.match(baglam(sonra), /^🚪✅ sarmal-kapı · .+ · ── ÖZET: 0 hata · 1 uyarı ──$/u, "kaynak yazımından sonra denetim koşmadı");
  } finally {
    sil();
  }
});
