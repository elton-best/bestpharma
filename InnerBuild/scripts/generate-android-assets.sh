#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_RES="$ROOT_DIR/android/app/src/main/res"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick (convert) est requis pour générer les assets Android." >&2
  exit 1
fi

# Master raster assets. The matching editable SVG sources live in resources/android.
convert -size 1024x1024 xc:none \
  -fill '#101828' -stroke none -draw 'roundrectangle 0,0 1023,1023 238,238' \
  -fill none -stroke '#FFFFFF' -strokewidth 102 -draw "path 'M 282,525 L 448,691 L 742,320'" \
  -fill '#EA580C' -stroke none -draw 'circle 742,320 818,320' \
  -fill '#EA580C' -draw 'roundrectangle 282,768 640,840 36,36' \
  "$TMP_DIR/icon.png"

convert -size 1024x1024 xc:none \
  -fill '#101828' -stroke none -draw 'circle 512,512 1024,512' \
  -fill none -stroke '#FFFFFF' -strokewidth 102 -draw "path 'M 282,525 L 448,691 L 742,320'" \
  -fill '#EA580C' -stroke none -draw 'circle 742,320 818,320' \
  -fill '#EA580C' -draw 'roundrectangle 282,768 640,840 36,36' \
  "$TMP_DIR/icon-round.png"

convert -size 432x432 xc:none \
  -fill '#101828' -stroke none -draw 'roundrectangle 88,88 344,344 60,60' \
  -fill none -stroke '#FFFFFF' -strokewidth 25.5 -draw "path 'M 158.5,219.3 L 200,260.8 L 273.5,168'" \
  -fill '#EA580C' -stroke none -draw 'circle 273.5,168 292.5,168' \
  -fill '#EA580C' -draw 'roundrectangle 158.5,280 248,298 9,9' \
  "$TMP_DIR/icon-foreground.png"

declare -A LAUNCHER_SIZES=(
  [mdpi]=48
  [hdpi]=72
  [xhdpi]=96
  [xxhdpi]=144
  [xxxhdpi]=192
)

declare -A FOREGROUND_SIZES=(
  [mdpi]=108
  [hdpi]=162
  [xhdpi]=216
  [xxhdpi]=324
  [xxxhdpi]=432
)

for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  output_dir="$ANDROID_RES/mipmap-$density"
  mkdir -p "$output_dir"
  launcher_size="${LAUNCHER_SIZES[$density]}"
  foreground_size="${FOREGROUND_SIZES[$density]}"

  convert "$TMP_DIR/icon.png" -resize "${launcher_size}x${launcher_size}" "$output_dir/ic_launcher.png"
  convert "$TMP_DIR/icon-round.png" -resize "${launcher_size}x${launcher_size}" "$output_dir/ic_launcher_round.png"
  convert "$TMP_DIR/icon-foreground.png" -resize "${foreground_size}x${foreground_size}" "$output_dir/ic_launcher_foreground.png"
done

# Splash lockup: intentionally avoids text so it remains sharp and language-neutral.
convert -size 800x800 xc:'#FAFAF9' \
  \( "$TMP_DIR/icon.png" -resize 360x360 \) -gravity center -geometry +0-34 -composite \
  -fill '#EA580C' -stroke none -draw 'roundrectangle 310,590 490,602 6,6' \
  "$TMP_DIR/splash-lockup.png"

generate_splash() {
  local output="$1"
  local width="$2"
  local height="$3"
  local shortest="$width"
  if (( height < width )); then shortest="$height"; fi
  local lockup_size=$((shortest * 80 / 100))

  mkdir -p "$(dirname "$output")"
  convert "$TMP_DIR/splash-lockup.png" \
    -resize "${lockup_size}x${lockup_size}" \
    -gravity center \
    -background '#FAFAF9' \
    -extent "${width}x${height}" \
    "$output"
}

# Capacitor's standard splash dimensions for Android densities and orientations.
generate_splash "$ANDROID_RES/drawable/splash.png" 480 320
generate_splash "$ANDROID_RES/drawable-port-mdpi/splash.png" 320 480
generate_splash "$ANDROID_RES/drawable-port-hdpi/splash.png" 480 800
generate_splash "$ANDROID_RES/drawable-port-xhdpi/splash.png" 720 1280
generate_splash "$ANDROID_RES/drawable-port-xxhdpi/splash.png" 960 1600
generate_splash "$ANDROID_RES/drawable-port-xxxhdpi/splash.png" 1280 1920
generate_splash "$ANDROID_RES/drawable-land-mdpi/splash.png" 480 320
generate_splash "$ANDROID_RES/drawable-land-hdpi/splash.png" 800 480
generate_splash "$ANDROID_RES/drawable-land-xhdpi/splash.png" 1280 720
generate_splash "$ANDROID_RES/drawable-land-xxhdpi/splash.png" 1600 960
generate_splash "$ANDROID_RES/drawable-land-xxxhdpi/splash.png" 1920 1280

echo "Icônes et écrans de démarrage Android générés."
