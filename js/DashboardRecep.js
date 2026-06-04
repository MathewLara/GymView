// ==========================================
// MOSTRAR / OCULTAR CONTRASEÑA (MODAL RECEPCIÓN)
// ==========================================
const toggleRecepPass = document.getElementById('toggleRecepPass');
const recepPassInput = document.getElementById('userPass');
const toggleRecepIcon = document.getElementById('toggleRecepIcon');

if (toggleRecepPass && recepPassInput && toggleRecepIcon) {
  toggleRecepPass.addEventListener('click', function () {
    const isPassword = recepPassInput.getAttribute('type') === 'password';
    recepPassInput.setAttribute('type', isPassword ? 'text' : 'password');

    if (isPassword) {
      toggleRecepIcon.classList.remove('bi-eye-slash-fill');
      toggleRecepIcon.classList.add('bi-eye-fill');
      toggleRecepIcon.classList.add('text-warning'); // Se resalta en amarillo al ver
    } else {
      toggleRecepIcon.classList.remove('bi-eye-fill', 'text-warning');
      toggleRecepIcon.classList.add('bi-eye-slash-fill'); // Vuelve a su color normal
    }
  });
}

let escanerCamara = null;
let modalUsuarioInstance;
let tomSelectSocioRecep = null; // Variable para la barra de búsqueda del modal de pagos

// ==========================================
// ESCUDO DE SEGURIDAD: BLOQUEO DE URL DIRECTA
// ==========================================
if (!localStorage.getItem('usuarioLogueado')) {
  window.location.replace('index.html');
}

// ==========================================
// CONTROL DE SEGURIDAD BLINDADO: INACTIVIDAD
// ==========================================
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
      }).then(() => {
        cerrarSesion();
      });
      window.location.replace('index.html');
    }
  }
}

