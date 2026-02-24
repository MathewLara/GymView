// ==========================================
// CONFIGURACIÓN DE RUTAS API
// ==========================================
const BASE_URL = "https://gimnasio-f7td.onrender.com";
const API_URL = `${BASE_URL}/Gimnasio/api/auth/login`;

// Referencias a los elementos del DOM
const loginForm = document.getElementById('loginForm');
const statusMessage = document.getElementById('statusMessage');
const btnSubmit = loginForm.querySelector('button');

// Referencias a los inputs y sus contenedores de error
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

// Muestra un mensaje global en la parte superior del formulario
function showGlobalStatus(message, type = 'danger') {
  statusMessage.textContent = message;
  statusMessage.style.display = 'block';
  statusMessage.className = `alert alert-${type} mt-3`;
}

// Muestra el texto rojo pequeño DEBAJO del input específico
function showInputError(key, msg) {
  if (inputs[key] && errors[key]) {
    inputs[key].classList.add('is-invalid');
    errors[key].textContent = msg;
  }
}

// Limpia los errores previos antes de un nuevo intento de login
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
  e.preventDefault(); // Evita recargar la página
  clearErrors();

  // Modifica el estado del botón mientras se hace la petición
  const textoOriginal = btnSubmit.innerText;
  btnSubmit.disabled = true;
  btnSubmit.innerText = "Ingresando...";

  // Captura los datos ingresados
  const payload = {
    usuario: inputs.usuario.value,
    contrasena: inputs.contrasena.value
  };

  try {
    // Petición POST al backend
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // Si la respuesta del servidor es correcta (Login Exitoso)
    if (response.ok) {
      if (data.token) {
        localStorage.setItem('tokenGimnasio', data.token);
      }
      sessionStorage.setItem('usuarioLogueado', JSON.stringify(data));
      showGlobalStatus('¡Login Correcto! Entrando...', 'success');

      // Redirección basada en el Rol del usuario
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
      // Manejo de errores de credenciales devueltos por el servidor
      btnSubmit.disabled = false;
      btnSubmit.innerText = textoOriginal;

      const errorMsg = data.mensaje || 'Credenciales incorrectas';
      const msgLower = errorMsg.toLowerCase();
      let mapped = false;

      // Buscar si el error menciona un campo en específico
      if (msgLower.includes('usuario')) {
        showInputError('usuario', errorMsg);
        mapped = true;
      }
      if (msgLower.includes('contraseña') || msgLower.includes('password')) {
        showInputError('contrasena', errorMsg);
        mapped = true;
      }

      // Si es un error genérico ("Credenciales incorrectas" afecta a ambos campos)
      if (!mapped || msgLower.includes('credenciales')) {
        showGlobalStatus(errorMsg);
        // Opcionalmente pintamos ambos de rojo para indicar el fallo
        inputs.usuario.classList.add('is-invalid');
        inputs.contrasena.classList.add('is-invalid');
      }
    }

  } catch (error) {
    // Manejo de errores: Falla de conexión con el servidor
    console.error(error);
    btnSubmit.disabled = false;
    btnSubmit.innerText = textoOriginal;
    showGlobalStatus('No se pudo conectar al servidor.');
  }
});
