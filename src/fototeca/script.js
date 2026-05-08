// =====================================================
// script.js – REST ArcGIS Server (SEM AGREGAÇÃO | CAMPOS TEXTO)
// =====================================================
// ATUALIZAÇÕES:
// 1) Cada ocorrência = 1 ponto (sem cluster)
// 2) Cores ajustadas por tipo (conforme solicitado)
// 3) Destaque em VERMELHO do ponto correspondente à foto atual
// 4) Informações da ocorrência exibidas ABAIXO da imagem
// 5) Filtro automático com fallback: mês atual -> mês anterior (campos TEXTO)
let ocorrencias = [];
let indiceAtual = 0;
let destaqueGrafico = null;
require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/Graphic"
], function (Map, MapView, FeatureLayer, GraphicsLayer, Graphic) {
  const restUrl = "https://observatorio.infraestrutura.mg.gov.br/server/rest/services/Hosted/ICM_PONTO_MAIO_2025_PILOTO_SREMG/FeatureServer/0";

  // -----------------------------------------------------
  // Símbolos por tipo (cores corrigidas)
  // -----------------------------------------------------
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


  // -----------------------------------------------------
  // Datas (campos TEXTO: '01'..'12')
  // -----------------------------------------------------
  function getMesAnoTexto() {
    const hoje = new Date();

    const atualMes = String(hoje.getMonth() + 1).padStart(2, '0');
    const atual = { ano: String(hoje.getFullYear()), mes: atualMes };
    const anteriorDate = new Date(hoje);
    anteriorDate.setMonth(anteriorDate.getMonth() - 1);
    const anteriorMes = String(anteriorDate.getMonth() + 1).padStart(2, '0');
    const anterior = { ano: String(anteriorDate.getFullYear()), mes: anteriorMes };


    return { atual, anterior };
  }

  const { atual, anterior } = getMesAnoTexto();


  // -----------------------------------------------------
  // Camadas
  // -----------------------------------------------------
  const layer = new FeatureLayer({
    url: restUrl,
    outFields: ["*"],
    renderer: renderer,
    popupEnabled: true
  });

  const destaqueLayer = new GraphicsLayer();
  const map = new Map({ basemap: "streets", layers: [layer, destaqueLayer] });


  const view = new MapView({
    container: "map",
    map,
    center: [-44, -19],
    zoom: 7
  });

  // -----------------------------------------------------
  // Consulta com fallback (sem OR no servidor)
  // -----------------------------------------------------
  async function executarConsulta(where) {
    layer.definitionExpression = where;
    const q = layer.createQuery();
    q.where = where;
    q.outFields = [*];
    q.orderByFields = ["km ASC"];
    return layer.queryFeatures(q);
  }


  async function carregarDadosComFallback() {
    let where = `ano_avalia = '${atual.ano}' AND mes_avalia = '${atual.mes}'`;
    let res = await executarConsulta(where);


    if (!res.features.length) {
      where = `ano_avalia = '${anterior.ano}' AND mes_avalia = '${anterior.mes}'`;
      res = await executarConsulta(where);
    }


    ocorrencias = res.features;
    indiceAtual = 0;


    if (!ocorrencias.length) {
      info.innerText = "Nenhuma ocorrência encontrada para o período atual.";
      return;
    }


    // Filtros
    const anos = new Set(), meses = new Set(), rods = new Set(), tipos = new Set(), condicao = new Set();
    ocorrencias.forEach(f => {
      anos.add(f.attributes.ano_avalia);
      meses.add(f.attributes.mes_avalia);
      rods.add(f.attributes.rod);
      tipos.add(f.attributes.tipo);
      condicao.add(f.attributes.condicao);
    });

    preencher("ano", anos);
    preencher("mes", meses);
    preencher("rodovia", rods);
    preencher("tipo", tipos);

    document.getElementById("ano").value = ocorrencias[0].attributes.ano_avalia;
    document.getElementById("mes").value = ocorrencias[0].attributes.mes_avalia;


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
  // Destaque do ponto ativo (vermelho)
  // -----------------------------------------------------
  function destacarPonto(feature) {
    destaqueLayer.removeAll();
    destaqueGrafico = new Graphic({
      geometry: feature.geometry,
      symbol: {
        type: "simple-marker",
        color: "red",
        size: 14,
        outline: { color: "white", width: 1.5 }
      }
    });
    destaqueLayer.add(destaqueGrafico);
    view.goTo({ target: feature.geometry, zoom: Math.max(view.zoom, 15) });
  }
  // -----------------------------------------------------
  // Fototeca (info ABAIXO da imagem)
  // -----------------------------------------------------
  function mostrar() {
    const f = ocorrencias[indiceAtual];
    const a = f.attributes;
    foto.src = a.imagem;


    info.innerHTML = `
      <div style="margin-top:8px">
        <strong>Rodovia:</strong> ${a.rod}<br>
        <strong>Km:</strong> ${a.km}<br>
        <strong>Tipo:</strong> ${a.tipo}<br>
        <strong>Condição:</strong> ${a.condicao}<br> 
        <strong>Mês/Ano:</strong> ${a.mes_avalia}/${a.ano_avalia}
      </div>
    `;


    destacarPonto(f);
  }


  prev.onclick = () => {
    indiceAtual = (indiceAtual - 1 + ocorrencias.length) % ocorrencias.length;
    mostrar();
  };


  next.onclick = () => {
    indiceAtual = (indiceAtual + 1) % ocorrencias.length;
    mostrar();
  };

  // Filtro manual
  btnFiltrar.onclick = async () => {
    const where = `ano_avalia = '${ano.value}' AND mes_avalia = '${mes.value}' AND rodovia = '${rod.value}' AND tipo = '${tipo.value}'`;
    const res = await executarConsulta(where);
    ocorrencias = res.features;
    indiceAtual = 0;
    if (ocorrencias.length) {
      mostrar();
      view.goTo(ocorrencias);
    } else {
      info.innerText = "Nenhuma ocorrência encontrada.";
      destaqueLayer.removeAll();
    }
  };


  // Inicialização
  view.when(carregarDadosComFallback);
});
