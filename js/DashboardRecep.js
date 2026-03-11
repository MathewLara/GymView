// Variable global para controlar la cámara y poder apagarla cuando cambiemos de pestaña
let escanerCamara = null;

// Función enlazada al botón "Salir" en el menú lateral
function cerrarSesion() {
  localStorage.removeItem('tokenGimnasio');
  sessionStorage.removeItem('usuarioLogueado');
  window.location.href = 'index.html';
}

// ==========================================
// NAVEGACIÓN DINÁMICA DEL DASHBOARD (SPA)
// ==========================================
async function cargarModulo(modulo, elementoHTML) {

  const tituloMap = {
    'resumen': 'Recepción - Panel Operativo',
    'acceso': 'Control de Acceso (Escáner QR)',
    'clientes': 'Directorio de Socios',
    'pagos': 'Gestión de Caja y Pagos',
    'entrenadores': 'Horarios de Entrenadores'
  };
  document.getElementById('page-title').innerText = tituloMap[modulo] || 'Recepción';

  if (elementoHTML) {
    const links = document.querySelectorAll('#sidebarMenu .nav-link');
    links.forEach(link => link.classList.remove('active'));
    elementoHTML.classList.add('active');
  }

  const vistaResumen = document.getElementById('vista-resumen');
  const contenedorDinamico = document.getElementById('vista-dinamica-contenedor');

  // MUY IMPORTANTE: Si cambiamos de pestaña y la cámara está encendida, la apagamos.
  if (escanerCamara && modulo !== 'acceso') {
    try {
      await escanerCamara.clear();
      escanerCamara = null;
    } catch (error) {
      console.error("Error apagando la cámara:", error);
    }
  }

  // A) VISTA RESUMEN: Conectada a la BDD para Caja, Aforo y Actividad
  if (modulo === 'resumen') {
    vistaResumen.style.display = 'block';
    contenedorDinamico.innerHTML = '';

    try {
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/recepcion/dashboard');

      if(res.ok) {
        const data = await res.json();

        // 1. Actualizar KPIs con los IDs de tu HTML
        const kpiCaja = document.getElementById('kpi-caja');
        const kpiAforo = document.getElementById('kpi-aforo');

        if(kpiCaja) kpiCaja.innerText = '$' + parseFloat(data.kpis.cajaHoy || 0).toFixed(2);
        if(kpiAforo) kpiAforo.innerText = data.kpis.aforoHoy || 0;

        // 2. Llenar la tabla de Actividad Reciente (Física)
        const tbody = document.getElementById('tabla-actividad');
        if (tbody && data.actividadReciente && data.actividadReciente.length > 0) {
          tbody.innerHTML = data.actividadReciente.map(act => {
            const badgeColor = act.tipo === 'Entrada' ? 'bg-success' : 'bg-warning text-dark';
            const icono = act.tipo === 'Entrada' ? '<i class="bi bi-box-arrow-in-right text-success"></i>' : '<i class="bi bi-box-arrow-right text-warning"></i>';

            return `
                <tr>
                  <td class="text-muted fw-bold">${act.hora}</td>
                  <td>${icono} ${act.tipo}</td>
                  <td class="text-white fw-bold">${act.cliente}</td>
                  <td class="text-muted">Gimnasio</td>
                  <td><span class="badge ${badgeColor}">Completado</span></td>
                </tr>
                `;
          }).join('');
        } else if (tbody) {
          tbody.innerHTML = '<tr><td colspan=\"5\" class=\"text-center py-4 text-muted\"><i class=\"bi bi-clock-history fs-4 d-block mb-2\"></i>Esperando movimientos en puerta...</td></tr>';
        }
      }
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    }

    // B) VISTA ACCESO: ESCÁNER QR REAL CON CÁMARA
  } else if (modulo === 'acceso') {
    vistaResumen.style.display = 'none';

    // Inyectamos el div <div id="lector-qr"> donde se dibujará la cámara
    contenedorDinamico.innerHTML = `
        <div class="row justify-content-center text-center mt-4">
            <div class="col-md-6">
                <div class="card bg-dark border-warning mb-4 shadow-lg" style="border-radius: 15px;">
                    <div class="card-body p-4">
                        <h4 class="text-white fw-bold mb-3"><i class="bi bi-camera-video text-warning"></i> Escáner de Acceso</h4>

                        <div id="lector-qr" style="width: 100%; border-radius: 10px; overflow: hidden; border: 2px solid #ffc107; background: #000;"></div>
                    </div>
                </div>

                <div id="alertaEscaner"></div>

                <div class="input-group mb-3 shadow-sm">
                    <span class="input-group-text bg-secondary border-secondary text-white"><i class="bi bi-keyboard"></i></span>
                    <input type="text" id="inputScanQR" class="form-control bg-black text-white border-secondary" placeholder="Ingreso Manual (Usuario / ID)...">
                    <button class="btn btn-warning fw-bold" type="button" onclick="registrarIngresoManual()">Validar</button>
                </div>
            </div>
        </div>
    `;

    // Encendemos la cámara apenas se inyecta el HTML en la pantalla
    iniciarEscanerQR();

    // C) OTROS MÓDULOS (En construcción temporalmente)
  } else {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = `
        <div class="text-center py-5 mt-5">
            <i class="bi bi-tools fs-1 text-secondary mb-3"></i>
            <h4 class="text-white fw-bold">Módulo de ${modulo.toUpperCase()}</h4>
            <p class="text-muted">Conectando con base de datos. Interfaz en construcción...</p>
        </div>
    `;
  }
}

