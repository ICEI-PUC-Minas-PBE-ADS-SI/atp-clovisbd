let ocorrencias = [];
let indiceAtual = 0;

require([
 "esri/Map",
 "esri/views/MapView",
 "esri/layers/GraphicsLayer",
 "esri/Graphic"
], function (Map, MapView, GraphicsLayer, Graphic) {
 // Endpoint WFS público
 const wfsUrl = "https://observatorio.infraestrutura.mg.gov.br/server/services/Hosted/ICM_PONTO_MAIO_2025_PILOTO_SREMG/MapServer/WFSServer";
 const typeName = "Hosted_ICM_PONTO_MAIO_2025_PILOTO_SREMG";
 const graphicsLayer = new GraphicsLayer();
 const map = new Map({
 basemap: "streets",
 layers: [graphicsLayer]
 });
 const view = new MapView({
 container: "map",
 map: map,
 center: [-44, -19],
 zoom: 7
 });

 function montarFiltroWFS({ ano, mes, rod, tipo }) {
 return `ano_avalia = ${ano} AND mes_avalia = ${mes} AND ROD = '${rod}' AND tipo = '${tipo}'`;
 }
 function carregarDados(filtroCQL) {
 const params = new URLSearchParams({
 service: "WFS",
 version: "2.0.0",
 request: "GetFeature",
 typeNames: typeName,
 outputFormat: "application/json",
 srsName: "EPSG:4326",
 cql_filter: filtroCQL
 });
 fetch(`${wfsUrl}?${params.toString()}`)
 .then(res => res.json())
 .then(geojson => {
 ocorrencias = geojson.features.sort(
 (a, b) => a.properties.KM - b.properties.KM
 );
 graphicsLayer.removeAll();


 ocorrencias.forEach(f => {
 const g = new Graphic({
 geometry: {
 type: "point",
 longitude: f.geometry.coordinates[0],
 latitude: f.geometry.coordinates[1]
 },
 attributes: f.properties,
 symbol: {
 type: "simple-marker",
 color: "red",
 size: 8
 }
 });
 graphicsLayer.add(g);
 });


 indiceAtual = 0;
 mostrarOcorrencia();
 view.goTo(graphicsLayer.graphics);
 });
  }

 function mostrarOcorrencia() {
    if (!ocorrencias.length) return;


 const o = ocorrencias[indiceAtual].properties;
 const [lon, lat] = ocorrencias[indiceAtual].geometry.coordinates;


 document.getElementById("foto").src = o.Imagem;
 document.getElementById("info").innerHTML = `
 <strong>Rodovia:</strong> ${o.ROD}<br>
 <strong>Km:</strong> ${o.KM}<br>
 <strong>Tipo:</strong> ${o.tipo}<br>
 <strong>Mês/Ano:</strong> ${o.mes_avalia}/${o.ano_avalia}
    `;
 view.goTo({ center: [lon, lat], zoom: 16 });
  }

 document.getElementById("btnFiltrar").onclick = () => {
 const filtro = montarFiltroWFS({
 ano: ano.value,
 mes: mes.value,
 rod: rodovia.value,
 tipo: tipo.value
 });
 carregarDados(filtro);
 };
 prev.onclick = () => {
 indiceAtual = (indiceAtual - 1 + ocorrencias.length) % ocorrencias.length;
 mostrarOcorrencia();
 };
 next.onclick = () => {
 indiceAtual = (indiceAtual + 1) % ocorrencias.length;
 mostrarOcorrencia();
  };

});
