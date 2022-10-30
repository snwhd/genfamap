function retro(e) {
    let request = new XMLHttpRequest();
    request.open("POST", "/api/retro", true);
    request.send();
}

function toggleLayersOff() {
    let layersDivs = document.getElementsByClassName('leaflet-control-layers-overlays');
    if (!layersDivs || layersDivs.length != 1) {
        return;
    }

    let layersDiv = layersDivs[0];
    for (let e of layersDiv.children) {
        if (e.innerText.trim() == "toggle all") continue;
        let check = e.getElementsByTagName('input')[0];
        if (check.checked) {
            check.click();
        }
    }
}

function toggleLayersOn() {
    let layersDivs = document.getElementsByClassName('leaflet-control-layers-overlays');
    if (!layersDivs || layersDivs.length != 1) {
        return;
    }

    let layersDiv = layersDivs[0];
    for (let e of layersDiv.children) {
        if (e.innerText.trim() == "toggle all") continue;
        let check = e.getElementsByTagName('input')[0];
        if (!check.checked) {
            check.click();
        }
    }
}

window.onload = (event) => {

    //
    // const data
    //

    const imageUrls = {
        'world':   '/static/img/world.png',
        'fae':     '/static/img/fae.png',
        'dungeon': '/static/img/dungeon.png',
    };

    const dimensions = {
        'world': [ -2, -3, 4, 2 ],
        'fae': [-1, 0, 1, 1],
        'dungeon': [-2, -1, 3, 3]
    };

    //
    // util functions
    //

    function api(action, callback) {
        let request = new XMLHttpRequest();
        request.responseType = 'json';
        request.onload = function() {
            callback(request.response);
        }
        request.open("POST", "/api/" + action, true);
        request.send();
    }

    function apiWrite(action, data, callback) {
        let request = new XMLHttpRequest();
        request.responseType = 'json';
        request.onload = function() {
            callback(request.response);
        }
        request.open("POST", "/api/" + action, true);
        request.send(data);
    }

    function getMapName() {
        switch (window.location.pathname.substr(1)) {
            case 'fae':
                return 'fae';
            case 'dungeon':
                return 'dungeon';
            default:
                return 'world';
        }
    }

    //
    // some globals
    //

    let mapName = getMapName();
    let minZoom = 0; // calculated later
    let maxZoom = 12;

    setupMapSpecificStyle(mapName);

    //
    // anchor to locations on map
    //

    let currentAnchorX = -100;
    let currentAnchorY = -100;
    let currentAnchorZoom = -100;
    let ignoreAnchorClick = false;

    // change view to the current anchor
    function viewToAnchor() {
        let oX = 0;
        let oY = 0;
        let zoom = 0.85;
        let anchor = window.location.hash.substr(1);
        if (anchor != '') {
            let pieces = anchor.split('_');
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
            oY = parseFloat(pieces[0]);
            oX = parseFloat(pieces[1]);
            if (pieces.length >= 3) {
                // optional zoom level
                zoom = parseFloat(pieces[2]);
            }

            if (oX != currentAnchorX || oY != currentAnchorY || zoom != currentAnchorZoom) {
                // something has changed, pan and zoom
                // first convert zoom from 0-1 to min-max
                zoom = minZoom + (maxZoom - minZoom) * zoom;
                map.setView([oY, oX], zoom);

                // now check every marker group, and each marker
                // to see if we have panned to one. If so, auto-click it
                for (groupname in groups) {
                    let lgroup = groups[groupname];
                    lgroup.eachLayer(function (layer) {
                        if (layer instanceof L.Marker) {
                            let llat = layer.getLatLng().lat;
                            let llng = layer.getLatLng().lng;
                            if (llat == oY && llng == oX) {
                                ignoreAnchorClick = true;
                                layer.fire('click');
                            }
                        }
                    });
                }
            }
        }
    }

    // change anchor to current view
    function setAnchorForView(lat, lon, zoom) {
        if (ignoreAnchorClick) {
            ignoreAnchorClick = false;
            return;
        }
        zoom = (zoom - minZoom) / (maxZoom - minZoom);
        zoom = Math.round(zoom * 100) / 100;
        // set these so that we don't move
        currentAnchorX = lon;
        currentAnchorY = lat;
        currentAnchorZoom = zoom;
        window.location.hash = '#' + lat + '_' + lon + '_' + zoom;
    }

    function setupAnchors() {
        // this lets us zoom and pan whenever anchor changes
        window.onhashchange = viewToAnchor;
    
        // zoom to the current one in 1s
        setTimeout(viewToAnchor, 1000);
    }

    let clickedX = 0.0;
    let clickedY = 0.0;

    function setupMapClick() {
        map.addEventListener('click', (event) => {
            let lat = Math.round(event.latlng.lat * 100) / 100;
            let lng = Math.round(event.latlng.lng * 100) / 100;
            if (routing) {
                // add to the route
                addToRoute(lat, lng);
            } else {
                // otherwise a single point
                setAnchorForView(lat, lng, map.getZoom());
                clickedX = lng;
                clickedY = lat;
                console.log(lat, lng);
                if (editing) {
                    showEditorPointMenu();
                }
            }
        });
    }

    function getMarkersAt(oX, oY) {
        let markers = [];
        for (groupname in groups) {
            let lgroup = groups[groupname];
            lgroup.eachLayer(function (layer) {
                if (layer instanceof L.Marker) {
                    let llat = layer.getLatLng().lat;
                    let llng = layer.getLatLng().lng;
                    if (llat == oY && llng == oX) {
                        markers.push(layer);
                    }
                }
            });
        }
        return markers;
    }

    function deleteMarkersAt(oX, oY) {
        let markers = getMarkersAt(oX, oY);
        for (marker of markers) {
            marker.remove();
        }
    }

    //
    // routes
    //

    // route handling
    let currentRoute = null;
    let routing = false;

    // parse anchor into current route
    function handleRouteAnchor(pieces) {
        let route = [];
        let position = [];
        for (var num of pieces) {
            position.push(parseFloat(num));
            if (position.length == 2) {
                // route.push([position[0], position[1]]);
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

    // begin / end route
    function toggleRoute() {
        routing = !routing;
        if (routing) {
            window.location.hash = '#route';
            document.getElementById('routebutton').innerText = 'End Route';
        } else {
            document.getElementById('routebutton').innerText = 'Start Route';
        }
    }

    // add location to current route
    function addToRoute(lat, lon) {
        if (!window.location.hash.startsWith('#route')) {
            window.location.hash = '#route';
        }

        let newPoint = '_' + lat + '_' + lon;
        window.location.hash = window.location.hash + newPoint;
    }
        
    function setupRouteButton() {
        document.getElementById('routebutton').onclick = toggleRoute;
    }

    //
    // handle anchor update / route when clicking on a marker
    //

    function markerClicked(e) {
        let pos = e.target.getLatLng();
        clickedX = pos.lng;
        clickedY = pos.lat;
        if (routing) {
            addToRoute(pos.lat, pos.lng);
        } else {
            setAnchorForView(pos.lat, pos.lng, map.getZoom());
            if (editing) {
                let type = e.target.options.markerType;
                selectEditorPane("edit_" + type);
            }
        }
    }

    //
    // admin tools

    let isEditor = false;
    let editing = false;
    let editorPanes = [
        "pointmenu",
        "add_monster",
        "edit_monster",
        "add_location",
        "edit_location",
        "add_icon",
        "edit_icon"
    ];

    function setupAdminTools() {
        let button = document.getElementById("editbutton");
        if (button) {
            isEditor = true;
            button.onclick = enableEdit;

            // add monsters
            let add_monster_button = document.getElementById("pick_add_monster");
            add_monster_button.onclick = function(e) {
                selectEditorPane("add_monster");
            };
            let add_monster_submit = document.getElementById("add_monster_submit");
            add_monster_submit.onclick = function(e) {
                let data = new FormData(document.getElementById("add_monster_form"));
                apiWrite("add_monster", data, function (response) {
                    console.log(response);
                    if (response.status == 'okay') {
                        let text = data.get('name') + " (level " + data.get('level') + ")";
                        new CustomMarker([data.get('y'), data.get('x')], {
                            markerType: 'monster'
                        }).bindPopup(text)
                          .on('click', markerClicked)
                          .addTo(monsterGroup);
                    }
                });
                e.preventDefault();
                return false;
            }

            // delete monsters
            let delete_monster = document.getElementById("delete_monster_button");
            delete_monster.onclick = function (e) {
                let data = new FormData(document.getElementById("delete_monster_form"));
                apiWrite("delete_monster", data, function (response) {
                    console.log(response);
                    if (response.status == 'okay') {
                        let pos = [parseFloat(data.get('x')), parseFloat(data.get('y'))];
                        deleteMarkersAt(pos[0], pos[1]);
                    }
                });
                e.preventDefault();
                return false;
            }

            // add locations
            let add_location_button = document.getElementById("pick_add_location");
            add_location_button.onclick = function(e) {
                selectEditorPane("add_location");
            };
            let add_location_submit = document.getElementById("add_location_submit");
            add_location_submit.onclick = function(e) {
                let data = new FormData(document.getElementById("add_location_form"));
                apiWrite("add_location", data, function (response) {
                    console.log(response);
                    if (response.status == 'okay') {
                        let m = data.get('tomap');
                        let x = data.get('tox');
                        let y = data.get('toy');
                        let popup = '<a href="/' + m + '#' + x + '_' + y + '">' + data.get('name') + '</a>';
                        let pos = [parseFloat(data.get('y')), parseFloat(data.get('x'))];
                        new CustomMarker(pos, {
                            icon: purpleIcon,
                            markerType: 'location'
                        }).bindPopup(popup)
                          .on('click', markerClicked)
                          .addTo(locationGroup);
                    }
                });
                e.preventDefault();
                return false;
            }

            // delete locations
            let delete_location = document.getElementById("delete_location_button");
            delete_location.onclick = function (e) {
                let data = new FormData(document.getElementById("delete_location_form"));
                apiWrite("delete_location", data, function (response) {
                    console.log(response);
                    if (response.status == 'okay') {
                        deleteMarkersAt(parseFloat(data.get('x')), parseFloat(data.get('y')));
                    }
                });
                e.preventDefault();
                return false;
            }

            // add icons
            let add_icon_button = document.getElementById("pick_add_icon");
            add_icon_button.onclick = function(e) {
                selectEditorPane("add_icon");
            };
            let add_icon_submit = document.getElementById("add_icon_submit");
            add_icon_submit.onclick = function(e) {
                let data = new FormData(document.getElementById("add_icon_form"));
                apiWrite("add_icon", data, function (response) {
                    console.log(response);
                    if (response.status == 'okay') {
                        let pos = [parseFloat(data.get('y')), parseFloat(data.get('x'))];
                        let group = iconGroups[response.group];
                        console.log(iconGroups);
                        console.log(response.group);
                        console.log(group);
                        new CustomMarker(pos, {
                            icon: iconIcons[data.get('icon')],
                            markerType: 'icon',
                        }).on('click', markerClicked)
                          .bindPopup(data.get('name'))
                          .addTo(iconGroups[response.group]);
                    }
                });
                e.preventDefault();
                return false;
            }

            // delete icons
            let delete_icon = document.getElementById("delete_icon_button");
            delete_icon.onclick = function (e) {
                let data = new FormData(document.getElementById("delete_icon_form"));
                apiWrite("delete_icon", data, function (response) {
                    console.log(response);
                    if (response.status == 'okay') {
                        deleteMarkersAt(parseFloat(data.get('x')), parseFloat(data.get('y')));
                    }
                });
                e.preventDefault();
                return false;
            }
        }
    }

    function enableEdit(e) {
        let button = document.getElementById("editbutton");
        let pane = document.getElementById("editorpane");
        editing = true;
        pane.style.visibility = 'visible'
        button.onclick = disableEdit;
        button.innerText = 'Stop Edit';
    }

    function disableEdit(e) {
        let button = document.getElementById("editbutton");
        let pane = document.getElementById("editorpane");
        editing = false;
        pane.style.visibility = 'hidden'
        button.onclick = enableEdit;
        button.innerText = 'Start Edit';
    }

    function showEditorPointMenu() {
        selectEditorPane("pointmenu");
    }

    function selectEditorPane(selected) {
        for (var pane of editorPanes) {
            let element = document.getElementById(pane);
            element.style.display = "none";
        }

        let current = document.getElementById(selected);
        current.style.display = "inherit";

        switch (selected) {
            case "add_monster":
                var e = document.getElementById("add_monster_x");
                e.value = "" + clickedX;
                e = document.getElementById("add_monster_y");
                e.value = "" + clickedY;
                e = document.getElementById("add_monster_map");
                e.value = mapName;
                break;
            case "edit_monster":
                var e = document.getElementById("delete_monster_x");
                e.value = "" + clickedX;
                e = document.getElementById("delete_monster_y");
                e.value = "" + clickedY;
                e = document.getElementById("delete_monster_map");
                e.value = mapName;
                break;
            case "add_location":
                var e = document.getElementById("add_location_x");
                e.value = "" + clickedX;
                e = document.getElementById("add_location_y");
                e.value = "" + clickedY;
                e = document.getElementById("add_location_map");
                e.value = mapName;
                break;
            case "edit_location":
                var e = document.getElementById("delete_location_x");
                e.value = "" + clickedX;
                e = document.getElementById("delete_location_y");
                e.value = "" + clickedY;
                e = document.getElementById("delete_location_map");
                e.value = mapName;
                break;
            case "add_icon":
                var e = document.getElementById("add_icon_x");
                e.value = "" + clickedX;
                e = document.getElementById("add_icon_y");
                e.value = "" + clickedY;
                e = document.getElementById("add_icon_map");
                e.value = mapName;
                break;
            case "edit_icon":
                var e = document.getElementById("delete_icon_x");
                e.value = "" + clickedX;
                e = document.getElementById("delete_icon_y");
                e.value = "" + clickedY;
                e = document.getElementById("delete_icon_map");
                e.value = mapName;
                break;
        }
    }

    //
    // load data from api to map
    //

    let CustomMarker = L.Marker.extend({
        options: {
            markerType: ''
        }
    });

    function addMonsters(monsters) {
        // draw a maker for each monster
        for (var monster of monsters[mapName]) {
            let opts = {
                markerType: 'monster'
            };
            if (monster.boss) {
                opts.icon = redIcon;
            }
            let text = monster.name + " (level " + monster.level + ")";
            new CustomMarker(monster.position, opts)
                .bindPopup(text)
                .on('click', markerClicked)
                .addTo(monsterGroup);
        }
    }

    function addLocations(locations) {
        // draw a maker for each monster
        for (var loc of locations[mapName]) {
            let m = loc.destination.map;
            let x = loc.destination.position[0];
            let y = loc.destination.position[1];
            if (m == 'world') {
                // world is hardcoded to the root path
                m = '';
            }
            let popup = '<a href="/' + m + '#' + x + '_' + y + '">' + loc.name + '</a>';
            new CustomMarker(loc.position, {
                icon: purpleIcon,
                markerType: 'location'
            }).bindPopup(popup)
              .on('click', markerClicked)
              .addTo(locationGroup);
        }
    }

    function addIcons(icons) {
        // draw a maker for each monster
        if (icons[mapName]) {
            for (var icon of icons[mapName]) {
                new CustomMarker(icon.position, {
                    icon: iconIcons[icon.icon],
                    markerType: 'icon'
                }).on('click', markerClicked)
                  .bindPopup(icon.name)
                  .addTo(iconGroups[icon.group]);
            }
        }
    }

    function fetchMapInfo() {
        api('map_info', function (response) {
            if (response.status == 'okay') {
                addMonsters(response.data.monsters);
                addIcons(response.data.icons);
                addLocations(response.data.locations);
            } else {
                console.log(response);
            }
        });
    }

    //
    // style
    //

    function setupMapSpecificStyle(mapName) {
        console.log('style for ' + mapName);
        switch (mapName) {
            case 'world':
                break;
            case 'dungeon':
                document.body.style.backgroundColor = 'black';
                document.getElementById('map').style.backgroundColor = 'black';
                break;
            case 'fae':
                break;
        }
    }

    //
    // map time
    //

    // create map
    let map = L.map('map').setView([0, 0], 4);

    // scale each map segment to 1 lat/lon
    let dims = dimensions[mapName];
    let x0 = dims[0];
    let x1 = dims[2];
    let y0 = dims[1];
    let y1 = dims[3];
    let latLngBounds = L.latLngBounds([[y1, x1], [y0, x0]]);

    // calculate min zoom, to be slightly larger than the map
    let outerBounds  = L.latLngBounds([[y1 + 0.1, x1 + 0.1], [y0 - 0.1, x0 - 0.1]]);
    minZoom = map.getBoundsZoom(latLngBounds);

    // draw the map image
    let imageOverlay = L.imageOverlay(imageUrls[mapName], latLngBounds, {
        interactive: true
    }).addTo(map);

    // set bounds
    map.setMinZoom(minZoom);
    map.setMaxZoom(maxZoom);
    map.setMaxBounds(outerBounds);

    // default view
    map.fitBounds(latLngBounds);

    //
    // Icons / Markers / Etc
    //

    // Initialize all map groupings
    let monsterGroup = new L.LayerGroup().addTo(map);
    let questGroup = new L.LayerGroup().addTo(map);
    let shopGroup = new L.LayerGroup().addTo(map);
    let bankGroup = new L.LayerGroup().addTo(map);
    let cookingGroup = new L.LayerGroup().addTo(map);
    let forgingGroup = new L.LayerGroup().addTo(map);
    let botanyGroup = new L.LayerGroup().addTo(map);
    let miningGroup = new L.LayerGroup().addTo(map);
    let tailoringGroup = new L.LayerGroup().addTo(map);
    let treeGroup = new L.LayerGroup().addTo(map);
    let butcheryGroup = new L.LayerGroup().addTo(map);
    let craftingGroup = new L.LayerGroup().addTo(map);
    let locationGroup = new L.LayerGroup().addTo(map);
    let iconGroups = {
        'monster': monsterGroup,
        'quest': questGroup,
        'shop': shopGroup,
        'bank': bankGroup,
        'cooking': cookingGroup,
        'forging': forgingGroup,
        'botany': botanyGroup,
        'mining': miningGroup,
        'tailoring': tailoringGroup,
        'tree': treeGroup,
        'butchery': butcheryGroup,
        'crafting': craftingGroup,
        'location': locationGroup
    };

    // Base class for minimap Icons
    let GenIcon = L.Icon.extend({
        options: {
            iconSize: [32, 32],
            iconAnchor: [8, 8],
            shadowSize: [32, 32],
            shadowUrl: '/static/img/icons/shadow.png',
            shadowAnchor: [8, 7]
        }
    });

    // Preload all Icons
    let iconIcons = {
        'bank':              new GenIcon({iconUrl: "/static/img/icons/bank.png"}),
        'process_cooking':   new GenIcon({iconUrl: "/static/img/icons/process_cooking.png"}),
        'process_forge':     new GenIcon({iconUrl: "/static/img/icons/process_forge.png"}),
        'resource_plant':    new GenIcon({iconUrl: "/static/img/icons/resource_plant.png"}),
        'quest':             new GenIcon({iconUrl: "/static/img/icons/quest.png"}),
        'resource_mine':     new GenIcon({iconUrl: "/static/img/icons/resource_mine.png"}),
        'store':             new GenIcon({iconUrl: "/static/img/icons/store.png"}),
        'process_anvil':     new GenIcon({iconUrl: "/static/img/icons/process_anvil.png"}),
        'process_furnace':   new GenIcon({iconUrl: "/static/img/icons/process_furnace.png"}),
        'process_tailoring': new GenIcon({iconUrl: "/static/img/icons/process_tailoring.png"}),
        'resource_tree':     new GenIcon({iconUrl: "/static/img/icons/resource_tree.png"}),
        'process_butchery':  new GenIcon({iconUrl: "/static/img/icons/process_butchery.png"}),
        'process_pottery':   new GenIcon({iconUrl: "/static/img/icons/process_pottery.png"}),
        'process_water':     new GenIcon({iconUrl: "/static/img/icons/process_water.png"})
    }

    // Colorful marker icons
    let purpleIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
    let redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
    let yellowIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
    let orangeIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    //
    // Dispaly Map Controls
    //

    let toggle_allGroup = new L.LayerGroup()
        .on('remove', function() {
            setTimeout(toggleLayersOff, 200);
        })
        .on('add', function() {
            setTimeout(toggleLayersOn, 200);
        })
        .addTo(map);

    let baseMaps = {
        "world": imageOverlay,
    };
    let groups = {
        "toggle all": toggle_allGroup,
        "quest": questGroup,
        "shop": shopGroup,
        "bank": bankGroup,
        "monster": monsterGroup,
        "location": locationGroup,
        "cooking": cookingGroup,
        "forging": forgingGroup,
        "botany": botanyGroup,
        "mining": miningGroup,
        "tailoring": tailoringGroup,
        "tree": treeGroup,
        "butchery": butcheryGroup,
        "crafting": craftingGroup,
    };
    let layerControl = L.control.layers(baseMaps, groups).addTo(map);

    //
    // final setup
    //

    fetchMapInfo();
    setupAnchors();
    setupMapClick();
    setupRouteButton();
    setupAdminTools();

    // done: display
    setTimeout(function() {
        document.getElementById('map').style.visibility = 'visible';
    }, 500);
}
