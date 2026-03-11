// Función enlazada al botón "Salir"
function cerrarSesion() {
  localStorage.removeItem('tokenGimnasio');
  sessionStorage.removeItem('usuarioLogueado');
  window.location.href = 'index.html';
}

// ==========================================
// NAVEGACIÓN DINÁMICA DEL DASHBOARD (SPA)
// ==========================================

async function cargarModulo(modulo, elementoHTML) {
  const tituloMap = { 'resumen': 'Panel de Control Gerencial' };
  document.getElementById('page-title').innerText = tituloMap[modulo] || 'Panel';

  if (elementoHTML) {
    const links = document.querySelectorAll('#sidebarMenu .nav-link');
    links.forEach(link => link.classList.remove('active'));
    elementoHTML.classList.add('active');
  }

  const vistaResumen = document.getElementById('vista-resumen');
  const contenedorDinamico = document.getElementById('vista-dinamica-contenedor');

  if (modulo === 'resumen') {
    vistaResumen.style.display = 'block';
    contenedorDinamico.innerHTML = '';

    document.getElementById('kpi-cuentas').innerText = '...';
    document.getElementById('kpi-ingresos1').innerText = '...';
    document.getElementById('kpi-entrenadores1').innerText = '...';

    try {
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/admin/dashboard');

      if(res.ok) {
        const data = await res.json();

        document.getElementById('kpi-cuentas').innerText = data.totalCuentas;
        document.getElementById('kpi-ingresos1').innerText = '$ ' + parseFloat(data.ingresos).toFixed(2);
        document.getElementById('kpi-entrenadores1').innerText = data.totalEntrenadores;

        const tbody = document.getElementById('tabla-accesos-body') || document.querySelector('.table tbody');

        if (tbody && data.ultimosAccesos && data.ultimosAccesos.length > 0) {
          tbody.innerHTML = data.ultimosAccesos.map(acc => {
            const colorEstado = acc.estado.toLowerCase().includes('exito') ? 'bg-success' : 'bg-danger';
            return `
                <tr>
                    <td class="fw-bold text-warning"><i class="bi bi-person-circle"></i> ${acc.usuario}</td>
                    <td><span class="badge bg-secondary">${acc.rol}</span></td>
                    <td class="text-muted">${acc.hora}</td>
                    <td class="text-info">${acc.ip}</td>
                    <td><span class="badge ${colorEstado}">${acc.estado}</span></td>
                </tr>
            `}).join('');
        } else if (tbody) {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Aún no hay registros de acceso. Inicia sesión con una cuenta para generar el primero.</td></tr>';
        }
      }
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    }

  } else if (['clientes', 'entrenadores', 'recepcionistas', 'administradores'].includes(modulo)) {
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
          tituloTabla = "Directorio de Clientes";
        } else if (modulo === 'entrenadores') {
          usuariosFiltrados = todosLosUsuarios.filter(u => u.rol === 'Entrenador');
          tituloTabla = "Directorio de Entrenadores";
        } else if (modulo === 'recepcionistas') {
          usuariosFiltrados = todosLosUsuarios.filter(u => u.rol === 'Recepcionista');
          tituloTabla = "Directorio de Recepcionistas";
        } else if (modulo === 'administradores') {
          usuariosFiltrados = todosLosUsuarios.filter(u => u.rol === 'Administrador');
          tituloTabla = "Directorio de Administradores";
        }

        let filas = usuariosFiltrados.map(u => {
          const txtEmail = (u.email && u.email !== 'null' && u.email !== '') ? u.email : '<span class="text-muted">N/A</span>';
          const txtTelefono = (u.telefono && u.telefono !== 'null' && u.telefono !== '') ? u.telefono : '<span class="text-muted">N/A</span>';

          return `
          <tr>
            <td class="text-light">#${u.id}</td>
            <td class="fw-bold text-white">${u.usuario}</td>
            <td class="text-white">${u.nombre} ${u.apellido}</td>
            <td class="text-info small">${txtEmail}</td>
            <td class="text-warning small">${txtTelefono}</td>
            <td><span class="badge bg-secondary">${u.rol}</span></td>
            <td>${u.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-danger">Inactivo</span>'}</td>
            <td>
              <button class="btn btn-sm ${u.activo ? 'btn-outline-danger' : 'btn-outline-success'} me-2" onclick="cambiarEstadoUsuario(${u.id}, ${!u.activo}, '${modulo}')">
                <i class="bi ${u.activo ? 'bi-trash' : 'bi-check-circle'}"></i> ${u.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button class="btn btn-sm btn-outline-info" onclick="abrirModalEditar(${u.id}, '${u.usuario}', '${u.nombre}', '${u.apellido}', '${u.rol}', '${u.email || ''}', '${u.telefono || ''}')"><i class="bi bi-pencil"></i></button>
            </td>
          </tr>
        `}).join('');

        if (filas === '') {
          filas = `<tr><td colspan="8" class="text-center py-4 text-white">No hay registros en esta categoría.</td></tr>`;
        }

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
                    <th>USUARIO</th>
                    <th>NOMBRE COMPLETO</th>
                    <th>CORREO</th>
                    <th>TELÉFONO</th>
                    <th>ROL</th>
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
    // NUEVO: MÓDULO DE REPORTES GERENCIALES
    // ==========================================
  } else if (modulo === 'reportes') {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div><p class="text-white mt-2">Generando análisis gerencial...</p></div>';

    try {
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/reportes');

      if(res.ok) {
        const data = await res.json();

        contenedorDinamico.innerHTML = `
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="text-white m-0">Reportes y Análisis Gerencial</h4>

            <div class="dropdown">
              <button class="btn btn-warning dropdown-toggle fw-bold" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-download"></i> Exportar Reportes
              </button>
              <ul class="dropdown-menu dropdown-menu-dark border-secondary">
                <li><a class="dropdown-item text-white" href="#" onclick="window.print()"><i class="bi bi-file-earmark-pdf text-danger"></i> Reporte Visual (PDF)</a></li>
                <li><hr class="dropdown-divider border-secondary"></li>
                <li><h6 class="dropdown-header text-warning">Datos Crudos (Backend)</h6></li>
                <li><a class="dropdown-item text-white" href="https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/reportes/accesos/csv" target="_blank"><i class="bi bi-filetype-csv text-success"></i> Accesos y Auditoría (CSV)</a></li>
                <li><a class="dropdown-item text-white" href="https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/reportes/ingresos/csv" target="_blank"><i class="bi bi-filetype-csv text-success"></i> Ingresos Económicos (CSV)</a></li>
              </ul>
            </div>
          </div>

          <div class="row g-3 mb-4">
            <div class="col-md-3">
              <div class="card bg-dark border-secondary text-center p-3 shadow-sm" style="border-radius: 10px;">
                <h6 class="text-muted text-uppercase mb-1" style="font-size: 0.8rem;">Clientes Registrados</h6>
                <h3 class="text-white m-0 fw-bold"><i class="bi bi-people text-info me-2"></i> ${data.kpis.totalClientes || 0}</h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card bg-dark border-secondary text-center p-3 shadow-sm" style="border-radius: 10px;">
                <h6 class="text-muted text-uppercase mb-1" style="font-size: 0.8rem;">Clientes Activos</h6>
                <h3 class="text-white m-0 fw-bold"><i class="bi bi-person-check text-success me-2"></i> ${data.kpis.clientesActivos || 0}</h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card bg-dark border-secondary text-center p-3 shadow-sm" style="border-radius: 10px;">
                <h6 class="text-muted text-uppercase mb-1" style="font-size: 0.8rem;">Ingresos del Mes</h6>
                <h3 class="text-white m-0 fw-bold"><i class="bi bi-cash-stack text-warning me-2"></i> $${parseFloat(data.kpis.ingresosMes || 0).toFixed(2)}</h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card bg-dark border-secondary text-center p-3 shadow-sm" style="border-radius: 10px;">
                <h6 class="text-muted text-uppercase mb-1" style="font-size: 0.8rem;">Ingresos Históricos</h6>
                <h3 class="text-white m-0 fw-bold"><i class="bi bi-bank text-primary me-2"></i> $${parseFloat(data.kpis.ingresosTotales || 0).toFixed(2)}</h3>
              </div>
            </div>
          </div>

          <div class="row g-4">
            <div class="col-md-6">
              <div class="card bg-dark border-secondary h-100 shadow-sm" style="border-radius: 10px;">
                <div class="card-header border-secondary text-white fw-bold"><i class="bi bi-pie-chart-fill text-warning me-2"></i> Ingresos por Método de Pago</div>
                <div class="card-body d-flex justify-content-center align-items-center" style="min-height: 300px;">
                  <div style="width: 80%;"><canvas id="chartMetodos"></canvas></div>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card bg-dark border-secondary h-100 shadow-sm" style="border-radius: 10px;">
                <div class="card-header border-secondary text-white fw-bold"><i class="bi bi-bar-chart-line-fill text-warning me-2"></i> Membresías Más Vendidas</div>
                <div class="card-body d-flex justify-content-center align-items-center" style="min-height: 300px;">
                  <canvas id="chartMembresias"></canvas>
                </div>
              </div>
            </div>
          </div>
        `;

        // 1. INYECTAR GRÁFICO DE DONA (MÉTODOS DE PAGO)
        const ctxMetodos = document.getElementById('chartMetodos');
        if (data.ingresosPorMetodo && data.ingresosPorMetodo.length > 0) {
          new Chart(ctxMetodos, {
            type: 'doughnut',
            data: {
              labels: data.ingresosPorMetodo.map(i => i.metodo),
              datasets: [{
                data: data.ingresosPorMetodo.map(i => i.total),
                backgroundColor: ['#ffc107', '#0dcaf0', '#198754', '#dc3545', '#6f42c1'],
                borderColor: '#212529',
                borderWidth: 2
              }]
            },
            options: { plugins: { legend: { labels: { color: 'white' } } }, maintainAspectRatio: false }
          });
        } else {
          ctxMetodos.parentElement.innerHTML = '<p class="text-muted text-center mt-5">No hay datos de pagos para graficar.</p>';
        }

        // 2. INYECTAR GRÁFICO DE BARRAS (MEMBRESÍAS)
        const ctxMembresias = document.getElementById('chartMembresias');
        if (data.membresiasPopulares && data.membresiasPopulares.length > 0) {
          new Chart(ctxMembresias, {
            type: 'bar',
            data: {
              labels: data.membresiasPopulares.map(m => m.nombre),
              datasets: [{
                label: 'Cantidad Vendida',
                data: data.membresiasPopulares.map(m => m.cantidad),
                backgroundColor: '#0dcaf0',
                borderRadius: 4
              }]
            },
            options: {
              scales: {
                y: { beginAtZero: true, ticks: { color: 'white', stepSize: 1 } },
                x: { ticks: { color: 'white' } }
              },
              plugins: { legend: { labels: { color: 'white' } } },
              maintainAspectRatio: false
            }
          });
        } else {
          ctxMembresias.parentElement.innerHTML = '<p class="text-muted text-center mt-5">No hay membresías vendidas para graficar.</p>';
        }

      } else {
        throw new Error("Error en la respuesta del servidor");
      }
    } catch(e) {
      console.error(e);
      contenedorDinamico.innerHTML = '<div class="alert alert-danger mt-4 text-center border-danger bg-dark text-danger"><i class="bi bi-exclamation-triangle-fill"></i> Error al generar reportes gráficos. Verifica la conexión a la base de datos.</div>';
    }

  } else {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = `
      <div class="text-center py-5 mt-5">
          <i class="bi bi-tools fs-1 text-secondary mb-3"></i>
          <h3 class="text-white fw-bold">Módulo de ${modulo.toUpperCase()}</h3>
          <p class="text-white fs-5 mt-3">Conectado a BDD. Interfaz en construcción.</p>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("Dashboard cargado.");
  cargarModulo('resumen');
});

async function cambiarEstadoUsuario(id, nuevoEstado, moduloActual) {
  if(!confirm(`¿Estás seguro de que deseas ${nuevoEstado ? 'activar' : 'desactivar'} este usuario?`)) return;

  try {
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios/${id}/estado?activo=${nuevoEstado}`, {
      method: 'PUT'
    });
    if(res.ok) {
      cargarModulo(moduloActual);
    } else {
      alert('Hubo un error al actualizar el estado.');
    }
  } catch(e) {
    console.error(e);
    alert('Error de conexión al servidor.');
  }
}

