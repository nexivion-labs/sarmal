#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// dogus-kilidi.mjs — 🚪 DOĞUŞ KİLİDİ (PreToolUse · Write | Edit | Bash)
//   Doğuş paketi üretti: {{TARIH}} · kök: {{AD}}
//
//   HÜKÜM. Yeni bir varlık kökü (`*_anadizin.sar`) ELLE YAZILMAZ; onu Sarmal'ın
//   doğuş paketi yazar. Var olan bir giriş ilanını düzenlemek serbesttir, çünkü
//   kilidin koruduğu şey dosyanın içeriği değil ağacın DOĞUŞ SIRASIDIR.
//
//   İŞLETİM SİSTEMİNDEN BAĞIMSIZDIR (HTR-DOGUS-WINDOWS-KANCALARI · 2026-10-22).
//   Bu dosya kabuk sürümünün (ogreti/sablon/dogus/dogus_kilidi.sh) Node ile
//   yazılmış karşılığıdır ve yalnız Node'un yerleşik modüllerini kullanır. Kanca
//   ayarı onu kabuksuz çağırır (`node <betik>`), dolayısıyla Windows'ta Git Bash
//   kurulu olmasa da çalışır. İki sürüm aynı girdiye aynı çıkış kodunu ve aynı
//   tanıyı verir; eşlik, doğuş paketinin sınamasında iki sürüme aynı senaryolar
//   verilerek ölçülür.
//
//   HEDEF YALNIZ GERÇEK YAZIM YOLUNDAN ÇIKARILIR (HTR-DOGUS-KILIDI-BELGE-METNI).
//   Kilidin önceki sürümü komut metnindeki tırnakları silip metnin TAMAMINDA
//   desen arıyordu; bu yüzden bir dosyaya düz metin ekleyen ve metninde bir
//   giriş ilanının adını yalnızca ANAN komut, yeni ilan yazımı sanılıp
//   reddediliyordu. Kilit artık komutu kabuğun kurallarıyla sözcüklere ayırır:
//     ① Tırnak içindeki metin tek bir sözcüktür ve VERİDİR; içindeki `>`, `;`,
//        `|` ya da `touch` hiçbir yazım hedefi kurmaz. Tırnaksız `->` ise kabukta
//        `-` sözcüğü ile gerçek bir `>` yönlendirmesidir ve dosyayı yazar.
//     ② Belge gövdesi (`<<ETİKET` ile açılan satırlar) komut değildir ve sökülür.
//     ③ Yazım hedefini yalnız tırnak DIŞINDAKİ yönlendirme işleci (`>`, `>>`,
//        `>|`, `&>`, `2>` ve benzerleri) ile `tee`, `touch`, `cp`, `mv` ve
//        `install` komutlarının dosya argümanları kurar.
//     ④ Kod taşıyan bölgeler ayrıca çözülür: `$( )`, ters tırnak, `<( )`,
//        `sh -c` ile `bash -c` betikleri ve `eval` argümanları kendi başına bir
//        komut gibi okunur; gerçek bir yazım orada saklanamaz.
//     ⑤ Çözülemeyen adres ölçülmüş sayılmaz: kabuk değişkeni ya da joker taşıyan
//        yol ile üst dizini diskte bulunmayan göreli yol GEÇİRİLİR; kilit
//        ölçtüğünü reddeder, tahmin ettiğini değil.
//
//   WINDOWS YOLLARI. Windows'ta sürücü harfli (`C:\…`, `C:/…`), UNC (`\\sunucu\…`)
//   ve Git Bash biçimli (`/c/…`) yollar mutlak sayılır; göreli yol çalışma
//   dizinine eklenir. Öteki sistemlerde yalnız `/` ile başlayan yol mutlaktır;
//   bu, kabuk sürümünün davranışıyla birebir aynıdır.
//
//   ARIZA-GÜVENLİ: girdi okunamazsa kilit sessizce çekilir; kapı bir aracın
//   önünde asla kendi arızasıyla durmaz.
// ═══════════════════════════════════════════════════════════════════════════
import { statSync } from "node:fs";
import { basename, posix, win32 } from "node:path";
import { fileURLToPath } from "node:url";

/** Giriş ilanının dosya adı soneki. */
export const ILAN_SONEKI = "_anadizin.sar";

