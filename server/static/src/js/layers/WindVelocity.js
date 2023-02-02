/**
 * options properties
 * 
 * map: map reference
 * httpClient: HTTPClient
 */
class WindVelocity {

    _name = "Wind Velocity"

    constructor(options) {

        const TimeDimensionLayer = this._createLayer();
        const windVelocityLayer = new TimeDimensionLayer(options);

        if (options.map) {

            const legend = this._createLegend();

            options.map.on('overlayadd', (eventLayer) => {
                if (eventLayer.name == this._name) {
                    legend.addTo(options.map);
                }
            });

            options.map.on('overlayremove', (eventLayer) => {
                if (eventLayer.name == this._name) {
                    options.map.removeControl(legend);
                }
            });
        }

        return {
            name: this._name,
            layer: windVelocityLayer
        }
    }

    _createLayer() {

        //add velocity layer to time slider
        const layer = L.TimeDimension.Layer.extend({

            initialize: function (options) {
                
                //initialize options based on plugin
                var velocityOptions = {
                    displayValues: true,
                    displayOptions: {
                        velocityType: 'Wind',
                        displayPosition: 'bottomleft',
                        displayEmptyString: 'No wind data',
                        angleConvention: "meteoCW",
                        speedUnit: "m/s"
                    },
                    lineWidth: 3,
                    velocityScale: 0.008,
                    maxVelocity: 18
                }

                var layer = L.velocityLayer(velocityOptions);

                L.TimeDimension.Layer.prototype.initialize.call(this, layer, options);

                this._processLoadedData([]);

                this._httpClient = options.httpClient;
                this._currentLoadedTime = 0;
                //construct data the way the plugin needs it in order to visualize wind
                this._currentTimeData = {
                    data: [
                        {
                            header: this.u_header,
                            data: []
                        },
                        {
                            header: this.v_header,
                            data: []
                        }
                    ]
                };
            },

            onAdd: function (map) {
                L.TimeDimension.Layer.prototype.onAdd.call(this, map);

                map.addLayer(this._baseLayer);

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
                this._baseLayer.setData(this._currentTimeData.data);
                return true;
            },

            _getDataForTime: async function (time) {
                if (!time) {
                    return;
                }

                this.timeString = moment.utc(time).format('YYYY-MM-DD[T]HH:mm:ss');

                //get wind data for visualization (for selected timestamp)
                const windData = await this._httpClient.getData(`/wind/time/${this.timeString}`);
                this._currentTimeData.data = this._processLoadedData(windData);

                this._currentLoadedTime = time;
                if (this._timeDimension && time == this._timeDimension.getCurrentTime() && !this._timeDimension.isLoading()) {
                    this._update();
                }
            },

            _processLoadedData: function (data) {

                //construct header data according to plugin 
                const latNorthRec = 45.9166666
                const latSouthRec = 30.1666666
                const lonEastRec = 37.25
                const lonWestRec = -7.08333333
                const nx = 533
                const ny = 190

                this.u_header = {
                    parameterUnit: "m.s-1",
                    parameterNumberName: "eastward_wind",
                    parameterNumber: 2,
                    parameterCategory: 2,
                    la1: latNorthRec,
                    la2: latSouthRec,
                    lo1: lonWestRec,
                    lo2: lonEastRec,
                    nx: nx,
                    ny: ny,
                    dx: 0.083,
                    dy: 0.083,
                    numberPoints: nx * ny,
                    refTime: this.timeString
                };

                this.v_header = {
                    parameterUnit: "m.s-1",
                    parameterNumberName: "northward_wind",
                    parameterNumber: 3,
                    parameterCategory: 2,
                    la1: latNorthRec,
                    la2: latSouthRec,
                    lo1: lonWestRec,
                    lo2: lonEastRec,
                    nx: nx,
                    ny: ny,
                    dx: 0.083,
                    dy: 0.083,
                    numberPoints: nx * ny,
                    refTime: this.timeString
                };

                const uWind = [];
                const vWind = [];

                data.forEach(item => {
                    uWind.push(item[0]);
                    vWind.push(item[1]);
                });

                return [
                    {
                        header: this.u_header,
                        data: uWind
                    },
                    {
                        header: this.v_header,
                        data: vWind
                    }
                ];
            },
        });

        return layer;
    }

    _createLegend() {
        const windVelocityLegend = L.control({
            position: 'bottomright'
        });


        //Create wind Velocity legend using DOM
        windVelocityLegend.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'wind-velocity info legend');
            div.innerHTML +=
                `<span>m/s</span>
                 <span>0</span>
                 <span>5</span>
                 <span>10</span>
                 <span>15</span>
                 <span>20</span>
                `
            return div;
        };

        return windVelocityLegend;
    }

}