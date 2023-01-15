#!/usr/bin/env python3
from typing import (
    Any,
    Dict,
    Optional,
)
from PIL import Image, ImageDraw

import requests
import zipfile
import pathlib
import pprint
import time
import json
import os


CACHE_DIR = 'files'
CACHE_VERSION = '0.112'
STATIC_ENDPOINT = f'https://genfanad-static.s3.us-east-2.amazonaws.com/versioned/{CACHE_VERSION}/data_client'
IMAGES_DIR = 'img'
HTML_DIR = 'html'

WSIZE = 128
# TODO: why is calculated size 129?

KNOWN_SEGMENTS = {
    'world': {
        (-1, 0),
        (-1, 1),
        (-1, 2),
        (-2, 2),
        ( 0, 0),
        ( 0, 1),
        ( 0, 2),
        ( 0, 3),
        ( 1,-1),
        ( 1, 0),
        ( 1, 1),
        ( 2, 0),
        ( 2, 1),
        ( 3,-1),
        ( 3, 0),
        ( 3, 1),
    },
    'world2': {
        (2, -1),
    },
    'dungeon': {
        (-1, 1),
        (-2, 2),
        ( 0, 0),
        ( 0, 1),
        ( 0, 3),
        ( 1, 0),
        ( 3, 1),
    },
    'fairy': {
        (-1, 0),
        ( 0, 0),
        ( 0, 1),
        ( 1, 0),
        ( 1, 1),
    },
}


def update_known_segments():
    regions = os.listdir(os.path.join(CACHE_DIR, CACHE_VERSION))
    for region in regions:
        if region not in KNOWN_SEGMENTS:
            KNOWN_SEGMENTS[region] = set()
        segments_dir = os.path.join(CACHE_DIR, CACHE_VERSION, region)
        for filename in os.listdir(segments_dir):
            if filename.endswith('.zip'):
                coords = tuple(map(int, filename.split('.')[0].split('_')))
                assert len(coords) == 2
                KNOWN_SEGMENTS[region].add(coords)


_invalid_icons = set()


def staticURI(path: str) -> str:
    return f'{STATIC_ENDPOINT}/{path}'


def minimapURI(path: str) -> str:
    return f'{STATIC_ENDPOINT}/img/minimap/{path}'


def get_minimap_icon(name: str) -> Optional[str]:
    if name in _invalid_icons:
        return None

    filename = f'{name}.png'
    cached_file = os.path.join(CACHE_DIR, IMAGES_DIR, filename)
    if not os.path.exists(cached_file):
        uri = minimapURI(filename)
        print(f'fetching {uri}')
        response = requests.get(uri)
        if response.status_code == 200 and isinstance(response.content, bytes):
            print(f'writing to {cached_file}')
            with open(cached_file, 'wb') as f:
                f.write(response.content)
            return cached_file
    else:
        return cached_file

    # fall through to here when request fails
    print(f'invalid icon: {name}')
    _invalid_icons.add(name)
    return None


def get_minimap_icons(datafile: str) -> None:
    with open(datafile) as f:
        parsed_data = json.load(f)
    points = parsed_data.get('pointsOfInterest', [])
    for point in points:
        icon = point.get('icon')
        if icon:
            get_minimap_icon(icon)


