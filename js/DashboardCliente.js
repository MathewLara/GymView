// ==========================================
// CONTROL DE SEGURIDAD BLINDADO: INACTIVIDAD
// ==========================================
const TIEMPO_EXPIRACION = 30 * 60 * 1000;

function verificarInactividad() {
  const loginTime = localStorage.getItem('loginTime');
  if (loginTime) {
    const tiempoTranscurrido = Date.now() - parseInt(loginTime);
    if (tiempoTranscurrido > TIEMPO_EXPIRACION) {
      localStorage.removeItem('usuarioLogueado');
      localStorage.removeItem('tokenGimnasio');
      localStorage.removeItem('loginTime');

      Swal.fire({
        icon: 'warning',
        title: 'Sesión Expirada',
        text: 'Tu sesión ha expirado por inactividad. Por seguridad, debes iniciar sesión nuevamente.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#ffc107',
        background: '#1e1e1e',
        color: '#ffffff'
      }).then(() => {
        window.location.replace('index.html');
      });
    }
  }
}

function reiniciarTemporizador() {
  if (localStorage.getItem('usuarioLogueado')) {
    localStorage.setItem('loginTime', Date.now().toString());
  }
}

window.addEventListener('mousemove', reiniciarTemporizador);
window.addEventListener('click', reiniciarTemporizador);
window.addEventListener('keydown', reiniciarTemporizador);
window.addEventListener('scroll', reiniciarTemporizador);

// Revisamos cada 6 segundos
setInterval(verificarInactividad, 6000);
verificarInactividad();
// ==========================================
// 1. INICIALIZACIÓN Y VARIABLES GLOBALES
// ==========================================
let membresiaActiva = true;

