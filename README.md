# Genfamap

A map for https://genfanad.com, found on https://genfamap.com

Genfamap.com query parameters
- `?location=true` - display player location marker
- `?test=true` - use `test.js` client, should be identical to standard client
unless someone is developing in prod.

## crawler

A python script for crawler genfanad client files and building map images.

Note: on genfanad updates, requires changing the `CACHE_VERSION` variable.

### crawl

`./scrape.py crawl <region>` where region is the region name used in genfanad
resource urls. e.g. world, world2, dungeon, fairy.

this will download a bunch of files into `./files/<version>/<region>/`.

### render

`./scrape.py render <region> <out filename>` renders downloaded map
content into a world map png.

Note: for some reason, dungeon region (-1, 2) is an empty region marked as
all white on the minimap. When rendering a new map for updated version, this
region's data file should be deleted.

### walkable

`./scrape.py walkable <region>` prints to stdout a 2d array representing
walkable and non walkablle terrain of region.

This data should be indexed as `array[y + abs(miny)][x + abs(minx)]` where x and
y are a point in genfanad, and minx and miny are the minimum x and y values of
the specific region. So for the main world, that would be
`array[y + 128][x + 256]` as of version 0.110. The offsets will change if new
regions are added east or north of the current map.

### imgfetch

`./scrape.py imgfetch <region>` Pulls icon images referenced from resource files,
and attempts to download them.

These are stored in `./files/img`.


### fetch

`./scrape.py fetch <region> <x> <y>` downloads only a specific region of
genfanad data. Where 0, 0 is zamok region.

- `--nocache` ignores and overwrites any files saved locally
- `--cachev <version>` download an older cache version

### icons

deprecated

`./scrape.py icons <regions ...>` outputs a json blob of minimap icons, used
for an old version of the map before this was loaded from the backend api.

## service

A werkzeug and sqlite based python service for serving the site, infra runs with
uwsgi behind nginx.

- serving base map pages
- database for storing map data (monsters, locations, etc.)
- api for querying this map data
- api for admins
  - create auth tokens for admins/editor
  - add new monsters, locations to the map
  - edit existing map content

### how to run

- setup venv
  - install werkzeug, sqlite, and pysqlcipher
  - create a `secrets.py` file that simply defines secret bytes object 
    - `COOKIE_SECRET # b'asdf'`
  - `./server.py`

## map.js

The actual map client, based on leaflet. Serves a static 2D map of genfanad
and renders custom map markers on top.

Includes editor tools to make changes to the map in-client.

