// =====================================================
// script.js – REST ArcGIS Server (SEM AGREGAÇÃO | CAMPOS TEXTO)
// =====================================================
// Funcionalidades:
// - Clique no ponto do mapa atualiza a fototeca
// - Botão ▶ Auto percorre fotos a cada 2s (sincronizado com mapa)
// - Destaque em vermelho do ponto ativo

let ocorrencias = [];
let indiceAtual = 0;
let destaqueGrafico = null;
let timer = null;

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/Graphic"
], function (Map, MapView, FeatureLayer, GraphicsLayer, Graphic) {

  const restUrl = "https://observatorio.infraestrutura.mg.gov.br/server/rest/services/Hosted/ICM_PONTO_MAIO_2025_PILOTO_SREMG/MapServer/0";

  function marker(color) {
    return { type: "simple-marker", color, size: 8, outline: { color: "white", width: 0.5 } };
  }

  const renderer = {
    type: "unique-value",
    field: "tipo",
    uniqueValueInfos: [
      { value: "Trinca", symbol: marker("gray") },
      { value: "Remendo", symbol: marker("black") },
      { value: "Buraco", symbol: marker("orange") },
      { value: "Placa", symbol: marker("yellow") },
      { value: "Drenagem", symbol: marker("blue") },
      { value: "Roçada", symbol: marker("green") }
    ],
    defaultSymbol: marker("gray")
  };

  function getMesAnoTexto() {
    const hoje = new Date();
    const atual = { ano: String(hoje.getFullYear()), mes: String(hoje.getMonth() + 1).padStart(2, '0') };
    const ant = new Date(hoje); ant.setMonth(ant.getMonth() - 1);
    const anterior = { ano: String(ant.getFullYear()), mes: String(ant.getMonth() + 1).padStart(2, '0') };
    return { atual, anterior };
  }

  const { atual, anterior } = getMesAnoTexto();

  const layer = new FeatureLayer({ url: restUrl, outFields: ["*"], renderer, popupEnabled: false });
  const destaqueLayer = new GraphicsLayer();

  const map = new Map({ basemap: "streets", layers: [layer, destaqueLayer] });
  const view = new MapView({ container: "map", map, center: [-44, -19], zoom: 7 });

  async function executarConsulta(where) {
    layer.definitionExpression = where;
    const q = layer.createQuery();
    q.where = where;
    q.outFields = ["ano_avalia", "mes_avalia", "ROD", "tipo", "KM", "Imagem"];
    q.orderByFields = ["KM ASC"];
    return layer.queryFeatures(q);
  }

  async function carregarDados() {
    let res = await executarConsulta(`ano_avalia='${atual.ano}' AND mes_avalia='${atual.mes}'`);
    if (!res.features.length) {
      res = await executarConsulta(`ano_avalia='${anterior.ano}' AND mes_avalia='${anterior.mes}'`);
    }
    ocorrencias = res.features;
    indiceAtual = 0;
    if (!ocorrencias.length) return;
    mostrar();
    view.goTo(ocorrencias);
  }

  function destacarPonto(feature) {
    destaqueLayer.removeAll();
    destaqueLayer.add(new Graphic({ geometry: feature.geometry, symbol: { type: "simple-marker", color: "red", size: 14, outline: { color: "white", width: 1.5 } } }));
  }

  function mostrar() {
    const f = ocorrencias[indiceAtual];
    foto.src = f.attributes.Imagem;
    info.innerHTML = `<strong>Rodovia:</strong> ${f.attributes.ROD}<br><strong>Km:</strong> ${f.attributes.KM}<br><strong>Tipo:</strong> ${f.attributes.tipo}<br><strong>Mês/Ano:</strong> ${f.attributes.mes_avalia}/${f.attributes.ano_avalia}`;
    destacarPonto(f);
    view.goTo({ target: f.geometry, zoom: Math.max(view.zoom, 15) });
  }

  // Clique no ponto do mapa → abre foto correspondente
  view.on("click", async (event) => {
    const hit = await view.hitTest(event);
    const r = hit.results.find(r => r.graphic && r.graphic.layer === layer);
    if (r) {
      const idx = ocorrencias.findIndex(o => o.attributes.KM === r.graphic.attributes.KM && o.attributes.Imagem === r.graphic.attributes.Imagem);
      if (idx >= 0) {
        indiceAtual = idx;
        mostrar();
      }
    }
  });

  prev.onclick = () => { indiceAtual = (indiceAtual - 1 + ocorrencias.length) % ocorrencias.length; mostrar(); };
  next.onclick = () => { indiceAtual = (indiceAtual + 1) % ocorrencias.length; mostrar(); };

  // Animação automática
  btnPlay.onclick = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
      btnPlay.textContent = "▶ Auto";
    } else {
      btnPlay.textContent = "⏸";
      timer = setInterval(() => {
        indiceAtual = (indiceAtual + 1) % ocorrencias.length;
        mostrar();
      }, 2000);
    }
  };

  view.when(carregarDados);
});
