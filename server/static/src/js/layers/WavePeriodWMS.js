/**
 * options properties
 * 
 * map: map reference
 * waveWMS: string
 * timeSliderRange: string
 */
class WavePeriodWMS {

    _name = "Wave Period";

    constructor(options) {
        const wavePeriodWMSLayer = L.tileLayer.wms(options.waveWMS, {
            service: 'WMS',
            request: 'GetMap',
            layers: 'VTM10',
            styles: 'boxfill/redblue',
            format: 'image/png',
            CRS: 'EPSG:4326',
            transparent: true,
            version: '1.3.0',
            opacity: 0.6,
            time: options.timeSliderRange,
            period: "PT3H"
        });

        const wavePeriodWMSTimeLayer = L.timeDimension.layer.wms(wavePeriodWMSLayer, {
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
            layer: wavePeriodWMSTimeLayer
        };
    }

    _createLegend() {
        const wavePeriodLegendWMS = L.control({
            position: 'bottomright'
        });

        //create wavePeriod WMS legend using DOM
        wavePeriodLegendWMS.onAdd = () => {
            const div = L.DomUtil.create('div', 'wave-period info legend');
            div.innerHTML +=
                `<span>sec</span>
                 <span>0</span>
                 <span>2.5</span>
                 <span>5</span>
                 <span>7.5</span>
                 <span>10</span>
                 <span>12.5</span>
                 <span>15</span>
                 `
            return div;
        };

        return wavePeriodLegendWMS;
    }
}