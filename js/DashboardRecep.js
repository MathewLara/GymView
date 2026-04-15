let escanerCamara = null;

function cerrarSesion() {
  localStorage.removeItem('tokenGimnasio');
  localStorage.removeItem('usuarioLogueado');
  window.location.href = 'index.html';
}

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
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/recepcion/dashboard');
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
          tbody.innerHTML = '<tr><td colspan=\"5\" class=\"text-center py-4 text-muted\"><i class=\"bi bi-clock-history fs-4 d-block mb-2\"></i>Esperando movimientos en puerta...</td></tr>';
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
    // 3. VISTA DE CLIENTES Y ENTRENADORES (CRUD)
    // ==========================================
  } else if (['clientes', 'entrenadores'].includes(modulo)) {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div><p class="text-white mt-2">Cargando directorio...</p></div>';

    try {
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios');
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
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="text-white m-0">${tituloTabla}</h4>
            <button class="btn btn-warning fw-bold" onclick="abrirModalNuevo()"><i class="bi bi-plus-lg"></i> Agregar</button>
          </div>
          <div class="card bg-dark border-secondary shadow-sm" style="border-radius: 10px; overflow: hidden;">
            <div class="table-responsive">
              <table class="table table-dark table-hover mb-0 align-middle">
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
    // 4. VISTA DE PAGOS (CONECTADA A BDD)
    // ==========================================
  } else if (modulo === 'pagos') {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div><p class="text-white mt-2">Cargando historial de caja...</p></div>';

    try {
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/recepcion/pagos');

      if (res.ok) {
        const pagos = await res.json();
        const nombresPlanes = { 1: 'Plan Diario', 2: 'Plan Mensual Estándar', 3: 'Plan VIP Mensual', 4: 'Plan Anual' };

        let filas = pagos.map(p => `
          <tr>
            <td class="text-light fw-bold">#${1000 + p.id_pago}</td>
            <td class="text-white">${p.socio}</td>
            <td class="text-info">${nombresPlanes[p.id_plan] || 'Membresía'}</td>
            <td class="text-success fw-bold">+$${parseFloat(p.monto).toFixed(2)}</td>
            <td class="text-muted">${p.fecha}</td>
            <td><span class="badge bg-secondary">${p.metodo}</span></td>
          </tr>
        `).join('');

        if (filas === '') filas = `<tr><td colspan="6" class="text-center py-4 text-white">Caja vacía. No hay transacciones.</td></tr>`;

        contenedorDinamico.innerHTML = `
          <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <h4 class="text-white m-0">Historial de Caja (Recepción)</h4>
            <button class="btn btn-success fw-bold" onclick="abrirModalPago()">
              <i class="bi bi-cash-coin"></i> Nuevo Pago
            </button>
          </div>
          <div class="card bg-dark border-secondary shadow-sm" style="border-radius: 10px; overflow: hidden;">
            <div class="table-responsive">
              <table class="table table-dark table-hover mb-0 align-middle">
                <thead class="text-white border-secondary">
                  <tr>
                    <th>N° RECIBO</th>
                    <th>SOCIO</th>
                    <th>PLAN</th>
                    <th>MONTO</th>
                    <th>FECHA / HORA</th>
                    <th>MÉTODO</th>
                  </tr>
                </thead>
                <tbody>${filas}</tbody>
              </table>
            </div>
          </div>
        `;
      }
    } catch (e) {
      contenedorDinamico.innerHTML = '<h5 class="text-danger mt-4 text-center">Error al conectar con la base de datos de pagos.</h5>';
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
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/recepcion/acceso?id=${valorAEnviar}`, { method: 'POST' });
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
let modalUsuarioInstance;
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
    telefono: document.getElementById('userTelefono').value
  };

  if (!isEdit && uData.contrasena.length < 5) {
    alert("La contraseña es obligatoria (min 5 caracteres).");
    return;
  }

  const url = isEdit ? `https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios/${id}` : `https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios`;
  const metodo = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(uData) });
    if (res.ok) {
      modalUsuarioInstance.hide();
      const moduloActivo = document.querySelector('#sidebarMenu .nav-link.active').innerText.trim().toLowerCase();
      if(moduloActivo.includes('cliente') || moduloActivo.includes('socio')) cargarModulo('clientes');
      else if(moduloActivo.includes('entrenador')) cargarModulo('entrenadores');
      else cargarModulo('resumen');
      alert("Operación exitosa.");
    } else {
      alert('Error. Verifique que el usuario o correo no estén repetidos.');
    }
  } catch (e) {
    alert('Error conectando al servidor.');
  }
}

// ==========================================
// FUNCIONES DEL MODAL DE PAGOS (CONECTADO A BDD)
// ==========================================
async function abrirModalPago() {
  const selectSocio = document.getElementById('pagoSocio');
  selectSocio.innerHTML = '<option value="" disabled selected>Cargando socios...</option>';

  try {
    const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios');
    if(res.ok) {
      const usuarios = await res.json();
      const clientes = usuarios.filter(u => u.rol === 'Cliente' && u.activo === true);

      if(clientes.length > 0) {
        selectSocio.innerHTML = '<option value="" disabled selected>Seleccione un socio activo...</option>';
        clientes.forEach(c => {
          selectSocio.innerHTML += `<option value="${c.id}">${c.nombre} ${c.apellido} (@${c.usuario})</option>`;
        });
      } else {
        selectSocio.innerHTML = '<option value="" disabled selected>No hay socios activos</option>';
      }
    }
  } catch(e) {
    selectSocio.innerHTML = '<option value="" disabled selected>Error de red al cargar socios</option>';
  }

  const modalPagoInstance = new bootstrap.Modal(document.getElementById('modalPago'));
  document.getElementById('formPago').reset();
  modalPagoInstance.show();
}

async function procesarPago() {
  const socio = document.getElementById('pagoSocio').value;
  const plan = document.getElementById('pagoPlan').value;
  const metodo = document.getElementById('pagoMetodo').value;

  if(!socio) {
    alert("Por favor, selecciona un socio válido para proceder con el cobro.");
    return;
  }

  // Precios estandarizados según el HTML del plan
  const precios = { "1": 5.00, "2": 30.00, "3": 50.00, "4": 300.00 };
  const montoCalculado = precios[plan];

  const payload = {
    idCliente: parseInt(socio),
    idPlan: parseInt(plan),
    monto: montoCalculado,
    metodo: metodo
  };

  try {
    const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/recepcion/pagos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if(res.ok && data.status === 'ok') {
      alert(`¡Pago procesado correctamente!\n\nMonto cobrado: $${montoCalculado.toFixed(2)}`);

      const modalElement = document.getElementById('modalPago');
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      if(modalInstance) modalInstance.hide();

      // Refrescamos la vista actual (Pagos o Dashboard principal)
      const moduloActivo = document.querySelector('#sidebarMenu .nav-link.active').innerText.trim().toLowerCase();
      if(moduloActivo.includes('pago')) cargarModulo('pagos');
      else cargarModulo('resumen');

    } else {
      alert("No se pudo procesar: " + data.mensaje);
    }
  } catch(e) {
    alert("Error de conexión con el servidor al procesar el pago.");
  }
}