// ==========================================
// MODAL DE CREACIÓN Y EDICIÓN
// ==========================================
const myModal = new bootstrap.Modal(document.getElementById('modalUsuario'));

function abrirModalNuevo() {
  document.getElementById('formUsuario').reset();
  document.getElementById('userId').value = '';
  document.getElementById('modalTitulo').innerText = 'Nuevo Usuario';
  document.getElementById('passHint').innerText = '(Obligatoria)';
  myModal.show();
}

function abrirModalEditar(id, usuario, nombre, apellido, rolTexto, email, telefono) {
  document.getElementById('formUsuario').reset();
  document.getElementById('userId').value = id;
  document.getElementById('userUsername').value = usuario;
  document.getElementById('userNombre').value = nombre !== 'null' ? nombre : '';
  document.getElementById('userApellido').value = apellido !== 'null' ? apellido : '';

  document.getElementById('userEmail').value = (email !== 'null' && email !== 'undefined') ? email : '';
  document.getElementById('userTelefono').value = (telefono !== 'null' && telefono !== 'undefined') ? telefono : '';

  const rolesMap = { 'Administrador': 1, 'Recepcionista': 2, 'Entrenador': 3, 'Cliente': 4 };
  document.getElementById('userRol').value = rolesMap[rolTexto] || 4;

  document.getElementById('modalTitulo').innerText = 'Editar Usuario #' + id;
  document.getElementById('passHint').innerText = '(Déjela en blanco para no cambiarla)';
  myModal.show();
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
    alert("La contraseña es obligatoria para usuarios nuevos (min 5 caracteres).");
    return;
  }

  const url = isEdit
    ? `https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios/${id}`
    : `https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios`;
  const metodo = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(uData)
    });

    if (res.ok) {
      myModal.hide();
      const moduloActivo = document.querySelector('#sidebarMenu .nav-link.active').innerText.trim().toLowerCase();

      if(moduloActivo.includes('cliente')) cargarModulo('clientes');
      else if(moduloActivo.includes('entrenador')) cargarModulo('entrenadores');
      else if(moduloActivo.includes('recepcionista')) cargarModulo('recepcionistas');
      else if(moduloActivo.includes('administrador')) cargarModulo('administradores');

    } else {
      alert('Error al guardar. Verifique que el usuario o correo no estén repetidos.');
    }
  } catch (e) {
    alert('Error conectando al servidor.');
  }
}
