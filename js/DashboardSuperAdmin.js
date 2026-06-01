// ==========================================
// ESCUDO DE SEGURIDAD: BLOQUEO DE URL DIRECTA
// ==========================================
const sesionSegura = localStorage.getItem('usuarioLogueado');
if (!sesionSegura || sesionSegura === 'null' || sesionSegura === 'undefined' || sesionSegura.trim() === '') {
  window.location.replace('index.html');
  throw new Error("Bloqueo activado: El usuario no tiene sesión. Deteniendo la página.");
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
        text: 'Tu sesión ha expirado por inactividad. Por seguridad, debes iniciar sesión nuevamente.',
        confirmButtonColor: '#ffc107',
        background: '#1e1e1e',
        color: '#ffffff'
      }).then(() => {
        window.location.replace('index.html');
      });
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
setInterval(verificarInactividad, 60000);
verificarInactividad();

// ==========================================
// VARIABLES GLOBALES Y MODALES
// ==========================================
let modalEmpresaInstance;
let modalAdminInstance;

document.addEventListener('DOMContentLoaded', () => {
  // Inicializamos los modales creados por tu compañera
  const mEmpresa = document.getElementById('modalEmpresa');
  if(mEmpresa) modalEmpresaInstance = new bootstrap.Modal(mEmpresa);

  const mAdmin = document.getElementById('modalAdmin');
  if(mAdmin) modalAdminInstance = new bootstrap.Modal(mAdmin);

  // Ponemos el nombre del Super Admin en la cabecera
  const usuario = JSON.parse(sesionSegura);
  const userEl = document.getElementById('header-user');
  if(userEl) userEl.innerText = usuario.nombre || 'Dios';

  // Cargamos la pantalla inicial
  cargarModulo('resumen');
});

// ==========================================
// NAVEGACIÓN Y CARGA DESDE JAVA (BACKEND)
// ==========================================
function toggleMenu() {
  document.getElementById('sidebarAdmin').classList.toggle('mostrar');
  document.querySelector('.overlay').classList.toggle('mostrar');
}

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

  // ----------------------------------------------------
  // MÓDULO 1: DASHBOARD
  // ----------------------------------------------------
  if (modulo === 'resumen') {
    if(vistaResumen) vistaResumen.style.display = 'block';
    if(contenedorDinamico) contenedorDinamico.innerHTML = '';

    try {
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/superadmin/dashboard');
      if(res.ok) {
        const data = await res.json();
        // Inyectamos la telemetría en las tarjetas
        const elEmp = document.getElementById('kpi-empresas');
        if(elEmp) elEmp.innerText = data.totalEmpresas || 0;

        const elUsr = document.getElementById('kpi-usuarios');
        if(elUsr) elUsr.innerText = data.totalUsuarios || 0;

        const elIng = document.getElementById('kpi-ingresos');
        if(elIng) elIng.innerText = '$ ' + parseFloat(data.totalIngresos || 0).toFixed(2);
      }
    } catch(e) { console.log("Error cargando dashboard:", e); }

    // ----------------------------------------------------
    // MÓDULO 2: EMPRESAS
    // ----------------------------------------------------
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
              <button class="btn btn-sm ${e.estado ? 'btn-outline-danger' : 'btn-outline-success'} me-2" onclick="cambiarEstadoEmpresa(${e.id}, ${!e.estado})">
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
    } catch(e) { console.error(e); }

    // ----------------------------------------------------
    // MÓDULO 3: ADMINISTRADORES
    // ----------------------------------------------------
  } else if (modulo === 'administradores') {
    if(vistaResumen) vistaResumen.style.display = 'none';
    if(contenedorDinamico) contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div><p class="text-white mt-2">Cargando administradores...</p></div>';

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
    } catch(e) { console.error(e); }
  }

  if (window.innerWidth <= 767) toggleMenu();
}

// ==========================================
// FUNCIONES CRUD DE EMPRESAS
// ==========================================
function abrirModalNuevaEmpresa() {
  const f = document.getElementById('formEmpresa');
  if(f) f.reset();
  if(modalEmpresaInstance) modalEmpresaInstance.show();
}

async function guardarEmpresa() {
  const data = {
    // Usamos ?.value para evitar errores si el HTML se llama diferente
    nombre: document.getElementById('empresaNombre')?.value || 'Nueva Empresa',
    ruc: document.getElementById('empresaRuc')?.value || '00000000',
    telefono: document.getElementById('empresaTelefono')?.value || 'N/A',
    direccion: 'N/A'
  };

  try {
    const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/superadmin/empresas', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if(res.ok) {
      if(modalEmpresaInstance) modalEmpresaInstance.hide();
      Swal.fire({icon: 'success', title: 'Éxito', text: 'Gimnasio creado correctamente.', background: '#1e1e1e', color: '#ffffff'});
      cargarModulo('empresas');
    }
  } catch(e) { console.error(e); }
}

async function cambiarEstadoEmpresa(id, nuevoEstado) {
  const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/superadmin/empresas/${id}/estado?activo=${nuevoEstado}`, {method: 'PUT'});
  if(res.ok) cargarModulo('empresas');
}

// ==========================================
// FUNCIONES CRUD DE ADMINISTRADORES
// ==========================================
async function abrirModalNuevoAdmin() {
  const f = document.getElementById('formAdmin');
  if(f) f.reset();

  // Cargamos dinámicamente las empresas en el Select del HTML
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

async function guardarAdmin() {
  const data = {
    idEmpresa: document.getElementById('adminEmpresa')?.value,
    nombre: document.getElementById('adminNombre')?.value || 'Dueño',
    apellido: document.getElementById('adminApellido')?.value || 'Local',
    email: document.getElementById('adminEmail')?.value || 'admin@gym.com',
    telefono: document.getElementById('adminTelefono')?.value || '0000',
    usuario: document.getElementById('adminUsuario')?.value,
    contrasena: document.getElementById('adminPass')?.value
  };

  if(!data.idEmpresa || !data.usuario || !data.contrasena) {
    Swal.fire({icon: 'warning', title: 'Atención', text: 'Empresa, usuario y contraseña son obligatorios.', background: '#1e1e1e', color: '#ffffff'});
    return;
  }

  try {
    const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/superadmin/administradores', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if(res.ok) {
      if(modalAdminInstance) modalAdminInstance.hide();
      Swal.fire({icon: 'success', title: 'Éxito', text: 'Dueño registrado correctamente.', background: '#1e1e1e', color: '#ffffff'});
      cargarModulo('administradores');
    } else {
      Swal.fire({icon: 'error', title: 'Error', text: 'Ese nombre de usuario ya está en uso.', background: '#1e1e1e', color: '#ffffff'});
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
