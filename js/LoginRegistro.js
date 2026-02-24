// ==========================================
// CONFIGURACIÓN DE ENDPOINTS
// ==========================================
const BASE_URL = "https://gimnasio-f7td.onrender.com";

const API_URLS = {
  registro: `${BASE_URL}/Gimnasio/api/auth/registro`,
  verificacion: `${BASE_URL}/Gimnasio/api/auth/verificar`,
  login: `${BASE_URL}/Gimnasio/api/auth/login`
};

// ==========================================
// REFERENCIAS AL DOM
// ==========================================
const step1 = document.getElementById('step1-datos');
const step2 = document.getElementById('step2-codigo');
const msgBox = document.getElementById('statusMessage');
const btnStep1 = document.getElementById('btn-submit-step1');
let tempEmail = "";

// Elementos de Inputs (Paso 1)
const inputs = {
  cedula: document.getElementById('cedula'), // Agregado Cedula
  nombre: document.getElementById('nombre'),
  apellido: document.getElementById('apellido'),
  email: document.getElementById('email'),
  telefono: document.getElementById('telefono'),
  fecha: document.getElementById('fechaNacimiento'),
  usuario: document.getElementById('username'),
  pass: document.getElementById('password'),
  codigo: document.getElementById('verificationCode')
};

// Contenedores de texto de error debajo de cada input
const errors = {
  cedula: document.getElementById('cedulaError'), // Agregado Cedula Error
  nombre: document.getElementById('nombreError'),
  apellido: document.getElementById('apellidoError'),
  email: document.getElementById('emailError'),
  telefono: document.getElementById('telefonoError'),
  fecha: document.getElementById('fechaError'),
  usuario: document.getElementById('usuarioError'),
  pass: document.getElementById('passwordError'),
  codigo: document.getElementById('codeError')
};

// ==========================================
// FUNCIONES DE UTILIDAD PARA ERRORES
// ==========================================

// Limpia todos los mensajes y bordes rojos previos
function clearAllErrors() {
  msgBox.style.display = 'none';
  Object.keys(inputs).forEach(key => {
    if(inputs[key]) inputs[key].classList.remove('is-invalid');
  });
  Object.keys(errors).forEach(key => {
    if(errors[key]) errors[key].textContent = '';
  });
}

// Muestra alerta general en la parte superior (Para errores de servidor/conexión)
function showGlobalStatus(msg, type = 'error') {
  msgBox.textContent = msg;
  msgBox.style.display = 'block';
  msgBox.className = type === 'error' ? 'alert alert-danger' : 'alert alert-success';
}

// Muestra el texto rojo pequeño DEBAJO del input específico
function showInputError(key, msg) {
  if(inputs[key] && errors[key]) {
    inputs[key].classList.add('is-invalid');
    errors[key].textContent = msg;
  }
}

// ==========================================
// PASO 1: REGISTRO (Envío de formulario)
// ==========================================
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAllErrors();
  btnStep1.disabled = true;
  btnStep1.innerText = "Enviando...";

  const userData = {
    cedula: inputs.cedula.value,
    nombre: inputs.nombre.value,
    apellido: inputs.apellido.value,
    email: inputs.email.value,
    telefono: inputs.telefono.value,
    fechaNacimiento: inputs.fecha.value,
    usuario: inputs.usuario.value,
    contrasena: inputs.pass.value,
    rol: "CLIENTE"
  };

  try {
    const response = await fetch(API_URLS.registro, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      // ÉXITO: Pasar a validación de correo
      tempEmail = userData.email;
      document.getElementById('display-email').textContent = tempEmail;
      step1.classList.add('hidden');
      step2.classList.remove('hidden');
      showGlobalStatus(data.mensaje || "Código enviado. Revisa tu correo.", "success");
    } else {
      // ERROR DEL BACKEND (Validación de datos incorrectos)
      const errorMsg = data.mensaje || "Error en el registro";
      const msgLower = errorMsg.toLowerCase();

      // LÓGICA DE MAPEO: Busca palabras clave en el mensaje de error para pintar debajo del input correspondiente
      let mapped = false;

      // Validación incorporada explícitamente para la Cédula
      if (msgLower.includes('cédula') || msgLower.includes('cedula') || msgLower.includes('dni')) { showInputError('cedula', errorMsg); mapped = true; }
      if (msgLower.includes('nombre')) { showInputError('nombre', errorMsg); mapped = true; }
      if (msgLower.includes('apellido')) { showInputError('apellido', errorMsg); mapped = true; }
      if (msgLower.includes('correo') || msgLower.includes('email')) { showInputError('email', errorMsg); mapped = true; }
      if (msgLower.includes('teléfono') || msgLower.includes('telefono')) { showInputError('telefono', errorMsg); mapped = true; }
      if (msgLower.includes('fecha') || msgLower.includes('nacimiento')) { showInputError('fecha', errorMsg); mapped = true; }
      if (msgLower.includes('usuario') || msgLower.includes('user')) { showInputError('usuario', errorMsg); mapped = true; }
      if (msgLower.includes('contraseña') || msgLower.includes('password')) { showInputError('pass', errorMsg); mapped = true; }

      // Si el error no es de un campo específico (ej. "Base de datos caída"), se muestra arriba
      if (!mapped) {
        showGlobalStatus(errorMsg);
      }
    }
  } catch (error) {
    // ERROR DE RED (Servidor apagado, sin internet, etc.)
    console.error(error);
    showGlobalStatus("No se pudo conectar con el servidor. Verifica tu conexión.");
  } finally {
    btnStep1.disabled = false;
    btnStep1.innerText = "REGISTRARME";
  }
});

// ==========================================
// PASO 2: VERIFICACIÓN
// ==========================================
document.getElementById('verifyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAllErrors();

  const btnVerify = e.target.querySelector('button');
  btnVerify.disabled = true;
  btnVerify.innerText = "Verificando...";

  const codigoInputVal = inputs.codigo.value;

  try {
    const response = await fetch(API_URLS.verificacion, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: tempEmail,
        codigo: codigoInputVal
      })
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      showGlobalStatus(data.mensaje || "¡Cuenta verificada! Redirigiendo...", "success");
      if (data.token) localStorage.setItem('tokenGimnasio', data.token);
      setTimeout(() => { window.location.href = 'DashboardCliente.html'; }, 2000);
    } else {
      // Mostrar error de código incorrecto debajo del input del código
      const errorMsg = data.mensaje || "Código incorrecto";
      showInputError('codigo', errorMsg);
    }
  } catch (error) {
    showGlobalStatus("Error de conexión al verificar.");
  } finally {
    btnVerify.disabled = false;
    btnVerify.innerText = "VERIFICAR CUENTA";
  }
});

function regresarPaso1() {
  step2.classList.add('hidden');
  step1.classList.remove('hidden');
  clearAllErrors();
}
