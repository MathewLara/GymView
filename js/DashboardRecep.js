// ==========================================
// ESCUDO DE SEGURIDAD Y AUTO-CIERRE
// ==========================================
const sesionSegura = localStorage.getItem('usuarioLogueado');
if (!sesionSegura || sesionSegura === 'null' || sesionSegura === 'undefined' || sesionSegura.trim() === '') {
  window.location.replace('index.html');
  throw new Error("Bloqueo activado: Sin sesión.");
}

const TIEMPO_EXPIRACION = 30 * 60 * 1000;

function verificarInactividad() {
  const loginTime = localStorage.getItem('loginTime');
  if (loginTime) {
    const tiempoTranscurrido = Date.now() - parseInt(loginTime);
    if (tiempoTranscurrido > TIEMPO_EXPIRACION) {
      localStorage.removeItem('usuarioLogueado');
      localStorage.removeItem('tokenGimnasio');
      localStorage.removeItem('loginTime');
      Swal.fire({
        icon: 'warning',
        title: 'Sesión Expirada',
        text: 'Por seguridad, debes iniciar sesión nuevamente tras 30 minutos de inactividad.',
        confirmButtonColor: '#ffc107',
        background: '#1e1e1e',
        color: '#ffffff'
      }).then(() => { window.location.replace('index.html'); });
    }
  }
}

function reiniciarTemporizador() {
  if (localStorage.getItem('usuarioLogueado')) {
    localStorage.setItem('loginTime', Date.now().toString());
  }
}

window.addEventListener('mousemove', reiniciarTemporizador);
window.addEventListener('click', reiniciarTemporizador);
window.addEventListener('keydown', reiniciarTemporizador);
window.addEventListener('scroll', reiniciarTemporizador);
setInterval(verificarInactividad, 6000);
verificarInactividad();

// ==========================================
// VARIABLES GLOBALES Y CÁMARA
// ==========================================
let escanerCamara = null;
let modalUsuarioInstance;
let modalComprobanteInstance;
let tomSelectSocioRecep = null;

document.addEventListener('DOMContentLoaded', () => {
  console.log("Dashboard de Recepción inicializado.");
  
  const mUsuario = document.getElementById('modalUsuario');
  if(mUsuario) modalUsuarioInstance = new bootstrap.Modal(mUsuario);

  const mComp = document.getElementById('modalVerComprobante');
  if(mComp) modalComprobanteInstance = new bootstrap.Modal(mComp);

  cargarModulo('resumen');

  // Funcionalidad de ver/ocultar contraseña en el modal de usuario
  const toggleRecepPass = document.getElementById('toggleRecepPass');
  const recepPassInput = document.getElementById('userPass');
  const toggleRecepIcon = document.getElementById('toggleRecepIcon');

  if (toggleRecepPass && recepPassInput && toggleRecepIcon) {
    toggleRecepPass.addEventListener('click', function () {
      const isPassword = recepPassInput.getAttribute('type') === 'password';
      recepPassInput.setAttribute('type', isPassword ? 'text' : 'password');
      if (isPassword) {
        toggleRecepIcon.classList.replace('bi-eye-slash-fill', 'bi-eye-fill');
        toggleRecepIcon.classList.add('text-warning');
      } else {
        toggleRecepIcon.classList.replace('bi-eye-fill', 'bi-eye-slash-fill');
        toggleRecepIcon.classList.remove('text-warning');
      }
    });
  }
});

function salir() {
  Swal.fire({
    icon: 'question',
    title: '¿Cerrar sesión?',
    text: '¿Seguro que deseas salir del sistema?',
    showCancelButton: true,
    confirmButtonText: 'Sí, salir',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#ffc107',
    background: '#1e1e1e',
    color: '#ffffff'
  }).then((result) => {
    if(result.isConfirmed) {
      localStorage.removeItem('tokenGimnasio');
      localStorage.removeItem('usuarioLogueado');
      window.location.href = 'index.html';
    }
  });
}

