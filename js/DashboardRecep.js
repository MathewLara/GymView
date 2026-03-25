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

    // C) VISTA SOCIOS (CLIENTES) - NUEVO
  } else if (modulo === 'clientes') {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div><p class="text-white mt-2">Cargando directorio de socios...</p></div>';

    try {
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/recepcion/socios');
      if (res.ok) {
        const socios = await res.json();

        let filas = socios.map(u => {
          const txtEmail = (u.email && u.email !== 'null' && u.email !== '') ? u.email : '<span class="text-muted">N/A</span>';
          const txtTelefono = (u.telefono && u.telefono !== 'null' && u.telefono !== '') ? u.telefono : '<span class="text-muted">N/A</span>';

          // Muestra si el cliente está dentro del gimnasio en este momento
          const badgeEntrenando = u.esta_entrenando > 0 ? '<span class="badge bg-warning text-dark border border-warning"><i class="bi bi-activity"></i> Entrenando</span>' : '<span class="badge bg-secondary">Ausente</span>';
          const badgeActivo = u.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-danger">Inactivo</span>';

          return `
          <tr>
            <td class="text-light">#${u.id}</td>
            <td class="fw-bold text-white">${u.usuario}</td>
            <td class="text-white">${u.nombre} ${u.apellido}</td>
            <td class="text-info small">${txtEmail}</td>
            <td class="text-warning small">${txtTelefono}</td>
            <td>${badgeEntrenando}</td>
            <td>${badgeActivo}</td>
            <td>
              <button class="btn btn-sm ${u.activo ? 'btn-outline-danger' : 'btn-outline-success'} me-2" onclick="cambiarEstadoUsuario(${u.id}, ${!u.activo}, '${modulo}')">
                <i class="bi ${u.activo ? 'bi-trash' : 'bi-check-circle'}"></i> ${u.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button class="btn btn-sm btn-outline-info" onclick="abrirModalEditar(${u.id}, '${u.usuario}', '${u.nombre}', '${u.apellido}', '${u.email || ''}', '${u.telefono || ''}')"><i class="bi bi-pencil"></i></button>
            </td>
          </tr>
        `}).join('');

        if (filas === '') filas = `<tr><td colspan="8" class="text-center py-4 text-white">No hay socios registrados.</td></tr>`;

        contenedorDinamico.innerHTML = `
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="text-white m-0">Directorio de Socios</h4>
            <button class="btn btn-warning fw-bold" onclick="abrirModalNuevo()"><i class="bi bi-person-plus-fill"></i> Nuevo Socio</button>
          </div>
          <div class="card bg-dark border-secondary shadow-sm" style="border-radius: 10px; overflow: hidden;">
            <div class="table-responsive">
              <table class="table table-dark table-hover mb-0 align-middle">
                <thead class="text-white border-secondary">
                  <tr>
                    <th>ID</th>
                    <th>USUARIO</th>
                    <th>NOMBRE COMPLETO</th>
                    <th>CORREO</th>
                    <th>TELÉFONO</th>
                    <th>ESTADO FÍSICO</th>
                    <th>ESTADO CUENTA</th>
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

    // D) OTROS MÓDULOS (En construcción temporalmente)
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

// ==========================================
// FUNCIONES DE EDICIÓN Y CREACIÓN (SOCIOS)
// ==========================================
async function cambiarEstadoUsuario(id, nuevoEstado, moduloActual) {
  if(!confirm(`¿Estás seguro de que deseas ${nuevoEstado ? 'activar' : 'desactivar'} este socio?`)) return;
  try {
    // Usamos la misma ruta del administrador
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios/${id}/estado?activo=${nuevoEstado}`, { method: 'PUT' });
    if(res.ok) cargarModulo(moduloActual);
    else alert('Hubo un error al actualizar el estado.');
  } catch(e) { alert('Error de conexión al servidor.'); }
}

function abrirModalNuevo() {
  document.getElementById('formUsuario').reset();
  document.getElementById('userId').value = '';
  document.getElementById('modalTitulo').innerText = 'Nuevo Socio';
  document.getElementById('passHint').innerText = '(Obligatoria)';

  const modalEl = document.getElementById('modalUsuario');
  const myModal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  myModal.show();
}

function abrirModalEditar(id, usuario, nombre, apellido, email, telefono) {
  document.getElementById('formUsuario').reset();
  document.getElementById('userId').value = id;
  document.getElementById('userUsername').value = usuario;
  document.getElementById('userNombre').value = nombre !== 'null' ? nombre : '';
  document.getElementById('userApellido').value = apellido !== 'null' ? apellido : '';
  document.getElementById('userEmail').value = (email !== 'null' && email !== 'undefined') ? email : '';
  document.getElementById('userTelefono').value = (telefono !== 'null' && telefono !== 'undefined') ? telefono : '';

  document.getElementById('modalTitulo').innerText = 'Editar Socio #' + id;
  document.getElementById('passHint').innerText = '(En blanco para no cambiarla)';

  const modalEl = document.getElementById('modalUsuario');
  const myModal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  myModal.show();
}

async function guardarUsuario() {
  const id = document.getElementById('userId').value;
  const isEdit = id !== '';

  const uData = {
    nombre: document.getElementById('userNombre').value,
    apellido: document.getElementById('userApellido').value,
    usuario: document.getElementById('userUsername').value,
    idRol: 4, // Recepcionista SOLO interactúa con clientes
    contrasena: document.getElementById('userPass').value,
    email: document.getElementById('userEmail').value,
    telefono: document.getElementById('userTelefono').value
  };

  if (!isEdit && uData.contrasena.length < 5) {
    alert("La contraseña es obligatoria para usuarios nuevos (min 5 caracteres).");
    return;
  }

  // Usamos los endpoints del admin
  const url = isEdit
    ? `https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios/${id}`
    : `https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios`;

  try {
    const res = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(uData)
    });

    if (res.ok) {
      const modalEl = document.getElementById('modalUsuario');
      const myModal = bootstrap.Modal.getInstance(modalEl);
      myModal.hide();

      cargarModulo('clientes');
    } else {
      alert('Error al guardar. Verifique que el usuario o correo no estén repetidos.');
    }
  } catch (e) {
    alert('Error conectando al servidor.');
  }
}

// Inicializar el dashboard al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  cargarModulo('resumen');
});
