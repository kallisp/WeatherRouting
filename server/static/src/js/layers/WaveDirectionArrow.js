/**
 * options properties
 * 
 * map: map reference
 * httpClient: HTTPClient
 */
class WaveDirectionArrow {

    _name = "Wave Direction Arrow Map"

    constructor(options) {

        const TimeDimensionLayer = this._createLayer();
        const WaveDirectionArrowLayer = new TimeDimensionLayer(options);

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
            layer: WaveDirectionArrowLayer
        }
    }

    _createLayer() {

        //add wave direction arrows layer to time dimension bar
        const layer = L.TimeDimension.Layer.extend({

            initialize: function (options) {

                this._arrowIcon = L.icon({
                    iconUrl: '../../../static/data/top-arrow.png',
                    iconSize: [9, 9]
                });

                var layer = L.layerGroup([])

                L.TimeDimension.Layer.prototype.initialize.call(this, layer, options);

                this._httpClient = options.httpClient;
                this._currentLoadedTime = 0;
                this._currentTimeData = [];
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
                if (!this._currentTimeData) { return; }
                // clear prev markers 
                this._baseLayer.clearLayers();

                // add new markers
                this._currentTimeData.forEach(item => {
                    L.marker([item.lat, item.lon], {
                        icon: this._arrowIcon,
                        rotationAngle: item.deg
                    }).addTo(this._baseLayer);
                });
                return true;
            },

            _getDataForTime: async function (time) {
                if (!time || time !== this._timeDimension.getCurrentTime()) {
                    return;
                }

                this.timeString = moment.utc(time).format('YYYY-MM-DD[T]HH:mm:ss');
                this._currentTimeData = [];
                const waveDirectionData = await this._httpClient.getData(`/wave/time/${this.timeString}`);

                //arrow icons for wave direction data
                waveDirectionData.forEach(item => {
                    if (item[2] !== null) { //check if wave direction value is not null
                        this._currentTimeData.push({ lon: item[1], lat: item[0], deg: item[2] })
                    }
                })

                this._currentLoadedTime = time;
                if (this._timeDimension && time == this._timeDimension.getCurrentTime() && !this._timeDimension.isLoading()) {
                    this._update();
                }
                this.fire('timeload', {
                    time: time
                });
            }
        });

        return layer;
    }

    _createLegend() {
        const waveDirectionArrow = L.control({
            position: 'bottomright'
        });


        //Wind Velocity legend
        waveDirectionArrow.onAdd = function (map) {
            const src = "../../../static/data/top-arrow.png";
            const div = L.DomUtil.create('div', 'wave-direction-arrow info legend');
            div.innerHTML = `<img src="${src}" alt="legend"> <span>0 deg<span>`;

            return div;
        };

        return waveDirectionArrow;
    }
}
