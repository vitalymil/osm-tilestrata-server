
const tilestrata = require('tilestrata');
const mapnik = require('tilestrata-mapnik');
const vtile = require('tilestrata-vtile');
const utfmerge = require('tilestrata-utfmerge');
const xmljs = require('xml-js');
const fs = require('fs');
const cors = require('cors')();

const corsPlugin = {
    name: 'cors',
    init: function(server, callback) {
        callback();
    },
    reshook: function(server, tile, req, res, result, callback) {
        cors(req, res, callback);
    },
    destroy: function(server, callback) {
        callback();
    }
};

if (process.argv.length < 4) {
    throw new Error('missing name (1) or mapnik xml (2) path arguments');
}
else if (process.argv.legnth > 4 && process.argv.length < 6) {
    throw new Error('missing grid fields argument (3)')
}

console.log('starting renderer with arguments:')
for (const arg of process.argv) {
    console.log(`\t${arg}`);
}

const name = process.argv[3];
const xmlPath = process.argv[4];
const inputGridLayers = process.argv[5] ? fs.readFileSync(process.argv[5], 'utf8').split('\n') : false;
const gridFields = process.argv[6];
const layerTransformer = process.argv[7] ? require(`${process.argv[7]}`) : false;
const balancer = process.argv[2] === 'no-balancer' ? null : 
                                                    {
                                                        balancer: {
                                                            host: process.argv[2]
                                                        }
                                                    };

const strata = tilestrata(balancer);

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
                gridLayers.push(layer._attributes.name);
                if (layerTransformer) {
                    layerTransformer(layer);
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
        strata.layer(`${name}-${layer}-grid`)
            .route('tile.json')
                .use(mapnik({
                    pathname: xmlPath,
                    xml: xmljs.js2xml(mapnikJs, { compact: true }),
                    interactivity: true
                }));
    }

    strata.layer(name)
        .route('tile.json')
            .use(corsPlugin)
            .use(utfmerge(
                gridLayers.map(layer => [`${name}-${layer}-grid`, 'tile.json'])
            ));
}

strata.layer(name)
    .route('tile.png')
        .use(corsPlugin)
        .use(mapnik({
            pathname: xmlPath,
            xml: mapnikXml
        }))
    .route('tile.pbf')
        .use(corsPlugin)
        .use(vtile({
            xml: xmlPath
        }));

strata.listen(8081).setTimeout(1000 * 60 * 60);

