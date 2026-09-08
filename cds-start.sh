#!/bin/bash
sleep 60s
bash ~/chresolution.sh mirror-sxga
cds_url="file:///home/adminl/cds-monitoring-board-kat/index.html"
x=1
while [ $x -le 5 ]; do
#     --no-first-run
    echo 'start CDS'
    chromium --kiosk --disable-translate $cds_url
    sleep 7s
    x=$(( $x + 1 ))
done
