let globalData = null;
let tomSelectNuevoAlumno = null; // Variable para el buscador mágico de alumnos
let modalAlumnoInstance = null;
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
      // 1. DESTRUIMOS LOS DATOS PRIMERO
      localStorage.removeItem('usuarioLogueado');
      localStorage.removeItem('tokenGimnasio');
      localStorage.removeItem('loginTime');

      Swal.fire({
        icon: 'warning',
        title: 'Sesión Expirada',
        text: 'Por seguridad, debes iniciar sesión nuevamente tras 30 minutos de inactividad.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#ffc107',
        background: '#1e1e1e',
        color: '#ffffff',
        allowOutsideClick: false
      }).then(() => {
        window.location.replace('index.html');
      });
    }
  }
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

// Revisamos cada minuto
setInterval(verificarInactividad, 60000);
verificarInactividad();

// ==========================================
// VARIABLES GLOBALES DINÁMICAS
// ==========================================
let idEntrenador = 1; // Valor por defecto restaurado (Modo desarrollo / Fallback)
let idEmpresaLogueada = 1;
let modalEjercicioInstance = null;


document.addEventListener('DOMContentLoaded', () => {

  const modEj = document.getElementById('modalEjercicio');
  if(modEj) modalEjercicioInstance = new bootstrap.Modal(modEj);

  console.log("Dashboard Entrenador cargado.");

  // Extraer datos reales de sesión cubriendo todas las variables posibles del Backend
  const usuarioStr = localStorage.getItem('usuarioLogueado');
  if (usuarioStr) {
    const usuario = JSON.parse(usuarioStr);
    idEntrenador = usuario.idUsuario || usuario.id_usuario || usuario.id || 1;
  }

  idEmpresaLogueada = localStorage.getItem('id_empresa') || 1;

  const modAl = document.getElementById('modalAlumno');
  if(modAl) modalAlumnoInstance = new bootstrap.Modal(modAl);

  // Cargamos el dashboard pasando el id del entrenador y la empresa
  cargarDashboard(idEntrenador, idEmpresaLogueada);
});

// ==========================================
// CONTROL DEL MENÚ RESPONSIVE
// ==========================================
function toggleMenu() {
  document.getElementById('sidebarCoach').classList.toggle('mostrar');
  document.querySelector('.overlay').classList.toggle('mostrar');
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

// ==========================================
// CARGA DEL DASHBOARD PRINCIPAL
// ==========================================
async function cargarDashboard(id, idEmpresa) {
  try {
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/${id}/dashboard?idEmpresa=${idEmpresa}`);
    if(res.ok) {
      globalData = await res.json();

      // A. Cabecera y Contadores
      document.getElementById('lbl-nombre').textContent = globalData.nombre || 'Entrenador';
      document.getElementById('lbl-especialidad').textContent = globalData.especialidad || 'Fuerza';
      document.getElementById('num-alumnos').textContent = globalData.totalAlumnos || 0;
      document.getElementById('num-rutinas').textContent = globalData.rutinasCreadas || 0;

      // B. Tabla Clientes (CON BOTONES DE EDITAR Y ELIMINAR)
      const tablaCli = document.getElementById('tabla-clientes');
      if (globalData.listaAlumnos && globalData.listaAlumnos.length > 0) {
        tablaCli.innerHTML = globalData.listaAlumnos.map(al => `
              <tr>
                  <td>
                      <div class="d-flex align-items-center">
                          <div class="rounded-circle me-3 d-flex justify-content-center align-items-center text-white fw-bold"
                               style="width:35px;height:35px; background-color: ${al.terminoHoy ? '#198754' : '#6c757d'}; flex-shrink: 0;">
                               ${al.terminoHoy ? '<i class="bi bi-check-lg"></i>' : (al.nombre ? al.nombre.charAt(0) : 'U')}
                          </div>
                          <div>${al.nombre || 'Usuario'} ${al.terminoHoy ? '<span class="badge bg-success ms-2">¡TERMINÓ!</span>' : ''}</div>
                      </div>
                  </td>
                  <td><span class="badge ${al.plan?.includes('Black') ? 'bg-warning text-dark' : 'bg-info'}">${al.plan || 'Base'}</span></td>
                  <td><small class="text-light">${al.rutina || 'Sin rutina asignada'}</small></td>
                  <td>
                    <button class="btn btn-sm btn-outline-info me-1" onclick="editarAlumno(${al.idCliente}, '${al.nombre}', '${al.idRutina || ''}')" title="Editar Rutina"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarAlumno(${al.idCliente})" title="Desvincular"><i class="bi bi-trash"></i></button>
                  </td>
              </tr>`).join('');
      } else {
        tablaCli.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">Aún no tienes alumnos a tu cargo.</td></tr>`;
      }

      // C. Listas Resumen de Rutinas
      document.getElementById('lista-rutinas-dash').innerHTML = (globalData.listaRutinas || []).slice(0,5).map(r =>
        `<li class="list-group-item bg-transparent text-white border-secondary d-flex justify-content-between align-items-center px-0"><span>${r.nombre}</span> <i class="bi bi-chevron-right text-light"></i></li>`).join('');

      renderizarRutinas();
    } else {
      console.error("Error al cargar el dashboard.");
    }
  } catch(e) {
    console.error("Error de conexión:", e);
  }
}

