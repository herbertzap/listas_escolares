// Variables globales
let currentListaId = null;
let productosSeleccionados = new Set();
let allProductos = [];
let selectedRegionId = null;
let regionSearchTimeout = null;
let comunaSearchTimeout = null;
let isAdminMode = false;
let currentColegioInfo = null; // Para almacenar información del colegio actual
let isAddingProducts = false; // Para rastrear si estamos agregando productos

// Variables de paginación
let currentPage = 1;
let itemsPerPage = 10;
let totalPages = 1;
let totalItems = 0;

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Sistema de Listas Escolares iniciado');
    
    // Cargar datos iniciales
    cargarRegiones();
    setupEventListeners();
    initAutocomplete();
    
    // Cargar filtros
    cargarFiltrosCliente();
    
    // Actualizar UI del modo
    updateModeUI();
});

// Configurar event listeners
function setupEventListeners() {
    // Selectores en cascada (modo Cliente)
    const selectClienteRegion = document.getElementById('selectClienteRegion');
    const selectClienteComuna = document.getElementById('selectClienteComuna');
    const selectClienteNivel = document.getElementById('selectClienteNivel');
    
    if (selectClienteRegion) {
        selectClienteRegion.addEventListener('change', onClienteRegionChange);
    }
    if (selectClienteComuna) {
        selectClienteComuna.addEventListener('change', onClienteComunaChange);
    }
    if (selectClienteNivel) {
        selectClienteNivel.addEventListener('change', onClienteNivelChange);
    }
    
    // Filtros de Admin (solo si estamos en modo admin)
    const adminFilterRegion = document.getElementById('adminFilterRegion');
    const adminFilterComuna = document.getElementById('adminFilterComuna');
    const adminFilterColegio = document.getElementById('adminFilterColegio');
    const adminFilterNivel = document.getElementById('adminFilterNivel');
    
    if (adminFilterRegion) {
        adminFilterRegion.addEventListener('change', onAdminRegionChange);
    }
    if (adminFilterComuna) {
        adminFilterComuna.addEventListener('change', onAdminComunaChange);
    }
    if (adminFilterColegio) {
        adminFilterColegio.addEventListener('input', debounce(onAdminColegioChange, 300));
    }
    if (adminFilterNivel) {
        adminFilterNivel.addEventListener('change', onAdminNivelChange);
    }
}

// Función debounce para evitar demasiadas peticiones
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== FUNCIONES PRINCIPALES =====

// ===== GESTIÓN DE SELECTS EN CASCADA =====

// Cargar regiones disponibles
async function cargarRegiones() {
    try {
        console.log('🔄 Cargando regiones...');
        
        const response = await fetch('/api/listas/regiones');
        const data = await response.json();
        
        if (data.success) {
            renderClienteRegiones(data.data);
        } else {
            console.error('❌ Error cargando regiones:', data.error);
        }
    } catch (error) {
        console.error('❌ Error cargando regiones:', error);
    }
}



// Cargar filtros para Cliente
async function cargarFiltrosCliente() {
    try {
        // Cargar regiones
        const regionesResponse = await fetch('/api/chile/regiones');
        const regionesData = await regionesResponse.json();
        if (regionesData.success) {
            renderClienteRegiones(regionesData.data);
        }
        
        // Cargar todas las listas inicialmente
        await aplicarFiltrosCliente();
        
        // Cargar niveles (todos)
        const nivelesResponse = await fetch('/api/listas/niveles');
        const nivelesData = await nivelesResponse.json();
        if (nivelesData.success) {
            renderClienteNiveles(nivelesData.data);
        }
        
        // Configurar autocompletado de colegios
        setupColegioAutocomplete();
        
    } catch (error) {
        console.error('Error cargando filtros cliente:', error);
    }
}

// Renderizar regiones en filtro Cliente
function renderClienteRegiones(regiones) {
    const select = document.getElementById('selectClienteRegion');
    if (!select) return;
    
    select.innerHTML = '<option value="">Todas las regiones</option>';
    
    regiones.forEach(region => {
        const option = document.createElement('option');
        // Manejar tanto objetos {id, nombre} como strings
        if (typeof region === 'object' && region !== null) {
            option.value = region.nombre || region.region || region;
            option.textContent = region.nombre || region.region || JSON.stringify(region);
        } else {
        option.value = region;
        option.textContent = region;
        }
        select.appendChild(option);
    });
}

// Renderizar comunas en filtro Cliente
function renderClienteComunas(comunas) {
    const select = document.getElementById('selectClienteComuna');
    if (!select) return;
    
    select.innerHTML = '<option value="">Todas las comunas</option>';
    
    comunas.forEach(comuna => {
        const option = document.createElement('option');
        option.value = comuna;
        option.textContent = comuna;
        select.appendChild(option);
    });
}

// Renderizar niveles en filtro Cliente
function renderClienteNiveles(niveles) {
    const select = document.getElementById('selectClienteNivel');
    if (!select) return;
    
    select.innerHTML = '<option value="">Todos los niveles</option>';
    
    niveles.forEach(nivel => {
        const option = document.createElement('option');
        option.value = nivel;
        option.textContent = nivel;
        select.appendChild(option);
    });
}

// Cargar comunas por región para Cliente
async function cargarClienteComunas(region) {
    try {
        console.log('🔄 Cargando comunas para región:', region);
        
        if (!region) {
            const selectComuna = document.getElementById('selectClienteComuna');
            if (selectComuna) {
                selectComuna.innerHTML = '<option value="">Todas las comunas</option>';
            }
            return;
        }
        
        // Usar la API de Chile que acepta el nombre de la región
        const response = await fetch(`/api/chile/comunas?region=${encodeURIComponent(region)}`);
        const data = await response.json();
        
        console.log('📊 Comunas recibidas:', data);
        
        if (data.success) {
            const selectComuna = document.getElementById('selectClienteComuna');
            if (selectComuna) {
                selectComuna.innerHTML = '<option value="">Todas las comunas</option>';
                
                data.data.forEach(comuna => {
                    const option = document.createElement('option');
                    // Manejar tanto objetos como strings
                    if (typeof comuna === 'object' && comuna !== null) {
                        option.value = comuna.nombre || comuna.comuna || comuna;
                        option.textContent = comuna.nombre || comuna.comuna || JSON.stringify(comuna);
                    } else {
                    option.value = comuna;
                    option.textContent = comuna;
                    }
                    selectComuna.appendChild(option);
                });
                
                console.log('✅ Comunas cargadas:', data.data.length);
            }
        } else {
            console.error('❌ Error cargando comunas:', data.error);
            const selectComuna = document.getElementById('selectClienteComuna');
            if (selectComuna) {
                selectComuna.innerHTML = '<option value="">Error cargando comunas</option>';
            }
        }
    } catch (error) {
        console.error('❌ Error cargando comunas:', error);
        const selectComuna = document.getElementById('selectClienteComuna');
        if (selectComuna) {
            selectComuna.innerHTML = '<option value="">Error cargando comunas</option>';
        }
    }
}

