
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

console.log('starting renderer with arguments:')
for (const arg of process.argv) {
    console.log(`\t${arg}`);
}

const name = process.argv[4];
const xmlPath = process.argv[5];
const inputGridLayers = process.argv[6] ? fs.readFileSync(process.argv[6], 'utf8').split('\n') : false;
const gridFields = process.argv[7];
const layerTransformer = process.argv[8] ? require(`${process.argv[8]}`) : false;
const balancer = process.argv[2] === 'no-balancer' ? null : 
                                                    {
                                                        balancer: {
                                                            host: process.argv[2]
                                                        }
                                                    };

const strata = tilestrata(balancer);

let mapnikXml = fs.readFileSync(xmlPath, 'utf8');
const mapnikJs = xmljs.xml2js(mapnikXml, { compact: true });

const gridLayers = [];

for (const layer of mapnikJs.Map.Layer) {
    if (layerTransformer) {
        layerTransformer(layer, inputGridLayers, gridLayers);
    }
}

mapnikXml = xmljs.js2xml(mapnikJs, { compact: true });
fs.writeFileSync(xmlPath, mapnikXml);

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

if (gridLayers.length > 0) {
    for (const layer of gridLayers) {
        gridLayerParameter._text = layer;
        strata.layer(`${name}-${layer}-grid`, { metatile: 8 })
            .route('tile.json')
                .use(mapnik({
                    pathname: xmlPath,
                    xml: xmljs.js2xml(mapnikJs, { compact: true }),
                    interactivity: true,
                    metatile: 8
                }));
    }

    strata.layer(name, { metatile: 8 })
        .route('tile.json')
            .use(corsPlugin)
            .use(utfmerge(
                gridLayers.map(layer => [`${name}-${layer}-grid`, 'tile.json'])
            ));
}

strata.layer(name, { metatile: 8 })
    .route('tile.png')
        .use(corsPlugin)
        .use(mapnik({
            pathname: xmlPath,
            xml: mapnikXml,
            metatile: 8
        }))
    .route('tile.pbf')
        .use(corsPlugin)
        .use(vtile({
            xml: xmlPath
        }));

strata.listen(Number(process.argv[3] || 8081)).setTimeout(1000 * 60 * 60);

