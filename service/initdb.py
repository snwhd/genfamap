from database import Database, DATE_FORMAT

BOSS_NAMES = [
    "Ogre Wife",
    "Ogre Husband",
    "Jack",
    "Colossal Viscosity"
]

def init():
    with Database() as db:
        db.create_tables()


def default_data():
    with Database() as db:
        db.insert('INSERT INTO users VALUES (NULL, "dan", "admin", "")')
        db.insert_map('world')
        db.insert_map('fae')
        db.insert_map('dungeon')


def do_monsters():
    monsters =  {
        "world": [
            [ "Leaf Boy", 12, [1.50, 1.20] ],
    
            [ "Goblin with Mace", 16, [0.70, 1.10] ],
            [ "Goblin",    12, [0.95, 0.85] ],
            [ "Goblin",    12, [0.70, 1.05] ],
            [ "Pig",        0, [0.95, 0.45] ], 
            [ "Fennec Fox", 9, [0.85, 0.15] ],
    
            [ "Green Slime", 4, [0.30, 0.70] ],
            [ "Green Slime", 2, [0.00, 0.70] ],
            [ "Bandit", 22, [-0.05, 0.00] ],
            [ "Rat",     6, [-0.05, 0.10] ],
            [ "Rat",     6, [0.15, 0.10] ],
            [ "Chicken", 1, [0.30, 0.05] ],
            [ "Cow",     8, [0.40, 0.30] ],
            [ "Chicken", 1, [0.15, 0.45] ],
            [ "Rat",     6, [0.30, 1.00] ],
            [ "Giant Spider", 10, [0.45, 1.30] ],
            [ "River Crab",   12, [0.45, 1.45] ],
            [ "Mega Chicken", 16, [0.15, 1.00] ],
    
            [ "Unicorn",           24, [0.95, -0.70] ],
            [ "Bear",              38, [0.80, -0.75] ],
            [ "Wolf",              17, [0.60, -0.75] ],
            [ "Hog",               25, [0.50, -0.60] ],
            [ "Red Frog",          16, [0.40, -0.45] ],
            [ "Slime",             36, [0.90, -0.15] ],
            [ "Treefolk",          35, [0.70, -0.15] ],
            [ "Orange Fox",        16, [0.50, -0.20] ],
            [ "Leaf Boy",          20, [0.30, -0.30] ],
            [ "Monsterous Spider", 20, [0.15, -0.20] ],
            [ "Monsterous Spider", 20, [0.15,  -0.90] ],
            [ "Slime",             18, [0.25,  -0.50] ],
            [ "Giant Rat",         13, [0.10, -0.45] ],
    
            [ "Green Slime",           2, [-0.25, 0.35] ],
            [ "Orange Fox",           16, [-0.17, 0.80] ],
            [ "Giant Rat",            13, [-0.50, 0.80] ],
            [ "Chicken",               1, [-0.50, 1.05] ],
            [ "Guard",                27, [-0.30, 1.20] ],
            [ "Cow",                   8, [-0.45, 1.35] ],
            [ "Baby Water Elemental", 11, [-0.20, 1.50] ],
    
            [ "Albino Leech", 17, [-0.15, 1.95] ],
            [ "Frog",         12, [0.11, 1.75] ],
            [ "Mega Chicken", 16, [0.30, 1.90] ],
            [ "Mega Chicken", 16, [0.50, 1.70] ],
            [ "Goblin",       12, [0.55, 1.60] ],
            [ "Harpy Mother", 44, [1.33, 1.80] ],
    
            [ "Jack",         35, [-0.80, -0.40] ],
            [ "Giant Spider", 20, [-0.75, -0.20] ],
            [ "Leopard",      26, [-1.10, -0.15] ],
            [ "Snow Cat",     30, [-1.50, -0.95] ],
    
            [ "Spaniel Dog", 13, [-1.30, 0.70] ],
            [ "Grim Thug",   18, [-1.35, 0.95] ],
            [ "Bandit",      22, [-1.50, 0.95] ],
            [ "Bear",        38, [-0.85, 0.90] ],
    
            [ "Swamp Spider", 27, [-1.55, 0.10] ],
            [ "Forest Owl",   29, [-1.60, 0.05] ],
            [ "Leshii",       20, [-1.75, 0.10] ],
            [ "Doe",          19, [-1.85, 0.30] ],
            [ "Leaf Boy",     20, [-1.70, 0.35] ],
    
    
            [ "Ice Elemental", 32 , [-1.00, -0.75] ],
            [ "Ice Elemental", 32 , [-1.30, -1.00] ],
    
            [ "Panther",               32, [-1.80, -1.25] ],
            [ "Troll",                 34, [-1.85, -1.25] ],
            [ "Treefolk",              35, [-1.90, -1.10] ],
            [ "Shadowstalker Gremlin", 34, [-1.75, -1.10] ],
            [ "Forest Owl",            29, [-1.75, -0.90] ],
    
            [ "Ranger",        42, [-0.70, 2.20] ],
            [ "Skeleton",      36, [-0.50, 2.35] ],
            [ "Zombie",        40, [-0.20, 2.40] ],
            [ "Caer Rabbit",   37, [-0.60, 2.50] ],
            [ "Skeleton",      42, [-0.45, 2.60] ],
            [ "Halloween Bat", 35, [-0.70, 2.75] ],
    
            [ "Ranger",         43, [-0.93, 2.91] ],
            [ "Envious Ghost",  40, [-0.85, 3.28] ],
            [ "Plague Rat",     42, [-0.85, 3.35] ],
            [ "Zombie",         40, [-0.81, 3.55] ],
            [ "Plague Rat",     42, [-0.61, 3.67] ],
            [ "Vengeful Ghost", 35, [-0.53, 3.45] ],
            [ "Plague Rat",     42, [-0.27, 3.44] ],
            [ "Envious Ghost",  40, [-0.13, 3.39] ],
            [ "Ghost",          24, [-0.28, 3.03] ],
            [ "Zombie",         40, [-0.07, 2.51] ],
            [ "Ranger",         43, [0.155, 2.35] ],
            [ "Rogue",          43, [0.43, 2.17] ],
            [ "Ranger",         43, [0.81, 2.63] ],
    
            [ "Shroomy",       50, [0.89, 3.21] ],
            [ "Ghost Crab",    32, [0.77, 2.95] ],
    
            [ "Shroomy",         50, [-2.23, 0.76] ],
            [ "Bandit Chieftan", 53, [-2.49, 0.92] ],
            [ "Blue Minotaur",   49, [-2.78, 0.87] ],
    
            [ "Hobgoblin",   35, [ -0.90, 3.87] ]
    
        ],
    
        "fae": [
            [ "Imp", 47, [0.21, -0.32] ],
            [ "Gremlin", 23, [ 0.30, -0.07] ],
            [ "Snowy Owl", 34, [ 0.17, -0.06] ],
            [ "Pixie", 50, [ 0.03, -0.08] ],
            [ "Pixie", 50, [ 0.24, 0.07] ],
            [ "Pixie", 50, [ 0.11, 0.12] ],
            [ "Icy Goat", 40, [ 0.23,  0.40] ],
            [ "Snowy Owl", 34, [ 0.19,  0.41] ],
            [ "Cyan Ghost", 63, [ 0.13,  0.70] ],
            [ "Shadowstalker Gremlin", 34, [ 0.31,  0.78] ],
            [ "Soulwarden Lich", 30, [ 0.04,  0.78] ],
            [ "Pixie", 50, [ 0.03,  0.96] ],
            [ "Cyan Ghost", 63, [ 0.14,  0.89] ],
            [ "Druid Poet", 49, [ 0.41,  0.78] ],
            [ "Spirit Siphoning Jellyfish", 60, [ 0.53,  0.90] ],
            [ "Sticky Jellyfish", 40, [ 0.66,  0.72] ],
            [ "Enriched Treefolk", 48, [ 0.51,  0.72] ],
            [ "Degraded Treefolk", 55, [ 0.85,  0.46] ],
            [ "Enriched Treefolk", 48, [ 0.85,  0.52] ],
            [ "Treefolk Lord", 67, [ 0.94,  0.44] ],
            [ "Wendigo", 38, [ 0.89,  0.14] ],
            [ "Knight", 53, [ 0.93, -0.07] ],
            [ "Treefolk", 35, [ 0.85, -0.07] ],
            [ "Unicorn", 24, [ 0.93, -0.33] ],
            [ "Colossal Viscosity", 98, [0.78, 0.77] ]
        ],
    
        "dungeon": [
            [ "Crab",             16, [2.27, 0.82] ],
            [ "Rat",              13, [2.62, 0.95] ],
            [ "Cave Crab",        12, [2.54, 0.95] ],
            [ "Red Cave Crab",    23, [2.61, 1.04] ],
            [ "Goblin",           12, [2.52, 0.86] ],
            [ "Armored Goblin",   16, [2.50, 0.87] ],
            [ "Feral Goblin",     23, [2.65, 0.87] ],
            [ "Monstrous Spider", 20, [2.52, 1.03] ],
            [ "Feral Goblin",     23, [2.46, 0.98] ],
            [ "Ogre Wife",        38, [2.39, 0.97] ],
            [ "Ogre Husband",     35, [2.39, 1.00] ],
    
            [ "Mimic",         55, [1.92, -0.28] ],
            [ "Tan Rat",       38, [2.02, -0.21] ],
            [ "Tan Rat",       38, [2.06, -0.14] ],
            [ "Tan Rat",       38, [1.95, -0.15] ],
            [ "Tan Rat",       38, [1.84, -0.14] ],
            [ "Brute Leech",   44, [2.15, -0.08] ],
            [ "Brute Leech",   44, [1.99, -0.10] ],
            [ "Unlucky Miner", 48, [1.98, -0.23] ],
            [ "Unlucky Miner", 48, [2.05,  0.08] ],
            [ "Unlucky Miner", 48, [2.20, -0.23] ],
            [ "Unlucky Miner", 48, [2.16, -0.21] ],
            [ "Draonworm",     50, [2.03, -0.02] ],
            [ "Shroomy",       54, [1.99,  0.09] ],
    
            [ "Bear",       48, [0.23, -0.25] ],
            [ "Druid Sage", 55, [0.16, -0.23] ],
    
            [ "Halloween Bat",    35, [1.81,  2.78] ],
            [ "Halloween Bat",    35, [1.66,  2.79] ],
            [ "Poison Crocodile", 38, [1.72,  2.70] ]
        ],
    }

    with Database() as db:
        db.execute('DELETE FROM monsters WHERE manual=0')
        for world in monsters:
            for monster in monsters[world]:
                # NOTE: The entries above are written in [y, x] format, but we
                #       want to store them in x, y. Swap here.
                name, level, (y, x) = monster
                boss = name in BOSS_NAMES
                db.insert_monster(world, x, y, name, level, boss, False)

