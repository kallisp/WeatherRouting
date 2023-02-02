/**
 * options properties
 * 
 * map: map reference
 * waveWMS: string
 * timeSliderRange: string
 */
class WaveDirectionWMS {

    _name = "Wave Direction Heatmap";

    constructor(options) {
        const waveDirectionWMSLayer = L.tileLayer.wms(options.waveWMS, {
            service: 'WMS',
            request: 'GetMap',
            layers: 'VMDR',
            styles: 'boxfill/rainbow',
            format: 'image/png',
            CRS: 'EPSG:4326',
            transparent: true,
            version: '1.3.0',
            opacity: 0.7,
            exceptions: 'application/vnd.ogc.se_xml',
            time: options.timeSliderRange,
            period: "PT3H"
        });

        const waveDirectionWMSTimeLayer = L.timeDimension.layer.wms(waveDirectionWMSLayer, {
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
            layer: waveDirectionWMSTimeLayer
        };
    }

    _createLegend(waveWMS) {
        const waveDirectionLegendWMS = L.control({
            position: 'bottomright'
        });

        //create waveDirection WMS legend using DOM
        waveDirectionLegendWMS.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'wave-height-direction info legend');
            div.innerHTML =
                `<span>deg</span>
                 <span>0</span>
                 <span>90</span>
                 <span>180</span>
                 <span>270</span>
                 <span>360</span>
                 `
            return div;
        };

        return waveDirectionLegendWMS;

    }
}


