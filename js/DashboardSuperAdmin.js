// ==========================================
// ESCUDO DE SEGURIDAD Y CONFIGURACIÓN INICIAL
// ==========================================
const sesionSegura = localStorage.getItem('usuarioLogueado');
if (!sesionSegura || sesionSegura === 'null' || sesionSegura === 'undefined' || sesionSegura.trim() === '') {
  window.location.replace('index.html');
  throw new Error("Bloqueo activado.");
}

let modalEmpresaInstance;
let modalAdminInstance;

document.addEventListener('DOMContentLoaded', () => {
  const mEmpresa = document.getElementById('modalEmpresa');
  if(mEmpresa) modalEmpresaInstance = new bootstrap.Modal(mEmpresa);

  const mAdmin = document.getElementById('modalAdmin');
  if(mAdmin) modalAdminInstance = new bootstrap.Modal(mAdmin);

  const usuario = JSON.parse(sesionSegura);
  const userEl = document.querySelector('.header-bar .text-white.fw-bold');
  if(userEl) userEl.innerText = usuario.nombre || 'Super Administrador';

  cargarModulo('resumen');
});

function toggleMenu() {
  const sidebar = document.getElementById('sidebarAdmin');
  const overlay = document.querySelector('.overlay');
  if (sidebar) sidebar.classList.toggle('mostrar');
  if (overlay) overlay.classList.toggle('mostrar');
}

function cargarModuloResponsive(modulo, elemento) {
  cargarModulo(modulo, elemento);
  if (window.innerWidth <= 767) {
    const sidebar = document.getElementById('sidebarAdmin');
    const overlay = document.querySelector('.overlay');
    if (sidebar) sidebar.classList.remove('mostrar');
    if (overlay) overlay.classList.remove('mostrar');
  }
}