def do_locations():
    locations = {
        'world': [
            #   x      y   name              tomap   tox   toy)
            ( 0.70, -0.90, 'Crystal To Fae',           'fae',     0.86, -0.93),
            ( 0.60,  1.40, 'Ogre Dungeon',             'dungeon', 2.69,  0.96),
            ( 0.04,  1.40, 'Crab Cave',                'dungeon', 2.28,  0.83),
            ( 0.90,  0.47, 'Rat Cave',                 'dungeon', 2.91,  1.08),
            ( 0.69,  1.11, 'Goblin Cave',              'dungeon', 2.77,  0.60),
            (-0.26,  0.09, 'Reka Dungeon',             'dungeon', 2.04, -0.29),
            (-2.70,  0.03, 'Druid Cave',               'dungeon', 0.21, -0.31),
            (-0.55,  3.77, 'Kosten Tunnel',            'dungeon', 1.84,  2.81),
            (-0.77,  3.79, 'Kosten Tunnel',            'dungeon', 1.67,  2.82),
            (-0.55,  0.37, 'Reka Dungeon Shortcut',    'dungeon', 1.85, -0.04),
        ],
        # var prepTableOnePopup = 'Prep Table';
        # L.marker([0.52, 0.79], {icon: yellowIcon}).bindPopup(prepTableOnePopup).on('click', markerClicked).addTo(locationGroup);

        # var prepTableTwoPopup = 'Prep Table';
        # L.marker([0.21, 0.34], {icon: yellowIcon}).bindPopup(prepTableTwoPopup).on('click', markerClicked).addTo(locationGroup);

        # var prepTableThreePopup = 'Prep Table';
        # L.marker([-0.74, 1.64], {icon: yellowIcon}).bindPopup(prepTableThreePopup).on('click', markerClicked).addTo(locationGroup);

        'fae': [
            (0.86, -0.93, 'Crystal To World', 'world', 0.70, -0.90),
        ],

        # var bankPopup = 'Bank';
        # L.marker([0.74, -0.89], {icon: yellowIcon}).bindPopup(bankPopup).on('click', markerClicked).addTo(locationGroup);

        'dungeon': [
            (2.69,  0.96, 'Stairs Out',        'world',  0.60,  1.56),
            (2.28,  0.83, 'Ladder Out',        'world',  0.04,  1.40),
            (2.91,  0.08, 'Ladder Out',        'world',  0.90,  0.47),
            (2.77,  0.60, 'Ladder Out',        'world',  0.69,  1.11),
            (2.04, -0.29, 'Stairs Out',        'world', -0.26,  0.09),
            (0.21, -0.31, 'Stairs Out',        'world', -2.70, -0.03),
            (1.84,  2.81, 'Kosten Tunnel',     'world', -0.55,  3.77),
            (1.67,  2.82, 'Kosten Tunnel',     'world', -0.77,  3.79),
            (1.85, -0.04, 'Shortcut to World', 'world', -0.55,  0.37),

        # var deeperCavePopup = 'Cave To Deeper Dungeon (no map yet)', 
        # L.marker([1.93, -0.29], {icon: purpleIcon}).bindPopup(deeperCavePopup).on('click', markerClicked).addTo(locationGroup), 

        # var keyPopup = 'Shortcut Key', 
        # L.marker([1.95,  0.14], {icon: yellowIcon}).bindPopup(keyPopup).on('click', markerClicked).addTo(locationGroup), 

        # var orePopup = 'Jasper Ore', 
        # L.marker([2.15, -0.22], {icon: yellowIcon}).bindPopup(orePopup).on('click', markerClicked).addTo(locationGroup), 
        ],
    }

    with Database() as db:
        for world in locations:
            for location in locations[world]:
                # NOTE: The entries above are written in [y, x] format, but we
                #       want to store them in x, y. Swap here.
                y, x, name, tomap, tox, toy = location
                db.insert_location(world, x, y, name, tomap, tox, toy)


def do_icons():

    from auto_icons import icons

    with Database() as db:
        db.execute('DELETE FROM icons WHERE manual=0')
        for world in icons:
            for icon in icons[world]:
                x, y, icon_name, icon_group, name = icon
                db.insert_icon(world, x, y, icon_name, icon_group, name, False)


def backup():

    from datetime import datetime
    import subprocess

    cmd = ['cp', 'map.db', f'backups/{datetime.now()}.db']
    subprocess.check_output(cmd)


def convert_coord_system():

    with Database() as db:
        db.execute('UPDATE monsters SET x=x*128, y=y*128+256')
        db.execute('UPDATE locations SET x=x*128, tox=tox*128, y=y*128+256, toy=toy*128+256')
        db.execute('UPDATE icons SET x=x*128, y=y*128+256')

