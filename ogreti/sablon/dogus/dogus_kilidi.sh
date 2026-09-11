#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════════
# dogus-kilidi.sh — 🚪 DOĞUŞ KİLİDİ (PreToolUse · Write | Edit | Bash)
#   Doğuş paketi üretti: {{TARIH}} · kök: {{AD}}
#
#   HÜKÜM. Yeni bir varlık kökü (`*_anadizin.sar`) ELLE YAZILMAZ; onu Sarmal'ın
#   doğuş paketi yazar. Var olan bir giriş ilanını düzenlemek serbesttir, çünkü
#   kilidin koruduğu şey dosyanın içeriği değil ağacın DOĞUŞ SIRASIDIR.
#
#   ÖLÇÜM, TAHMİN DEĞİL (2026-09-09 onarımı). Kilidin ilk sürümü komut METNİNDE
#   giriş ilanı desenini gördüğü an reddediyordu ve desenin gerçekten bir yazım
#   HEDEFİ olup olmadığını hiç ölçmüyordu. Kontrolcü, proje dışındaki bir çalışma
#   notuna yazarken bu retle karşılaştı: not deseni yalnızca ANIYORDU. Aynı sürüm
#   göreli yolu o anki çalışma dizinine yapıştırıp var olmayan bir adres uyduruyor
#   ve reddin gerekçesi olarak o uydurma adresi yazıyordu. Onarım üç kuraldır:
#     ① Belge gövdesi komut değildir. Buradaki `<<ETİKET` gövdeleri sökülür,
#        çünkü onların içindeki her şey kabuğa VERİ olarak gider.
#     ② Ok işareti yönlendirme değildir. `-> dosya` yazan bir cümle hedef
#        bildirmez; yalnız `>`, `>>`, `tee`, `cp`, `mv`, `install` ve `touch`
#        gerçek yazım hedefi kurar.
#     ③ Çözülemeyen adres ölçülmüş sayılmaz. Kabuk değişkeni ya da joker taşıyan
#        yol ile üst dizini diskte bulunmayan göreli yol GEÇİRİLİR; kilit
#        ölçtüğünü reddeder, tahmin ettiğini değil.
#
#   ARIZA-GÜVENLİ: `jq` yoksa kilit sessizce çekilir; kapı bir aracın önünde
#   asla kendi arızasıyla durmaz.
# ═══════════════════════════════════════════════════════════════════════════
command -v jq >/dev/null 2>&1 || exit 0

G=$(cat)
TOOL=$(printf '%s' "$G" | jq -r '.tool_name // ""')
CWD=$(printf '%s' "$G" | jq -r '.cwd // ""'); [ -n "$CWD" ] || CWD="$PWD"

HEDEFLER=""
case "$TOOL" in
  Write|Edit)
    # Araç yolu kendisi bildirir: burada tahmin yoktur, hedef doğrudan okunur.
    H=$(printf '%s' "$G" | jq -r '.tool_input.file_path // ""')
    case "$H" in *_anadizin.sar) HEDEFLER="$H" ;; *) exit 0 ;; esac ;;
  Bash)
    CMD=$(printf '%s' "$G" | jq -r '.tool_input.command // ""')
    printf '%s' "$CMD" | grep -q '_anadizin\.sar' || exit 0

    # ① Tırnaklar düşürülür (hedef ayıklaması tırnaktan bağımsızdır) ve heredoc
    #    GÖVDELERİ sökülür; gövde satırları komut değil veridir.
    KOMUT=$(printf '%s\n' "$CMD" | tr -d '\047"' | awk '
      BEGIN { icinde = 0; etiket = "" }
      {
        satir = $0
        if (icinde) {
          bitis = satir
          gsub(/^[ \t]+/, "", bitis)
          if (bitis == etiket) { icinde = 0; etiket = "" }
          next
        }
        print satir
        kalan = satir
        while (match(kalan, /<<-?[ \t]*[A-Za-z_][A-Za-z0-9_]*/)) {
          parca = substr(kalan, RSTART, RLENGTH)
          kalan = substr(kalan, RSTART + RLENGTH)
          sub(/^<<-?[ \t]*/, "", parca)
          etiket = parca
          icinde = 1
        }
      }')

    # ② Gerçek yazım hedefleri: yönlendirme, tee, cp/mv/install son argümanı, touch.
    #    Yönlendirme deseninin önündeki karakter sınıfı `->` okunu, `=>` okunu ve
    #    dosya tanıtıcılı yönlendirmeyi (`2>`, `&>`) dışarıda bırakır.
    Y1=$(printf '%s\n' "$KOMUT" | grep -oE '(^|[^-=<>&0-9])>>?[[:space:]]*[^[:space:]<>|;()&]*_anadizin\.sar' | sed -E 's/.*>>?[[:space:]]*//')
    Y2=$(printf '%s\n' "$KOMUT" | grep -oE '[[:space:]]tee([[:space:]]+-[a-zA-Z]+)*[[:space:]]+[^[:space:]<>|;()&]*_anadizin\.sar' | sed -E 's/.*[[:space:]]//')
    Y3=$(printf '%s\n' "$KOMUT" | tr ';&|' '\n\n\n' | sed -nE 's/^[[:space:]]*(cp|mv|install)[[:space:]].*[[:space:]]([^[:space:]]*_anadizin\.sar)[[:space:]]*$/\2/p')
    Y4=$(printf '%s\n' "$KOMUT" | tr ';&|' '\n\n\n' | sed -nE '/^[[:space:]]*touch[[:space:]]/p' | grep -oE '[^[:space:]]*_anadizin\.sar')
    HEDEFLER=$(printf '%s\n%s\n%s\n%s\n' "$Y1" "$Y2" "$Y3" "$Y4" | sed '/^$/d' | sort -u)
    [ -n "$HEDEFLER" ] || exit 0 ;;
  *) exit 0 ;;
esac

for H in $HEDEFLER; do
  # ③ Adres çözülemiyorsa ölçüm yoktur; kilit tahmine dayanarak reddetmez.
  case "$H" in
    *'$'*|*'*'*|*'?'*) continue ;;
    /*) T="$H" ;;
    *)  T="$CWD/$H"; [ -d "$(dirname "$T")" ] || continue ;;
  esac
  [ -f "$T" ] && continue   # var olan giriş ilanını düzenlemek serbesttir

  jq -n --arg y "$T" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:("🚪 sarmal-kapı · DOĞUŞ KİLİDİ: yeni bir varlık kökü elle yazılmaz (" + $y + " diskte yok). Sarmal-ın doğuş paketi yazar: önce mcp__sarmal__basla{tur} rehberini oku, sonra mcp__sarmal__dogus{hedef, tur: proje|calisma-alani, proje} çağır, sonra mcp__sarmal__denetle-proje ile ölç. Var olan bir giriş ilanını düzenlemek serbesttir.")}}'
  exit 0
done
exit 0