// ==========================================
// CARGA DE MÓDULOS Y TABLAS
// ==========================================
async function cargarModulo(modulo, elementoHTML) {
  const tituloMap = {
    'resumen': 'Panel de Control Global',
    'empresas': 'Gestión de Sucursales y Franquicias',
    'administradores': 'Directorio de Administradores Locales'
  };

  const titleEl = document.getElementById('page-title');
  if(titleEl) titleEl.innerText = tituloMap[modulo] || 'Panel';

  if (elementoHTML) {
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    elementoHTML.classList.add('active');
  }

  const vistaResumen = document.getElementById('vista-resumen');
  const contenedorDinamico = document.getElementById('vista-dinamica-contenedor');

  if (modulo === 'resumen') {
    if(vistaResumen) vistaResumen.style.display = 'block';
    if(contenedorDinamico) contenedorDinamico.innerHTML = '';
    try {
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/superadmin/dashboard');
      if(res.ok) {
        const data = await res.json();
        const elEmp = document.getElementById('kpi-empresas');
        if(elEmp) elEmp.innerText = data.totalEmpresas || 0;
        const elUsr = document.getElementById('kpi-admins');
        if(elUsr) elUsr.innerText = data.totalUsuarios || 0;
      }
    } catch(e) {}

  } else if (modulo === 'empresas') {
    if(vistaResumen) vistaResumen.style.display = 'none';
    if(contenedorDinamico) contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-info"></div><p class="text-white mt-2">Cargando empresas...</p></div>';
    try {
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/superadmin/empresas');
      if(res.ok) {
        const empresas = await res.json();
        let filas = empresas.map(e => `
          <tr>
            <td class="text-light fw-bold">#${e.id}</td>
            <td class="text-info fw-bold">${e.nombre}</td>
            <td class="text-white">${e.ruc}</td>
            <td class="text-warning">${e.total_clientes}</td>
            <td><span class="badge ${e.estado ? 'bg-success' : 'bg-danger'}">${e.estado ? 'Activa' : 'Suspendida'}</span></td>
            <td>
              <button class="btn btn-sm btn-outline-info me-2" onclick="abrirModalEditarEmpresa(${e.id}, '${e.nombre}', '${e.ruc}', '${e.telefono || ''}', '${e.direccion || ''}')"><i class="bi bi-pencil"></i> Editar</button>
              <button class="btn btn-sm ${e.estado ? 'btn-outline-danger' : 'btn-outline-success'}" onclick="cambiarEstadoEmpresa(${e.id}, ${!e.estado})">
                <i class="bi ${e.estado ? 'bi-x-circle' : 'bi-check-circle'}"></i> ${e.estado ? 'Suspender' : 'Activar'}
              </button>
            </td>
          </tr>
        `).join('');

        contenedorDinamico.innerHTML = `
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="text-white m-0">Gimnasios Registrados</h4>
            <button class="btn btn-info fw-bold text-dark" onclick="abrirModalNuevaEmpresa()"><i class="bi bi-plus-lg"></i> Nueva Empresa</button>
          </div>
          <div class="table-responsive">
            <table class="table table-dark table-hover align-middle">
              <thead><tr><th>ID</th><th>NOMBRE</th><th>RUC / NIT</th><th>SOCIOS TOTALES</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
              <tbody>${filas || '<tr><td colspan="6" class="text-center">No hay empresas registradas.</td></tr>'}</tbody>
            </table>
          </div>
        `;
      }
    } catch(e) {}

  } else if (modulo === 'administradores') {
    if(vistaResumen) vistaResumen.style.display = 'none';
    if(contenedorDinamico) contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div><p class="text-white mt-2">Cargando dueños...</p></div>';
    try {
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/superadmin/administradores');
      if(res.ok) {
        const admins = await res.json();
        let filas = admins.map(a => `
          <tr>
            <td class="text-light fw-bold">#${a.id}</td>
            <td class="text-warning fw-bold">@${a.usuario}</td>
            <td class="text-white">${a.nombre} ${a.apellido}</td>
            <td class="text-info">${a.empresa}</td>
            <td><span class="badge ${a.estado ? 'bg-success' : 'bg-danger'}">${a.estado ? 'Activo' : 'Suspendido'}</span></td>
            <td>
              <button class="btn btn-sm btn-outline-warning me-2" onclick="abrirModalEditarAdmin(${a.id}, '${a.usuario}', '${a.nombre}', '${a.apellido}', '${a.id_empresa || ''}')"><i class="bi bi-pencil"></i> Editar</button>
              <button class="btn btn-sm ${a.estado ? 'btn-outline-danger' : 'btn-outline-success'}" onclick="cambiarEstadoAdmin(${a.id}, ${!a.estado})">
                <i class="bi ${a.estado ? 'bi-person-x' : 'bi-person-check'}"></i> ${a.estado ? 'Suspender' : 'Reactivar'}
              </button>
            </td>
          </tr>
        `).join('');

        contenedorDinamico.innerHTML = `
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="text-white m-0">Dueños / Administradores</h4>
            <button class="btn btn-warning fw-bold text-dark" onclick="abrirModalNuevoAdmin()"><i class="bi bi-person-plus-fill"></i> Crear Nuevo Dueño</button>
          </div>
          <div class="table-responsive">
            <table class="table table-dark table-hover align-middle">
              <thead><tr><th>ID</th><th>USUARIO</th><th>NOMBRE COMPLETO</th><th>SUCURSAL ASIGNADA</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
              <tbody>${filas || '<tr><td colspan="6" class="text-center">No hay administradores registrados.</td></tr>'}</tbody>
            </table>
          </div>
        `;
      }
    } catch(e) {}
  }
}

// ==========================================
// FUNCIONES CRUD DE EMPRESAS (CREAR Y EDITAR)
// ==========================================
function abrirModalNuevaEmpresa() {
  const f = document.getElementById('formEmpresa');
  if(f) f.reset();
  document.getElementById('empresaId').value = '';
  document.getElementById('modalTituloEmpresa').innerHTML = `<i class="bi bi-building-add me-2"></i>Nuevo Gimnasio`;
  if(modalEmpresaInstance) modalEmpresaInstance.show();
}

