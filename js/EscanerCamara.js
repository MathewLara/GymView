// Variable para controlar el tiempo entre escaneos y evitar duplicados
let ultimoEscaneo = 0;

/**
 * Función que se ejecuta cuando la cámara detecta un código QR válido
 */
function onScanSuccess(decodedText, decodedResult) {
  const ahora = new Date().getTime();

  // Debounce: Esperar 3 segundos entre lecturas del mismo código
  if (ahora - ultimoEscaneo < 3000) return;
  ultimoEscaneo = ahora;

  // Limpiar el ID detectado (eliminar el prefijo IRON_ si existe)
  let idLimpio = decodedText.replace("IRON_", "");
  procesarAcceso(idLimpio);
}

/**
 * Función para manejar errores de escaneo (se ignoran frames vacíos)
 */
function onScanFailure(error) {
  // Se deja vacío para no saturar la consola con errores de lectura continua
}

/**
 * Envía el ID a la API y gestiona la respuesta visual y sonora
 * @param {string} id - ID del socio detectado
 */
async function procesarAcceso(id) {
  const lblMsg = document.getElementById('lbl-mensaje');
  const lblInfo = document.getElementById('lbl-info');
  const circulo = document.getElementById('circulo-estado');

  lblMsg.textContent = "Procesando...";
  lblInfo.textContent = "ID Detectado: " + id;

  try {
    // Petición POST a la API de accesos
    // La ruta relativa ayuda a que funcione tanto en localhost como en servidores desplegados
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/accesos/escanear/${id}`, { method: 'POST' });
    if(res.ok) {
      const data = await res.json();
      lblMsg.textContent = data.mensaje;

      // Diferenciar visualmente entre un registro de ENTRADA o de SALIDA
      if(data.tipo === 'ENTRADA') {
        circulo.className = "circle entrada";
        circulo.textContent = "👋";
        try { document.getElementById('snd-ok').play(); } catch(e){}
      } else {
        circulo.className = "circle salida";
        circulo.textContent = "🚪";
        try { document.getElementById('snd-out').play(); } catch(e){}
      }

      // Volver al estado inicial después de 3 segundos
      setTimeout(() => {
        circulo.className = "circle";
        circulo.textContent = "🔒";
        lblMsg.textContent = "Escanea tu código QR";
      }, 3000);

    } else {
      // Caso: El ID no existe en el sistema
      lblMsg.textContent = "Usuario No Encontrado";
      circulo.style.background = "orange";
    }
  } catch(e) {
    console.error(e);
    lblMsg.textContent = "Error de Conexión";
  }
}

// Configuración e inicialización del escáner de la cámara
// fps: 10 (cuadros por segundo), qrbox: tamaño del área de escaneo
let html5QrcodeScanner = new Html5QrcodeScanner(
  "reader",
  { fps: 10, qrbox: {width: 250, height: 250} },
  false
);

// Renderizar el visor en el elemento HTML con id="reader"
html5QrcodeScanner.render(onScanSuccess, onScanFailure);