/** İç içe kod bölgelerinin en fazla kaç kat çözüleceği. */
const DERINLIK_SINIRI = 8;

/** Bir işlecin başlayabileceği karakterler. */
const ISLEC_BASI = ";&|<>()";
/** Sıradan bir sözcük koşusunu kesen karakterler. */
const OZEL = " \t\n;&|()<>\\'\"$`";
/** Uzundan kısaya işleçler; ilk eşleşen alınır. */
const ISLEC3 = ["<<<", "<<-", "&>>"];
const ISLEC2 = ["<<", ">>", ">|", ">&", "<&", "<>", "&>", "&&", "||", "|&", ";;"];
/** Ardından gelen sözcüğü YAZIM HEDEFİ yapan yönlendirmeler. */
const CIKIS = new Set([">", ">>", ">|", "&>", "&>>", ">&", "<>"]);
/** Ardından gelen sözcüğü tüketen fakat yazmayan yönlendirmeler. */
const GIRDI = new Set(["<", "<&", "<<", "<<-", "<<<"]);
/** Komut adından önce atlanan ayrılmış sözcükler. */
const AYRILMIS = new Set(["!", "{", "}", "if", "then", "else", "elif", "fi", "do", "done", "while", "until"]);
/** Asıl komutu argüman olarak taşıyan sarmalayıcılar. */
const SARMALAYICI = new Set(["sudo", "env", "command", "builtin", "exec", "nohup", "time"]);
/** `-c` ile betik alan kabuklar. */
const KABUKLAR = new Set(["sh", "bash", "zsh", "dash", "ksh"]);
const ATAMA = /^[A-Za-z_][A-Za-z0-9_]*=/;

/**
 * Bir kabuk komutunun YAZIM HEDEFLERİNİ çıkarır (saf). Dönen liste yalnız giriş
 * ilanı sonekiyle biten hedefleri, ilk görünüş sırasıyla ve tekrarsız taşır.
 * Kabuk sürümündeki awk çözücüsü aynı algoritmayı aynı sırayla uygular.
 */
export function hedefleriCikar(komut) {
  const hedefler = [];
  const goruldu = new Set();
  const hedefEkle = (w) => {
    if (!w.endsWith(ILAN_SONEKI) || w.includes("\n") || goruldu.has(w)) return;
    goruldu.add(w);
    hedefler.push(w);
  };
  const kuyruk = [[komut, 0]];
  for (let q = 0; q < kuyruk.length; q++) {
    const [metin, derin] = kuyruk[q];
    if (derin <= DERINLIK_SINIRI) metniCoz(metin, derin, kuyruk, hedefEkle);
  }
  return hedefler;
}