// ==========================================
// 1. MÓDULO DE GESTIÓN DE ALUMNOS (NUEVO)
// ==========================================

async function abrirModalAlumno() {
  const select = document.getElementById('selNuevoAlumno');
  const selRutina = document.getElementById('selRutinaAsignar');

  document.getElementById('modalAlumnoTitulo').textContent = "Vincular Nuevo Alumno";
  document.getElementById('hdnIdVinculo').value = "";
  document.getElementById('formAlumno').reset();

  if (tomSelectNuevoAlumno) {
    tomSelectNuevoAlumno.destroy();
    tomSelectNuevoAlumno = null;
  }
  select.innerHTML = '<option value="" disabled selected>Cargando clientes...</option>';
  select.disabled = false; // Habilitar selector

  // Cargar las rutinas del entrenador en el selector
  selRutina.innerHTML = '<option value="">Ninguna (Dejar en blanco)</option>';
  if(globalData && globalData.listaRutinas) {
    globalData.listaRutinas.forEach(r => {
      if(r.activa) selRutina.innerHTML += `<option value="${r.id}">${r.nombre}</option>`;
    });
  }

  modalAlumnoInstance.show();

  try {
    // Busca los usuarios que sean clientes pero filtrados por sucursal
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios?idEmpresa=${idEmpresaLogueada}`);
    if(res.ok) {
      const usuarios = await res.json();
      const clientes = usuarios.filter(u => u.rol === 'Cliente' && u.activo === true);

      if(clientes.length > 0) {
        select.innerHTML = '<option value="">🔍 Buscar por nombre...</option>';
        clientes.forEach(c => {
          select.innerHTML += `<option value="${c.id}">${c.nombre} ${c.apellido}</option>`;
        });
        tomSelectNuevoAlumno = new TomSelect("#selNuevoAlumno", {
          create: false, sortField: { field: "text", direction: "asc" },
          placeholder: "🔍 Escribe el nombre del cliente..."
        });
      } else {
        select.innerHTML = '<option value="" disabled selected>No hay clientes disponibles</option>';
      }
    }
  } catch(e) { console.error(e); }
}

function editarAlumno(idCliente, nombre, idRutinaAsignada) {
  document.getElementById('modalAlumnoTitulo').textContent = `Editar Alumno: ${nombre}`;
  document.getElementById('hdnIdVinculo').value = idCliente;
  document.getElementById('formAlumno').reset();

  const select = document.getElementById('selNuevoAlumno');
  if (tomSelectNuevoAlumno) { tomSelectNuevoAlumno.destroy(); tomSelectNuevoAlumno = null; }

  // En edición, no cambiamos el alumno, solo le cambiamos la rutina
  select.innerHTML = `<option value="${idCliente}" selected>${nombre}</option>`;
  select.disabled = true;

  const selRutina = document.getElementById('selRutinaAsignar');
  selRutina.innerHTML = '<option value="">Ninguna (Dejar en blanco)</option>';
  if(globalData && globalData.listaRutinas) {
    globalData.listaRutinas.forEach(r => {
      if(r.activa) {
        const isSelected = (r.id == idRutinaAsignada) ? 'selected' : '';
        selRutina.innerHTML += `<option value="${r.id}" ${isSelected}>${r.nombre}</option>`;
      }
    });
  }

  modalAlumnoInstance.show();
}

async function guardarAlumno() {
  const idCliente = document.getElementById('selNuevoAlumno').value;
  const idRutina = document.getElementById('selRutinaAsignar').value;
  const notas = document.getElementById('txtNotasAlumno').value;

  if(!idCliente) {
    Swal.fire({ icon: 'warning', title: 'Atención', text: 'Debes seleccionar un alumno válido.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
    return;
  }

  // Aseguramos que los valores sean números reales para que Java no explote (Error 500)
  const idClienteNum = parseInt(idCliente);
  const idRutinaNum = (idRutina && idRutina !== "") ? parseInt(idRutina) : 0;

  const payload = {
    idCliente: idClienteNum,
    idEntrenador: idEntrenador,
    idRutinaAsignada: idRutinaNum,
    notas: notas || ""
  };

  try {
    const isEdit = document.getElementById('hdnIdVinculo').value !== "";
    const method = isEdit ? 'PUT' : 'POST';
    const url = `https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/${idEntrenador}/alumnos`;

    const res = await fetch(url, {
      method: method,
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });

    if(res.ok) {
      Swal.fire({
        icon: 'success',
        title: '¡Hecho!',
        text: `Alumno ${isEdit ? 'actualizado' : 'vinculado'} exitosamente a tu cartera.`,
        confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff'
      }).then(() => {
        modalAlumnoInstance.hide();
        cargarDashboard(idEntrenador, idEmpresaLogueada);
      });
    } else {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Error al guardar en la base de datos.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
    }
  } catch(e) {
    console.error(e);
    Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'No pudimos conectar con el servidor.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
  }
}

function eliminarAlumno(idCliente) {
  Swal.fire({
    icon: 'warning',
    title: '¿Desvincular alumno?',
    text: 'No se borrará su cuenta, solo dejará de ser tu alumno.',
    showCancelButton: true,
    confirmButtonText: 'Sí, desvincular',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc3545', // Rojo para peligro
    cancelButtonColor: '#6c757d',
    background: '#1e1e1e',
    color: '#ffffff'
  }).then(async (result) => {
    if(result.isConfirmed) {
      try {
        const url = `https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/${idEntrenador}/alumnos/${idCliente}`;
        const res = await fetch(url, { method: 'DELETE' });
        if(res.ok) {
          Swal.fire({ icon: 'success', title: 'Desvinculado', text: 'Alumno desvinculado con éxito.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' })
            .then(() => cargarDashboard(idEntrenador, idEmpresaLogueada));
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: 'Error al intentar desvincular al alumno.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
        }
      } catch(e) { console.error(e); }
    }
  });
}

// ==========================================
// 2. LÓGICA DE BIBLIOTECA DE RUTINAS (MODIFICADA)
// ==========================================
function renderizarRutinas() {
  if(!globalData) return;
  const verPapelera = document.getElementById('switchPapelera').checked;
  const lista = document.getElementById('lista-rutinas-full');

  const filtradas = (globalData.listaRutinas || []).filter(r => verPapelera ? !r.activa : r.activa);

  if(filtradas.length === 0) {
    lista.innerHTML = '<div class="text-center text-light p-4">No hay rutinas en esta sección.</div>';
    return;
  }

  lista.innerHTML = filtradas.map(r => `
          <div class="list-group-item bg-black text-white border-secondary mb-3 p-3 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center rounded gap-2 rutinas-item">
              <div>
                  <h6 class="mb-1 text-warning rutinas-titulo">${r.nombre}</h6>
                  <small class="text-light">${verPapelera ? 'ELIMINADA' : 'ACTIVA'}</small>
              </div>
              <div class="d-flex w-100 w-sm-auto justify-content-end mt-2 mt-sm-0">
                  ${verPapelera
    ? `<button class="btn btn-sm btn-outline-success" onclick="reactivar(${r.id})"><i class="bi bi-arrow-counterclockwise me-1"></i> Restaurar</button>`
    : `<button class="btn btn-sm btn-outline-info me-2" onclick="prepararEdicionRutina(${r.id})"><i class="bi bi-pencil"></i></button>
                       <button class="btn btn-sm btn-outline-danger" onclick="desactivar(${r.id})"><i class="bi bi-trash"></i></button>`
  }
              </div>
          </div>
      `).join('');
}

// Función NUEVA: Descarga los ejercicios de la BDD y dibuja los checkboxes
async function cargarEjerciciosModal(idsSeleccionados = []) {
  const contenedor = document.getElementById('contenedor-ejercicios-rutina');
  if(!contenedor) return;

  contenedor.innerHTML = '<div class="text-center text-light"><div class="spinner-border spinner-border-sm text-warning"></div> Cargando ejercicios...</div>';

  try {
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/ejercicios`);
    if (res.ok) {
      const ejercicios = await res.json();
      // Filtramos para que solo salgan los ejercicios que están "Activos" en la BDD
      const activos = ejercicios.filter(e => e.activo);

      if (activos.length === 0) {
        contenedor.innerHTML = '<div class="text-muted small">No hay ejercicios activos disponibles. Ve a la pestaña Ejercicios y crea algunos.</div>';
        return;
      }

      // Pintamos los checkboxes reales
      contenedor.innerHTML = activos.map(ej => `
              <div class="form-check mb-2">
                  <input class="form-check-input chk-ejercicio" type="checkbox" value="${ej.id}" id="ej_${ej.id}" ${idsSeleccionados.includes(ej.id) ? 'checked' : ''}>
                  <label class="form-check-label text-light" for="ej_${ej.id}">${ej.nombre} <small class="text-warning">(${ej.grupo})</small></label>
              </div>
          `).join('');
    } else {
      contenedor.innerHTML = '<div class="text-danger small">Error al cargar ejercicios de la BDD</div>';
    }
  } catch (error) {
    contenedor.innerHTML = '<div class="text-danger small">Error de red al conectar con el servidor</div>';
  }
}

