/**
 * Función principal para simular la lectura de un código en el torniquete
 * Realiza una petición POST al servidor con el ID ingresado.
 */
async function simularEscaneo() {
  // Referencias a elementos del DOM
  const id = document.getElementById('txtIdCliente').value;
  const luz = document.getElementById('luz-estado');
  const msg = document.getElementById('mensaje');
  const icono = document.getElementById('icono');

  // Validación simple de entrada
  if(!id) {
    alert("Ingresa un ID");
    return;
  }

  try {
    // Petición al Backend (Asegúrate de que el servidor WildFly esté activo)
    const res = await fetch(`https://gimnasio-f7td.onrender.com/Gimnasio/api/accesos/escanear/${id}`, { method: 'POST' });

    if(res.ok) {
      const data = await res.json();
      msg.textContent = data.mensaje;

      // Aplicar efectos visuales basados en la respuesta del servidor (ENTRADA o SALIDA)
      if(data.tipo === "ENTRADA") {
        luz.className = "status-circle entrada";
        icono.textContent = "👋";
      } else {
        luz.className = "status-circle salida";
        icono.textContent = "🚪";
      }

      // Resetear visualmente el torniquete al estado "Bloqueado" tras 3 segundos
      setTimeout(() => {
        luz.className = "status-circle";
        icono.textContent = "🔒";
        msg.textContent = "Esperando QR...";
      }, 3000);

    } else {
      // Manejo de error cuando el servidor responde negativamente o no encuentra el ID
      alert("Error en el sistema o ID no registrado. ¿El servidor está corriendo?");
    }
  } catch(e) {
    // Manejo de errores de conexión o red
    console.error("Error de conexión:", e);
    alert("No se pudo conectar con el servidor.");
  }
}