def get_segment_zip(
    region: str,
    x: int,
    y: int,
    check_cache=True,
    cache_version=CACHE_VERSION,
) -> Optional[bytes]:
    data: Optional[bytes] = None
    from_cache = False

    filename = os.path.join(region, f'{x}_{y}.zip')
    cache_file = os.path.join(CACHE_DIR, cache_version, filename)
    cache_dir = os.path.dirname(cache_file)
    if not os.path.exists(cache_dir):
        pathlib.Path(cache_dir).mkdir(parents=True, exist_ok=True)

    if check_cache:
        if os.path.exists(cache_file):
            from_cache = True
            with open(cache_file, 'rb') as f:
                data = f.read()

    # not cached
    if data is None:
        uri = staticURI(filename)
        print(f'fetching {uri}')
        response = requests.get(
            uri,
            params = {
                'cache': CACHE_VERSION,
            },
        )
        if response.status_code == 200 and isinstance(response.content, bytes):
            data = response.content
        else:
            print(f'failed to load: {filename}')

    if data is not None and not from_cache:
        with open(cache_file, 'wb') as f:
            f.write(data)

    if data is not None:
        with zipfile.ZipFile(cache_file, 'r') as zf:
            with zf.open('combined.json', 'r') as f:
                jsondata = f.read().decode('utf-8')
            outfile = os.path.join(cache_dir, f'{x}_{y}_combined.json')
            with open(outfile, 'w') as f:
                f.write(json.dumps(
                    json.loads(jsondata),
                    indent=2,
                ))

    return data


def get_segment_data(
    region: str,
    x: int,
    y: int,
    cache_version=CACHE_VERSION,
) -> Optional[Dict[str, Any]]:
    filename = os.path.join(region, f'{x}_{y}_combined.json')
    cache_file = os.path.join(CACHE_DIR, cache_version, filename)
    if os.path.exists(cache_file):
        with open(cache_file) as f:
            return json.load(f)
    return None


def cmd_crawl(args):
    visited = set()

    update_known_segments()
    todo = set(KNOWN_SEGMENTS.get(args.region, []))
    todo.add((0, 0))

    if args.region in ('world1', 'dungeon'):
        # dungeon and other world levels will overlap with
        # the world, so preload all those segments
        for segment in KNOWN_SEGMENTS['world']:
            todo.add(segment)
    elif args.region == 'world2':
        # same with world1 and world2
        for segment in KNOWN_SEGMENTS['world1']:
            todo.add(segment)

    while len(todo):
        pos = todo.pop()
        visited.add(pos)

        try:
            data = get_segment_zip(
                args.region,
                pos[0],
                pos[1],
            )
            if data is not None:
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        newpos = (pos[0] + dx, pos[1] + dy)
                        if newpos not in visited:
                            todo.add(newpos)
        except Exception as e:
            print(f'error: {e}')
            raise e

        time.sleep(1)


def cmd_imgfetch(args):
    region = args.region
    cache_path = os.path.join(CACHE_DIR, CACHE_VERSION, region)
    files = os.listdir(cache_path)
    for filename in files:
        if filename.endswith('_combined.json'):
            get_minimap_icons(os.path.join(cache_path, filename))
            time.sleep(0.5)


def cmd_segment(args):
    data = get_segment_zip(
        args.region,
        args.x,
        args.y,
        check_cache = not args.nocache,
        cache_version = args.cachev,
    )


def get_dimensions(map_files):
    sw = 0
    sh = 0

    mminx = 100
    mmaxx = 0
    mminy = 100
    mmaxy = 0

    # first calc each dimension
    for filename, data in map_files.items():
        if sw == 0:
            sh = len(data['mesh'])
            sw = max(map(len, data['mesh']))
        else:
            assert sh == len(data['mesh'])
            assert sw == max(map(len, data['mesh']))

        xs, ys, _ = filename.split('_')
        x = int(xs)
        y = int(ys)

        if x < mminx:
            mminx = x
        if x > mmaxx:
            mmaxx = x
        if y < mminy:
            mminy = y
        if y > mmaxy:
            mmaxy = y

    offsetx = 0
    offsety = 0

    if mminx < 0:
        offsetx = abs(mminx)

    if mminy < 0:
        offsety = abs(mminy)

    mmaxx += offsetx
    mminx += offsetx
    mmaxy += offsety
    mminy += offsety

    return (
        sw,
        sh,
        mminx,
        mmaxx,
        mminy,
        mmaxy,
        offsetx,
        offsety,
    )