// ==========================================
// FUNCIONES DEL ESCÁNER DE CÁMARA
// ==========================================

function iniciarEscanerQR() {
  if (escanerCamara) return; // Si ya está encendida, no hacemos nada

  // Configuramos el escáner visual (Requiere la librería html5-qrcode en el HTML)
  escanerCamara = new Html5QrcodeScanner(
    "lector-qr",
    { fps: 10, qrbox: {width: 250, height: 250} },
    /* verbose= */ false
  );

  // Renderizamos pidiendo permisos de cámara. Si detecta algo, llama a onScanSuccess
  escanerCamara.render(onScanSuccess, onScanFailure);
}

// Se ejecuta automáticamente cuando la cámara detecta un QR
async function onScanSuccess(codigoDecodificado) {
  console.log("QR Detectado:", codigoDecodificado);

  // 1. Pausamos la cámara para que no escanee el mismo código 50 veces seguidas
  if (escanerCamara) escanerCamara.pause(true);

  // 2. Enviamos el código leído al backend en Java
  await procesarAcceso(codigoDecodificado);

  // 3. Esperamos 3 segundos y volvemos a encender la cámara para el siguiente cliente
  setTimeout(() => {
    if (escanerCamara) escanerCamara.resume();
    document.getElementById('alertaEscaner').innerHTML = ''; // Limpiar mensaje anterior
  }, 3000);
}

function onScanFailure(error) {
  // Se dispara continuamente cuando la cámara no ve un QR.
  // Lo dejamos vacío para que no sature la consola de advertencias.
}

// ==========================================
// PROCESAMIENTO CON EL BACKEND (JAVA)
// ==========================================

// Para cuando el cliente no trae su QR y la recepcionista escribe el usuario a mano
async function registrarIngresoManual() {
  const input = document.getElementById('inputScanQR');
  const valor = input.value.trim();

  if(valor === "") {
    document.getElementById('alertaEscaner').innerHTML = '<div class="alert alert-danger bg-dark border-danger text-danger"><i class="bi bi-exclamation-circle"></i> Escribe un usuario primero.</div>';
    return;
  }

  await procesarAcceso(valor);
  input.value = ''; // Limpiar la caja después de validar
}

// Función principal que se comunica con RecepcionController.java
async function procesarAcceso(valorAEnviar) {
  const alertaDiv = document.getElementById('alertaEscaner');
  try {
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/recepcion/acceso?id=${valorAEnviar}`, { method: 'POST' });
    const data = await res.json();

    if(data.status === 'ok') {
      // Mostramos verde o amarillo dependiendo si entró o salió
      const colorClase = data.tipo === 'Entrada' ? 'success' : 'warning';
      alertaDiv.innerHTML = `<div class="alert alert-${colorClase} bg-dark border-${colorClase} text-${colorClase} fw-bold fs-5 shadow"><i class="bi bi-check-circle-fill"></i> ${data.mensaje}</div>`;
    } else {
      // Si hay error (inactivo o no existe)
      alertaDiv.innerHTML = `<div class="alert alert-danger bg-dark border-danger text-danger fw-bold fs-5 shadow"><i class="bi bi-x-octagon-fill"></i> Acceso Denegado: ${data.mensaje}</div>`;
    }
  } catch (e) {
    alertaDiv.innerHTML = '<div class="alert alert-danger bg-dark border-danger text-danger">Error de conexión con el servidor.</div>';
  }
}

// Inicializar el dashboard al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  cargarModulo('resumen');
});
