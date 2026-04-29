// =====================================================
// script.js – REST ArcGIS Server (SEM AGREGAÇÃO | CAMPOS TEXTO)
// =====================================================
// REGRAS IMPORTANTES:
// - ano_avalia e mes_avalia são CAMPOS TEXTO
// - mes_avalia usa valores '01' .. '12'
// - NÃO usar OR no servidor (evita erro "Unable to complete operation")
// - Estratégia: tentar MÊS ATUAL, se não houver dados → fallback para MÊS ANTERIOR


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
  // Calcula mês atual e anterior como STRING ('01'..'12')
  // -----------------------------------------------------
  function getMesAnoTexto() {
    const hoje = new Date();

    const atualMesNum = hoje.getMonth() + 1;
    const atual = {
      ano: String(hoje.getFullYear()),
      mes: String(atualMesNum).padStart(2, '0')
    };


    const anteriorDate = new Date(hoje);
    anteriorDate.setMonth(anteriorDate.getMonth() - 1);
    const anteriorMesNum = anteriorDate.getMonth() + 1;
    const anterior = {
      ano: String(anteriorDate.getFullYear()),
      mes: String(anteriorMesNum).padStart(2, '0')
    };


    return { atual, anterior };
  }

  const { atual, anterior } = getMesAnoTexto();
  // -----------------------------------------------------
  // FeatureLayer (sem clusterização)
  // -----------------------------------------------------
  const layer = new FeatureLayer({
    url: restUrl,
    outFields: ["*"] ,
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
  // Função central: carrega dados com fallback automático
  // -----------------------------------------------------
  async function carregarDadosComFallback() {
    // 1) tenta mês atual
    let where = `ano_avalia = '${atual.ano}' AND mes_avalia = '${atual.mes}'`;
    let res = await executarConsulta(where);
    // 2) fallback para mês anterior
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

    // --------- Popular filtros ---------
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

    document.getElementById("ano").value = ocorrencias[0].attributes.ano_avalia;
    document.getElementById("mes").value = ocorrencias[0].attributes.mes_avalia;
    mostrar();
    view.goTo(ocorrencias);
  }

  async function executarConsulta(where) {
    layer.definitionExpression = where;
    const q = layer.createQuery();
    q.where = where;
    q.outFields = ["ano_avalia", "mes_avalia", "ROD", "tipo", "KM", "Imagem"];
    q.orderByFields = ["KM ASC"];
    return layer.queryFeatures(q);
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
  // Filtro manual (campos TEXTO)
  // -----------------------------------------------------
  btnFiltrar.onclick = async () => {
    const where = `ano_avalia = '${ano.value}' AND mes_avalia = '${mes.value}' AND ROD = '${rodovia.value}' AND tipo = '${tipo.value}'`;
    const res = await executarConsulta(where);    ocorrencias = res.features;
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

  // Inicialização
  view.when(carregarDadosComFallback);
});
