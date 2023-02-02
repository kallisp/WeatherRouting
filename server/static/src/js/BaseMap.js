/**
 * httpClient: HTTPClient
 */
class BaseMap {

    _baseMap;
    _httpClient;

    constructor(httpClient) {

        this._httpClient = httpClient;

        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });


        this._baseMap = L.map('mapId', {
            layers: [osm],
            center: [36.15, 22.55],
            zoomControl: false, 
            timeDimension: true,
            timeDimensionOptions: {
                timeInterval: "2022-01-30/2022-03-05", //add time range 
                period: "PT3H", //add time interval
                currentTime: moment.utc('2022-01-30 00:00:00').valueOf(), 
                times: ''
            }
        });
    

        const layerControl = this._createBaseLayers(osm);
        const timeRange = this._getTimeSliderRange();

        this._createHomeButton();
        this._centerMap();
        this._setEarthBoundary();
        this._createPopupMenu();
        this._convertDDToDMS();
        this._setCustomTimeControl();

        return {
            map: this._baseMap,
            layerControl: layerControl,
            timeRange: timeRange
        };

    }

    _createHomeButton() {

        // custom zoom bar control that includes a Zoom Home function
        L.Control.zoomHome = L.Control.extend({
            options: {
                position: 'topleft',
                zoomInText: '+',
                zoomInTitle: 'Zoom in',
                zoomOutText: '-',
                zoomOutTitle: 'Zoom out',
                zoomHomeText: '<img src="../../../static/data/home.png" alt="home">',
                zoomHomeTitle: 'Zoom home'
            },

            onAdd: function (map) {
                var controlName = 'gin-control-zoom',
                    container = L.DomUtil.create('div', controlName + ' leaflet-bar'),
                    options = this.options;

                this._zoomInButton = this._createButton(options.zoomInText, options.zoomInTitle,
                    controlName + '-in', container, this._zoomIn);
                this._zoomHomeButton = this._createButton(options.zoomHomeText, options.zoomHomeTitle,
                    controlName + '-home', container, this._zoomHome);
                this._zoomOutButton = this._createButton(options.zoomOutText, options.zoomOutTitle,
                    controlName + '-out', container, this._zoomOut);

                this._updateDisabled();
                map.on('zoomend zoomlevelschange', this._updateDisabled, this);

                return container;
            },

            onRemove: function (map) {
                map.off('zoomend zoomlevelschange', this._updateDisabled, this);
            },

            _zoomIn: function (e) {
                this._map.zoomIn(e.shiftKey ? 3 : 1);
            },

            _zoomOut: function (e) {
                this._map.zoomOut(e.shiftKey ? 3 : 1);
            },

            _zoomHome: function (e) {
                map.setView([latMapCenter, lngMapCenter], zoom);
            },

            _createButton: function (html, title, className, container, fn) {
                var link = L.DomUtil.create('a', className, container);
                link.innerHTML = html;
                link.href = '#';
                link.title = title;

                L.DomEvent.on(link, 'mousedown dblclick', L.DomEvent.stopPropagation)
                    .on(link, 'click', L.DomEvent.stop)
                    .on(link, 'click', fn, this)
                    .on(link, 'click', this._refocusOnMap, this);

                return link;
            },

            _updateDisabled: function () {
                var map = this._map,
                    className = 'leaflet-disabled';

                L.DomUtil.removeClass(this._zoomInButton, className);
                L.DomUtil.removeClass(this._zoomOutButton, className);

                if (map._zoom === map.getMinZoom()) {
                    L.DomUtil.addClass(this._zoomOutButton, className);
                }
                if (map._zoom === map.getMaxZoom()) {
                    L.DomUtil.addClass(this._zoomInButton, className);
                }
            }
        });

        // add the new control to the map
        var zoomHome = new L.Control.zoomHome();
        zoomHome.addTo(this._baseMap);

    }

    _createBaseLayers(osm) {
        // var Esri_DarkGreyCanvas = L.esri.basemapLayer('DarkGray')
        const Esri_WorldImagery = L.esri.basemapLayer('Imagery');
        const baseLayers = {
            // "Grey Canvas": Esri_DarkGreyCanvas,
            "OpenstreetMap": osm,
            "Satellite": Esri_WorldImagery
        };

        // layer control panal
        const layerControl = L.control.layers(baseLayers, null, { collapsed: false });
        layerControl.addTo(this._baseMap);

        return layerControl;
    }

    _centerMap() {
        //custom zoom control
        var latMapCenter = 36.15;
        var lngMapCenter = 22.55;
        var zoom = 5.5;

        this._baseMap.setView([latMapCenter, lngMapCenter], zoom);
    }

    _getTimeSliderRange() {

        const range = [];

        //create the start/end dates for time dimension control and data e.g. start date: 2021-07-25 00:00:00.00
        let start = moment.utc().year(2022).month(1).date(30).hour(0).minute(0).seconds(0);  //moment.utc().year(2021).month(6).date(25).hour(0).minute(0).seconds(0);
        let end = moment.utc().year(2022).month(3).date(5).hour(0).minute(0).seconds(0);//start.clone().date(04); //start.clone().date(28);
        range.push(start.clone().toISOString());
        while (start.isBefore(end)) {
            start.add(hourInterval, 'hours');
            range.push(start.toISOString());
        }

        return range;
    }

    async _setEarthBoundary() {

        function earthBoundaryStyle() {
            return {
                weight: 1,
                color: '#00008b',
                fillOpacity: 0
            }
        }

        //Add Earth boundaries from Natural Earth as geojson features
        const earthBoundary = await this._httpClient.getData('static/data/ne_10m_land.geojson');
        L.geoJSON(earthBoundary, { style: earthBoundaryStyle }).addTo(this._baseMap);
    }


    _setCustomTimeControl() {

        L.Control.TimeDimensionCustom = L.Control.TimeDimension.extend({
            _getDisplayDateFormat: function (date) {
                return moment.utc(date).format('DD-MM-YYYY hh:mm:ss A');;
            }
        });

        const timeDimensionControl = new L.Control.TimeDimensionCustom({
            position: 'bottomleft',
            playerOptions: {
                buffer: 1,
                minBufferReady: -1
            },
            timeZones: ["UTC"],
            speedSlider: false
        });

        this._baseMap.addControl(timeDimensionControl);
    }

    _createPopupMenu() {
        //show coordinates lat, lon when user clicks 
        this._baseMap.on('click', async (e) => {
            const latText = this._convertDDToDMS(e.latlng.lat, false);
            const lngText = this._convertDDToDMS(e.latlng.lng, true);
            const currentTime = moment.utc(this._baseMap.timeDimension._availableTimes[this._baseMap.timeDimension._currentTimeIndex]).toISOString();
            const lon = e.latlng.lng;
            const lat = e.latlng.lat;

            //show weather data for current lat/lon/timestamp when user clicks 
            const weatherData = await this._httpClient.getData(`/weather/coords/${lon}:${lat}/time/${currentTime}`)

            const waveHeight =  Number(weatherData[0][0]).toFixed(2);
            const wavePeriod = Number(weatherData[0][2]).toFixed(2);
            const waveDirection = Number(weatherData[0][1]).toFixed(2);
            const windVelocity = Number(weatherData[0][3]).toFixed(2);

            L.popup({ autoClose: true })
                .setLatLng(e.latlng)
                .setContent(`
                <b>${latText.dir} </b>${latText.deg}°${latText.min}'${latText.sec}"
                <b>${lngText.dir} </b>${lngText.deg}°${lngText.min}'${lngText.sec}" <br>
                <b>Wave Height: </b> ${waveHeight} m <br>
                <b>Wave Period: </b> ${wavePeriod} s <br>
                <b>Wave Direction: </b> ${waveDirection}° <br>
                <b>Wind Speed: </b> ${windVelocity} m/s 
                `)
                .addTo(this._baseMap)
                .openOn(this._baseMap)
        });
    }

    //convert Decimal degrees to Degrees Minutes Seconds format
    _convertDDToDMS(D, lng) {
        return {
            dir: D < 0 ? (lng ? "W" : "S") : lng ? "E" : "N",
            deg: 0 | (D < 0 ? (D = -D) : D),
            min: 0 | (((D += 1e-9) % 1) * 60),
            sec: (0 | (((D * 60) % 1) * 6000)) / 100,
        };
    }
}