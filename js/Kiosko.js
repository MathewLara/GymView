// Referencia al input invisible que captura lecturas de escáneres USB
const inputLector = document.getElementById('lector-input');

// ==========================================
// GESTIÓN DE FOCO
// ==========================================
// Forzamos que el input siempre tenga el foco para recibir los datos del hardware
document.addEventListener('click', () => inputLector.focus());
setInterval(() => inputLector.focus(), 2000);

// ==========================================
// CAPTURA DE CÓDIGO
// ==========================================
// Escuchar el evento "Enter" que envían automáticamente la mayoría de lectores QR
inputLector.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    const codigo = this.value;
    this.value = ''; // Limpiar el campo para la siguiente lectura
    procesarCodigo(codigo);
  }
});

/**
 * Procesa el código obtenido del escáner
 * @param {string} codigo - El contenido del código QR
 */
function procesarCodigo(codigo) {
  console.log("Procesando código:", codigo);

  // Aquí es donde realizarías la llamada a tu API real:
  // fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/asistencia', { method: 'POST', body: ... })

  // Por ahora, simulamos un resultado aleatorio para el flujo visual
  const exito = Math.random() < 0.8;
  simularAcceso(exito);
}

/**
 * Controla la visualización de los overlays de éxito o error
 * @param {boolean} permitido - Define qué pantalla mostrar
 */
function simularAcceso(permitido) {
  const overlay = permitido ? document.getElementById('overlay-success') : document.getElementById('overlay-error');

  // Mostrar la pantalla correspondiente
  overlay.style.display = 'flex';

  // Opcional: Aquí podrías integrar un sonido de 'beep'

  // Resetear automáticamente el Kiosco después de 3.5 segundos para el próximo socio
  setTimeout(() => {
    resetKiosk();
  }, 3500);
}

/**
 * Oculta los overlays y prepara el sistema para una nueva lectura
 */
function resetKiosk() {
  document.querySelectorAll('.status-overlay').forEach(el => el.style.display = 'none');
  inputLector.value = '';
  inputLector.focus();
}