def get_map_files(region):
    cache_path = os.path.join(CACHE_DIR, CACHE_VERSION, region)
    files = os.listdir(cache_path)

    map_files = {}
    for filename in files:
        if filename.endswith('_combined.json'):
            with open(os.path.join(cache_path, filename)) as f:
                map_files[filename] = json.load(f)
    return map_files



def cmd_render(args):
    region = args.region
    map_files = get_map_files(region)
    (sw,
     sh,
     mminx,
     mmaxx,
     mminy,
     mmaxy,
     offsetx,
     offsety) = get_dimensions(map_files)

    mdx = (mmaxx - mminx) + 1
    mdy = (mmaxy - mminy) + 1

    # TODO: segment w/h should be 128, but for some reason all of the
    #       arrays have 129 elements. Some hacks below to fix this
    sw = WSIZE
    sh = WSIZE

    print(f'world size: {mdx}x{mdy}')
    print(f'segment size: {sw}x{sh}')

    bgcolor = (255, 255, 255, 0)
    if region in ('dungeon', 'world1'):
        bgcolor = (0, 0, 0, 255)
    img = Image.new(
        mode='RGBA',
        size=(mdx * sw, mdy * sh),
        color=bgcolor,
    )
    pixels = img.load()

    for filename, data in map_files.items():
        xs, ys, _ = filename.split('_')
        wx = int(xs) + offsetx
        wy = int(ys) + offsety

        mesh = data['mesh']
        for x, row in enumerate(mesh):
            if x == sw: break

            for y, tile in enumerate(row):
                if y == sh: break

                if 'water.png' in (tile.get('texture1'), tile.get('texture2')):
                    color = (43, 144, 217, 255)
                else:
                    cc = tile['minimapColor'] if 'minimapColor' in tile else tile['color']
                    mod = 0.7 if tile.get('shadow', False) else 1.0
                    color = (
                        int(cc['r'] * mod),
                        int(cc['g'] * mod),
                        int(cc['b'] * mod),
                        255,
                    )
                xx = (wx * sw) + x
                yy = (wy * sh) + y
                try:
                    pixels[xx, yy] = color
                except Exception as e:
                    print(f'{(xs, ys)} at {(wx, wy)}-{(x, y)} pos={(xx, yy)}')
                    raise e

    # scale up to 5 (same as in game)
    scale_size = 5
    img = img.resize(
        (img.width * scale_size, img.height * scale_size),
        Image.NEAREST,
    )

    draw = ImageDraw.Draw(img)

    # draw walls
    for filename, data in map_files.items():
        xs, ys, _ = filename.split('_')
        wx = int(xs) + offsetx
        wy = int(ys) + offsety

        mesh = data['mesh']
        for x, row in enumerate(mesh):
            if x == sw : break

            for y, tile in enumerate(row):
                if y == sh: break

                buildings = tile.get('buildings')
                if buildings is None: continue
                level = buildings.get('level0')
                if level is None: continue
                walls = level.get('walls')
                if walls is None: continue

                xx = ((wx * sw) + x) * scale_size
                yy = ((wy * sh) + y) * scale_size
                color = (255, 255, 255)
                for wall in walls:
                    if wall.get('type', '').startswith('doorframe'): continue
                    pos = wall.get('position')
                    if pos == 'plusx':
                        draw.line(((xx, yy), (xx + 5, yy)), color, 1)
                    elif pos == 'plusy':
                        draw.line(((xx, yy), (xx, yy + 5)), color, 1)
                    elif pos == 'diaga':
                        draw.line(((xx, yy), (xx + 5, yy + 5)), color, 1)
                    elif pos == 'diagb':
                        draw.line(((xx, yy + 5), (xx + 5, yy)), color, 1)

    # # unique objects
    # objects = data['uniqueObjects']
    # for name, objdata in objects.items():
    #     for x in range(WSIZE):
    #         for y in range(WSIZE):
    #             tile = objdata['']

    # preload icon images
    # icon_images = {}
    # for filename in os.listdir(os.path.join(CACHE_DIR, IMAGES_DIR)):
    #     if filename.endswith('.png'):
    #         icon = filename.split('.')[0]
    #         icon_images[icon] = Image.open(open(
    #             os.path.join(CACHE_DIR, IMAGES_DIR, filename),
    #             'rb',
    #         ))

    # # add icons
    # for filename, data in map_files.items():
    #     xs, ys, _ = filename.split('_')
    #     wx = int(xs) + offsetx
    #     wy = int(ys) + offsety

    #     points = data.get('pointsOfInterest', [])
    #     for point in points:
    #         x = int(point['x'])
    #         y = int(point['y'])
    #         icon_img = icon_images.get(point['icon'])
    #         if icon_img is not None:
    #             # the x and y in points are global coords
    #             xx = ((x + offsetx * sw) * scale_size) - 8
    #             yy = ((y + offsety * sh) * scale_size) - 8
    #             draw.rectangle(
    #                 ((xx - 1, yy - 1), (xx + 16, yy + 16)),
    #                 fill = (0, 0, 0),
    #                 outline = (0, 0, 0),
    #                 width = 1,
    #             )
    #             img.paste(icon_img, (xx, yy))

    # scale up some more
    scale_size = 2
    # img = img.resize(
    #     (img.width * scale_size, img.height * scale_size),
    #     Image.NEAREST,
    # ) 

    img.save(args.filename)