// Aplicar filtros y cargar listas para Cliente
async function aplicarFiltrosCliente() {
    const region = document.getElementById('selectClienteRegion').value;
    const comuna = document.getElementById('selectClienteComuna').value;
    const colegio = document.getElementById('searchClienteColegio').value;
    
    // Mostrar indicador de carga
    const container = document.getElementById('listas-cliente-container');
    container.innerHTML = `
        <div class="text-center">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Aplicando filtros...</span>
            </div>
        </div>
    `;
    
    try {
        // Construir URL con filtros
        const params = new URLSearchParams();
        if (region) params.append('region', region);
        if (comuna) params.append('comuna', comuna);
        if (colegio) params.append('colegio', colegio);
        
        // Solicitar más listas (hasta 50) para mostrar todas
        params.append('limit', '50');
        params.append('page', '1');
        
        const response = await fetch(`/api/listas?${params.toString()}`);
        const data = await response.json();
        
        if (data.success) {
            renderClienteListas(data.data);
        } else {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No se encontraron listas con los filtros seleccionados.
                </div>
            `;
        }
    } catch (error) {
        console.error('Error aplicando filtros:', error);
        
        // Mostrar mensaje de error
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error al aplicar filtros. Intenta de nuevo.
            </div>
        `;
    }
}

// Renderizar listas para Cliente
function renderClienteListas(listas) {
    const container = document.getElementById('listas-cliente-container');
    
    if (!listas || listas.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No se encontraron listas escolares disponibles.
            </div>
        `;
        return;
    }
    
    // Agrupar por colegio
    const colegios = {};
    listas.forEach(lista => {
        const key = `${lista.nombre_colegio}-${lista.region}-${lista.comuna}`;
        if (!colegios[key]) {
            colegios[key] = {
                nombre: lista.nombre_colegio,
                region: lista.region,
                comuna: lista.comuna,
                listas: []
            };
        }
        colegios[key].listas.push(lista);
    });
    
    let html = '<div class="row">';
    
    Object.values(colegios).forEach(colegio => {
        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <div class="card-header">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-school me-2"></i>
                            ${colegio.nombre}
                        </h5>
                    </div>
                    <div class="card-body">
                        <p class="card-text">
                            <small class="text-muted">
                                <i class="fas fa-map-marker-alt me-1"></i>
                                ${colegio.comuna}, ${colegio.region}
                            </small>
                        </p>
                        <p class="card-text">
                            <strong>Niveles disponibles:</strong> ${colegio.listas.length}
                        </p>
                        <button class="btn btn-primary btn-sm" onclick="verCursosColegio('${colegio.nombre}', '${colegio.region}', '${colegio.comuna}')">
                            <i class="fas fa-list me-1"></i>
                            Ver Cursos
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Configurar autocompletado de colegios
function setupColegioAutocomplete() {
    const inputColegio = document.getElementById('inputColegio');
    const autocompleteDiv = document.getElementById('colegioAutocomplete');
    
    // Verificar que los elementos existan antes de configurar
    if (!inputColegio || !autocompleteDiv) {
        console.log('🔧 Elementos de autocompletado no encontrados (modo cliente)');
        return;
    }
    
    let timeoutId;
    
    inputColegio.addEventListener('input', function() {
        clearTimeout(timeoutId);
        const query = this.value.trim();
        
        if (query.length < 2) {
            autocompleteDiv.style.display = 'none';
            return;
        }
        
        timeoutId = setTimeout(async () => {
            try {
                const response = await fetch(`/api/listas/colegios/buscar?q=${encodeURIComponent(query)}`);
                const data = await response.json();
                
                if (data.success && data.data.length > 0) {
                    renderColegioAutocomplete(data.data);
                    autocompleteDiv.style.display = 'block';
                } else {
                    autocompleteDiv.style.display = 'none';
                }
            } catch (error) {
                console.error('Error buscando colegios:', error);
                autocompleteDiv.style.display = 'none';
            }
        }, 300);
    });
    
    // Ocultar autocompletado al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!inputColegio.contains(e.target) && !autocompleteDiv.contains(e.target)) {
            autocompleteDiv.style.display = 'none';
        }
    });
}

// Renderizar autocompletado de colegios
function renderColegioAutocomplete(colegios) {
    const autocompleteDiv = document.getElementById('colegioAutocomplete');
    
    autocompleteDiv.innerHTML = '';
    
    colegios.forEach(colegio => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = `
            <div class="colegio-nombre">${colegio.nombre_colegio}</div>
            <div class="colegio-info">${colegio.comuna}, ${colegio.region} (${colegio.total_listas} niveles)</div>
        `;
        
        item.addEventListener('click', function() {
            document.getElementById('inputColegio').value = colegio.nombre_colegio;
            autocompleteDiv.style.display = 'none';
        });
        
        autocompleteDiv.appendChild(item);
    });
}

// Cuando se cambia la región en Cliente
async function onClienteRegionChange() {
    const selectClienteRegion = document.getElementById('selectClienteRegion');
    const selectClienteComuna = document.getElementById('selectClienteComuna');
    
    // Limpiar comuna cuando cambia región
    if (selectClienteComuna) {
        selectClienteComuna.innerHTML = '<option value="">Todas las comunas</option>';
    }
    
    if (selectClienteRegion.value) {
        cargarClienteComunas(selectClienteRegion.value);
    }
    
    // Aplicar filtros automáticamente
    aplicarFiltrosCliente();
}

// Cuando se cambia la comuna en Cliente
async function onClienteComunaChange() {
    // Aplicar filtros automáticamente cuando cambia comuna
    aplicarFiltrosCliente();
}

// Buscar colegios con debounce
let buscarClienteColegiosTimeout;
function buscarClienteColegios() {
    clearTimeout(buscarClienteColegiosTimeout);
    buscarClienteColegiosTimeout = setTimeout(() => {
        aplicarFiltrosCliente();
    }, 300);
}

// Cargar colegios disponibles
async function cargarColegios() {
    try {
        const region = document.getElementById('selectClienteRegion').value;
        const comuna = document.getElementById('selectClienteComuna').value;
        
        console.log('🔄 Cargando colegios...', { region, comuna });
        
        const selectColegio = document.getElementById('selectColegio');
        const btnBuscar = document.getElementById('btnBuscar');
        
        // Solo cargar si hay al menos una selección
        if (!region && !comuna) {
            selectColegio.innerHTML = '<option value="">Selecciona región o comuna</option>';
            selectColegio.disabled = true;
            btnBuscar.disabled = true;
            return;
        }
        
        // Mostrar indicador de carga
        selectColegio.innerHTML = '<option value="">Cargando colegios...</option>';
        selectColegio.disabled = true;
        btnBuscar.disabled = true;
        
        const params = new URLSearchParams();
        if (region) params.append('region', region);
        if (comuna) params.append('comuna', comuna);
        
        const url = `/api/listas/colegios?${params}`;
        console.log('🌐 URL de búsqueda:', url);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('📊 Colegios recibidos:', data);
        
        if (data.success) {
            renderColegios(data.data);
            selectColegio.disabled = false;
            btnBuscar.disabled = false;
            
            // Mostrar mensaje si no hay resultados
            if (data.data.length === 0) {
                selectColegio.innerHTML = '<option value="">No se encontraron colegios</option>';
                btnBuscar.disabled = true;
            }
        } else {
            console.error('❌ Error en la respuesta:', data.error);
            selectColegio.innerHTML = '<option value="">Error al cargar colegios</option>';
            selectColegio.disabled = true;
            btnBuscar.disabled = true;
            showError('Error cargando colegios: ' + data.error);
        }
    } catch (error) {
        console.error('❌ Error cargando colegios:', error);
        const selectColegio = document.getElementById('selectColegio');
        const btnBuscar = document.getElementById('btnBuscar');
        selectColegio.innerHTML = '<option value="">Error de conexión</option>';
        selectColegio.disabled = true;
        btnBuscar.disabled = true;
        showError('Error de conexión al cargar colegios');
    }
}

// Renderizar colegios en el select
function renderColegios(colegios) {
    const select = document.getElementById('selectColegio');
    select.innerHTML = '<option value="">Selecciona un colegio...</option>';
    
    colegios.forEach(colegio => {
        const option = document.createElement('option');
        option.value = colegio.nombre_colegio;
        option.textContent = `${colegio.nombre_colegio} - ${colegio.comuna}, ${colegio.region} (${colegio.total_listas} niveles)`;
        select.appendChild(option);
    });
}

// Cuando se selecciona un colegio
async function onColegioChange() {
    const colegio = document.getElementById('selectColegio').value;
    const selectNivel = document.getElementById('selectClienteNivel');
    
    if (!colegio) {
        selectNivel.innerHTML = '<option value="">Primero selecciona un colegio...</option>';
        selectNivel.disabled = true;
        document.getElementById('productos-container').style.display = 'none';
        return;
    }
    
    try {
        const region = document.getElementById('selectClienteRegion').value;
        const comuna = document.getElementById('selectClienteComuna').value;
        
        const params = new URLSearchParams();
        if (region) params.append('region', region);
        if (comuna) params.append('comuna', comuna);
        
        const response = await fetch(`/api/listas/colegio/${encodeURIComponent(colegio)}/niveles?${params}`);
        const data = await response.json();
        
        if (data.success) {
            renderNiveles(data.data);
            selectNivel.disabled = false;
        }
    } catch (error) {
        console.error('Error cargando niveles:', error);
    }
}

// Renderizar niveles del colegio
function renderNiveles(niveles) {
    const select = document.getElementById('selectNivel');
    select.innerHTML = '<option value="">Selecciona un nivel...</option>';
    
    niveles.forEach(nivel => {
        const option = document.createElement('option');
        option.value = nivel.id;
        option.textContent = `${nivel.nivel} (${nivel.productos_count} productos)`;
        select.appendChild(option);
    });
}

// Cuando se selecciona un nivel
async function onNivelChange() {
    const listaId = document.getElementById('selectNivel').value;
    
    if (!listaId) {
        document.getElementById('productos-container').style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(`/api/listas/${listaId}`);
        const data = await response.json();
        
        if (data.success) {
            renderProductosLista(data.data);
            document.getElementById('productos-container').style.display = 'block';
        }
    } catch (error) {
        console.error('Error cargando productos de la lista:', error);
    }
}

// Renderizar productos de la lista
function renderProductosLista(lista) {
    document.getElementById('lista-titulo').textContent = `${lista.nombre_colegio} - ${lista.nivel_completo || lista.nivel}`;
    
    const container = document.getElementById('productos-lista');
    
    if (!lista.productos || lista.productos.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No hay productos en esta lista.
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="row">
            ${lista.productos.map(producto => `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <h6 class="card-title">${producto.nombre_producto}</h6>
                            <p class="card-text">
                                <strong>Precio:</strong> $${formatPrice(producto.precio)}<br>
                                <strong>Cantidad en lista:</strong> ${producto.cantidad}
                            </p>
                            <div class="d-flex align-items-center">
                                <label class="me-2">Cantidad para carrito:</label>
                                <div class="input-group" style="width: 120px;">
                                    <button class="btn btn-outline-secondary btn-sm" onclick="cambiarCantidad(${producto.id}, -1)">
                                        <i class="fas fa-minus"></i>
                                    </button>
                                    <input type="number" class="form-control form-control-sm text-center" 
                                           id="cantidad-${producto.id}" value="${producto.cantidad}" min="0" max="10">
                                    <button class="btn btn-outline-secondary btn-sm" onclick="cambiarCantidad(${producto.id}, 1)">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>
                                <button class="btn btn-outline-danger btn-sm ms-2" onclick="eliminarProducto(${producto.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Cambiar cantidad de un producto
function cambiarCantidad(productoId, cambio) {
    const input = document.getElementById(`cantidad-${productoId}`);
    const nuevaCantidad = Math.max(0, Math.min(10, parseInt(input.value) + cambio));
    input.value = nuevaCantidad;
}

// Eliminar producto del carrito (no de la lista)
function eliminarProducto(productoId) {
    const input = document.getElementById(`cantidad-${productoId}`);
    input.value = 0;
}

// Cargar lista seleccionada al carrito
async function cargarListaSeleccionada() {
    const listaId = document.getElementById('selectNivel').value;
    
    if (!listaId) {
        showError('Selecciona una lista primero');
        return;
    }
    
    try {
        // Obtener cantidades modificadas
        const productos = [];
        const inputs = document.querySelectorAll('#productos-lista input[type="number"]');
        
        inputs.forEach(input => {
            const cantidad = parseInt(input.value);
            if (cantidad > 0) {
                const productoId = input.id.replace('cantidad-', '');
                productos.push({
                    producto_shopify_id: productoId,
                    cantidad: cantidad
                });
            }
        });
        
        if (productos.length === 0) {
            showError('No hay productos seleccionados');
            return;
        }
        
        // Crear carrito personalizado
        const response = await fetch(`/api/shopify/carrito/personalizado`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productos })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess(`✅ ${data.data.productos_agregados} productos agregados al carrito!`);
            if (data.data.carrito_url) {
                window.open(data.data.carrito_url, '_blank');
            }
        } else {
            showError('Error cargando al carrito: ' + data.error);
        }
    } catch (error) {
        console.error('Error cargando lista al carrito:', error);
        showError('Error de conexión al cargar al carrito');
    }
}

// ===== GESTIÓN DE LISTAS =====

// Cargar todas las listas (modo Admin)
async function cargarTodasLasListas(page = 1) {
    try {
        console.log('🔄 Cargando todas las listas...');
        
        // Obtener filtros actuales
        const region = document.getElementById('adminFilterRegion').value;
        const comuna = document.getElementById('adminFilterComuna').value;
        const colegio = document.getElementById('adminFilterColegio').value;
        const nivel = document.getElementById('adminFilterNivel').value;
        
        // Construir parámetros de búsqueda
        const params = new URLSearchParams();
        if (region) params.append('region', region);
        if (comuna) params.append('comuna', comuna);
        if (colegio) params.append('colegio', colegio);
        if (nivel) params.append('nivel', nivel);
        params.append('page', page);
        params.append('limit', itemsPerPage);
        
        const url = `/api/listas?${params}`;
        console.log('🌐 URL de búsqueda admin:', url);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            // Actualizar variables de paginación
            currentPage = data.pagination.page;
            totalPages = data.pagination.totalPages;
            totalItems = data.pagination.total;
            
            renderAdminListas(data.data, data.pagination);
        } else {
            console.error('❌ Error cargando listas:', data.error);
            showError('Error cargando listas: ' + data.error);
        }
    } catch (error) {
        console.error('❌ Error cargando listas:', error);
        showError('Error de conexión al cargar listas');
    }
}