function abrirModalEditarEmpresa(id, nombre, ruc, telefono, direccion) {
  const f = document.getElementById('formEmpresa');
  if(f) f.reset();

  document.getElementById('empresaId').value = id;
  document.getElementById('empresaNombre').value = nombre;
  document.getElementById('empresaRuc').value = ruc;
  document.getElementById('empresaTelefono').value = telefono !== 'undefined' ? telefono : '';
  document.getElementById('empresaDireccion').value = direccion !== 'undefined' ? direccion : '';

  document.getElementById('modalTituloEmpresa').innerHTML = `<i class="bi bi-pencil-square me-2"></i>Editar Gimnasio #${id}`;
  if(modalEmpresaInstance) modalEmpresaInstance.show();
}

async function guardarEmpresa() {
  const id = document.getElementById('empresaId').value;
  const isEdit = id !== '';

  const data = {
    nombre: document.getElementById('empresaNombre')?.value || 'Nueva Empresa',
    ruc: document.getElementById('empresaRuc')?.value || '00000000',
    telefono: document.getElementById('empresaTelefono')?.value || 'N/A',
    direccion: document.getElementById('empresaDireccion')?.value || 'N/A'
  };

  const url = isEdit ? `https://gimnasio-f7td.onrender.com/Gimnasio/api/superadmin/empresas/${id}` : 'https://gimnasio-f7td.onrender.com/Gimnasio/api/superadmin/empresas';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, { method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
    if(res.ok) {
      if(modalEmpresaInstance) modalEmpresaInstance.hide();
      Swal.fire({icon: 'success', title: 'Éxito', text: isEdit ? 'Gimnasio actualizado correctamente.' : 'Gimnasio creado correctamente.', background: '#1e1e1e', color: '#ffffff'});
      cargarModulo('empresas');
    }
  } catch(e) {}
}

async function cambiarEstadoEmpresa(id, nuevoEstado) {
  const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/superadmin/empresas/${id}/estado?activo=${nuevoEstado}`, {method: 'PUT'});
  if(res.ok) cargarModulo('empresas');
}

// ==========================================
// FUNCIONES CRUD DE ADMINISTRADORES (CORRECCIÓN DE ERROR)
// ==========================================
async function abrirModalNuevoAdmin() {
  const f = document.getElementById('formAdmin');
  if(f) f.reset();
  document.getElementById('adminId').value = '';
  document.getElementById('modalTituloAdmin').innerHTML = '<i class="bi bi-person-plus-fill me-2"></i>Nuevo Administrador';

  const passHint = document.getElementById('passHintAdmin');
  if(passHint) passHint.innerText = '(Obligatoria)';

  const select = document.getElementById('adminEmpresa');
  if(select) {
    select.innerHTML = '<option value="" disabled selected>Buscando gimnasios...</option>';
    try {
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/superadmin/empresas');
      const empresas = await res.json();
      select.innerHTML = '<option value="" disabled selected>Seleccione el Gimnasio...</option>' +
        empresas.filter(e => e.estado).map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
    } catch(e) {}
  }
  if(modalAdminInstance) modalAdminInstance.show();
}

async function abrirModalEditarAdmin(id, usuario, nombre, apellido, idEmpresa) {
  const f = document.getElementById('formAdmin');
  if(f) f.reset();

  document.getElementById('adminId').value = id;
  document.getElementById('adminNombre').value = nombre;
  document.getElementById('adminApellido').value = apellido;
  document.getElementById('adminUsername').value = usuario;

  document.getElementById('modalTituloAdmin').innerHTML = `<i class="bi bi-pencil-square me-2"></i>Editar Administrador #${id}`;
  const passHint = document.getElementById('passHintAdmin');
  if(passHint) passHint.innerText = '(Dejar en blanco para no cambiar)';

  const select = document.getElementById('adminEmpresa');
  if(select) {
    select.innerHTML = '<option value="" disabled selected>Buscando gimnasios...</option>';
    try {
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/superadmin/empresas');
      const empresas = await res.json();
      // CARGAMOS TODAS LAS EMPRESAS (incluso inactivas) para no perder el rastro al editar
      select.innerHTML = '<option value="" disabled>Seleccione el Gimnasio...</option>' +
        empresas.map(e => `<option value="${e.id}">${e.nombre} ${!e.estado ? '(Inactiva)' : ''}</option>`).join('');

      if(idEmpresa && idEmpresa !== 'undefined' && idEmpresa !== 'null') {
        select.value = idEmpresa;
      }
    } catch(e) {}
  }
  if(modalAdminInstance) modalAdminInstance.show();
}