document.addEventListener('DOMContentLoaded', () => {
  console.log("Dashboard del Cliente inicializado.");

  const sesion = localStorage.getItem('usuarioLogueado');
  const usuario = sesion ? JSON.parse(sesion) : { usuario: 'Socio', idUsuario: 1 };

  // EXTRAEMOS LA EMPRESA
  const idEmpresaLogueada = localStorage.getItem('id_empresa') || 1;

  const headerUser = document.getElementById('header-user');
  const lblId = document.getElementById('lbl-id');
  if(headerUser) headerUser.textContent = usuario.usuario || "Socio";
  if(lblId) lblId.textContent = usuario.idUsuario || usuario.id || "0";

  const idUsar = usuario.idUsuario || usuario.id || 1;
  const imgQr = document.getElementById('img-qr');
  if(imgQr) {
    imgQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=IRON_${idUsar}`;
  }

  // PASAMOS LA EMPRESA COMO PARÁMETRO
  cargarDatos(idUsar, idEmpresaLogueada);
});

// ==========================================
// 2. CARGA DE DATOS DESDE EL BACKEND
// ==========================================
// SE AÑADIÓ idEmpresa
async function cargarDatos(id, idEmpresa) {
  try {
    // INYECTAMOS LA EMPRESA EN LA URL
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/clientes/${id}/dashboard?idEmpresa=${idEmpresa}`);

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


      const btnCancelar = document.getElementById('btnCancelarSuscripcion');
      if (data.cancelado) {
        if (btnCancelar) {
          btnCancelar.innerHTML = '<i class="bi bi-check-circle-fill"></i> Suscripción Cancelada';
          btnCancelar.className = 'btn btn-secondary btn-sm w-100 fw-bold';
          btnCancelar.disabled = true;
        }
      } else {
        if (btnCancelar) {
          btnCancelar.innerHTML = '<i class="bi bi-x-circle"></i> Cancelar Suscripción';
          btnCancelar.className = 'btn btn-outline-danger btn-sm w-100 fw-bold';
          btnCancelar.disabled = false;
        }
      }

      // LÓGICA DE BLOQUEO POR VENCIMIENTO
      if(data.estadoMembresia === 'Vencido' || !data.estadoMembresia) {
        badge.className = 'badge bg-danger fs-6 mb-4';
        document.getElementById('icono-estado').className = 'bi bi-x-circle text-danger';

        membresiaActiva = false;
        mostrarAlertaBloqueo();

        // REDIRECCIÓN AUTOMÁTICA A MEMBRESÍA
        ver('membresia', document.querySelector('a[onclick*="membresia"]'));

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

  alerta.innerHTML = `
        <i class="bi bi-lock-fill text-danger" style="font-size: 3rem;"></i>
        <h4 class="fw-bold text-danger mt-2">ACCESO RESTRINGIDO</h4>
        <p class="text-dark fw-semibold mb-3">Tu membresía está vencida. Revisa los detalles de tu plan abajo para renovar.</p>
        <button id="btn-ir-membresia" class="btn btn-danger fw-bold shadow fs-5 w-100 py-2">
            <i class="bi bi-card-checklist"></i> Ver mi Membresía
        </button>
    `;

  if(vistaInicio) vistaInicio.prepend(alerta);

  const btnMembresia = document.getElementById('btn-ir-membresia');
  if (btnMembresia) {
    btnMembresia.addEventListener('click', () => {
      const btnMenuMembresia = document.querySelector('a[onclick*="membresia"]');
      ver('membresia', btnMenuMembresia);
    });
  }

  const qrContainer = document.getElementById('img-qr');
  if(qrContainer) {
    qrContainer.style.filter = "blur(10px) grayscale(100%)";
    qrContainer.style.opacity = "0.3";
  }

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
  if (!membresiaActiva && seccion !== 'membresia') {
    Swal.fire({
      icon: 'error',
      title: 'SECCIÓN BLOQUEADA',
      text: 'Tu plan está vencido. Por favor, renueva tu membresía para recuperar el acceso.',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#ffc107',
      background: '#1e1e1e',
      color: '#ffffff'
    });
    return;
  }

  const vistas = document.querySelectorAll('.vista');
  vistas.forEach(v => v.style.display = 'none');

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

// ==========================================
// 5. CONTROL DEL MENÚ MÓVIL
// ==========================================
window.toggleMenu = function() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.overlay');

  if (sidebar) sidebar.classList.toggle('mostrar');
  if (overlay) overlay.classList.toggle('mostrar');
};

// ==========================================
// 5. ACCIONES DE SESIÓN Y CANCELACIÓN
// ==========================================
function salir() {
  Swal.fire({
    icon: 'question',
    title: '¿Cerrar sesión?',
    text: '¿Estás seguro de que deseas salir?',
    showCancelButton: true,
    confirmButtonText: 'Sí, salir',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#ffc107',
    cancelButtonColor: '#6c757d',
    background: '#1e1e1e',
    color: '#ffffff'
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem('tokenGimnasio');
      localStorage.removeItem('usuarioLogueado');
      window.location.href = 'index.html';
    }
  });
}

async function cancelarSuscripcion() {
  const { isConfirmed } = await Swal.fire({
    icon: 'warning',
    title: '¿Cancelar suscripción?',
    text: 'No perderás tu dinero. Tu plan no se renovará automáticamente, pero mantendrás acceso completo hasta tu fecha de corte.',
    showCancelButton: true,
    confirmButtonText: 'Sí, cancelar',
    cancelButtonText: 'No, mantener',
    confirmButtonColor: '#ffc107',
    cancelButtonColor: '#6c757d',
    background: '#1e1e1e',
    color: '#ffffff'
  });
  if (!isConfirmed) return;

  const sesion = localStorage.getItem('usuarioLogueado');
  const usuario = sesion ? JSON.parse(sesion) : null;
  if(!usuario) return;

  const idUsar = usuario.idUsuario || usuario.id;
  const idEmpresaLogueada = localStorage.getItem('id_empresa') || 1; // EXTRAEMOS LA EMPRESA
  const btn = document.getElementById('btnCancelarSuscripcion');

  try {
    if(btn) {
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Procesando...';
      btn.disabled = true;
    }

    // INYECTAMOS LA EMPRESA EN LA URL
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/clientes/${idUsar}/cancelar?idEmpresa=${idEmpresaLogueada}`, {
      method: 'PUT'
    });

    if(res.ok) {
      Swal.fire({
        icon: 'success',
        title: '¡Suscripción cancelada!',
        text: 'Podrás seguir ingresando al gimnasio hasta tu fecha de vencimiento.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#ffc107',
        background: '#1e1e1e',
        color: '#ffffff'
      }).then(() => {
        cargarDatos(idUsar, idEmpresaLogueada);
      });

    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error al cancelar',
        text: 'Hubo un problema al procesar tu solicitud. Intenta de nuevo.',
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#ffc107',
        background: '#1e1e1e',
        color: '#ffffff'
      });
      if(btn) {
        btn.innerHTML = '<i class="bi bi-x-circle"></i> Cancelar Suscripción';
        btn.disabled = false;
      }
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error de conexión',
      text: 'Parece que no tienes internet o el servidor no responde. Revisa tu conexión al intentar cancelar.',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#ffc107',
      background: '#1e1e1e',
      color: '#ffffff'
    });
    if(btn) {
      btn.innerHTML = '<i class="bi bi-x-circle"></i> Cancelar Suscripción';
      btn.disabled = false;
    }
  }
}
// ==========================================
// 6. CONTROL DE RUTINAS Y EJERCICIOS
// ==========================================

function toggleEjercicio(index, idUsuario) {
  const hoy = new Date().toISOString().split('T')[0];
  const keyStorage = `rutina_${idUsuario}_${hoy}`;
  let completados = JSON.parse(localStorage.getItem(keyStorage)) || [];

  const indexPos = completados.indexOf(index);
  const card = document.getElementById(`card-ej-${index}`);

  if (indexPos === -1) {
    completados.push(index);
    if (card) card.classList.add('ejercicio-completado');
  } else {
    completados.splice(indexPos, 1);
    if (card) card.classList.remove('ejercicio-completado');
  }

  localStorage.setItem(keyStorage, JSON.stringify(completados));
}

async function finalizarRutina() {
  const sesion = localStorage.getItem('usuarioLogueado');
  const usuario = sesion ? JSON.parse(sesion) : { idUsuario: 1 };
  const idUsar = usuario.idUsuario || usuario.id || 1;
  const idEmpresaLogueada = localStorage.getItem('id_empresa') || 1; // EXTRAEMOS LA EMPRESA

  const btn = document.getElementById('btnFinalizar');
  if(btn) {
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Registrando...';
    btn.disabled = true;
  }

  try {
    // INYECTAMOS LA EMPRESA EN LA URL
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/clientes/${idUsar}/completar?idEmpresa=${idEmpresaLogueada}`, {
      method: 'POST'
    });

    if (res.ok) {
      Swal.fire({
        icon: 'success',
        title: '¡Excelente trabajo!',
        text: 'Has completado tu entrenamiento de hoy. Tu entrenador ya fue notificado.',
        confirmButtonText: '¡Genial!',
        confirmButtonColor: '#ffc107',
        background: '#1e1e1e',
        color: '#ffffff'
      }).then(() => {
        cargarDatos(idUsar, idEmpresaLogueada);
      });

    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error al registrar',
        text: 'Hubo un error al registrar el entrenamiento en el servidor. Intenta nuevamente.',
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#ffc107',
        background: '#1e1e1e',
        color: '#ffffff'
      });

      if(btn) {
        btn.innerHTML = '<i class="bi bi-check-lg"></i> TERMINAR ENTRENAMIENTO';
        btn.disabled = false;
      }
    }
  } catch (e) {
    console.error("Error al finalizar rutina:", e);

    Swal.fire({
      icon: 'error',
      title: 'Error de conexión',
      text: 'No pudimos conectar con el servidor. Revisa tu conexión a internet e intenta de nuevo.',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#ffc107',
      background: '#1e1e1e',
      color: '#ffffff'
    });

    if(btn) {
      btn.innerHTML = '<i class="bi bi-check-lg"></i> TERMINAR ENTRENAMIENTO';
      btn.disabled = false;
    }
  }
}
