// ==========================================
// CONFIGURACIÓN DE RUTAS Y CONSTANTES
// ==========================================
const CONFIG = {
  BASE_URL: "https://gimnasio-f7td.onrender.com",
  API_PRODUCTOS: "https://gimnasio-f7td.onrender.com/Gimnasio/api/productos",
  API_VENTAS: "https://gimnasio-f7td.onrender.com/Gimnasio/api/ventas",
  STORAGE_KEY: "IronFitness_Cart_V1"
};

let inventarioGlobal = [];

// ==========================================
// CONTROLADOR DEL CARRITO DE COMPRAS
// ==========================================
const carritoController = {
  state: {
    items: JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || []
  },

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
    // Modal toast visual en lugar de alert molesto en móviles (Opcional, usando alert por ahora)
    alert(`✅ ${productoRef.nombre} agregado al carrito.`);
  },

  eliminar: function(idProducto) {
    this.state.items = this.state.items.filter(item => item.id !== idProducto);
    this.guardar();
    this.renderizarModal();
    this.actualizarUI();
  },

  vaciar: function() {
    if(confirm("¿Estás seguro de vaciar el carrito?")) {
      this.state.items = [];
      this.guardar();
      this.renderizarModal();
      this.actualizarUI();
    }
  },

  guardar: function() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.state.items));
  },

  calcularTotal: function() {
    return this.state.items.reduce((total, item) => total + (item.precio * item.cantidad), 0);
  },

  actualizarUI: function() {
    const badge = document.getElementById('cart-badge');
    const totalItems = this.state.items.reduce((acc, item) => acc + item.cantidad, 0);
    badge.textContent = totalItems;
    if (totalItems > 0) badge.classList.remove('d-none');
    else badge.classList.add('d-none');
  },

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

    this.state.items.forEach(item => {
      const subtotal = item.precio * item.cantidad;
      const row = document.createElement('div');
      // Gap y flex ajustado para pantallas pequeñas
      row.className = 'd-flex align-items-center justify-content-between border-bottom border-secondary py-3 animate-fade-in gap-2';
      row.innerHTML = `
        <div class="d-flex align-items-center" style="min-width: 0;">
          <div class="bg-secondary rounded d-flex align-items-center justify-content-center flex-shrink-0" style="width: 50px; height: 50px; overflow:hidden;">
             <img src="${item.imagen}" class="w-100 h-100 object-fit-cover" onerror="this.src='https://via.placeholder.com/50'">
          </div>
          <div class="ms-2 ms-sm-3 text-truncate">
            <h6 class="mb-0 text-white fw-bold text-truncate">${item.nombre}</h6>
            <small class="text-warning">$${item.precio.toFixed(2)} x ${item.cantidad}</small>
          </div>
        </div>
        <div class="text-end flex-shrink-0">
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

  procesarPago: async function() {
    if (this.state.items.length === 0) {
      alert("El carrito está vacío");
      return;
    }

    // 1. NUEVA VALIDACIÓN: Verificar si el usuario está logueado antes de cobrar
    const usuarioTexto = localStorage.getItem('usuarioLogueado');

    if (!usuarioTexto) {
      alert("¡Alto ahí! Para realizar una compra, primero debes iniciar sesión.");
      window.location.href = 'login.html'; // Redirigir al login
      return;
    }

    const usuarioLogueado = JSON.parse(usuarioTexto);
    const idUsuario = usuarioLogueado.idUsuario || usuarioLogueado.id_usuario;

    // 2. Validación extra por si el JSON está corrupto
    if (!idUsuario) {
      alert("Tu sesión es inválida o expiró. Por favor, inicia sesión nuevamente.");
      localStorage.removeItem('usuarioLogueado');
      window.location.href = 'login.html';
      return;
    }

    // 3. Crear la orden de compra con el ID real del usuario
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

    const btnPagar = document.querySelector('#modalCarrito .btn-warning');
    const textoOriginal = btnPagar.innerHTML;
    btnPagar.disabled = true;
    btnPagar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Procesando...';

    try {
      const response = await fetch(CONFIG.API_VENTAS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ordenCompra)
      });

      const data = await response.json();

      if (response.ok) {
        this.state.items = [];
        this.guardar();
        this.actualizarUI();

        const modalEl = document.getElementById('modalCarrito');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();

        alert("✅ ¡Pedido confirmado! Tu factura ha sido generada correctamente.");

        // Opcional: Redirigirlo a su dashboard para que vea su nueva compra
        // window.location.href = 'DashboardCliente.html';
      } else {
        alert("❌ Error: " + (data.mensaje || "El servidor rechazó la venta."));
      }

    } catch (error) {
      console.error(error);
      alert("❌ Error de conexión. Verifica que el servidor de la API esté corriendo.");
    } finally {
      btnPagar.disabled = false;
      btnPagar.innerHTML = textoOriginal;
    }
  }
};

// ==========================================
// CONTROLADOR DE VISTA DEL CATÁLOGO
// ==========================================
const catalogoView = {
  init: async function() {
    await this.fetchProductos();
    carritoController.actualizarUI();
  },

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

  render: function(lista) {
    const container = document.getElementById('catalogo-container');
    container.innerHTML = '';

    if (!lista || lista.length === 0) {
      container.innerHTML = '<div class="col-12 text-center text-white-50">No hay productos en stock.</div>';
      return;
    }

    lista.forEach(item => {
      const id = item.idProducto || item.id;
      const imageUrl = `${CONFIG.API_PRODUCTOS}/${id}/imagen`;

      let accionesHtml = '';
      let badgeHtml = '';

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

      // CAMBIO: col-12 (Móvil) col-sm-6 (Tablet) col-lg-4 (Escritorio)
      const card = `
        <div class="col-12 col-sm-6 col-lg-4 animate-fade-in">
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

function filtrarProductos(categoria) {
  document.querySelectorAll('.nav-link').forEach(t => t.classList.remove('active'));

  const tabId = categoria === 'todos' ? 'pills-todos-tab' :
    categoria === 'venta' ? 'pills-venta-tab' : 'pills-uso-tab';

  document.getElementById(tabId)?.classList.add('active');

  if (categoria === 'todos') {
    catalogoView.render(inventarioGlobal);
  } else {
    catalogoView.render(inventarioGlobal.filter(i => i.tipo === categoria));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  catalogoView.init();
});
