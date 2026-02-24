// ==========================================
// 1. INICIALIZACIÓN Y VALIDACIÓN DE SESIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Validar si el usuario inició sesión previamente
  const sesion = sessionStorage.getItem('usuarioLogueado');
  if(!sesion) {
    window.location.href = 'index.html';
    return;
  }

  const usuario = JSON.parse(sesion);

  // Llenar datos básicos del header (arriba a la derecha)
  document.getElementById('header-user').textContent = usuario.usuario;
  document.getElementById('lbl-id').textContent = usuario.idUsuario;

  // Generar Código QR consumiendo una API pública usando el ID del cliente
  document.getElementById('img-qr').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=IRON_${usuario.idUsuario}`;

  // 2. Ejecutar la carga de datos del servidor
  cargarDatos(usuario.idUsuario);
});

// ==========================================
// 2. CARGA DE DATOS DESDE EL BACKEND
// ==========================================
async function cargarDatos(id) {
  try {
    // Petición al backend para obtener los datos del dashboard del cliente
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/clientes/${id}/dashboard`);

    if(res.ok) {
      const data = await res.json();

      // A. Llenar sección de Perfil (Datos del usuario)
      document.getElementById('p-nombre').textContent = data.nombreCompleto;
      document.getElementById('p-email').textContent = data.email;
      document.getElementById('p-telefono').textContent = data.telefono;

      // B. Llenar sección de Membresía
      document.getElementById('header-plan').textContent = data.nombrePlan || "Sin Plan";
      document.getElementById('m-plan').textContent = data.nombrePlan || "Sin Plan";
      document.getElementById('m-precio').textContent = data.precioPlan ? "$" + data.precioPlan : "$0.00";
      document.getElementById('m-fecha').textContent = data.fechaVencimiento || "N/A";

      const badge = document.getElementById('m-estado');
      badge.textContent = data.estadoMembresia || "Inactivo";

      // Determinar color de la etiqueta según el estado de la membresía
      if(data.estadoMembresia === 'Vencido' || !data.estadoMembresia) {
        badge.className = 'badge bg-danger fs-6 mb-4';
        document.getElementById('icono-estado').className = 'bi bi-x-circle text-danger';
      } else {
        badge.className = 'badge bg-success fs-6 mb-4';
        document.getElementById('icono-estado').className = 'bi bi-shield-check text-success';
      }

      // C. Llenar tabla de Historial de Asistencias
      const tabla = document.getElementById('tabla-asistencias');
      tabla.innerHTML = data.historialAsistencias.length ?
        data.historialAsistencias.map(a => `<tr><td>${a.fecha}</td><td class="text-success">${a.hora}</td></tr>`).join('') :
        '<tr><td colspan="2" class="text-center text-muted">Sin registros</td></tr>';

      // D. GENERAR RUTINA INTERACTIVA (Checkboxes)
      const divRutina = document.getElementById('rutina-container');
      if(data.nombreRutina) {

        // Recuperar del LocalStorage los ejercicios ya marcados el día de hoy
        const hoy = new Date().toISOString().split('T')[0];
        const keyStorage = `rutina_${id}_${hoy}`;
        const completados = JSON.parse(localStorage.getItem(keyStorage)) || [];

        // Generar el HTML de la lista de ejercicios
        const lista = data.ejercicios.map((e, index) => {
          const estaHecho = completados.includes(index);

          return `
            <div id="card-ej-${index}" class="d-flex justify-content-between p-3 mb-2 bg-black border border-secondary rounded align-items-center ${estaHecho ? 'ejercicio-completado' : ''}">
                <div>
                    <h5 class="text-warning mb-0">${e.nombre}</h5>
                    <small class="text-white-50">${e.seriesReps}</small>
                </div>
                <input type="checkbox"
                       class="form-check-input bg-dark border-secondary"
                       style="width:25px;height:25px;cursor:pointer;"
                       onclick="toggleEjercicio(${index}, ${id})"
                       ${estaHecho ? 'checked' : ''}>
            </div>`;
        }).join('');

        // Inyectar la rutina en la vista
        if(data.nombreRutina) {
          divRutina.innerHTML = `
          <div class="card-panel border-start border-4 border-warning mb-3">
            <h2>${data.nombreRutina}</h2>
            <p class="text-white-50">Coach: ${data.entrenador||'Staff'}</p>
          </div>
          ${lista}
          <button id="btnFinalizar" class="btn btn-success w-100 mt-4 py-3 rounded-pill fw-bold shadow" onclick="finalizarRutina()">
              <i class="bi bi-check-lg"></i> TERMINAR ENTRENAMIENTO
          </button>
        `;

          // Si el servidor confirma que ya terminó la rutina hoy, bloquear controles
          if (data.rutinaTerminadaHoy) {
            const btn = document.getElementById('btnFinalizar');
            btn.disabled = true;
            btn.textContent = "¡YA ENTRENASTE HOY!";
            btn.classList.replace('btn-success', 'btn-secondary');

            // Marcar todos los checkboxes visualmente como terminados
            document.querySelectorAll('input[type="checkbox"]').forEach(chk => {
              chk.checked = true;
              chk.parentElement.classList.add('ejercicio-completado');
            });
          }
        }
      } else {
        // Mensaje si no tiene rutina asignada
        divRutina.innerHTML = `<div class="alert alert-dark text-center">No tienes rutina asignada.</div>`;
      }
    }
  } catch(e) {
    console.error(e);
  }
}

