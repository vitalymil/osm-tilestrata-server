FROM osm-tilestrata-renderer-base

WORKDIR /style
COPY grid_layers.txt .
COPY transformer.js .
RUN git clone --depth 1 --branch v4.6.0 \
    https://github.com/gravitystorm/openstreetmap-carto.git

WORKDIR /style/openstreetmap-carto
COPY osm-carto-data ./data
RUN sed -i 's/dbname: "gis"/dbname: "dev_gis"\n    host: "osm-db"\n    user: "postgres"\n    password: "postgres"/g' project.mml
RUN carto project.mml > mapnik.xml