def cmd_icons(args):
    regions = args.regions

    zones = args.zones or []
    assert len(zones) % 2 == 0
    zones = [zones[i:i+2] for i in range(0, len(zones), 2)]

    results = {}

    for region in regions:
        results[region] = []

        pathregion = region if region != 'fae' else 'fairy'
        cache_path = os.path.join(CACHE_DIR, CACHE_VERSION, pathregion)
        files = os.listdir(cache_path)

        map_files = {}
        if len(zones) > 0:
            # only selected segments
            for x, y in zones:
                filename = f'{x}_{y}_combined.json'
                filepath = os.path.join(cache_path, filename)
                if not os.path.exists(filepath):
                    continue
                with open(filepath) as f:
                    map_files[filename] = json.load(f)
        else:
            # all segments
            for filename in files:
                if filename.endswith('_combined.json'):
                    with open(os.path.join(cache_path, filename)) as f:
                        map_files[filename] = json.load(f)

        mminx = 100
        mmaxx = 0
        mminy = 100
        mmaxy = 0

        # first calc each dimension
        for filename, data in map_files.items():
            xs, ys, _ = filename.split('_')
            x = int(xs)
            y = int(ys)

            if x < mminx:
                mminx = x
            if x > mmaxx:
                mmaxx = x
            if y < mminy:
                mminy = y
            if y > mmaxy:
                mmaxy = y

        offsetx = 0
        offsety = 0

        if mminx < 0:
            offsetx = abs(mminx)

        if mminy < 0:
            offsety = abs(mminy)

        mmaxx += offsetx
        mminx += offsetx
        mmaxy += offsety
        mminy += offsety

        mdx = (mmaxx - mminx) + 1
        mdy = (mmaxy - mminy) + 1

        sw = WSIZE
        sh = WSIZE

        # add icons

        icons = {}
        markers = []

        for filename, data in map_files.items():
            if region == 'dungeon':
                # TODO: find out why dungeon is broken
                # TODO: fae might be too
                break

            xs, ys, _ = filename.split('_')
            wx = int(xs)
            wy = -1 * int(ys)

            points = data.get('pointsOfInterest', [])
            for point in points:
                icon = point['icon']

                # global points
                gx = int(point['x'])
                gy = int(point['y'])

                # global to local
                lx = gx % sw
                ly = gy % sh

                # again, invert the Ys
                ly = (sh - ly) - 1

                dx = wx + (lx / sw)
                dy = wy + (ly / sh)

                group = ''
                popup = '';
                quest = point.get('quest')
                store = point.get('store')
                type_ = point.get('type', '')

                if quest is not None:
                    popup = quest
                    group = 'quest'
                elif store is not None:
                    if store.startswith('location'):
                        popup = store.split('-')[-1]
                    elif store.startswith('skill'):
                        popup = store.split('-', 1)[1]
                    elif store.startswith('tutorial'):
                        popup = store.split('-', 2)[2]
                    group = 'shop'
                elif type_.startswith('skill-'):
                    _, skill, popup = type_.split('-', 2)
                    popup = popup.split('-')[-1]
                    group = skill
                elif icon == 'bank':
                    group = 'bank'

                if group == '':
                    raise ValueError('no group!')

                results[region].append((dx, dy, icon, group, popup))

    print('icons = ', end='')
    pprint.pprint(results)


