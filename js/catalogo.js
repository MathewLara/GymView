// ==========================================
// CONFIGURACIÓN DE RUTAS Y CONSTANTES
// ==========================================
const CONFIG = {
  BASE_URL: "https://gimnasio-f7td.onrender.com",
  API_PRODUCTOS: "https://gimnasio-f7td.onrender.com/Gimnasio/api/productos",
  API_VENTAS: "https://gimnasio-f7td.onrender.com/Gimnasio/api/ventas",
  STORAGE_KEY: "IronFitness_Cart_V1" // Llave para guardar el carrito en LocalStorage
};

// Variable para almacenar los productos descargados del servidor
let inventarioGlobal = [];

// ==========================================
// CONTROLADOR DEL CARRITO DE COMPRAS
// ==========================================
const carritoController = {
  // Estado actual del carrito (se lee de memoria al iniciar)
  state: {
    items: JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || []
  },

  // Añade un producto al carrito o incrementa su cantidad si ya existe
  agregar: function(idProducto) {
    const productoRef = inventarioGlobal.find(p => (p.idProducto || p.id) === idProducto);
    if (!productoRef) return;

    const index = this.state.items.findIndex(item => item.id === idProducto);

    if (index >= 0) {
      this.state.items[index].cantidad++;
    } else {
      this.state.items.push({
        id: idProducto,
        nombre: productoRef.nombre,
        precio: productoRef.precio,
        cantidad: 1,
        imagen: `${CONFIG.API_PRODUCTOS}/${idProducto}/imagen`
      });
    }

    this.guardar();
    this.actualizarUI();
    alert(`✅ ${productoRef.nombre} agregado al carrito.`);
  },

  // Elimina completamente un producto del carrito
  eliminar: function(idProducto) {
    this.state.items = this.state.items.filter(item => item.id !== idProducto);
    this.guardar();
    this.renderizarModal();
    this.actualizarUI();
  },

  // Borra todos los ítems del carrito previa confirmación
  vaciar: function() {
    if(confirm("¿Estás seguro de vaciar el carrito?")) {
      this.state.items = [];
      this.guardar();
      this.renderizarModal();
      this.actualizarUI();
    }
  },

  // Persiste el carrito en el navegador para que no se pierda al recargar
  guardar: function() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.state.items));
  },

  // Suma los precios multiplicados por sus cantidades
  calcularTotal: function() {
    return this.state.items.reduce((total, item) => total + (item.precio * item.cantidad), 0);
  },

  // Actualiza el número de la burbuja roja en el botón flotante
  actualizarUI: function() {
    const badge = document.getElementById('cart-badge');
    const totalItems = this.state.items.reduce((acc, item) => acc + item.cantidad, 0);
    badge.textContent = totalItems;
    if (totalItems > 0) badge.classList.remove('d-none');
    else badge.classList.add('d-none');
  },

  // Dibuja el contenido interno de la ventana modal del carrito
  renderizarModal: function() {
    const container = document.getElementById('carrito-items-container');
    const emptyMsg = document.getElementById('carrito-vacio-msg');
    const totalLabel = document.getElementById('carrito-total-label');

    container.innerHTML = '';

    if (this.state.items.length === 0) {
      emptyMsg.classList.remove('d-none');
      totalLabel.textContent = "0.00";
      return;
    }

    emptyMsg.classList.add('d-none');

    // Crea el HTML para cada elemento guardado en el carrito
    this.state.items.forEach(item => {
      const subtotal = item.precio * item.cantidad;
      const row = document.createElement('div');
      row.className = 'd-flex align-items-center justify-content-between border-bottom border-secondary py-3 animate-fade-in';
      row.innerHTML = `
        <div class="d-flex align-items-center">
          <div class="bg-secondary rounded d-flex align-items-center justify-content-center" style="width: 50px; height: 50px; overflow:hidden;">
             <img src="${item.imagen}" class="w-100 h-100 object-fit-cover" onerror="this.src='https://via.placeholder.com/50'">
          </div>
          <div class="ms-3">
            <h6 class="mb-0 text-white fw-bold">${item.nombre}</h6>
            <small class="text-warning">$${item.precio.toFixed(2)} x ${item.cantidad}</small>
          </div>
        </div>
        <div class="text-end">
          <span class="d-block fw-bold mb-1">$${subtotal.toFixed(2)}</span>
          <button class="btn btn-sm btn-outline-danger border-0 p-1" onclick="carritoController.eliminar(${item.id})">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `;
      container.appendChild(row);
    });

    totalLabel.textContent = this.calcularTotal().toFixed(2);
  },

  // ==========================================
  // INTEGRACIÓN CON BACKEND: PROCESAR PAGO
  // ==========================================
  procesarPago: async function() {
    if (this.state.items.length === 0) {
      alert("El carrito está vacío");
      return;
    }

    // 1. Identificar si el usuario ha iniciado sesión
    const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuarioLogueado'));
    const idUsuario = usuarioLogueado ? (usuarioLogueado.idUsuario || usuarioLogueado.id_usuario || 0) : 0;

    // 2. Empaquetar datos para enviarlos al servidor (DTO)
    const ordenCompra = {
      idUsuario: idUsuario,
      total: this.calcularTotal(),
      productos: this.state.items.map(item => ({
        id: item.id,
        nombre: item.nombre,
        precio: item.precio,
        cantidad: item.cantidad
      }))
    };

    // 3. Feedback en la interfaz para evitar dobles clics
    const btnPagar = document.querySelector('#modalCarrito .btn-warning');
    const textoOriginal = btnPagar.innerHTML;
    btnPagar.disabled = true;
    btnPagar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Procesando...';

    try {
      // Envío POST de la venta a la API
      const response = await fetch(CONFIG.API_VENTAS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ordenCompra)
      });

      const data = await response.json();

      if (response.ok) {
        // VENTA EXITOSA: Limpiar carrito y cerrar modal
        this.state.items = [];
        this.guardar();
        this.actualizarUI();

        const modalEl = document.getElementById('modalCarrito');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();

        alert("✅ ¡Pedido confirmado! Tu factura ha sido generada en el sistema.");
      } else {
        alert("❌ Error: " + (data.mensaje || "El servidor rechazó la venta."));
      }

    } catch (error) {
      console.error(error);
      alert("❌ Error de conexión. Verifica que el servidor de la API esté corriendo.");
    } finally {
      // Restaurar el botón a la normalidad
      btnPagar.disabled = false;
      btnPagar.innerHTML = textoOriginal;
    }
  }
};

