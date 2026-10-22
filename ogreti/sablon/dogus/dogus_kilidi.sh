#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════════
# dogus-kilidi.sh — 🚪 DOĞUŞ KİLİDİ (PreToolUse · Write | Edit | Bash)
#   Doğuş paketi üretti: {{TARIH}} · kök: {{AD}}
#
#   HÜKÜM. Yeni bir varlık kökü (`*_anadizin.sar`) ELLE YAZILMAZ; onu Sarmal'ın
#   doğuş paketi yazar. Var olan bir giriş ilanını düzenlemek serbesttir, çünkü
#   kilidin koruduğu şey dosyanın içeriği değil ağacın DOĞUŞ SIRASIDIR.
#
#   KABUK SÜRÜMÜ (HTR-DOGUS-WINDOWS-KANCALARI · 2026-10-22). Doğuş paketi yeni
#   köklere bu kilidin Node karşılığını (dogus_kilidi.mjs) kurar, çünkü Node
#   sürümü Windows'ta da çalışır. Bu dosya POSIX başvuru sürümüdür ve daha önce
#   doğmuş köklerin elle tazelenmesi için yaşar. İki sürüm aynı girdiye aynı
#   çıkış kodunu ve aynı tanıyı verir; aşağıdaki awk çözücüsü Node sürümündeki
#   algoritmanın adım adım karşılığıdır ve eşlik doğuş paketinin sınamasında
#   iki sürüme aynı senaryolar verilerek ölçülür.
#
#   HEDEF YALNIZ GERÇEK YAZIM YOLUNDAN ÇIKARILIR (HTR-DOGUS-KILIDI-BELGE-METNI).
#   Önceki sürüm komut metnindeki tırnakları silip metnin TAMAMINDA desen
#   arıyordu; bu yüzden bir dosyaya düz metin ekleyen ve metninde bir giriş
#   ilanının adını yalnızca ANAN komut, yeni ilan yazımı sanılıp reddediliyordu.
#   Kilit artık komutu kabuğun kurallarıyla sözcüklere ayırır:
#     ① Tırnak içindeki metin tek bir sözcüktür ve VERİDİR; içindeki `>`, `;`,
#        `|` ya da `touch` hiçbir yazım hedefi kurmaz. Tırnaksız `->` ise kabukta
#        `-` sözcüğü ile gerçek bir `>` yönlendirmesidir ve dosyayı yazar.
#     ② Belge gövdesi (`<<ETİKET` ile açılan satırlar) komut değildir ve sökülür.
#     ③ Yazım hedefini yalnız tırnak DIŞINDAKİ yönlendirme işleci (`>`, `>>`,
#        `>|`, `&>`, `2>` ve benzerleri) ile `tee`, `touch`, `cp`, `mv` ve
#        `install` komutlarının dosya argümanları kurar.
#     ④ Kod taşıyan bölgeler ayrıca çözülür: `$( )`, ters tırnak, `<( )`,
#        `sh -c` ile `bash -c` betikleri ve `eval` argümanları kendi başına bir
#        komut gibi okunur; gerçek bir yazım orada saklanamaz.
#     ⑤ Çözülemeyen adres ölçülmüş sayılmaz: kabuk değişkeni ya da joker taşıyan
#        yol ile üst dizini diskte bulunmayan göreli yol GEÇİRİLİR; kilit
#        ölçtüğünü reddeder, tahmin ettiğini değil.
#   Hedefler satır satır yürünür; boşluk taşıyan bir yol artık parçalanmaz ve
#   parçalarından biri yüzünden yanlış ret doğmaz.
#
#   ARIZA-GÜVENLİ: `jq` yoksa kilit sessizce çekilir; kapı bir aracın önünde
#   asla kendi arızasıyla durmaz.
# ═══════════════════════════════════════════════════════════════════════════
command -v jq >/dev/null 2>&1 || exit 0

G=$(cat)
TOOL=$(printf '%s' "$G" | jq -r '.tool_name // ""' 2>/dev/null)
CWD=$(printf '%s' "$G" | jq -r '.cwd // ""' 2>/dev/null); [ -n "$CWD" ] || CWD="$PWD"
NL='
'

