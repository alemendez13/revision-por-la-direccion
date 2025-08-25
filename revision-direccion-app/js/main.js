// =================================================================
// ARCHIVO: main.js (VERSIÓN FINAL)
// PROPÓSITO: Orquestar la aplicación, manejar eventos y guardar datos.
// =================================================================

document.addEventListener('DOMContentLoaded', () => {

  if (document.body.classList.contains('page-revision')) {
    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
    const fileInput = document.getElementById('excel-file-input');
    const loadExcelBtn = document.getElementById('load-excel-btn');
    const saveReviewBtn = document.getElementById('save-review-btn');
    
    // Referencias a los campos de texto de "Salidas"
    const mejorasProcesosInput = document.getElementById('mejoras-procesos');
    const mejorasProductosInput = document.getElementById('mejoras-productos');
    const cambiosSistemaInput = document.getElementById('cambios-sistema');
    const necesidadRecursosInput = document.getElementById('necesidad-recursos');

    let datosCompletos = {}; // Guardará todos los datos de la revisión
    let idBloqueActual = null; // Guardará el ID del bloque que se está viendo

    // --- MANEJADORES DE EVENTOS ---
    
// Evento para el NUEVO botón "Cargar Datos desde Google Sheets"
const loadGSheetBtn = document.getElementById('load-g-sheet-btn');

loadGSheetBtn.addEventListener('click', async () => {
  loadGSheetBtn.innerText = "Cargando...";
  loadGSheetBtn.disabled = true;

  try {
    // Hacemos la petición a nuestro script pidiendo los datos de 'entrada'
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?tipo=entrada`);
    const jsonData = await response.json();

    // El resto del procesamiento es idéntico al que ya teníamos
    datosCompletos = {};
    jsonData.forEach(row => {
        const [id, tipo, valor] = row;
        if (!datosCompletos[id]) {
            datosCompletos[id] = {};
        }
        if (tipo === 'historico') {
            datosCompletos[id][tipo] = valor ? valor.toString().split(',').map(Number) : [];
        } else {
            datosCompletos[id][tipo] = valor;
        }
        if (!datosCompletos[id].conclusion) {
            datosCompletos[id].conclusion = "";
        }
    });
    
    console.log("Datos procesados desde Google Sheets:", datosCompletos);
    ui.mostrarDashboard();
    idBloqueActual = 'bloque-1';
    ui.actualizarVistaIndicador(datosCompletos, idBloqueActual);

  } catch (error) {
    alert("Error al cargar los datos desde Google Sheets. Revisa la consola.");
    console.error(error);
    loadGSheetBtn.innerText = "Cargar Datos desde Google Sheets";
    loadGSheetBtn.disabled = false;
  }
});

    // Añadir eventos a los links de la barra lateral
    ui.sidebarLinks.forEach(link => {
      link.addEventListener('click', (event) => {
        event.preventDefault();

        // 1. ANTES de cambiar de vista, guarda la conclusión actual
        if (idBloqueActual && datosCompletos[idBloqueActual]) {
            datosCompletos[idBloqueActual].conclusion = ui.conclusionTextarea.value;
        }

        // 2. Obtén el nuevo bloque y actualiza la vista
        const idNuevoBloque = link.getAttribute('href').substring(1);
        idBloqueActual = idNuevoBloque;
        ui.actualizarVistaIndicador(datosCompletos, idBloqueActual);

        // 3. Carga la conclusión previamente guardada (si existe)
        ui.conclusionTextarea.value = datosCompletos[idBloqueActual].conclusion || "";
      });
    });

    // Evento para el botón "Finalizar y Guardar Revisión"
    saveReviewBtn.addEventListener('click', async () => {
    saveReviewBtn.innerText = "Guardando...";
    saveReviewBtn.disabled = true;

    // Guarda la última conclusión que estaba en pantalla
    if (idBloqueActual && datosCompletos[idBloqueActual]) {
        // Obtenemos la conclusión del textarea correcto según la vista activa
        const vistaActiva = document.querySelector('.content-card:not(.hidden)');
        const conclusionTextarea = vistaActiva.querySelector('textarea[id*="conclusion"]');
        if(conclusionTextarea) {
            datosCompletos[idBloqueActual].conclusion = conclusionTextarea.value;
        }
    }

    const reviewId = `REV-${new Date().toISOString()}`;
    let errores = 0;

    // 1. Guarda las CONCLUSIONES de cada bloque
    for (const idBloque of Object.keys(datosCompletos)) {
        const bloque = datosCompletos[idBloque] || {}; // Medida de seguridad
        
        // Solo guardamos si hay una conclusión escrita para ese bloque
        if (bloque.conclusion && bloque.conclusion.trim() !== "") {
            const datosParaGuardar = {
                reviewId: reviewId,
                tipo: "conclusion",
                payload: {
                    bloque: bloque.titulo || idBloque,
                    conclusion: bloque.conclusion
                }
            };
            console.log("Enviando Conclusión:", datosParaGuardar);
            const respuesta = await guardarDatos(datosParaGuardar);
            if (respuesta.status === 'error') errores++;
        }
    }
    
    // 2. Guarda los datos de las "Salidas" (esta lógica se mantiene)
    const salidas = [
        { tipo_salida: 'Mejora a Procesos', descripcion: mejorasProcesosInput.value, responsable: 'Pendiente' },
        { tipo_salida: 'Mejora a Productos', descripcion: mejorasProductosInput.value, responsable: 'Pendiente' },
        { tipo_salida: 'Cambios al Sistema', descripcion: cambiosSistemaInput.value, responsable: 'Pendiente' },
        { tipo_salida: 'Necesidad de Recursos', descripcion: necesidadRecursosInput.value, responsable: 'Pendiente' }
    ];

    for (const salida of salidas) {
        if (salida.descripcion.trim() !== "") {
            const datosParaGuardar = {
                reviewId: reviewId,
                tipo: "salida",
                payload: salida
            };
            console.log("Enviando Salida:", datosParaGuardar);
            const respuesta = await guardarDatos(datosParaGuardar);
            if (respuesta.status === 'error') errores++;
        }
    }

    // 3. Informa al usuario del resultado final
    if (errores > 0) {
        alert(`Proceso finalizado con ${errores} errores. Revisa la consola para más detalles.`);
    } else {
        alert("¡Revisión guardada con éxito en Google Sheets!");
    }

    saveReviewBtn.innerText = "Finalizar y Guardar Revisión";
    saveReviewBtn.disabled = false;
});
  }
});

//==============================================================
// LÓGICA PARA LA PÁGINA DE HISTORIAL
//==============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (document.body.classList.contains('page-historial')) {
        const listaRevisionesEl = document.getElementById('lista-revisiones');
        const detalleRevisionEl = document.getElementById('detalle-revision');

        // Al cargar la página, pedimos todos los datos al backend
        fetch(GOOGLE_SCRIPT_URL)
            .then(res => res.json())
            .then(data => {
                // Procesamos los datos para agruparlos por ID de Revisión
                const revisiones = {};
                
                // Agrupamos KPIs
                data.kpis.forEach(row => {
                    const id = row[0]; // ID_Revision está en la primera columna
                    if (!revisiones[id]) revisiones[id] = { kpis: [], salidas: [] };
                    revisiones[id].kpis.push({
                        bloque: row[2], indicador: row[3], meta: row[4], resultado: row[5], conclusion: row[6]
                    });
                });
                
                // Agrupamos Salidas (y podríamos hacer lo mismo con Contexto)
                data.salidas.forEach(row => {
                    const id = row[0];
                    if (revisiones[id]) { // Solo si la revisión ya existe por un KPI
                         revisiones[id].salidas.push({
                            tipo: row[2], descripcion: row[3], responsable: row[4]
                        });
                    }
                });

                // Mostramos la lista de revisiones en la barra lateral
                listaRevisionesEl.innerHTML = ""; // Limpiamos el "Cargando..."
                const nav = document.createElement('nav');
                const list = document.createElement('ol');
                list.className = 'indicator-list';
                
                Object.keys(revisiones).forEach(id => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = `#${id}`;
                    a.innerText = id; // Mostramos el ID de la revisión
                    a.addEventListener('click', (e) => {
                        e.preventDefault();
                        mostrarDetalle(revisiones[id]);
                    });
                    li.appendChild(a);
                    list.appendChild(li);
                });
                nav.appendChild(list);
                listaRevisionesEl.appendChild(nav);

            }).catch(error => {
                listaRevisionesEl.innerHTML = "<p>Error al cargar el historial.</p>";
                console.error(error);
            });
        
        // Función para mostrar los detalles de la revisión seleccionada
        function mostrarDetalle(revision) {
            let html = `<h2>Detalle de la Revisión</h2>`;
            html += '<h3>Resultados de Indicadores (KPIs)</h3>';
            revision.kpis.forEach(kpi => {
                html += `<p><strong>${kpi.bloque}:</strong> ${kpi.conclusion || '<em>Sin conclusión.</em>'}</p>`;
            });

            html += '<h3>Salidas y Mejoras</h3>';
            revision.salidas.forEach(salida => {
                html += `<p><strong>${salida.tipo}:</strong> ${salida.descripcion}</p>`;
            });

            detalleRevisionEl.innerHTML = html;
        }
    }
});

