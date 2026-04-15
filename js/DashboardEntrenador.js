let globalData = null;

// ID fijo para que funcione directo sin iniciar sesión
const idEntrenador = 1;

document.addEventListener('DOMContentLoaded', () => {
  console.log("Dashboard Entrenador cargado. Modo Desarrollo (Sin Sesión).");

  // -- RESTRICCIÓN DE SESIÓN DESACTIVADA --
  /*
  const sesion = localStorage.getItem('usuarioLogueado');
  if (!sesion) {
    window.location.href = 'index.html';
    return;
  }
  */

  cargarDashboard(idEntrenador);
});

// ==========================================
// NUEVO: CONTROL DEL MENÚ RESPONSIVE
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

async function cargarDashboard(id) {
  try {
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/${id}/dashboard`);
    if(res.ok) {
      globalData = await res.json();

      // A. Cabecera y Contadores
      document.getElementById('lbl-nombre').textContent = globalData.nombre;
      document.getElementById('lbl-especialidad').textContent = globalData.especialidad;
      document.getElementById('num-alumnos').textContent = globalData.totalAlumnos;
      document.getElementById('num-rutinas').textContent = globalData.rutinasCreadas;

      // B. Tabla Clientes
      document.getElementById('tabla-clientes').innerHTML = globalData.listaAlumnos.map(al => `
                  <tr>
                      <td>
                          <div class="d-flex align-items-center">
                              <div class="rounded-circle me-3 d-flex justify-content-center align-items-center text-white fw-bold"
                                   style="width:35px;height:35px; background-color: ${al.terminoHoy ? '#198754' : '#6c757d'}; flex-shrink: 0;">
                                   ${al.terminoHoy ? '<i class="bi bi-check-lg"></i>' : al.nombre.charAt(0)}
                              </div>
                              <div>${al.nombre} ${al.terminoHoy ? '<span class="badge bg-success ms-2">¡TERMINÓ!</span>' : ''}</div>
                          </div>
                      </td>
                      <td><span class="badge ${al.plan?.includes('Black') ? 'bg-warning text-dark' : 'bg-info'}">${al.plan}</span></td>
                      <td><small class="text-light">${al.rutina}</small></td>
                  </tr>`).join('');

      // C. Listas
      document.getElementById('lista-rutinas-dash').innerHTML = globalData.listaRutinas.slice(0,5).map(r =>
        `<li class="list-group-item bg-transparent text-white border-secondary d-flex justify-content-between align-items-center px-0"><span>${r.nombre}</span> <i class="bi bi-chevron-right text-light"></i></li>`).join('');

      renderizarRutinas();
    } else {
      console.error("Error al cargar el dashboard: Respuesta no exitosa del servidor");
    }
  } catch(e) {
    console.error("Error de conexión con el servidor backend:", e);
  }
}

// --- 1. LÓGICA DE BIBLIOTECA (ACTIVOS / PAPELERA) ---
function renderizarRutinas() {
  if(!globalData) return;
  const verPapelera = document.getElementById('switchPapelera').checked;
  const lista = document.getElementById('lista-rutinas-full');

  const filtradas = globalData.listaRutinas.filter(r => verPapelera ? !r.activa : r.activa);

  if(filtradas.length === 0) {
    lista.innerHTML = '<div class="text-center text-light p-4">No hay rutinas aquí</div>';
    return;
  }

  lista.innerHTML = filtradas.map(r => `
          <div class="list-group-item bg-black text-white border-secondary mb-3 p-3 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center rounded gap-2">
              <div>
                  <h6 class="mb-1 text-warning">${r.nombre}</h6>
                  <small class="text-light">${verPapelera ? 'ELIMINADA' : 'ACTIVA'}</small>
              </div>
              <div class="d-flex w-100 w-sm-auto justify-content-end mt-2 mt-sm-0">
                  ${verPapelera
    ? `<button class="btn btn-sm btn-outline-success" onclick="reactivar(${r.id})"><i class="bi bi-arrow-counterclockwise me-1"></i> Restaurar</button>`
    : `<button class="btn btn-sm btn-outline-info me-2" onclick="prepararEdicion(${r.id})"><i class="bi bi-pencil"></i></button>
                       <button class="btn btn-sm btn-outline-danger" onclick="desactivar(${r.id})"><i class="bi bi-trash"></i></button>`
  }
              </div>
          </div>
      `).join('');
}

// --- 2. FUNCIONES CRUD ---

function abrirModalCrear() {
  document.getElementById('modalTitulo').textContent = "Nueva Rutina";
  document.getElementById('hdnIdRutina').value = "";
  document.getElementById('formRutina').reset();
  llenarSelectAlumnos();
  new bootstrap.Modal(document.getElementById('modalRutina')).show();
}

function prepararEdicion(idRutina) {
  const rutina = globalData.listaRutinas.find(r => r.id === idRutina);
  if(!rutina) return;

  document.getElementById('modalTitulo').textContent = "Editar Rutina";
  document.getElementById('hdnIdRutina').value = idRutina;
  document.getElementById('txtNombreRutina').value = rutina.nombre;

  llenarSelectAlumnos(rutina.idCliente);

  [1,2,3,4].forEach(id => {
    document.getElementById('ej'+id).checked = rutina.idsEjercicios.includes(id);
  });

  new bootstrap.Modal(document.getElementById('modalRutina')).show();
}

function llenarSelectAlumnos(seleccionado = null) {
  const sel = document.getElementById('selAlumno');
  sel.innerHTML = '';
  if(globalData && globalData.listaAlumnos && globalData.listaAlumnos.length > 0) {
    globalData.listaAlumnos.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.idCliente;
      opt.text = a.nombre;
      if(seleccionado === a.idCliente) opt.selected = true;
      sel.appendChild(opt);
    });
  } else { sel.innerHTML = '<option disabled>Sin alumnos</option>'; }
}

async function guardarRutina() {
  const idRutina = document.getElementById('hdnIdRutina').value;

  const payload = {
    idCliente: parseInt(document.getElementById('selAlumno').value),
    nombreRutina: document.getElementById('txtNombreRutina').value,
    idsEjercicios: []
  };
  if(document.getElementById('ej1').checked) payload.idsEjercicios.push(1);
  if(document.getElementById('ej2').checked) payload.idsEjercicios.push(2);
  if(document.getElementById('ej3').checked) payload.idsEjercicios.push(3);
  if(document.getElementById('ej4').checked) payload.idsEjercicios.push(4);

  if(!payload.nombreRutina || payload.idsEjercicios.length === 0) { alert("Completa los datos"); return; }

  let url = `https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/${idEntrenador}/crearRutina`;
  let metodo = 'POST';

  if(idRutina) {
    url = `https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/rutinas/${idRutina}`;
    metodo = 'PUT';
  }

  try {
    const res = await fetch(url, { method: metodo, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if(res.ok) { alert("✅ Guardado!"); location.reload(); }
    else alert("Error al guardar");
  } catch(e) { console.error("Error al comunicarse con el API:", e); }
}

async function desactivar(id) {
  if(confirm("¿Mover a papelera?")) {
    try {
      await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/rutinas/${id}`, { method: 'DELETE' });
      location.reload();
    } catch(e) { console.error("Error al eliminar:", e); }
  }
}

async function reactivar(id) {
  if(confirm("¿Restaurar rutina?")) {
    try {
      await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/entrenadores/rutinas/${id}/reactivar`, { method: 'PUT' });
      location.reload();
    } catch(e) { console.error("Error al restaurar:", e); }
  }
}

// --- 3. AGENDA Y NAVEGACIÓN ---
function ver(vista, btn) {
  document.getElementById('titulo-seccion').textContent =
    vista === 'agenda' ? 'Mi Agenda' : (vista === 'rutinas' ? 'Biblioteca' : 'Mi Tablero');

  document.querySelectorAll('.vista').forEach(x => x.classList.remove('activa'));
  document.getElementById('vista-'+vista)?.classList.add('activa');

  if(btn) {
    document.querySelectorAll('.nav-link').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
  }

  // MODIFICADO: Esconder menú en celular al hacer clic
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

      if(agenda.length === 0) cont.innerHTML = '<div class="alert alert-dark text-center text-light p-4">No hay rutinas hoy</div>';
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
