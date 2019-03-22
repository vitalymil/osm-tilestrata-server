
const tilestrata = require('tilestrata');
const mapnik = require('tilestrata-mapnik');
const vtile = require('tilestrata-vtile');
const utfmerge = require('tilestrata-utfmerge');
const xmljs = require('xml-js');
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const strata = tilestrata();
const app = express();

app.use(cors());

if (process.argv.length < 3) {
    throw new Error('missing mapnik xml path argument (1)');
}
else if (process.argv.legnth > 3 && process.argv.length < 5) {
    throw new Error('missing grid fields argument (3)')
}

const xmlPath = process.argv[2];
const inputGridLayers = process.argv[3] ? fs.readFileSync(process.argv[3], 'utf8').split('\n') : false;
const gridFields = process.argv[4];
const layerTransformer = process.argv[5] ? require(`./${process.argv[5]}`) : false;

let mapnikXml = null;

if (inputGridLayers && inputGridLayers.length > 0) {
    mapnikXml = fs.readFileSync(xmlPath, 'utf8');
    const mapnikJs = xmljs.xml2js(mapnikXml, { compact: true });

    const gridLayers = [];

    for (const layer of mapnikJs.Map.Layer) {
        if (layer.Datasource.Parameter.some(parameter => 
                parameter._attributes.name === 'type' &&
                parameter._cdata === 'postgis') &&
                inputGridLayers.includes(layer._attributes.name)) {
                
                if (layerTransformer) {
                    layer = layerTransformer(layer);
                }
        }
    }

    const gridLayerParameter = {
        _attributes: {
            name: 'interactivity_layer'
        },
        _text: null
    }

    mapnikJs.Map.Parameters.Parameter.push(gridLayerParameter);
    mapnikJs.Map.Parameters.Parameter.push({
        _attributes: {
            name: 'interactivity_fields'
        },
        _text: gridFields
    });

    for (const layer of gridLayers) {
        gridLayerParameter._text = layer;
        strata.layer(`${layer}-grid`)
            .route('*.json')
                .use(mapnik({
                    pathname: xmlPath,
                    xml: xmljs.js2xml(mapnikJs, { compact: true }),
                    interactivity: true
                }));
    }

    strata.layer('grids')
        .route('*.json')
            .use(utfmerge(
                gridLayers.map(layer => [`${layer}-grid`, '*.json'])
            ));
}

strata.layer('tiles')
    .route('*.png')
        .use(mapnik({
            pathname: xmlPath,
            xml: mapnikXml
        }))
    .route('*.pbf')
        .use(vtile({
            xml: xmlPath
        }));

app.use(tilestrata.middleware({
    server: strata
}));

app.listen(8080).setTimeout(1000 * 60 * 60);