function abrirModalCrear() {
  document.getElementById('modalTitulo').textContent = "Nueva Rutina";
  document.getElementById('hdnIdRutina').value = "";
  document.getElementById('formRutina').reset();

  // Llamamos a la función para cargar los checkboxes desde la BDD vacíos
  cargarEjerciciosModal([]);

  new bootstrap.Modal(document.getElementById('modalRutina')).show();
}

function prepararEdicionRutina(idRutina) {
  const rutina = globalData.listaRutinas.find(r => r.id === idRutina);
  if(!rutina) return;

  document.getElementById('modalTitulo').textContent = "Editar Rutina";
  document.getElementById('hdnIdRutina').value = idRutina;
  document.getElementById('txtNombreRutina').value = rutina.nombre;

  // Cargamos los ejercicios desde la BDD pasándole los IDs que ya estaban seleccionados
  cargarEjerciciosModal(rutina.idsEjercicios || []);

  new bootstrap.Modal(document.getElementById('modalRutina')).show();
}

async function guardarRutina() {
  const idRutina = document.getElementById('hdnIdRutina').value;

  const payload = {
    nombreRutina: document.getElementById('txtNombreRutina').value,
    idsEjercicios: []
  };

  // Buscamos dinámicamente qué checkboxes están marcados
  const checkboxes = document.querySelectorAll('.chk-ejercicio:checked');
  checkboxes.forEach(chk => {
    payload.idsEjercicios.push(parseInt(chk.value));
  });

  if(!payload.nombreRutina || payload.idsEjercicios.length === 0) {
    Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: 'Completa el nombre y selecciona al menos un ejercicio.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
    return;
  }

  let url = `https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/${idEntrenador}/crearRutina?idEmpresa=${idEmpresaLogueada}`;
  let metodo = 'POST';

  if(idRutina) {
    url = `https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/rutinas/${idRutina}?idEmpresa=${idEmpresaLogueada}`;
    metodo = 'PUT';
  }

  try {
    const res = await fetch(url, { method: metodo, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if(res.ok) {
      Swal.fire({ icon: 'success', title: '¡Guardada!', text: 'Rutina guardada con éxito.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' })
        .then(() => location.reload());
    } else {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Error al guardar la rutina', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
    }
  } catch(e) { console.error("Error al comunicarse con el API:", e); }
}

function desactivar(id) {
  Swal.fire({
    icon: 'warning',
    title: '¿Mover a la papelera?',
    text: 'Podrás restaurarla más tarde si lo necesitas.',
    showCancelButton: true,
    confirmButtonText: 'Sí, mover',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc3545', // Rojo
    cancelButtonColor: '#6c757d',
    background: '#1e1e1e',
    color: '#ffffff'
  }).then(async (result) => {
    if(result.isConfirmed) {
      try {
        await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/rutinas/${id}`, { method: 'DELETE' });
        location.reload();
      } catch(e) { console.error(e); }
    }
  });
}

function reactivar(id) {
  Swal.fire({
    icon: 'question',
    title: '¿Restaurar rutina?',
    text: 'Esta rutina volverá a estar disponible para asignarla.',
    showCancelButton: true,
    confirmButtonText: 'Sí, restaurar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#198754', // Verde para restaurar
    cancelButtonColor: '#6c757d',
    background: '#1e1e1e',
    color: '#ffffff'
  }).then(async (result) => {
    if(result.isConfirmed) {
      try {
        await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/rutinas/${id}/reactivar?idEmpresa=${idEmpresaLogueada}`, { method: 'PUT' });
        location.reload();
      } catch(e) { console.error(e); }
    }
  });
}

// ==========================================
// 3. AGENDA Y NAVEGACIÓN
// ==========================================
function ver(vista, btn) {
  document.getElementById('titulo-seccion').textContent =
    vista === 'agenda' ? 'Mi Agenda' : (vista === 'rutinas' ? 'Biblioteca' : (vista === 'clientes' ? 'Mis Alumnos' : 'Mi Tablero'));

  document.querySelectorAll('.vista').forEach(x => x.classList.remove('activa'));
  document.getElementById('vista-'+vista)?.classList.add('activa');

  if(btn) {
    document.querySelectorAll('.nav-link').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
  }

  if (window.innerWidth <= 768) {
    document.getElementById('sidebarCoach').classList.remove('mostrar');
    document.querySelector('.overlay').classList.remove('mostrar');
  }

  if(vista === 'agenda') {
    actualizarFecha();
    cargarAgenda(idEntrenador, idEmpresaLogueada);
  }
}

function actualizarFecha() {
  const f = new Date();
  const m = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  document.getElementById('agenda-dia').textContent = f.getDate();
  document.getElementById('agenda-mes-ano').textContent = `${m[f.getMonth()]} ${f.getFullYear()}`;
}

async function cargarAgenda(id, idEmpresa) {
  try {
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/${id}/agenda?idEmpresa=${idEmpresa}`);
    if(res.ok) {
      const agenda = await res.json();
      const cont = document.getElementById('lista-agenda-hoy');
      let c = 0, p = 0;

      if(agenda.length === 0) cont.innerHTML = '<div class="alert alert-dark text-center text-light p-4">No hay entrenamientos programados para hoy.</div>';
      else {
        cont.innerHTML = agenda.map(item => {
          if(item.terminoHoy) c++; else p++;
          return `
                      <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center p-3 mb-3 bg-black border-start border-4 ${item.terminoHoy?'border-success':'border-secondary'} rounded gap-2">
                          <div><h6 class="mb-1 ${item.terminoHoy?'text-success':'text-white'}">${item.nombre}</h6><small class="text-light">${item.rutina}</small></div>
                          <span class="badge ${item.terminoHoy?'bg-success':'bg-dark border border-secondary text-light'} align-self-end align-self-sm-center">${item.terminoHoy?'COMPLETADO':'PENDIENTE'}</span>
                      </div>`;
        }).join('');
      }
      document.getElementById('count-comp').textContent = c;
      document.getElementById('count-pend').textContent = p;
    }
  } catch(e) { console.error("Error al cargar la agenda:", e); }
}

// ==========================================
// 4. FUNCIONES DE BÚSQUEDA GENÉRICA
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

function filtrarLista(idLista, textoBusqueda) {
  const lista = document.getElementById(idLista);
  if (!lista) return;
  const items = lista.querySelectorAll('.rutinas-item');
  const texto = textoBusqueda.toLowerCase().trim();

  items.forEach(item => {
    // Buscamos solo en el título de la rutina
    const titulo = item.querySelector('.rutinas-titulo').innerText.toLowerCase();
    item.style.display = titulo.includes(texto) ? 'flex' : 'none';
  });
}

// ==========================================
// MÓDULO DE GESTIÓN DE EJERCICIOS (NUEVO)
// ==========================================

// Modificamos ligeramente la función 'ver' para que reconozca el título de Ejercicios
const oldVer = ver;
ver = function(vista, btn) {
  oldVer(vista, btn);
  if (vista === 'ejercicios') {
    document.getElementById('titulo-seccion').textContent = 'Base de Ejercicios';
    renderizarEjercicios(); // Cargamos la tabla al entrar a la vista
  }
}

// ==========================================
// MÓDULO DE GESTIÓN DE EJERCICIOS (CONECTADO AL BACKEND)
// ==========================================

async function renderizarEjercicios() {
  const tbody = document.getElementById('tabla-ejercicios');
  if (!tbody) return;

  // Mostramos el spinner mientras carga
  tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-warning"></div><p class="text-white mt-2">Cargando ejercicios...</p></td></tr>`;

  try {
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/ejercicios`);

    if (res.ok) {
      const ejercicios = await res.json();

      if (ejercicios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No hay ejercicios registrados en la base de datos.</td></tr>`;
        return;
      }

      tbody.innerHTML = ejercicios.map(ej => `
        <tr>
          <td class="text-white fw-bold">${ej.nombre}</td>
          <td class="text-info">${ej.grupo}</td>
          <td><span class="badge ${ej.activo ? 'bg-success' : 'bg-danger'}">${ej.activo ? 'Activo' : 'Inactivo'}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-info me-1" onclick="abrirModalEjercicio(${ej.id}, '${ej.nombre}', '${ej.grupo}')" title="Editar"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm ${ej.activo ? 'btn-outline-danger' : 'btn-outline-success'}" onclick="cambiarEstadoEjercicio(${ej.id}, ${!ej.activo})" title="${ej.activo ? 'Desactivar' : 'Activar'}">
              <i class="bi ${ej.activo ? 'bi-x-circle' : 'bi-check-circle'}"></i>
            </button>
          </td>
        </tr>
      `).join('');
    } else {
      // AQUÍ ESTÁ LA MAGIA: Si Render no encuentra el código Java, mostrará esto en lugar de girar infinito.
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle-fill"></i> Error del Servidor (Código ${res.status}). Java aún no está listo en Render.</td></tr>`;
    }
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger"><i class="bi bi-wifi-off"></i> Error de red. Tu navegador bloqueó la conexión o Render está caído.</td></tr>`;
  }
}

