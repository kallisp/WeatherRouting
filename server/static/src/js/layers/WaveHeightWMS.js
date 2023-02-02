/**
 * options properties
 * 
 * map: map reference
 * waveWMS: string
 * timeSliderRange: string
 */
class WaveHeightWMS {

    _name = "Wave Height";

    constructor(options) {
        const waveHeightWMSLayer = L.tileLayer.wms(options.waveWMS, {
            service: 'WMS',
            request: 'GetMap',
            layers: 'VHM0',
            styles: 'boxfill/rainbow',
            format: 'image/png',
            CRS: 'EPSG:4326',
            transparent: true,
            version: '1.3.0',
            opacity: 0.6,
            time: options.timeSliderRange,
            period: "PT3H"
        });

        const waveHeightWMSTimeLayer = L.timeDimension.layer.wms(waveHeightWMSLayer, {
            updateTimeDimension: true
        });

        if (options.map) {

            const legend = this._createLegend();

            //show/hide legend when user selects/deselects the layer
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
            layer: waveHeightWMSTimeLayer
        };
    }

    _createLegend() {
        const waveHeightLegendWMS = L.control({
            position: 'bottomright'
        });

        //create waveHeight WMS legend using DOM
        waveHeightLegendWMS.onAdd = () => {
            const div = L.DomUtil.create('div', 'wave-height-direction info legend');
            div.innerHTML =
                    `<span>m</span>
                     <span>0</span>
                     <span>2</span>
                     <span>4</span>
                     <span>6</span>
                     <span>8</span>
                    `
            return div;
        };

        return waveHeightLegendWMS;
    }
}