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
