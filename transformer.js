
module.exports = (layer) => {
    const sqlParam = layer.Datasource.Parameter.find(p => p._attributes.name === 'table');
    const sqlMatch = sqlParam._cdata.match(/([^ \n\r\t\()]+)\.(way)/);

    sqlParam._cdata = sqlParam._cdata.replace(/[ \n\r\t]+osm_id[ \n\r\t]*,/g, ' ');     

    if (!sqlMatch || sqlMatch.length === 0) {
        sqlParam._cdata = sqlParam._cdata.replace(
            /[ \n\r\t]+way[ \n\r\t]*,/g, 
            ` way, '${layer._attributes.name}' as layer_name, osm_id,`
        );

        sqlParam._cdata = sqlParam._cdata.replace(
            /[ \n\r\t]+way[ \n\r\t]+FROM/g, 
            ` way, '${layer._attributes.name}' as layer_name, osm_id FROM`
        );
    }
    else {
        sqlParam._cdata = sqlParam._cdata.replace(
            /[ \n\r\t]+way[ \n\r\t]*,/g, 
            ` way, '${layer._attributes.name}' as layer_name, ${sqlMatch[1]}.osm_id,`);
    }
}
