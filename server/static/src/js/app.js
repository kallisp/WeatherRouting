let convexPolyCenter = [];
const polygonVessels = {};
const distancePolyArray = [];
let selectedItinerary = null;
let selectedItineraryText = null
let popupInitRoute = null;
let popupInitRouteContent = null;
let popupPropRoute = null;
let popupPropRouteContent = null;
let baseTimestamp = null;
const hourInterval = 3;
const ROUTE_SELECTED_EVENT = 'route-selected';
const ROUTE_LAYER_ID = 'route-layer';
let proposedRoute = [];
let sumProposedRouteDistance = 0;
let sumInitialRouteDistance = 0;
let decreaseWH = null;
let decreaseWP = null;
let decreaseWD = null;
let decreaseWS = null;
let decreaseWHArray = [];
let decreaseWPArray = [];
let decreaseWDArray = [];
let decreaseWSArray = [];
let avgDecreaseWH = 0;
let avgDecreaseWP = 0;
let avgDecreaseWD = 0;
let avgDecreaseWS = 0;
let sumWH = 0;
let sumWP = 0;
let sumWD = 0;
let sumWS = 0;
let statisticsPopup = null;
let statisticsPopupContent = null;
let routeLengthDiff = 0;

// stores for each vesselId the convexPolyline of the vessel
const convexPolyVessels = {};