// ▼▼▼ PEGA TODO ESTE BLOQUE NUEVO AL FINAL DE TU ARCHIVO main.js ▼▼▼

//==============================================================
// LÓGICA PARA LA PÁGINA DE HISTORIAL
//==============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (document.body.classList.contains('page-historial')) {
        const listaRevisionesEl = document.getElementById('lista-revisiones');
        const detalleRevisionEl = document.getElementById('detalle-revision');

        // Al cargar la página, pedimos todos los datos al backend
        // Usamos la misma URL del script, pero la petición GET activa la función doGet()
        fetch(GOOGLE_SCRIPT_URL)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Error de red: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                if (data.status === 'error') {
                    throw new Error(data.message);
                }

                // Procesamos los datos para agruparlos por ID de Revisión
                const revisiones = {};
                
                // Agrupamos Conclusiones, KPIs, etc.
                // Aseguramos que data.kpis, data.salidas, etc., existan antes de iterar
                (data.kpis || []).forEach(row => {
                    const id = row[0]; // ID_Revision está en la primera columna
                    if (!revisiones[id]) revisiones[id] = { id: id, kpis: [], salidas: [], conclusiones: [] };
                    revisiones[id].kpis.push({
                        bloque: row[2], indicador: row[3], meta: row[4], resultado: row[5], conclusion: row[6]
                    });
                });

                (data.conclusiones || []).forEach(row => {
                    const id = row[0];
                    if (!revisiones[id]) revisiones[id] = { id: id, kpis: [], salidas: [], conclusiones: [] };
                    revisiones[id].conclusiones.push({
                        bloque: row[2], conclusion: row[3]
                    });
                });
                
                (data.salidas || []).forEach(row => {
                    const id = row[0];
                    if (revisiones[id]) {
                         revisiones[id].salidas.push({
                            tipo: row[2], descripcion: row[3], responsable: row[4]
                        });
                    }
                });

                // Mostramos la lista de revisiones en la barra lateral
                listaRevisionesEl.innerHTML = ""; // Limpiamos el "Cargando..."
                const nav = document.createElement('nav');
                const list = document.createElement('ol');
                list.className = 'indicator-list';
                
                // Si no hay revisiones, mostramos un mensaje
                if (Object.keys(revisiones).length === 0) {
                    listaRevisionesEl.innerHTML = "<p>No hay revisiones guardadas.</p>";
                    return;
                }
                
                Object.keys(revisiones).forEach(id => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = `#${id}`;
                    // Formateamos el ID para que sea más legible
                    a.innerText = `Revisión del ${new Date(id.substring(4)).toLocaleString()}`; 
                    a.addEventListener('click', (e) => {
                        e.preventDefault();
                        mostrarDetalle(revisiones[id]);
                    });
                    li.appendChild(a);
                    list.appendChild(li);
                });
                nav.appendChild(list);
                listaRevisionesEl.appendChild(nav);

            }).catch(error => {
                listaRevisionesEl.innerHTML = `<p style="color: red;">Error al cargar el historial.</p>`;
                console.error(error);
            });
        
        // Función para mostrar los detalles de la revisión seleccionada
        function mostrarDetalle(revision) {
            let html = `<h2>Detalle: ${new Date(revision.id.substring(4)).toLocaleString()}</h2>`;

            if(revision.conclusiones.length > 0) {
                html += '<h3>Conclusiones por Bloque</h3>';
                revision.conclusiones.forEach(c => {
                    html += `<p><strong>${c.bloque}:</strong> ${c.conclusion || '<em>Sin conclusión.</em>'}</p>`;
                });
            }

            if(revision.salidas.length > 0) {
                html += '<hr><h3>Salidas y Mejoras Registradas</h3>';
                revision.salidas.forEach(salida => {
                    html += `<p><strong>${salida.tipo}:</strong> ${salida.descripcion}</p>`;
                });
            }

            detalleRevisionEl.innerHTML = html;
        }
    }
});