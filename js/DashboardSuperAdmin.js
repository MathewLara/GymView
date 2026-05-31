let modalEmpresaInstance;
let modalAdminInstance;

document.addEventListener('DOMContentLoaded', () => {
  cargarModulo('resumen');
  
  // Inicializar modales
  const mEmpresa = document.getElementById('modalEmpresa');
  if(mEmpresa) modalEmpresaInstance = new bootstrap.Modal(mEmpresa);
  
  const mAdmin = document.getElementById('modalAdmin');
  if(mAdmin) modalAdminInstance = new bootstrap.Modal(mAdmin);
});

function toggleMenu() {
  document.getElementById('sidebarAdmin').classList.toggle('mostrar');
  document.querySelector('.overlay').classList.toggle('mostrar');
}

function cargarModuloResponsive(modulo, elemento) {
  cargarModulo(modulo, elemento);
  if (window.innerWidth <= 767) {
    document.getElementById('sidebarAdmin').classList.remove('mostrar');
    document.querySelector('.overlay').classList.remove('mostrar');
  }
}

function cargarModulo(modulo, elementoHTML) {
  const tituloMap = {
    'resumen': 'Panel de Control Global',
    'empresas': 'Gestión de Empresas y Sucursales',
    'administradores': 'Directorio de Administradores Locales'
  };
  document.getElementById('page-title').innerText = tituloMap[modulo] || 'Panel';

  if (elementoHTML) {
    document.querySelectorAll('#sidebarMenu .nav-link').forEach(link => link.classList.remove('active'));
    elementoHTML.classList.add('active');
  }

  const vistaResumen = document.getElementById('vista-resumen');
  const contenedorDinamico = document.getElementById('vista-dinamica-contenedor');

  if (modulo === 'resumen') {
    vistaResumen.style.display = 'block';
    contenedorDinamico.innerHTML = '';
    
    // Simulación de datos para KPIs
    document.getElementById('kpi-empresas').innerText = '12';
    document.getElementById('kpi-admins').innerText = '24';

  } else if (modulo === 'empresas') {
    vistaResumen.style.display = 'none';
    
    // Simulación de la tabla de empresas (Datos mock basados en tu imagen)
    const empresasMock = [
      { id: 1, nombre: 'Iron Fitness Gym', ruc: '999999999001', telefono: '0987654321', direccion: 'Av. Principal', fecha: '2026-05-20', activo: true },
      { id: 2, nombre: 'Titanium Gym', ruc: '1234567890001', telefono: '0912345678', direccion: 'Calle Secundaria', fecha: '2026-05-21', activo: true }
    ];

    let filas = empresasMock.map(e => `
      <tr>
        <td class="text-light">#${e.id}</td>
        <td class="fw-bold text-white"><i class="bi bi-building text-info me-2"></i>${e.nombre}</td>
        <td class="text-white">${e.ruc}</td>
        <td class="text-info small">${e.telefono || 'N/A'}</td>
        <td class="text-secondary small">${e.direccion || 'N/A'}</td>
        <td>${e.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-danger">Inactivo</span>'}</td>
        <td>
          <button class="btn btn-sm btn-outline-info me-1" onclick="abrirModalEmpresa(${e.id})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm ${e.activo ? 'btn-outline-danger' : 'btn-outline-success'}" onclick="cambiarEstado(${e.id}, 'empresa')">
            <i class="bi ${e.activo ? 'bi-trash' : 'bi-check-circle'}"></i>
          </button>
        </td>
      </tr>
    `).join('');

    contenedorDinamico.innerHTML = `
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
        <h4 class="text-white m-0">Directorio de Empresas</h4>
        <div class="d-flex gap-2 w-100" style="max-width: 450px;">
          <div class="input-group">
            <span class="input-group-text bg-dark border-secondary text-info"><i class="bi bi-search"></i></span>
            <input type="text" class="form-control bg-dark text-white border-secondary" placeholder="Buscar empresa o RUC...">
          </div>
          <button class="btn btn-info fw-bold text-nowrap" onclick="abrirModalEmpresa()"><i class="bi bi-plus-lg"></i> Nueva Empresa</button>
        </div>
      </div>
      <div class="card bg-dark border-secondary shadow-sm" style="border-radius: 10px; overflow: hidden;">
        <div class="table-responsive">
          <table class="table table-dark table-hover mb-0 align-middle">
            <thead class="text-white border-secondary">
              <tr>
                <th>ID</th><th>EMPRESA</th><th>RUC / NIT</th><th>TELÉFONO</th><th>DIRECCIÓN</th><th>ESTADO</th><th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </div>
    `;

  } else if (modulo === 'administradores') {
    vistaResumen.style.display = 'none';

    // Simulación de la tabla de administradores
    const adminsMock = [
      { id: 101, usuario: 'admin_iron', nombre: 'Carlos', apellido: 'Pérez', empresa: 'Iron Fitness Gym', activo: true },
      { id: 102, usuario: 'admin_tita', nombre: 'Luis', apellido: 'Méndez', empresa: 'Titanium Gym', activo: true }
    ];

    let filas = adminsMock.map(a => `
      <tr>
        <td class="text-light">#${a.id}</td>
        <td class="fw-bold text-white"><i class="bi bi-person-circle text-warning me-2"></i>${a.usuario}</td>
        <td class="text-white">${a.nombre} ${a.apellido}</td>
        <td class="text-info fw-bold">${a.empresa}</td>
        <td><span class="badge bg-warning text-dark">Administrador</span></td>
        <td>${a.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-danger">Inactivo</span>'}</td>
        <td>
          <button class="btn btn-sm btn-outline-warning me-1" onclick="abrirModalAdmin(${a.id})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm ${a.activo ? 'btn-outline-danger' : 'btn-outline-success'}" onclick="cambiarEstado(${a.id}, 'admin')">
            <i class="bi ${a.activo ? 'bi-trash' : 'bi-check-circle'}"></i>
          </button>
        </td>
      </tr>
    `).join('');

    contenedorDinamico.innerHTML = `
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
        <h4 class="text-white m-0">Administradores del Sistema</h4>
        <div class="d-flex gap-2 w-100" style="max-width: 450px;">
          <div class="input-group">
            <span class="input-group-text bg-dark border-secondary text-warning"><i class="bi bi-search"></i></span>
            <input type="text" class="form-control bg-dark text-white border-secondary" placeholder="Buscar administrador...">
          </div>
          <button class="btn btn-warning fw-bold text-dark text-nowrap" onclick="abrirModalAdmin()"><i class="bi bi-person-plus-fill"></i> Nuevo Admin</button>
        </div>
      </div>
      <div class="card bg-dark border-secondary shadow-sm" style="border-radius: 10px; overflow: hidden;">
        <div class="table-responsive">
          <table class="table table-dark table-hover mb-0 align-middle">
            <thead class="text-white border-secondary" style="--primary-color: #ffc107;"> <tr>
                <th>ID</th><th>USUARIO</th><th>NOMBRE COMPLETO</th><th>EMPRESA ASIGNADA</th><th>ROL</th><th>ESTADO</th><th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </div>
    `;
  }
}

