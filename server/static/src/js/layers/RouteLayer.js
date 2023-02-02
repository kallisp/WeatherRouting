/**
 * options properties
 * 
 * map: map reference
 * httpClient: HTTPClient
 */
class RouteLayer {

    _name = "Route Layer"

    constructor(options) {

        const TimeDimensionLayer = this._createLayer();
        const routeLayer = new TimeDimensionLayer(options);
        routeLayer.id = options.id;

        return {
            name: this._name,
            layer: routeLayer
        }
    }

    _createLayer() {
        const layer = L.TimeDimension.Layer.extend({

            initialize: function (options) {

                this._polyline = L.polyline([], {
                    color: '#9d0300',
                    weight: 7
                });

                this._polylineMarker = L.circleMarker([-180, -180], {
                    color: '#9d0300',
                    fillColor: '#9d0300',
                    fillOpacity: 0.7,
                    radius: 8,
                    stroke: false
                });

                this._proposedPolylineMarker = L.circleMarker([-180, -180], {
                    color: 'yellow',
                    fillColor: 'yellow',
                    fillOpacity: 0.7,
                    radius: 8,
                    stroke: false
                });

                var layer = L.layerGroup([])

                L.TimeDimension.Layer.prototype.initialize.call(this, layer, options);

                this._currentLoadedTime = 0;
                this._vesselData = options.data;
                this._currentTimeData = [];
                this._shipMoved = options.shipMoved;
            },

            onAdd: function (map) {
                L.TimeDimension.Layer.prototype.onAdd.call(this, map);

                map.addLayer(this._baseLayer);
                this._polylineMarker.addTo(this._baseLayer);
                this._proposedPolylineMarker.addTo(this._baseLayer);
                this._polyline.addTo(this._baseLayer);


                //Define the popup for initial route
                this._popupInitRoute = L.popup({ autoClose: true })
                this._polyline.bindPopup(this._popupInitRoute);

                if (this._timeDimension) {
                    this._getDataForTime(this._timeDimension.getCurrentTime());
                }
            },

            _onNewTimeLoading: function (ev) {
                this._getDataForTime(ev.time);
                return;
            },

            isReady: function (time) {
                return (this._currentLoadedTime == time);
            },

            _update: function () {
                if (!this._currentTimeData || this._currentTimeData.length == 0) { return; }

                //get the current polyline node center and add it to polyline which is defined in initialize
                //Also set this point to popup to get it moving along with the polyline
                let currentPolyPoint = this._currentTimeData.pop();
                this._polyline.addLatLng(currentPolyPoint);
                this._polylineMarker.setLatLng(currentPolyPoint);
                this._popupInitRoute.setLatLng(currentPolyPoint);


                const center = this._polyline._latlngs[this._polyline._latlngs.length - 1];
                let prevCenter = null;

                if (this._polyline._latlngs.length > 1) {
                    prevCenter = this._polyline._latlngs[this._polyline._latlngs.length - 2];
                }

                this._shipMoved({
                    center, prevCenter,
                    heading: this._currentHeading,
                    speed: this._currentSpeed,
                    timestamp: moment.utc(this._timeDimension.getCurrentTime()).toISOString(),
                    arrivalTime: this._arrivalTime,
                    departureTime: this._departureTime
                });
                return true;
            },

            _getDataForTime: async function (time) {
                if (!time) {
                    return;
                }

                if (!selectedItinerary) {
                    return;
                }
                const vesselData = this._vesselData[selectedItinerary];

                // for each vesselData, get the timestamp and find if close to time
                const currentTime = moment.utc(time);
                let smallestTimeDifference;

                this._currentVesselPositionIndex;

                for (let i = 0; i <= vesselData.length - 1; i++) {
                    const point = vesselData[i];

                    const timeDiff = currentTime.diff(moment.utc(point.timestamp), 'hour');
                    if (smallestTimeDifference == undefined) {
                        smallestTimeDifference = timeDiff;
                        this._currentVesselPositionIndex = i;
                    }
                    else if (timeDiff >= 0 && timeDiff < smallestTimeDifference) {
                        smallestTimeDifference = timeDiff;
                        this._currentVesselPositionIndex = i;
                    }
                }

                this._arrivalTime = vesselData[vesselData.length - 1].timestamp;
                this._arrivalTime = moment.utc(this._arrivalTime).format('DD/MM/YYYY, hh:mm:ss A');

                this._departureTime = vesselData[0].timestamp;
                this._departureTime = moment.utc(this._departureTime).format('DD/MM/YYYY, hh:mm:ss A');

                this._currentTimeData = [];
                for (let j = 0; j <= this._currentVesselPositionIndex; j++) {
                    this._currentTimeData.push(vesselData[j].center);
                    this._currentHeading = vesselData[j].heading;
                    this._currentSpeed = vesselData[j].speed;
                }

                this._currentLoadedTime = time;
                if (this._timeDimension && time == this._timeDimension.getCurrentTime() && !this._timeDimension.isLoading()) {
                    this._update();
                }
                this.fire('timeload', {
                    time: time
                });
            },

            reset: function () {
                this._polyline.setLatLngs([]);
            }
        });

        return layer;

    }

}