function cerrarSesion() {
  localStorage.removeItem('tokenGimnasio');
  localStorage.removeItem('usuarioLogueado');
  window.location.href = 'index.html';
}

function toggleMenu() {
  const sidebar = document.getElementById('sidebarRecep');
  const overlay = document.querySelector('.overlay');
  if (sidebar) sidebar.classList.toggle('mostrar');
  if (overlay) overlay.classList.toggle('mostrar');
}

function cargarModuloResponsive(modulo, elemento) {
  cargarModulo(modulo, elemento);
  if (window.innerWidth <= 767) {
    const sidebar = document.getElementById('sidebarRecep');
    const overlay = document.querySelector('.overlay');
    if (sidebar) sidebar.classList.remove('mostrar');
    if (overlay) overlay.classList.remove('mostrar');
  }
}

// ==========================================
// CONTROLADOR PRINCIPAL DE VISTAS (SPA)
// ==========================================
async function cargarModulo(modulo, elementoHTML) {
  const tituloMap = {
    'resumen': 'Recepción - Panel Operativo',
    'acceso': 'Control de Acceso (Escáner QR)',
    'clientes': 'Directorio de Socios',
    'pagos': 'Gestión de Transferencias y Caja',
    'pedidos': 'Entregas de Tienda Online',
    'entrenadores': 'Horarios de Entrenadores'
  };
  document.getElementById('page-title').innerText = tituloMap[modulo] || 'Recepción';

  if (elementoHTML) {
    document.querySelectorAll('#sidebarMenu .nav-link').forEach(link => link.classList.remove('active'));
    elementoHTML.classList.add('active');
  }

  const vistaResumen = document.getElementById('vista-resumen');
  const contenedorDinamico = document.getElementById('vista-dinamica-contenedor');

  if (escanerCamara && modulo !== 'acceso') {
    try { await escanerCamara.clear(); escanerCamara = null; }
    catch (error) { console.error("Error apagando cámara:", error); }
  }

  // ------------------------------------------
  // MÓDULO: RESUMEN
  // ------------------------------------------
  if (modulo === 'resumen') {
    vistaResumen.style.display = 'block';
    contenedorDinamico.innerHTML = '';
    // Lógica de carga del resumen omitida por brevedad (ya la tenías bien)
    try {
      const idEmpresa = localStorage.getItem('id_empresa') || 1;
      const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/recepcion/dashboard?idEmpresa=${idEmpresa}`);
      if(res.ok) {
        const data = await res.json();
        const kpiCaja = document.getElementById('kpi-caja');
        const kpiAforo = document.getElementById('kpi-aforo');
        if(kpiCaja) kpiCaja.innerText = '$' + parseFloat(data.kpis.cajaHoy || 0).toFixed(2);
        if(kpiAforo) kpiAforo.innerText = data.kpis.aforoHoy || 0;
        // Inyección de actividad reciente...
      }
    } catch(e) {}

  // ------------------------------------------
  // MÓDULO: ACCESO
  // ------------------------------------------
  } else if (modulo === 'acceso') {
    vistaResumen.style.display = 'none';
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
    iniciarEscanerQR();

  // ------------------------------------------
  // MÓDULO: CLIENTES Y ENTRENADORES
  // ------------------------------------------
  } else if (['clientes', 'entrenadores'].includes(modulo)) {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div></div>';
    // Lógica omitida para mantener el enfoque, aquí va tu fetch de usuarios normal...
    
  // ------------------------------------------
  // MÓDULO: PAGOS Y TRANSFERENCIAS (CORREGIDO)
  // ------------------------------------------
  } else if (modulo === 'pagos') {
    vistaResumen.style.display = 'none';
    
    // Datos de prueba (MOCK) para que veas el diseño. Tu compañero conectará esto al backend después.
    const transferenciasMock = [
      { id: 1042, socio: 'Micaela', plan: 'Plan VIP Mensual', monto: '50.00', fecha: '2026-06-01', comprobante: '123456789', motivo: 'Pago Junio VIP', estado: 'Pendiente', img: 'img/deuna-qr.png' },
      { id: 1043, socio: 'Alan1', plan: 'Plan Mensual Estándar', monto: '30.00', fecha: '2026-06-02', comprobante: '987654321', motivo: 'Suscripción Normal', estado: 'Aceptado', img: 'img/deuna-qr.png' },
      { id: 1044, socio: 'Elvis1', plan: 'Plan VIP Mensual', monto: '50.00', fecha: '2026-06-03', comprobante: '000111222', motivo: 'Pago atrasado', estado: 'Rechazado', img: 'img/deuna-qr.png' }
    ];

    let filas = transferenciasMock.map(p => {
      let badgeEstado = '';
      let botonesAccion = '';
      
      // Control visual del estado
      if (p.estado === 'Pendiente') {
        badgeEstado = '<span class="badge bg-warning text-dark"><i class="bi bi-clock-history"></i> Pendiente</span>';
        botonesAccion = `
          <button class="btn btn-sm btn-success me-1 shadow-sm" onclick="cambiarEstadoPago(${p.id}, 'Aceptado')" title="Aceptar Pago"><i class="bi bi-check-lg fw-bold"></i></button>
          <button class="btn btn-sm btn-danger shadow-sm" onclick="cambiarEstadoPago(${p.id}, 'Rechazado')" title="Rechazar Pago"><i class="bi bi-x-lg fw-bold"></i></button>
        `;
      } else if (p.estado === 'Aceptado') {
        badgeEstado = '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Aceptado</span>';
        botonesAccion = `<span class="text-muted small"><i class="bi bi-check2-all"></i> Validado</span>`;
      } else {
        badgeEstado = '<span class="badge bg-danger"><i class="bi bi-x-circle"></i> Rechazado</span>';
        botonesAccion = `<span class="text-muted small"><i class="bi bi-check2-all"></i> Validado</span>`;
      }

      return `
        <tr class="fila-pago-recep" data-socio="${p.socio}" data-monto="${p.monto}">
          <td class="text-light fw-bold">#REC-${p.id}</td>
          <td class="text-white"><i class="bi bi-person-circle text-secondary me-2"></i>${p.socio}</td>
          <td class="text-warning">${p.plan}</td>
          <td class="text-success fw-bold">+$${p.monto}</td>
          <td>
            <button class="btn btn-sm btn-outline-info fw-bold" onclick="abrirModalComprobante('${p.comprobante}', '${p.fecha}', '${p.motivo}', '${p.img}')">
              <i class="bi bi-eye"></i> Comprobante
            </button>
          </td>
          <td>${badgeEstado}</td>
          <td>${botonesAccion}</td>
        </tr>
      `;
    }).join('');

    contenedorDinamico.innerHTML = `
      <div class="card bg-dark border-secondary shadow-lg mb-4" style="border-radius: 15px;">
        <div class="card-body p-4">
          <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
              <h4 class="text-white m-0 fw-bold"><i class="bi bi-cash-coin text-warning"></i> Validación de Transferencias</h4>
              <p class="text-muted small m-0">Revisa los comprobantes subidos por los clientes para activar su plan.</p>
            </div>
            <div class="d-flex gap-2 align-items-center flex-wrap">
              <div class="input-group" style="width: 250px;">
                <span class="input-group-text bg-black border-secondary text-warning"><i class="bi bi-search"></i></span>
                <input type="text" id="buscador-pagos-recep" class="form-control bg-black text-white border-secondary" placeholder="Buscar socio..." onkeyup="filtrarPagosRecep()">
              </div>
              <button class="btn btn-outline-info fw-bold text-nowrap" onclick="exportarPagosRecepCSV()"><i class="bi bi-file-earmark-excel"></i> Exportar</button>
            </div>
          </div>

          <div class="table-responsive">
            <table id="tabla-pagos-recep" class="table table-dark table-hover align-middle mb-0">
              <thead class="bg-black text-warning">
                <tr>
                  <th class="py-3">N° RECIBO</th>
                  <th class="py-3">SOCIO</th>
                  <th class="py-3">PLAN</th>
                  <th class="py-3">IMPORTE</th>
                  <th class="py-3">DETALLES</th>
                  <th class="py-3">ESTADO</th>
                  <th class="py-3">ACCIÓN</th>
                </tr>
              </thead>
              <tbody>${filas}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;

  // ------------------------------------------
  // MÓDULO: PEDIDOS DE TIENDA
  // ------------------------------------------
  } else if (modulo === 'pedidos') {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div></div>';
    // Lógica omitida para enfocarnos en los pagos...
  }
}

// ==========================================
// FUNCIONES VISUALES PARA COMPROBANTES (NUEVO)
// ==========================================

function abrirModalComprobante(numero, fecha, motivo, imgSrc) {
  document.getElementById('detalleNumero').value = numero;
  document.getElementById('detalleFecha').value = fecha;
  document.getElementById('detalleMotivo').value = motivo;
  
  const imgEl = document.getElementById('detalleImagen');
  if (imgSrc && imgSrc !== 'undefined' && imgSrc !== 'null') {
    imgEl.src = imgSrc;
    imgEl.style.display = 'block';
  } else {
    imgEl.style.display = 'none';
  }

  if(modalComprobanteInstance) modalComprobanteInstance.show();
}

function cambiarEstadoPago(idPago, nuevoEstado) {
  const isAceptar = nuevoEstado === 'Aceptado';
  
  Swal.fire({
    title: `¿${nuevoEstado} este pago?`,
    text: isAceptar ? 'El plan del cliente se activará inmediatamente en el sistema.' : 'El pago será marcado como inválido y el cliente seguirá bloqueado.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: isAceptar ? '#198754' : '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: `Sí, ${nuevoEstado.toLowerCase()}`,
    cancelButtonText: 'Cancelar',
    background: '#1e1e1e',
    color: '#ffffff'
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({
        icon: 'success',
        title: 'Estado Actualizado',
        text: `El pago ha sido ${nuevoEstado.toLowerCase()}.`,
        background: '#1e1e1e',
        color: '#ffffff',
        confirmButtonColor: '#ffc107'
      });
      // Tu compañero hará el fetch(PUT) aquí y luego llamará a cargarModulo('pagos')
    }
  });
}

// ==========================================
// FUNCIONES DE BÚSQUEDA Y EXPORTACIÓN
// ==========================================
function filtrarPagosRecep() {
  const inputBuscador = document.getElementById('buscador-pagos-recep');
  const buscadorTexto = inputBuscador ? inputBuscador.value.toLowerCase().trim() : '';
  const filas = document.querySelectorAll('.fila-pago-recep');

  filas.forEach(fila => {
    const socioFila = (fila.getAttribute('data-socio') || '').toLowerCase();
    const reciboFila = fila.cells[0].innerText.toLowerCase();
    if (buscadorTexto === '' || socioFila.includes(buscadorTexto) || reciboFila.includes(buscadorTexto)) {
      fila.style.display = '';
    } else {
      fila.style.display = 'none';
    }
  });
}

function exportarPagosRecepCSV() {
  Swal.fire({icon:'info', title:'Exportando...', background: '#1e1e1e', color: '#ffffff', timer:1500, showConfirmButton:false});
}

// ==========================================
// FUNCIONES DE CÁMARA QR (MOCK)
// ==========================================
function iniciarEscanerQR() { console.log("Cámara iniciada"); }
function registrarIngresoManual() { console.log("Ingreso manual"); }