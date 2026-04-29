let ocorrencias = [];
let indiceAtual = 0;
let typeName = null;

const loader = document.createElement("div");
loader.innerText = "Carregando dados...";
loader.style.position = "fixed";
loader.style.top = "50%";
loader.style.left = "50%";
loader.style.transform = "translate(-50%, -50%)";
loader.style.padding = "12px 20px";
loader.style.background = "#000";
loader.style.color = "#fff";
loader.style.display = "none";
loader.style.zIndex = 9999;
document.body.appendChild(loader);

function showLoader(show) {
  loader.style.display = show ? "block" : "none";
}

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GraphicsLayer",
  "esri/layers/FeatureReductionCluster",
  "esri/Graphic"
], function (Map, MapView, GraphicsLayer, FeatureReductionCluster, Graphic) {

  const wfsUrl =
    "https://observatorio.infraestrutura.mg.gov.br/server/services/Hosted/ICM_PONTO_MAIO_2025_PILOTO_SREMG/MapServer/WFSServer";

  /* ============================================================
     1) Descobre o typeName automaticamente (GetCapabilities)
     ============================================================ */
  async function validarTypeName() {
    const resp = await fetch(`${wfsUrl}?service=WFS&request=GetCapabilities`);
    const xmlTxt = await resp.text();
    const xml = new DOMParser().parseFromString(xmlTxt, "text/xml");
    typeName = xml
      .getElementsByTagName("FeatureType")[0]
      .getElementsByTagName("Name")[0]
      .textContent;

    console.log("typeName detectado:", typeName);
  }

  /* ============================================================
     2) Camada com clusterização
     ============================================================ */
  const graphicsLayer = new GraphicsLayer({
    featureReduction: new FeatureReductionCluster({
      clusterRadius: "100px",
      labelingInfo: [{
        labelExpressionInfo: { expression: "$feature.cluster_count" },
        symbol: {