function abrirModalEjercicio(id = null, nombre = '', grupo = '') {
  document.getElementById('formEjercicio').reset();

  if (id) {
    document.getElementById('modalEjercicioTitulo').textContent = `Editar Ejercicio #${id}`;
    document.getElementById('hdnIdEjercicio').value = id;
    document.getElementById('txtNombreEjercicio').value = nombre;
    document.getElementById('selGrupoMuscular').value = grupo;
  } else {
    document.getElementById('modalEjercicioTitulo').textContent = "Nuevo Ejercicio";
    document.getElementById('hdnIdEjercicio').value = "";
  }

  if (modalEjercicioInstance) modalEjercicioInstance.show();
}

async function guardarEjercicio() {
  const id = document.getElementById('hdnIdEjercicio').value;
  const isEdit = id !== "";

  const nombre = document.getElementById('txtNombreEjercicio').value;
  const grupo = document.getElementById('selGrupoMuscular').value;

  if (!nombre || !grupo) {
    Swal.fire({ icon: 'warning', title: 'Atención', text: 'Completa todos los campos obligatorios.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
    return;
  }

  const payload = {
    nombre: nombre,
    grupo: grupo
  };

  const url = isEdit
    ? `https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/ejercicios/${id}`
    : `https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/ejercicios`;

  const metodo = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      Swal.fire({ icon: 'success', title: '¡Guardado!', text: 'El ejercicio ha sido guardado exitosamente.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
      if (modalEjercicioInstance) modalEjercicioInstance.hide();
      renderizarEjercicios(); // Recargar la tabla automáticamente
    } else {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar en la base de datos.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
    }
  } catch (error) {
    console.error(error);
    Swal.fire({ icon: 'error', title: 'Error de red', text: 'No pudimos conectar con el servidor.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
  }
}

function cambiarEstadoEjercicio(id, nuevoEstado) {
  const accion = nuevoEstado ? 'activar' : 'desactivar';

  Swal.fire({
    icon: 'warning',
    title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} ejercicio?`,
    text: nuevoEstado ? 'Este ejercicio volverá a estar disponible para armar rutinas.' : 'Este ejercicio ya no se podrá seleccionar para nuevas rutinas.',
    showCancelButton: true,
    confirmButtonText: `Sí, ${accion}`,
    cancelButtonText: 'Cancelar',
    confirmButtonColor: nuevoEstado ? '#198754' : '#dc3545',
    cancelButtonColor: '#6c757d',
    background: '#1e1e1e',
    color: '#ffffff'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/ejercicios/${id}/estado?activo=${nuevoEstado}`, { method: 'PUT' });
        if (res.ok) {
          Swal.fire({ icon: 'success', title: 'Estado actualizado', background: '#1e1e1e', color: '#ffffff', timer: 1500, showConfirmButton: false });
          renderizarEjercicios(); // Recargar la tabla
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar el estado.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
        }
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error de red', text: 'Error al conectar con el servidor.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
      }
    }
  });
}
