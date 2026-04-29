
let ocorrencias = [];
let indiceAtual = 0;
let intervalo = null;

require([
"esri/Map",
"esri/views/MapView",
"esri/layers/FeatureLayer",
"esri/layers/GraphicsLayer",
"esri/Graphic"
], function (Map, MapView, FeatureLayer, GraphicsLayer, Graphic) {

const layer = new FeatureLayer({
url: "https://observatorio.infraestrutura.mg.gov.br/server/rest/services/Hosted/ICM_PONTO_MAIO_2025_PILOTO_SREMG/MapServer/0",
outFields: ["*"]
});

const destaqueLayer = new GraphicsLayer();

const map = new Map({
basemap: "streets",
layers: [layer, destaqueLayer]
});

const view = new MapView({
container: "map",
map: map,
center: [-44, -19],
zoom: 7
});

async function carregar() {
const res = await layer.queryFeatures();
ocorrencias = res.features;
mostrar();
}

function destacar(feature) {
destaqueLayer.removeAll();
destaqueLayer.add(new Graphic({
geometry: feature.geometry,
symbol: {
type: "simple-marker",
color: "red",
size: 14
}
}));
view.goTo(feature.geometry);
}

function mostrar() {
const f = ocorrencias[indiceAtual];
const a = f.attributes;

foto.src = a.Imagem;
info.innerHTML = `${a.tipo} - KM ${a.KM}`;

destacar(f);
}

// ================= CLICK NO MAPA =================
view.on("click", async (event) => {
const res = await view.hitTest(event);
const grafico = res.results.find(r => r.graphic.layer === layer);

if (grafico) {
const id = grafico.graphic.attributes.OBJECTID;
indiceAtual = ocorrencias.findIndex(o => o.attributes.OBJECTID === id);
if (indiceAtual >= 0) mostrar();
}
});

// ================= NAVEGAÇÃO =================
prev.onclick = () => {
indiceAtual = (indiceAtual - 1 + ocorrencias.length) % ocorrencias.length;
mostrar();
};

next.onclick = () => {
indiceAtual = (indiceAtual + 1) % ocorrencias.length;
mostrar();
};

// ================= PLAY / AUTO =================
play.onclick = () => {
clearInterval(intervalo);
intervalo = setInterval(() => {
indiceAtual = (indiceAtual + 1) % ocorrencias.length;
mostrar();
}, 2000);
};

pause.onclick = () => {
clearInterval(intervalo);
};

view.when(carregar);
});
