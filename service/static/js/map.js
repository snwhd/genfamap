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
        'world1':   '/static/img/world1.png',
        'world2':   '/static/img/world2.png',
        'fae':     '/static/img/fae.png',
        'dungeon': '/static/img/dungeon.png',
    };

    const dimensions = {
        'world':   [ -2, -1, 3, 3 ],
        'world1':  [ -2, -1, 2, 2 ],
        'world2':  [  0, -1, 2, 0 ],
        'fae':     [ -1,  0, 1, 1 ],
        'dungeon': [ -2, -1, 3, 3 ]
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
            case 'fairy':
                return 'fae';
            case 'dungeon':
                return 'dungeon';
            case '1':
                return 'world1';
            case '2':
                return 'world2';
            default:
                return 'world';
        }
    }

    function mapToUrlName(map_name) {
        switch (map_name) {
            case 'world':
                return '';
            case 'world1':
                return '1';
            case 'world2':
                return '2';
            default:
                return map_name;
        }
    }

    //
    // some globals
    //

    let mapName = getMapName();
    let minZoom = 0; // calculated later
    let maxZoom = 6;

    setupMapSpecificStyle(mapName);

    //
    // anchor to locations on map
    //

    let currentAnchorX = null; // -100;
    let currentAnchorY = null; // -100;
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
            oX = genToLeafX(parseFloat(pieces[0]));
            oY = genToLeafY(parseFloat(pieces[1]));
            if (pieces.length >= 3) {
                // optional zoom level
                zoom = parseFloat(pieces[2]);
            }

            if (oX != currentAnchorX || oY != currentAnchorY || zoom != currentAnchorZoom) {
                // something has changed, pan and zoom
                // first convert zoom from 0-1 to min-max
                zoom = minZoom + (maxZoom - minZoom) * zoom;
                map.setView([oY, oX], zoom);

                currentAnchorX = oX;
                currentAnchorY = oY;

                // change position of our location
                updateCurrentLocation();

                // now check every marker group, and each marker
                // to see if we have panned to one. If so, auto-click it
                for (groupname in groups) {
                    let lgroup = groups[groupname];
                    lgroup.eachLayer(function (layer) {
                        if (layer instanceof L.Marker) {
                            let llat = layer.getLatLng().lat - 0.5;
                            let llng = layer.getLatLng().lng - 0.5;
                            if (llat == oY && llng == oX) {
                                ignoreAnchorClick = true;
                                layer.fire('click');
                                // if we clicked an icon, hide the position marker
                                removeCurrentLocationMarker();
                                return;
                            }
                        }
                    });
                }
            }
        }
    }

    // change anchor to current view
    function setAnchorForView(lat, lon, zoom, showLocation) {
        if (ignoreAnchorClick) {
            ignoreAnchorClick = false;
            return;
        }
        zoom = (zoom - minZoom) / (maxZoom - minZoom);
        zoom = Math.round(zoom * 100) / 100;
        // set these so that we don't move
        lat = lat;
        currentAnchorX = lon;
        currentAnchorY = lat;
        currentAnchorZoom = zoom;
        window.location.hash = '#' + leafToGenX(lon) + '_' + leafToGenY(lat) + '_' + zoom;
        if (showLocation) {
            updateCurrentLocation();
        } else {
            removeCurrentLocationMarker();
        }
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
            let lat = Math.floor(event.latlng.lat);
            let lng = Math.floor(event.latlng.lng);
            if (routing) {
                // add to the route
                addToRoute(lat, lng);
            } else {
                // otherwise a single point
                setAnchorForView(lat, lng, map.getZoom(), true);
                clickedX = leafToGenX(lng);
                clickedY = leafToGenY(lat);
                if (editing) {
                    if (movingElement) {
                        finishMoving();
                    } else {
                        showEditorPointMenu();
                    }
                }
            }
        });
    }

    function getMarkersAt(oX, oY) {
        oX = genToLeafX(oX);
        oY = genToLeafY(oY);
        let markers = [];
        for (groupname in groups) {
            let lgroup = groups[groupname];
            lgroup.eachLayer(function (layer) {
                if (layer instanceof L.Marker) {
                    let llat = layer.getLatLng().lat - 0.5;
                    let llng = layer.getLatLng().lng - 0.5;
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
                route.push(genToLeaf([position[1], position[0]]));
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

        let newPoint = '_' + leafToGenX(lon) + '_' + leafToGenY(lat);
        window.location.hash = window.location.hash + newPoint;
    }
        
    function setupRouteButton() {
        document.getElementById('routebutton').onclick = toggleRoute;
    }

    function genToLeafOffset(pos) {
        return [
            genToLeafY(pos[0]) + 0.5,
            genToLeafX(pos[1]) + 0.5
        ];
    }

    function genToLeaf(pos) {
        return [genToLeafY(pos[0]), genToLeafX(pos[1])];
    }

    function leafToGen(pos) {
        return [leafToGenY(pos[0]), leafToGenX(pos[1])];
    }

    function genToLeafY(y) {
        return ((y1 + y0) - y) - 1;
    }

    function genToLeafX(x) {
        return x;
    }

    function leafToGenY(y) {
        return ((y1 + y0) - y) - 1;
    }

    function leafToGenX(x) {
        return x;
    }

    //
    // moving things
    //

    let movingElement = false;
    let movingAPI = null;
    
    function beginMoving(api_name) {
        movingElement = true;
        movingAPI = api_name;
    }

    function finishMoving() {
        if (!movingElement || movingAPI == null) {
            movingElement = false;
            return;
        }
        movingElement = false;

        document.getElementById(movingAPI + "_map").value = mapName;
        document.getElementById(movingAPI + "_tox").value = "" + clickedX;
        document.getElementById(movingAPI + "_toy").value = "" + clickedY;
        let data = new FormData(document.getElementById(movingAPI + "_form"));
        apiWrite(movingAPI, data, function (response) {
            if (response.status == 'okay') {
                let pos = [parseFloat(data.get('x')), parseFloat(data.get('y'))];
                deleteMarkersAt(pos[0], pos[1]);
                if (response.icons) {
                    addIcons(response.icons);
                }
                if (response.monsters) {
                    addMonsters(response.monsters);
                }
                if (response.locations) {
                    addLocations(response.locations);
                }
                movingAPI = null;
            }
        });
        selectEditorPane('');
    }

    //
    // handle anchor update / route when clicking on a marker
    //

    function markerClicked(e) {
        let pos = e.target.getLatLng();
        let lat = pos.lat - 0.5;
        let lng = pos.lng - 0.5;
        clickedX = leafToGenX(lng);
        clickedY = leafToGenY(lat);
        if (routing) {
            addToRoute(lat, lng);
        } else {
            setAnchorForView(lat, lng, map.getZoom(), false);
            if (editing) {
                let type = e.target.options.markerType;
                selectEditorPane("edit_" + type);
            }
        }
    }

    //
    // location marker
    //

    let currentLocationIcon = L.divIcon({
        className: 'currentLocationMarker',
    });
    let currentLocationMarker = null;
    let enableLocationMarker = new URLSearchParams(window.location.search).has('location');

    function getCurrentLocationMarker() {
        if (!enableLocationMarker) {
            return;
        }

        if (currentLocationMarker == null) {
            currentLocationMarker = L.marker([0, 0], {
                icon: currentLocationIcon,
            });
            currentLocationMarker.addTo(map);
        }
        return currentLocationMarker;
    }

    function removeCurrentLocationMarker() {
        if (!enableLocationMarker) {
            return;
        }

        if (currentLocationMarker != null) {
            currentLocationMarker.remove();
            currentLocationMarker = null;
        }
    }

    function updateCurrentLocation() {
        if (!enableLocationMarker) {
            return;
        }

        if (currentAnchorX != null && currentAnchorY != null) {
            var marker = getCurrentLocationMarker();
            marker.setLatLng([currentAnchorY, currentAnchorX]);
        } else {
            removeCurrentLocationMarker();
        }
    }

    //
    // admin tools
    //

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
                    if (response.status == 'okay') {
                        let text = data.get('name') + " (level " + data.get('level') + ")";
                        let pos = [parseFloat(data.get('y')), parseFloat(data.get('x'))];
                        new CustomMarker(genToLeafOffset(pos), {
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
                    if (response.status == 'okay') {
                        let pos = [parseFloat(data.get('x')), parseFloat(data.get('y'))];
                        deleteMarkersAt(pos[0], pos[1]);
                    }
                });
                e.preventDefault();
                return false;
            }

            // move monsters
            let move_monster = document.getElementById("move_monster_button");
            move_monster.onclick = function (e) {
                beginMoving("move_monster");
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
                    if (response.status == 'okay') {
                        let m = mapToUrlName(data.get('tomap'));
                        let x = data.get('tox');
                        let y = data.get('toy');
                        let name = mapToUrlName(data.get('name'));
                        let popup = '<a href="/' + m + '#' + x + '_' + y + '">' + name + '</a>';
                        let pos = [parseFloat(data.get('y')), parseFloat(data.get('x'))];
                        new CustomMarker(genToLeafOffset(pos), {
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
                    if (response.status == 'okay') {
                        deleteMarkersAt(parseFloat(data.get('x')), parseFloat(data.get('y')));
                    }
                });
                e.preventDefault();
                return false;
            }

            // move locations
            let move_location = document.getElementById("move_location_button");
            move_location.onclick = function (e) {
                beginMoving("move_location");
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
                    if (response.status == 'okay') {
                        let pos = [parseFloat(data.get('y')), parseFloat(data.get('x'))];
                        let group = iconGroups[response.group];
                        new CustomMarker(genToLeafOffset(pos), {
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
                    if (response.status == 'okay') {
                        deleteMarkersAt(parseFloat(data.get('x')), parseFloat(data.get('y')));
                    }
                });
                e.preventDefault();
                return false;
            }

            // move icons
            let move_icon = document.getElementById("move_icon_button");
            move_icon.onclick = function (e) {
                beginMoving("move_icon");
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
        if (current != null) {
            current.style.display = "inherit";
        }

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

                // move
                e = document.getElementById("move_monster_x");
                e.value = "" + clickedX;
                e = document.getElementById("move_monster_y");
                e.value = "" + clickedY;
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

                // move
                e = document.getElementById("move_location_x");
                e.value = "" + clickedX;
                e = document.getElementById("move_location_y");
                e.value = "" + clickedY;
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

                // move
                e = document.getElementById("move_icon_x");
                e.value = "" + clickedX;
                e = document.getElementById("move_icon_y");
                e.value = "" + clickedY;
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
        if (!monsters[mapName]) {
            return;
        }
        for (var monster of monsters[mapName]) {
            let opts = {
                markerType: 'monster'
            };
            if (monster.boss) {
                opts.icon = redIcon;
            }
            let text = monster.name + " (level " + monster.level + ")";
            new CustomMarker(genToLeafOffset(monster.position), opts)
                .bindPopup(text)
                .on('click', markerClicked)
                .addTo(monsterGroup);
        }
    }

    function addLocations(locations) {
        if (!locations[mapName]) {
            return;
        }
        for (var loc of locations[mapName]) {
            let m = mapToUrlName(loc.destination.map);
            let x = loc.destination.position[0];
            let y = loc.destination.position[1];
            let popup = '<a href="/' + m + '#' + x + '_' + y + '">' + mapToUrlName(loc.name) + '</a>';
            new CustomMarker(genToLeafOffset(loc.position), {
                icon: purpleIcon,
                markerType: 'location'
            }).bindPopup(popup)
              .on('click', markerClicked)
              .addTo(locationGroup);
        }
    }

    function addIcons(icons) {
        if (!icons[mapName]) {
            return;
        }
        if (icons[mapName]) {
            for (var icon of icons[mapName]) {
                new CustomMarker(genToLeafOffset(icon.position), {
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
            }
        });
    }

    //
    // style
    //

    function setupMapSpecificStyle(mapName) {
        switch (mapName) {
            case 'world':
                break;
            case 'fae':
                break;
            case 'world1':
            case 'world2':
            case 'dungeon':
                document.body.style.backgroundColor = 'black';
                document.getElementById('map').style.backgroundColor = 'black';
                break;
        }
    }

    //
    // map time
    //

    // create map
    let map = L.map('map', {
        crs: L.CRS.Simple
    }).setView([0, 0], 4);
    map.on('zoomend', function() {
        let imgs = document.getElementsByClassName('leaflet-image-layer');
        if (map.getZoom() < 0.5 * (maxZoom - minZoom)) {
            for (img of imgs) {
                img.style.imageRendering = 'auto';
            }
        } else {
            for (img of imgs) {
                img.style.imageRendering = 'crisp-edges';
            }
        }

        if (window.opener) {
            let messageData = {
                action: 'zoom',
                zoom: map.getZoom()
            };
            window.opener.postMessage(messageData, '*');
        }

    });

    // scale each map segment to 1 lat/lon
    let dims = dimensions[mapName];
    let x0 = dims[0] * 128;
    let y0 = dims[1] * 128;
    let x1 = (dims[2] + 1) * 128;
    let y1 = (dims[3] + 1) * 128;
    let latLngBounds = L.latLngBounds([[y1, x1], [y0, x0]]);

    // calculate min zoom, to be slightly larger than the map
    let outerBounds  = L.latLngBounds([[y1 + 32, x1 + 32], [y0 - 32, x0 - 32]]);
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
