document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 1. CONFIGURACIÓN DE APIS
  // ==========================================
  const CONFIG = {
    API_MEMBRESIAS: "https://gimnasio-f7td.onrender.com/Gimnasio/api/membresias",
    API_VENTAS: "https://gimnasio-f7td.onrender.com/Gimnasio/api/ventas/membresia"
  };

  // Variables globales para almacenar lo que viene de la base de datos
  let planes = {};
  let planInicialId = null;

  // Extraer el ID que viene en la URL por si el usuario eligió un plan desde el inicio
  const params = new URLSearchParams(window.location.search);
  const urlId = parseInt(params.get('id'));

  // ==========================================
  // 2. OBTENER PLANES DESDE LA BASE DE DATOS
  // ==========================================
  async function cargarPlanesBD() {
    // Rescatamos el ID de la empresa (Arquitectura multi-tenant). Por defecto 1 (Iron Fitness)
    let idEmpresaLogueada = localStorage.getItem('id_empresa') || sessionStorage.getItem('id_empresa') || 1;

    try {
      const response = await fetch(`${CONFIG.API_MEMBRESIAS}?idEmpresa=${idEmpresaLogueada}`);

      if (response.ok) {
        const data = await response.json();

        // Llenamos el objeto "planes" dinámicamente con los datos reales de PostgreSQL
        data.forEach(plan => {
          planes[plan.id] = {
            id: plan.id,
            nombre: plan.nombre,
            precio: plan.precio,
            descripcion: plan.descripcion // Usamos 'descripcion' tal como está en tu tabla
          };
        });

        // Definir qué plan mostrar seleccionado por defecto en el menú
        if (urlId && planes[urlId]) {
          planInicialId = urlId;
        } else if (data.length > 0) {
          planInicialId = data[0].id; // Si no hay ID en la URL, toma el primero de la BD
        }

        // Una vez que tenemos los datos, armamos el selector y actualizamos precios
        construirSelectorUI();
        actualizarPrecios();

      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los planes desde el servidor.', background: '#1e1e1e', color: '#ffffff' });
      }
    } catch (error) {
      console.error("Error al conectar con la API de membresías:", error);
      Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'No se pudo conectar con el servidor para obtener los precios.', background: '#1e1e1e', color: '#ffffff' });
    }
  }

  // ==========================================
  // 3. CREAR EL SELECTOR DINÁMICAMENTE
  // ==========================================
  function construirSelectorUI() {
    const spanNombreSup = document.getElementById('resumen-nombre-plan-sup');
    if (spanNombreSup) {
      let opcionesHTML = '';

      // Recorremos los planes que nos trajo la base de datos para armar las opciones
      for (const key in planes) {
        const p = planes[key];
        const isSelected = p.id === planInicialId ? 'selected' : '';
        opcionesHTML += `<option value="${p.id}" ${isSelected}>${p.nombre} - $${p.precio.toFixed(2)} / mes</option>`;
      }

      spanNombreSup.outerHTML = `
        <select id="selectorPlan" class="form-select bg-dark text-white border-warning mt-2 mb-4 fw-bold shadow-sm" style="cursor: pointer;">
            ${opcionesHTML}
        </select>
      `;

      // Escuchar cuando el usuario cambia el plan en el select
      document.getElementById('selectorPlan').addEventListener('change', actualizarPrecios);
    }
  }

  // ==========================================
  // 4. ACTUALIZAR PRECIOS EN VIVO
  // ==========================================
  function actualizarPrecios() {
    const selector = document.getElementById('selectorPlan');
    const idActual = selector ? parseInt(selector.value) : planInicialId;
    const plan = planes[idActual];

    if (!plan) return; // Protección por si los datos aún no cargan

    // Actualizar el precio gigante principal
    const tituloPrecioPrincipal = document.querySelector('.price-main');
    if(tituloPrecioPrincipal) tituloPrecioPrincipal.innerText = '$ ' + plan.precio.toFixed(2);

    // Buscar Subtotal y Total para actualizarlos y quitar los guiones o "cargando"
    const celdasPrecio = document.querySelectorAll('.summary-content span:not(#resumen-nombre-plan-inf)');
    celdasPrecio.forEach(celda => {
      const texto = celda.innerText;
      if(texto.includes('--') || texto.toLowerCase().includes('cargando') || (texto.includes('$') && !texto.includes('0.00'))) {
        celda.innerText = '$ ' + plan.precio.toFixed(2);
      }
    });

    const spanNombreInf = document.getElementById('resumen-nombre-plan-inf');
    if(spanNombreInf) spanNombreInf.innerText = plan.nombre;
  }

  // Arrancamos el proceso de carga apenas se abre la pantalla
  cargarPlanesBD();


  // ==========================================
  // 5. CÓDIGO PROMOCIONAL (Tu código intacto)
  // ==========================================
  const btnApplyPromo = document.getElementById('btnApplyPromo');
  const inputPromo = document.getElementById('inputPromo');
  const promoMessage = document.getElementById('promoMessage');

  if (btnApplyPromo) {
    btnApplyPromo.addEventListener('click', () => {
      if (inputPromo.value.trim() !== '') {
        btnApplyPromo.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        setTimeout(() => {
          btnApplyPromo.innerText = 'Aplicar';
          if(promoMessage) promoMessage.classList.remove('d-none');
        }, 1000);
      }
    });
  }

  // ==========================================
  // 6. PROCESAR PAGO (TRANSFERENCIA) - Tu lógica intacta, conectada a los datos de la BD
  // ==========================================
  const formPago = document.getElementById('pagoTransferenciaForm');
  const btnSubmit = document.getElementById('btnSubmit');

  if (formPago) {
    formPago.addEventListener('submit', async (e) => {
      e.preventDefault();

      // 1. Validamos la sesión
      let usuarioTexto = sessionStorage.getItem('usuarioLogueado') || localStorage.getItem('usuarioLogueado');
      if (!usuarioTexto) {
        alert("¡Alto ahí! Para registrar un pago, primero debes iniciar sesión.");
        window.location.href = 'login.html';
        return;
      }

      // 2. Capturamos la FOTO
      const fileInput = document.getElementById('imagenComprobante');
      const file = fileInput ? fileInput.files[0] : null;

      if (!file) {
        Swal.fire({ icon: 'warning', title: 'Falta foto', text: 'Por favor, sube la foto del comprobante de transferencia.', background: '#1e1e1e', color: '#ffffff' });
        return;
      }

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Subiendo comprobante...';

      let usuarioActivo = JSON.parse(usuarioTexto);
      let idUsuario = usuarioActivo.idUsuario || usuarioActivo.id;
      let idEmpresa = usuarioActivo.idEmpresa || usuarioActivo.id_empresa || localStorage.getItem('id_empresa') || 1;

      // Usamos el plan que está seleccionado en el desplegable (que vino de tu base de datos)
      const selector = document.getElementById('selectorPlan');
      const idPlanFinal = selector ? parseInt(selector.value) : planInicialId;
      const planFinal = planes[idPlanFinal];

      // 3. Convertimos la imagen a Texto (Base64)
      const reader = new FileReader();
      reader.onloadend = async function() {
        const base64String = reader.result;

        // Capturamos lo que el usuario escribió
        const numRef = document.getElementById('numeroComprobante') ? document.getElementById('numeroComprobante').value : 'S/N';
        const motivo = document.getElementById('motivoPago') ? document.getElementById('motivoPago').value : 'Renovación de Plan';

        // 4. Armamos el paquete de datos COMPLETO usando el plan dinámico
        const datosPago = {
          idUsuario: idUsuario,
          idMembresia: planFinal.id,
          monto: planFinal.precio,
          idEmpresa: idEmpresa,
          comprobanteFoto: base64String, // La foto
          numeroReferencia: numRef,      // Número de transacción
          motivo: motivo                 // Motivo
        };

        try {
          const res = await fetch(CONFIG.API_VENTAS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosPago)
          });

          if (res.ok) {
            btnSubmit.classList.remove('btn-warning');
            btnSubmit.classList.add('btn-success');
            btnSubmit.innerHTML = '<i class="bi bi-check-circle-fill"></i> ¡Comprobante Enviado!';

            Swal.fire({
              icon: 'success',
              title: 'Pago Registrado',
              text: 'Tu comprobante está en revisión. El mes se activará en cuanto Recepción apruebe la foto.',
              confirmButtonColor: '#ffc107',
              background: '#1e1e1e', color: '#ffffff'
            }).then(() => {
              window.location.href = 'DashboardCliente.html';
            });
          } else {
            const errorData = await res.json();
            Swal.fire({ icon: 'error', title: 'Rechazado', text: errorData.mensaje || 'Error al guardar.', background: '#1e1e1e', color: '#ffffff' });
            restaurarBoton();
          }
        } catch (error) {
          console.error(error);
          Swal.fire({ icon: 'error', title: 'Error de red', text: 'Verifica tu conexión a internet.', background: '#1e1e1e', color: '#ffffff' });
          restaurarBoton();
        }
      };

      function restaurarBoton() {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Confirmar Pago Registrado';
      }

      // Iniciamos el proceso de lectura de la imagen
      reader.readAsDataURL(file);
    });
  }
});

// ==========================================
// Mostrar/Ocultar el código QR de Deuna!
// (Mantenido fuera del DOMContentLoaded para que funcione el onclick del HTML)
// ==========================================
function toggleQR() {
  const qrContainer = document.getElementById('qr-container');
  if (qrContainer.style.display === 'none' || qrContainer.style.display === '') {
    qrContainer.style.display = 'block';
  } else {
    qrContainer.style.display = 'none';
  }
}
