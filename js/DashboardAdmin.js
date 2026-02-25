// Función enlazada al botón "Salir"
function cerrarSesion() {
  // Elimina las credenciales del almacenamiento
  localStorage.removeItem('tokenGimnasio');
  // Opcional: limpiar también los datos del usuario
  sessionStorage.removeItem('usuarioLogueado');
  // Redirige al inicio de sesión
  window.location.href = 'index.html';
}

// ==========================================
// NAVEGACIÓN DINÁMICA DEL DASHBOARD (SPA)
// ==========================================

// Función que cambia el contenido visible según la opción clickeada en el menú lateral
async function cargarModulo(modulo, elementoHTML) {
  const tituloMap = { 'resumen': 'Panel de Control Gerencial', 'usuarios': 'Gestión de Staff' };
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

    // Mostramos un spinner mientras la base de datos responde
    vistaResumen.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div><h5 class="text-white mt-3">Calculando métricas reales...</h5></div>';

    try {
      // AQUÍ OCURRE LA MAGIA: Petición real a tu base de datos en Render
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/dashboard');

      if(res.ok) {
        const data = await res.json();

        // Inyectamos las tarjetas con los números devueltos por tu Java
        vistaResumen.innerHTML = `
          <div class="row g-4 mb-4">
              <div class="col-md-4">
                  <div class="card bg-dark border-warning p-4 shadow-sm" style="border-radius: 15px;">
                      <h6 class="text-muted fw-bold">INGRESOS TOTALES (BDD)</h6>
                      <h2 class="text-white fw-bold">$ ${data.ingresos.toFixed(2)}</h2>
                  </div>
              </div>
              <div class="col-md-4">
                  <div class="card bg-dark border-info p-4 shadow-sm" style="border-radius: 15px;">
                      <h6 class="text-muted fw-bold">CLIENTES REGISTRADOS</h6>
                      <h2 class="text-white fw-bold">${data.totalClientes} <i class="bi bi-people-fill text-info fs-4 float-end"></i></h2>
                  </div>
              </div>
              <div class="col-md-4">
                  <div class="card bg-dark border-danger p-4 shadow-sm" style="border-radius: 15px;">
                      <h6 class="text-muted fw-bold">ENTRENADORES EN NÓMINA</h6>
                      <h2 class="text-white fw-bold">${data.totalEntrenadores} <i class="bi bi-person-badge text-danger fs-4 float-end"></i></h2>
                  </div>
              </div>
          </div>
        `;
      }
    } catch (e) {
      vistaResumen.innerHTML = '<h5 class="text-danger mt-4 text-center">Error al conectar con la base de datos.</h5>';
    }
  } else if (modulo === 'usuarios') {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div><p class="text-white mt-2">Cargando personal...</p></div>';

    try {
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios');
      if (res.ok) {
        const usuarios = await res.json();

        // Generamos las filas de la tabla
        let filas = usuarios.map(u => `
          <tr>
            <td class="text-muted">#${u.id}</td>
            <td class="fw-bold text-white">${u.usuario}</td>
            <td>${u.nombre} ${u.apellido}</td>
            <td><span class="badge bg-secondary">${u.rol}</span></td>
            <td>${u.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-danger">Inactivo</span>'}</td>
            <td>
              <button class="btn btn-sm ${u.activo ? 'btn-outline-danger' : 'btn-outline-success'} me-2" onclick="cambiarEstadoUsuario(${u.id}, ${!u.activo})">
                <i class="bi ${u.activo ? 'bi-trash' : 'bi-check-circle'}"></i> ${u.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button class="btn btn-sm btn-outline-info" onclick="alert('Próximo paso: Abrir modal de edición')"><i class="bi bi-pencil"></i></button>
            </td>
          </tr>
        `).join('');

        // Inyectamos la tabla en el HTML
        contenedorDinamico.innerHTML = `
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="text-white m-0">Directorio de Usuarios</h4>
            <button class="btn btn-warning fw-bold" onclick="alert('Próximo paso: Modal nuevo usuario')"><i class="bi bi-plus-lg"></i> Agregar Usuario</button>
          </div>
          <div class="card bg-dark border-secondary shadow-sm" style="border-radius: 10px; overflow: hidden;">
            <div class="table-responsive">
              <table class="table table-dark table-hover mb-0 align-middle">
                <thead class="text-muted">
                  <tr><th>ID</th><th>USUARIO</th><th>NOMBRE COMPLETO</th><th>ROL</th><th>ESTADO</th><th>ACCIONES</th></tr>
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

  } else {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = `
      <div class="text-center py-5 mt-5">
          <i class="bi bi-tools fs-1 text-secondary mb-3"></i>
          <h3 class="text-white fw-bold">Módulo de ${modulo.toUpperCase()}</h3>
          <p class="text-muted">Conectado a BDD. Interfaz en construcción.</p>
      </div>
    `;
  }
}

// Se ejecuta automáticamente en cuanto el HTML termina de cargar
document.addEventListener('DOMContentLoaded', () => {
  console.log("Dashboard cargado (Restricción desactivada).");
  cargarModulo('resumen');
});

// Función para el Eliminado Lógico / Reactivación
async function cambiarEstadoUsuario(id, nuevoEstado) {
  if(!confirm(`¿Estás seguro de que deseas ${nuevoEstado ? 'activar' : 'desactivar'} este usuario?`)) return;

  try {
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios/${id}/estado?activo=${nuevoEstado}`, {
      method: 'PUT'
    });

    if(res.ok) {
      // Recargamos el módulo para ver los cambios instantáneamente
      cargarModulo('usuarios');
    } else {
      alert('Hubo un error al actualizar el estado.');
    }
  } catch(e) {
    console.error(e);
    alert('Error de conexión al servidor.');
  }
}
