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

    function getMapName() {
        // get internal map name from url path
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
        // get url name from internal map name
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
    // global map state
    //

    const mapName = getMapName();
    let minZoom = 0; // calculated later
    let maxZoom = 6;

    // TODO(refac) : move to init
    initializeMapSpecificStyle(mapName);

    //
    // coordinate handling
    //

    //
    // a note about gefamap coordinates:
    //
    // Genfanad coordiante system:
    //   - each tile is 1 unit by 1 unit
    //   - written as (x, y)
    //   - (0, 0) is the northeast corner of the zamok map area
    //   - east  is positive X, west  is negative
    //   - south is positive Y, north is negative
    //
    // Leaflet coordinate system:
    //   - based on lat/lon values, but projected with Leaflet's simple
    //     projection to approximate a 1 unit by 1 unit lat/lon overlay of
    //     the 2D Genfanad map. In this case lat == Y and lon == X.
    //   - written as (lat, lng) -- equivalent to genfanad (y, x)
    //   - ** north is positive
    //
    // Genfanad coordinates are used in the backend database and all
    // user-facing features (e.g. url fragment, edit panel).
    //
    // Leaflet coordinates are only used when interacting with leaflet.
    //
    // Because the coordinate systems differ in Y value, below are some
    // conversion functions between the two systems.
    //
    // TODO: figure out if leaflet can do negative north, to simplify all this
    //

    function genToLeafOffset(pos) {
        // genfanad to the center point of a tile in leaflet
        return [
            genToLeafY(pos[0]) + 0.5,
            genToLeafX(pos[1]) + 0.5
        ];
    }

    function genToLeaf(pos) {
        // genfanad point to leaflet point (Y, X) -> (Lat, Lon)
        return [genToLeafY(pos[0]), genToLeafX(pos[1])];
    }

    function leafToGen(pos) {
        // leaflet to genfanad point
        return [leafToGenY(pos[0]), leafToGenX(pos[1])];
    }

    function genToLeafY(y) {
        // genfanad Y to leaflet Lat
        return ((y1 + y0) - y) - 1;
    }

    function genToLeafX(x) {
        // genfanad X to leaflet Lng
        return x;
    }

    function leafToGenY(y) {
        // leaflet Lat to genfanad Y
        return ((y1 + y0) - y) - 1;
    }

    function leafToGenX(x) {
        // leaflet Lng to genfanad X
        return x;
    }


    //
    // api functions
    //

    function api(action, callback) {
        // make a read request to backend api
        let request = new XMLHttpRequest();
        request.responseType = 'json';
        request.onload = function() {
            callback(request.response);
        }
        request.open("POST", "/api/" + action, true);
        request.send();
    }

    function apiWrite(action, data, callback) {
        // make a write request to backend api
        let request = new XMLHttpRequest();
        request.responseType = 'json';
        request.onload = function() {
            callback(request.response);
        }
        request.open("POST", "/api/" + action, true);
        request.send(data);
    }


    //
    // fragment handling
    //

    let currentFragmentPosition = [null, null, null];
    let ignoreFragmentUpdate = false;

    function updateViewFromFragment() {
        // change the map view and zoom to the current url fragment
        let fragment = window.location.hash.substr(1);
        if (fragment == '') {
            return;
        }

        let pieces = fragment.split('_');
        if (pieces.length > 0 && pieces[0] == 'route') {
            pieces.shift();
            updateRouteFromAnchor(pieces);
            return;
        }

        if (pieces.length < 2) {
            // need at least lat/lon
            return;
        }

        // at this point we have either lat_lon or lat_lon_zoom
        let zoom = 0.85;
        let oX = genToLeafX(parseFloat(pieces[0]));
        let oY = genToLeafY(parseFloat(pieces[1]));
        if (pieces.length >= 3) {
            // optional zoom level
            zoom = parseFloat(pieces[2]);
        }

        // load the most recent fragment view
        let cX = currentFragmentPosition[0];
        let cY = currentFragmentPosition[1];
        let cZ = currentFragmentPosition[2];
        if (oX == cX && oY == cY && zoom == cZ) {
            // nothing has changed
            return;
        }

        // convert zoom from 0-1 to min-max, and update map
        zoom = minZoom + (maxZoom - minZoom) * zoom;
        map.setView([oY, oX], zoom);

        // save new map view
        currentFragmentPosition = [oX, oY, zoom];

        updatePlayerLocationMarker();

        // this is a bit hacky, but here we check each marker on the map to see
        // if the fragment points to one (e.g. shared link). If so, we fire a
        // click event to open the marker.
        for (groupname in groups) {
            let lgroup = groups[groupname];
            lgroup.eachLayer(function (layer) {
                if (layer instanceof L.Marker) {
                    let llat = layer.getLatLng().lat - 0.5;
                    let llng = layer.getLatLng().lng - 0.5;
                    if (llat == oY && llng == oX) {
                        ignoreFragmentUpdate = true;
                        layer.fire('click');
                        // TODO(genlite): this might not be expected behavior:
                        //
                        // (see comment above loop) - if we linked to a marker,
                        //    hide the current player location marker so it
                        //    does not interfere with the marker.
                        removePlayerLocationMarker();
                        return;
                    }
                }
            });
        }
    }

    function updateFragmentFromView(lat, lon, zoom, showLocation) {
        // save the current map view and zoom to the url fragment
        // this is called from Marker.onClick

        if (ignoreFragmentUpdate) {
            // since we auto-click markers when linked to
            // (see updateViewFromFragment) we don't want to update fragment
            // again.
            ignoreFragmentUpdate = false;
            return;
        }

        // convert zoom to 0 - 1
        zoom = (zoom - minZoom) / (maxZoom - minZoom);
        zoom = Math.round(zoom * 100) / 100;

        // update current fragment position to avoid map scrolling again
        // in updateViewFromFragment
        currentFragmentPosition = [lon, lat, zoom];

        window.location.hash = '#' + leafToGenX(lon) + '_' + leafToGenY(lat) + '_' + zoom;

        updatePlayerLocationMarker();
    }

    function initializeFragmentHandling() {
        // this lets us zoom and pan whenever anchor changes
        window.onhashchange = updateViewFromFragment;

        // short time delay before updating for the first time if
        // we opened a link with fragment
        setTimeout(updateViewFromFragment, 1000);
    }

    //
    // click handling
    //

    let clickedX = 0.0;
    let clickedY = 0.0;

    function initializeMapClickHandlers() {
        map.addEventListener('click', (event) => {
            let lat = Math.floor(event.latlng.lat);
            let lng = Math.floor(event.latlng.lng);
            if (routing) {
                // add to the route
                addToRoute(lat, lng);
            } else {
                // otherwise a single point
                updateFragmentFromView(lat, lng, map.getZoom());
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

    function markerClicked(e) {
        let pos = e.target.getLatLng();
        let lat = pos.lat - 0.5;
        let lng = pos.lng - 0.5;
        clickedX = leafToGenX(lng);
        clickedY = leafToGenY(lat);
        if (routing) {
            addToRoute(lat, lng);
        } else {
            updateFragmentFromView(lat, lng, map.getZoom());
            removePlayerLocationMarker();
            if (editing) {
                let type = e.target.options.markerType;
                selectEditorPane("edit_" + type);
            }
        }
    }


    //
    // marker handling
    //

    function getMarkersAt(oX, oY) {
        // get all markers at genfanad coordinates
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
        // delete all markers at genfanad coordinates
        let markers = getMarkersAt(oX, oY);
        for (marker of markers) {
            marker.remove();
        }
    }

    //
    // routes
    //

    // route handling
    let currentRouteDistance = 0;
    let currentRoute = null;
    let routing = false;

    function updateRouteFromAnchor(pieces) {
        // parse list of x,y values and create a route
        // used by fragment parsing
        //
        // note: if length of pieces is odd, the last value
        //       is assumed to be a zoom value
        let route = [];
        let position = [];
        let avgX = 0;
        let avgY = 0;
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

        let prevPoint = null;
        currentRouteDistance = 0;
        for (point of route) {
            point = leafToGen(point); // should not be necessary
            if (prevPoint != null) {
                let dx = Math.abs(point[1] - prevPoint[1]);
                let dy = Math.abs(point[0] - prevPoint[0]);
                if (dy > dx) {
                    // make dx always the lower of the two to simplify
                    // follow up code
                    [dx, dy] = [dy, dx];
                }

                // Diagonal movement moves by 1 y and 1 x at the same speed
                // as walking horizontal or vertally 1 unity. So the total
                // tiles walked is simply the lower of the two deltas (walking
                // diagonally) followed by the remaining tiles of the longer
                // delta. Or:
                let distance = dx + (dy - dx);
                currentRouteDistance += distance;
            }
            prevPoint = point;
        }
        // console.log('route distance', currentRouteDistance);

        if (!routing) {
            // note: only change map view if we are not actively
            //       editing the route.
            let zoom = 0.5;
            if (position.length == 1) {
                // a leftover piece means zoom level
                zoom = parseFloat(position[0]);
            }
            zoom = minZoom + (maxZoom - minZoom) * zoom;
            var avgLat = route.reduce((sum, p) => sum + p[0], 0) / route.length;
            var avgLng = route.reduce((sum, p) => sum + p[1], 0) / route.length;
            // TODO: fit zoom to route
            map.setView([avgLat, avgLng], zoom);
        }
    }

    function toggleRoute() {
        // toggle interactive route creation
        routing = !routing;
        if (routing) {
            window.location.hash = '#route';
            document.getElementById('routebutton').innerText = 'End Route';
        } else {
            document.getElementById('routebutton').innerText = 'Start Route';
        }
    }

    function addToRoute(lat, lon) {
        // add one location to the current route
        if (!window.location.hash.startsWith('#route')) {
            window.location.hash = '#route';
        }

        let newPoint = '_' + leafToGenX(lon) + '_' + leafToGenY(lat);
        window.location.hash = window.location.hash + newPoint;
    }

    function initializeRouteCreation() {
        document.getElementById('routebutton').onclick = toggleRoute;
    }

    //
    // player location marker
    //

    let currentPlayerLocationIcon = L.divIcon({
        className: 'currentLocationMarker',
    });
    let playerLocationMarker = null;
    let enablePlayerLocationMarker = new URLSearchParams(window.location.search).has('location');

    function getPlayerLocationMarker() {
        if (!enablePlayerLocationMarker) {
            return;
        }

        if (playerLocationMarker == null) {
            playerLocationMarker = L.marker([0, 0], {
                icon: currentPlayerLocationIcon,
            });
            playerLocationMarker.addTo(map);
        }
        return playerLocationMarker;
    }

    function removePlayerLocationMarker() {
        if (!enablePlayerLocationMarker) {
            return;
        }

        if (playerLocationMarker != null) {
            playerLocationMarker.remove();
            playerLocationMarker = null;
        }
    }

    function updatePlayerLocationMarker() {
        if (!enablePlayerLocationMarker) {
            return;
        }

        if (currentFragmentX != null && currentFragmentY != null) {
            var marker = getPlayerLocationMarker();
            marker.setLatLng([currentFragmentY, currentFragmentX]);
        } else {
            removePlayerLocationMarker();
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

    function initializeMapSpecificStyle(mapName) {
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

    // Initialize all map groupings - these will be used by
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
    initializeFragmentHandling();
    initializeMapClickHandlers();
    initializeRouteCreation();
    setupAdminTools();

    // done: display
    setTimeout(function() {
        document.getElementById('map').style.visibility = 'visible';
    }, 500);
}
