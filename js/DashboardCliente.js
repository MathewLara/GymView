// ==========================================
// 1. INICIALIZACIÓN Y VARIABLES GLOBALES
// ==========================================
let membresiaActiva = true;

document.addEventListener('DOMContentLoaded', () => {
  console.log("Dashboard del Cliente inicializado.");

  const sesion = localStorage.getItem('usuarioLogueado');
  const usuario = sesion ? JSON.parse(sesion) : { usuario: 'Socio', idUsuario: 1 };

  const headerUser = document.getElementById('header-user');
  const lblId = document.getElementById('lbl-id');
  if(headerUser) headerUser.textContent = usuario.usuario || "Socio";
  if(lblId) lblId.textContent = usuario.idUsuario || usuario.id || "0";

  const idUsar = usuario.idUsuario || usuario.id || 1;
  const imgQr = document.getElementById('img-qr');
  if(imgQr) {
    imgQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=IRON_${idUsar}`;
  }

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

      document.getElementById('p-nombre').textContent = data.nombreCompleto;
      document.getElementById('p-email').textContent = data.email;
      document.getElementById('p-telefono').textContent = data.telefono;

      document.getElementById('header-plan').textContent = data.nombrePlan || "Sin Plan";
      document.getElementById('m-plan').textContent = data.nombrePlan || "Sin Plan";
      document.getElementById('m-precio').textContent = data.precioPlan ? "$" + data.precioPlan : "$0.00";
      document.getElementById('m-fecha').textContent = data.fechaVencimiento || "N/A";

      const badge = document.getElementById('m-estado');
      badge.textContent = data.estadoMembresia || "Inactivo";

      // 🛡️ LÓGICA DE BLOQUEO POR VENCIMIENTO
      if(data.estadoMembresia === 'Vencido' || !data.estadoMembresia) {
        badge.className = 'badge bg-danger fs-6 mb-4';
        document.getElementById('icono-estado').className = 'bi bi-x-circle text-danger';

        membresiaActiva = false;
        mostrarAlertaBloqueo();
      } else {
        badge.className = 'badge bg-success fs-6 mb-4';
        document.getElementById('icono-estado').className = 'bi bi-shield-check text-success';

        membresiaActiva = true;
        const alerta = document.getElementById('alerta-bloqueo');
        if(alerta) alerta.remove();
      }

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
      } else if (divRutina) {
        divRutina.innerHTML = `<div class="alert alert-dark text-center">No tienes rutina asignada.</div>`;
      }
    }
  } catch(e) {
    console.error("Error al cargar datos del backend:", e);
  }
}

// ==========================================
// 3. FUNCIÓN DE BLOQUEO VISUAL Y EVENTOS MODERNOS
// ==========================================
function mostrarAlertaBloqueo() {
  if (document.getElementById('alerta-bloqueo')) return;

  const vistaInicio = document.getElementById('vista-inicio');
  const alerta = document.createElement('div');
  alerta.id = 'alerta-bloqueo';
  alerta.className = 'alert alert-danger border-danger text-center shadow-lg mb-4 mt-3 rounded-4 p-4';

  // Le quitamos el onclick viejo y le ponemos un ID al botón
  alerta.innerHTML = `
        <i class="bi bi-lock-fill text-danger" style="font-size: 3rem;"></i>
        <h4 class="fw-bold text-danger mt-2">ACCESO RESTRINGIDO</h4>
        <p class="text-dark fw-semibold mb-3">Tu membresía está vencida. Revisa los detalles de tu plan abajo para renovar.</p>
        <button id="btn-ir-membresia" class="btn btn-danger fw-bold shadow fs-5 w-100 py-2">
            <i class="bi bi-card-checklist"></i> Ver mi Membresía
        </button>
    `;

  if(vistaInicio) vistaInicio.prepend(alerta);

  // 🎯 EVENT LISTENER MODERNO Y PROFESIONAL
  // Encontramos el botón y le inyectamos la lógica directamente
  const btnMembresia = document.getElementById('btn-ir-membresia');
  if (btnMembresia) {
    btnMembresia.addEventListener('click', () => {
      console.log("Desplazando hacia la membresía...");

      const vistaInicio = document.getElementById('vista-inicio');
      const vistaRutina = document.getElementById('vista-rutina');
      if (vistaInicio) vistaInicio.style.display = 'block';
      if (vistaRutina) vistaRutina.style.display = 'none';

      const ancla = document.getElementById('m-plan') || document.getElementById('m-estado') || document.querySelector('.card-panel');

      if (ancla) {
        const tarjeta = ancla.closest('.card') || ancla.parentElement;
        tarjeta.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Efecto de brillo rojo profesional
        tarjeta.style.transition = "all 0.5s ease";
        tarjeta.style.boxShadow = "0 0 40px rgba(220, 53, 69, 0.8)";
        tarjeta.style.border = "2px solid #dc3545";

        setTimeout(() => {
          tarjeta.style.boxShadow = "none";
          tarjeta.style.border = "1px solid rgba(255,255,255,0.1)";
        }, 3000);
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    });
  }

  // Efectos de bloqueo para el QR
  const qrContainer = document.getElementById('img-qr');
  if(qrContainer) {
    qrContainer.style.filter = "blur(10px) grayscale(100%)";
    qrContainer.style.opacity = "0.3";
  }

  // Candado en el menú
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
  if (!membresiaActiva && seccion !== 'inicio') {
    alert("⚠️ SECCIÓN BLOQUEADA\n\nTu plan está vencido. Por favor, renueva tu membresía en el panel de Inicio.");
    return;
  }

  document.getElementById('vista-inicio').style.display = 'none';
  const vistaRutina = document.getElementById('vista-rutina');
  if (vistaRutina) vistaRutina.style.display = 'none';

  const vista = document.getElementById('vista-' + seccion);
  if(vista) vista.style.display = 'block';

  const links = document.querySelectorAll('.nav-link');
  links.forEach(l => l.classList.remove('active'));
  if(elemento) elemento.classList.add('active');

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
// 5. ACCIONES DE SESIÓN Y CANCELACIÓN
// ==========================================
function salir() {
  if(confirm("¿Cerrar sesión?")) {
    localStorage.removeItem('tokenGimnasio');
    localStorage.removeItem('usuarioLogueado');
    window.location.href = 'index.html';
  }
}

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
      alert("¡Suscripción cancelada exitosamente!");
      cargarDatos(idUsar);
    } else {
      alert("Error al procesar la cancelación.");
      if(btn) btn.disabled = false;
    }
  } catch (error) {
    alert("Error de conexión.");
  }
}
