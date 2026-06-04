/**
 * Lógica para la redirección inteligente desde el Home o Tienda.
 * Actúa como un "portero": Si tienes sesión, te manda a tu panel. Si no, al Login.
 */

function irAZonaSocios() {
  // Obtenemos los datos desde el localStorage
  const sesion = localStorage.getItem('usuarioLogueado');

  if (sesion) {
    try {
      const usuario = JSON.parse(sesion);

      // Obtenemos el ID del rol tal como lo devuelve tu base de datos al hacer login
      const rolId = usuario.idRol || usuario.id_rol;

      // Evaluamos el número del rol (1=Admin, 2=Recep, 3=Entrenador, 4=Cliente)
      switch (Number(rolId)) {
        case 1:
          window.location.href = 'DashboardAdmin.html';
          break;
        case 2:
          window.location.href = 'DashboardRecep.html';
          break;
        case 3:
          window.location.href = 'DashboardEntrenador.html';
          break;
        case 4:
          window.location.href = 'DashboardCliente.html';
          break;
        default:
          console.warn("Rol desconocido:", rolId);
          // Si el rol es desconocido, por seguridad lo mandamos al login
          localStorage.removeItem('usuarioLogueado');
          window.location.href = 'login.html';
          break;
      }

    } catch (e) {
      // Si el JSON está roto o manipulado, limpiamos y mandamos al login
      console.error("Error leyendo la sesión en localStorage:", e);
      localStorage.removeItem('usuarioLogueado');
      window.location.href = 'login.html';
    }
  } else {
    // Si no existe la variable en localStorage, enviamos al usuario a iniciar sesión
    window.location.href = 'login.html';
  }
}
// ==========================================
// RENDERIZADO DINÁMICO DE PLANES (CONECTADO A BDD)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  cargarPlanesDesdeBDD();
});

async function cargarPlanesDesdeBDD() {
  const contenedor = document.getElementById('contenedor-planes');
  if (!contenedor) return;

  try {
    // 1. LLAMADA REAL A TU BACKEND EN JAVA
    const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/admin/planes-activos');

    if (!res.ok) throw new Error("Error en el servidor");

    const planes = await res.json();

    if (planes.length === 0) {
      contenedor.innerHTML = '<div class="col-12 text-center text-white"><p>No hay planes disponibles por el momento. ¡Vuelve pronto!</p></div>';
      return;
    }

    // 2. DIBUJAMOS LAS TARJETAS DINÁMICAMENTE CON LOS DATOS DE LA BDD
    let tarjetasHTML = planes.map((plan, index) => {

      // Convertimos la descripción de la BDD a una lista con vistos buenos (separando por comas o puntos)
      let beneficiosTexto = plan.descripcion ? plan.descripcion : "Acceso a máquinas,Zona de pesas libres";
      const listaBeneficios = beneficiosTexto.split(/[,.]/).filter(i => i.trim() !== '').map(item =>
        `<li class="mb-3 text-dark text-start"><i class="bi bi-check-circle-fill text-success me-2"></i> ${item.trim()}</li>`
      ).join('');

      // Si el plan es el "recomendado" (podemos asumir que es el segundo plan, o el que se llame VIP/Black)
      if (index === 1 || plan.nombre.toLowerCase().includes('vip') || plan.nombre.toLowerCase().includes('black')) {
        return `
          <div class="col-md-5 col-lg-4 mb-4">
            <div class="card h-100 border-0 border-warning border-3 d-flex flex-column shadow-lg position-relative transform-scale">
              <div class="position-absolute top-0 start-50 translate-middle badge bg-warning text-dark px-3 py-2 fs-6 rounded-pill" style="z-index: 10;">
                <i class="bi bi-star-fill"></i> Recomendado
              </div>
              <div class="card-header bg-warning text-center py-4 d-flex flex-column justify-content-center pt-5" style="min-height: 104px;">
                <h4 class="fw-bold text-dark mb-2">${plan.nombre.toUpperCase()}</h4>
                <div><span class="badge bg-dark">Más Popular</span></div>
              </div>
              <div class="card-body text-center py-5 d-flex flex-column">
                <h2 class="display-4 fw-bold text-dark">$${parseFloat(plan.precio).toFixed(2)}<span class="fs-6 text-muted">/mes</span></h2>
                <ul class="list-unstyled mt-4 mb-5 mx-auto" style="max-width: 250px;">
                  ${listaBeneficios}
                </ul>
                <a href="checkout.html?id=${plan.id}&nombre=${encodeURIComponent(plan.nombre)}&precio=${plan.precio}" class="btn btn-dark w-100 rounded-pill mt-auto fw-bold py-3">Seleccionar Plan</a>
              </div>
            </div>
          </div>
        `;
      }
      // Diseño para planes estándar (blancos)
      else {
        return `
          <div class="col-md-5 col-lg-4 mb-4">
            <div class="card h-100 border-0 d-flex flex-column shadow-lg">
              <div class="card-header bg-white text-center py-4 d-flex flex-column justify-content-center" style="min-height: 104px;">
                <h4 class="fw-bold mb-2 text-dark">${plan.nombre.toUpperCase()}</h4>
                <div><span class="badge bg-secondary">Básico</span></div>
              </div>
              <div class="card-body text-center py-5 d-flex flex-column">
                <h2 class="display-4 fw-bold text-dark">$${parseFloat(plan.precio).toFixed(2)}<span class="fs-6 text-muted">/mes</span></h2>
                <ul class="list-unstyled mt-4 mb-5 mx-auto" style="max-width: 250px;">
                  ${listaBeneficios}
                </ul>
                <a href="checkout.html?id=${plan.id}&nombre=${encodeURIComponent(plan.nombre)}&precio=${plan.precio}" class="btn btn-dark w-100 rounded-pill mt-auto fw-bold py-3">Seleccionar Plan</a>
              </div>
            </div>
          </div>
        `;
      }
    }).join('');

    contenedor.innerHTML = tarjetasHTML;

  } catch (error) {
    console.error("Error cargando los planes:", error);
    contenedor.innerHTML = '<div class="col-12 text-center text-danger"><p><i class="bi bi-exclamation-triangle"></i> Error al conectar con el servidor para cargar planes.</p></div>';
  }
}
