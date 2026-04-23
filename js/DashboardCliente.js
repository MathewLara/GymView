// ==========================================
// 1. INICIALIZACIÓN Y VARIABLES GLOBALES
// ==========================================
let membresiaActiva = true; // Variable que actúa como candado de seguridad

document.addEventListener('DOMContentLoaded', () => {
  console.log("Dashboard del Cliente inicializado.");

  // Leer sesión desde localStorage
  const sesion = localStorage.getItem('usuarioLogueado');
  const usuario = sesion ? JSON.parse(sesion) : { usuario: 'Socio', idUsuario: 1 };

  // Llenar datos básicos del header
  const headerUser = document.getElementById('header-user');
  const lblId = document.getElementById('lbl-id');
  if(headerUser) headerUser.textContent = usuario.usuario || "Socio";
  if(lblId) lblId.textContent = usuario.idUsuario || usuario.id || "0";

  // Generar Código QR
  const idUsar = usuario.idUsuario || usuario.id || 1;
  const imgQr = document.getElementById('img-qr');
  if(imgQr) {
    imgQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=IRON_${idUsar}`;
  }

  // Cargar datos
  cargarDatos(idUsar);
});

// ==========================================
// 2. CARGA DE DATOS DESDE EL BACKEND
// ==========================================
async function cargarDatos(id) {
  try {
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/clientes/${id}/dashboard`);

    if(res.ok) {
      const data = await res.json();

      // A. Llenar sección de Perfil
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

      // 🔴 AQUÍ APLICAMOS EL BLOQUEO SI ESTÁ VENCIDO 🔴
      if(data.estadoMembresia === 'Vencido' || !data.estadoMembresia) {
        badge.className = 'badge bg-danger fs-6 mb-4';
        document.getElementById('icono-estado').className = 'bi bi-x-circle text-danger';

        membresiaActiva = false; // Cerramos el candado
        mostrarAlertaBloqueo();  // Disparamos la alerta visual
      } else {
        badge.className = 'badge bg-success fs-6 mb-4';
        document.getElementById('icono-estado').className = 'bi bi-shield-check text-success';

        membresiaActiva = true; // Abrimos el candado
      }

      // C. Llenar tabla de Historial de Asistencias
      const tabla = document.getElementById('tabla-asistencias');
      if (tabla) {
        tabla.innerHTML = data.historialAsistencias && data.historialAsistencias.length ?
          data.historialAsistencias.map(a => `
              <tr>
                <td class="text-white align-middle">${a.fecha}</td>
                <td>
                  <div class="text-success fw-bold"><i class="bi bi-box-arrow-in-right"></i> Entrada: ${a.hora || '--:--'}</div>
                  <div class="text-info fw-bold"><i class="bi bi-box-arrow-right"></i> Salida: ${a.hora_salida || '--:--'}</div>
                </td>
              </tr>
            `).join('') :
          '<tr><td colspan="2" class="text-center text-muted">Sin registros</td></tr>';
      }

      // D. GENERAR RUTINA INTERACTIVA (Checkboxes)
      const divRutina = document.getElementById('rutina-container');
      if(data.nombreRutina) {
        const hoy = new Date().toISOString().split('T')[0];
        const keyStorage = `rutina_${id}_${hoy}`;
        const completados = JSON.parse(localStorage.getItem(keyStorage)) || [];

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

          if (data.rutinaTerminadaHoy) {
            const btn = document.getElementById('btnFinalizar');
            if (btn) {
              btn.disabled = true;
              btn.textContent = "¡YA ENTRENASTE HOY!";
              btn.classList.replace('btn-success', 'btn-secondary');
            }
            document.querySelectorAll('input[type="checkbox"]').forEach(chk => {
              chk.checked = true;
              chk.parentElement.classList.add('ejercicio-completado');
            });
          }
        }
      } else {
        if (divRutina) divRutina.innerHTML = `<div class="alert alert-dark text-center">No tienes rutina asignada.</div>`;
      }
    }
  } catch(e) {
    console.error("Error al cargar datos del backend:", e);
  }
}