HEDEFLER=""
case "$TOOL" in
  Write|Edit)
    # Araç yolu kendisi bildirir: burada tahmin yoktur, hedef doğrudan okunur.
    H=$(printf '%s' "$G" | jq -r '.tool_input.file_path // ""' 2>/dev/null)
    case "$H" in *"$NL"*) exit 0 ;; *_anadizin.sar) HEDEFLER="$H" ;; *) exit 0 ;; esac ;;
  Bash)
    CMD=$(printf '%s' "$G" | jq -r '.tool_input.command // ""' 2>/dev/null)
    printf '%s' "$CMD" | grep -q '_anadizin\.sar' || exit 0
    HEDEFLER=$(printf '%s' "$CMD" | LC_ALL=C awk '
      BEGIN {
        SONEK = "_anadizin.sar"; SINIR = 8
        ISLECBASI = ";&|<>()"
        OZEL = " \t\n;&|()<>\\\047\"$`"
        split(">,>>,>|,&>,&>>,>&,<>", g, ","); for (x in g) CIKIS[g[x]] = 1
        split("<,<&,<<,<<-,<<<", g, ","); for (x in g) GIRDI[g[x]] = 1
        split("!,{,},if,then,else,elif,fi,do,done,while,until", g, ","); for (x in g) AYRILMIS[g[x]] = 1
        split("sudo,env,command,builtin,exec,nohup,time", g, ","); for (x in g) SARMA[g[x]] = 1
        split("sh,bash,zsh,dash,ksh", g, ","); for (x in g) KABUK[g[x]] = 1
        split("<<,>>,>|,>&,<&,<>,&>,&&,||,|&,;;", g, ","); for (x in g) ISLEC2[g[x]] = 1
        split("<<<,<<-,&>>", g, ","); for (x in g) ISLEC3[g[x]] = 1
      }
      { girdi = (NR == 1) ? $0 : girdi "\n" $0 }
      END {
        kk = 1; kuyruk[1] = girdi; kd[1] = 0
        for (q = 1; q <= kk; q++) if (kd[q] <= SINIR) coz(kuyruk[q], kd[q])
        for (q = 1; q <= hn; q++) print hedef[q]
      }

      function parca(a, b) { return (b >= a) ? substr(M, a, b - a + 1) : "" }
      function kuyrugaEkle(a, b) { kk++; kuyruk[kk] = parca(a, b); kd[kk] = DER + 1 }
      function sonraki(k, x) { while (k <= n && ch[k] != x) k++; return k }
      function backtickSonu(k,   j) {
        j = k
        while (j <= n) { if (ch[j] == "\\") { j += 2; continue } if (ch[j] == "`") return j; j++ }
        return n + 1
      }
      function ciftTirnakAtla(j) {
        j++
        while (j <= n && ch[j] != "\"") { if (ch[j] == "\\") j += 2; else j++ }
        return j + 1
      }
      function kapanisBul(k, ac, kapa,   d, j, c) {
        d = 0; j = k
        while (j <= n) {
          c = ch[j]
          if (c == "\\") { j += 2; continue }
          if (c == "\047") { j = sonraki(j + 1, "\047") + 1; continue }
          if (c == "\"") { j = ciftTirnakAtla(j); continue }
          if (c == "`") { j = backtickSonu(j + 1) + 1; continue }
          if (c == ac) d++
          else if (c == kapa) { d--; if (d == 0) return j }
          j++
        }
        return n + 1
      }
      function islecOku(i,   u) {
        u = parca(i, i + 2); if (u in ISLEC3) return u
        u = parca(i, i + 1); if (u in ISLEC2) return u
        return ch[i]
      }
      function genislemeMi(k) { return (ch[k] == "`" || (ch[k] == "$" && k < n && (ch[k + 1] == "(" || ch[k + 1] == "{"))) }
      function genisletme(k,   j) {
        if (ch[k] == "`") { j = backtickSonu(k + 1); kuyrugaEkle(k + 1, j - 1); KD = KD parca(k, j); return j + 1 }
        if (ch[k + 1] == "{") { j = kapanisBul(k + 1, "{", "}"); KD = KD parca(k, j); return j + 1 }
        j = kapanisBul(k + 1, "(", ")")
        if (!(k + 2 <= n && ch[k + 2] == "(")) kuyrugaEkle(k + 2, j - 1)
        KD = KD parca(k, j); return j + 1
      }
      function ciftTirnak(k,   c, d, j) {
        while (k <= n) {
          c = ch[k]
          if (c == "\"") return k + 1
          if (c == "\\") {
            if (k < n) {
              d = ch[k + 1]
              if (d == "$" || d == "`" || d == "\"" || d == "\\") { KD = KD d; k += 2; continue }
              if (d == "\n") { k += 2; continue }
            }
            KD = KD "\\"; k++; continue
          }
          if (genislemeMi(k)) { k = genisletme(k); continue }
          j = k
          while (j <= n && ch[j] != "\"" && ch[j] != "\\" && ch[j] != "$" && ch[j] != "`") j++
          if (j == k) { KD = KD c; k++; continue }
          KD = KD parca(k, j - 1); k = j
        }
        return k
      }
      function kelimeOku(i,   c, j, yr, kosu) {
        KD = ""; KIO = 0; yr = 1
        while (i <= n) {
          c = ch[i]
          if (c == " " || c == "\t" || c == "\n") break
          if (c == ";" || c == "&" || c == "|" || c == "(" || c == ")") break
          if (c == "<" || c == ">") {
            if (i < n && ch[i + 1] == "(") {
              j = kapanisBul(i + 1, "(", ")"); kuyrugaEkle(i + 2, j - 1)
              KD = KD parca(i, j); i = j + 1; yr = 0; continue
            }
            KIO = (yr && length(KD) > 0)
            break
          }
          if (c == "\\") {
            if (i < n) { if (ch[i + 1] == "\n") { i += 2; continue } KD = KD ch[i + 1]; i += 2; yr = 0; continue }
            KD = KD "\\"; i++; yr = 0; continue
          }
          if (c == "\047") { j = sonraki(i + 1, "\047"); KD = KD parca(i + 1, j - 1); i = j + 1; yr = 0; continue }
          if (c == "\"") { i = ciftTirnak(i + 1); yr = 0; continue }
          if (genislemeMi(i)) { i = genisletme(i); yr = 0; continue }
          if (c == "$") { KD = KD "$"; i++; yr = 0; continue }
          j = i
          while (j <= n && index(OZEL, ch[j]) == 0) j++
          kosu = parca(i, j - 1)
          if (kosu ~ /[^0-9]/) yr = 0
          KD = KD kosu; i = j
        }
        return i
      }
      function heredocAtla(i,   h, e, satir) {
        for (h = 1; h <= hdn; h++) {
          while (i <= n) {
            e = i
            while (e <= n && ch[e] != "\n") e++
            satir = parca(i, e - 1)
            i = e + 1
            if (hs[h]) sub(/^\t+/, "", satir)
            if (satir == hd[h]) break
          }
        }
        hdn = 0
        return i
      }
      function taban(w,   t) { t = w; sub(/.*\//, "", t); return t }
      function hedefEkle(w,   L, S) {
        L = length(w); S = length(SONEK)
        if (L < S || substr(w, L - S + 1) != SONEK) return
        if (index(w, "\n") > 0 || (w in GORULDU)) return
        GORULDU[w] = 1; hn++; hedef[hn] = w
      }
      function komutBitir(   b, w, t, ad, j, m, on, ciz, s) {
        b = 1
        while (b <= an) {
          w = av[b]
          if (w ~ /^[A-Za-z_][A-Za-z0-9_]*=/ || (w in AYRILMIS)) { b++; continue }
          t = taban(w)
          if (t in SARMA) {
            b++
            while (b <= an && (av[b] ~ /^-/ || av[b] ~ /^[A-Za-z_][A-Za-z0-9_]*=/)) b++
            continue
          }
          break
        }
        if (b > an) return
        ad = taban(av[b])
        if (ad == "tee" || ad == "touch" || ad == "cp" || ad == "mv" || ad == "install") {
          on = 0; ciz = 0
          for (j = b + 1; j <= an; j++) {
            w = av[j]
            if (!ciz && w == "--") { ciz = 1; continue }
            if (!ciz && w ~ /^-/) continue
            on++; opr[on] = w
          }
          if (ad == "tee" || ad == "touch") { for (j = 1; j <= on; j++) hedefEkle(opr[j]) }
          else if (on >= 2) hedefEkle(opr[on])
        } else if (ad in KABUK) {
          for (j = b + 1; j <= an; j++) {
            if (av[j] ~ /^-[^-]/ && index(av[j], "c") > 0) {
              for (m = j + 1; m <= an; m++) if (av[m] !~ /^-/) { kk++; kuyruk[kk] = av[m]; kd[kk] = DER + 1; break }
              break
            }
          }
        } else if (ad == "eval") {
          if (an > b) { s = av[b + 1]; for (j = b + 2; j <= an; j++) s = s " " av[j]; kk++; kuyruk[kk] = s; kd[kk] = DER + 1 }
        }
      }
      function yuru(   k, op) {
        an = 0
        for (k = 1; k <= tn; k++) {
          if (tt[k] == "I") {
            op = tv[k]
            if (op in CIKIS) { if (k < tn && tt[k + 1] == "K") { hedefEkle(tv[k + 1]); k++ } continue }
            if (op in GIRDI) { if (k < tn && tt[k + 1] == "K") k++; continue }
            komutBitir(); an = 0; continue
          }
          an++; av[an] = tv[k]
        }
        komutBitir()
      }
      function coz(metin, derin,   i, c, op) {
        M = metin; DER = derin
        n = split(metin, ch, "")
        tn = 0; hdn = 0
        i = 1
        while (i <= n) {
          c = ch[i]
          if (c == " " || c == "\t") { i++; continue }
          if (c == "\\" && i < n && ch[i + 1] == "\n") { i += 2; continue }
          if (c == "\n") { tn++; tt[tn] = "I"; tv[tn] = "\n"; i++; if (hdn > 0) i = heredocAtla(i); continue }
          if (c == "#") { while (i <= n && ch[i] != "\n") i++; continue }
          if (index(ISLECBASI, c) > 0 && !((c == "<" || c == ">") && i < n && ch[i + 1] == "(")) {
            op = islecOku(i); i += length(op)
            tn++; tt[tn] = "I"; tv[tn] = op
            if (op == "<<" || op == "<<-") {
              while (i <= n && (ch[i] == " " || ch[i] == "\t")) i++
              if (i <= n && ch[i] != "\n" && index(ISLECBASI, ch[i]) == 0) {
                i = kelimeOku(i)
                hdn++; hd[hdn] = KD; hs[hdn] = (op == "<<-")
                tn++; tt[tn] = "K"; tv[tn] = KD
              }
            }
            continue
          }
          i = kelimeOku(i)
          if (!KIO) { tn++; tt[tn] = "K"; tv[tn] = KD }
        }
        yuru()
      }')
    [ -n "$HEDEFLER" ] || exit 0 ;;
  *) exit 0 ;;
esac

IFS="$NL"
set -f
for H in $HEDEFLER; do
  # ⑤ Adres çözülemiyorsa ölçüm yoktur; kilit tahmine dayanarak reddetmez.
  case "$H" in
    *'$'*|*'*'*|*'?'*) continue ;;
    /*) T="$H" ;;
    *)  T="$CWD/$H"; [ -d "$(dirname "$T")" ] || continue ;;
  esac
  [ -f "$T" ] && continue   # var olan giriş ilanını düzenlemek serbesttir

  NEDEN="🚪 sarmal-kapı · DOĞUŞ KİLİDİ: yeni bir varlık kökü elle yazılmaz ($T diskte yok). Sarmal'ın doğuş paketi yazar: önce mcp__sarmal__basla{tur} rehberini oku, sonra mcp__sarmal__dogus{hedef, tur: proje|calisma-alani, proje} çağır, sonra mcp__sarmal__denetle-proje ile ölç. Var olan bir giriş ilanını düzenlemek serbesttir."
  jq -n --arg r "$NEDEN" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
done
exit 0
