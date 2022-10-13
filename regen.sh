#!/bin/bash

cd crawler

# echo 'crawling map files'
# python3 scrape.py crawl world

# echo 'downloading asets'
# python3 scrape.py imgfetch world
# cp -r files/img/* html/icons/

# echo 'generating maps'
# python3 scrape.py render world world.png
# python3 scrape.py render fairy fae.png
# python3 scrape.py render dungeon dungeon.png
# cp *.png ../html/

echo 'generating javascript'
cp ../html/original.map.js ../html/map.js
python3 scrape.py icons world >> ../html/map.js
echo '            break;' >> ../html/map.js

python3 scrape.py icons fairy >> ../html/map.js
echo '            break;' >> ../html/map.js

python3 scrape.py icons dungeon >> ../html/map.js
echo '            break;' >> ../html/map.js
echo '    }' >> ../html/map.js
echo '}' >> ../html/map.js

cd ..

# echo 'installing'
cp -r html/* /var/www/genfamap/
