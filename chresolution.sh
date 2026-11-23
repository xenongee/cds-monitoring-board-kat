#!/bin/bash
set -euo pipefail

usage() {
    printf '%s\n' \
        "Usage: $0 MODE" \
        "  mirror-fhd        VGA primary, mirrored at 1920x1080" \
        "  mirror-sxga       VGA primary, mirrored at 1280x1024" \
        "  extend-left-fhd   LVDS1 primary, VGA1 left, 1920x1080" \
        "  extend-left-sxga  LVDS1 primary, VGA1 left, 1280x1024" \
        "  extend-right-fhd  LVDS1 primary, VGA1 right, 1920x1080" \
        "  extend-right-sxga LVDS1 primary, VGA1 right, 1280x1024"
}

if [ "$#" -ne 1 ]; then
    usage >&2
    exit 2
fi

case "$1" in
    mirror-fhd)
        xrandr --output LVDS1 --scale-from 1920x1080 --mode 1280x800 \
            --output VGA1 --mode 1920x1080 --primary
        description="VGA primary, all displays 1920x1080, mirroring"
        ;;
    mirror-sxga)
        xrandr --output LVDS1 --scale-from 1280x1024 --mode 1280x800 \
            --output VGA1 --mode 1280x1024 --primary
        description="VGA primary, all displays 1280x1024, mirroring"
        ;;
    extend-left-fhd)
        xrandr --output LVDS1 --scale 1x1 --mode 1280x800 --primary \
            --output VGA1 --mode 1920x1080 --left-of LVDS1
        description="LVDS1 primary, LVDS1 1280x800, VGA1 1920x1080, VGA1 left of LVDS1"
        ;;
    extend-left-sxga)
        xrandr --output LVDS1 --scale 1x1 --mode 1280x800 --primary \
            --output VGA1 --mode 1280x1024 --left-of LVDS1
        description="LVDS1 primary, LVDS1 1280x800, VGA1 1280x1024, VGA1 left of LVDS1"
        ;;
    extend-right-fhd)
        xrandr --output LVDS1 --scale 1x1 --mode 1280x800 --primary \
            --output VGA1 --mode 1920x1080 --right-of LVDS1
        description="LVDS1 primary, LVDS1 1280x800, VGA1 1920x1080, VGA1 right of LVDS1"
        ;;
    extend-right-sxga)
        xrandr --output LVDS1 --scale 1x1 --mode 1280x800 --primary \
            --output VGA1 --mode 1280x1024 --right-of LVDS1
        description="LVDS1 primary, LVDS1 1280x800, VGA1 1280x1024, VGA1 right of LVDS1"
        ;;
    *)
        usage >&2
        exit 2
        ;;
esac

printf 'Display Info: %s\n' "$description"