// ==========================================
// 3. LÓGICA DE CHECKBOXES (Almacenamiento Local)
// ==========================================
function toggleEjercicio(index, userId) {
  // Evitar modificar si la rutina ya fue marcada como terminada en el backend
  const btn = document.getElementById('btnFinalizar'); // <- Corrección de ID ('btnTerminar' en código original a 'btnFinalizar')
  if (btn && btn.disabled) return;

  const hoy = new Date().toISOString().split('T')[0];
  const key = `rutina_${userId}_${hoy}`;
  const card = document.getElementById(`card-ej-${index}`);

  let guardados = JSON.parse(localStorage.getItem(key)) || [];

  if (guardados.includes(index)) {
    // Si estaba marcado, desmarcarlo
    guardados = guardados.filter(i => i !== index);
    card.classList.remove('ejercicio-completado');
  } else {
    // Si no estaba marcado, marcarlo
    guardados.push(index);
    card.classList.add('ejercicio-completado');
  }

  // Actualizar el estado en el navegador
  localStorage.setItem(key, JSON.stringify(guardados));
}

// ==========================================
// 4. LÓGICA DE FINALIZAR RUTINA (Petición al Servidor)
// ==========================================
async function finalizarRutina() {
  const sesion = sessionStorage.getItem('usuarioLogueado');
  if (!sesion) return;
  const usuario = JSON.parse(sesion);

  if(confirm("¿Estás seguro de que terminaste tu rutina por hoy?")) {
    try {
      // Petición POST para guardar el completado de la rutina en base de datos
      const url = `https://gimnasio-f7td.onrender.com/Gimnasio/api/clientes/${usuario.idUsuario}/completar`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
      });

      if(res.ok) {
        alert("✅ ¡Excelente! Tu entrenador ha sido notificado.");

        // Deshabilitar botón visualmente
        const btn = document.getElementById('btnFinalizar');
        if(btn) {
          btn.disabled = true;
          btn.innerHTML = '<i class="bi bi-check-circle-fill"></i> ¡YA ENTRENASTE HOY!';
          btn.classList.remove('btn-success');
          btn.classList.add('btn-secondary');
        }
      } else {
        alert("Error al conectar con el servidor.");
      }
    } catch(e) {
      console.error(e);
      alert("❌ Error de conexión. Revisa que el servidor WildFly esté activo.");
    }
  }
}

// ==========================================
// 5. NAVEGACIÓN ENTRE PESTAÑAS (SPA)
// ==========================================
function ver(v, link) {
  // Oculta todas las vistas
  document.querySelectorAll('.vista').forEach(e => e.classList.remove('activa'));
  // Muestra solo la solicitada
  document.getElementById('vista-'+v).classList.add('activa');

  // Resalta la opción del menú clickeada
  if(link) {
    document.querySelectorAll('.nav-link').forEach(e => e.classList.remove('active'));
    link.classList.add('active');
  }
}

// ==========================================
// 6. CERRAR SESIÓN
// ==========================================
function salir() {
  if(confirm("¿Cerrar sesión?")) {
    sessionStorage.removeItem('usuarioLogueado');
    window.location.href = 'index.html';
  }
}
