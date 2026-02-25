// ==========================================
// 1. MANEJO DE SESIÓN Y SEGURIDAD
// ==========================================

// Se ejecuta automáticamente en cuanto el HTML termina de cargar
document.addEventListener('DOMContentLoaded', () => {
  // Busca el token de acceso guardado en el navegador durante el Login
  const token = localStorage.getItem('tokenGimnasio');

  // RESTRICCIÓN: Si no hay token, expulsa directamente a index.html
  if (!token) {
    window.location.href = 'index.html';
    return; // Detiene la ejecución del código para mayor seguridad
  }

  console.log("Dashboard cargado. Token:", token ? "Presente" : "No encontrado");
});

// Función enlazada al botón "Salir"
function cerrarSesion() {
  // Elimina las credenciales del almacenamiento
  localStorage.removeItem('tokenGimnasio');
  // Opcional: limpiar también los datos del usuario
  sessionStorage.removeItem('usuarioLogueado');
  // Redirige al inicio de sesión (actualizado a index.html)
  window.location.href = 'index.html';
}

// ==========================================
// 2. NAVEGACIÓN DINÁMICA DEL DASHBOARD (SPA)
// ==========================================

// Función que cambia el contenido visible según la opción clickeada en el menú lateral
async function cargarModulo(modulo, elementoHTML) {
  const tituloMap = { 'resumen': 'Panel de Control Gerencial', 'usuarios': 'Gestión de Staff' };
  document.getElementById('page-title').innerText = tituloMap[modulo] || 'Panel';

  if (elementoHTML) {
    const links = document.querySelectorAll('#sidebarMenu .nav-link');
    links.forEach(link => link.classList.remove('active'));
    elementoHTML.classList.add('active');
  }

  const vistaResumen = document.getElementById('vista-resumen');
  const contenedorDinamico = document.getElementById('vista-dinamica-contenedor');

  if (modulo === 'resumen') {
    vistaResumen.style.display = 'block';
    contenedorDinamico.innerHTML = '';

    // Mostramos un spinner mientras la base de datos responde
    vistaResumen.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-warning"></div><h5 class="text-white mt-3">Calculando métricas reales...</h5></div>';

    try {
      // AQUÍ OCURRE LA MAGIA: Petición real a tu base de datos en Render
      const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/auth/admin/dashboard');

      if(res.ok) {
        const data = await res.json();

        // Inyectamos las tarjetas con los números devueltos por tu Java
        vistaResumen.innerHTML = `
          <div class="row g-4 mb-4">
              <div class="col-md-4">
                  <div class="card bg-dark border-warning p-4 shadow-sm" style="border-radius: 15px;">
                      <h6 class="text-muted fw-bold">INGRESOS TOTALES (BDD)</h6>
                      <h2 class="text-white fw-bold">$ ${data.ingresos.toFixed(2)}</h2>
                  </div>
              </div>
              <div class="col-md-4">
                  <div class="card bg-dark border-info p-4 shadow-sm" style="border-radius: 15px;">
                      <h6 class="text-muted fw-bold">CLIENTES REGISTRADOS</h6>
                      <h2 class="text-white fw-bold">${data.totalClientes} <i class="bi bi-people-fill text-info fs-4 float-end"></i></h2>
                  </div>
              </div>
              <div class="col-md-4">
                  <div class="card bg-dark border-danger p-4 shadow-sm" style="border-radius: 15px;">
                      <h6 class="text-muted fw-bold">ENTRENADORES EN NÓMINA</h6>
                      <h2 class="text-white fw-bold">${data.totalEntrenadores} <i class="bi bi-person-badge text-danger fs-4 float-end"></i></h2>
                  </div>
              </div>
          </div>
        `;
      }
    } catch (e) {
      vistaResumen.innerHTML = '<h5 class="text-danger mt-4 text-center">Error al conectar con la base de datos.</h5>';
    }

  } else {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = `
      <div class="text-center py-5 mt-5">
          <i class="bi bi-tools fs-1 text-secondary mb-3"></i>
          <h3 class="text-white fw-bold">Módulo de ${modulo.toUpperCase()}</h3>
          <p class="text-muted">Conectado a BDD. Interfaz en construcción.</p>
      </div>
    `;
  }
}

// Para que cargue automáticamente al entrar
document.addEventListener('DOMContentLoaded', () => {
  cargarModulo('resumen');
});
