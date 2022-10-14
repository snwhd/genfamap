window.onload = (event) => {

    var monsters =  {
	    "world": [
            // northern druid area
            [ "Leaf Boy", 12, [1.50, 1.20] ],
            // TODO: theres more here"

            // Zamok
            [ "Goblin with Mace", 16, [0.70, 1.10] ],
            [ "Goblin",    12, [0.95, 0.85] ],
            [ "Goblin",    12, [0.70, 1.05] ],
	    	// TODO: pig level
            [ "Pig",        0, [0.95, 0.45] ], 
            [ "Fennec Fox", 9, [0.85, 0.15] ],

            // Cent
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

            // Forest
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

            // Plenty
            [ "Green Slime",           2, [-0.25, 0.35] ],
            [ "Orange Fox",           16, [-0.17, 0.80] ],
            [ "Giant Rat",            13, [-0.50, 0.80] ],
            [ "Chicken",               1, [-0.50, 1.05] ],
            [ "Guard",                27, [-0.30, 1.20] ],
            [ "Cow",                   8, [-0.45, 1.35] ],
            [ "Baby Water Elemental", 11, [-0.20, 1.50] ],

            // iron road
            [ "Albino Leech", 17, [-0.15, 1.95] ],
            [ "Frog",         12, [0.11, 1.75] ],
            [ "Mega Chicken", 16, [0.30, 1.90] ],
            [ "Mega Chicken", 16, [0.50, 1.70] ],
            [ "Goblin",       12, [0.55, 1.60] ],
            [ "Harpy Mother", 44, [1.33, 1.80] ],

            // west of yellow brick
            [ "Jack",         35, [-0.80, -0.40] ],
            [ "Giant Spider", 20, [-0.75, -0.20] ],
            [ "Leopard",      26, [-1.10, -0.15] ],
            [ "Snow Cat",     30, [-1.50, -0.95] ],

            // south of Plenty
            [ "Bear",        38, [-1.30, 0.70] ],
            [ "Grim Thug",   18, [-1.35, 0.95] ],
            [ "Bandit",      22, [-1.50, 0.95] ],
            [ "Spaniel Dog", 13, [-0.85, 0.90] ],

            // southern forest
            [ "Swamp Spider", 27, [-1.55, 0.10] ],
            [ "Forest Owl",   29, [-1.60, 0.05] ],
            [ "Leshii",       20, [-1.75, 0.10] ],
            [ "Doe",          19, [-1.85, 0.30] ],
            [ "Leaf Boy",     20, [-1.70, 0.35] ],


            // mountain
            [ "Ice Elemental", 32 , [-1.00, -0.75] ],
            [ "Ice Elemental", 32 , [-1.30, -1.00] ],

            // south of mountain
            [ "Panther",               32, [-1.80, -1.25] ],
            [ "Troll",                 34, [-1.85, -1.25] ],
            [ "Treefolk",              35, [-1.90, -1.10] ],
            [ "Shadowstalker Gremlin", 34, [-1.75, -1.10] ],
            [ "Forest Owl",            29, [-1.75, -0.90] ],

            // Kosten Ridge
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
            [ "Brute Leech",    44, [0.93, 2.74] ],
            [ "Brute Leech",    44, [0.76, 2.81] ],
            [ "Brute Leech",    44, [0.77, 2.95] ]

        ],

	    "fae": [
	    ],

	    "dungeon": [
            // northeast dungeon
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

            // cent dungeon
            [ "Unlucky Miner", 48, [1.98, -0.23] ],
            [ "Tan Rat",       38, [2.02, -0.21] ],
            [ "Tan Rat",       38, [2.06, -0.14] ],
            [ "Tan Rat",       38, [1.95, -0.15] ],
            [ "Brute Leech",   44, [2.15, -0.08] ],
            [ "Brute Leech",   44, [1.99, -0.10] ],
            [ "Unlucky Miner",     48, [1.98, -0.23] ]

            // camp dungeon
            // TODO
	    ]
    };;

    var bossNames = [
        "Ogre Wife",
        "Ogre Husband",
        "Jack"
    ];

    var imageUrls = {
        'world':   'https://genfamap.snwhd.com/world.png',
        'fae':     'https://genfamap.snwhd.com/fae.png',
        'dungeon': 'https://genfamap.snwhd.com/dungeon.png',
    };
    var dimensions = {
        'world': [ -2, -3, 4, 2 ],
        'fae': [-1, 0, 1, 1],
        'dungeon': [-2, 0, 3, 3]
    };

    // preload some icons
    var purpleIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    // preload some icons
    var redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    var minZoom = 0; // calculate later
    var maxZoom = 12;

    var currentAnchorX = -100;
    var currentAnchorY = -100;
    var currentAnchorZoom = -100;

    var ignoreAnchorClick = false;

    function viewToAnchor() {
        var oX = 0;
        var oY = 0;
        var zoom = 0.85;
        var anchor = window.location.hash.substr(1);
        if (anchor != '') {
            var pieces = anchor.split('_');
            if (pieces.length > 0 && pieces[0] == 'route') {
                pieces.shift();
                handleRouteAnchor(pieces);
                return;
            }

            if (pieces.length < 2) {
                // need at least lat/lon
                return;
            }

            // the first
            oX = parseFloat(pieces[0]);
            oY = parseFloat(pieces[1]);
            if (pieces.length >= 3) {
                // optional zoom level
                zoom = parseFloat(pieces[2]);
            }

            if (oX != currentAnchorX || oY != currentAnchorY || zoom != currentAnchorZoom) {
                // something has changed, pan and zoom
                // first convert zoom from 0-1 to min-max
                zoom = minZoom + (maxZoom - minZoom) * zoom;
                map.setView([oX, oY], zoom);

                // now check every marker group, and each marker
                // to see if we have panned to one. If so, auto-click it
                for (groupname in groups) {
                    var lgroup = groups[groupname];
                    lgroup.eachLayer(function (layer) {
                        if (layer instanceof L.Marker) {
                            let llat = layer.getLatLng().lat;
                            let llng = layer.getLatLng().lng;
                            if (llat == oX && llng == oY) {
                                ignoreAnchorClick = true;
                                layer.fire('click');
                            }
                        }
                    });
                }
            }
        }
    }

    function setAnchorForView(lat, lon, zoom) {
        if (ignoreAnchorClick) {
            ignoreAnchorClick = false;
            return;
        }
        zoom = (zoom - minZoom) / (maxZoom - minZoom);
        zoom = Math.round(zoom * 100) / 100;
        // set these so that we don't move
        currentAnchorX = lat;
        currentAnchorY = lon;
        currentAnchorZoom = zoom;
        window.location.hash = '#' + lat + '_' + lon + '_' + zoom;
    }


    // route handling
    var currentRoute = null;

    function handleRouteAnchor(pieces) {
        var route = [];
        var position = [];
        for (var num of pieces) {
            position.push(parseFloat(num));
            if (position.length == 2) {
                route.push(position);
                position = [];
            }
        }

        if (currentRoute) {
            currentRoute.remove();
        }
        currentRoute = new L.Polyline.AntPath(route, {
            weight: 10
        });
        currentRoute.setZIndex(1000000);
        currentRoute.addTo(map);
    }

    // create route
    var routing = false;

    function toggleRoute() {
        routing = !routing;
        if (routing) {
            window.location.hash = '#route';
            document.getElementById('routebutton').innerText = 'End Route';
        } else {
            document.getElementById('routebutton').innerText = 'Start Route';
        }
    }

    function addToRoute(lat, lon) {
        if (!window.location.hash.startsWith('#route')) {
            window.location.hash = '#route';
        }

        var newPoint = '_' + lat + '_' + lon;
        window.location.hash = window.location.hash + newPoint;
    }
        

    // hook up route button
    document.getElementById('routebutton').onclick = toggleRoute;

    // which map are we looking at
    var mapName = '';
    switch (window.location.pathname.substr(1)) {
        case 'fae':
            mapName = 'fae';
            break;
        case 'dungeon':
            mapName = 'dungeon';
            break;
        default:
            mapName = 'world';
    }

    // create map
    var map = L.map('map').setView([0, 0], 4);

    // map size so that each segment is one latlon
    var dims = dimensions[mapName];
    var x0 = dims[0];
    var x1 = dims[2];
    var y0 = dims[1];
    var y1 = dims[3];
    var latLngBounds = L.latLngBounds([[y1, x1], [y0, x0]]);

    // calculate min zoom, slightly larger than the map
    var outerBounds  = L.latLngBounds([[y1 + 0.1, x1 + 0.1], [y0 - 0.1, x0 - 0.1]]);
    minZoom = map.getBoundsZoom(latLngBounds);

    // draw the map image
    var imageOverlay = L.imageOverlay(imageUrls[mapName], latLngBounds, {
        interactive: true
    }).addTo(map);

    // default view
    map.fitBounds(latLngBounds);

    // bounds
    map.setMinZoom(minZoom);
    map.setMaxZoom(maxZoom);
    map.setMaxBounds(outerBounds);

    // this lets us zoom and pan whenever anchor changes
    window.onhashchange = viewToAnchor;
    // zoom to the current one in 1s
    setTimeout(viewToAnchor, 1000);

    // log latlon on clicks
    map.addEventListener('click', (event) => {
        let lat = Math.round(event.latlng.lat * 100) / 100;
        let lng = Math.round(event.latlng.lng * 100) / 100;
        if (routing) {
            // add to the route
            addToRoute(lat, lng);
        } else {
            // otherwise a single point
            setAnchorForView(lat, lng, map.getZoom());
            console.log(lat, lng);
        }
    });

    function markerClicked(e) {
        var pos = e.target.getLatLng();
        if (routing) {
            addToRoute(pos.lat, pos.lng);
        } else {
            setAnchorForView(pos.lat, pos.lng, map.getZoom());
        }
    }

    // draw a maker for each monster
    var monsterGroup = new L.LayerGroup().addTo(map);
    for (var monster of monsters[mapName]) {
        var name = monster[0];
        var level = monster[1];
        var latlon = monster[2];
        var opts = {};
        if (bossNames.includes(name)) {
            opts = {
                icon: redIcon
            }
        }
        var text = name + " (level " + level + ")";
        L.marker(latlon, opts)
            .bindPopup(text)
            .on('click', markerClicked)
            .addTo(monsterGroup);
    }

    // draw markers for other locations
    var locationGroup = new L.LayerGroup().addTo(map);

    switch (mapName) {
        case 'world':
            var faePopup = '<a href="https://genfamap.snwhd.com/fae#0.86_-0.93">Crystal To Fae</a>';
            L.marker([0.70, -0.90], {icon: purpleIcon}).bindPopup(faePopup).on('click', markerClicked).addTo(locationGroup);

            var neCavePopup = '<a href="https://genfamap.snwhd.com/dungeon#2.69_0.96">Stairs To Dungeon</a>';
            L.marker([0.60,  1.56], {icon: purpleIcon}).bindPopup(neCavePopup).on('click', markerClicked).addTo(locationGroup);

            var crabCavePopup = '<a href="https://genfamap.snwhd.com/dungeon#2.28_0.83">Trapdoor To Dungeon</a>';
            L.marker([0.04,  1.40], {icon: purpleIcon}).bindPopup(crabCavePopup).on('click', markerClicked).addTo(locationGroup);

            var ratCavePopup = '<a href="https://genfamap.snwhd.com/dungeon#2.91_1.08">Trapdoor To Dungeon</a>';
            L.marker([0.90,  0.47], {icon: purpleIcon}).bindPopup(ratCavePopup).on('click', markerClicked).addTo(locationGroup);

            var campCavePopup = '<a href="https://genfamap.snwhd.com/dungeon#2.77_0.60">Trapdoor To Dungeon</a>';
            L.marker([0.69,  1.11], {icon: purpleIcon}).bindPopup(campCavePopup).on('click', markerClicked).addTo(locationGroup);

            var centCavePopup = '<a href="https://genfamap.snwhd.com/dungeon#2.04_-0.29">Cave To Dungeon</a>';
            L.marker([-0.26, 0.09], {icon: purpleIcon}).bindPopup(centCavePopup).on('click', markerClicked).addTo(locationGroup);
            break;
        case 'fae':
            var faePopup = '<a href="https://genfamap.snwhd.com/#0.7_-0.9">Crystal To World</a>';
            L.marker([0.86, -0.93], {icon: purpleIcon}).bindPopup(faePopup).on('click', markerClicked).addTo(locationGroup);
            break;
        case 'dungeon':
            var neCavePopup = '<a href="https://genfamap.snwhd.com/#0.6_1.56">Stairs To World</a>';
            L.marker([2.69,  0.96], {icon: purpleIcon}).bindPopup(neCavePopup).on('click', markerClicked).addTo(locationGroup);

            var crabCavePopup = '<a href="https://genfamap.snwhd.com/#0.04_1.40">Ladder To World</a>';
            L.marker([2.28,  0.83], {icon: purpleIcon}).bindPopup(crabCavePopup).on('click', markerClicked).addTo(locationGroup);

            var ratCavePopup = '<a href="https://genfamap.snwhd.com/#0.9_0.47">Ladder To World</a>';
            L.marker([2.91, 0.08], {icon: purpleIcon}).bindPopup(ratCavePopup).on('click', markerClicked).addTo(locationGroup);

            var campCavePopup = '<a href="https://genfamap.snwhd.com/#0.69_1.11">Ladder to World</a>';
            L.marker([2.77,  0.60], {icon: purpleIcon}).bindPopup(campCavePopup).on('click', markerClicked).addTo(locationGroup);

            var centCavePopup = '<a href="https://genfamap.snwhd.com/#-0.26_0.09">Cave to World</a>';
            L.marker([2.04, -0.29], {icon: purpleIcon}).bindPopup(centCavePopup).on('click', markerClicked).addTo(locationGroup);
            break;

            // For the dungeon map only, make the bg black
            for (var c of document.querySelectorAll('.leaflet-container')) {
                c.style.backgroundColor = 'black';
            }

            // and invert text
            for (var c of document.querySelectorAll('.footer')) {
                c.style.textShadow = "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000";
                c.style.color = 'white';
            }
            break;
    }

    // create a base icon for genfanad map markers
    var GenIcon = L.Icon.extend({
        options: {
            iconSize: [32, 32],
            iconAnchor: [8, 8],
            shadowSize: [32, 32],
            shadowUrl: 'https://genfamap.snwhd.com/icons/shadow.png',
            shadowAnchor: [8, 7]
        }
    });

    // create a list of maps to be displayed
    baseMaps = {
        "world": imageOverlay,
    };

    //
    // the rest is auto-generated
    //

    switch (mapName) {
    
