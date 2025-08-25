// =================================================================
// ARCHIVO: ui.js
// PROPÓSITO: Manipular la interfaz de usuario (DOM), mostrar/ocultar
//            elementos, dibujar gráficos y actualizar datos.
// =================================================================

// Objeto para agrupar todas nuestras funciones de UI
const ui = {
  // Referencias a elementos del DOM que usaremos constantemente
  uploadSection: document.getElementById('upload-section'),
  dashboardSection: document.getElementById('dashboard-section'),
  indicatorTitle: document.getElementById('indicator-title'),
  kpiMeta: document.getElementById('kpi-meta'),
  kpiResultado: document.getElementById('kpi-resultado'),
  kpiDiferencia: document.getElementById('kpi-diferencia'),
  conclusionTextarea: document.getElementById('conclusion-textarea'),
  sidebarLinks: document.querySelectorAll('.indicator-list a'),
  
  // Referencias a los lienzos (canvas) de los gráficos
  periodoChartCanvas: document.getElementById('periodo-chart'),
  historicoChartCanvas: document.getElementById('historico-chart'),

  // Variables para guardar las instancias de los gráficos y poder actualizarlos
  periodoChart: null,
  historicoChart: null,

  /**
   * Oculta la sección de carga y muestra el dashboard principal.
   */
  mostrarDashboard: function() {
    this.uploadSection.classList.add('hidden');
    this.dashboardSection.classList.remove('hidden');
  },

  /**
   * Actualiza la vista del dashboard con los datos de un indicador específico.
   * @param {object} datos - El objeto completo con todos los datos de la revisión.
   * @param {string} idBloque - El ID del bloque a mostrar (ej: "bloque-3").
   */
  // ▼▼▼ REEMPLAZA TODA LA FUNCIÓN actualizarVistaIndicador CON ESTO ▼▼▼
actualizarVistaIndicador: function(datos, idBloque) {
    // Marcar el enlace activo en la barra lateral
    this.sidebarLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${idBloque}`) {
            link.classList.add('active');
        }
    });

    const datosDelBloque = datos[idBloque] || { titulo: "Dato no encontrado" };

    // 1. Ocultar todas las vistas primero
    document.getElementById('vista-kpi-multiple').classList.add('hidden');
    document.getElementById('vista-texto').classList.add('hidden');
    document.getElementById('vista-tabla-generica').classList.add('hidden');

    // 2. Usar un 'switch' para mostrar y poblar la vista correcta
    switch (idBloque) {
        case 'bloque-4':
        case 'bloque-5':
        case 'bloque-6':
            const vistaKPI = document.getElementById('vista-kpi-multiple');
            vistaKPI.classList.remove('hidden');
            document.getElementById('kpi-multiple-title').innerText = datosDelBloque.titulo || 'Indicadores Múltiples';
            
            const kpiBody = document.getElementById('kpi-multiple-body');
            kpiBody.innerHTML = ''; // Limpiar tabla
            
            // Agrupar indicadores del bloque
            const indicadores = {};
            for(const key in datosDelBloque) {
                if(key.startsWith('indicador')) {
                    const index = key.match(/\d+/)[0]; // Extraer el número del indicador
                    if(!indicadores[index]) indicadores[index] = {};
                    const tipo = key.replace(index, ''); // 'indicador_nombre', 'indicador_meta', etc.
                    indicadores[index][tipo] = datosDelBloque[key];
                }
            }
            
            // Construir la tabla de KPIs
            Object.values(indicadores).forEach(ind => {
                const row = kpiBody.insertRow();
                row.insertCell().innerText = ind.indicador_nombre || 'N/A';
                row.insertCell().innerText = ind.indicador_meta || '-';
                row.insertCell().innerText = ind.indicador_resultado || '-';
                // Creamos un textarea para la conclusión de cada KPI
                const conclusionCell = row.insertCell();
                const conclusionTextarea = document.createElement('textarea');
                conclusionTextarea.placeholder = "Conclusión del indicador...";
                conclusionTextarea.className = `conclusion-kpi-${ind.indicador_nombre.replace(/\s/g, '-')}`;
                conclusionCell.appendChild(conclusionTextarea);
            });
            break;

        case 'bloque-2':
            const vistaTexto = document.getElementById('vista-texto');
            vistaTexto.classList.remove('hidden');
            document.getElementById('texto-title').innerText = datosDelBloque.titulo || 'Contexto';
            document.getElementById('texto-interno').value = datosDelBloque.contexto_interno || '';
            document.getElementById('texto-impacto-interno').value = datosDelBloque.impacto_interno || '';
            document.getElementById('texto-externo').value = datosDelBloque.contexto_externo || '';
            document.getElementById('texto-impacto-externo').value = datosDelBloque.impacto_externo || '';
            break;

        default: // Para todos los demás bloques, usamos la tabla genérica
            const vistaTabla = document.getElementById('vista-tabla-generica');
            vistaTabla.classList.remove('hidden');
            document.getElementById('tabla-generica-title').innerText = datosDelBloque.titulo || 'Datos Generales';
            const tablaBody = document.getElementById('tabla-generica-body');
            tablaBody.innerHTML = '';
            
            for (const key in datosDelBloque) {
                if (key !== 'titulo' && key !== 'conclusion') {
                    const row = tablaBody.insertRow();
                    const cell1 = row.insertCell();
                    const cell2 = row.insertCell();
                    cell1.innerHTML = `<strong>${key.replace(/_/g, ' ').toUpperCase()}</strong>`;
                    cell2.innerText = datosDelBloque[key];
                }
            }
            break;
    }
},
  
  /**
   * Dibuja o actualiza el gráfico de barras "Resultado vs. Meta".
   */
  dibujarGraficoPeriodo: function(meta, resultado) {
    // Si ya existe un gráfico, lo destruimos antes de crear uno nuevo
    if (this.periodoChart) {
      this.periodoChart.destroy();
    }
    this.periodoChart = new Chart(this.periodoChartCanvas, {
      type: 'bar',
      data: {
        labels: ['Periodo Actual'],
        datasets: [{
          label: 'Meta',
          data: [meta],
          backgroundColor: 'rgba(0, 168, 232, 0.6)', // azul claro
          borderColor: 'rgba(0, 168, 232, 1)',
          borderWidth: 1
        }, {
          label: 'Resultado',
          data: [resultado],
          backgroundColor: 'rgba(0, 90, 156, 0.8)', // azul oscuro
          borderColor: 'rgba(0, 90, 156, 1)',
          borderWidth: 1
        }]
      },
      options: {
        scales: { y: { beginAtZero: true } },
        responsive: true,
        maintainAspectRatio: false
      }
    });
  },

  /**
   * Dibuja o actualiza el gráfico de líneas de "Tendencia Histórica".
   */
  dibujarGraficoHistorico: function(datosHistoricos = []) {
    if (this.historicoChart) {
      this.historicoChart.destroy();
    }
    this.historicoChart = new Chart(this.historicoChartCanvas, {
      type: 'line',
      data: {
        labels: datosHistoricos.map((_, index) => `Periodo ${index + 1}`), // Etiquetas genéricas
        datasets: [{
          label: 'Resultado Histórico',
          data: datosHistoricos,
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
};