// Renderizar listas en vista Admin (agrupadas por colegio)
function renderAdminListas(listas, pagination) {
    const container = document.getElementById('admin-listas-lista');
    
    if (!container) {
        console.error('❌ No se encontró el contenedor de listas admin');
        return;
    }
    
    if (listas.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info text-center">
                <i class="fas fa-info-circle me-2"></i>
                No hay listas escolares creadas. ¡Crea la primera lista!
            </div>
        `;
        return;
    }
    
    // Agrupar listas por colegio
    const colegiosAgrupados = {};
    listas.forEach(lista => {
        const key = `${lista.nombre_colegio}-${lista.region}-${lista.comuna}`;
        if (!colegiosAgrupados[key]) {
            colegiosAgrupados[key] = {
                nombre_colegio: lista.nombre_colegio,
                region: lista.region,
                comuna: lista.comuna,
                niveles: [],
                total_productos: 0,
                total_listas: 0
            };
        }
        
        colegiosAgrupados[key].niveles.push({
            id: lista.id,
            nivel: lista.nivel,
            productos_count: lista.productos_count || 0,
            created_at: lista.created_at
        });
        
        colegiosAgrupados[key].total_productos += lista.productos_count || 0;
        colegiosAgrupados[key].total_listas += 1;
    });
    
    container.innerHTML = `
        <div class="row">
            ${Object.values(colegiosAgrupados).map(colegio => `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card h-100">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h6 class="card-title mb-0">
                                <i class="fas fa-school me-2"></i>${colegio.nombre_colegio}
                            </h6>
                            <span class="badge bg-primary">${colegio.total_listas} niveles</span>
                        </div>
                        <div class="card-body">
                            <p class="card-text">
                                <i class="fas fa-map-marker-alt me-2"></i>
                                <strong>Ubicación:</strong> ${colegio.comuna}, ${colegio.region}
                            </p>
                            <p class="card-text">
                                <i class="fas fa-graduation-cap me-2"></i>
                                <strong>Niveles:</strong> ${colegio.niveles.length} niveles disponibles
                            </p>
                            <p class="card-text">
                                <i class="fas fa-shopping-cart me-2"></i>
                                <strong>Total productos:</strong> ${colegio.total_productos} productos
                            </p>
                            <div class="mt-3">
                                <small class="text-muted">
                                    <strong>Niveles:</strong> ${colegio.niveles.map(n => n.nivel).join(', ')}
                                </small>
                            </div>
                        </div>
                        <div class="card-footer">
                            <div class="btn-group w-100" role="group">
                                <button class="btn btn-outline-primary btn-sm" onclick="verColegioDetalle('${colegio.nombre_colegio}', '${colegio.region}', '${colegio.comuna}')">
                                    <i class="fas fa-eye me-1"></i>Ver Niveles
                                </button>
                                <button class="btn btn-outline-success btn-sm" onclick="agregarNivelAColegio('${colegio.nombre_colegio}', '${colegio.region}', '${colegio.comuna}')">
                                    <i class="fas fa-plus me-1"></i>Agregar Nivel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function loadListas() {
    try {
        console.log('🔄 Cargando listas...');
        const container = document.getElementById('listas-container');
        
        if (!container) {
            console.error('❌ No se encontró el contenedor de listas');
            return;
        }
        
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2">Cargando listas...</p>
            </div>
        `;
        
        const response = await fetch('/api/listas');
        const data = await response.json();
        
        console.log('📊 Datos recibidos:', data);
        
        if (data.success) {
            console.log('✅ Renderizando listas...');
            renderListas(data.data);
        } else {
            console.error('❌ Error en la respuesta:', data.error);
            showError('Error cargando listas: ' + data.error);
        }
    } catch (error) {
        console.error('❌ Error cargando listas:', error);
        showError('Error de conexión al cargar listas');
    }
}



function filterListas() {
    const region = document.getElementById('filterRegion').value;
    const comuna = document.getElementById('filterComuna').value;
    const colegio = document.getElementById('filterColegio').value;
    const nivel = document.getElementById('filterNivel').value;
    
    const params = new URLSearchParams();
    if (region) params.append('region', region);
    if (comuna) params.append('comuna', comuna);
    if (colegio) params.append('colegio', colegio);
    if (nivel) params.append('nivel', nivel);
    
    fetch(`/api/listas?${params}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderListas(data.data);
            }
        })
        .catch(error => {
            console.error('Error filtrando listas:', error);
        });
}

function showCreateListModal() {
    document.getElementById('createListForm').reset();
    
    // Limpiar sugerencias de colegios
    ocultarSugerenciasColegios();
    
    // Restaurar campos a estado editable
    document.getElementById('nombreColegio').readOnly = false;
    document.getElementById('region').readOnly = false;
    document.getElementById('comuna').readOnly = false;
    
    // Remover clases visuales de deshabilitado
    document.getElementById('nombreColegio').classList.remove('bg-light');
    document.getElementById('region').classList.remove('bg-light');
    document.getElementById('comuna').classList.remove('bg-light');
    
    // Restaurar comportamiento original del formulario
    const form = document.getElementById('createListForm');
    form.onsubmit = (e) => {
        e.preventDefault();
        createList();
    };
    
    // Restaurar título del modal
    document.querySelector('#createListModal .modal-title').innerHTML = 
        '<i class="fas fa-plus me-2"></i>Crear Nueva Lista Escolar';
    
    // Restaurar texto del botón
    const submitBtn = document.querySelector('#createListModal .btn-primary');
    submitBtn.innerHTML = '<i class="fas fa-save me-1"></i>Crear Lista';
    submitBtn.disabled = false;
    
    // Restaurar todos los niveles disponibles
    restaurarTodosLosNiveles();
    
    // Ocultar botón de crear nuevo colegio
    document.getElementById('btnCrearNuevoColegio').style.display = 'none';
    
    const modal = new bootstrap.Modal(document.getElementById('createListModal'));
    modal.show();
}

async function createList() {
    const nombreColegio = document.getElementById('nombreColegio').value;
    const region = document.getElementById('region').value;
    const comuna = document.getElementById('comuna').value;
    const nivel = document.getElementById('nivel').value;
    
    if (!nombreColegio || !region || !comuna || !nivel) {
        showError('Por favor completa todos los campos requeridos');
        return;
    }
    
    try {
        const response = await fetch('/api/listas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre_colegio: nombreColegio,
                region: region,
                comuna: comuna,
                nivel: nivel
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Lista creada exitosamente');
            bootstrap.Modal.getInstance(document.getElementById('createListModal')).hide();
            
            // Recargar listas según el modo
            if (isAdminMode) {
                cargarTodasLasListas();
            } else {
                loadListas();
            }
            
            // Recargar regiones para el select
            cargarRegiones();
        } else {
            showError('Error creando lista: ' + data.error);
        }
    } catch (error) {
        console.error('Error creando lista:', error);
        showError('Error de conexión al crear lista');
    }
}

async function viewLista(listaId) {
    try {
        const response = await fetch(`/api/listas/${listaId}`);
        const data = await response.json();
        
        if (data.success) {
            const lista = data.data;
            
            // Llenar información del modal
            document.getElementById('modalColegioNombre').textContent = lista.nombre_colegio;
            document.getElementById('modalColegioRegion').textContent = lista.region;
            document.getElementById('modalColegioComuna').textContent = lista.comuna;
            
            // Renderizar productos de la lista
            renderProductosLista(lista.productos);
            
            // Guardar ID de la lista actual
            currentListaId = listaId;
            
            // Mostrar u ocultar botón "Volver a Niveles del Colegio"
            const btnVolver = document.getElementById('btnVolverNiveles');
            if (currentColegioInfo && isAdminMode) {
                btnVolver.style.display = 'inline-block';
            } else {
                btnVolver.style.display = 'none';
            }
            
            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('viewListModal'));
            modal.show();
            
            // Si venimos de agregar productos, mostrar un mensaje adicional
            if (isAddingProducts) {
                showSuccess('Lista actualizada con los nuevos productos');
            }
        } else {
            showError('Error cargando lista: ' + data.error);
        }
    } catch (error) {
        console.error('Error cargando lista:', error);
        showError('Error de conexión al cargar lista');
    }
}

function renderProductosLista(productos) {
    const container = document.getElementById('modalProductosLista');
    
    if (productos.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No hay productos en esta lista. ¡Agrega algunos!
            </div>
        `;
        return;
    }
    
    let totalGeneral = 0;
    
    let html = `
        <table class="table table-hover">
            <thead class="table-light">
                <tr>
                    <th style="width: 80px;">Imagen</th>
                    <th>Producto</th>
                    <th class="text-center" style="width: 100px;">Cantidad</th>
                    <th class="text-center" style="width: 120px;">Disponibilidad</th>
                    <th class="text-end" style="width: 120px;">Precio Unit.</th>
                    <th class="text-end" style="width: 120px;">Total</th>
                    ${isAdminMode ? '<th class="text-center" style="width: 150px;">Acciones</th>' : ''}
                </tr>
            </thead>
            <tbody>
    `;
    

    
    productos.forEach((producto, index) => {
        const precio = parseFloat(producto.precio) || 0;
        const cantidad = parseInt(producto.cantidad) || 1;
        const total = precio * cantidad;
        totalGeneral += total;
        
        html += `
            <tr>
                <td>
                    <div class="producto-imagen-container">
                        <img src="${producto.imagen || '/images/bichoto-logo.png'}" 
                             class="img-thumbnail producto-imagen-clickeable" 
                             style="width: 60px; height: 60px; object-fit: cover;"
                             alt="${producto.nombre_producto}" 
                             onerror="this.src='/images/bichoto-logo.png'"
                             onclick="abrirVisorImagen('${producto.imagen || '/images/bichoto-logo.png'}', '${producto.nombre_producto.replace(/'/g, "\\'")}', 'ID Shopify: ${producto.producto_shopify_id || 'N/A'}')">
                        <div class="producto-imagen-overlay">
                            <i class="fas fa-search-plus"></i>
                        </div>
                    </div>
                </td>
                <td>
                    <div>
                        <strong>${producto.nombre_producto}</strong>
                        <br>
                        <small class="text-muted">
                            <i class="fas fa-barcode me-1"></i>
                            ID Shopify: ${producto.producto_shopify_id || 'N/A'}
                        </small>
                        <div id="stock-warning-${index}" class="stock-warning" style="display: none;">
                            <small class="text-danger">
                                <i class="fas fa-exclamation-triangle me-1"></i>
                                Producto sin stock no se agregará al carrito
                            </small>
                        </div>
                    </div>
                </td>
                <td class="text-center">
                    ${isAdminMode ? `
                        <div class="input-group input-group-sm" style="width: 120px;">
                            <button class="btn btn-outline-secondary btn-sm" onclick="cambiarCantidadProducto(${producto.id}, -1)">
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" class="form-control form-control-sm text-center" 
                                   id="cantidad-producto-${producto.id}" value="${cantidad}" 
                                   min="1" max="99" onchange="actualizarCantidadProducto(${producto.id})">
                            <button class="btn btn-outline-secondary btn-sm" onclick="cambiarCantidadProducto(${producto.id}, 1)">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    ` : `
                        <span class="badge bg-primary fs-6">${cantidad}</span>
                    `}
                </td>
                <td class="text-center" id="disponibilidad-${index}">
                    <div class="d-flex align-items-center justify-content-center">
                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                            <span class="visually-hidden">Verificando disponibilidad...</span>
                        </div>
                        <small class="ms-2">Verificando...</small>
                    </div>
                </td>
                <td class="text-end">
                    <strong>$${precio.toLocaleString()}</strong>
                </td>
                <td class="text-end">
                    <strong class="text-success">$${total.toLocaleString()}</strong>
                </td>
                ${isAdminMode ? `
                    <td class="text-center">
                        <button class="btn btn-outline-danger btn-sm" onclick="eliminarProductoDeLista(${producto.id})" title="Eliminar producto">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                ` : ''}
            </tr>
        `;
    });
    
    html += `
            </tbody>
            <tfoot class="table-light">
                <tr>
                    <td colspan="${isAdminMode ? '6' : '5'}" class="text-end"><strong>Total General:</strong></td>
                    <td class="text-end">
                        <strong class="text-primary fs-5">$${totalGeneral.toLocaleString()}</strong>
                    </td>
                    ${isAdminMode ? '<td></td>' : ''}
                </tr>
            </tfoot>
        </table>
    `;
    
    container.innerHTML = html;
    
    // Verificar disponibilidad después de renderizar la tabla
    setTimeout(() => {
        verificarDisponibilidadProductos(productos);
    }, 100);
}

// ===== FUNCIONES DE CARRITO =====

// Cargar lista al carrito desde el modal de detalles
async function cargarListaAlCarrito() {
    if (!currentListaId) {
        showError('No hay lista seleccionada');
        return;
    }
    
    try {
        // Mostrar loading
        const btn = document.querySelector('#viewListModal .btn-primary');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Cargando...';
        btn.disabled = true;
        
        // Obtener productos de la lista actual
        const response = await fetch(`/api/listas/${currentListaId}`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Error obteniendo lista');
        }
        
        const lista = data.data;
        const productos = lista.productos || [];
        
        if (productos.length === 0) {
            showError('Esta lista no tiene productos');
            return;
        }
        
        // Preparar productos para el carrito
        const productosCarrito = productos.map(producto => ({
            producto_shopify_id: producto.producto_shopify_id,
            cantidad: producto.cantidad
        }));
        
        // Crear carrito personalizado
        const carritoResponse = await fetch(`/api/shopify/carrito/personalizado`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productos: productosCarrito })
        });
        
        const carritoData = await carritoResponse.json();
        
        if (carritoData.success) {
            const productosAgregados = carritoData.data.productos_agregados;
            const productosSinStock = carritoData.data.productos_sin_stock || [];
            const totalProductos = productos.length;
            
            let mensaje = `✅ ${productosAgregados} de ${totalProductos} productos agregados al carrito!`;
            
            // Si hay productos sin stock, mostrar información adicional
            if (productosSinStock.length > 0) {
                mensaje += `\n\n⚠️ ${productosSinStock.length} productos no se pudieron agregar:`;
                productosSinStock.forEach(producto => {
                    if (producto.title.includes('Producto no existe') || producto.title.includes('no encontrado')) {
                        mensaje += `\n• ID ${producto.id}: ${producto.title}`;
                    } else {
                        mensaje += `\n• ${producto.title}: ${producto.cantidad_solicitada} solicitados, ${producto.stock_disponible} disponibles`;
                    }
                });
            }
            
            // Mostrar mensaje detallado
            if (productosSinStock.length > 0) {
                showWarning(mensaje);
            } else {
                showSuccess(mensaje);
            }
            
            // Cerrar el modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('viewListModal'));
            modal.hide();
            
            // Abrir carrito en nueva pestaña
            if (carritoData.data.carrito_url) {
                window.open(carritoData.data.carrito_url, '_blank');
            } else {
                // Si no hay URL específica, abrir carrito general
                const shopifyUrl = 'https://bichoto.myshopify.com/cart';
                window.open(shopifyUrl, '_blank');
            }
            
        } else {
            showError('Error cargando al carrito: ' + carritoData.error);
        }
        
    } catch (error) {
        console.error('Error cargando lista al carrito:', error);
        showError('Error de conexión al cargar al carrito');
    } finally {
        // Restaurar botón
        const btn = document.querySelector('#viewListModal .btn-primary');
        btn.innerHTML = '<i class="fas fa-cart-plus me-1"></i>Cargar al Carrito';
        btn.disabled = false;
    }
}

// ===== VISOR DE IMÁGENES =====

// Abrir visor de imágenes
function abrirVisorImagen(imagenSrc, nombreProducto, descripcion = '') {
    const modal = new bootstrap.Modal(document.getElementById('imageViewerModal'));
    const img = document.getElementById('imageViewerImg');
    const title = document.getElementById('imageViewerTitle');
    const description = document.getElementById('imageViewerDescription');
    
    // Configurar la imagen
    img.src = imagenSrc;
    img.alt = nombreProducto;
    
    // Configurar título y descripción
    title.textContent = nombreProducto;
    description.textContent = descripcion || 'Imagen del producto';
    
    // Mostrar modal
    modal.show();
}

// Función para hacer las imágenes clickeables
function hacerImagenClickeable(imgElement, nombreProducto, descripcion = '') {
    imgElement.classList.add('producto-imagen-clickeable');
    imgElement.onclick = () => {
        abrirVisorImagen(imgElement.src, nombreProducto, descripcion);
    };
}



// ===== FUNCIONES DE ADMIN =====

// Cargar filtros para Admin
async function cargarFiltrosAdmin() {
    try {
        // Cargar regiones
        const regionesResponse = await fetch('/api/listas/regiones');
        const regionesData = await regionesResponse.json();
        if (regionesData.success) {
            renderAdminRegiones(regionesData.data);
        }
        
        // Cargar niveles
        const nivelesResponse = await fetch('/api/listas/niveles');
        const nivelesData = await nivelesResponse.json();
        if (nivelesData.success) {
            renderAdminNiveles(nivelesData.data);
        }
    } catch (error) {
        console.error('Error cargando filtros admin:', error);
    }
}

// Renderizar regiones en filtro Admin
function renderAdminRegiones(regiones) {
    const select = document.getElementById('adminFilterRegion');
    select.innerHTML = '<option value="">Todas las regiones</option>';
    
    regiones.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        select.appendChild(option);
    });
}

// Renderizar niveles en filtro Admin
function renderAdminNiveles(niveles) {
    const select = document.getElementById('adminFilterNivel');
    select.innerHTML = '<option value="">Todos los niveles</option>';
    
    niveles.forEach(nivel => {
        const option = document.createElement('option');
        option.value = nivel;
        option.textContent = nivel;
        select.appendChild(option);
    });
}

// Cuando se cambia la región en Admin
async function onAdminRegionChange() {
    const region = document.getElementById('adminFilterRegion').value;
    const selectComuna = document.getElementById('adminFilterComuna');
    
    // Resetear comuna
    selectComuna.innerHTML = '<option value="">Todas las comunas</option>';
    selectComuna.disabled = !region;
    
    if (region) {
        try {
            const response = await fetch(`/api/listas/comunas?region=${encodeURIComponent(region)}`);
            const data = await response.json();
            
            if (data.success) {
                data.data.forEach(comuna => {
                    const option = document.createElement('option');
                    option.value = comuna;
                    option.textContent = comuna;
                    selectComuna.appendChild(option);
                });
                selectComuna.disabled = false;
            }
        } catch (error) {
            console.error('Error cargando comunas admin:', error);
        }
    }
    
    // Recargar listas con filtros
    cargarTodasLasListas();
}

