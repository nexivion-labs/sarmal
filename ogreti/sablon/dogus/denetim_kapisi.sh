#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════════
# denetim-kapisi.sh — 🚪 KAYNAK YAZIM KAPISI (PostToolUse · Write | Edit | Bash)
#   Doğuş paketi üretti: {{TARIH}} · kök: {{AD}}
#
#   HÜKÜM. Bir `.sar` dosyasına dokunulduktan sonra denetim İNSAN ÖFKESİYLE
#   değil KANCAYLA koşar. Hata varsa çıktı ajana ZORLA döner (çıkış kodu 2) ve
#   ajan hata varken ikinci bir kaynak dosyası yazamaz; uyarı ile temiz sonuç
#   bilgi olarak döner. Gerekçe ölçülmüştür: kapı atlanabilir olduğu sürece
#   atlanmaktadır ve metinle verilen her uyarı en az yedi kez unutulmuştur.
#
#   KÖK. Denetim bu kökün kendisinde koşar; kökü kancanın yaşadığı yer bildirir,
#   dolayısıyla ajanın o anki çalışma dizini yanlış bir ağacı denetlemeye yol
#   açmaz. Motorun adresi, bu projeyi doğuran Sarmal kurulumundan çözülmüştür.
#
#   ARIZA-GÜVENLİ: `jq`, `node` ya da motor yoksa kapı sessizce çekilir; bir
#   aracın önünde kendi arızasıyla durmaz.
# ═══════════════════════════════════════════════════════════════════════════
MOTOR="{{MOTOR}}"
KOK="${CLAUDE_PROJECT_DIR:-$PWD}"

command -v jq >/dev/null 2>&1 || exit 0
command -v node >/dev/null 2>&1 || exit 0
[ -f "$MOTOR" ] || exit 0

G=$(cat)
TOOL=$(printf '%s' "$G" | jq -r '.tool_name // ""')

# Kapı yalnız GERÇEK bir kaynak dokunuşunda uyanır. Write ve Edit hedefini
# kendisi bildirir; Bash için son iki dakikada değişmiş bir `.sar` dosyası
# aranır, çünkü yazımın hangi kabuk deyimiyle yapıldığı kapıyı ilgilendirmez.
case "$TOOL" in
  Write|Edit)
    H=$(printf '%s' "$G" | jq -r '.tool_input.file_path // ""')
    case "$H" in *.sar) ;; *) exit 0 ;; esac ;;
  Bash)
    CMD=$(printf '%s' "$G" | jq -r '.tool_input.command // ""')
    printf '%s' "$CMD" | grep -q '\.sar' || exit 0
    # Değişiklik tarihi ile birlikte durum tarihi de okunur: yeniden adlandırma
    # (ör. bir dosyaya mühür yazmak) değişiklik tarihini korur, yalnız durum
    # tarihini günceller; yalnız birincisine bakan kapı mühürlemeyi hiç görmezdi.
    DEGISEN=$(find "$KOK" -maxdepth 8 -name '*.sar' \( -mmin -2 -o -cmin -2 \) \
      -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | head -1)
    [ -n "$DEGISEN" ] || exit 0 ;;
  *) exit 0 ;;
esac

# YENİ MÜHÜR GÖRÜNÜR BİR OLAYDIR (MIM-3.4). Son iki dakikada adına arşiv, eğitim
# ya da sonra mührü yazılmış bir `.sar` dosyası varsa kapı onu adıyla bildirir;
# mühür meşru bir beyandır ve kapıyı durdurmaz, fakat sessiz de geçemez.
MUHUR=$(find "$KOK" -maxdepth 8 -name '@*@_*.sar' -cmin -2 \
  -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | sed "s|^$KOK/||" | head -8 | tr '\n' ' ')
[ -n "$MUHUR" ] && MUHUR=" · 📛 yeni mühür: $MUHUR"

LOG=$(mktemp)
if node "$MOTOR" denetle "$KOK" >"$LOG" 2>&1; then
  OZET=$(grep -E 'ÖZET:|Yapı temiz' "$LOG" | head -1)
  printf '%s' "🚪✅ sarmal-kapı · $KOK · ${OZET:-denetim temiz}$MUHUR" \
    | jq -Rs '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:.}}'
  rm -f "$LOG"
  exit 0
fi

{
  echo "✖ sarmal-kapı · $KOK · DENETİM HATA VERDİ — hata varken ikinci kaynak dosyası yazılmaz, önce düzelt:$MUHUR"
  grep -E '^✖' "$LOG" | head -12
  grep -E 'ÖZET:' "$LOG" | head -1
} >&2
rm -f "$LOG"
exit 2
