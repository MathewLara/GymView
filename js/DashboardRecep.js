// Función enlazada al botón "Salir" en el menú lateral
function cerrarSesion() {
  // Elimina las credenciales del almacenamiento
  localStorage.removeItem('tokenGimnasio');
  // Opcional: limpiar también los datos del usuario
  sessionStorage.removeItem('usuarioLogueado');
  // Redirige al inicio de sesión
  window.location.href = 'index.html';
}

// ==========================================
// NAVEGACIÓN DINÁMICA DEL DASHBOARD (SPA)
// ==========================================

// Función que cambia el contenido visible según la opción clickeada
function cargarModulo(modulo, elementoHTML) {

  // 1. Actualizar el título en la barra superior basado en el módulo seleccionado
  const tituloMap = {
    'resumen': 'Recepción - Panel Operativo',
    'acceso': 'Control de Acceso (Escáner QR)',
    'clientes': 'Directorio de Socios',
    'pagos': 'Gestión de Caja y Pagos',
    'entrenadores': 'Horarios de Entrenadores'
  };
  document.getElementById('page-title').innerText = tituloMap[modulo] || 'Recepción';

  // 2. Efecto visual en el Sidebar: quita 'active' de todos y lo añade al actual
  if (elementoHTML) {
    const links = document.querySelectorAll('#sidebarMenu .nav-link');
    links.forEach(link => link.classList.remove('active'));
    elementoHTML.classList.add('active');
  }

  // 3. Lógica de Vistas: Muestra/Oculta los contenedores HTML
  const vistaResumen = document.getElementById('vista-resumen');
  const contenedorDinamico = document.getElementById('vista-dinamica-contenedor');

  // A) Si se elige "resumen", muestra la pantalla inicial con botones rápidos
  if (modulo === 'resumen') {
    vistaResumen.style.display = 'block';
    contenedorDinamico.innerHTML = '';

    // B) Si se elige "acceso", inyecta la interfaz del escáner QR simulado (RF06)
  } else if (modulo === 'acceso') {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = `
        <div class="row justify-content-center text-center">
            <div class="col-md-6">
                <div class="card bg-black border-warning mb-4">
                    <div class="card-body py-5">
                        <i class="bi bi-qr-code-scan display-1 text-warning mb-3"></i>
                        <h4 class="text-white">Escáner Activo</h4>
                        <p class="text-muted">Esperando lectura de código QR...</p>
                        <div class="spinner-grow text-warning" role="status"></div>
                    </div>
                </div>

                <div class="input-group mb-3">
                    <input type="text" class="form-control bg-dark text-white border-secondary" placeholder="O ingrese código manual (DNI/ID)">
                    <button class="btn btn-warning" type="button">Validar</button>
                </div>
            </div>
        </div>
    `;

    // C) Para cualquier otra opción, muestra un Skeleton Loader (Pantalla de Carga)
  } else {
    vistaResumen.style.display = 'none';
    contenedorDinamico.innerHTML = `
        <div class="text-center py-5">
            <i class="bi bi-folder2-open fs-1 text-secondary mb-3"></i>
            <h4 class="text-white">Módulo ${modulo}</h4>
            <p class="text-muted">Conectando con API...</p>
        </div>
    `;
  }
}

// Se ejecuta automáticamente en cuanto el HTML termina de cargar
document.addEventListener('DOMContentLoaded', () => {
  console.log("Recepción lista (Restricción desactivada).");
});