// Cuando se cambia la comuna en Admin
async function onAdminComunaChange() {
    cargarTodasLasListas();
}

// Cuando se escribe en el campo colegio en Admin
async function onAdminColegioChange() {
    cargarTodasLasListas();
}

// Cuando se cambia el nivel en Admin
async function onAdminNivelChange() {
    cargarTodasLasListas();
}

// Limpiar filtros de Admin
function limpiarFiltrosAdmin() {
    document.getElementById('adminFilterRegion').value = '';
    document.getElementById('adminFilterComuna').value = '';
    document.getElementById('adminFilterComuna').disabled = true;
    document.getElementById('adminFilterColegio').value = '';
    document.getElementById('adminFilterNivel').value = '';
    
    // Recargar listas sin filtros
    cargarTodasLasListas();
}

// Buscar listas con filtros
async function buscarListas(page = 1) {
    try {
        const region = document.getElementById('selectRegion').value;
        const comuna = document.getElementById('selectComuna').value;
        const nivel = document.getElementById('selectNivel').value;
        const colegio = document.getElementById('inputColegio').value.trim();
        
        // Construir parámetros de búsqueda
        const params = new URLSearchParams();
        if (region) params.append('region', region);
        if (comuna) params.append('comuna', comuna);
        if (nivel) params.append('nivel', nivel);
        if (colegio) params.append('colegio', colegio);
        params.append('page', page);
        params.append('limit', itemsPerPage);
        
        // Mostrar loading
        const btnBuscar = document.getElementById('btnBuscar');
        const originalText = btnBuscar.innerHTML;
        btnBuscar.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Buscando...';
        btnBuscar.disabled = true;
        
        const response = await fetch(`/api/listas/buscar?${params}`);
        const data = await response.json();
        
        if (data.success) {
            if (data.data.length > 0) {
                // Actualizar variables de paginación
                currentPage = data.pagination.page;
                totalPages = data.pagination.totalPages;
                totalItems = data.pagination.total;
                
                renderListasCliente(data.data, data.pagination);
                showSuccess(`Se encontraron ${data.pagination.total} listas escolares`);
            } else {
                document.getElementById('listas-cliente-container').innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        No se encontraron listas con los filtros seleccionados. Intenta con otros criterios de búsqueda.
                    </div>
                `;
                showWarning('No se encontraron listas con los filtros seleccionados');
            }
        } else {
            showError('Error al buscar listas: ' + data.error);
        }
        
    } catch (error) {
        console.error('Error buscando listas:', error);
        showError('Error de conexión al buscar listas');
    } finally {
        // Restaurar botón
        const btnBuscar = document.getElementById('btnBuscar');
        btnBuscar.innerHTML = '<i class="fas fa-search me-1"></i>Buscar Listas';
        btnBuscar.disabled = false;
    }
}

// Renderizar listas para cliente
function renderListasCliente(listas, pagination) {
    const container = document.getElementById('listas-cliente-container');
    
    let html = `
        <div class="row">
            <div class="col-12">
                <h5 class="mb-3">
                    <i class="fas fa-list me-2"></i>
                    Listas Encontradas (${pagination.total})
                </h5>
            </div>
        </div>
        <div class="row">
    `;
    
    listas.forEach(lista => {
        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100">
                    <div class="card-body">
                        <h6 class="card-title">${lista.nombre_colegio}</h6>
                        <p class="card-text">
                            <small class="text-muted">
                                <i class="fas fa-map-marker-alt me-1"></i>
                                ${lista.comuna}, ${lista.region}
                            </small>
                        </p>
                        <p class="card-text">
                            <strong>Nivel:</strong> ${lista.nivel_completo || lista.nivel}<br>
                            <strong>Productos:</strong> ${lista.total_productos || 0}
                        </p>
                        <button class="btn btn-primary btn-sm w-100" onclick="verListaCliente(${lista.id})">
                            <i class="fas fa-eye me-1"></i>Ver Lista
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
        </div>
    `;
    
    // Agregar paginación si hay más de una página
    if (pagination.totalPages > 1) {
        html += renderPagination(pagination, 'buscarListas');
    }
    
    container.innerHTML = html;
}

// Función puente para verListaCliente (llama a la función en cliente.js)
async function verListaCliente(listaId) {
    console.log('🌉 FUNCIÓN PUENTE verListaCliente llamada con ID:', listaId);
    
    // Verificar si la función existe en cliente.js
    if (typeof window.verListaClienteCliente === 'function') {
        console.log('✅ Función encontrada, llamando a cliente.js');
        return await window.verListaClienteCliente(listaId);
    } else {
        console.error('❌ Función verListaCliente no encontrada en cliente.js');
        console.log('🔍 Funciones disponibles en window:', Object.keys(window).filter(k => k.includes('verLista')));
        showError('Error: Función de visualización no disponible');
    }
}

// Renderizar productos de lista en formato de tabla (vista cliente)
function renderProductosListaCliente(productos) {
    const container = document.getElementById('productos-lista');
    
    if (!productos || productos.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No hay productos en esta lista.
            </div>
        `;
        return;
    }
    
    let totalGeneral = 0;
    
    let html = `
        <table class="table table-hover">
            <thead class="table-light">
                <tr>
                    <th style="width: 80px;">Imagen</th>
                    <th>Producto</th>
                    <th class="text-center" style="width: 100px;">Cantidad</th>
                    <th class="text-center" style="width: 120px;">Disponibilidad</th>
                    <th class="text-end" style="width: 120px;">Precio Unit.</th>
                    <th class="text-end" style="width: 120px;">Total</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    productos.forEach((producto, index) => {
        const precio = parseFloat(producto.precio) || 0;
        const cantidad = parseInt(producto.cantidad) || 1;
        const total = precio * cantidad;
        totalGeneral += total;
        
        html += `
            <tr>
                <td>
                    <div class="producto-imagen-container">
                        <img src="${producto.imagen || '/images/bichoto-logo.png'}" 
                             class="img-thumbnail producto-imagen-clickeable" 
                             style="width: 60px; height: 60px; object-fit: cover;"
                             alt="${producto.nombre_producto}" 
                             onerror="this.src='/images/bichoto-logo.png'"
                             onclick="abrirVisorImagen('${producto.imagen || '/images/bichoto-logo.png'}', '${producto.nombre_producto.replace(/'/g, "\\'")}', 'ID Shopify: ${producto.producto_shopify_id || 'N/A'}')">
                        <div class="producto-imagen-overlay">
                            <i class="fas fa-search-plus"></i>
                        </div>
                    </div>
                </td>
                <td>
                    <div>
                        <strong>${producto.nombre_producto}</strong>
                        <br>
                        <small class="text-muted">
                            <i class="fas fa-barcode me-1"></i>
                            ID Shopify: ${producto.producto_shopify_id || 'N/A'}
                        </small>
                        <div id="stock-warning-${index}" class="stock-warning" style="display: none;">
                            <small class="text-danger">
                                <i class="fas fa-exclamation-triangle me-1"></i>
                                Producto sin stock no se agregará al carrito
                            </small>
                        </div>
                    </div>
                </td>
                <td class="text-center">
                    <span class="badge bg-primary fs-6">${cantidad}</span>
                </td>
                <td class="text-center" id="disponibilidad-${index}">
                    <div class="d-flex align-items-center justify-content-center">
                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                            <span class="visually-hidden">Verificando disponibilidad...</span>
                        </div>
                        <small class="ms-2">Verificando...</small>
                    </div>
                </td>
                <td class="text-end">
                    <strong>$${precio.toLocaleString()}</strong>
                </td>
                <td class="text-end">
                    <strong class="text-success">$${total.toLocaleString()}</strong>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
            <tfoot class="table-light">
                <tr>
                    <td colspan="5" class="text-end"><strong>Total General:</strong></td>
                    <td class="text-end">
                        <strong class="text-primary fs-5">$${totalGeneral.toLocaleString()}</strong>
                    </td>
                </tr>
                <tr>
                    <td colspan="6" class="text-end">
                        <small class="text-muted">
                            <em>* Valor no incluye gastos de envío e impuestos.</em>
                        </small>
                    </td>
                </tr>
            </tfoot>
        </table>
    `;
    
    container.innerHTML = html;
    
    // Verificar disponibilidad de productos
    verificarDisponibilidadProductosCliente(productos);
}

// Verificar disponibilidad de productos (función global para admin)
async function verificarDisponibilidadProductos(productos) {
    const stockPromises = productos.map(async (producto, index) => {
        try {
            // Limpiar ID del producto
            let productId = producto.producto_shopify_id;
            if (typeof productId === 'string' && productId.includes('.')) {
                productId = productId.split('.')[0];
            }
            if (typeof productId === 'string') {
                productId = parseInt(productId, 10);
            }
            
            const response = await fetch(`/api/shopify/productos/${productId}`);
            const data = await response.json();
            
            if (data.success && data.data.variants && data.data.variants.length > 0) {
                const stock = data.data.variants[0].inventory_quantity || 0;
                const cantidad = parseInt(producto.cantidad) || 1;
                const disponible = stock >= cantidad;
                
                // Actualizar la celda de disponibilidad en la tabla
                const disponibilidadCell = document.getElementById(`disponibilidad-${index}`);
                if (disponibilidadCell) {
                    if (isAdminMode) {
                        // Para admin: mostrar cantidad exacta
                        if (disponible) {
                            disponibilidadCell.innerHTML = `<span class="badge bg-success">Stock: ${stock}</span>`;
                        } else {
                            disponibilidadCell.innerHTML = `<span class="badge bg-danger">Stock: ${stock}</span>`;
                        }
                    } else {
                        // Para cliente: mostrar solo disponible/no disponible
                        if (disponible) {
                            disponibilidadCell.innerHTML = `<span class="badge bg-success">Disponible</span>`;
                        } else {
                            disponibilidadCell.innerHTML = `<span class="badge bg-danger">No Disponible</span>`;
                        }
                    }
                }
                
                // Mostrar/ocultar advertencia de stock
                const stockWarning = document.getElementById(`stock-warning-${index}`);
                if (stockWarning) {
                    if (!disponible) {
                        stockWarning.style.display = 'block';
                    } else {
                        stockWarning.style.display = 'none';
                    }
                }
                
                return { index, disponible };
            } else {
                const disponibilidadCell = document.getElementById(`disponibilidad-${index}`);
                if (disponibilidadCell) {
                    disponibilidadCell.innerHTML = `<span class="badge bg-warning">Sin Info</span>`;
                }
                return { index, disponible: false };
            }
        } catch (error) {
            console.error(`Error verificando disponibilidad para producto ${producto.producto_shopify_id}:`, error);
            const disponibilidadCell = document.getElementById(`disponibilidad-${index}`);
            if (disponibilidadCell) {
                disponibilidadCell.innerHTML = `<span class="badge bg-secondary">Error</span>`;
            }
            return { index, disponible: false };
        }
    });
    
    await Promise.all(stockPromises);
}

// Verificar disponibilidad de productos en vista cliente
async function verificarDisponibilidadProductosCliente(productos) {
    const stockPromises = productos.map(async (producto, index) => {
        try {
            // Limpiar ID del producto
            let productId = producto.producto_shopify_id;
            if (typeof productId === 'string' && productId.includes('.')) {
                productId = productId.split('.')[0];
            }
            if (typeof productId === 'string') {
                productId = parseInt(productId, 10);
            }
            
            const response = await fetch(`/api/shopify/productos/${productId}`);
            const data = await response.json();
            
            if (data.success && data.data.variants && data.data.variants.length > 0) {
                const stock = data.data.variants[0].inventory_quantity || 0;
                const cantidad = parseInt(producto.cantidad) || 1;
                const disponible = stock >= cantidad;
                
                // Actualizar la celda de disponibilidad en la tabla
                const disponibilidadCell = document.getElementById(`disponibilidad-${index}`);
                if (disponibilidadCell) {
                    // Para cliente: mostrar solo disponible/no disponible
                    if (disponible) {
                        disponibilidadCell.innerHTML = `<span class="badge bg-success">Disponible</span>`;
                    } else {
                        disponibilidadCell.innerHTML = `<span class="badge bg-danger">No Disponible</span>`;
                    }
                }
                
                // Mostrar/ocultar advertencia de stock
                const stockWarning = document.getElementById(`stock-warning-${index}`);
                if (stockWarning) {
                    if (!disponible) {
                        stockWarning.style.display = 'block';
                    } else {
                        stockWarning.style.display = 'none';
                    }
                }
                
                return { index, disponible };
            } else {
                const disponibilidadCell = document.getElementById(`disponibilidad-${index}`);
                if (disponibilidadCell) {
                    disponibilidadCell.innerHTML = `<span class="badge bg-warning">Sin Info</span>`;
                }
                return { index, disponible: false };
            }
        } catch (error) {
            console.error(`Error verificando disponibilidad para producto ${producto.producto_shopify_id}:`, error);
            const disponibilidadCell = document.getElementById(`disponibilidad-${index}`);
            if (disponibilidadCell) {
                disponibilidadCell.innerHTML = `<span class="badge bg-secondary">Error</span>`;
            }
            return { index, disponible: false };
        }
    });
    
    await Promise.all(stockPromises);
}



// Renderizar paginación
function renderPagination(pagination, callbackFunction) {
    const { page, totalPages, hasNext, hasPrev } = pagination;
    
    let html = `
        <div class="row mt-4">
            <div class="col-12">
                <nav aria-label="Navegación de páginas">
                    <ul class="pagination justify-content-center">
    `;
    
    // Botón Anterior
    if (hasPrev) {
        html += `
            <li class="page-item">
                <button class="page-link" onclick="${callbackFunction}(${page - 1})">
                    <i class="fas fa-chevron-left"></i> Anterior
                </button>
            </li>
        `;
    } else {
        html += `
            <li class="page-item disabled">
                <span class="page-link">
                    <i class="fas fa-chevron-left"></i> Anterior
                </span>
            </li>
        `;
    }
    
    // Números de página
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    
    if (startPage > 1) {
        html += `
            <li class="page-item">
                <button class="page-link" onclick="${callbackFunction}(1)">1</button>
            </li>
        `;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === page) {
            html += `
                <li class="page-item active">
                    <span class="page-link">${i}</span>
                </li>
            `;
        } else {
            html += `
                <li class="page-item">
                    <button class="page-link" onclick="${callbackFunction}(${i})">${i}</button>
                </li>
            `;
        }
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        html += `
            <li class="page-item">
                <button class="page-link" onclick="${callbackFunction}(${totalPages})">${totalPages}</button>
            </li>
        `;
    }
    
    // Botón Siguiente
    if (hasNext) {
        html += `
            <li class="page-item">
                <button class="page-link" onclick="${callbackFunction}(${page + 1})">
                    Siguiente <i class="fas fa-chevron-right"></i>
                </button>
            </li>
        `;
    } else {
        html += `
            <li class="page-item disabled">
                <span class="page-link">
                    Siguiente <i class="fas fa-chevron-right"></i>
                </span>
            </li>
        `;
    }
    
    html += `
                    </ul>
                </nav>
                <div class="text-center mt-2">
                    <small class="text-muted">
                        Página ${page} de ${totalPages} (${pagination.total} resultados totales)
                    </small>
                </div>
            </div>
        </div>
    `;
    
    return html;
}

// Limpiar filtros de Cliente
function limpiarFiltrosCliente() {
    document.getElementById('selectClienteRegion').value = '';
    document.getElementById('selectClienteComuna').value = '';
    document.getElementById('searchClienteColegio').value = '';
    
    // Recargar todas las listas
    aplicarFiltrosCliente();
}

// Ver detalle de un colegio (todos sus niveles)
async function verColegioDetalle(nombreColegio, region, comuna) {
    try {
        const response = await fetch(`/api/listas/colegio/${encodeURIComponent(nombreColegio)}/niveles?region=${encodeURIComponent(region)}&comuna=${encodeURIComponent(comuna)}`);
        const data = await response.json();
        
        if (data.success) {
            mostrarModalColegioDetalle(nombreColegio, region, comuna, data.data);
        } else {
            showError('Error cargando niveles del colegio: ' + data.error);
        }
    } catch (error) {
        console.error('Error cargando niveles del colegio:', error);
        showError('Error de conexión al cargar niveles del colegio');
    }
}

// Mostrar modal con detalle del colegio
function mostrarModalColegioDetalle(nombreColegio, region, comuna, niveles) {
    // Crear modal dinámicamente si no existe
    let modal = document.getElementById('colegioDetalleModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'colegioDetalleModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-school me-2"></i>Detalle del Colegio
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div id="colegioDetalleContent">
                            <!-- Contenido dinámico -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Llenar contenido del modal
    const content = document.getElementById('colegioDetalleContent');
    content.innerHTML = `
        <div class="mb-3">
            <h6><i class="fas fa-school me-2"></i>${nombreColegio}</h6>
            <p class="text-muted">
                <i class="fas fa-map-marker-alt me-2"></i>${comuna}, ${region}
            </p>
        </div>
        
        <div class="row">
            ${niveles.map(nivel => `
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title">
                                <i class="fas fa-graduation-cap me-2"></i>${nivel.nivel}
                            </h6>
                            <p class="card-text">
                                <small class="text-muted">
                                    <i class="fas fa-shopping-cart me-1"></i>${nivel.productos_count} productos
                                </small>
                            </p>
                            <div class="btn-group w-100" role="group">
                                <button class="btn btn-outline-primary btn-sm" onclick="viewListaDesdeModal(${nivel.id})">
                                    <i class="fas fa-eye me-1"></i>Ver
                                </button>
                                <button class="btn btn-outline-warning btn-sm" onclick="editarListaDesdeModal(${nivel.id})">
                                    <i class="fas fa-edit me-1"></i>Editar
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="eliminarListaDesdeModal(${nivel.id})">
                                    <i class="fas fa-trash me-1"></i>Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Mostrar modal
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

// Agregar nuevo nivel a un colegio existente
function agregarNivelAColegio(nombreColegio, region, comuna) {
    // Llenar el formulario con los datos del colegio
    document.getElementById('nombreColegio').value = nombreColegio;
    document.getElementById('region').value = region;
    document.getElementById('comuna').value = comuna;
    document.getElementById('nivel').value = '';
    
    // Ocultar sugerencias ya que estamos usando un colegio existente
    ocultarSugerenciasColegios();
    
    // Cambiar al modo de agregar nivel
    cambiarAModoAgregarNivel(nombreColegio, region, comuna);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('createListModal'));
    modal.show();
}

// Funciones para manejar acciones desde el modal del colegio
async function viewListaDesdeModal(listaId) {
    // Obtener información del colegio desde el modal actual
    const colegioModal = document.getElementById('colegioDetalleModal');
    const colegioNombre = colegioModal.querySelector('h6').textContent.replace('🏫', '').trim();
    const ubicacionElement = colegioModal.querySelector('.text-muted');
    const ubicacion = ubicacionElement ? ubicacionElement.textContent.trim() : '';
    
    // Extraer región y comuna de la ubicación
    const ubicacionParts = ubicacion.split(', ');
    const comuna = ubicacionParts[0] || '';
    const region = ubicacionParts[1] || '';
    
    // Almacenar información del colegio para el botón volver
    currentColegioInfo = {
        nombre: colegioNombre,
        region: region,
        comuna: comuna
    };
    
    // Cerrar modal del colegio
    const modalInstance = bootstrap.Modal.getInstance(colegioModal);
    if (modalInstance) {
        modalInstance.hide();
    }
    
    // Esperar un momento para que se cierre el modal
    setTimeout(() => {
        viewLista(listaId);
    }, 300);
}

async function editarListaDesdeModal(listaId) {
    // Cerrar modal del colegio
    const colegioModal = bootstrap.Modal.getInstance(document.getElementById('colegioDetalleModal'));
    if (colegioModal) {
        colegioModal.hide();
    }
    
    // Esperar un momento para que se cierre el modal
    setTimeout(() => {
        editarLista(listaId);
    }, 300);
}

async function eliminarListaDesdeModal(listaId) {
    // Cerrar modal del colegio
    const colegioModal = bootstrap.Modal.getInstance(document.getElementById('colegioDetalleModal'));
    if (colegioModal) {
        colegioModal.hide();
    }
    
    // Esperar un momento para que se cierre el modal
    setTimeout(() => {
        eliminarLista(listaId);
    }, 300);
}

// Volver a ver los niveles del colegio desde el modal de lista
async function volverANivelesColegio() {
    if (!currentColegioInfo) {
        showError('No hay información del colegio disponible');
        return;
    }
    
    // Cerrar modal de lista actual
    const listaModal = bootstrap.Modal.getInstance(document.getElementById('viewListModal'));
    if (listaModal) {
        listaModal.hide();
    }
    
    // Esperar un momento para que se cierre el modal
    setTimeout(() => {
        // Volver a abrir el modal del colegio con sus niveles
        verColegioDetalle(currentColegioInfo.nombre, currentColegioInfo.region, currentColegioInfo.comuna);
    }, 300);
}

// Editar lista
async function editarLista(listaId) {
    try {
        const response = await fetch(`/api/listas/${listaId}`);
        const data = await response.json();
        
        if (data.success) {
            const lista = data.data;
            
            // Llenar el formulario con los datos actuales
            document.getElementById('nombreColegio').value = lista.nombre_colegio;
            document.getElementById('region').value = lista.region;
            document.getElementById('comuna').value = lista.comuna;
            document.getElementById('nivel').value = lista.nivel;
            
            // Cambiar el comportamiento del formulario para actualizar
            const form = document.getElementById('createListForm');
            form.onsubmit = (e) => {
                e.preventDefault();
                actualizarLista(listaId);
            };
            
            // Cambiar el título del modal
            document.querySelector('#createListModal .modal-title').innerHTML = 
                '<i class="fas fa-edit me-2"></i>Editar Lista Escolar';
            
            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('createListModal'));
            modal.show();
        } else {
            showError('Error cargando lista: ' + data.error);
        }
    } catch (error) {
        console.error('Error cargando lista:', error);
        showError('Error de conexión al cargar lista');
    }
}

// Actualizar lista
async function actualizarLista(listaId) {
    const nombreColegio = document.getElementById('nombreColegio').value;
    const region = document.getElementById('region').value;
    const comuna = document.getElementById('comuna').value;
    const nivel = document.getElementById('nivel').value;
    
    if (!nombreColegio || !region || !comuna || !nivel) {
        showError('Por favor completa todos los campos requeridos');
        return;
    }
    
    try {
        const response = await fetch(`/api/listas/${listaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre_colegio: nombreColegio,
                region: region,
                comuna: comuna,
                nivel: nivel
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Lista actualizada exitosamente');
            bootstrap.Modal.getInstance(document.getElementById('createListModal')).hide();
            
            // Restaurar comportamiento original del formulario
            const form = document.getElementById('createListForm');
            form.onsubmit = (e) => {
                e.preventDefault();
                createList();
            };
            
            // Restaurar título del modal
            document.querySelector('#createListModal .modal-title').innerHTML = 
                '<i class="fas fa-plus me-2"></i>Crear Nueva Lista Escolar';
            
            // Recargar listas según el modo
            if (isAdminMode) {
                cargarTodasLasListas();
            } else {
                loadListas();
            }
            
            // Recargar regiones para el select
            cargarRegiones();
        } else {
            showError('Error actualizando lista: ' + data.error);
        }
    } catch (error) {
        console.error('Error actualizando lista:', error);
        showError('Error de conexión al actualizar lista');
    }
}

// Eliminar lista
async function eliminarLista(listaId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta lista? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/listas/${listaId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Lista eliminada exitosamente');
            
            // Recargar listas según el modo
            if (isAdminMode) {
                cargarTodasLasListas();
            } else {
                loadListas();
            }
            
            // Recargar regiones para el select
            cargarRegiones();
        } else {
            showError('Error eliminando lista: ' + data.error);
        }
    } catch (error) {
        console.error('Error eliminando lista:', error);
        showError('Error de conexión al eliminar lista');
    }
}

// ===== AGREGAR PRODUCTOS A LISTA =====
function agregarProductosALista(listaId = null) {
    currentListaId = listaId || currentListaId;
    
    if (!currentListaId) {
        showError('No hay lista seleccionada');
        return;
    }
    
    // Marcar que estamos agregando productos
    isAddingProducts = true;
    
    // Cerrar modal de vista de lista si está abierto
    const viewModal = bootstrap.Modal.getInstance(document.getElementById('viewListModal'));
    if (viewModal) viewModal.hide();
    
    // Mostrar modal sin cargar productos automáticamente
    const modal = new bootstrap.Modal(document.getElementById('addProductsModal'));
    modal.show();
    
    // Limpiar container y mostrar mensaje de búsqueda
    const container = document.getElementById('productosModalContainer');
    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <i class="fas fa-search fa-3x text-muted mb-3"></i>
            <h5 class="text-muted">Busca productos por código o nombre</h5>
            <p class="text-muted">Utiliza el campo de búsqueda de arriba para encontrar productos de tu tienda Shopify</p>
        </div>
    `;
    
    // Enfocar el campo de búsqueda
    setTimeout(() => {
        document.getElementById('searchProductosModal').focus();
    }, 500);
}

async function loadProductosForModal() {
    try {
        const response = await fetch('/api/shopify/productos');
        const data = await response.json();
        
        if (data.success) {
            renderProductosModal(data.data);
        }
    } catch (error) {
        console.error('Error cargando productos para modal:', error);
    }
}

function renderProductosModal(productos) {
    const container = document.getElementById('productosModalContainer');
    
    container.innerHTML = productos.map(producto => `
        <div class="col-md-6 col-lg-4 mb-3">
            <div class="producto-card ${productosSeleccionados.has(producto.id) ? 'producto-seleccionado' : ''}" 
                 onclick="toggleProductoSeleccionado(${producto.id})">
                <div class="producto-imagen-container">
                    <img src="/images/bichoto-logo.png" 
                         alt="${producto.title}" 
                         class="producto-imagen producto-imagen-clickeable"
                         data-src="${producto.image || ''}"
                         loading="lazy"
                         onload="handleImageLoad(this)"
                         onerror="handleImageError(this)"
                         onclick="event.stopPropagation(); abrirVisorImagen('${producto.image || '/images/bichoto-logo.png'}', '${producto.title.replace(/'/g, "\\'")}', '${(producto.sku || 'ID: ' + producto.id).replace(/'/g, "\\'")}')">
                    <div class="producto-imagen-overlay">
                        <i class="fas fa-search-plus"></i>
                    </div>
                </div>
                <div class="producto-codigo">
                    <small class="text-muted">
                        <i class="fas fa-barcode me-1"></i>
                        ${producto.sku || 'ID: ' + producto.id}
                    </small>
                </div>
                <div class="producto-titulo">${producto.title}</div>
                <div class="producto-precio">$${formatPrice(producto.price)}</div>
                <div class="producto-stock">
                    <i class="fas fa-boxes me-1"></i>
                    Stock: ${producto.variants[0]?.inventory_quantity || 0}
                </div>
                <div class="mt-2">
                    <input type="number" 
                           class="form-control form-control-sm" 
                           placeholder="Cantidad" 
                           min="1" 
                           value="1"
                           id="cantidad-${producto.id}"
                           onclick="event.stopPropagation()">
                </div>
            </div>
        </div>
    `).join('');
    
    // Cargar imágenes de forma lazy después de renderizar
    setTimeout(() => {
        loadImagesLazy();
    }, 100);
}

function toggleProductoSeleccionado(productoId) {
    const card = event.currentTarget;
    
    if (productosSeleccionados.has(productoId)) {
        productosSeleccionados.delete(productoId);
        card.classList.remove('producto-seleccionado');
    } else {
        productosSeleccionados.add(productoId);
        card.classList.add('producto-seleccionado');
    }
}

async function guardarProductosSeleccionados() {
    if (productosSeleccionados.size === 0) {
        showError('Selecciona al menos un producto');
        return;
    }
    
    const productosData = Array.from(productosSeleccionados).map(productoId => {
        const cantidad = document.getElementById(`cantidad-${productoId}`).value || 1;
        const producto = allProductos.find(p => p.id == productoId);
        return {
            producto_shopify_id: productoId,
            nombre_producto: producto ? producto.title : 'Producto',
            precio: producto ? producto.price : 0,
            imagen: producto ? producto.image : null,
            codigo_producto: producto ? (producto.sku || producto.id.toString()) : null,
            cantidad: parseInt(cantidad)
        };
    });
    
    try {
        const response = await fetch(`/api/listas/${currentListaId}/productos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productos: productosData })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Productos agregados exitosamente');
            productosSeleccionados.clear();
            bootstrap.Modal.getInstance(document.getElementById('addProductsModal')).hide();
            
            // Resetear la bandera de agregar productos
            isAddingProducts = false;
            
            // Mantener el contexto actual
            if (isAdminMode) {
                // En modo Admin, recargar todas las listas para mostrar los cambios
                cargarTodasLasListas();
                
                // Si estábamos agregando productos, volver a abrir la lista específica
                setTimeout(() => {
                    viewLista(currentListaId);
                }, 100);
            } else {
                // En modo Cliente, recargar la lista actual
                setTimeout(() => {
                    viewLista(currentListaId);
                }, 100);
            }
        } else {
            showError('Error agregando productos: ' + data.error);
        }
    } catch (error) {
        console.error('Error agregando productos:', error);
        showError('Error de conexión al agregar productos');
    }
}



// ===== UTILIDADES =====
function formatPrice(price) {
    return parseInt(price).toLocaleString('es-CL');
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-CL');
}

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('loading');
        element.disabled = true;
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('loading');
        element.disabled = false;
    }
}

function showSuccess(message) {
    showAlert(message, 'success');
}

function showError(message) {
    showAlert(message, 'danger');
}

function showWarning(message) {
    showAlert(message, 'warning');
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Función para buscar productos en el modal
async function searchProductosModal() {
    const searchTerm = document.getElementById('searchProductosModal').value.trim();
    const container = document.getElementById('productosModalContainer');
    
    // Si no hay término de búsqueda, mostrar mensaje
    if (!searchTerm || searchTerm.length < 2) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">Busca productos por código o nombre</h5>
                <p class="text-muted">Escribe al menos 2 caracteres para buscar productos</p>
            </div>
        `;
        return;
    }
    
    // Mostrar indicador de carga
    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Buscando...</span>
            </div>
            <p class="mt-2">Buscando productos...</p>
        </div>
    `;
    
    try {
        // Buscar productos en Shopify por término
        const response = await fetch(`/api/shopify/productos/buscar?q=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();
        
        if (data.success) {
            if (data.data.length === 0) {
                container.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">No se encontraron productos</h5>
                        <p class="text-muted">No hay productos que coincidan con "${searchTerm}"</p>
                        <p class="text-muted"><small>Intenta buscar por código de producto o nombre</small></p>
                    </div>
                `;
            } else {
                // Guardar productos encontrados en allProductos para poder acceder a ellos después
                allProductos = data.data;
                renderProductosModal(data.data);
            }
        } else {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                    <h5 class="text-warning">Error de búsqueda</h5>
                    <p class="text-muted">Error: ${data.error}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error buscando productos:', error);
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <h5 class="text-danger">Error de conexión</h5>
                <p class="text-muted">No se pudo conectar con la tienda Shopify</p>
            </div>
        `;
    }
}

// Variables para búsqueda de productos
let searchTimeout = null;

// Variables para búsqueda de colegios
let colegioSearchTimeout = null;

// Función de debounce para búsqueda
function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchProductosModal();
    }, 500); // Buscar después de 500ms de inactividad
}

// Manejo de tecla Enter en búsqueda
function handleSearchKeypress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        clearTimeout(searchTimeout);
        searchProductosModal();
    }
}

// ===== BÚSQUEDA DE COLEGIOS EXISTENTES =====

// Buscar colegios existentes mientras se escribe
function buscarColegiosExistentes() {
    clearTimeout(colegioSearchTimeout);
    colegioSearchTimeout = setTimeout(() => {
        const searchTerm = document.getElementById('nombreColegio').value.trim();
        
        if (searchTerm.length < 2) {
            ocultarSugerenciasColegios();
            return;
        }
        
        fetchColegiosExistentes(searchTerm);
    }, 300);
}

// Obtener colegios existentes del servidor
async function fetchColegiosExistentes(searchTerm) {
    try {
        const response = await fetch(`/api/listas/colegios/buscar?q=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();
        
        if (data.success) {
            mostrarSugerenciasColegios(data.data);
        }
    } catch (error) {
        console.error('Error buscando colegios existentes:', error);
    }
}

// Mostrar sugerencias de colegios
function mostrarSugerenciasColegios(colegios) {
    const container = document.getElementById('colegios-sugerencias');
    const lista = document.getElementById('colegios-lista');
    
    if (colegios.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    lista.innerHTML = colegios.map(colegio => `
        <div class="colegio-sugerencia p-2 border rounded mb-1" 
             onclick="seleccionarColegioExistente('${colegio.nombre_colegio}', '${colegio.region}', '${colegio.comuna}')"
             style="cursor: pointer; background-color: #f8f9fa; transition: background-color 0.2s;">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${colegio.nombre_colegio}</strong>
                    <br>
                    <small class="text-muted">${colegio.comuna}, ${colegio.region}</small>
                </div>
                <div>
                    <span class="badge bg-secondary">${colegio.total_listas} listas</span>
                </div>
            </div>
        </div>
    `).join('');
    
    container.style.display = 'block';
}

// Ocultar sugerencias de colegios
function ocultarSugerenciasColegios() {
    const container = document.getElementById('colegios-sugerencias');
    container.style.display = 'none';
}

// Seleccionar un colegio existente
function seleccionarColegioExistente(nombre, region, comuna) {
    document.getElementById('nombreColegio').value = nombre;
    document.getElementById('region').value = region;
    document.getElementById('comuna').value = comuna;
    
    ocultarSugerenciasColegios();
    
    // Cambiar el comportamiento del modal para agregar nivel a colegio existente
    cambiarAModoAgregarNivel(nombre, region, comuna);
    
    showSuccess(`Datos del colegio "${nombre}" cargados. Ahora puedes agregar un nuevo nivel educativo.`);
}

// Cambiar el modal al modo de agregar nivel a colegio existente
function cambiarAModoAgregarNivel(nombre, region, comuna) {
    // Cambiar el título del modal
    document.querySelector('#createListModal .modal-title').innerHTML = 
        '<i class="fas fa-plus me-2"></i>Agregar Nivel a ' + nombre;
    
    // Deshabilitar campos de colegio (solo lectura)
    document.getElementById('nombreColegio').readOnly = true;
    document.getElementById('region').readOnly = true;
    document.getElementById('comuna').readOnly = true;
    
    // Agregar clases visuales para indicar que están deshabilitados
    document.getElementById('nombreColegio').classList.add('bg-light');
    document.getElementById('region').classList.add('bg-light');
    document.getElementById('comuna').classList.add('bg-light');
    
    // Limpiar el campo de nivel
    document.getElementById('nivel').value = '';
    
    // Filtrar niveles disponibles para este colegio
    filtrarNivelesDisponibles(nombre, region, comuna);
    
    // Cambiar el comportamiento del formulario
    const form = document.getElementById('createListForm');
    form.onsubmit = (e) => {
        e.preventDefault();
        createList(); // Esta función ya maneja ambos casos
    };
    
    // Cambiar el texto del botón
    const submitBtn = document.querySelector('#createListModal .btn-primary');
    submitBtn.innerHTML = '<i class="fas fa-plus me-1"></i>Agregar Nivel';
    
    // Mostrar botón para crear nuevo colegio
    document.getElementById('btnCrearNuevoColegio').style.display = 'inline-block';
}

// Volver al modo de crear nuevo colegio
function volverAModoCrearColegio() {
    // Limpiar formulario
    document.getElementById('createListForm').reset();
    
    // Restaurar campos a estado editable
    document.getElementById('nombreColegio').readOnly = false;
    document.getElementById('region').readOnly = false;
    document.getElementById('comuna').readOnly = false;
    
    // Remover clases visuales de deshabilitado
    document.getElementById('nombreColegio').classList.remove('bg-light');
    document.getElementById('region').classList.remove('bg-light');
    document.getElementById('comuna').classList.remove('bg-light');
    
    // Restaurar título del modal
    document.querySelector('#createListModal .modal-title').innerHTML = 
        '<i class="fas fa-plus me-2"></i>Crear Nueva Lista Escolar';
    
    // Restaurar texto del botón
    const submitBtn = document.querySelector('#createListModal .btn-primary');
    submitBtn.innerHTML = '<i class="fas fa-save me-1"></i>Crear Lista';
    submitBtn.disabled = false;
    
    // Restaurar todos los niveles disponibles
    restaurarTodosLosNiveles();
    
    // Ocultar botón de crear nuevo colegio
    document.getElementById('btnCrearNuevoColegio').style.display = 'none';
    
    // Enfocar el campo de nombre del colegio
    document.getElementById('nombreColegio').focus();
    
    showInfo('Modo: Crear nuevo colegio. Escribe el nombre para buscar colegios existentes.');
}

// ===== FILTRADO DE NIVELES DISPONIBLES =====

// Filtrar niveles disponibles para un colegio específico
async function filtrarNivelesDisponibles(nombre, region, comuna) {
    try {
        // Mostrar loading en el select
        const selectNivel = document.getElementById('nivel');
        selectNivel.innerHTML = '<option value="">Cargando niveles disponibles...</option>';
        selectNivel.disabled = true;
        
        // Obtener niveles ya existentes para este colegio
        const response = await fetch(`/api/listas/colegio/niveles-existentes?nombre=${encodeURIComponent(nombre)}&region=${encodeURIComponent(region)}&comuna=${encodeURIComponent(comuna)}`);
        const data = await response.json();
        
        if (data.success) {
            const nivelesExistentes = data.data;
            actualizarOpcionesNivel(nivelesExistentes);
        } else {
            console.error('Error obteniendo niveles existentes:', data.error);
            restaurarTodosLosNiveles();
        }
        
    } catch (error) {
        console.error('Error filtrando niveles:', error);
        restaurarTodosLosNiveles();
    }
}

// Actualizar las opciones del select de nivel
function actualizarOpcionesNivel(nivelesExistentes) {
    const selectNivel = document.getElementById('nivel');
    
    // Todos los niveles disponibles
    const todosLosNiveles = [
        'Pre-Kinder', 'Kinder',
        '1° Básico', '2° Básico', '3° Básico', '4° Básico', 
        '5° Básico', '6° Básico', '7° Básico', '8° Básico',
        '1° Medio', '2° Medio', '3° Medio', '4° Medio'
    ];
    
    // Filtrar niveles que NO están ya creados
    const nivelesDisponibles = todosLosNiveles.filter(nivel => 
        !nivelesExistentes.includes(nivel)
    );
    
    // Limpiar select
    selectNivel.innerHTML = '';
    
    if (nivelesDisponibles.length === 0) {
        // No hay niveles disponibles
        selectNivel.innerHTML = '<option value="">Todos los niveles ya están creados</option>';
        selectNivel.disabled = true;
        
        // Deshabilitar botón de submit
        const submitBtn = document.querySelector('#createListModal .btn-primary');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>Sin Niveles Disponibles';
        
        showWarning(`El colegio ya tiene todos los niveles educativos creados.`);
        
    } else {
        // Hay niveles disponibles
        selectNivel.innerHTML = '<option value="">Selecciona un nivel disponible...</option>';
        
        nivelesDisponibles.forEach(nivel => {
            selectNivel.innerHTML += `<option value="${nivel}">${nivel}</option>`;
        });
        
        selectNivel.disabled = false;
        
        // Habilitar botón de submit
        const submitBtn = document.querySelector('#createListModal .btn-primary');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-plus me-1"></i>Agregar Nivel';
        
        // Enfocar el select después de cargarlo
        setTimeout(() => selectNivel.focus(), 100);
        
        showInfo(`${nivelesDisponibles.length} niveles disponibles para agregar.`);
    }
}

// Restaurar todos los niveles (en caso de error)
function restaurarTodosLosNiveles() {
    const selectNivel = document.getElementById('nivel');
    
    selectNivel.innerHTML = `
        <option value="">Selecciona un nivel...</option>
        <option value="Pre-Kinder">Pre-Kinder</option>
        <option value="Kinder">Kinder</option>
        <option value="1° Básico">1° Básico</option>
        <option value="2° Básico">2° Básico</option>
        <option value="3° Básico">3° Básico</option>
        <option value="4° Básico">4° Básico</option>
        <option value="5° Básico">5° Básico</option>
        <option value="6° Básico">6° Básico</option>
        <option value="7° Básico">7° Básico</option>
        <option value="8° Básico">8° Básico</option>
        <option value="1° Medio">1° Medio</option>
        <option value="2° Medio">2° Medio</option>
        <option value="3° Medio">3° Medio</option>
        <option value="4° Medio">4° Medio</option>
    `;
    
    selectNivel.disabled = false;
    
    // Habilitar botón de submit
    const submitBtn = document.querySelector('#createListModal .btn-primary');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-plus me-1"></i>Agregar Nivel';
}

// Función para cargar imágenes de forma lazy
function loadImagesLazy() {
    const images = document.querySelectorAll('.producto-imagen[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.1
    });
    
    images.forEach(img => {
        imageObserver.observe(img);
    });
}

// Manejar carga exitosa de imagen
function handleImageLoad(img) {
    img.classList.add('loaded');
    img.classList.remove('loading');
}

// Manejar error de carga de imagen
function handleImageError(img) {
    // Mantener la imagen por defecto SVG que ya está cargada
    img.classList.remove('loading');
    img.classList.add('error');
}

// ===== GESTIÓN DE PRODUCTOS EN LISTA (ADMIN) =====

// Cambiar cantidad de producto en lista
function cambiarCantidadProducto(productoId, cambio) {
    const input = document.getElementById(`cantidad-producto-${productoId}`);
    const nuevaCantidad = Math.max(1, Math.min(99, parseInt(input.value) + cambio));
    input.value = nuevaCantidad;
    actualizarCantidadProducto(productoId);
}

// Actualizar cantidad de producto en la base de datos
async function actualizarCantidadProducto(productoId) {
    const input = document.getElementById(`cantidad-producto-${productoId}`);
    const nuevaCantidad = parseInt(input.value);
    
    if (nuevaCantidad < 1 || nuevaCantidad > 99) {
        showError('La cantidad debe estar entre 1 y 99');
        return;
    }
    
    try {
        const response = await fetch(`/api/listas/producto/${productoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cantidad: nuevaCantidad
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Cantidad actualizada correctamente');
        } else {
            showError('Error actualizando cantidad: ' + data.error);
            // Revertir el valor si hay error
            input.value = data.original_cantidad || 1;
        }
    } catch (error) {
        console.error('Error actualizando cantidad:', error);
        showError('Error de conexión al actualizar cantidad');
    }
}

// Eliminar producto de la lista
async function eliminarProductoDeLista(productoId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto de la lista? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/listas/producto/${productoId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Producto eliminado de la lista correctamente');
            
            // Recargar la lista para mostrar los cambios
            if (currentListaId) {
                viewLista(currentListaId);
            }
        } else {
            showError('Error eliminando producto: ' + data.error);
        }
    } catch (error) {
        console.error('Error eliminando producto:', error);
        showError('Error de conexión al eliminar producto');
    }
}

// Función para cancelar la adición de productos
function cancelarAgregarProductos() {
    productosSeleccionados.clear();
    isAddingProducts = false;
    bootstrap.Modal.getInstance(document.getElementById('addProductsModal')).hide();
    
    // Volver a la lista si estábamos en modo Admin
    if (isAdminMode && currentListaId) {
        setTimeout(() => {
            viewLista(currentListaId);
        }, 100);
    }
}

// ===== AUTocompletado de Regiones y Comunas =====

// Inicializar autocompletado
function initAutocomplete() {
    const regionInput = document.getElementById('region');
    const comunaInput = document.getElementById('comuna');
    
    if (regionInput) {
        regionInput.addEventListener('input', handleRegionSearch);
        regionInput.addEventListener('keydown', handleRegionKeydown);
        regionInput.addEventListener('focus', handleRegionFocus);
        regionInput.addEventListener('blur', () => {
            setTimeout(() => hideRegionSuggestions(), 200);
        });
    }
    
    if (comunaInput) {
        comunaInput.addEventListener('input', handleComunaSearch);
        comunaInput.addEventListener('keydown', handleComunaKeydown);
        comunaInput.addEventListener('focus', handleComunaFocus);
        comunaInput.addEventListener('blur', () => {
            setTimeout(() => hideComunaSuggestions(), 200);
        });
    }
    

}

// Manejo de búsqueda de regiones
function handleRegionSearch() {
    const input = document.getElementById('region');
    const query = input.value.trim();
    
    clearTimeout(regionSearchTimeout);
    
    if (query.length < 2) {
        hideRegionSuggestions();
        return;
    }
    
    regionSearchTimeout = setTimeout(() => {
        searchRegiones(query);
    }, 300);
}

// Buscar regiones
async function searchRegiones(query) {
    try {
        const response = await fetch(`/api/chile/regiones/buscar?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success) {
            showRegionSuggestions(data.data);
        }
    } catch (error) {
        console.error('Error buscando regiones:', error);
    }
}

// Mostrar sugerencias de regiones
function showRegionSuggestions(regiones) {
    const dropdown = document.getElementById('region-suggestions');
    
    if (regiones.length === 0) {
        dropdown.innerHTML = '<div class="suggestion-item">No se encontraron regiones</div>';
    } else {
        dropdown.innerHTML = regiones.map(region => `
            <div class="suggestion-item" onclick="selectRegion('${region.nombre}', ${region.id})">
                <div class="suggestion-text">${region.nombre}</div>
            </div>
        `).join('');
    }
    
    dropdown.style.display = 'block';
}

// Ocultar sugerencias de regiones
function hideRegionSuggestions() {
    const dropdown = document.getElementById('region-suggestions');
    dropdown.style.display = 'none';
}

// Seleccionar región
function selectRegion(nombre, id) {
    const input = document.getElementById('region');
    input.value = nombre;
    selectedRegionId = id;
    hideRegionSuggestions();
    
    // Limpiar comuna cuando se selecciona una nueva región
    const comunaInput = document.getElementById('comuna');
    if (comunaInput) {
        comunaInput.value = '';
    }
}

// Manejo de teclas para regiones
function handleRegionKeydown(event) {
    const dropdown = document.getElementById('region-suggestions');
    const items = dropdown.querySelectorAll('.suggestion-item');
    const selectedItem = dropdown.querySelector('.suggestion-item.selected');
    
    switch(event.key) {
        case 'ArrowDown':
            event.preventDefault();
            if (!selectedItem) {
                items[0]?.classList.add('selected');
            } else {
                const nextItem = selectedItem.nextElementSibling;
                if (nextItem) {
                    selectedItem.classList.remove('selected');
                    nextItem.classList.add('selected');
                }
            }
            break;
        case 'ArrowUp':
            event.preventDefault();
            if (selectedItem) {
                const prevItem = selectedItem.previousElementSibling;
                if (prevItem) {
                    selectedItem.classList.remove('selected');
                    prevItem.classList.add('selected');
                }
            }
            break;
        case 'Enter':
            event.preventDefault();
            if (selectedItem) {
                const nombre = selectedItem.querySelector('.suggestion-text').textContent;
                const id = parseInt(selectedItem.getAttribute('onclick').match(/\d+/)[0]);
                selectRegion(nombre, id);
            }
            break;
        case 'Escape':
            hideRegionSuggestions();
            break;
    }
}

// Manejo de foco en región
function handleRegionFocus() {
    const input = document.getElementById('region');
    if (input.value.trim().length >= 2) {
        searchRegiones(input.value.trim());
    }
}

// Manejo de búsqueda de comunas
function handleComunaSearch() {
    const input = document.getElementById('comuna');
    const query = input.value.trim();
    
    clearTimeout(comunaSearchTimeout);
    
    if (query.length < 2) {
        hideComunaSuggestions();
        return;
    }
    
    comunaSearchTimeout = setTimeout(() => {
        searchComunas(query);
    }, 300);
}

// Buscar comunas
async function searchComunas(query) {
    try {
        let url = `/api/chile/comunas/buscar?q=${encodeURIComponent(query)}`;
        if (selectedRegionId) {
            url += `&region_id=${selectedRegionId}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            if (selectedRegionId) {
                // Comunas de una región específica
                showComunaSuggestions(data.data.map(comuna => ({
                    nombre: comuna,
                    region: null
                })));
            } else {
                // Comunas de todo Chile
                const comunas = [];
                data.data.forEach(region => {
                    region.comunas.forEach(comuna => {
                        comunas.push({
                            nombre: comuna,
                            region: region.region
                        });
                    });
                });
                showComunaSuggestions(comunas);
            }
        }
    } catch (error) {
        console.error('Error buscando comunas:', error);
    }
}

// Mostrar sugerencias de comunas
function showComunaSuggestions(comunas) {
    const dropdown = document.getElementById('comuna-suggestions');
    
    if (comunas.length === 0) {
        dropdown.innerHTML = '<div class="suggestion-item">No se encontraron comunas</div>';
    } else {
        dropdown.innerHTML = comunas.map(comuna => `
            <div class="suggestion-item" onclick="selectComuna('${comuna.nombre}')">
                <div class="suggestion-text">${comuna.nombre}</div>
                ${comuna.region ? `<div class="suggestion-subtext">${comuna.region}</div>` : ''}
            </div>
        `).join('');
    }
    
    dropdown.style.display = 'block';
}

// Ocultar sugerencias de comunas
function hideComunaSuggestions() {
    const dropdown = document.getElementById('comuna-suggestions');
    dropdown.style.display = 'none';
}

// Seleccionar comuna
function selectComuna(nombre) {
    const input = document.getElementById('comuna');
    input.value = nombre;
    hideComunaSuggestions();
}

// Manejo de teclas para comunas
function handleComunaKeydown(event) {
    const dropdown = document.getElementById('comuna-suggestions');
    const items = dropdown.querySelectorAll('.suggestion-item');
    const selectedItem = dropdown.querySelector('.suggestion-item.selected');
    
    switch(event.key) {
        case 'ArrowDown':
            event.preventDefault();
            if (!selectedItem) {
                items[0]?.classList.add('selected');
            } else {
                const nextItem = selectedItem.nextElementSibling;
                if (nextItem) {
                    selectedItem.classList.remove('selected');
                    nextItem.classList.add('selected');
                }
            }
            break;
        case 'ArrowUp':
            event.preventDefault();
            if (selectedItem) {
                const prevItem = selectedItem.previousElementSibling;
                if (prevItem) {
                    selectedItem.classList.remove('selected');
                    prevItem.classList.add('selected');
                }
            }
            break;
        case 'Enter':
            event.preventDefault();
            if (selectedItem) {
                const nombre = selectedItem.querySelector('.suggestion-text').textContent;
                selectComuna(nombre);
            }
            break;
        case 'Escape':
            hideComunaSuggestions();
            break;
    }
}

// Manejo de foco en comuna
function handleComunaFocus() {
    const input = document.getElementById('comuna');
    if (input.value.trim().length >= 2) {
        searchComunas(input.value.trim());
    }
}



// ===== MODO ADMIN/CLIENTE =====

// Cambiar entre modo admin y cliente
function toggleAdminMode() {
    isAdminMode = !isAdminMode;
    updateModeUI();
    
    // Recargar listas para mostrar/ocultar botones de admin
    loadListas();
}

// Actualizar la interfaz según el modo
function updateModeUI() {
    const adminToggle = document.getElementById('adminToggle');
    const btnNuevaLista = document.getElementById('btnNuevaLista');
    const modeIndicator = document.getElementById('modeIndicator');
    const clienteView = document.getElementById('cliente-view');
    const productosContainer = document.getElementById('productos-container');
    const adminListasContainer = document.getElementById('admin-listas-container');
    
    // Verificar que los elementos existan antes de usarlos
    if (adminToggle) {
        if (isAdminMode) {
            adminToggle.innerHTML = '<i class="fas fa-user-shield"></i> Admin';
            adminToggle.className = 'btn btn-warning btn-sm me-2';
        } else {
            adminToggle.innerHTML = '<i class="fas fa-user"></i> Cliente';
            adminToggle.className = 'btn btn-outline-light btn-sm me-2';
        }
    }
    
    if (btnNuevaLista) {
        btnNuevaLista.style.display = isAdminMode ? 'inline-block' : 'none';
    }
    
    if (modeIndicator) {
        if (isAdminMode) {
            modeIndicator.className = 'alert alert-warning';
            modeIndicator.innerHTML = `
                <i class="fas fa-user-shield me-2"></i>
                <strong>Modo Admin:</strong> Gestiona listas escolares. Crea, edita y elimina listas. Cambia a modo Cliente para buscar y cargar listas al carrito.
            `;
        } else {
            modeIndicator.className = 'alert alert-info';
            modeIndicator.innerHTML = `
                <i class="fas fa-info-circle me-2"></i>
                <strong>Modo Cliente:</strong> Busca y carga listas escolares al carrito. Cambia a modo Admin para crear y editar listas.
            `;
        }
    }
    
    if (clienteView) {
        clienteView.style.display = isAdminMode ? 'none' : 'block';
    }
    
    if (productosContainer) {
        productosContainer.style.display = 'none';
    }
    
    if (adminListasContainer) {
        adminListasContainer.style.display = isAdminMode ? 'block' : 'none';
    }
    
    // Limpiar contenedor de listas encontradas de cliente
    const listasClienteContainer = document.getElementById('listas-cliente-container');
    if (listasClienteContainer) {
        listasClienteContainer.innerHTML = '';
    }
    
    // Cargar datos según el modo
    if (isAdminMode) {
        cargarFiltrosAdmin();
        cargarTodasLasListas();
    }
}

// Modificar la función renderListas para mostrar diferentes acciones según el modo
function renderListas(listas) {
    console.log('🎨 Renderizando listas:', listas);
    const container = document.getElementById('listas-container');
    
    if (!container) {
        console.error('❌ No se encontró el contenedor de listas');
        return;
    }
    
    if (listas.length === 0) {
        console.log('📝 No hay listas para mostrar');
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle me-2"></i>
                    No hay listas escolares disponibles.
                    ${isAdminMode ? '¡Crea la primera lista!' : ''}
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = listas.map(lista => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card h-100">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0">
                        <i class="fas fa-school me-2"></i>${lista.nombre_colegio}
                    </h5>
                    <span class="badge bg-primary">${lista.productos_count || 0} productos</span>
                </div>
                <div class="card-body">
                    <p class="card-text">
                        <i class="fas fa-map-marker-alt me-2"></i>
                        <strong>Ubicación:</strong> ${lista.comuna}, ${lista.region}
                    </p>
                    <p class="card-text">
                        <i class="fas fa-graduation-cap me-2"></i>
                                                    <strong>Nivel:</strong> ${lista.nivel_completo || lista.nivel || 'No especificado'}
                    </p>
                    <p class="card-text">
                        <i class="fas fa-calendar me-2"></i>
                        <strong>Creada:</strong> ${new Date(lista.created_at).toLocaleDateString()}
                    </p>
                </div>
                <div class="card-footer">
                    ${isAdminMode ? `
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-outline-primary btn-sm" onclick="viewLista(${lista.id})">
                                <i class="fas fa-eye me-1"></i>Ver
                            </button>
                            <button class="btn btn-outline-warning btn-sm" onclick="editarLista(${lista.id})">
                                <i class="fas fa-edit me-1"></i>Editar
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="eliminarLista(${lista.id})">
                                <i class="fas fa-trash me-1"></i>Eliminar
                            </button>
                        </div>
                    ` : `
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-outline-primary btn-sm" onclick="viewLista(${lista.id})">
                                <i class="fas fa-eye me-1"></i>Ver
                            </button>
                            <button class="btn btn-success btn-sm" onclick="cargarListaDirecta(${lista.id})">
                                <i class="fas fa-cart-plus me-1"></i>Cargar al Carrito
                            </button>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `).join('');
}

// Función para cargar lista directamente al carrito (modo cliente)
async function cargarListaDirecta(listaId) {
    try {
        const response = await fetch(`/api/shopify/carrito/lista/${listaId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.data.carrito_url) {
                showSuccess(`✅ ${data.data.productos_agregados} productos preparados para el carrito!`);
                
                // Abrir carrito con productos en nueva pestaña
                window.open(data.data.carrito_url, '_blank');
            } else {
                showWarning('No se pudieron agregar productos al carrito. Verifica el stock disponible.');
            }
            
            // Mostrar productos sin stock si los hay
            if (data.data.productos_sin_stock && data.data.productos_sin_stock.length > 0) {
                const productosSinStock = data.data.productos_sin_stock.map(p => p.title).join(', ');
                showWarning(`Productos sin stock: ${productosSinStock}`);
            }
        } else {
            showError('Error cargando lista al carrito: ' + data.error);
        }
    } catch (error) {
        console.error('Error cargando lista al carrito:', error);
        showError('Error de conexión al cargar lista al carrito');
    }
}

// Ver cursos de un colegio específico
async function verCursosColegio(nombreColegio, region, comuna) {
    try {
        const params = new URLSearchParams();
        params.append('colegio', nombreColegio);
        params.append('region', region);
        params.append('comuna', comuna);
        
        const response = await fetch(`/api/listas?${params.toString()}`);
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            renderCursosColegio(nombreColegio, region, comuna, data.data);
        } else {
            mostrarNotificacion('No se encontraron cursos para este colegio', 'info');
        }
    } catch (error) {
        console.error('Error cargando cursos del colegio:', error);
        mostrarNotificacion('Error cargando cursos del colegio', 'error');
    }
}

// Renderizar cursos de un colegio
function renderCursosColegio(nombreColegio, region, comuna, listas) {
    const container = document.getElementById('listas-cliente-container');
    
    let html = `
        <div class="mb-3">
            <button class="btn btn-outline-secondary" onclick="aplicarFiltrosCliente()">
                <i class="fas fa-arrow-left me-2"></i>Volver a Colegios
            </button>
        </div>
        <div class="card">
            <div class="card-header">
                <h4>
                    <i class="fas fa-school me-2"></i>
                    ${nombreColegio}
                </h4>
                <p class="mb-0 text-muted">
                    <i class="fas fa-map-marker-alt me-1"></i>
                    ${comuna}, ${region}
                </p>
            </div>
            <div class="card-body">
                <h5>Cursos Disponibles</h5>
                <div class="row">
    `;
    
    listas.forEach(lista => {
        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100">
                    <div class="card-body">
                        <h6 class="card-title">
                            <i class="fas fa-graduation-cap me-2"></i>
                            ${lista.nivel_completo || lista.nivel}
                        </h6>
                        <p class="card-text">
                            <strong>Productos:</strong> ${lista.productos_count || 0}<br>
                            <strong>Última actualización:</strong> ${new Date(lista.updated_at).toLocaleDateString()}
                        </p>
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-primary btn-sm" onclick="verListaProductos(${lista.id})">
                                <i class="fas fa-eye me-1"></i>
                                Ver Productos
                            </button>
                            <button class="btn btn-success btn-sm" onclick="cargarListaCompletaAlCarrito(${lista.id})">
                                <i class="fas fa-cart-plus me-1"></i>
                                Cargar al Carrito
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Ver productos de una lista específica
async function verListaProductos(listaId) {
    console.log('🚀 FUNCIÓN verListaProductos llamada con ID:', listaId);
    
    // Si estamos en modo cliente, usar la función de cliente
    if (!isAdminMode) {
        console.log('🔧 Modo cliente detectado, llamando a verListaCliente');
        if (typeof window.verListaClienteCliente === 'function') {
            return await window.verListaClienteCliente(listaId);
        } else {
            console.error('❌ Función verListaCliente no encontrada en cliente.js');
            mostrarNotificacion('Error: Función de visualización no disponible', 'error');
            return;
        }
    }
    
    // Modo admin - función original
    try {
        const response = await fetch(`/api/listas/${listaId}`);
        const data = await response.json();
        
        if (data.success) {
            mostrarModalListaProductos(data.data);
        } else {
            mostrarNotificacion('Error cargando productos de la lista', 'error');
        }
    } catch (error) {
        console.error('Error cargando productos de la lista:', error);
        mostrarNotificacion('Error cargando productos de la lista', 'error');
    }
}

// Mostrar modal con productos de la lista
function mostrarModalListaProductos(lista) {
    const modal = document.getElementById('modalVerLista');
    const modalTitle = document.getElementById('modalVerListaTitle');
    const modalBody = document.getElementById('productos-lista-container');
    
    modalTitle.textContent = `${lista.nombre_colegio} - ${lista.nivel_completo || lista.nivel}`;
    
    if (!lista.productos || lista.productos.length === 0) {
        modalBody.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No hay productos en esta lista.
            </div>
        `;
    } else {
        // Calcular total general
        const totalGeneral = lista.productos.reduce((total, producto) => {
            return total + (producto.precio * producto.cantidad);
        }, 0);
        
        let html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead class="table-light">
                        <tr>
                            <th style="width: 80px;">Imagen</th>
                            <th>Producto</th>
                            <th>Código</th>
                            <th class="text-end">Precio Unit.</th>
                            <th class="text-center">Cantidad</th>
                            <th class="text-end">Total</th>
                            <th class="text-center">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lista.productos.map(producto => `
                            <tr>
                                <td>
                                    <img src="${producto.imagen || '/images/default-product.png'}" 
                                         alt="${producto.nombre_producto}" 
                                         class="img-fluid" style="max-height: 50px; max-width: 50px;">
                                </td>
                                <td>
                                    <strong>${producto.nombre_producto}</strong>
                                </td>
                                <td>
                                    <small class="text-muted">ID Shopify: ${producto.producto_shopify_id || 'N/A'}</small>
                                </td>
                                <td class="text-end">
                                    $${formatPrice(producto.precio)}
                                </td>
                                <td class="text-center">
                                    ${producto.cantidad}
                                </td>
                                <td class="text-end">
                                    <strong>$${formatPrice(producto.precio * producto.cantidad)}</strong>
                                </td>
                                <td class="text-center">
                                    <span class="badge ${producto.cantidad > 0 ? 'bg-success' : 'bg-danger'}">
                                        ${producto.cantidad > 0 ? 'Disponible' : 'No disponible'}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="row mt-3">
                <div class="col-md-6">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        <strong>Total General:</strong> $${formatPrice(totalGeneral)}
                        <br>
                        <small class="text-muted">*valor no incluye gastos de envío e impuestos.</small>
                    </div>
                </div>
                <div class="col-md-6 text-end">
                    <button class="btn btn-success btn-lg" onclick="cargarListaCompletaAlCarrito(${lista.id})">
                        <i class="fas fa-cart-plus me-2"></i>
                        Cargar Lista Completa al Carrito
                    </button>
                </div>
            </div>
        `;
        
        modalBody.innerHTML = html;
    }
    
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

// Función para cargar lista completa al carrito
async function cargarListaCompletaAlCarrito(listaId) {
    try {
        // Mostrar indicador de carga
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Cargando...';
        button.disabled = true;
        
        // Usar lista personalizada si está disponible (usar_lista_personalizada = true)
        const response = await fetch(`/api/shopify/carrito/lista/${listaId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usar_lista_personalizada: true
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.data.carrito_url) {
                mostrarNotificacion(`✅ ${data.data.productos_agregados} productos agregados al carrito!`, 'success');
                
                // Cerrar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalVerLista'));
                if (modal) {
                    modal.hide();
                }
                
                // Abrir carrito con productos en nueva pestaña
                window.open(data.data.carrito_url, '_blank');
            } else {
                mostrarNotificacion('No se pudieron agregar productos al carrito. Verifica el stock disponible.', 'warning');
            }
            
            // Mostrar productos sin stock si los hay
            if (data.data.productos_sin_stock && data.data.productos_sin_stock.length > 0) {
                const productosSinStock = data.data.productos_sin_stock.map(p => p.title).join(', ');
                mostrarNotificacion(`Productos sin stock: ${productosSinStock}`, 'warning');
            }
        } else {
            mostrarNotificacion('Error cargando lista al carrito: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error cargando lista al carrito:', error);
        mostrarNotificacion('Error de conexión al cargar lista al carrito', 'error');
    } finally {
        // Restaurar botón
        const button = event.target;
        button.innerHTML = '<i class="fas fa-cart-plus me-2"></i>Cargar Lista Completa al Carrito';
        button.disabled = false;
    }
}

// Función para agregar productos individuales al carrito (mantenida por compatibilidad)
async function agregarAlCarrito(productoId, cantidad) {
    try {
        const response = await fetch('/api/shopify/carrito/agregar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                producto_id: productoId,
                cantidad: cantidad
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacion('Producto agregado al carrito', 'success');
        } else {
            mostrarNotificacion('Error agregando producto al carrito: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error agregando producto al carrito:', error);
        mostrarNotificacion('Error de conexión al agregar producto al carrito', 'error');
    }
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear notificación toast
    const toastContainer = document.getElementById('toast-container') || crearToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${tipo === 'success' ? 'success' : tipo === 'error' ? 'danger' : 'info'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${mensaje}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remover toast después de que se oculte
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Crear contenedor de toasts si no existe
function crearToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
}

// Función para formatear precios
function formatPrice(price) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(price);
}