// Load Leaflet map
window.addEventListener('load', async (event) => {

    const httpClient = new HTTPClient();
    const mapInstance = new BaseMap(httpClient);

    const map = mapInstance.map;
    const layerControl = mapInstance.layerControl;
    const timeSliderRange = mapInstance.timeRange;

    let proposedRoutePolylineCenters = [];

    let selectedRouteStart;
    let selectedRouteEnd;

    await initRouteData();
    createRoutesList();

    //WMS marine copernicus link for heatmaps
    const waveWMS = 'https://nrt.cmems-du.eu/thredds/wms/med-hcmr-wav-an-fc-h?';

    // create wind velocity map
    const windVelocity = new WindVelocity({ map, httpClient })
    layerControl.addOverlay(windVelocity.layer, windVelocity.name).addTo(map);

    // create wave height heatmap
    const waveHeightWMS = new WaveHeightWMS({ map, waveWMS, timeSliderRange })
    layerControl.addOverlay(waveHeightWMS.layer, waveHeightWMS.name).addTo(map);

    // create wave period heatmap
    const wavePeriodWMS = new WavePeriodWMS({ map, waveWMS, timeSliderRange })
    layerControl.addOverlay(wavePeriodWMS.layer, wavePeriodWMS.name).addTo(map);

    // create wave direction heatmap 
    const waveDirectionWMS = new WaveDirectionWMS({ map, waveWMS, timeSliderRange });
    layerControl.addOverlay(waveDirectionWMS.layer, waveDirectionWMS.name).addTo(map);

    // create wave direction arrow map
    const waveDirectionArrows = new WaveDirectionArrow({ map, httpClient })
    layerControl.addOverlay(waveDirectionArrows.layer, waveDirectionArrows.name).addTo(map);

    // create routes layer
    const routeLayer = new RouteLayer({
        data: convexPolyVessels,
        shipMoved: shipMoved,
        id: ROUTE_LAYER_ID
    });
    routeLayer.layer.addTo(map);

    //create proposed polyline
    let proposedRoutePolyline = L.polyline([], {
        color: 'yellow',
        weight: 2.5
    }).addTo(map);

    async function createRoutesList() {

        //HTTP GET request for routes list in input texts from JSON file
        const routes = await httpClient.getData('static/data/routeList.json');

        const routeListDiv = document.getElementById("route-selector");
        const routeDiv = document.getElementById("route-toggle");

        document.getElementById('route-start').removeAttribute('disabled');
        document.getElementById('route-end').removeAttribute('disabled');

        //display/remove search div element when toggle "Routes button"
        routeDiv.onclick = (e) => {
            e.stopPropagation();
            if (routeListDiv.style.display !== "none") {
                routeListDiv.style.display = "none";
                routeDiv.classList.remove("route-list-active");
            } else {
                routeListDiv.style.display = "flex";
                routeDiv.classList.add("route-list-active");
            }
        }

        //When button is clicked check if user inputs correspond to 'from-to" ports and if true return and display the selected route
        document.getElementById('route-calculate').addEventListener('click', e => {
            e.stopPropagation();
            if (selectedRouteStart && selectedRouteEnd) {
                const selectedItem = routes.find(r => {
                    return r.from === selectedRouteStart && r.to === selectedRouteEnd;
                })
                if (selectedItem) {
                    getSelectedItinerary(selectedItem.value, `${selectedItem.from} - ${selectedItem.to}`);
                    document.getElementsByClassName('router-filter-container')[0].style.display = "none";
                }
            }
        })

        Array.from(document.getElementsByClassName('route-list-search')).forEach(input => {

            const ul = input.parentElement.nextElementSibling;

            //display only distinct routes in "from" input search
            let distinctRoutesFrom = [];
            let distinctRoutesTo = [];

            input.addEventListener('focus', e => {
                e.stopPropagation();
                e.preventDefault();
                ul.style.display = 'block';
                if (input.id === 'route-start') {
                    if (!input.value) {
                        /* Get all routes and check if the departure port exists in departure ports list. 
                          If not, add it to list to create distict list items */
                        routes.forEach(route => {
                            const exists = distinctRoutesFrom.find(r => r.label === route.from);
                            if (!exists) {
                                distinctRoutesFrom.push({ label: route.from, value: route.value });
                            }
                        })
                    }
                    if (ul.childElementCount === 0) {
                        createRoutesListItems(distinctRoutesFrom, ul, input);
                    }
                } else if (input.id === 'route-end') {
                    if (!input.value) {
                        distinctRoutesTo = routes
                            //get all routes and return only those who match user's departure port input 
                            .filter(route => {
                                return route.from === selectedRouteStart;
                            })
                            //return the filtered routes and map them to label/value pairs
                            .map(item => {
                                return { label: item.to, value: item.value };
                            })
                    }
                    document.getElementsByClassName('router-filter-container')[0].style.display = "block";
                    if (ul.childElementCount === 0) {
                        //create arrival ports list based on filtering/mapping 
                        createRoutesListItems(distinctRoutesTo, ul, input);
                        document.getElementsByClassName('router-filter-container')[0].style.display = "block";
                    }
                }
            });

            input.addEventListener('keyup', (e) => {

                let myRoutes;

                if (input.id === 'route-start') {
                    myRoutes = distinctRoutesFrom || [];
                } else if (input.id === 'route-end') {
                    myRoutes = distinctRoutesTo || [];
                }
                filteredRoutes = [];
                ul.innerHTML = '';
                if (e.target.value) {
                    //filter routes based on users input text
                    filteredRoutes = myRoutes.filter(r => {
                        return r.label.toLowerCase().includes(e.target.value.toLowerCase())
                    });
                    //create filtered routes list
                    createRoutesListItems(filteredRoutes, ul, e.target);
                } else {
                    createRoutesListItems(myRoutes, ul, e.target);
                }
            })
        })

        Array.from(document.getElementsByClassName('route-list')).forEach(list => {
            list.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
            })
        })
    }

    //create list items for routes List for the two input texts using DOM - Also add/remove classes to elements
    function createRoutesListItems(items, ulElem, inputElem) {
        items.forEach((item) => {
            const liElem = document.createElement("li");
            liElem.setAttribute("class", "list-group-item");
            liElem.onclick = (e) => {
                e.stopPropagation();
                inputElem.value = item.label;
                ulElem.style.display = "none";
                if (inputElem.id === 'route-start') {
                    selectedRouteStart = item.label;
                    // clear all arrival port inputs
                    const input = document.getElementById('route-end')
                    input.value = '';
                    const ul = input.parentElement.nextElementSibling;
                    ul.innerHTML = ''
                }
                else if (inputElem.id === 'route-end') {
                    selectedRouteEnd = item.label;
                }

                Array.from(ulElem.querySelectorAll(".list-group-item")).forEach((l) => {
                    l.classList.remove("list-group-item-active");
                })
                e.target.classList.add("list-group-item-active");
            };
            liElem.innerHTML = item.label;
            ulElem.appendChild(liElem);
        });
    }

    async function initRouteData() {

        //HTTP GET request to get convex polygons from geoJSON file
        const convexPoly = await httpClient.getData('/static/data/routes_convex.geojson');

        function convexStyle() {
            return {
                fillColor: 'yellow',
                weight: 1.2,
                opacity: 1,
                color: 'green',
                fillOpacity: 0.5
            }
        }
        //display the inital data in convex hulls
        L.geoJSON(convexPoly, { style: convexStyle });//addTo(map);

        //convert geojson to polygon
        const convexPolyArray = convexPoly.features;

        //sort the cells of each polygon before create the polygon centers (using ID field)
        convexPolyArray.sort(function compare(firstEl, secondEl) {
            const cellID = firstEl.properties.ID;
            const cellIDNext = secondEl.properties.ID;

            if (cellID < cellIDNext) {
                return -1
            }
            else {
                return 1
            }
        });

        // get coordinates for each polygon for each itinerary
        for (i = 0; i <= convexPolyArray.length - 1; i++) {
            const polygonVessel = convexPolyArray[i];

            const vesselId = polygonVessel.properties.ITINERARY;

            if (!(vesselId in polygonVessels)) {
                polygonVessels[vesselId] = [];
            }

            polygonVessels[vesselId].push({
                coordinates: polygonVessel.geometry.coordinates,
                speed: polygonVessel.properties.MEAN_SPEED,
                heading: polygonVessel.properties.MEAN_HEADI,
                timestamp: polygonVessel.properties.TIMESTAMP
            });
        }

        // we now have all the coordinates for each vessel and we loop each vessel polygon to get the centers
        for (const vesselId in polygonVessels) {

            const vesselArray = polygonVessels[vesselId];

            let invertCoordsArray = [];
            let invertArray = [];
            convexPolyCenter = [];

            // invert lat / long  (leaflet expects lat/long but our data is long/lat)
            for (i = 0; i <= vesselArray.length - 1; i++) {
                const vesselInstance = vesselArray[i].coordinates;
                for (j = 0; j <= vesselInstance[0][0].length - 1; j++) {
                    invertCoordsArray.push([vesselInstance[0][0][j][0], vesselInstance[0][0][j][1]])
                }
                //InvertArray clones the vesselArray properties and replaces the coordinates property from InvertCoordsArray
                invertArray.push({
                    ...vesselArray[i],
                    coordinates: invertCoordsArray
                });
                invertCoordsArray = [];
            }

            // find the centroid for each polygon
            invertArray.forEach(function (poly) {
                let polygon = L.polygon(poly.coordinates);
                let bounds = polygon.getBounds();
                let latLngCenter = bounds.getCenter();
                convexPolyCenter.push({
                    center: [latLngCenter.lng, latLngCenter.lat],
                    timestamp: poly.timestamp,
                    speed: poly.speed,
                    heading: poly.heading
                });
            })

            // calculate timestamp 
            for (i = 1; i <= convexPolyCenter.length - 1; i++) {

                const fromLatLng = L.latLng(convexPolyCenter[i - 1].center);
                const toLatLng = L.latLng(convexPolyCenter[i].center);

                //convert distance from meters (default) to nautical miles 
                const distanceBetween = fromLatLng.distanceTo(toLatLng) * 0.0005399568;
                distancePolyArray.push(distanceBetween);

                //calculate time from Mean Speed and distance -- time=Distance/Speed - time units: hour
                const speed = convexPolyCenter[i - 1].speed;
                let timeBetween = (distanceBetween / speed).toFixed(2);

                const heading = convexPolyCenter[i - 1].heading;
                baseTimestamp = convexPolyCenter[0].timestamp;

                let previousTimestamp;

                if (i == 1) {
                    previousTimestamp = baseTimestamp;
                } else {
                    previousTimestamp = convexPolyCenter[i - 1].timestamp;
                }

                const timestamp = moment(previousTimestamp).add(Number(timeBetween), 'hours').utc().toISOString();

                convexPolyCenter[i].timestamp = timestamp;

                if (!convexPolyVessels[vesselId]) {
                    convexPolyVessels[vesselId] = [];
                }

                if (i == 1) {
                    convexPolyVessels[vesselId].push({
                        center: convexPolyCenter[i - 1].center,
                        timestamp: previousTimestamp,
                        heading: heading,
                        speed: speed
                    })
                }
                // store for each vesselId, an array with the center, heading, speed and timestamp of the polygon
                convexPolyVessels[vesselId].push({
                    center: convexPolyCenter[i].center,
                    timestamp: timestamp,
                    heading: heading,
                    speed: speed
                })
            }
        }
    }

    function reset() {
        sumInitialRouteDistance = 0;
        sumProposedRouteDistance = 0;
        decreaseWH = 0;
        decreaseWP = 0;
        decreaseWD = 0;
        decreaseWS = 0;
        decreaseWHArray = [];
        decreaseWPArray = [];
        decreaseWDArray = [];
        decreaseWSArray = [];
        avgDecreaseWH = 0;
        avgDecreaseWP = 0;
        avgDecreaseWD = 0;
        avgDecreaseWS = 0;
        sumWH = 0;
        sumWP = 0;
        sumWD = 0;
        sumWS = 0;
        routeLengthDiff = 0;
    }

    //get route info when a itinerary is selected
    function getSelectedItinerary(value, label) {
        reset();
        selectedItinerary = value;
        selectedItineraryText = label;
        const detail = {
            timestamp: convexPolyVessels[selectedItinerary][0].timestamp,
            center: [convexPolyVessels[selectedItinerary][0].center[0], convexPolyVessels[selectedItinerary][0].center[1]],
            heading: convexPolyVessels[selectedItinerary][0].heading,
            selectedItinerary,
            selectedItineraryText,
            sumInitialRouteDistance,
            sumProposedRouteDistance
        }

        const routeSelectedEvent = new CustomEvent(ROUTE_SELECTED_EVENT, { detail });
        window.dispatchEvent(routeSelectedEvent);
    }

    window.addEventListener(ROUTE_SELECTED_EVENT, (e) => {

        // clear previous routes
        proposedRoutePolylineCenters = [];
        proposedRoutePolyline.setLatLngs([]);

        map.eachLayer(layer => {
            if (layer.id === ROUTE_LAYER_ID) {
                layer.reset();
            }
        })

        //move time slider in each route's initial timestamp when route selected
        const time = moment.utc(e.detail.timestamp).valueOf();
        map.timeDimension.setCurrentTime(time);
        map.closePopup();
    })

    async function shipMoved(data) {
        try {
            const lat = data.center.lat;
            const lon = data.center.lng;
            const timestamp = data.timestamp;
            const heading = data.heading;
            const speed = data.speed;

            if (data.prevCenter) {
                const prevLat = data.prevCenter.lat;
                const prevLon = data.prevCenter.lng;
                const startLatInit = prevLat;
                const startLonInit = prevLon;
                const destLatInit = lat;
                const destLonInit = lon;


                if (this._polyline._latlngs.length > 1) {

                    //Calculate Haversine distance (in km) between points of the Initial Route
                    let InitialDistance = getDistanceFromLatLonInKm(startLatInit, startLonInit, destLatInit, destLonInit)
                    sumInitialRouteDistance += InitialDistance;
                }
            }

            //HTTP GET Requests to get weather data on every point/timestamp for initial and proposed route
            const initialRouteData = await httpClient.getData(`/route/coords/${lon}:${lat}/heading/${heading}/time/${timestamp}`)
            const proposedRouteData = await httpClient.getData(`/proposedRoute/coords/${lon}:${lat}/heading/${heading}/time/${timestamp}`)


            let found = false;

            const initWaveHeight = initialRouteData[0][2];
            const initWavePeriod = initialRouteData[0][5];
            const initWindSpeed = initialRouteData[0][6];
            const initWaveAngle = initialRouteData[0][3];
            let encounterAngleProposed;

            popupInitRouteContent = `
            <p>Route ${selectedItineraryText} </p>
            <b>Departure Time: </b> ${data.departureTime} <br>
            <b>Arrival Time: </b> ${data.arrivalTime}  <br>
            <b>Distance Traveled: </b> ${sumInitialRouteDistance.toFixed(2)} km 
            <hr/>
            <b>Wave Height: </b> ${initWaveHeight.toFixed(2)} m <br>
            <b>Wave Period: </b> ${initWavePeriod.toFixed(2)} s <br>
            <b>Relative Wave Direction: </b> ${initWaveAngle.toFixed(2)}° <br>
            <b>Wind Speed: </b> ${initWindSpeed.toFixed(2)} m/s <br>`

            this._popupInitRoute.setContent(popupInitRouteContent);

            //check the weather thresholds 
            if ((initWaveHeight < 4.5 || initWavePeriod < 8) && (initWindSpeed < 19 || ((initWaveAngle < 60 || initWaveAngle > 115) && (initWaveAngle < 235 || initWaveAngle > 270)))) {
                proposedRoutePolylineCenters.push([lat, lon]);
                this._proposedPolylineMarker.removeFrom(this._baseLayer);
            }
            else {
                for (i = 0; i <= proposedRouteData.length - 1; i++) {
                    if (found == false) {
                        let newLat = proposedRouteData[i][0];
                        let newLng = proposedRouteData[i][1];
                        const newPolyCenter = [newLat, newLng]

                        //Calculate the bearing angle between two successive waypoints of the proposed route 
                        if (proposedRoutePolylineCenters.length > 0) {
                            const startLat = proposedRoutePolylineCenters[proposedRoutePolylineCenters.length - 1][0]
                            const startLon = proposedRoutePolylineCenters[proposedRoutePolylineCenters.length - 1][1]
                            const destLat = newLat
                            const destLon = newLng

                            const y = Math.sin(destLon - startLon) * Math.cos(destLat);
                            const x = Math.cos(startLat) * Math.sin(destLat) - Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLon - startLon);

                            const angleDegProposed = Math.atan2(x, y) * 180 / Math.PI; //angle in degress from north

                            const proposedLatCheck = newLat;
                            const proposedLonCheck = newLng;
                            const proposedHeadingCheck = angleDegProposed;
                            //const acceptedDistance = speed * 3 // the accepted distance is calculated for the next 3h which is our timestamp (time = 3h) sp as the vessel to have arrived to next point

                            //calculate the distance between the initial and proposed route (for the current lat, lon points)
                            // const initLatLng = L.latLng(startLat, startLon);
                            // const proposedLatLng = L.latLng(destLat, destLon);
                            // const distanceDiff = initLatLng.distanceTo(proposedLatLng)* 0.0005399568; //convert meters to nautical miles
                            // // if (distanceDiff > acceptedDistance) {
                            // //     alert("No accepted distance!")
                            //    console.log(distanceDiff, acceptedDistance);
                            // // }

                            //get relative angle between ship's heading in proposed route and wave direction
                            const proposedRouteDataCheck = await httpClient.getData(`/proposedRouteHeading/coords/${proposedLonCheck}:${proposedLatCheck}/heading/${proposedHeadingCheck}/time/${timestamp}`);

                            encounterAngleProposed = proposedRouteDataCheck[0][0];

                            if ((encounterAngleProposed < 60 || encounterAngleProposed > 115) && (encounterAngleProposed < 235 || encounterAngleProposed > 270)) {
                                proposedRoutePolylineCenters.push(newPolyCenter);
                                this._proposedPolylineMarker.addTo(this._baseLayer);
                                this._proposedPolylineMarker.setLatLng(newPolyCenter);
                                proposedRoute = proposedRouteData[i];


                                found = true;

                                const propWaveHeight = proposedRoute[2];
                                const propWavePeriod = proposedRoute[5];
                                const propWaveAngle = proposedRoute[3];
                                const propWindSpeed = proposedRoute[6];

                                //Calculate route statistics
                                decreaseWH = (initWaveHeight - propWaveHeight) / initWaveHeight * 100;
                                decreaseWP = (initWavePeriod - propWavePeriod) / initWavePeriod * 100;
                                decreaseWD = Math.abs(initWaveAngle - propWaveAngle) / 360 * 100;
                                decreaseWS = (initWindSpeed - propWindSpeed) / initWindSpeed * 100;

                                decreaseWHArray.push(decreaseWH);
                                decreaseWPArray.push(decreaseWP);
                                decreaseWSArray.push(decreaseWS);
                                decreaseWDArray.push(decreaseWD);
                            }
                        }
                    }
                }
            }

            proposedRoutePolyline.setLatLngs(proposedRoutePolylineCenters);

            if (proposedRoutePolyline._latlngs.length > 1) {

                const startPropLat = proposedRoutePolyline._latlngs[proposedRoutePolyline._latlngs.length - 2].lat
                const startPropLon = proposedRoutePolyline._latlngs[proposedRoutePolyline._latlngs.length - 2].lng
                const destPropLat = proposedRoutePolyline._latlngs[proposedRoutePolyline._latlngs.length - 1].lat
                const destPropLon = proposedRoutePolyline._latlngs[proposedRoutePolyline._latlngs.length - 1].lng

                //Calculate Haversine distance (in km) between points of the Proposed Route
                let proposedDistance = getDistanceFromLatLonInKm(startPropLat, startPropLon, destPropLat, destPropLon)
                sumProposedRouteDistance += proposedDistance;
            }

            //check if route has been completed in order to calculate the statistics regarding the risk decrease
            if ((proposedRoutePolyline._latlngs[proposedRoutePolyline._latlngs.length - 1].lat === convexPolyVessels[selectedItinerary][convexPolyVessels[selectedItinerary].length - 1].center[0])
                && (proposedRoutePolyline._latlngs[proposedRoutePolyline._latlngs.length - 1].lng === convexPolyVessels[selectedItinerary][convexPolyVessels[selectedItinerary].length - 1].center[1])) {
                decreaseWHArray.forEach((h) => {
                    sumWH += h
                });
                avgDecreaseWH = sumWH / decreaseWHArray.length;

                decreaseWPArray.forEach((p) => {
                    sumWP += p
                });
                avgDecreaseWP = sumWP / decreaseWPArray.length;

                decreaseWDArray.forEach((d) => {
                    sumWD += d
                });
                avgDecreaseWD = sumWD / decreaseWDArray.length;

                decreaseWSArray.forEach((s) => {
                    sumWS += s
                });
                avgDecreaseWS = sumWS / decreaseWSArray.length;

                let prefix = null;

                if (avgDecreaseWS > 0) {
                    prefix = 'Decrease'
                } else {
                    prefix = 'Increase';
                    avgDecreaseWS = Math.abs(avgDecreaseWS);
                }

                routeLengthDiff = (sumProposedRouteDistance - sumInitialRouteDistance) / sumInitialRouteDistance * 100;

                statisticsPopupContent = `
                <p>Route Statistics </p>
                <b>Wave Height Decrease : </b> ${avgDecreaseWH.toFixed(2)}% <br>
                <b>Wave Period Decrease : </b> ${avgDecreaseWP.toFixed(2)}% <br>
                <b>Wave Direction Deviation : </b> ${avgDecreaseWD.toFixed(2)}% <br>
                <b>Wind Speed ${prefix} : </b> ${avgDecreaseWS.toFixed(2)}% <br>
                <hr/>
                <b style = "color: #c62828">Route Length Increase: </b> ${routeLengthDiff.toFixed(2)}% <br>
                `
                //Statistics popup open automatically when route has arrived to destination
                statisticsPopup = L.popup({ autoClose: true })
                    .setLatLng(convexPolyVessels[selectedItinerary][convexPolyVessels[selectedItinerary].length - 1].center)
                    .setContent(statisticsPopupContent)
                    .openOn(map);
            }

        } catch (ex) {
            console.error(ex);
            alert(ex);
        }
    }

});

//Calculate distance (in km) from geographical coords 
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}


