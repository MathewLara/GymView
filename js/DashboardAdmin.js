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
    'resumen': 'Panel de Control Gerencial',
    'pagos': 'Gestión de Ingresos y Facturación',
    'reportes': 'Reportes Gerenciales',
    'pedidos': 'Entregas de Tienda Online'
  };
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

    const kpiVencidas = document.getElementById('kpi-vencidas');
    if (kpiVencidas) kpiVencidas.innerText = '...';

    try {
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/admin/dashboard');

      if(res.ok) {
        const data = await res.json();

        document.getElementById('kpi-cuentas').innerText = data.totalCuentas || 0;
        document.getElementById('kpi-ingresos1').innerText = '$ ' + parseFloat(data.ingresos || 0).toFixed(2);
        document.getElementById('kpi-entrenadores1').innerText = data.totalEntrenadores || 0;

        if (kpiVencidas) kpiVencidas.innerText = data.membresiasVencidas || 0;

        const tbody = document.getElementById('tabla-accesos-body') || document.querySelector('.table tbody');

        if (tbody && data.ultimosAccesos && data.ultimosAccesos.length > 0) {
          tbody.innerHTML = data.ultimosAccesos.map(acc => {
            const colorEstado = acc.estado && acc.estado.toLowerCase().includes('exito') ? 'bg-success' : 'bg-danger';
            const horaMostrar = acc.horaIngreso ? acc.horaIngreso : (acc.hora ? acc.hora : '---');
            const ipMostrar = acc.ip ? acc.ip : '---';

            return `
                <tr>
                    <td class="fw-bold text-warning"><i class="bi bi-person-circle"></i> ${acc.usuario || 'Desconocido'}</td>
                    <td><span class="badge bg-secondary">${acc.rol || 'N/A'}</span></td>
                    <td class="text-white fw-bold">${horaMostrar}</td>
                    <td class="text-info fw-bold">${ipMostrar}</td>
                    <td><span class="badge ${colorEstado}">${acc.estado || 'N/A'}</span></td>
                </tr>
            `;
          }).join('');
        } else if (tbody) {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Aún no hay registros de acceso.</td></tr>';
        }
      }
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    }

    // ==========================================
    // MÓDULO DE USUARIOS (CRUD)
    // ==========================================
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
        `;
        }).join('');

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
    // MÓDULO DE PAGOS
    // ==========================================
  } else if (modulo === 'pagos') {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div><p class="text-white mt-2">Cargando base de datos financiera...</p></div>';

    try {
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/admin/pagos');

      if (res.ok) {
        const pagos = await res.json();
        const nombresPlanes = { 1: 'Plan Diario', 2: 'Plan Mensual Estándar', 3: 'Plan VIP Mensual', 4: 'Plan Anual' };

        const sociosUnicos = [...new Set(pagos.map(p => p.socio || 'Socio'))].sort();
        const opcionesSocios = sociosUnicos.map(s => `<option value="${s}">${s}</option>`).join('');

        let filas = pagos.map(p => `
          <tr class="fila-pago" data-socio="${p.socio || 'Socio'}" data-monto="${p.monto}">
            <td class="text-light fw-bold">#REC-${1000 + (p.id_pago || 0)}</td>
            <td class="text-white"><i class="bi bi-person-circle text-secondary me-2"></i>${p.socio || 'Socio'}</td>
            <td class="text-info">${nombresPlanes[p.id_plan] || 'Membresía'}</td>
            <td class="text-success fw-bold">+$${parseFloat(p.monto).toFixed(2)}</td>
            <td class="text-white small">${p.fecha}</td>
            <td><span class="badge bg-secondary">${p.metodo}</span></td>
            <td><span class="badge bg-success-subtle text-success border border-success"><i class="bi bi-check-all"></i> PAGADO</span></td>
          </tr>
        `).join('');

        if (filas === '') {
          filas = `<tr><td colspan="7" class="text-center py-5 text-muted">No se encontraron registros de pagos.</td></tr>`;
        }

        contenedorDinamico.innerHTML = `
          <div class="card bg-dark border-secondary shadow-lg mb-4" style="border-radius: 15px;">
            <div class="card-body p-4">
              <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                  <h4 class="text-white m-0 fw-bold"><i class="bi bi-currency-dollar text-warning"></i> Historial de Ventas</h4>
                  <p class="text-muted small m-0">Gestione y exporte los recibos de sus clientes</p>
                </div>
                <div class="d-flex gap-2 align-items-center">
                  <select id="filtroCliente" class="form-select bg-black text-white border-secondary" style="min-width: 200px;" onchange="filtrarPagosPorCliente()">
                      <option value="TODOS">Todos los clientes</option>
                      ${opcionesSocios}
                  </select>
                  <button class="btn btn-warning fw-bold" onclick="abrirModalPago()"><i class="bi bi-plus-lg"></i> Nuevo</button>
                  <button class="btn btn-outline-info fw-bold" onclick="exportarPagosCSV()">
                    <i class="bi bi-file-earmark-excel"></i> Exportar Informe
                  </button>
                </div>
              </div>

              <div class="table-responsive">
                <table id="tabla-pagos" class="table table-dark table-hover align-middle mb-0">
                  <thead class="bg-black text-warning">
                    <tr>
                      <th class="py-3">N° RECIBO</th>
                      <th class="py-3">CLIENTE / SOCIO</th>
                      <th class="py-3">CONCEPTO</th>
                      <th class="py-3">IMPORTE</th>
                      <th class="py-3">FECHA</th>
                      <th class="py-3">MÉTODO</th>
                      <th class="py-3">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody>${filas}</tbody>
                  <tfoot id="tfoot-resumen" class="bg-black">
                    <tr>
                        <td colspan="3" class="text-end fw-bold py-3">TOTAL FILTRADO:</td>
                        <td id="total-monto-tabla" class="text-success fw-bold fs-5 py-3">$0.00</td>
                        <td colspan="3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        `;
        filtrarPagosPorCliente();
      }
    } catch (error) {
      console.error(error);
      contenedorDinamico.innerHTML = '<div class="alert alert-danger">Error de conexión con el módulo financiero.</div>';
    }
    // ==========================================
    // MÓDULO DE PEDIDOS DE TIENDA (NUEVO)
    // ==========================================
  } else if (modulo === 'pedidos') {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div><p class="text-white mt-2">Buscando entregas pendientes...</p></div>';

    try {
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/ventas/pendientes');

      if (res.ok) {
        const pedidos = await res.json();

        let filas = pedidos.map(p => `
          <tr>
            <td class="text-light fw-bold">#${p.idFactura}</td>
            <td class="text-warning fw-bold"><i class="bi bi-person-badge"></i> ${p.nombreCliente || 'Cliente Web'}</td>

            <td class="text-white">${p.numeroFactura}</td>
            <td class="text-white small">${p.fechaEmision}</td>
            <td class="text-success fw-bold">$${parseFloat(p.totalPagado).toFixed(2)}</td>
            <td><span class="badge bg-warning text-dark"><i class="bi bi-clock-history"></i> PENDIENTE</span></td>
            <td>
              <button class="btn btn-sm btn-success fw-bold" onclick="marcarComoEntregado(${p.idFactura})">
                <i class="bi bi-box-seam"></i> Entregar
              </button>
            </td>
          </tr>
        `).join('');

        if (filas === '') {
          filas = `<tr><td colspan="6" class="text-center py-5 text-muted"><i class="bi bi-check2-circle fs-1 d-block mb-3"></i>No hay pedidos pendientes por entregar. ¡Todo al día!</td></tr>`;
        }

        contenedorDinamico.innerHTML = `
          <div class="card bg-dark border-secondary shadow-lg mb-4" style="border-radius: 15px;">
            <div class="card-body p-4">
              <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                  <h4 class="text-white m-0 fw-bold"><i class="bi bi-cart-check text-warning"></i> Entregas de Tienda</h4>
                  <p class="text-muted small m-0">Aquí aparecen los productos que los clientes ya pagaron online y vienen a retirar</p>
                </div>
              </div>

              <div class="table-responsive">
                <table class="table table-dark table-hover align-middle mb-0">
                  <thead class="bg-black text-warning">
                    <tr>
                      <th class="py-3">ID BASE</th>
                      <th class="py-3">CLIENTE</th> <th class="py-3">N° FACTURA</th>
                      <th class="py-3">FECHA COMPRA</th>
                      <th class="py-3">TOTAL PAGADO</th>
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
      } else {
        throw new Error("No se pudieron cargar los pedidos");
      }
    } catch (error) {
      console.error(error);
      contenedorDinamico.innerHTML = '<div class="alert alert-danger mt-4 text-center border-danger bg-dark text-danger">Error al conectar con la base de datos de ventas.</div>';
    }

    // ==========================================
    // MÓDULO DE REPORTES GERENCIALES
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

// ==========================================
// INICIALIZACIÓN Y VARIABLES GLOBALES
// ==========================================
let modalUsuarioInstance;
let modalPagoInstance;
let tomSelectSocio = null; // Variable para controlar la barra de búsqueda mágica

document.addEventListener('DOMContentLoaded', () => {
  console.log("Dashboard cargado.");
  cargarModulo('resumen');

  const modalEl = document.getElementById('modalUsuario');
  if(modalEl) { modalUsuarioInstance = new bootstrap.Modal(modalEl); }
});

// ==========================================
// FUNCIONES GLOBALES (USUARIOS)
// ==========================================

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

function abrirModalNuevo() {
  document.getElementById('formUsuario').reset();
  document.getElementById('userId').value = '';
  document.getElementById('modalTitulo').innerText = 'Nuevo Usuario';
  document.getElementById('passHint').innerText = '(Obligatoria)';
  if(modalUsuarioInstance) modalUsuarioInstance.show();
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
  if(modalUsuarioInstance) modalUsuarioInstance.show();
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
      if(modalUsuarioInstance) modalUsuarioInstance.hide();
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

// ==========================================
// FUNCIONES DE PAGO (BÚSQUEDA INTELIGENTE)
// ==========================================

async function abrirModalPago() {
  const selectSocio = document.getElementById('pagoSocio');

  if (!selectSocio) {
    alert("¡Falta el HTML del Modal de Pagos! Asegúrate de pegarlo en DashboardAdmin.html");
    return;
  }

  // 1. Destruimos la barra de búsqueda anterior si existe (para limpiar los datos)
  if (tomSelectSocio) {
    tomSelectSocio.destroy();
    tomSelectSocio = null;
  }

  selectSocio.innerHTML = '<option value="" disabled selected>Cargando socios...</option>';

  if(!modalPagoInstance) {
    const modalEl = document.getElementById('modalPago');
    modalPagoInstance = new bootstrap.Modal(modalEl);
  }

  document.getElementById('formPago').reset();
  modalPagoInstance.show();

  try {
    const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios');
    if(res.ok) {
      const usuarios = await res.json();
      const clientes = usuarios.filter(u => u.rol === 'Cliente' && u.activo === true);

      if(clientes.length > 0) {
        // Importante dejar el value vacío para que la barra actúe como Placeholder
        selectSocio.innerHTML = '<option value="">🔍 Buscar socio por nombre...</option>';
        clientes.forEach(c => {
          selectSocio.innerHTML += `<option value="${c.id}">${c.nombre} ${c.apellido} (@${c.usuario})</option>`;
        });

        // 2. ¡MAGIA! Convertimos el selector aburrido en una barra inteligente
        tomSelectSocio = new TomSelect("#pagoSocio", {
          create: false,
          sortField: {
            field: "text",
            direction: "asc"
          },
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
    alert("Por favor, selecciona un socio válido para proceder con el cobro.");
    return;
  }

  const precios = { "1": 5.00, "2": 30.00, "3": 50.00, "4": 300.00 };
  const montoCalculado = precios[plan];

  const payload = {
    idCliente: parseInt(socio),
    idPlan: parseInt(plan),
    monto: montoCalculado,
    metodo: metodo
  };

  try {
    const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/admin/pagos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if(res.ok && data.status === 'ok') {
      alert(`¡Pago procesado correctamente!\nMonto cobrado: $${montoCalculado.toFixed(2)}`);

      if(modalPagoInstance) modalPagoInstance.hide();
      cargarModulo('pagos');

    } else {
      alert("No se pudo procesar: " + (data.mensaje || "Error en el servidor"));
    }
  } catch(e) {
    alert("Error de conexión con el servidor al procesar el pago.");
  }
}

// ==========================================
// FILTRADO DINÁMICO Y CÁLCULO DE TOTALES
// ==========================================
function filtrarPagosPorCliente() {
  const seleccionado = document.getElementById('filtroCliente').value;
  const filas = document.querySelectorAll('.fila-pago');
  let total = 0;

  filas.forEach(fila => {
    const socioFila = fila.getAttribute('data-socio');
    const montoFila = parseFloat(fila.getAttribute('data-monto')) || 0;

    if (seleccionado === 'TODOS' || socioFila === seleccionado) {
      fila.style.display = '';
      total += montoFila;
    } else {
      fila.style.display = 'none';
    }
  });

  document.getElementById('total-monto-tabla').innerText = `$ ${total.toFixed(2)}`;
}

// ==========================================
// EXPORTAR INFORME PROFESIONAL (CSV ESTRUCTURADO)
// ==========================================
function exportarPagosCSV() {
  const filtro = document.getElementById('filtroCliente').value;
  const admin = JSON.parse(localStorage.getItem('usuarioLogueado'))?.usuario || "Administrador";
  const fechaHoy = new Date().toLocaleString();

  let csvRows = [];

  csvRows.push('"IRON FITNESS GYM - REPORTE GERENCIAL DE INGRESOS"');
  csvRows.push(`"Fecha de generación:","${fechaHoy}"`);
  csvRows.push(`"Generado por:","${admin}"`);
  csvRows.push(`"Filtro aplicado:","${filtro === 'TODOS' ? 'Consolidado General' : 'Cliente: ' + filtro}"`);
  csvRows.push("");

  csvRows.push('"N° RECIBO","CLIENTE","CONCEPTO","IMPORTE","FECHA","METODO","ESTADO"');

  const filas = document.querySelectorAll('.fila-pago');
  let totalSuma = 0;
  let contadorFila = 0;

  filas.forEach(fila => {
    if (fila.style.display !== 'none') {
      const cols = fila.querySelectorAll('td');
      const dataFila = Array.from(cols).map(c => `"${c.innerText.trim()}"`);
      csvRows.push(dataFila.join(','));

      const monto = parseFloat(fila.getAttribute('data-monto')) || 0;
      totalSuma += monto;
      contadorFila++;
    }
  });

  csvRows.push("");
  csvRows.push(`"RESUMEN DEL PERIODO"`);
  csvRows.push(`"Total Transacciones:","${contadorFila}"`);
  csvRows.push(`"MONTO TOTAL RECAUDADO:","$${totalSuma.toFixed(2)}"`);
  csvRows.push("");
  csvRows.push('"--- Fin del Reporte ---"');

  const csvString = csvRows.join('\n');
  const blob = new Blob(["\ufeff", csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  const nombreArchivo = `Reporte_Pagos_${filtro.replace(/\s+/g, '_')}_${new Date().getTime()}.csv`;
  link.setAttribute("download", nombreArchivo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
// ==========================================
// FUNCIÓN PARA ENTREGAR PEDIDOS DE TIENDA
// ==========================================
async function marcarComoEntregado(idFactura) {
  const confirmacion = confirm("¿Confirmas que ya entregaste físicamente los productos al cliente?");
  if (!confirmacion) return;

  try {
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/ventas/${idFactura}/entregar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.ok) {
      alert("¡Excelente! El producto ha sido marcado como entregado en el sistema.");
      cargarModulo('pedidos'); // Recargamos el módulo para que el pedido desaparezca
    } else {
      alert("Hubo un error al intentar actualizar el estado del pedido.");
    }
  } catch (error) {
    console.error("Error al actualizar:", error);
    alert("Error de conexión con el servidor de ventas.");
  }
}