// ==========================================
// CONTROLADOR DE VISTA DEL CATÁLOGO (UI Productos)
// ==========================================
const catalogoView = {
  // Se ejecuta al cargar la página
  init: async function() {
    await this.fetchProductos();
    carritoController.actualizarUI();
  },

  // Obtiene los productos desde la base de datos (API)
  fetchProductos: async function() {
    const container = document.getElementById('catalogo-container');
    try {
      const response = await fetch(CONFIG.API_PRODUCTOS);

      if (response.ok) {
        inventarioGlobal = await response.json();
        this.render(inventarioGlobal);
      } else {
        container.innerHTML = '<div class="col-12 text-center text-danger mt-5"><h3>Error cargando productos</h3></div>';
      }
    } catch (error) {
      console.error(error);
      container.innerHTML = '<div class="col-12 text-center text-white-50 mt-5"><h3>Servidor desconectado</h3></div>';
    }
  },

  // Inyecta el HTML de las tarjetas dinámicamente según la lista proporcionada
  render: function(lista) {
    const container = document.getElementById('catalogo-container');
    container.innerHTML = '';

    if (!lista || lista.length === 0) {
      container.innerHTML = '<div class="col-12 text-center text-white-50">No hay productos en stock.</div>';
      return;
    }

    lista.forEach(item => {
      // Normalización de IDs en caso de variaciones en la respuesta JSON
      const id = item.idProducto || item.id;
      const imageUrl = `${CONFIG.API_PRODUCTOS}/${id}/imagen`;

      let accionesHtml = '';
      let badgeHtml = '';

      // Mostrar diferentes opciones según si es para venta o uso interno del gimnasio
      if (item.tipo === 'venta') {
        badgeHtml = `<span class="badge bg-warning text-dark mb-2">Tienda</span>`;
        accionesHtml = `
          <div class="d-flex justify-content-between align-items-end mt-3">
            <span class="fs-4 fw-bold text-warning">$${item.precio.toFixed(2)}</span>
            <button class="btn btn-warning fw-bold text-dark rounded-pill px-3" onclick="carritoController.agregar(${id})">
              <i class="bi bi-cart-plus me-1"></i> Agregar
            </button>
          </div>
        `;
      } else {
        badgeHtml = `<span class="badge border border-light text-light mb-2">Uso Interno</span>`;
        accionesHtml = `
           <div class="mt-3 pt-2 border-top border-secondary text-white-50 small">
             <i class="bi bi-info-circle me-1"></i> Solo disponible en gimnasio
           </div>
        `;
      }

      // Construcción del HTML final de la tarjeta
      const card = `
        <div class="col-md-4 col-sm-6 animate-fade-in">
          <div class="product-card">
            <img src="${imageUrl}" class="card-img-top" alt="${item.nombre}"
                 onerror="this.src='https://via.placeholder.com/400x300?text=Sin+Imagen'">
            <div class="card-body">
              ${badgeHtml}
              <h5 class="card-title text-white">${item.nombre}</h5>
              <p class="card-text text-white-50 small flex-grow-1">${item.descripcion}</p>
              ${accionesHtml}
            </div>
          </div>
        </div>
      `;
      container.innerHTML += card;
    });
  }
};

// ==========================================
// FILTRO DE CATEGORÍAS (Lógica de los Tabs)
// ==========================================
function filtrarProductos(categoria) {
  // Remover estilo de activo en todos los botones
  document.querySelectorAll('.nav-link').forEach(t => t.classList.remove('active'));

  // Aplicar estilo activo al seleccionado
  const tabId = categoria === 'todos' ? 'pills-todos-tab' :
    categoria === 'venta' ? 'pills-venta-tab' : 'pills-uso-tab';

  document.getElementById(tabId)?.classList.add('active');

  // Renderizar de nuevo filtrando el inventario local
  if (categoria === 'todos') {
    catalogoView.render(inventarioGlobal);
  } else {
    catalogoView.render(inventarioGlobal.filter(i => i.tipo === categoria));
  }
}

// Inicialización: Ejecuta el código principal cuando el documento HTML está listo
document.addEventListener('DOMContentLoaded', () => {
  catalogoView.init();
});
