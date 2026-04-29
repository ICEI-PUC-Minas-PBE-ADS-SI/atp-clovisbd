// =====================================================
// script.js – CONSUMO VIA REST NATIVO DO ARCGIS SERVER
// =====================================================
// URL CONFIRMADA:
// https://observatorio.infraestrutura.mg.gov.br/server/rest/services/Hosted/ICM_PONTO_MAIO_2025_PILOTO_SREMG/MapServer/0

let ocorrencias = [];
let indiceAtual = 0;

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer"
], function (Map, MapView, FeatureLayer) {


  const restUrl = "https://observatorio.infraestrutura.mg.gov.br/server/rest/services/Hosted/ICM_PONTO_MAIO_2025_PILOTO_SREMG/MapServer/0";

  function marker(color) {
    return { type: "simple-marker", color, size: 8 };
  }

  const layer = new FeatureLayer({
    url: restUrl,
    outFields: ["*"],
    featureReduction: {
      type: "cluster",
      clusterRadius: "100px",
      labelingInfo: [{
        labelExpressionInfo: { expression: "$feature.cluster_count" },
        symbol: { type: "text", color: "white", font: { size: 12, weight: "bold" } }
      }]
    },
    renderer: {
      type: "unique-value",
      field: "tipo",
      uniqueValueInfos: [
        { value: "Trinca", symbol: marker("orange") },
        { value: "Remendo", symbol: marker("blue") },
        { value: "Buraco", symbol: marker("red") },
        { value: "Placa", symbol: marker("green") },
        { value: "Drenagem", symbol: marker("purple") },
        { value: "Roçada", symbol: marker("brown") }
      ],
      defaultSymbol: marker("gray")
    },
    popupTemplate: {
      title: "{tipo}",
      content: "{Imagem}<br><b>Rodovia:</b> {ROD}<br><b>Km:</b> {KM}<br><b>Mês/Ano:</b> {mes_avalia}/{ano_avalia}"
    }
  });

  const map = new Map({
    basemap: "streets",
    layers: [layer]
  });

  const view = new MapView({
    container: "map",
    map,
    center: [-44, -19],
    zoom: 7
  });

  async function popularFiltros() {
    const q = layer.createQuery();
    q.where = "1=1";
    q.outFields = ["ano_avalia", "mes_avalia", "ROD", "tipo"];
    q.returnDistinctValues = true;


    const res = await layer.queryFeatures(q);


    const anos = new Set(), meses = new Set(), rods = new Set(), tipos = new Set();
    res.features.forEach(f => {
      anos.add(f.attributes.ano_avalia);
      meses.add(f.attributes.mes_avalia);
      rods.add(f.attributes.ROD);
      tipos.add(f.attributes.tipo);
    });

    preencher("ano", anos);
    preencher("mes", meses);
    preencher("rodovia", rods);
    preencher("tipo", tipos);
  }

  function preencher(id, valores) {
    const sel = document.getElementById(id);
    sel.innerHTML = "";
    [...valores].sort().forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      sel.appendChild(opt);
    });
  }

  btnFiltrar.onclick = async () => {
    const where = `ano_avalia = ${ano.value} AND mes_avalia = ${mes.value} AND ROD = '${rodovia.value}' AND tipo = '${tipo.value}'`;

    layer.definitionExpression = where;


    const q = layer.createQuery();
    q.where = where;
    q.orderByFields = ["KM ASC"];

    const res = await layer.queryFeatures(q);
    ocorrencias = res.features;
    indiceAtual = 0;

    if (ocorrencias.length) {
      mostrar();
      view.goTo(res.features);
    } else {
      info.innerText = "Nenhuma ocorrência encontrada.";
    }
  };

  function mostrar() {
    const f = ocorrencias[indiceAtual].attributes;
    foto.src = f.Imagem;
    info.innerHTML = `<strong>Rodovia:</strong> ${f.ROD}<br><strong>Km:</strong> ${f.KM}<br><strong>Tipo:</strong> ${f.tipo}<br><strong>Mês/Ano:</strong> ${f.mes_avalia}/${f.ano_avalia}`;
  }

  prev.onclick = () => {
    indiceAtual = (indiceAtual - 1 + ocorrencias.length) % ocorrencias.length;
    mostrar();
  };

  next.onclick = () => {
    indiceAtual = (indiceAtual + 1) % ocorrencias.length;
    mostrar();
  };

  view.when(popularFiltros);
});
