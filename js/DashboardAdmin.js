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
function cargarModulo(modulo, elementoHTML) {

  // A) Actualizar el título en la barra superior basado en el módulo seleccionado
  const tituloMap = {
    'resumen': 'Panel de Control',
    'usuarios': 'Gestión de Usuarios Staff',
    'clientes': 'Gestión de Clientes',
    'entrenadores': 'Gestión de Entrenadores',
    'pagos': 'Control de Pagos y Membresías',
    'reportes': 'Reportes y Auditoría'
  };
  document.getElementById('page-title').innerText = tituloMap[modulo] || 'Panel';

  // B) Efecto visual en el Sidebar: quita la clase 'active' de todos y la añade al clickeado
  const links = document.querySelectorAll('#sidebarMenu .nav-link');
  links.forEach(link => link.classList.remove('active')); // Limpia todos
  elementoHTML.classList.add('active'); // Activa el actual

  // C) Lógica de Vistas: Muestra/Oculta los contenedores HTML
  const vistaResumen = document.getElementById('vista-resumen');
  const contenedorDinamico = document.getElementById('vista-dinamica-contenedor');

  // Si se elige "resumen", se muestra el bloque inicial y se vacía el dinámico
  if (modulo === 'resumen') {
    vistaResumen.style.display = 'block';
    contenedorDinamico.innerHTML = '';
  } else {
    // Si se elige otra opción, se oculta el resumen y se muestra un Skeleton/Loader
    vistaResumen.style.display = 'none';

    // Inyección de HTML dinámico simulando la carga del módulo
    contenedorDinamico.innerHTML = `
      <div class="text-center py-5">
          <i class="bi bi-cone-striped fs-1 text-warning mb-3"></i>
          <h4 class="text-white">Módulo de ${modulo.charAt(0).toUpperCase() + modulo.slice(1)}</h4>
          <p class="text-muted">Conectando con API...</p>
          <div class="spinner-border text-warning" role="status">
              <span class="visually-hidden">Cargando...</span>
          </div>
      </div>
    `;
  }
}
