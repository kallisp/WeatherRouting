"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// let map = null;
var convexPolyCoords = [];
var convexPolyCenter = [];
var polygonVessels = {};
var polylines = {};
var markers = {};
var posWaveHeightData = [];
var minMaxArray = [];
var currentPolyline = null;
var distancePolyArray = [];
var timePolyArray = [];
var selectedItinerary = null;
var selectedItineraryText = null;
var hourInterval = 3;
var popupInitRoute = null;
var popupInitRouteContent = null;
var popupPropRoute = null;
var popupPropRouteContent = null;
var baseTimestamp = null;
var ROUTE_SELECTED_EVENT = 'route-selected';
var ROUTE_LAYER_ID = 'route-layer';
var routeData = [];
var arrowCoordsObj = {};
var arrowInstanceCoords = [];
var proposedRoute = [];
var sumProposedRouteDistance = 0;
var sumInitialRouteDistance = 0;
var decreasePercentage = {};
var decreaseWH = null;
var decreaseWP = null;
var decreaseWD = null;
var decreaseWS = null;
var decreaseWHArray = [];
var decreaseWPArray = [];
var decreaseWDArray = [];
var decreaseWSArray = [];
var avgDecreaseWH = 0;
var avgDecreaseWP = 0;
var avgDecreaseWD = 0;
var avgDecreaseWS = 0;
var sumWH = 0;
var sumWP = 0;
var sumWD = 0;
var sumWS = 0;
var statisticsPopup = null;
var statisticsPopupContent = null;
var routeLengthDiff = 0; // stores for each vesselId the convexPolyline of the vessel

var convexPolyVessels = {}; // Load Leaflet map