async function guardarAdmin() {
  const id = document.getElementById('adminId').value;
  const isEdit = id !== '';

  const data = {
    idEmpresa: document.getElementById('adminEmpresa')?.value,
    nombre: document.getElementById('adminNombre')?.value,
    apellido: document.getElementById('adminApellido')?.value,
    usuario: document.getElementById('adminUsername')?.value,
    contrasena: document.getElementById('adminPass')?.value
  };

  // CORRECCIÓN: Validación blindada para evitar enviar IDs de empresa en blanco
  if (!data.idEmpresa || data.idEmpresa === "") {
    Swal.fire({icon: 'warning', title: 'Atención', text: 'Debe seleccionar un gimnasio válido de la lista.', background: '#1e1e1e', color: '#ffffff'});
    return;
  }

  if (!data.usuario || (!isEdit && !data.contrasena)) {
    Swal.fire({icon: 'warning', title: 'Atención', text: 'El nombre de usuario y la contraseña son obligatorios.', background: '#1e1e1e', color: '#ffffff'});
    return;
  }

  const url = isEdit ? `https://gimnasio-f7td.onrender.com/Gimnasio/api/superadmin/administradores/${id}` : 'https://gimnasio-f7td.onrender.com/Gimnasio/api/superadmin/administradores';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, { method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
    if(res.ok) {
      if(modalAdminInstance) modalAdminInstance.hide();
      Swal.fire({icon: 'success', title: 'Éxito', text: isEdit ? 'Dueño actualizado.' : 'Dueño registrado correctamente.', background: '#1e1e1e', color: '#ffffff'});
      cargarModulo('administradores');
    } else {
      Swal.fire({icon: 'error', title: 'Error', text: 'Verifique los datos o el usuario ya existe.', background: '#1e1e1e', color: '#ffffff'});
    }
  } catch(e) { console.error(e); }
}

async function cambiarEstadoAdmin(id, nuevoEstado) {
  const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/superadmin/administradores/${id}/estado?activo=${nuevoEstado}`, {method: 'PUT'});
  if(res.ok) cargarModulo('administradores');
}

function cerrarSesion() {
  localStorage.removeItem('tokenGimnasio');
  localStorage.removeItem('usuarioLogueado');
  window.location.replace('index.html');
}

// ==========================================
// MOSTRAR / OCULTAR CONTRASEÑA (MODAL)
// ==========================================
const toggleSuperAdminPass = document.getElementById('toggleSuperAdminPass');
const superAdminPassInput = document.getElementById('adminPass');
const toggleSuperAdminIcon = document.getElementById('toggleSuperAdminIcon');

if (toggleSuperAdminPass && superAdminPassInput && toggleSuperAdminIcon) {
  toggleSuperAdminPass.addEventListener('click', function () {
    const isPassword = superAdminPassInput.getAttribute('type') === 'password';
    superAdminPassInput.setAttribute('type', isPassword ? 'text' : 'password');
    if (isPassword) {
      toggleSuperAdminIcon.classList.remove('bi-eye-slash-fill');
      toggleSuperAdminIcon.classList.add('bi-eye-fill', 'text-warning');
    } else {
      toggleSuperAdminIcon.classList.remove('bi-eye-fill', 'text-warning');
      toggleSuperAdminIcon.classList.add('bi-eye-slash-fill');
    }
  });
}
