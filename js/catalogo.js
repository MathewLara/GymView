// ==========================================
// FUNCIONES AUXILIARES PARA MANEJO DE COOKIES
// ==========================================
function setCookie(name, value, minutes) {
  let expires = "";
  if (minutes) {
    const date = new Date();
    date.setTime(date.getTime() + (minutes * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; Secure; SameSite=Strict";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for(let i=0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
}

function deleteCookie(name) {
  document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

// ==========================================
// 0. AUTO-REDIRECCIÓN (EL "ESCUDO" CON TIEMPO)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const sesion = getCookie('usuarioLogueado');
  const loginTime = getCookie('loginTime');
  const TIEMPO_EXPIRACION = 30 * 60 * 1000; // 30 minutos en milisegundos

  if (sesion && loginTime) {
    const tiempoTranscurrido = Date.now() - parseInt(loginTime);

    // Si pasaron más de 30 minutos, destruimos la sesión corrupta o vieja
    if (tiempoTranscurrido > TIEMPO_EXPIRACION) {
      deleteCookie('usuarioLogueado');
      deleteCookie('tokenGimnasio');
      deleteCookie('loginTime');
      deleteCookie('id_empresa');
    } else {
      // Si la sesión sigue viva (menos de 30 min), redirigimos a su panel
      try {
        const data = JSON.parse(sesion);
        const rol = data.idRol || data.id_rol;

        switch (rol) {
          case 1: window.location.href = 'DashboardAdmin.html'; break;
          case 2: window.location.href = 'DashboardRecep.html'; break;
          case 3: window.location.href = 'DashboardEntrenador.html'; break;
          case 4: window.location.href = 'DashboardCliente.html'; break;
          case 5: window.location.href = 'DashboardProveedor.html'; break;
          case 6: window.location.href = 'DashboardSuperAdmin.html'; break;
          default: deleteCookie('usuarioLogueado'); break;
        }
      } catch(e) {
        deleteCookie('usuarioLogueado');
      }
    }
  } else {
    // Limpieza de seguridad por si falta el tiempo o la sesión
    deleteCookie('usuarioLogueado');
    deleteCookie('tokenGimnasio');
    deleteCookie('loginTime');
    deleteCookie('id_empresa');
  }
});

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
    // Leemos el carrito desde la cookie en lugar de localStorage
    items: JSON.parse(getCookie(CONFIG.STORAGE_KEY)) || []
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

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `${productoRef.nombre} agregado`,
      showConfirmButton: false,
      timer: 2000,
      background: '#1e1e1e',
      color: '#ffffff'
    });
  },

  eliminar: function(idProducto) {
    this.state.items = this.state.items.filter(item => item.id !== idProducto);
    this.guardar();
    this.renderizarModal();
    this.actualizarUI();
  },

  vaciar: function() {
    Swal.fire({
      icon: 'question',
      title: '¿Vaciar carrito?',
      text: 'Se eliminarán todos los productos seleccionados.',
      showCancelButton: true,
      confirmButtonText: 'Sí, vaciar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
      background: '#1e1e1e',
      color: '#ffffff'
    }).then((result) => {
      if (result.isConfirmed) {
        this.state.items = [];
        this.guardar();
        this.renderizarModal();
        this.actualizarUI();
      }
    });
  },

  guardar: function() {
    // Guardamos el carrito en una cookie por 24 horas (1440 minutos)
    setCookie(CONFIG.STORAGE_KEY, JSON.stringify(this.state.items), 1440);
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
      Swal.fire({ icon: 'warning', title: 'Carrito vacío', text: 'Agrega productos antes de pagar.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
      return;
    }

    const usuarioTexto = getCookie('usuarioLogueado');
    if (!usuarioTexto) {
      Swal.fire({ icon: 'info', title: 'Inicia sesión', text: 'Debes iniciar sesión para comprar.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' })
        .then(() => window.location.href = 'login.html');
      return;
    }

    const usuarioLogueado = JSON.parse(usuarioTexto);
    const idUsuario = usuarioLogueado.idUsuario || usuarioLogueado.id_usuario;

    if (!idUsuario) {
      Swal.fire({ icon: 'error', title: 'Sesión inválida', text: 'Por favor, inicia sesión nuevamente.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' })
        .then(() => { deleteCookie('usuarioLogueado'); window.location.href = 'login.html'; });
      return;
    }

    const ordenCompra = {
      idUsuario: idUsuario,
      total: this.calcularTotal(),
      productos: this.state.items.map(item => ({
        id: item.id, nombre: item.nombre, precio: item.precio, cantidad: item.cantidad
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
        bootstrap.Modal.getInstance(document.getElementById('modalCarrito')).hide();

        Swal.fire({ icon: 'success', title: '¡Pedido confirmado!', text: 'Factura generada correctamente.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.mensaje || "El servidor rechazó la venta.", confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'No se pudo conectar con el servidor.', confirmButtonColor: '#ffc107', background: '#1e1e1e', color: '#ffffff' });
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

    // <-- 1. Rescatamos el ID de la empresa
    let idEmpresaLogueada = getCookie('id_empresa');

    // Por si un visitante entra al catálogo sin iniciar sesión, le mostramos la empresa 1 por defecto (Iron Fitness)
    if (!idEmpresaLogueada) {
      idEmpresaLogueada = 1;
    }

    try {
      // <-- 2. Armamos la URL pegándole el ID de la empresa al final
      const urlConFiltro = `${CONFIG.API_PRODUCTOS}?idEmpresa=${idEmpresaLogueada}`;

      const response = await fetch(urlConFiltro); // <-- 3. Usamos la nueva URL

      if (response.ok) {
        inventarioGlobal = await response.json();
        this.render(inventarioGlobal);
      } else {
        container.innerHTML = '<div class="col-12 text-center text-danger mt-5"><h3>Error cargando productos</h3></div>';
      }
    } catch (error) {
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
      const card = `
        <div class="col-12 col-sm-6 col-lg-4 animate-fade-in">
          <div class="product-card">
            <img src="${imageUrl}" class="card-img-top" alt="${item.nombre}" onerror="this.src='https://via.placeholder.com/400x300?text=Sin+Imagen'">
            <div class="card-body">
              ${item.tipo === 'venta' ? `<span class="badge bg-warning text-dark mb-2">Tienda</span>` : `<span class="badge border border-light text-light mb-2">Uso Interno</span>`}
              <h5 class="card-title text-white">${item.nombre}</h5>
              <p class="card-text text-white-50 small">${item.descripcion}</p>
              ${item.tipo === 'venta' ? `
                <div class="d-flex justify-content-between align-items-end mt-3">
                  <span class="fs-4 fw-bold text-warning">$${item.precio.toFixed(2)}</span>
                  <button class="btn btn-warning fw-bold text-dark rounded-pill px-3" onclick="carritoController.agregar(${id})">
                    <i class="bi bi-cart-plus me-1"></i> Agregar
                  </button>
                </div>` : `<div class="mt-3 text-white-50 small"><i class="bi bi-info-circle me-1"></i> Solo en gimnasio</div>`}
            </div>
          </div>
        </div>
      `;
      container.innerHTML += card;
    });
  }
};

document.addEventListener('DOMContentLoaded', () => { catalogoView.init(); });