window.addEventListener('load', function _callee(event) {
  var httpClient, mapInstance, map, layerControl, timeSliderRange, proposedRoutePolylineCenters, waveWMS, windVelocity, waveHeightWMS, wavePeriodWMS, waveDirectionWMS, waveDirectionArrows, routeLayer, proposedRoutePolyline, createRoutesList, createRoutesListItems, initRouteData, getSelectedItinerary, shipMoved;
  return regeneratorRuntime.async(function _callee$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          shipMoved = function _ref6(data) {
            var lat, lon, timestamp, heading, speed, prevLat, prevLon, startLatInit, startLonInit, destLatInit, destLonInit, InitialDistance, initialRouteData, proposedRouteData, latIn, lonIn, found, initWaveHeight, initWavePeriod, initWindSpeed, initWaveAngle, encounterAngleProposed, newLat, newLng, newPolyCenter, startLat, startLon, destLat, destLon, y, x, angleDegProposed, proposedLatCheck, proposedLonCheck, proposedHeadingCheck, proposedRouteDataCheck, propWaveHeight, propWavePeriod, propWaveAngle, propWindSpeed, startPropLat, startPropLon, destPropLat, destPropLon, proposedDistance;
            return regeneratorRuntime.async(function shipMoved$(_context3) {
              while (1) {
                switch (_context3.prev = _context3.next) {
                  case 0:
                    _context3.prev = 0;
                    lat = data.center.lat;
                    lon = data.center.lng;
                    timestamp = data.timestamp;
                    heading = data.heading;
                    speed = data.speed;

                    if (data.prevCenter) {
                      prevLat = data.prevCenter.lat;
                      prevLon = data.prevCenter.lng;
                      startLatInit = prevLat;
                      startLonInit = prevLon;
                      destLatInit = lat;
                      destLonInit = lon;

                      if (this._polyline._latlngs.length > 1) {
                        //Calculate Haversine distance (in km) between points of the Initial Route
                        InitialDistance = getDistanceFromLatLonInKm(startLatInit, startLonInit, destLatInit, destLonInit);
                        sumInitialRouteDistance += InitialDistance;
                        console.log("Initial: " + sumInitialRouteDistance);
                      }
                    } // const proposedRouteData = await httpClient.getData(`/proposedRoute/coords/${lon}:${lat}/speed/${speed}/heading/${heading}/time/${timestamp}`)


                    _context3.next = 9;
                    return regeneratorRuntime.awrap(httpClient.getData("/route/coords/".concat(lon, ":").concat(lat, "/heading/").concat(heading, "/time/").concat(timestamp)));

                  case 9:
                    initialRouteData = _context3.sent;
                    _context3.next = 12;
                    return regeneratorRuntime.awrap(httpClient.getData("/proposedRoute/coords/".concat(lon, ":").concat(lat, "/heading/").concat(heading, "/time/").concat(timestamp)));

                  case 12:
                    proposedRouteData = _context3.sent;
                    latIn = initialRouteData[0][0];
                    lonIn = initialRouteData[0][1]; //console.log('initial: ' + initialRouteData, '\n proposed: ' + proposedRouteData);
                    // var yInit = Math.sin(destLonInit - startLonInit) * Math.cos(destLatInit);
                    // var xInit = Math.cos(startLatInit) * Math.sin(destLatInit) - Math.sin(startLatInit) * Math.cos(destLatInit) * Math.cos(destLonInit - startLonInit);
                    // angleDegInit = Math.abs(Math.atan2(yInit, xInit) * 180 / Math.PI); // angle in degrees

                    found = false;
                    initWaveHeight = initialRouteData[0][2];
                    initWavePeriod = initialRouteData[0][5];
                    initWindSpeed = initialRouteData[0][6];
                    initWaveAngle = initialRouteData[0][3];
                    popupInitRouteContent = "\n            <p>Route ".concat(selectedItineraryText, " </p>\n            <b>Departure Time: </b> ").concat(data.departureTime, " <br>\n            <b>Arrival Time: </b> ").concat(data.arrivalTime, "  <br>\n            <b>Distance Traveled: </b> ").concat(sumInitialRouteDistance.toFixed(2), " km \n            <hr/>\n            <b>Wave Height: </b> ").concat(initWaveHeight.toFixed(2), " m <br>\n            <b>Wave Period: </b> ").concat(initWavePeriod.toFixed(2), " s <br>\n            <b>Relative Wave Direction: </b> ").concat(initWaveAngle.toFixed(2), "\xB0 <br>\n            <b>Wind Speed: </b> ").concat(initWindSpeed.toFixed(2), " m/s <br>");

                    this._popupInitRoute.setContent(popupInitRouteContent);

                    if (!(initWaveHeight < 4.5 && initWavePeriod < 8 && initWindSpeed < 19)) {
                      _context3.next = 27;
                      break;
                    }

                    //(found == false)
                    proposedRoutePolylineCenters.push([lat, lon]);

                    this._proposedPolylineMarker.removeFrom(this._baseLayer);

                    _context3.next = 54;
                    break;

                  case 27:
                    i = 0;

                  case 28:
                    if (!(i <= proposedRouteData.length - 1)) {
                      _context3.next = 54;
                      break;
                    }

                    if (!(found == false)) {
                      _context3.next = 51;
                      break;
                    }

                    encounterAngleInitial = proposedRouteData[i][3];

                    if (!((encounterAngleInitial < 60 || encounterAngleInitial > 115) && (encounterAngleInitial < 235 || encounterAngleInitial > 270))) {
                      _context3.next = 51;
                      break;
                    }

                    newLat = proposedRouteData[i][0];
                    newLng = proposedRouteData[i][1];
                    newPolyCenter = [newLat, newLng]; // proposedRoutePolylineCenters.push(newPolyCenter);
                    // found = true;
                    //calculate the bearing angle between two successive waypoints of the proposed route 

                    if (!(proposedRoutePolylineCenters.length > 0)) {
                      _context3.next = 51;
                      break;
                    }

                    startLat = proposedRoutePolylineCenters[proposedRoutePolylineCenters.length - 1][0];
                    startLon = proposedRoutePolylineCenters[proposedRoutePolylineCenters.length - 1][1];
                    destLat = newLat;
                    destLon = newLng;
                    y = Math.sin(destLon - startLon) * Math.cos(destLat);
                    x = Math.cos(startLat) * Math.sin(destLat) - Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLon - startLon);
                    angleDegProposed = Math.atan2(x, y) * 180 / Math.PI; // angle in degrees from north + 360) % 360

                    proposedLatCheck = newLat;
                    proposedLonCheck = newLng;
                    proposedHeadingCheck = angleDegProposed; //const acceptedDistance = speed * 3 // the accepted distance is calculated for the next 3h which is our timestamp (time = 3h) sp as the vessel to have arrived to next point

                    _context3.next = 48;
                    return regeneratorRuntime.awrap(httpClient.getData("/proposedRouteHeading/coords/".concat(proposedLonCheck, ":").concat(proposedLatCheck, "/heading/").concat(proposedHeadingCheck, "/time/").concat(timestamp)));

                  case 48:
                    proposedRouteDataCheck = _context3.sent;
                    encounterAngleProposed = proposedRouteDataCheck[0][0];

                    if ((encounterAngleProposed < 60 || encounterAngleProposed > 115) && (encounterAngleProposed < 235 || encounterAngleProposed > 270)) {
                      proposedRoutePolylineCenters.push(newPolyCenter); // this._proposedPolylineMarker.setLatLng(newPolyCenter).setRotationAngle(proposedHeadingCheck);

                      this._proposedPolylineMarker.addTo(this._baseLayer);

                      this._proposedPolylineMarker.setLatLng(newPolyCenter);

                      proposedRoute = proposedRouteData[i]; //calculate the distance between the initial and proposed route (for the current lat, lon points)
                      // const initLatLng = L.latLng(startLat2, startLon2);
                      // const proposedLatLng = L.latLng(destLat2, destLon2);
                      // const distanceDiff = initLatLng.distanceTo(proposedLatLng) * 0.0005399568; //convert meters to nautical miles
                      // if (distanceDiff > acceptedDistance) {
                      //     // alert("No accepted distance!")
                      //     console.log(distanceDiff, acceptedDistance);
                      // }

                      found = true; // console.log("proposed: " + newPolyCenter);

                      propWaveHeight = proposedRoute[2];
                      propWavePeriod = proposedRoute[5];
                      propWaveAngle = proposedRoute[3];
                      propWindSpeed = proposedRoute[6];
                      decreaseWH = (initWaveHeight - propWaveHeight) / initWaveHeight * 100;
                      decreaseWP = (initWavePeriod - propWavePeriod) / initWavePeriod * 100;
                      decreaseWD = Math.abs(initWaveAngle - propWaveAngle) / 360 * 100;
                      decreaseWS = (initWindSpeed - propWindSpeed) / initWindSpeed * 100;
                      decreaseWHArray.push(decreaseWH);
                      decreaseWPArray.push(decreaseWP);
                      decreaseWSArray.push(decreaseWS);
                      decreaseWDArray.push(decreaseWD);
                      console.log(initWaveHeight, initWavePeriod, initWaveAngle, initWindSpeed);
                      console.log(propWaveHeight, propWavePeriod, propWaveAngle, propWindSpeed); // this._popupPropRoute = L.popup({ autoClose: true })
                      // popupPropRouteContent = `
                      // <b>Departure Time: </b> ${departureTime} <br>
                      // <b>Arrival Time: </b> ${arrivalTime}  <br>
                      // <b>Distance Traveled: </b> ${sumProposedRouteDistance} km 
                      // <hr/>
                      // <b>Wave Height: </b> ${propWaveHeight} m <br>
                      // <b>Wave Period: </b> ${propWavePeriod} s <br>
                      // <b>Relative Wave Direction: </b> ${propWaveAngle}° <br>
                      // <b>Wind Speed: </b> ${propWindSpeed} m/s <br>`
                      // this._popupPropRoute.setContent(popupPropRouteContent);
                    }

                  case 51:
                    i++;
                    _context3.next = 28;
                    break;

                  case 54:
                    //data for polyline smoothing

                    /*
                    if (this._currentVesselPositionIndex == this._vesselData[selectedItinerary].length - 2) {
                        //POST SERVICE for smoothing the proposed route            
                        const latProposed = [];
                        const lonProposed = [];
                    
                        proposedRoutePolylineCenters.forEach(item => {
                            latProposed.push(item[0]);
                            lonProposed.push(item[1]);
                        });
                    
                        // data to be used on post request
                        const proposedData = {
                            proposedLat: latProposed,
                            proposedLon: lonProposed
                        }
                    
                        const proposedRouteDataFiltered = await httpClient.postData('/polyline/smooth', proposedData);
                    
                        //console.log(proposedRouteDataFiltered.proposedLatFiltered[proposedRouteDataFiltered.proposedLatFiltered.length-1])
                    
                        let proposedLatFiltered = proposedRouteDataFiltered.proposedLatFiltered;
                        let proposedLonFiltered = proposedRouteDataFiltered.proposedLonFiltered;
                        const smoothedPolyCenters = [proposedLatFiltered, proposedLonFiltered]
                    
                        for (i = 0; i <= smoothedPolyCenters[0].length - 1; i++) {
                            let smoothLat = smoothedPolyCenters[0][i];
                            let smoothLng = smoothedPolyCenters[1][i];
                            const smoothedPolyCenter = [smoothLat, smoothLng]
                    
                            proposedRouteFilteredPolylineCenters.push(smoothedPolyCenter);
                        }
                    
                    }
                    */
                    proposedRoutePolyline.setLatLngs(proposedRoutePolylineCenters); // proposedRouteFilteredPolyline.setLatLngs(proposedRouteFilteredPolylineCenters);

                    if (proposedRoutePolyline._latlngs.length > 1) {
                      startPropLat = proposedRoutePolyline._latlngs[proposedRoutePolyline._latlngs.length - 2].lat;
                      startPropLon = proposedRoutePolyline._latlngs[proposedRoutePolyline._latlngs.length - 2].lng;
                      destPropLat = proposedRoutePolyline._latlngs[proposedRoutePolyline._latlngs.length - 1].lat;
                      destPropLon = proposedRoutePolyline._latlngs[proposedRoutePolyline._latlngs.length - 1].lng; //Calculate Haversine distance (in km) between points of the Proposed Route

                      proposedDistance = getDistanceFromLatLonInKm(startPropLat, startPropLon, destPropLat, destPropLon);
                      sumProposedRouteDistance += proposedDistance;
                      console.log("Proposed: " + sumProposedRouteDistance);
                    } //check if route has completed in order to calculate the statistics regarding the risk decrease


                    if (proposedRoutePolyline._latlngs[proposedRoutePolyline._latlngs.length - 1].lat === convexPolyVessels[selectedItinerary][convexPolyVessels[selectedItinerary].length - 1].center[0] && proposedRoutePolyline._latlngs[proposedRoutePolyline._latlngs.length - 1].lng === convexPolyVessels[selectedItinerary][convexPolyVessels[selectedItinerary].length - 1].center[1]) {
                      decreaseWHArray.forEach(function (h) {
                        sumWH += h;
                      });
                      avgDecreaseWH = sumWH / decreaseWHArray.length;
                      decreaseWPArray.forEach(function (p) {
                        sumWP += p;
                      });
                      avgDecreaseWP = sumWP / decreaseWPArray.length;
                      decreaseWDArray.forEach(function (d) {
                        sumWD += d;
                      });
                      avgDecreaseWD = sumWD / decreaseWDArray.length;

                      if (decreaseWSArray.length > 0) {
                        decreaseWSArray.forEach(function (s) {
                          sumWS += s;
                        });
                        avgDecreaseWS = sumWS / decreaseWSArray.length;
                      }

                      routeLengthDiff = (sumProposedRouteDistance - sumInitialRouteDistance) / sumInitialRouteDistance * 100;
                      statisticsPopupContent = "\n                <p>Route Statistics </p>\n                <b>Wave Height Decrease : </b> ".concat(avgDecreaseWH.toFixed(2), "% <br>\n                <b>Wave Period Decrease : </b> ").concat(avgDecreaseWP.toFixed(2), "% <br>\n                <b>Wave Direction Deviation : </b> ").concat(avgDecreaseWD.toFixed(2), "% <br>\n                <b>Wind Speed Decrease : </b> ").concat(avgDecreaseWS.toFixed(2), "% <br>\n                <hr/>\n                <b style = \"color: #c62828\">Route Length Increase: </b> ").concat(routeLengthDiff.toFixed(2), "% <br>\n                ");
                      statisticsPopup = L.popup({
                        autoClose: true
                      }).setLatLng(convexPolyVessels[selectedItinerary][convexPolyVessels[selectedItinerary].length - 1].center).setContent(statisticsPopupContent).openOn(map);
                    }

                    _context3.next = 63;
                    break;

                  case 59:
                    _context3.prev = 59;
                    _context3.t0 = _context3["catch"](0);
                    console.error(_context3.t0);
                    alert(_context3.t0);

                  case 63:
                  case "end":
                    return _context3.stop();
                }
              }
            }, null, this, [[0, 59]]);
          };

          getSelectedItinerary = function _ref5(value, label) {
            sumInitialRouteDistance = 0;
            sumProposedRouteDistance = 0;
            selectedItinerary = value;
            selectedItineraryText = label;
            var detail = {
              timestamp: convexPolyVessels[selectedItinerary][0].timestamp,
              center: [convexPolyVessels[selectedItinerary][0].center[0], convexPolyVessels[selectedItinerary][0].center[1]],
              heading: convexPolyVessels[selectedItinerary][0].heading,
              selectedItinerary: selectedItinerary,
              sumInitialRouteDistance: sumInitialRouteDistance,
              sumProposedRouteDistance: sumProposedRouteDistance
            };
            var routeSelectedEvent = new CustomEvent(ROUTE_SELECTED_EVENT, {
              detail: detail
            });
            window.dispatchEvent(routeSelectedEvent);
          };

          initRouteData = function _ref4() {
            var convexStyle, convexPoly, convexPolyArray, polygonVessel, vesselId, _vesselId, vesselArray, invertCoordsArray, invertArray, vesselInstance, fromLatLng, toLatLng, distanceBetween, speed, timeBetween, heading, previousTimestamp, timestamp;

            return regeneratorRuntime.async(function initRouteData$(_context2) {
              while (1) {
                switch (_context2.prev = _context2.next) {
                  case 0:
                    convexStyle = function _ref() {
                      return {
                        fillColor: 'yellow',
                        weight: 1.2,
                        opacity: 1,
                        color: 'green',
                        fillOpacity: 0.5
                      };
                    };

                    _context2.next = 3;
                    return regeneratorRuntime.awrap(httpClient.getData('static/data/routes_selected_jul22.geojson'));

                  case 3:
                    convexPoly = _context2.sent;
                    L.geoJSON(convexPoly, {
                      style: convexStyle
                    }); //.addTo(map);
                    //convert geojson to polygon

                    convexPolyArray = convexPoly.features; //sort the cells (ID is order of data ASC) of each polygon before create the polygon centers. ID field was created for that reason 

                    convexPolyArray.sort(function compare(firstEl, secondEl) {
                      var cellID = firstEl.properties.ID;
                      var cellIDNext = secondEl.properties.ID;

                      if (cellID < cellIDNext) {
                        return -1;
                      } else {
                        return 1;
                      }
                    }); // get coordinates for each polygon for each itinerary

                    for (i = 0; i <= convexPolyArray.length - 1; i++) {
                      polygonVessel = convexPolyArray[i];
                      vesselId = polygonVessel.properties.ITINERARY;

                      if (!(vesselId in polygonVessels)) {
                        polygonVessels[vesselId] = [];
                      }

                      polygonVessels[vesselId].push({
                        coordinates: polygonVessel.geometry.coordinates,
                        speed: polygonVessel.properties.MEAN_SPEED,
                        heading: polygonVessel.properties.MEAN_HEADI,
                        timestamp: polygonVessel.properties.TIMESTAMP
                      });
                    } // we now have all the coordinates for each vessel and we loop each vessel polygon to get the centers


                    for (_vesselId in polygonVessels) {
                      vesselArray = polygonVessels[_vesselId]; // const vesselArray = vessel.coordinates; 

                      invertCoordsArray = [];
                      invertArray = [];
                      convexPolyCenter = []; // invert lat / long  (leaflet expects lat/long but our data is long/lat)

                      for (i = 0; i <= vesselArray.length - 1; i++) {
                        vesselInstance = vesselArray[i].coordinates; //console.log(vesselInstance[0].length);

                        for (j = 0; j <= vesselInstance[0][0].length - 1; j++) {
                          invertCoordsArray.push([vesselInstance[0][0][j][0], vesselInstance[0][0][j][1]]);
                        } //InvertArray clones the vesselArray properties and replaces the coordinates property from InvertCoordsArray


                        invertArray.push(_objectSpread({}, vesselArray[i], {
                          coordinates: invertCoordsArray
                        }));
                        invertCoordsArray = [];
                      } // find the centroid for each polygon


                      invertArray.forEach(function (poly) {
                        var polygon = L.polygon(poly.coordinates);
                        var bounds = polygon.getBounds();
                        var latLngCenter = bounds.getCenter();
                        convexPolyCenter.push({
                          center: [latLngCenter.lng, latLngCenter.lat],
                          timestamp: poly.timestamp,
                          speed: poly.speed,
                          heading: poly.heading
                        });
                      }); // calculate timestamp 

                      for (i = 1; i <= convexPolyCenter.length - 1; i++) {
                        // const Previopoint = convexPolyCenter[i-1];
                        fromLatLng = L.latLng(convexPolyCenter[i - 1].center);
                        toLatLng = L.latLng(convexPolyCenter[i].center); //convert distance from meters (default) to nautical miles 

                        distanceBetween = fromLatLng.distanceTo(toLatLng) * 0.0005399568;
                        distancePolyArray.push(distanceBetween); //calculate time from Mean Speed and distance -- time=Distance/Speed - time units: hour

                        speed = convexPolyCenter[i - 1].speed;
                        timeBetween = (distanceBetween / speed).toFixed(2);
                        heading = convexPolyCenter[i - 1].heading;
                        baseTimestamp = convexPolyCenter[0].timestamp; // just for console log 
                        // TODO: remove me

                        timePolyArray.push(timeBetween);
                        previousTimestamp = void 0;

                        if (i == 1) {
                          previousTimestamp = baseTimestamp;
                        } else {
                          previousTimestamp = convexPolyCenter[i - 1].timestamp;
                        }

                        timestamp = moment(previousTimestamp).add(Number(timeBetween), 'hours').utc().toISOString();
                        convexPolyCenter[i].timestamp = timestamp;

                        if (!convexPolyVessels[_vesselId]) {
                          convexPolyVessels[_vesselId] = [];
                        }

                        if (i == 1) {
                          convexPolyVessels[_vesselId].push({
                            center: convexPolyCenter[i - 1].center,
                            timestamp: previousTimestamp,
                            heading: heading,
                            speed: speed
                          });
                        } // store for each vesselid, an array with the center of the polygon and the timestamp


                        convexPolyVessels[_vesselId].push({
                          center: convexPolyCenter[i].center,
                          timestamp: timestamp,
                          heading: heading,
                          speed: speed
                        });
                      } //sort the centers of each polygon before create the polyline
                      // convexPolyCenter.sort(function compare(firstEl, secondEl) {
                      //     lon = firstEl[1];
                      //     lonNext = secondEl[1];
                      //     if (lon < lonNext) {
                      //         return -1
                      //     }
                      //     else {
                      //         return 1
                      //     }
                      // });
                      // const polyline = L.polyline(convexPolyCenter, {
                      //     color: '#8400CC',
                      //     weight: 2,
                      //     snakingSpeed: 100
                      // });//.addTo(map);
                      // polylines[vesselId] = polyline;
                      //}

                    }

                  case 9:
                  case "end":
                    return _context2.stop();
                }
              }
            });
          };

          createRoutesListItems = function _ref3(items, ulElem, inputElem) {
            items.forEach(function (item) {
              // const ulElem = document.getElementById("route-ul-list");
              var liElem = document.createElement("li"); // const inputElem = document.getElementById('route-list-search');
              // const routeListDiv = document.getElementById("route-list");

              liElem.setAttribute("class", "list-group-item");

              liElem.onclick = function (e) {
                e.stopPropagation();
                getSelectedItinerary(item.value, item.label);
                Array.from(document.getElementsByClassName("list-group-item")).forEach(function (l) {
                  l.classList.remove("list-group-item-active");
                });
                e.target.classList.add("list-group-item-active");
                inputElem.value = item.label;
                ulElem.style.display = "none"; // routeListDiv.style.backgroundColor = "transparent";
              };

              liElem.innerHTML = item.label;
              ulElem.appendChild(liElem);
            });
          };

          createRoutesList = function _ref2() {
            var routes, routeListDiv, routeDiv;
            return regeneratorRuntime.async(function createRoutesList$(_context) {
              while (1) {
                switch (_context.prev = _context.next) {
                  case 0:
                    _context.next = 2;
                    return regeneratorRuntime.awrap(httpClient.getData('static/data/routeList.json'));

                  case 2:
                    routes = _context.sent;
                    routeListDiv = document.getElementById("route-selector");
                    routeDiv = document.getElementById("route-toggle");

                    routeDiv.onclick = function (e) {
                      e.stopPropagation();

                      if (routeListDiv.style.display !== "none") {
                        routeListDiv.style.display = "none";
                        routeDiv.classList.remove("route-list-active");
                      } else {
                        routeListDiv.style.display = "flex";
                        routeDiv.classList.add("route-list-active");
                      }
                    };

                    Array.from(document.getElementsByClassName('route-list-search')).forEach(function (input) {
                      var ul = input.parentElement.nextElementSibling;
                      var distinctRoutesFrom = [];
                      var distinctRoutesTo = [];
                      input.addEventListener('focus', function (e) {
                        e.stopPropagation();
                        e.preventDefault();
                        ul.innerHTML = ''; // let  = [];

                        if (input.id === 'route-start') {
                          if (input.value) {// is filtering
                          } else {
                            // get all routes
                            routes.forEach(function (route) {
                              var exists = distinctRoutesFrom.find(function (r) {
                                return r.label === route.from;
                              });

                              if (!exists) {
                                distinctRoutesFrom.push({
                                  label: route.from,
                                  value: route.value
                                });
                              }
                            });
                          }

                          createRoutesListItems(distinctRoutesFrom, ul, input);
                        } else if (input.id === 'route-end') {}
                      });
                      input.addEventListener('blur', function (e) {
                        // todo: clear list
                        e.stopPropagation();
                        e.preventDefault();
                        ul.innerHTML = '';
                      });
                      input.addEventListener('keyup', function (e) {
                        // createRoutesListItems(routes, ul, e.target);
                        var myRoutes;

                        if (input.id === 'route-start') {
                          myRoutes = distinctRoutesFrom;
                        } else if (input.id === 'routes-end') {
                          myRoutes = distinctRoutesTo;
                        }

                        filteredRoutes = [];
                        ul.innerHTML = '';

                        if (e.target.value) {
                          filteredRoutes = myRoutes.filter(function (r) {
                            return r.label.toLowerCase().includes(e.target.value.toLowerCase());
                          }); // e.target.

                          createRoutesListItems(filteredRoutes, ul, e.target);
                        } else {
                          createRoutesListItems(myRoutes, ul, e.target);
                        }
                      });
                    });
                    Array.from(document.getElementsByClassName('route-list')).forEach(function (list) {
                      list.addEventListener('click', function (e) {
                        e.stopPropagation();
                      });
                    });

                  case 8:
                  case "end":
                    return _context.stop();
                }
              }
            });
          };

          httpClient = new HTTPClient();
          mapInstance = new BaseMap(httpClient);
          map = mapInstance.map;
          layerControl = mapInstance.layerControl;
          timeSliderRange = mapInstance.timeRange;
          proposedRoutePolylineCenters = [];
          _context4.next = 13;
          return regeneratorRuntime.awrap(initRouteData());

        case 13:
          createRoutesList(); //WMS marine copernicus useful links

          waveWMS = 'https://nrt.cmems-du.eu/thredds/wms/med-hcmr-wav-an-fc-h?'; // create wind velocity

          windVelocity = new WindVelocity({
            map: map,
            httpClient: httpClient
          });
          layerControl.addOverlay(windVelocity.layer, windVelocity.name).addTo(map); // create wave height heatmap

          waveHeightWMS = new WaveHeightWMS({
            map: map,
            waveWMS: waveWMS,
            timeSliderRange: timeSliderRange
          });
          layerControl.addOverlay(waveHeightWMS.layer, waveHeightWMS.name).addTo(map); // create wave period heatmap

          wavePeriodWMS = new WavePeriodWMS({
            map: map,
            waveWMS: waveWMS,
            timeSliderRange: timeSliderRange
          });
          layerControl.addOverlay(wavePeriodWMS.layer, wavePeriodWMS.name).addTo(map); // create wave direction heatmap 
          // const options = {waveWMS:waveWMS , timeSliderRange: timeSliderRange};

          waveDirectionWMS = new WaveDirectionWMS({
            map: map,
            waveWMS: waveWMS,
            timeSliderRange: timeSliderRange
          });
          layerControl.addOverlay(waveDirectionWMS.layer, waveDirectionWMS.name).addTo(map); // layerControl.addOverlay(waveDirectionWMS.layer, waveDirectionWMS.name).addTo(map);
          // create wave direction arrows 

          waveDirectionArrows = new WaveDirectionArrow({
            map: map,
            httpClient: httpClient
          });
          layerControl.addOverlay(waveDirectionArrows.layer, waveDirectionArrows.name).addTo(map); // create routes layer

          routeLayer = new RouteLayer({
            data: convexPolyVessels,
            shipMoved: shipMoved,
            id: ROUTE_LAYER_ID
          }); // const routeLayer = L.timeDimension.layer.routeLayer(routeOptions);
          // routeLayer.id = ROUTE_LAYER_ID;

          routeLayer.layer.addTo(map);
          proposedRoutePolyline = L.polyline([], {
            color: 'yellow',
            weight: 2
          }).addTo(map); // function getDistinctPort(list) {
          //     const distinct = list.reduce((items, item) => {
          //         const exists = items.find(item=> item.)
          //         if (items.includes(item)) {
          //             return items;
          //         } return [...items, item]
          //     }, []);
          //     return distinct;
          // }

          window.addEventListener(ROUTE_SELECTED_EVENT, function (e) {
            // clear previous routes
            proposedRoutePolylineCenters = [];
            proposedRoutePolyline.setLatLngs([]);
            map.eachLayer(function (layer) {
              if (layer.id === ROUTE_LAYER_ID) {
                layer.reset();
              }
            }); //move time slider in each route's initial timestamp when route selected

            var time = moment.utc(e.detail.timestamp).valueOf();
            map.timeDimension.setCurrentTime(time);
            map.closePopup();
          });

        case 29:
        case "end":
          return _context4.stop();
      }
    }
  });
});

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km

  var dLat = deg2rad(lat2 - lat1); // deg2rad below

  var dLon = deg2rad(lon2 - lon1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km

  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}