// ==========================================
// 3. FUNCIÓN DE BLOQUEO VISUAL E INTERFAZ
// ==========================================
function mostrarAlertaBloqueo() {
  if (document.getElementById('alerta-bloqueo')) return; // Evitar duplicados

  const vistaInicio = document.getElementById('vista-inicio');
  const alerta = document.createElement('div');
  alerta.id = 'alerta-bloqueo';
  alerta.className = 'alert alert-danger border-danger text-center shadow-lg mb-4 mt-3 rounded-4 p-4';
  alerta.innerHTML = `
        <i class="bi bi-lock-fill text-danger" style="font-size: 3rem;"></i>
        <h4 class="fw-bold text-danger mt-2">SISTEMA BLOQUEADO</h4>
        <p class="text-dark fw-semibold mb-3">Tu membresía se encuentra vencida. No tienes acceso a las rutinas ni al ingreso del gimnasio.</p>
        <button class="btn btn-danger fw-bold shadow fs-5 w-100 py-2" onclick="window.location.href='catalogo.html'">
            <i class="bi bi-cart-check-fill"></i> Renovar Membresía Ahora
        </button>
    `;

  // Inyectar la alerta arriba de todo
  if(vistaInicio) vistaInicio.prepend(alerta);

  // Hacer borroso el QR para indicar que no funciona en los torniquetes
  const qrContainer = document.getElementById('img-qr');
  if(qrContainer) {
    qrContainer.style.filter = "blur(10px) grayscale(100%)";
    qrContainer.style.opacity = "0.3";
  }

  // Poner el candado rojo en el menú lateral
  const links = document.querySelectorAll('.nav-link');
  links.forEach(link => {
    if(link.innerText.toLowerCase().includes('rutina')) {
      link.innerHTML = `<i class="bi bi-lock-fill text-danger"></i> Rutina <span class="badge bg-danger ms-2">Bloqueado</span>`;
      link.classList.add('text-danger');
    }
  });
}

// ==========================================
// 4. NAVEGACIÓN SPA Y SEGURIDAD ESTRICTA
// ==========================================
function ver(seccion, elemento) {
  // 🛡️ BLOQUEO DE SEGURIDAD: Si está vencida y quiere salir de inicio, lo rebotamos
  if (!membresiaActiva && seccion !== 'inicio') {
    alert("⚠️ ACCESO DENEGADO\n\nTu plan está vencido. Por favor, renueva tu membresía para acceder a tus rutinas y entrenamientos.");
    return;
  }

  // Ocultar todas las vistas
  document.getElementById('vista-inicio').style.display = 'none';
  const vistaRutina = document.getElementById('vista-rutina');
  if (vistaRutina) vistaRutina.style.display = 'none';

  // Mostrar la seleccionada
  const vista = document.getElementById('vista-' + seccion);
  if(vista) vista.style.display = 'block';

  // Actualizar menú lateral
  const links = document.querySelectorAll('.nav-link');
  links.forEach(l => l.classList.remove('active'));
  if(elemento) elemento.classList.add('active');

  // Si es móvil, cerrar el menú al hacer clic
  if (window.innerWidth <= 767) {
    document.querySelector('.sidebar').classList.remove('mostrar');
    document.querySelector('.overlay').classList.remove('mostrar');
  }
}

function toggleMenu() {
  document.querySelector('.sidebar').classList.toggle('mostrar');
  document.querySelector('.overlay').classList.toggle('mostrar');
}

// ==========================================
// 5. CERRAR SESIÓN
// ==========================================
function salir() {
  if(confirm("¿Cerrar sesión?")) {
    localStorage.removeItem('tokenGimnasio');
    localStorage.removeItem('usuarioLogueado');
    window.location.href = 'index.html';
  }
}

// ==========================================
// 6. CANCELAR SUSCRIPCIÓN
// ==========================================
async function cancelarSuscripcion() {
  const confirmacion = confirm("¿Estás seguro de que deseas cancelar tu plan?\n\nTu estado pasará a Inactivo y deberás renovar para volver a ingresar.");
  if (!confirmacion) return;

  const sesion = localStorage.getItem('usuarioLogueado');
  const usuario = sesion ? JSON.parse(sesion) : null;
  if(!usuario) return;

  const idUsar = usuario.idUsuario || usuario.id;
  const btn = document.getElementById('btnCancelarSuscripcion');

  try {
    if(btn) {
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Procesando...';
      btn.disabled = true;
    }

    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/clientes/${idUsar}/cancelar`, { method: 'PUT' });

    if(res.ok) {
      alert("¡Suscripción cancelada exitosamente en el sistema!");
      // Al recargar los datos, como ya se canceló, la pantalla se va a bloquear sola
      cargarDatos(idUsar);

      if(btn) {
        btn.classList.replace('btn-outline-danger', 'btn-secondary');
        btn.innerHTML = '<i class="bi bi-info-circle"></i> Plan Cancelado';
      }
    } else {
      alert("Hubo un error al intentar cancelar la suscripción en la base de datos.");
      if(btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-x-circle"></i> Cancelar Suscripción';
      }
    }
  } catch (error) {
    console.error("Error conectando al servidor:", error);
    alert("Error de red. Intenta nuevamente.");
  }
}