def cmd_walkable(args):
    region = args.region
    map_files = get_map_files(region)
    (sw,
     sh,
     mminx,
     mmaxx,
     mminy,
     mmaxy,
     offsetx,
     offsety) = get_dimensions(map_files)

    mdx = (mmaxx - mminx) + 1
    mdy = (mmaxy - mminy) + 1

    # TODO: segment w/h should be 128, but for some reason all of the
    #       arrays have 129 elements. Some hacks below to fix this
    sw = WSIZE
    sh = WSIZE

    walk_data = []
    for y in range(mdy * sh):
        row = []
        for x in range(mdx * sw):
            row.append(0)
        walk_data.append(row)

    # print((mdx, mdy, sw, sh))
    # print(f'world size: {mdx}x{mdy}')
    # print(f'segment size: {sw}x{sh}')
    # print(f'array size: {mdy * sh}x{mdx * sw}')

    for filename, data in map_files.items():
        xs, ys, _ = filename.split('_')
        wx = int(xs) + offsetx
        wy = int(ys) + offsety

        mesh = data['mesh']
        for x, row in enumerate(mesh):
            if x == sw: break

            for y, tile in enumerate(row):
                if y == sh: break

                if tile['walkable'] == True:
                    xx = (wx * sw) + x
                    yy = (wy * sh) + y
                    try:
                        walk_data[yy][xx] = 1
                    except Exception as e:
                        print(f'{(xs, ys)} at {(wx, wy)}-{(x, y)} pos={(xx, yy)}')
                        raise e

    print(walk_data)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parsers = parser.add_subparsers()

    cmd = parsers.add_parser('crawl')
    cmd.add_argument('region', type=str)
    cmd.set_defaults(func=cmd_crawl)

    cmd = parsers.add_parser(f'imgfetch')
    cmd.add_argument('region', type=str)
    cmd.set_defaults(func=cmd_imgfetch)

    cmd = parsers.add_parser('fetch')
    cmd.add_argument('region', type=str)
    cmd.add_argument('x', type=int)
    cmd.add_argument('y', type=int)
    cmd.add_argument('--nocache', action='store_true')
    cmd.add_argument('--cachev', type=str, default=CACHE_VERSION)
    cmd.set_defaults(func=cmd_segment)

    cmd = parsers.add_parser('render')
    cmd.add_argument('region', type=str)
    cmd.add_argument('filename', type=str)
    cmd.set_defaults(func=cmd_render)

    cmd = parsers.add_parser('icons')
    cmd.add_argument('regions', type=str, nargs='+')
    cmd.add_argument('--zones', type=int, nargs='+')
    cmd.set_defaults(func=cmd_icons)

    cmd = parsers.add_parser('walkable')
    cmd.add_argument('region', type=str)
    cmd.set_defaults(func=cmd_walkable)

    args = parser.parse_args()
    if hasattr(args, 'func') and args.func:
        args.func(args)
