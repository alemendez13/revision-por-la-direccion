// =================================================================
// ARCHIVO: api.js
// PROPÓSITO: Manejar la comunicación con el backend (Google Apps Script).
// =================================================================

// ▼▼▼ PEGA AQUÍ LA URL DE TU SCRIPT DE GOOGLE ▼▼▼
const GOOGLE_SCRIPT_URL = "https://script.google.com/a/macros/sansce.com/s/AKfycbztpZ05ex5a2R7aihvP_L5sjIkH5xH2xZz29RXlG7_bPKA1CbTcylW_zWASNOFMbeOiHg/exec";
// ▲▲▲ ¡NO OLVIDES REEMPLAZAR "TU_URL_SECRETA"! ▲▲▲


/**
 * Envía un bloque de datos al backend de Google Apps Script.
 * @param {object} datosParaGuardar - El objeto de datos a enviar.
 * @returns {Promise<object>} - La respuesta del servidor.
 */
async function guardarDatos(datosParaGuardar) {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(datosParaGuardar)
    });

    if (!response.ok) {
      throw new Error(`Error de red: ${response.statusText}`);
    }

    return await response.json();

  } catch (error) {
    console.error('Error al guardar los datos:', error);
    // Devuelve un objeto de error estandarizado
    return { status: "error", message: error.message };
  }
}