// =====================================================
// script.js – REST ArcGIS Server (SEM AGREGAÇÃO)
// =====================================================
// Estratégia:
// - Cada ocorrência é exibida como UM ponto individual
// - Mantém filtro automático (mês atual + mês anterior)
// - Melhora performance removendo clusterização
// - Fototeca inicializa automaticamente
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

  // -----------------------------------------------------
  // Calcula mês atual + mês anterior (robusto para virada de ano)
  // -----------------------------------------------------
  function getMesesPadrao() {
    const hoje = new Date();
    const atual = { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };

    const anteriorDate = new Date(hoje);
    anteriorDate.setMonth(anteriorDate.getMonth() - 1);
    const anterior = { ano: anteriorDate.getFullYear(), mes: anteriorDate.getMonth() + 1 };

    return { atual, anterior };
  }

  const { atual, anterior } = getMesesPadrao();


  // WHERE inicial: mês atual OU último mês
  const whereInicial = `(
    (ano_avalia = ${atual.ano} AND mes_avalia = ${atual.mes})
    OR
    (ano_avalia = ${anterior.ano} AND mes_avalia = ${anterior.mes})
  )`;


  // -----------------------------------------------------
  // FeatureLayer SEM clusterização (1 ponto = 1 ocorrência)
  // -----------------------------------------------------
  const layer = new FeatureLayer({
    url: restUrl,
    outFields: ["*"],
    definitionExpression: whereInicial,
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

  const map = new Map({ basemap: "streets", layers: [layer] });


  const view = new MapView({
    container: "map",
    map,
    center: [-44, -19],
    zoom: 7
  });

  // -----------------------------------------------------
  // Popular filtros E fototeca (sem agregação)
  // -----------------------------------------------------
  async function popularFiltrosEFototeca() {
    const q = layer.createQuery();
    q.where = whereInicial;
    q.outFields = ["ano_avalia", "mes_avalia", "ROD", "tipo", "KM", "Imagem"];
    q.orderByFields = ["KM ASC"];


    const res = await layer.queryFeatures(q);
    ocorrencias = res.features;
    indiceAtual = 0;


    if (!ocorrencias.length) {
      info.innerText = "Nenhuma ocorrência encontrada para o período atual.";
      return;
    }


    const anos = new Set(), meses = new Set(), rods = new Set(), tipos = new Set();
    ocorrencias.forEach(f => {
      anos.add(f.attributes.ano_avalia);
      meses.add(f.attributes.mes_avalia);
      rods.add(f.attributes.ROD);
      tipos.add(f.attributes.tipo);
    });

    preencher("ano", anos);
    preencher("mes", meses);
    preencher("rodovia", rods);
    preencher("tipo", tipos);

    document.getElementById("ano").value = atual.ano;
    document.getElementById("mes").value = atual.mes;


    mostrar();
    view.goTo(ocorrencias);
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

  // -----------------------------------------------------
  // Aplicar filtros manuais
  // -----------------------------------------------------
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
      view.goTo(ocorrencias);
    } else {
      info.innerText = "Nenhuma ocorrência encontrada.";
    }
  };

  // -----------------------------------------------------
  // Fototeca
  // -----------------------------------------------------
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

  view.when(popularFiltrosEFototeca);
});
