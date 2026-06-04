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

    try {
      const idEmpresa = localStorage.getItem('id_empresa') || 1;
      const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/recepcion/dashboard?idEmpresa=${idEmpresa}`);
      if(res.ok) {
        const data = await res.json();
        const kpiCaja = document.getElementById('kpi-caja');
        const kpiAforo = document.getElementById('kpi-aforo');
        if(kpiCaja) kpiCaja.innerText = '$' + parseFloat(data.kpis.cajaHoy || 0).toFixed(2);
        if(kpiAforo) kpiAforo.innerText = data.kpis.aforoHoy || 0;
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
  } else if (modulo === 'clientes' || modulo === 'entrenadores') {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div><p class="text-white mt-2">Cargando directorio...</p></div>';

    // Aquí puedes pegar después tu fetch original de clientes si lo tenías

    // ------------------------------------------
    // MÓDULO: PAGOS Y TRANSFERENCIAS (CONECTADO A BDD)
    // ------------------------------------------
  } else if (modulo === 'pagos') {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div><p class="text-white mt-2">Cargando pagos...</p></div>';

    try {
      const idEmpresa = localStorage.getItem('id_empresa') || 1;
      const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/recepcion/pagos-pendientes?idEmpresa=${idEmpresa}`);

      let filas = '';

      if (res.ok) {
        const pagos = await res.json();

        if(pagos.length === 0) {
          filas = '<tr><td colspan="7" class="text-center text-muted py-4">No hay comprobantes pendientes por revisar.</td></tr>';
        } else {
          filas = pagos.map(p => {
            let badgeEstado = '';
            let botonesAccion = '';

            if (p.estado === 'PENDIENTE') {
              badgeEstado = '<span class="badge bg-warning text-dark"><i class="bi bi-clock-history"></i> Pendiente</span>';
              botonesAccion = `
                  <button class="btn btn-sm btn-success me-1 shadow-sm" onclick="cambiarEstadoPago(${p.id_pago}, 'APROBADO', ${p.id_membresia})" title="Aceptar Pago"><i class="bi bi-check-lg fw-bold"></i></button>
                  <button class="btn btn-sm btn-danger shadow-sm" onclick="cambiarEstadoPago(${p.id_pago}, 'RECHAZADO', ${p.id_membresia})" title="Rechazar Pago"><i class="bi bi-x-lg fw-bold"></i></button>
                `;
            } else if (p.estado === 'APROBADO') {
              badgeEstado = '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Aceptado</span>';
              botonesAccion = `<span class="text-muted small"><i class="bi bi-check2-all"></i> Validado</span>`;
            } else {
              badgeEstado = '<span class="badge bg-danger"><i class="bi bi-x-circle"></i> Rechazado</span>';
              botonesAccion = `<span class="text-muted small"><i class="bi bi-check2-all"></i> Validado</span>`;
            }

            return `
                <tr class="fila-pago-recep" data-socio="${p.nombre_cliente}" data-monto="${p.monto_pagado}">
                  <td class="text-light fw-bold">#REC-${p.id_pago}</td>
                  <td class="text-white"><i class="bi bi-person-circle text-secondary me-2"></i>${p.nombre_cliente}</td>
                  <td class="text-warning">Membresía #${p.id_membresia}</td>
                  <td class="text-success fw-bold">+$${p.monto_pagado}</td>
                  <td>
                    <button class="btn btn-sm btn-outline-info fw-bold" onclick="abrirModalComprobante('${p.numero_referencia}', '${p.fecha_pago}', '${p.motivo}', '${p.foto_comprobante}')">
                      <i class="bi bi-eye"></i> Comprobante
                    </button>
                  </td>
                  <td>${badgeEstado}</td>
                  <td>${botonesAccion}</td>
                </tr>
              `;
          }).join('');
        }
      }

      contenedorDinamico.innerHTML = `
        <div class="card bg-dark border-secondary shadow-lg mb-4" style="border-radius: 15px;">
          <div class="card-body p-4">
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
              <div>
                <h4 class="text-white m-0 fw-bold"><i class="bi bi-cash-coin text-warning"></i> Validación de Transferencias</h4>
                <p class="text-muted small m-0">Revisa los comprobantes para auditar el historial o activar planes.</p>
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
                    <th class="py-3">N° RECIBO</th><th class="py-3">SOCIO</th><th class="py-3">PLAN</th>
                    <th class="py-3">IMPORTE</th><th class="py-3">DETALLES</th><th class="py-3">ESTADO</th><th class="py-3">ACCIÓN</th>
                  </tr>
                </thead>
                <tbody>${filas}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      contenedorDinamico.innerHTML = '<div class="alert alert-danger">Error al cargar los pagos.</div>';
    }

    // ------------------------------------------
    // MÓDULO: PEDIDOS DE TIENDA
    // ------------------------------------------
  } else if (modulo === 'pedidos') {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div><p class="text-white mt-2">Cargando módulo de pedidos...</p></div>';

  }



// ==========================================
// FUNCIONES VISUALES PARA COMPROBANTES Y PAGOS
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

async function cambiarEstadoPago(idPago, nuevoEstado, idMembresia) {
  const isAceptar = nuevoEstado === 'APROBADO';

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
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/recepcion/verificar-pago`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pagoId: idPago,
            estado: nuevoEstado,
            membresiaId: idMembresia
          })
        });

        if (res.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Estado Actualizado',
            text: `El pago ha sido ${nuevoEstado.toLowerCase()}.`,
            background: '#1e1e1e', color: '#ffffff', confirmButtonColor: '#ffc107'
          });
          cargarModulo('pagos');
        } else {
          throw new Error("Error procesando pago");
        }
      } catch(e) {
        Swal.fire({icon: 'error', title: 'Error', text: 'No se pudo actualizar el pago.', background: '#1e1e1e', color: '#ffffff'});
      }
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
}
