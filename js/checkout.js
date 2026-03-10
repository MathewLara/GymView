document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 1. BASE DE DATOS LOCAL DE PLANES
  // ==========================================
  // Aquí definimos los planes para que el selector sepa los precios exactos
  const planes = {
    1: { id: 1, nombre: 'Plan Smart', precio: 24.99, dias: 30 },
    2: { id: 2, nombre: 'Plan Black', precio: 34.99, dias: 30 }
  };

  // ==========================================
  // 2. CREAR EL SELECTOR DINÁMICAMENTE
  // ==========================================
  const params = new URLSearchParams(window.location.search);
  let planInicialId = parseInt(params.get('id')) || 2;

  // Si el ID de la URL no es válido, forzamos el Plan Black
  if (!planes[planInicialId]) planInicialId = 2;

  // Reemplazamos el texto estático por un menú desplegable (Select) elegante
  const spanNombreSup = document.getElementById('resumen-nombre-plan-sup');
  if (spanNombreSup) {
    spanNombreSup.outerHTML = `
          <select id="selectorPlan" class="form-select bg-dark text-white border-warning mt-2 mb-4 fw-bold shadow-sm" style="cursor: pointer;">
              <option value="1" ${planInicialId === 1 ? 'selected' : ''}>Plan Smart - $24.99 / mes</option>
              <option value="2" ${planInicialId === 2 ? 'selected' : ''}>Plan Black - $34.99 / mes</option>
          </select>
      `;
  }

  // ==========================================
  // 3. FUNCIÓN PARA ACTUALIZAR PRECIOS EN VIVO
  // ==========================================
  function actualizarPrecios() {
    const selector = document.getElementById('selectorPlan');
    const idActual = selector ? parseInt(selector.value) : planInicialId;
    const plan = planes[idActual];

    // Actualizar el precio gigante principal
    const tituloPrecioPrincipal = document.querySelector('.price-main');
    if(tituloPrecioPrincipal) tituloPrecioPrincipal.innerText = '$ ' + plan.precio.toFixed(2);

    // Buscar Subtotal y Total para actualizarlos y ELIMINAR EL "CARGANDO..."
    const celdasPrecio = document.querySelectorAll('.summary-content span:not(#resumen-nombre-plan-inf)');
    celdasPrecio.forEach(celda => {
      const texto = celda.innerText;
      // Si la celda dice Cargando, tiene guiones, o ya tiene un signo de dólar (que no sea un impuesto en $0.00)
      if(texto.includes('--') || texto.toLowerCase().includes('cargando') || (texto.includes('$') && !texto.includes('0.00'))) {
        celda.innerText = '$ ' + plan.precio.toFixed(2);
      }
    });

    // Actualizar el texto inferior (el pequeñito, si existe)
    const spanNombreInf = document.getElementById('resumen-nombre-plan-inf');
    if(spanNombreInf) spanNombreInf.innerText = plan.nombre;
  }

  // Ejecutar la primera vez inmediatamente para limpiar la pantalla y quitar el "Cargando..."
  actualizarPrecios();

  // Escuchar cuando el usuario le dé clic al selector y cambie de plan
  const selectorPlanElement = document.getElementById('selectorPlan');
  if (selectorPlanElement) {
    selectorPlanElement.addEventListener('change', actualizarPrecios);
  }

  // ==========================================
  // 4. CÓDIGO PROMOCIONAL (Simulación visual)
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
  // 5. PROCESAR PAGO REAL Y RENOVAR MEMBRESÍA
  // ==========================================
  const checkoutForm = document.getElementById('checkoutForm');
  const btnSubmit = document.getElementById('btnSubmit');

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Autorizando pago...';

      // Validamos la sesión
      let usuarioTexto = sessionStorage.getItem('usuarioLogueado') || localStorage.getItem('usuarioLogueado');

      if (!usuarioTexto) {
        alert("¡Alto ahí! Para comprar o renovar un plan, primero debes iniciar sesión con tu cuenta.");
        window.location.href = 'login.html';
        return;
      }

      let usuarioActivo = JSON.parse(usuarioTexto);
      let idUsuario = usuarioActivo.idUsuario || usuarioActivo.id;

      if (!idUsuario) {
        alert("Tu sesión es inválida o expiró. Por favor, inicia sesión nuevamente.");
        window.location.href = 'login.html';
        return;
      }

      // IMPORTANTE: Leemos qué plan está seleccionado EXACTAMENTE en este momento
      const selector = document.getElementById('selectorPlan');
      const idPlanFinal = selector ? parseInt(selector.value) : planInicialId;
      const planFinal = planes[idPlanFinal];

      const datosPago = {
        idUsuario: idUsuario,
        idMembresia: planFinal.id,
        monto: planFinal.precio,
        dias: planFinal.dias
      };

      try {
        const res = await fetch('https://gimnasio-f7td.onrender.com/Gimnasio/api/ventas/membresia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datosPago)
        });

        if (res.ok) {
          btnSubmit.classList.remove('btn-pay', 'btn-warning');
          btnSubmit.classList.add('btn-success');
          btnSubmit.innerHTML = '<i class="bi bi-check-circle-fill"></i> ¡Pago Aprobado!';

          setTimeout(() => {
            window.location.href = 'DashboardCliente.html';
          }, 1500);
        } else {
          const errorData = await res.json();
          alert("Rechazado por Base de Datos:\n\n" + errorData.mensaje);
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = 'Suscribirse';
        }
      } catch (error) {
        alert("Error de conexión con el banco de pruebas.");
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Suscribirse';
      }
    });
  }
});