/** Tek bir metni sözcüklere ayırır, komutlarını yürür ve kod bölgelerini kuyruğa ekler. */
function metniCoz(M, derin, kuyruk, hedefEkle) {
  const n = M.length;
  const tokenlar = [];
  const heredoclar = [];
  let KD = "";
  let KIO = false;

  const parca = (a, b) => (b >= a ? M.slice(a, b + 1) : "");
  const kuyrugaEkle = (a, b) => { kuyruk.push([parca(a, b), derin + 1]); };
  const sonraki = (k, x) => { while (k < n && M[k] !== x) k++; return k; };
  const backtickSonu = (k) => {
    let j = k;
    while (j < n) {
      if (M[j] === "\\") { j += 2; continue; }
      if (M[j] === "`") return j;
      j++;
    }
    return n;
  };
  const ciftTirnakAtla = (j) => {
    j++;
    while (j < n && M[j] !== "\"") j += M[j] === "\\" ? 2 : 1;
    return j + 1;
  };
  const kapanisBul = (k, ac, kapa) => {
    let d = 0;
    let j = k;
    while (j < n) {
      const c = M[j];
      if (c === "\\") { j += 2; continue; }
      if (c === "'") { j = sonraki(j + 1, "'") + 1; continue; }
      if (c === "\"") { j = ciftTirnakAtla(j); continue; }
      if (c === "`") { j = backtickSonu(j + 1) + 1; continue; }
      if (c === ac) d++;
      else if (c === kapa) { d--; if (d === 0) return j; }
      j++;
    }
    return n;
  };
  const islecOku = (i) => {
    const u3 = M.slice(i, i + 3);
    if (ISLEC3.includes(u3)) return u3;
    const u2 = M.slice(i, i + 2);
    if (ISLEC2.includes(u2)) return u2;
    return M[i];
  };
  /** `$(`, `${` ya da ters tırnakla başlayan bölgeyi sözcüğe ekler; komut bölgesini kuyruğa koyar. */
  const genisletme = (k) => {
    if (M[k] === "`") {
      const j = backtickSonu(k + 1);
      kuyrugaEkle(k + 1, j - 1);
      KD += parca(k, j);
      return j + 1;
    }
    if (M[k + 1] === "{") {
      const j = kapanisBul(k + 1, "{", "}");
      KD += parca(k, j);
      return j + 1;
    }
    const j = kapanisBul(k + 1, "(", ")");
    if (!(k + 2 < n && M[k + 2] === "(")) kuyrugaEkle(k + 2, j - 1);   // $(( )) aritmetiktir, komut değil
    KD += parca(k, j);
    return j + 1;
  };
  const genislemeMi = (k) => M[k] === "`" || (M[k] === "$" && k + 1 < n && (M[k + 1] === "(" || M[k + 1] === "{"));

  const ciftTirnak = (k) => {
    while (k < n) {
      const c = M[k];
      if (c === "\"") return k + 1;
      if (c === "\\") {
        if (k + 1 < n) {
          const d = M[k + 1];
          if (d === "$" || d === "`" || d === "\"" || d === "\\") { KD += d; k += 2; continue; }
          if (d === "\n") { k += 2; continue; }
        }
        KD += "\\"; k++; continue;
      }
      if (genislemeMi(k)) { k = genisletme(k); continue; }
      let j = k;
      while (j < n && M[j] !== "\"" && M[j] !== "\\" && M[j] !== "$" && M[j] !== "`") j++;
      if (j === k) { KD += c; k++; continue; }
      KD += parca(k, j - 1);
      k = j;
    }
    return k;
  };

  const kelimeOku = (i) => {
    KD = "";
    KIO = false;
    let yr = true;   // sözcük şimdiye dek yalnız tırnaksız rakamdan mı oluştu (2> gibi)
    while (i < n) {
      const c = M[i];
      if (c === " " || c === "\t" || c === "\n") break;
      if (c === ";" || c === "&" || c === "|" || c === "(" || c === ")") break;
      if (c === "<" || c === ">") {
        if (i + 1 < n && M[i + 1] === "(") {
          const j = kapanisBul(i + 1, "(", ")");
          kuyrugaEkle(i + 2, j - 1);
          KD += parca(i, j);
          i = j + 1; yr = false; continue;
        }
        KIO = yr && KD.length > 0;
        break;
      }
      if (c === "\\") {
        if (i + 1 < n) {
          if (M[i + 1] === "\n") { i += 2; continue; }
          KD += M[i + 1]; i += 2; yr = false; continue;
        }
        KD += "\\"; i++; yr = false; continue;
      }
      if (c === "'") {
        const j = sonraki(i + 1, "'");
        KD += parca(i + 1, j - 1);
        i = j + 1; yr = false; continue;
      }
      if (c === "\"") { i = ciftTirnak(i + 1); yr = false; continue; }
      if (genislemeMi(i)) { i = genisletme(i); yr = false; continue; }
      if (c === "$") { KD += "$"; i++; yr = false; continue; }
      let j = i;
      while (j < n && !OZEL.includes(M[j])) j++;
      const kosu = parca(i, j - 1);
      if (/[^0-9]/.test(kosu)) yr = false;
      KD += kosu;
      i = j;
    }
    return i;
  };

  const heredocAtla = (i) => {
    for (const [etiket, sekme] of heredoclar) {
      while (i < n) {
        let e = i;
        while (e < n && M[e] !== "\n") e++;
        let satir = parca(i, e - 1);
        i = e + 1;
        if (sekme) satir = satir.replace(/^\t+/, "");
        if (satir === etiket) break;
      }
    }
    heredoclar.length = 0;
    return i;
  };

  // ── sözcüklere ayırma ──
  let i = 0;
  while (i < n) {
    const c = M[i];
    if (c === " " || c === "\t") { i++; continue; }
    if (c === "\\" && i + 1 < n && M[i + 1] === "\n") { i += 2; continue; }
    if (c === "\n") {
      tokenlar.push(["I", "\n"]);
      i++;
      if (heredoclar.length > 0) i = heredocAtla(i);
      continue;
    }
    if (c === "#") { while (i < n && M[i] !== "\n") i++; continue; }
    if (ISLEC_BASI.includes(c) && !((c === "<" || c === ">") && i + 1 < n && M[i + 1] === "(")) {
      const op = islecOku(i);
      i += op.length;
      tokenlar.push(["I", op]);
      if (op === "<<" || op === "<<-") {
        while (i < n && (M[i] === " " || M[i] === "\t")) i++;
        if (i < n && M[i] !== "\n" && !ISLEC_BASI.includes(M[i])) {
          i = kelimeOku(i);
          heredoclar.push([KD, op === "<<-"]);
          tokenlar.push(["K", KD]);
        }
      }
      continue;
    }
    i = kelimeOku(i);
    if (!KIO) tokenlar.push(["K", KD]);
  }

  // ── komutları yürüme ──
  let argv = [];
  const komutBitir = () => {
    let b = 0;
    while (b < argv.length) {
      const w = argv[b];
      if (ATAMA.test(w) || AYRILMIS.has(w)) { b++; continue; }
      if (SARMALAYICI.has(taban(w))) {
        b++;
        while (b < argv.length && (argv[b].startsWith("-") || ATAMA.test(argv[b]))) b++;
        continue;
      }
      break;
    }
    if (b >= argv.length) return;
    const ad = taban(argv[b]);
    const args = argv.slice(b + 1);
    if (ad === "tee" || ad === "touch") {
      for (const w of operandlar(args)) hedefEkle(w);
    } else if (ad === "cp" || ad === "mv" || ad === "install") {
      const o = operandlar(args);
      if (o.length >= 2) hedefEkle(o[o.length - 1]);
    } else if (KABUKLAR.has(ad)) {
      const j = args.findIndex((w) => /^-[^-]/.test(w) && w.includes("c"));
      if (j >= 0) {
        const betik = args.slice(j + 1).find((w) => !w.startsWith("-"));
        if (betik !== undefined) kuyruk.push([betik, derin + 1]);
      }
    } else if (ad === "eval") {
      if (args.length > 0) kuyruk.push([args.join(" "), derin + 1]);
    }
  };
  for (let k = 0; k < tokenlar.length; k++) {
    const [tur, deger] = tokenlar[k];
    if (tur === "I") {
      if (CIKIS.has(deger)) {
        if (k + 1 < tokenlar.length && tokenlar[k + 1][0] === "K") { hedefEkle(tokenlar[k + 1][1]); k++; }
        continue;
      }
      if (GIRDI.has(deger)) {
        if (k + 1 < tokenlar.length && tokenlar[k + 1][0] === "K") k++;
        continue;
      }
      komutBitir();
      argv = [];
      continue;
    }
    argv.push(deger);
  }
  komutBitir();
}

