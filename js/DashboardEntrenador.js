let globalData = null;
let tomSelectNuevoAlumno = null; // Variable para el buscador mágico de alumnos
let modalAlumnoInstance = null;

// ID fijo para que funcione directo sin iniciar sesión (Modo Desarrollo)
const idEntrenador = 1;

document.addEventListener('DOMContentLoaded', () => {
  console.log("Dashboard Entrenador cargado. Modo Desarrollo (Sin Sesión).");

  const modAl = document.getElementById('modalAlumno');
  if(modAl) modalAlumnoInstance = new bootstrap.Modal(modAl);

  cargarDashboard(idEntrenador);
});

// ==========================================
// CONTROL DEL MENÚ RESPONSIVE
// ==========================================
function toggleMenu() {
  document.getElementById('sidebarCoach').classList.toggle('mostrar');
  document.querySelector('.overlay').classList.toggle('mostrar');
}

function salir() {
  if(confirm("¿Seguro que deseas cerrar sesión?")) {
    localStorage.removeItem('tokenGimnasio');
    localStorage.removeItem('usuarioLogueado');
    window.location.href = 'index.html';
  }
}

// ==========================================
// CARGA DEL DASHBOARD PRINCIPAL
// ==========================================
async function cargarDashboard(id) {
  try {
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/${id}/dashboard`);
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
    // Busca los usuarios que sean clientes de la base de datos general
    const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/usuarios');
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

  if(!idCliente) { alert("Debes seleccionar un alumno válido."); return; }

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
      alert(`Alumno ${isEdit ? 'actualizado' : 'vinculado'} exitosamente a tu cartera.`);
      modalAlumnoInstance.hide();
      cargarDashboard(idEntrenador); // Recargamos para ver los cambios
    } else {
      alert("Error al guardar en la base de datos.");
    }
  } catch(e) { console.error(e); alert("Error de conexión al servidor."); }
}

async function eliminarAlumno(idCliente) {
  if(confirm("¿Estás seguro de que deseas desvincular a este alumno de tu supervisión? (No se borrará su cuenta, solo dejará de ser tu alumno).")) {
    try {
      const url = `https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/${idEntrenador}/alumnos/${idCliente}`;
      const res = await fetch(url, { method: 'DELETE' });
      if(res.ok) {
        alert("Alumno desvinculado con éxito.");
        cargarDashboard(idEntrenador);
      } else {
        alert("Error al intentar desvincular al alumno.");
      }
    } catch(e) { console.error(e); }
  }
}

// ==========================================
// 2. LÓGICA DE BIBLIOTECA DE RUTINAS
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

function abrirModalCrear() {
  document.getElementById('modalTitulo').textContent = "Nueva Rutina";
  document.getElementById('hdnIdRutina').value = "";
  document.getElementById('formRutina').reset();
  new bootstrap.Modal(document.getElementById('modalRutina')).show();
}

function prepararEdicionRutina(idRutina) {
  const rutina = globalData.listaRutinas.find(r => r.id === idRutina);
  if(!rutina) return;

  document.getElementById('modalTitulo').textContent = "Editar Rutina";
  document.getElementById('hdnIdRutina').value = idRutina;
  document.getElementById('txtNombreRutina').value = rutina.nombre;

  // Marcar los ejercicios seleccionados
  [1,2,3,4].forEach(id => {
    document.getElementById('ej'+id).checked = (rutina.idsEjercicios || []).includes(id);
  });

  new bootstrap.Modal(document.getElementById('modalRutina')).show();
}

async function guardarRutina() {
  const idRutina = document.getElementById('hdnIdRutina').value;

  const payload = {
    nombreRutina: document.getElementById('txtNombreRutina').value,
    idsEjercicios: []
  };
  if(document.getElementById('ej1').checked) payload.idsEjercicios.push(1);
  if(document.getElementById('ej2').checked) payload.idsEjercicios.push(2);
  if(document.getElementById('ej3').checked) payload.idsEjercicios.push(3);
  if(document.getElementById('ej4').checked) payload.idsEjercicios.push(4);

  if(!payload.nombreRutina || payload.idsEjercicios.length === 0) { alert("Completa el nombre y selecciona al menos un ejercicio."); return; }

  let url = `https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/${idEntrenador}/crearRutina`;
  let metodo = 'POST';

  if(idRutina) {
    url = `https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/rutinas/${idRutina}`;
    metodo = 'PUT';
  }

  try {
    const res = await fetch(url, { method: metodo, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if(res.ok) { alert("✅ Rutina guardada con éxito!"); location.reload(); }
    else alert("Error al guardar la rutina");
  } catch(e) { console.error("Error al comunicarse con el API:", e); }
}

async function desactivar(id) {
  if(confirm("¿Mover a la papelera?")) {
    try {
      await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/rutinas/${id}`, { method: 'DELETE' });
      location.reload();
    } catch(e) { console.error(e); }
  }
}

async function reactivar(id) {
  if(confirm("¿Restaurar esta rutina?")) {
    try {
      await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/rutinas/${id}/reactivar`, { method: 'PUT' });
      location.reload();
    } catch(e) { console.error(e); }
  }
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
    cargarAgenda(idEntrenador);
  }
}

function actualizarFecha() {
  const f = new Date();
  const m = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  document.getElementById('agenda-dia').textContent = f.getDate();
  document.getElementById('agenda-mes-ano').textContent = `${m[f.getMonth()]} ${f.getFullYear()}`;
}

async function cargarAgenda(id) {
  try {
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/${id}/agenda`);
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
