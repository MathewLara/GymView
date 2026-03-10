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
  // Se quitó el título de 'usuarios'
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
      // ¡AQUÍ CAMBIAMOS A LA NUEVA RUTA LIMPIA!
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/admin/dashboard');

      if(res.ok) {
        const data = await res.json();

        // Rellenar las tarjetas (KPIs)
        document.getElementById('kpi-cuentas').innerText = data.totalCuentas;
        document.getElementById('kpi-ingresos1').innerText = '$ ' + parseFloat(data.ingresos).toFixed(2);
        document.getElementById('kpi-entrenadores1').innerText = data.totalEntrenadores;

        // Rellenar la Tabla de "Últimos Accesos" / Actividad Reciente
        const tbody = document.querySelector('.table tbody'); // Busca el cuerpo de tu tabla
        if (tbody && data.ultimosAccesos) {
          tbody.innerHTML = data.ultimosAccesos.map(acc => `
                <tr>
                    <td class="fw-bold">${acc.usuario}</td>
                    <td class="text-success">${acc.accion}</td>
                    <td class="text-muted">${acc.fecha}</td>
                    <td><span class="badge bg-success">Completado</span></td>
                </tr>
            `).join('');
        }

      }
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    }
  } else if (modulo === 'clientes' || modulo === 'entrenadores') {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div><p class="text-white mt-2">Cargando directorio...</p></div>';

    try {
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios');
      if (res.ok) {
        const todosLosUsuarios = await res.json();

        let usuariosFiltrados = [];
        let tituloTabla = "";

        // SE ELIMINÓ LA LÓGICA DE 'usuarios' AQUÍ
        if (modulo === 'clientes') {
          usuariosFiltrados = todosLosUsuarios.filter(u => u.rol === 'Cliente');
          tituloTabla = "Directorio de Clientes";
        } else if (modulo === 'entrenadores') {
          usuariosFiltrados = todosLosUsuarios.filter(u => u.rol === 'Entrenador');
          tituloTabla = "Directorio de Entrenadores";
        }

        let filas = usuariosFiltrados.map(u => `
          <tr>
            <td class="text-light">#${u.id}</td>
            <td class="fw-bold text-white">${u.usuario}</td>
            <td class="text-white">${u.nombre} ${u.apellido}</td>
            <td><span class="badge bg-secondary">${u.rol}</span></td>
            <td>${u.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-danger">Inactivo</span>'}</td>
            <td>
              <button class="btn btn-sm ${u.activo ? 'btn-outline-danger' : 'btn-outline-success'} me-2" onclick="cambiarEstadoUsuario(${u.id}, ${!u.activo}, '${modulo}')">
                <i class="bi ${u.activo ? 'bi-trash' : 'bi-check-circle'}"></i> ${u.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button class="btn btn-sm btn-outline-info" onclick="abrirModalEditar(${u.id}, '${u.usuario}', '${u.nombre}', '${u.apellido}', '${u.rol}')"><i class="bi bi-pencil"></i></button>
            </td>
          </tr>
        `).join('');

        if (filas === '') {
          filas = `<tr><td colspan="6" class="text-center py-4 text-white">No hay registros en esta categoría.</td></tr>`;
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
          <p class="text-white fs-5 mt-3">Conectado a BDD. Interfaz en construcción.</p>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("Dashboard cargado (Restricción desactivada).");
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

function abrirModalEditar(id, usuario, nombre, apellido, rolTexto) {
  document.getElementById('formUsuario').reset();
  document.getElementById('userId').value = id;
  document.getElementById('userUsername').value = usuario;
  document.getElementById('userNombre').value = nombre !== 'null' ? nombre : '';
  document.getElementById('userApellido').value = apellido !== 'null' ? apellido : '';

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
    contrasena: document.getElementById('userPass').value
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
      // SE ELIMINÓ EL REDIRECCIONAMIENTO A 'staff' AQUI
      if(moduloActivo.includes('cliente')) cargarModulo('clientes');
      else if(moduloActivo.includes('entrenador')) cargarModulo('entrenadores');
    } else {
      alert('Error al guardar. Verifique que el usuario no esté repetido.');
    }
  } catch (e) {
    alert('Error conectando al servidor.');
  }
}