/** Komut adının son eğik çizgiden sonraki parçası (`/bin/cp` → `cp`). */
function taban(w) {
  return w.slice(w.lastIndexOf("/") + 1);
}

/** Seçenek olmayan argümanlar; `--` sonrası her şey argümandır. */
function operandlar(args) {
  const o = [];
  let ciz = false;
  for (const w of args) {
    if (!ciz && w === "--") { ciz = true; continue; }
    if (!ciz && w.startsWith("-")) continue;
    o.push(w);
  }
  return o;
}

/** Diskteki gerçek dosya sistemi; sınamalar Windows yollarını sahte bir sistemle ölçer. */
export const GERCEK_DISK = {
  dosyaMi: (y) => { try { return statSync(y).isFile(); } catch { return false; } },
  dizinMi: (y) => { try { return statSync(y).isDirectory(); } catch { return false; } },
};

/**
 * Hedeflerden ilk REDDEDİLECEK olanı bulur (saf; disk erişimi `disk` ile verilir).
 * Dönen değer reddin gerekçesindeki yoldur; reddedilecek hedef yoksa `undefined`.
 */
export function reddedilecekYol(hedefler, cwd, platform = process.platform, disk = GERCEK_DISK) {
  const windows = platform === "win32";
  for (const ham of hedefler) {
    if (/[$*?]/.test(ham)) continue;   // ⑤ adres çözülemiyorsa ölçüm yoktur
    let h = ham;
    if (windows) {
      const g = /^\/([A-Za-z])(\/|$)/.exec(h);   // Git Bash biçimi: /c/… → C:/…
      if (g) h = `${g[1].toUpperCase()}:/${h.slice(3)}`;
    }
    let t;
    if (windows ? win32.isAbsolute(h) : h.startsWith("/")) {
      t = h;
    } else {
      t = `${cwd}/${h}`;
      if (!disk.dizinMi((windows ? win32 : posix).dirname(t))) continue;
    }
    if (disk.dosyaMi(t)) continue;   // var olan giriş ilanını düzenlemek serbesttir
    return t;
  }
  return undefined;
}