// Lógica Visual de Formularios
function abrirModalEmpresa(id = null) {
  document.getElementById('formEmpresa').reset();
  if(id) {
    document.getElementById('modalTituloEmpresa').innerHTML = `<i class="bi bi-pencil-square me-2"></i>Editar Empresa #${id}`;
  } else {
    document.getElementById('modalTituloEmpresa').innerHTML = `<i class="bi bi-building-add me-2"></i>Nueva Empresa`;
  }
  if(modalEmpresaInstance) modalEmpresaInstance.show();
}

function abrirModalAdmin(id = null) {
  document.getElementById('formAdmin').reset();
  if(id) {
    document.getElementById('modalTituloAdmin').innerHTML = `<i class="bi bi-pencil-square me-2"></i>Editar Administrador #${id}`;
    document.getElementById('passHintAdmin').innerText = '(Déjela en blanco para no cambiarla)';
  } else {
    document.getElementById('modalTituloAdmin').innerHTML = `<i class="bi bi-person-plus-fill me-2"></i>Nuevo Administrador`;
    document.getElementById('passHintAdmin').innerText = '(Obligatoria)';
  }
  if(modalAdminInstance) modalAdminInstance.show();
}

function guardarEmpresa() {
  // Lógica ficticia para maquetación
  Swal.fire({ icon: 'success', title: 'Éxito', text: 'Empresa guardada correctamente.', confirmButtonColor: '#0dcaf0', background: '#1e1e1e', color: '#ffffff' });
  if(modalEmpresaInstance) modalEmpresaInstance.hide();
}

function guardarAdmin() {
  // Lógica ficticia para maquetación
  Swal.fire({ icon: 'success', title: 'Éxito', text: 'Administrador guardado correctamente.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
  if(modalAdminInstance) modalAdminInstance.hide();
}

function cambiarEstado(id, tipo) {
  Swal.fire({
    title: '¿Cambiar estado?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: tipo === 'empresa' ? '#0dcaf0' : '#ffc107',
    background: '#1e1e1e',
    color: '#ffffff'
  });
}

function cerrarSesion() {
  Swal.fire({ title: 'Cerrando sesión...', icon: 'info', timer: 1000, showConfirmButton: false, background: '#1e1e1e', color: '#ffffff' });
}