function salir() {
  Swal.fire({
    icon: 'question',
    title: '¿Cerrar sesión?',
    text: '¿Seguro que deseas salir del sistema?',
    showCancelButton: true,
    confirmButtonText: 'Sí, salir',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#ffc107',
    cancelButtonColor: '#6c757d',
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

function reiniciarTemporizador() {
  // Solo si el usuario está logueado actualizamos su hora
  if (localStorage.getItem('usuarioLogueado')) {
    localStorage.setItem('loginTime', Date.now().toString());
  }
}

// Escuchamos cualquier movimiento para reiniciar el tiempo
window.addEventListener('mousemove', reiniciarTemporizador);
window.addEventListener('click', reiniciarTemporizador);
window.addEventListener('keydown', reiniciarTemporizador);
window.addEventListener('scroll', reiniciarTemporizador);
// Revisamos cada 6 segundos
setInterval(verificarInactividad, 6000);
verificarInactividad();

// ==========================================
// FUNCIÓN PARA CERRAR SESIÓN
// ==========================================
function cerrarSesion() {
  localStorage.removeItem('tokenGimnasio');
  localStorage.removeItem('usuarioLogueado');
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
    'pedidos': 'Entregas de Tienda Online',
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

  if (escanerCamara && modulo !== 'acceso') {
    try { await escanerCamara.clear(); escanerCamara = null; }
    catch (error) { console.error("Error apagando la cámara:", error); }
  }

  // ==========================================
  // 1. VISTA RESUMEN (DASHBOARD)
  // ==========================================
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

        const tbody = document.getElementById('tabla-actividad');
        if (tbody && data.actividadReciente && data.actividadReciente.length > 0) {
          tbody.innerHTML = data.actividadReciente.map(act => {
            const badgeColor = act.tipo === 'Entrada' ? 'bg-success' : 'bg-warning text-dark';
            const icono = act.tipo === 'Entrada' ? '<i class="bi bi-box-arrow-in-right text-success"></i>' : '<i class="bi bi-box-arrow-right text-warning"></i>';

            return `
                <tr>
                  <td class="text-white fw-bold">${act.hora}</td>
                  <td>${icono} ${act.tipo}</td>
                  <td class="text-white fw-bold">${act.cliente}</td>
                  <td class="text-muted">Gimnasio</td>
                  <td><span class="badge ${badgeColor}">Completado</span></td>
                </tr>`;
          }).join('');
        } else if (tbody) {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted"><i class="bi bi-clock-history fs-4 d-block mb-2"></i>Esperando movimientos en puerta...</td></tr>';
        }
      }
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    }

    // ==========================================
    // 2. VISTA ACCESO (ESCÁNER)
    // ==========================================
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

    // ==========================================
    // 3. VISTA DE CLIENTES Y ENTRENADORES
    // ==========================================
  } else if (['clientes', 'entrenadores'].includes(modulo)) {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div><p class="text-white mt-2">Cargando directorio...</p></div>';

    try {
      const idEmpresa = localStorage.getItem('id_empresa') || 1;
      const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios?idEmpresa=${idEmpresa}`);

      if (res.ok) {
        const todosLosUsuarios = await res.json();
        let usuariosFiltrados = [];
        let tituloTabla = "";

        if (modulo === 'clientes') {
          usuariosFiltrados = todosLosUsuarios.filter(u => u.rol === 'Cliente');
          tituloTabla = "Directorio de Clientes / Socios";
        } else if (modulo === 'entrenadores') {
          usuariosFiltrados = todosLosUsuarios.filter(u => u.rol === 'Entrenador');
          tituloTabla = "Directorio de Entrenadores";
        }

        let filas = usuariosFiltrados.map(u => {
          const txtEmail = (u.email && u.email !== 'null' && u.email !== '') ? u.email : '<span class="text-muted">N/A</span>';
          const txtTelefono = (u.telefono && u.telefono !== 'null' && u.telefono !== '') ? u.telefono : '<span class="text-muted">N/A</span>';

          return `
          <tr>
            <td class="text-light fw-bold">#${u.id}</td>
            <td class="text-white"><i class="bi bi-person-circle text-secondary me-2"></i>${u.nombre} ${u.apellido}</td>
            <td class="text-info small">${txtEmail}</td>
            <td class="text-warning small">${txtTelefono}</td>
            <td>${u.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-danger">Inactivo</span>'}</td>
            <td>
              <button class="btn btn-sm btn-outline-info" onclick="abrirModalEditar(${u.id}, '${u.usuario}', '${u.nombre}', '${u.apellido}', '${u.rol}', '${u.email || ''}', '${u.telefono || ''}')"><i class="bi bi-pencil"></i> Editar</button>
            </td>
          </tr>
        `}).join('');

        if (filas === '') filas = `<tr><td colspan="6" class="text-center py-4 text-white">No hay registros.</td></tr>`;

        contenedorDinamico.innerHTML = `
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
            <h4 class="text-white m-0">${tituloTabla}</h4>
            <div class="d-flex gap-2 w-100" style="max-width: 450px;">
              <div class="input-group">
                <span class="input-group-text bg-dark border-secondary text-warning"><i class="bi bi-search"></i></span>
                <input type="text" class="form-control bg-dark text-white border-secondary" placeholder="Buscar por nombre o correo..." onkeyup="filtrarTablaGenerica('tabla-usuarios-recep', this.value, [1, 2])">
              </div>
              <button class="btn btn-warning fw-bold text-nowrap" onclick="abrirModalNuevo()"><i class="bi bi-plus-lg"></i> Agregar</button>
            </div>
          </div>
          <div class="card bg-dark border-secondary shadow-sm" style="border-radius: 10px; overflow: hidden;">
            <div class="table-responsive">
              <table id="tabla-usuarios-recep" class="table table-dark table-hover mb-0 align-middle">
                <thead class="text-white border-secondary">
                  <tr>
                    <th>ID</th>
                    <th>NOMBRE COMPLETO</th>
                    <th>CORREO</th>
                    <th>TELÉFONO</th>
                    <th>ESTADO</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>${filas}</tbody>
              </table>
            </div>
          </div>
        `;
      }
    } catch (e) {
      contenedorDinamico.innerHTML = '<h5 class="text-danger mt-4 text-center">Error al cargar la base de datos.</h5>';
    }

    // ==========================================
    // 4. VISTA DE PAGOS (AHORA CON COMPROBANTES Y TRANSFERENCIAS)
    // ==========================================
  } else if (modulo === 'pagos') {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div><p class="text-white mt-2">Cargando historial de caja y transferencias...</p></div>';

    try {
      const idEmpresa = localStorage.getItem('id_empresa') || 1;
      // Usamos el endpoint actualizado de comprobantes
      const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/recepcion/pagos-pendientes?idEmpresa=${idEmpresa}`);

      if (res.ok) {
        const pagos = await res.json();
        const sociosUnicos = [...new Set(pagos.map(p => p.nombre_cliente || 'Socio'))].sort();
        const opcionesSocios = sociosUnicos.map(s => `<option value="${s}">${s}</option>`).join('');

        let filas = '';

        if(pagos.length === 0) {
          filas = '<tr><td colspan="7" class="text-center text-muted py-4">No hay comprobantes pendientes por revisar.</td></tr>';
        } else {
          filas = pagos.map(p => {
            let badgeEstado = '';
            let botonesAccion = '';

            // Lógica para botones según el estado del pago
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
                  <td class="text-warning">Plan #${p.id_membresia}</td>
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

        contenedorDinamico.innerHTML = `
          <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <h4 class="text-white m-0">Validación de Transferencias y Caja</h4>
            <div class="d-flex gap-2 align-items-center flex-wrap">
              <div class="input-group" style="width: 250px;">
                <span class="input-group-text bg-black border-secondary text-warning"><i class="bi bi-search"></i></span>
                <input type="text" id="buscador-pagos-recep" class="form-control bg-black text-white border-secondary" placeholder="Buscar socio..." onkeyup="filtrarPagosRecep()">
              </div>
              <select id="filtroClienteRecep" class="form-select bg-black text-white border-secondary" style="width: auto;" onchange="filtrarPagosRecep()">
                  <option value="TODOS">Todos los clientes</option>
                  ${opcionesSocios}
              </select>
              <button class="btn btn-success fw-bold text-nowrap" onclick="abrirModalPago()"><i class="bi bi-cash-coin"></i> Nuevo Pago</button>
              <button class="btn btn-outline-info fw-bold text-nowrap" onclick="exportarPagosRecepCSV()"><i class="bi bi-file-earmark-excel"></i> Exportar</button>
            </div>
          </div>
          <div class="card bg-dark border-secondary shadow-sm" style="border-radius: 10px; overflow: hidden;">
            <div class="table-responsive">
              <table id="tabla-pagos-recep" class="table table-dark table-hover mb-0 align-middle">
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
                <tfoot id="tfoot-resumen-recep" class="bg-black">
                 <tr>
                      <td colspan="3" class="text-end fw-bold py-3">TOTAL RECAUDADO:</td>
                      <td id="total-monto-recep" class="text-success fw-bold fs-5 py-3">$0.00</td>
                      <td colspan="3"></td>
                 </tr>
                </tfoot>
              </table>
            </div>
          </div>
        `;
        filtrarPagosRecep(); // Llama a la suma inicial
      }
    } catch (e) {
      contenedorDinamico.innerHTML = '<h5 class="text-danger mt-4 text-center">Error al conectar con la base de datos de pagos.</h5>';
    }

    // ==========================================
    // 5. MÓDULO DE PEDIDOS DE TIENDA
    // ==========================================
  } else if (modulo === 'pedidos') {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div><p class="text-white mt-2">Buscando entregas pendientes...</p></div>';

    try {
      const idEmpresa = localStorage.getItem('id_empresa') || 1;
      const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/ventas/pendientes?idEmpresa=${idEmpresa}`);

      if (res.ok) {
        const pedidos = await res.json();
        let filas = pedidos.map(p => {
          const nombreReal = p.nombreCliente ? p.nombreCliente : 'Cliente Desconocido';
          const esEntregado = p.estadoEntrega === 'ENTREGADO';
          const badgeEstado = esEntregado
            ? '<span class="badge bg-success text-white"><i class="bi bi-check-all"></i> ENTREGADO</span>'
            : '<span class="badge bg-warning text-dark"><i class="bi bi-clock-history"></i> PENDIENTE</span>';

          const botonEntregar = esEntregado
            ? '<button class="btn btn-sm btn-secondary fw-bold" disabled><i class="bi bi-check2"></i> Listo</button>'
            : `<button class="btn btn-sm btn-success fw-bold" onclick="marcarComoEntregado(${p.idFactura})"><i class="bi bi-box-seam"></i> Entregar</button>`;

          const botonImprimir = `<button class="btn btn-sm btn-info fw-bold text-white ms-1" onclick="imprimirFactura(${p.idFactura}, '${nombreReal}', '${p.numeroFactura}', '${p.fechaEmision}', ${p.totalPagado})"><i class="bi bi-printer"></i> Imprimir</button>`;
          const botonesFila = `<div class="d-flex flex-nowrap">${botonEntregar}${botonImprimir}</div>`;

          return `
            <tr>
              <td class="text-light fw-bold">#${p.idFactura}</td>
              <td class="text-warning fw-bold"><i class="bi bi-person-badge"></i> ${nombreReal}</td>
              <td class="text-white">${p.numeroFactura}</td>
              <td class="text-white small">${p.fechaEmision}</td>
              <td class="text-success fw-bold">$${parseFloat(p.totalPagado).toFixed(2)}</td>
              <td>${badgeEstado}</td>
              <td>${botonesFila}</td>
            </tr>
          `;
        }).join('');

        if (filas === '') {
          filas = `<tr><td colspan="7" class="text-center py-5 text-muted"><i class="bi bi-check2-circle fs-1 d-block mb-3"></i>No hay pedidos pendientes por entregar.</td></tr>`;
        }

        contenedorDinamico.innerHTML = `
          <div class="card bg-dark border-secondary shadow-lg mb-4" style="border-radius: 15px;">
            <div class="card-body p-4">
              <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                  <h4 class="text-white m-0 fw-bold"><i class="bi bi-cart-check text-warning"></i> Entregas de Tienda</h4>
                  <p class="text-muted small m-0">Aquí aparecen los productos pagados en línea listos para retirar</p>
                </div>
                <div class="input-group" style="max-width: 350px;">
                  <span class="input-group-text bg-black border-secondary text-warning"><i class="bi bi-search"></i></span>
                  <input type="text" class="form-control bg-black text-white border-secondary" placeholder="Buscar cliente o factura..." onkeyup="filtrarTablaGenerica('tabla-pedidos-recep', this.value, [1, 2])">
                </div>
              </div>
              <div class="table-responsive">
                <table id="tabla-pedidos-recep" class="table table-dark table-hover align-middle mb-0">
                  <thead class="bg-black text-warning">
                    <tr>
                      <th class="py-3">ID BASE</th><th class="py-3">CLIENTE</th><th class="py-3">N° FACTURA</th><th class="py-3">FECHA COMPRA</th><th class="py-3">TOTAL</th><th class="py-3">ESTADO</th><th class="py-3">ACCIÓN</th>
                    </tr>
                  </thead>
                  <tbody>${filas}</tbody>
                </table>
              </div>
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error(error);
      contenedorDinamico.innerHTML = '<div class="alert alert-danger mt-4 text-center border-danger bg-dark text-danger">Error al conectar con la base de datos de ventas.</div>';
    }
  }
}

// ==========================================
// FUNCIONES DE CÁMARA QR
// ==========================================
function iniciarEscanerQR() {
  if (escanerCamara) return;
  escanerCamara = new Html5QrcodeScanner("lector-qr", { fps: 10, qrbox: {width: 250, height: 250} }, false);
  escanerCamara.render(onScanSuccess, onScanFailure);
}

async function onScanSuccess(codigoDecodificado) {
  if (escanerCamara) escanerCamara.pause(true);
  await procesarAcceso(codigoDecodificado);
  setTimeout(() => {
    if (escanerCamara) escanerCamara.resume();
    document.getElementById('alertaEscaner').innerHTML = '';
  }, 3000);
}

function onScanFailure(error) {}

async function registrarIngresoManual() {
  const input = document.getElementById('inputScanQR');
  const valor = input.value.trim();
  if(valor === "") {
    document.getElementById('alertaEscaner').innerHTML = '<div class="alert alert-danger bg-dark border-danger text-danger"><i class="bi bi-exclamation-circle"></i> Escribe un usuario.</div>';
    return;
  }
  await procesarAcceso(valor);
  input.value = '';
}

async function procesarAcceso(valorAEnviar) {
  const alertaDiv = document.getElementById('alertaEscaner');
  try {
    const idEmpresa = localStorage.getItem('id_empresa') || 1;
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/recepcion/acceso?id=${valorAEnviar}&idEmpresa=${idEmpresa}`, { method: 'POST' });
    const data = await res.json();
    if(data.status === 'ok') {
      const colorClase = data.tipo === 'Entrada' ? 'success' : 'warning';
      alertaDiv.innerHTML = `<div class="alert alert-${colorClase} bg-dark border-${colorClase} text-${colorClase} fw-bold fs-5 shadow"><i class="bi bi-check-circle-fill"></i> ${data.mensaje}</div>`;
    } else {
      alertaDiv.innerHTML = `<div class="alert alert-danger bg-dark border-danger text-danger fw-bold fs-5 shadow"><i class="bi bi-x-octagon-fill"></i> Acceso Denegado: ${data.mensaje}</div>`;
    }
  } catch (e) {
    alertaDiv.innerHTML = '<div class="alert alert-danger bg-dark border-danger text-danger">Error de conexión con el servidor.</div>';
  }
}

// ==========================================
// FUNCIONES DEL MODAL DE USUARIOS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  cargarModulo('resumen');
  modalUsuarioInstance = new bootstrap.Modal(document.getElementById('modalUsuario'));
});

function abrirModalNuevo() {
  document.getElementById('formUsuario').reset();
  document.getElementById('userId').value = '';
  document.getElementById('modalTitulo').innerText = 'Nuevo Usuario (Recepción)';
  document.getElementById('passHint').innerText = '(Obligatoria)';
  modalUsuarioInstance.show();
}

function abrirModalEditar(id, usuario, nombre, apellido, rolTexto, email, telefono) {
  document.getElementById('formUsuario').reset();
  document.getElementById('userId').value = id;
  document.getElementById('userUsername').value = usuario;
  document.getElementById('userNombre').value = nombre !== 'null' ? nombre : '';
  document.getElementById('userApellido').value = apellido !== 'null' ? apellido : '';
  document.getElementById('userEmail').value = (email !== 'null' && email !== 'undefined') ? email : '';
  document.getElementById('userTelefono').value = (telefono !== 'null' && telefono !== 'undefined') ? telefono : '';
  const rolesMap = { 'Entrenador': 3, 'Cliente': 4 };
  document.getElementById('userRol').value = rolesMap[rolTexto] || 4;
  document.getElementById('modalTitulo').innerText = 'Editar Perfil #' + id;
  document.getElementById('passHint').innerText = '(En blanco para no cambiar)';
  modalUsuarioInstance.show();
}

async function guardarUsuario() {
  const id = document.getElementById('userId').value;
  const isEdit = id !== '';
  const uData = {
    nombre: document.getElementById('userNombre').value,
    apellido: document.getElementById('userApellido').value,
    usuario: document.getElementById('userUsername').value,
    idRol: parseInt(document.getElementById('userRol').value),
    contrasena: document.getElementById('userPass').value,
    email: document.getElementById('userEmail').value,
    telefono: document.getElementById('userTelefono').value,
    idEmpresa: parseInt(localStorage.getItem('id_empresa') || 1)
  };

  if (!isEdit && uData.contrasena.length < 5) {
    Swal.fire({ icon: 'warning', title: 'Atención', text: 'La contraseña es obligatoria (mín 5 caracteres).', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
    return;
  }

  const url = isEdit ? `https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios/${id}` : `https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios`;
  const metodo = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(uData) });
    if (res.ok) {
      modalUsuarioInstance.hide();
      const moduloActivo = document.querySelector('#sidebarMenu .nav-link.active').innerText.trim().toLowerCase();
      Swal.fire({ icon: 'success', title: '¡Éxito!', text: 'Operación realizada correctamente.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' })
        .then(() => {
          if(moduloActivo.includes('cliente') || moduloActivo.includes('socio')) cargarModulo('clientes');
          else if(moduloActivo.includes('entrenador')) cargarModulo('entrenadores');
          else cargarModulo('resumen');
        });
    } else {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Verifique que el usuario o correo no estén repetidos.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
    }
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Error', text: 'Error conectando al servidor.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
  }
}

// ==========================================
// FUNCIONES DE PAGOS (MANUALES Y CONFIRMACIÓN DE TRANSFERENCIAS)
// ==========================================
async function abrirModalPago() {
  const selectSocio = document.getElementById('pagoSocio');
  if (tomSelectSocioRecep) {
    tomSelectSocioRecep.destroy();
    tomSelectSocioRecep = null;
  }
  selectSocio.innerHTML = '<option value="" disabled selected>Cargando socios...</option>';
  const modalPagoInstance = new bootstrap.Modal(document.getElementById('modalPago'));
  document.getElementById('formPago').reset();
  modalPagoInstance.show();

  try {
    const idEmpresa = localStorage.getItem('id_empresa') || 1;
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios?idEmpresa=${idEmpresa}`);

    if(res.ok) {
      const usuarios = await res.json();
      const clientes = usuarios.filter(u => u.rol === 'Cliente' && u.activo === true);
      if(clientes.length > 0) {
        selectSocio.innerHTML = '<option value="">🔍 Buscar socio por nombre...</option>';
        clientes.forEach(c => {
          selectSocio.innerHTML += `<option value="${c.id}">${c.nombre} ${c.apellido} (@${c.usuario})</option>`;
        });
        tomSelectSocioRecep = new TomSelect("#pagoSocio", {
          create: false,
          sortField: { field: "text", direction: "asc" },
          placeholder: "🔍 Escriba el nombre o usuario..."
        });
      } else {
        selectSocio.innerHTML = '<option value="" disabled selected>No hay socios activos</option>';
      }
    }
  } catch(e) {
    selectSocio.innerHTML = '<option value="" disabled selected>Error de red al cargar socios</option>';
  }
}

async function procesarPago() {
  const socio = document.getElementById('pagoSocio').value;
  const plan = document.getElementById('pagoPlan').value;
  const metodo = document.getElementById('pagoMetodo').value;
  if(!socio) {
    Swal.fire({ icon: 'warning', title: 'Selección requerida', text: 'Por favor, selecciona un socio válido.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
    return;
  }

  const precios = { "1": 5.00, "2": 30.00, "3": 50.00, "4": 300.00 };
  const montoCalculado = precios[plan];

  try {
    const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/recepcion/pagos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idCliente: parseInt(socio),
        idPlan: parseInt(plan),
        monto: montoCalculado,
        metodo: metodo,
        idEmpresa: parseInt(localStorage.getItem('id_empresa') || 1)
      })
    });

    const data = await res.json();
    if(res.ok && data.status === 'ok') {
      Swal.fire({ icon: 'success', title: '¡Pago procesado!', text: `Monto cobrado: $${montoCalculado.toFixed(2)}`, confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' })
        .then(() => {
          const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalPago'));
          if(modalInstance) modalInstance.hide();
          const moduloActivo = document.querySelector('#sidebarMenu .nav-link.active').innerText.trim().toLowerCase();
          moduloActivo.includes('pago') ? cargarModulo('pagos') : cargarModulo('resumen');
        });
    } else {
      Swal.fire({ icon: 'error', title: 'Error', text: data.mensaje, confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
    }
  } catch(e) { Swal.fire({ icon: 'error', title: 'Error', text: 'Error de conexión con el servidor.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' }); }
}

// ------------------------------------------
// NUEVO: FUNCIONES VISUALES PARA COMPROBANTES Y ESTADOS
// ------------------------------------------
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

  const mComp = document.getElementById('modalVerComprobante');
  if(mComp) {
    const modalComprobanteInstance = new bootstrap.Modal(mComp);
    modalComprobanteInstance.show();
  }
}

async function cambiarEstadoPago(idPago, nuevoEstado, idMembresia) {
  const isAceptar = nuevoEstado === 'APROBADO';

  Swal.fire({
    title: `¿${nuevoEstado} este pago?`,
    text: isAceptar ? 'El plan del cliente se activará inmediatamente en el sistema.' : 'El pago será marcado como inválido.',
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
// FUNCIONES PARA ENTREGAR E IMPRIMIR PEDIDOS
// ==========================================
async function marcarComoEntregado(idFactura) {
  Swal.fire({
    icon: 'question',
    title: '¿Confirmar entrega?',
    text: '¿Ya entregaste físicamente los productos al cliente?',
    showCancelButton: true,
    confirmButtonText: 'Sí, entregar',
    confirmButtonColor: '#198754',
    background: '#1e1e1e',
    color: '#ffffff'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/ventas/${idFactura}/entregar`, { method: 'PUT' });

        if (res.ok) {
          Swal.fire({ icon: 'success', title: 'Entregado', text: 'Producto marcado como entregado.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' })
            .then(() => cargarModulo('pedidos'));
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: 'Hubo un error al actualizar.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
        }
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Error de conexión con el servidor.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
      }
    }
  });
}

async function imprimirFactura(idFactura, cliente, numero, fecha, total) {
  try {
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/ventas/${idFactura}/detalles`);
    if (!res.ok) throw new Error("Error al traer detalles");
    const detalles = await res.json();
    let filasProductos = detalles.map(d => `
      <tr>
        <td>${d.descripcion}</td>
        <td style="text-align: center;">${d.cantidad}</td>
        <td style="text-align: right;">$${d.precioUnitario.toFixed(2)}</td>
        <td style="text-align: right;">$${d.subtotalLinea.toFixed(2)}</td>
      </tr>
    `).join('');

    let htmlTicket = `
      <html>
      <head>
        <title>Factura ${numero}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; padding: 20px; max-width: 400px; margin: 0 auto; color: #000; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
          .header h2 { margin: 0; font-size: 22px; font-weight: bold; }
          .info p { margin: 4px 0; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
          th { border-bottom: 1px solid #000; padding-bottom: 5px; text-align: left; }
          td { padding: 5px 0; }
          .total-box { border-top: 2px dashed #000; margin-top: 15px; padding-top: 10px; text-align: right; font-size: 18px; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #555; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>IRON FITNESS</h2>
          <p>Comprobante de Tienda Web</p>
        </div>
        <div class="info">
          <p><strong>Factura N°:</strong> ${numero}</p>
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Cliente:</strong> ${cliente}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th style="text-align: center;">Cant.</th>
              <th style="text-align: right;">P.U.</th>
              <th style="text-align: right;">Subt.</th>
            </tr>
          </thead>
          <tbody>
            ${filasProductos}
          </tbody>
        </table>
        <div class="total-box">
          TOTAL PAGADO: $${parseFloat(total).toFixed(2)}
        </div>
        <div class="footer">
          <p>¡Gracias por tu compra y a darle con todo al entrenamiento!</p>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    let ventanaImpresion = window.open('', '_blank', 'width=600,height=600');
    ventanaImpresion.document.write(htmlTicket);
    ventanaImpresion.document.close();

  } catch (error) {
    console.error(error);
    alert("Hubo un error al intentar generar la factura.");
  }
}

// ==========================================
// FILTROS Y BÚSQUEDAS GENÉRICAS
// ==========================================
function filtrarTablaGenerica(idTabla, textoBusqueda, indicesColumnas) {
  const tabla = document.getElementById(idTabla);
  if (!tabla) return;
  const filas = tabla.querySelectorAll('tbody tr');
  const texto = textoBusqueda.toLowerCase().trim();

  filas.forEach(fila => {
    if (fila.cells.length === 1 && fila.innerText.includes("No hay")) return;
    let coincide = false;
    indicesColumnas.forEach(indice => {
      if (fila.cells[indice] && fila.cells[indice].innerText.toLowerCase().includes(texto)) coincide = true;
    });
    fila.style.display = coincide ? '' : 'none';
  });
}

function filtrarPagosRecep() {
  const seleccionado = document.getElementById('filtroClienteRecep').value;
  const inputBuscador = document.getElementById('buscador-pagos-recep');
  const buscadorTexto = inputBuscador ? inputBuscador.value.toLowerCase().trim() : '';
  const filas = document.querySelectorAll('.fila-pago-recep');
  let total = 0;

  filas.forEach(fila => {
    const socioFila = (fila.getAttribute('data-socio') || 'Socio').toLowerCase();
    const reciboFila = fila.cells[0].innerText.toLowerCase();
    const montoFila = parseFloat(fila.getAttribute('data-monto')) || 0;

    const pasaSelect = (seleccionado === 'TODOS' || fila.getAttribute('data-socio') === seleccionado);
    const pasaBuscador = (buscadorTexto === '' || socioFila.includes(buscadorTexto) || reciboFila.includes(buscadorTexto));

    if (pasaSelect && pasaBuscador) {
      fila.style.display = '';
      total += montoFila;
    } else {
      fila.style.display = 'none';
    }
  });

  const totalLabel = document.getElementById('total-monto-recep');
  if (totalLabel) totalLabel.innerText = `$ ${total.toFixed(2)}`;
}

function exportarPagosRecepCSV() {
  const filtro = document.getElementById('filtroClienteRecep').value;
  const recepcionista = JSON.parse(localStorage.getItem('usuarioLogueado'))?.usuario || "Recepcionista";
  const fechaHoy = new Date().toLocaleString();

  let csvRows = [];
  csvRows.push('"IRON FITNESS GYM - REPORTE DE CAJA (RECEPCION)"');
  csvRows.push(`"Fecha:","${fechaHoy}"`);
  csvRows.push(`"Generado por:","${recepcionista}"`);
  csvRows.push(`"Filtro aplicado:","${filtro === 'TODOS' ? 'General' : 'Cliente: ' + filtro}"`);
  csvRows.push("");
  csvRows.push('"N° RECIBO","SOCIO","PLAN","IMPORTE","ESTADO"');

  const filas = document.querySelectorAll('.fila-pago-recep');
  let totalSuma = 0;

  filas.forEach(fila => {
    if (fila.style.display !== 'none') {
      const cols = fila.querySelectorAll('td');
      // Ajustamos las columnas para exportar a CSV de acuerdo a la nueva tabla
      if(cols.length >= 6) {
        const recibo = cols[0].innerText.trim();
        const socio = cols[1].innerText.trim();
        const plan = cols[2].innerText.trim();
        const importe = cols[3].innerText.trim();
        const estado = cols[5].innerText.trim();
        csvRows.push(`"${recibo}","${socio}","${plan}","${importe}","${estado}"`);
      }
      totalSuma += parseFloat(fila.getAttribute('data-monto')) || 0;
    }
  });

  csvRows.push("");
  csvRows.push(`"TOTAL RECAUDADO:","$${totalSuma.toFixed(2)}"`);

  const blob = new Blob(["\ufeff", csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", `Caja_Recepcion_${new Date().getTime()}.csv`);
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
}