/** `jq -r '… // ""'` ile kabuğun komut yerine koymasının birleşik karşılığı. */
function jqMetni(v) {
  if (v === undefined || v === null || v === false) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v, null, 2);
  return s.replace(/\n+$/u, "");
}

/** Kancanın girdisinden reddedilecek yolu bulur; geçen girdide `undefined` döner. */
export function karar(girdi, varsayilanCwd, platform = process.platform, disk = GERCEK_DISK) {
  const g = girdi !== null && typeof girdi === "object" ? girdi : {};
  const arac = jqMetni(g.tool_name);
  const cwd = jqMetni(g.cwd) || varsayilanCwd;
  const girdiAlani = g.tool_input !== null && typeof g.tool_input === "object" ? g.tool_input : {};
  let hedefler;
  if (arac === "Write" || arac === "Edit") {
    // Araç yolu kendisi bildirir: burada tahmin yoktur, hedef doğrudan okunur.
    const h = jqMetni(girdiAlani.file_path);
    if (!h.endsWith(ILAN_SONEKI) || h.includes("\n")) return undefined;
    hedefler = [h];
  } else if (arac === "Bash") {
    const komut = jqMetni(girdiAlani.command);
    if (!komut.includes(ILAN_SONEKI)) return undefined;
    hedefler = hedefleriCikar(komut);
  } else {
    return undefined;
  }
  return reddedilecekYol(hedefler, cwd, platform, disk);
}

/** Reddin kanca çıktısı; jq'nun biçimiyle bayt bayt aynıdır. */
export function retCiktisi(yol) {
  const cikti = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `🚪 sarmal-kapı · DOĞUŞ KİLİDİ: yeni bir varlık kökü elle yazılmaz (${yol} diskte yok). Sarmal'ın doğuş paketi yazar: önce mcp__sarmal__basla{tur} rehberini oku, sonra mcp__sarmal__dogus{hedef, tur: proje|calisma-alani, proje} çağır, sonra mcp__sarmal__denetle-proje ile ölç. Var olan bir giriş ilanını düzenlemek serbesttir.`,
    },
  };
  return `${JSON.stringify(cikti, null, 2).replace(/\u007f/gu, "\\u007f")}\n`;
}

/**
 * Kabuğun `$PWD` değeri: ortamdaki PWD bu dizini gösteriyorsa odur (sembolik
 * bağlantılı yol korunur), göstermiyorsa fiziksel çalışma dizinidir.
 */
export function kabukPwd() {
  const fiziksel = process.cwd();
  const ortam = process.env.PWD;
  if (ortam && ortam.startsWith("/")) {
    try {
      const a = statSync(ortam);
      const b = statSync(fiziksel);
      if (a.dev === b.dev && a.ino === b.ino) return ortam;
    } catch { /* PWD geçersizse fiziksel dizin kullanılır */ }
  }
  return fiziksel;
}

async function ana() {
  let metin = "";
  try {
    process.stdin.setEncoding("utf8");
    for await (const parca of process.stdin) metin += parca;
  } catch {
    return;
  }
  let girdi;
  try { girdi = JSON.parse(metin); } catch { return; }
  const yol = karar(girdi, kabukPwd());
  if (yol !== undefined) process.stdout.write(retCiktisi(yol));
}

/** Betik kanca olarak mı koşuyor, yoksa bir sınama tarafından mı yüklendi. */
function anaModulMu() {
  const arg = process.argv[1];
  if (arg === undefined) return false;
  return basename(arg).toLowerCase() === basename(fileURLToPath(import.meta.url)).toLowerCase();
}

if (anaModulMu()) await ana();
