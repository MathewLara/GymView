// ==========================================
// 0. AUTO-REDIRECCIÓN (EL "ESCUDO" CON TIEMPO)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const sesion = localStorage.getItem('usuarioLogueado');
  const loginTime = localStorage.getItem('loginTime');
  const TIEMPO_EXPIRACION = 30 * 60 * 1000; // 30 minutos en milisegundos

  if (sesion && loginTime) {
    const tiempoTranscurrido = Date.now() - parseInt(loginTime);

    // Si pasaron más de 30 minutos, destruimos la sesión corrupta o vieja
    if (tiempoTranscurrido > TIEMPO_EXPIRACION) {
      localStorage.removeItem('usuarioLogueado');
      localStorage.removeItem('tokenGimnasio');
      localStorage.removeItem('loginTime');
    } else {
      // Si la sesión sigue viva (menos de 30 min), redirigimos a su panel
      try {
        const data = JSON.parse(sesion);
        const rol = data.idRol || data.id_rol;

        switch (rol) {
          case 1: window.location.href = 'DashboardAdmin.html'; break;
          case 2: window.location.href = 'DashboardRecep.html'; break;
          case 3: window.location.href = 'DashboardEntrenador.html'; break;
          case 4: window.location.href = 'DashboardCliente.html'; break;
          default: localStorage.removeItem('usuarioLogueado'); break;
        }
      } catch(e) {
        localStorage.removeItem('usuarioLogueado');
      }
    }
  } else {
    // Limpieza de seguridad por si falta el tiempo o la sesión
    localStorage.removeItem('usuarioLogueado');
    localStorage.removeItem('tokenGimnasio');
  }
});

// ==========================================
// CONFIGURACIÓN DE RUTAS API
// ==========================================
const BASE_URL = "https://gimnasio-f7td.onrender.com";
const API_URL = `${BASE_URL}/Gimnasio/api/auth/login`;

const loginForm = document.getElementById('loginForm');
const statusMessage = document.getElementById('statusMessage');
const btnSubmit = loginForm.querySelector('button');

const inputs = {
  usuario: document.getElementById('username'),
  contrasena: document.getElementById('password')
};

const errors = {
  usuario: document.getElementById('usernameError'),
  contrasena: document.getElementById('passwordError')
};

// ==========================================
// FUNCIONES DE UTILIDAD PARA ERRORES VISUALES
// ==========================================
function showGlobalStatus(message, type = 'danger') {
  statusMessage.textContent = message;
  statusMessage.style.display = 'block';
  statusMessage.className = `alert alert-${type} mt-3`;
}

function showInputError(key, msg) {
  if (inputs[key] && errors[key]) {
    inputs[key].classList.add('is-invalid');
    errors[key].textContent = msg;
  }
}

function clearErrors() {
  statusMessage.style.display = 'none';
  Object.keys(inputs).forEach(key => {
    if(inputs[key]) inputs[key].classList.remove('is-invalid');
  });
  Object.keys(errors).forEach(key => {
    if(errors[key]) errors[key].textContent = '';
  });
}

// ==========================================
// LÓGICA DE INICIO DE SESIÓN
// ==========================================
loginForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  clearErrors();

  const textoOriginal = btnSubmit.innerText;
  btnSubmit.disabled = true;
  btnSubmit.innerText = "Ingresando...";

  const payload = {
    usuario: inputs.usuario.value,
    contrasena: inputs.contrasena.value
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      if (data.token) {
        localStorage.setItem('tokenGimnasio', data.token);
      }

      localStorage.setItem('usuarioLogueado', JSON.stringify(data));
      // NUEVO: Guardamos el tiempo exacto en el que inició sesión
      localStorage.setItem('loginTime', Date.now().toString());

      showGlobalStatus('¡Login Correcto! Entrando...', 'success');

      setTimeout(() => {
        const rol = data.idRol || data.id_rol;
        switch (rol) {
          case 1: window.location.href = 'DashboardAdmin.html'; break;
          case 2: window.location.href = 'DashboardRecep.html'; break;
          case 3: window.location.href = 'DashboardEntrenador.html'; break;
          case 4: window.location.href = 'DashboardCliente.html'; break;
          default:
            showGlobalStatus('Error: Rol de usuario desconocido (' + rol + ')', 'warning');
            btnSubmit.disabled = false;
            btnSubmit.innerText = textoOriginal;
        }
      }, 1000);

    } else {
      btnSubmit.disabled = false;
      btnSubmit.innerText = textoOriginal;

      const errorMsg = data.mensaje || 'Credenciales incorrectas';
      const msgLower = errorMsg.toLowerCase();
      let mapped = false;

      if (msgLower.includes('usuario')) {
        showInputError('usuario', errorMsg);
        mapped = true;
      }
      if (msgLower.includes('contraseña') || msgLower.includes('password')) {
        showInputError('contrasena', errorMsg);
        mapped = true;
      }

      if (!mapped || msgLower.includes('credenciales')) {
        showGlobalStatus(errorMsg);
        inputs.usuario.classList.add('is-invalid');
        inputs.contrasena.classList.add('is-invalid');
      }
    }

  } catch (error) {
    console.error(error);
    btnSubmit.disabled = false;
    btnSubmit.innerText = textoOriginal;
    showGlobalStatus('No se pudo conectar al servidor.');
  }
});
