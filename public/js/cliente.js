// ===== SISTEMA DE LISTAS PERSONALIZADAS PARA CLIENTES =====

// Variables globales para personalización de listas
let listaOriginal = null;
let listaPersonalizada = null;
let productosAgregados = [];
let productosEliminados = new Set();
// Variable para almacenar variantes seleccionadas antes de agregar producto
let variantesSeleccionadas = {}; // { productoId: { variant_id, precio, nombre_variante } }
// currentListaId está definido en app.js

// Inicializar sistema de listas personalizadas
function inicializarSistemaListas() {
    console.log('🚀 Sistema de Listas Personalizadas iniciado');
    
    // Inicializar variables de personalización
    listaOriginal = null;
    listaPersonalizada = null;
    productosAgregados = [];
    productosEliminados.clear();
    // currentListaId se maneja en app.js
    
    // Hacer la función verListaCliente disponible globalmente para app.js
    window.verListaClienteCliente = verListaCliente;
    
    console.log('✅ Variables de personalización inicializadas');
}

// Mostrar buscador de productos
function mostrarBuscadorProductos() {
    console.log('🔍 Mostrando buscador de productos');
    
    // Si no hay lista seleccionada, mostrar error
    if (!currentListaId) {
        console.error('❌ No hay lista seleccionada');
        mostrarNotificacion('❌ Error: Debes abrir una lista primero. Haz clic en "Ver Lista" de cualquier lista disponible.', 'error');
        return;
    }
    
    // Si no hay lista personalizada, crear una basada en la lista original
    if (!listaPersonalizada) {
        console.log('⚠️ No hay lista personalizada, creando una basada en la lista original');
        if (listaOriginal) {
            listaPersonalizada = JSON.parse(JSON.stringify(listaOriginal));
        } else {
            mostrarNotificacion('❌ Error: No hay lista base disponible.', 'error');
            return;
        }
    }
    
    console.log('✅ Mostrando buscador de productos para:', listaPersonalizada.nombre_colegio);
    document.getElementById('buscador-productos-container').style.display = 'block';
    document.getElementById('buscador-productos-input').focus();
    
    // Mostrar información sobre agregar productos
    mostrarNotificacion(`🔍 Buscador activado. Agrega productos extra a "${listaPersonalizada.nombre_colegio}".`, 'info');
}

// Ocultar buscador de productos
function ocultarBuscadorProductos() {
    document.getElementById('buscador-productos-container').style.display = 'none';
    document.getElementById('resultados-busqueda-productos').innerHTML = '';
}

// Buscar productos para agregar a la lista
let buscarProductosTimeout;
function buscarProductosParaLista() {
    clearTimeout(buscarProductosTimeout);
    
    buscarProductosTimeout = setTimeout(async () => {
        const query = document.getElementById('buscador-productos-input').value.trim();
        const container = document.getElementById('resultados-busqueda-productos');
        
        if (query.length < 2) {
            container.innerHTML = '';
            return;
        }
        
        try {
            container.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border spinner-border-sm" role="status">
                        <span class="visually-hidden">Buscando...</span>
                    </div>
                    <small class="ms-2">Buscando productos...</small>
                </div>
            `;
            
            const response = await fetch(`/api/shopify/productos/buscar?q=${encodeURIComponent(query)}&limit=10`);
            const data = await response.json();
            
            if (data.success && data.data.length > 0) {
                renderResultadosBusquedaProductos(data.data);
            } else {
                container.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        No se encontraron productos con "${query}"
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error buscando productos:', error);
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error al buscar productos
                </div>
            `;
        }
    }, 300);
}

// Renderizar resultados de búsqueda de productos
function renderResultadosBusquedaProductos(productos) {
    const container = document.getElementById('resultados-busqueda-productos');
    
    let html = '<div class="row">';
    
    productos.forEach((producto, index) => {
        // Obtener precio directamente como en el admin
        const precio = parseFloat(producto.price) || 0;
        
        // Obtener imagen: primero intentar producto.image, luego producto.images[0].src
        let imagen = producto.image || null;
        if (!imagen && producto.images && producto.images.length > 0) {
            imagen = producto.images[0].src || null;
        }
        // Solo usar imagen por defecto si realmente no hay imagen
        if (!imagen) {
            imagen = '/images/bichoto-logo.png';
        }
        
        // Verificar si tiene variantes
        const hasVariants = producto.variants && producto.variants.length > 1;
        const varianteSeleccionada = variantesSeleccionadas[producto.id];
        const precioMostrar = varianteSeleccionada ? varianteSeleccionada.precio : precio;
        const variantIdSeleccionado = varianteSeleccionada ? varianteSeleccionada.variant_id : null;
        
        // Selector de variantes si tiene más de una
        let variantSelector = '';
        if (hasVariants) {
            variantSelector = `
                <div class="mb-2">
                    <label class="form-label small mb-1">
                        <i class="fas fa-tags me-1"></i>Variante:
                    </label>
                    <select class="form-select form-select-sm" 
                            id="variant-select-cliente-${producto.id}" 
                            onchange="actualizarVariantSeleccionadaCliente(${producto.id}, this.value, '${producto.title.replace(/'/g, "\\'")}')">
                        <option value="">Selecciona una variante</option>
                        ${producto.variants.map(variant => `
                            <option value="${variant.id}" 
                                    data-price="${variant.price}"
                                    ${variantIdSeleccionado == variant.id ? 'selected' : ''}>
                                ${variant.title || variant.option1 || 'Default Title'} - $${parseFloat(variant.price).toLocaleString()}
                                ${variant.inventory_quantity !== undefined ? ` (Stock: ${variant.inventory_quantity})` : ''}
                            </option>
                        `).join('')}
                    </select>
                </div>
            `;
        }
        
        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100">
                    <img src="${imagen}" class="card-img-top" alt="${producto.title}" 
                         style="height: 150px; object-fit: cover;"
                         onerror="this.src='/images/bichoto-logo.png'">
                    <div class="card-body">
                        <h6 class="card-title">${producto.title}</h6>
                        <p class="card-text">
                            <small class="text-muted">
                                <i class="fas fa-barcode me-1"></i>
                                ${producto.variants?.[0]?.sku || 'Sin SKU'}
                            </small>
                        </p>
                        ${hasVariants ? variantSelector : ''}
                        <p class="card-text">
                            <strong class="text-success">$${precioMostrar.toLocaleString()}</strong>
                        </p>
                        <button type="button" 
                                class="btn btn-primary btn-sm w-100 ${hasVariants && !variantIdSeleccionado ? 'disabled' : ''}" 
                                onclick="agregarProductoALista('${producto.id}', '${producto.title.replace(/'/g, "\\'")}', ${precioMostrar}, '${imagen}', '${producto.variants?.[0]?.sku || ''}', ${variantIdSeleccionado || 'null'})"
                                ${hasVariants && !variantIdSeleccionado ? 'title="Debes seleccionar una variante primero"' : ''}>
                            <i class="fas fa-plus me-1"></i>Agregar
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Actualizar variante seleccionada para cliente
function actualizarVariantSeleccionadaCliente(productoId, variantId, nombreProducto) {
    const select = document.getElementById(`variant-select-cliente-${productoId}`);
    if (!select) return;
    
    if (!variantId || variantId === '') {
        // Si se deselecciona, eliminar de variantesSeleccionadas
        delete variantesSeleccionadas[productoId];
        // Deshabilitar botón
        const btn = select.closest('.card').querySelector('button');
        if (btn) {
            btn.classList.add('disabled');
            btn.disabled = true;
        }
        return;
    }
    
    // Obtener información de la variante seleccionada
    const option = select.options[select.selectedIndex];
    const variantPrice = parseFloat(option.dataset.price) || 0;
    const variantTitle = option.textContent.split(' - ')[0];
    
    // Guardar variante seleccionada
    variantesSeleccionadas[productoId] = {
        variant_id: parseInt(variantId),
        precio: variantPrice,
        nombre_variante: variantTitle
    };
    
    // Actualizar precio mostrado
    const precioElement = select.closest('.card-body').querySelector('.text-success');
    if (precioElement) {
        precioElement.textContent = `$${variantPrice.toLocaleString()}`;
    }
    
    // Habilitar botón
    const btn = select.closest('.card').querySelector('button');
    if (btn) {
        btn.classList.remove('disabled');
        btn.disabled = false;
        // Actualizar onclick con el nuevo precio y variant_id
        btn.setAttribute('onclick', `agregarProductoALista('${productoId}', '${nombreProducto.replace(/'/g, "\\'")}', ${variantPrice}, '${select.closest('.card').querySelector('img').src}', '', ${variantId})`);
    }
    
    console.log('✅ Variante seleccionada:', {
        productoId,
        variant_id: variantId,
        precio: variantPrice,
        nombre_variante: variantTitle
    });
}

// Agregar producto a la lista personalizada
async function agregarProductoALista(productoId, nombre, precio, imagen, sku, variantId = null) {
    console.log('🔧 Intentando agregar producto:', { productoId, nombre, precio, variantId });
    
    // Si tiene variantes pero no se seleccionó ninguna, mostrar error
    const varianteInfo = variantesSeleccionadas[productoId];
    const variantIdFinal = variantId || (varianteInfo ? varianteInfo.variant_id : null);
    const precioFinal = varianteInfo ? varianteInfo.precio : precio;
    const nombreFinal = varianteInfo ? `${nombre} - ${varianteInfo.nombre_variante}` : nombre;
    
    // Verificar que haya una lista seleccionada
    if (!currentListaId) {
        console.error('❌ No hay lista seleccionada');
        mostrarNotificacion('❌ Error: Debes abrir una lista primero. Haz clic en "Ver Lista" de cualquier lista disponible.', 'error');
        return;
    }
    
    try {
        // Agregar producto a la base de datos temporal
        const response = await fetch(`/api/listas/personalizada/${currentListaId}/producto`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                producto_shopify_id: productoId,
                variant_id: variantIdFinal,
                nombre_producto: nombreFinal,
                precio: precioFinal,
                imagen: imagen,
                codigo_producto: sku,
                cantidad: 1
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Agregar el producto directamente a la lista personalizada
            const nuevoProducto = {
                id: `temp_${data.data.id}`,
                lista_id: currentListaId,
                producto_shopify_id: productoId,
                variant_id: variantIdFinal,
                nombre_producto: nombreFinal,
                precio: precioFinal,
                cantidad: 1,
                imagen: imagen,
                codigo_producto: sku,
                es_agregado: true,
                es_original: false
            };
            
            // Agregar a la lista personalizada
            if (listaPersonalizada && listaPersonalizada.productos) {
                listaPersonalizada.productos.push(nuevoProducto);
            }
            
            // NO limpiar la variante seleccionada para permitir agregar múltiples variantes del mismo producto
            // La variante se mantiene seleccionada para facilitar agregar más del mismo producto o cambiar a otra variante
            
            // Actualizar la vista del modal
            mostrarModalListaPersonalizada(listaPersonalizada);
            
            // NO ocultar el buscador para permitir seguir agregando productos
            // ocultarBuscadorProductos();
            
            mostrarNotificacion(`✅ Producto agregado: ${nombreFinal}`, 'success');
            console.log('✅ Producto agregado exitosamente a la base de datos con variant_id:', variantIdFinal);
            console.log('💡 Puedes agregar otra variante del mismo producto o cambiar la variante seleccionada');
        } else {
            mostrarNotificacion('Error agregando producto: ' + data.error, 'error');
        }
        
    } catch (error) {
        console.error('Error agregando producto:', error);
        mostrarNotificacion('Error de conexión al agregar producto', 'error');
    }
}

// Variable para evitar llamadas múltiples
let verListaClienteTimeout = null;

// Ver lista específica (cliente)
async function verListaCliente(listaId) {
    // Evitar llamadas múltiples en un corto período
    if (verListaClienteTimeout) {
        clearTimeout(verListaClienteTimeout);
    }
    
    verListaClienteTimeout = setTimeout(async () => {
        await verListaClienteReal(listaId);
    }, 100);
}

async function verListaClienteReal(listaId) {
    console.log('🚀 FUNCIÓN verListaCliente EJECUTÁNDOSE con ID:', listaId);
    
    try {
        console.log('🔍 Cargando lista personalizada:', listaId);
        
        // Cargar lista personalizada (base + modificaciones temporales)
        const response = await fetch(`/api/listas/personalizada/${listaId}`);
        const data = await response.json();
        
        if (data.success) {
            const lista = data.data;
            console.log('📋 Lista personalizada cargada:', lista);
            
            // Guardar ID de lista actual (IMPORTANTE)
            currentListaId = listaId;
            
            // Guardar lista original y personalizada
            listaOriginal = JSON.parse(JSON.stringify(lista)); // Deep copy
            listaPersonalizada = JSON.parse(JSON.stringify(lista)); // Deep copy
            
            // Inicializar arrays de cambios
            productosAgregados = lista.productos.filter(p => p.es_agregado || p.id?.toString().startsWith('temp_'));
            productosEliminados = new Set();
            
            console.log('✅ Lista personalizada inicializada:', {
                currentListaId,
                nombre_colegio: listaPersonalizada.nombre_colegio,
                productosCount: listaPersonalizada.productos?.length || 0,
                productosAgregados: productosAgregados.length
            });
            
            // Mostrar modal con productos
            mostrarModalListaPersonalizada(lista);
            
        } else {
            console.error('❌ Error en respuesta:', data);
            showError('Error al cargar la lista: ' + data.error);
        }
    } catch (error) {
        console.error('❌ Error cargando lista:', error);
        showError('Error de conexión al cargar la lista');
    }
}

// Mostrar modal con lista personalizada
function mostrarModalListaPersonalizada(lista) {
    // Limpiar modales existentes para evitar múltiples backdrops
    const existingModals = document.querySelectorAll('.modal-backdrop');
    existingModals.forEach(backdrop => backdrop.remove());
    
    const modal = document.getElementById('modalVerLista');
    const modalTitle = document.getElementById('modalVerListaTitle');
    const modalBody = document.getElementById('productos-lista-container');
    
    // Configurar título del modal
    modalTitle.innerHTML = `
        <i class="fas fa-list me-2"></i>
                                    ${lista.nombre_colegio} - ${lista.nivel_completo || lista.nivel}
        <span class="badge bg-primary ms-2" id="lista-personalizada-badge" style="display: none;">
            <i class="fas fa-edit me-1"></i>Lista Personalizada
        </span>
    `;
    
    // Renderizar productos
    renderProductosListaPersonalizada(lista.productos);
    
    // Mostrar modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // Actualizar badge de personalización
    actualizarBadgePersonalizada();
}

// Renderizar productos de la lista personalizada
function renderProductosListaPersonalizada(productos) {
    const container = document.getElementById('productos-lista-container');
    
    if (!productos || productos.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No hay productos en esta lista
            </div>
        `;
        return;
    }
    
    let html = '<div class="table-responsive"><table class="table table-hover">';
    html += `
        <thead class="table-light">
            <tr>
                <th>Producto</th>
                <th>Precio</th>
                <th>Cantidad</th>
                <th>Total</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    let totalGeneral = 0;
    
    productos.forEach(producto => {
        const precio = parseFloat(producto.precio) || 0;
        const cantidad = parseInt(producto.cantidad) || 1;
        const total = precio * cantidad;
        totalGeneral += total;
        
        // Determinar si el producto es editable (todos los productos en lista personalizada son editables)
        const esProductoEditable = producto.es_agregado || producto.id.toString().startsWith('temp_');
        const esProductoOriginal = producto.es_original;
        
        // Determinar clase de fila basada en el estado del producto
        let rowClass = '';
        if (esProductoOriginal) {
            rowClass = 'table-info'; // Producto original de la lista base
        } else if (esProductoEditable && !esProductoOriginal) {
            rowClass = 'table-success'; // Producto agregado por el cliente
        } else if (productosEliminados.has(producto.producto_shopify_id)) {
            rowClass = 'table-danger'; // Producto eliminado
        } else if (producto.es_modificado) {
            rowClass = 'table-warning'; // Producto modificado
        }
        
        html += `
            <tr class="${rowClass}">
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${producto.imagen || '/images/bichoto-logo.png'}" 
                             alt="${producto.nombre_producto}" 
                             class="me-3" 
                             style="width: 50px; height: 50px; object-fit: cover;"
                             onerror="this.src='/images/bichoto-logo.png'">
                        <div>
                            <strong>${producto.nombre_producto}</strong>
                            ${productosEliminados.has(producto.producto_shopify_id) ? 
                                '<span class="badge bg-danger ms-2"><i class="fas fa-minus"></i> Eliminado</span>' : ''}
                            ${producto.es_modificado ? 
                                '<span class="badge bg-warning ms-2"><i class="fas fa-edit"></i> Modificado</span>' : ''}
                            <br>
                            <small class="text-muted">
                                <i class="fas fa-barcode me-1"></i>
                                ID Shopify: ${producto.producto_shopify_id || 'N/A'}
                            </small>
                        </div>
                    </div>
                </td>
                <td>$${precio.toLocaleString()}</td>
                <td>
                    <div class="input-group input-group-sm" style="width: 120px;">
                        <button class="btn btn-outline-secondary" type="button" 
                                onclick="cambiarCantidadProducto('${producto.producto_shopify_id}', -1, '${producto.variant_id || ''}')">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="form-control text-center" 
                               value="${cantidad}" min="1" max="99" 
                               data-producto-id="${producto.producto_shopify_id}"
                               data-variant-id="${producto.variant_id || ''}"
                               id="cantidad-${producto.producto_shopify_id}-${producto.variant_id || 'null'}"
                               onchange="actualizarCantidadProducto('${producto.producto_shopify_id}', this.value, '${producto.variant_id || ''}')">
                        <button class="btn btn-outline-secondary" type="button" 
                                onclick="cambiarCantidadProducto('${producto.producto_shopify_id}', 1, '${producto.variant_id || ''}')">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </td>
                <td><strong>$${total.toLocaleString()}</strong></td>
                <td>
                    <button type="button" class="btn btn-danger btn-sm" 
                            onclick="eliminarProductoDeLista('${producto.producto_shopify_id}', '${producto.variant_id || ''}')"
                            title="Eliminar producto">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    
    // Agregar resumen total e información
    html += `
        <div class="alert alert-success">
            <strong>Total General: $${totalGeneral.toLocaleString()}</strong>
        </div>
        <div class="alert alert-info">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Información:</strong> Esta es tu lista personalizada. Puedes modificar cantidades y eliminar productos.
                    <br>
                    <strong>Nota:</strong>total general despacho no incluido.
                </div>
                <button type="button" class="btn btn-outline-info btn-sm" onclick="mostrarInfoProductosEditables()">
                    <i class="fas fa-question-circle me-1"></i>Ver detalles
                </button>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Cambiar cantidad de producto - ahora recibe también variant_id para identificar correctamente
async function cambiarCantidadProducto(productoId, delta, variantId = '') {
    if (!currentListaId) {
        mostrarNotificacion('Error: No hay lista seleccionada', 'error');
        return;
    }
    
    try {
        // Buscar el input específico por producto_shopify_id y variant_id
        const variantIdStr = variantId || 'null';
        const cantidadInput = document.getElementById(`cantidad-${productoId}-${variantIdStr}`);
        if (!cantidadInput) {
            // Fallback: buscar por data attributes
            const inputs = document.querySelectorAll(`input[data-producto-id="${productoId}"]`);
            const input = Array.from(inputs).find(inp => {
                const inputVariantId = inp.getAttribute('data-variant-id') || '';
                return (variantId === '' && inputVariantId === '') || inputVariantId === variantId;
            });
            if (!input) {
            mostrarNotificacion('Error: No se pudo encontrar el producto o no es editable', 'error');
            return;
            }
            cantidadInput = input;
        }
        
        // Verificar que el producto sea editable (todos los productos en lista personalizada son editables)
        const row = cantidadInput.closest('tr');
        const isEditable = row.classList.contains('table-success') || row.classList.contains('table-info');
        
        if (!isEditable) {
            mostrarNotificacion('Error: No se puede modificar este producto', 'warning');
            return;
        }
        
        const cantidadActual = parseInt(cantidadInput.value) || 1;
        const nuevaCantidad = Math.max(1, Math.min(99, cantidadActual + delta));
        
        // Solo actualizar si la cantidad cambió
        if (nuevaCantidad !== cantidadActual) {
            // Enviar variant_id si está disponible
            const body = { cantidad: nuevaCantidad };
            if (variantId && variantId !== '') {
                body.variant_id = variantId;
            }
            
            const response = await fetch(`/api/listas/personalizada/${currentListaId}/producto/${productoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Actualizar el input inmediatamente
                cantidadInput.value = nuevaCantidad;
                
                // Actualizar el total de la fila
                const precioCell = row.querySelector('td:nth-child(2)');
                const totalCell = row.querySelector('td:nth-child(4)');
                
                if (precioCell && totalCell) {
                    const precio = parseFloat(precioCell.textContent.replace('$', '').replace(',', '')) || 0;
                    const total = precio * nuevaCantidad;
                    totalCell.innerHTML = `<strong>$${total.toLocaleString()}</strong>`;
                }
                
                // Actualizar total general
                actualizarTotalGeneral();
                
                // Mostrar notificación de cambio
                const mensaje = delta > 0 ? 'Cantidad aumentada' : 'Cantidad disminuida';
                mostrarNotificacion(`${mensaje}: ${nuevaCantidad}`, 'info');
            } else {
                mostrarNotificacion('Error cambiando cantidad: ' + data.error, 'error');
            }
        }
    } catch (error) {
        console.error('Error cambiando cantidad:', error);
        mostrarNotificacion('Error de conexión al cambiar cantidad', 'error');
    }
}

// Actualizar cantidad de producto (desde input) - ahora recibe también variant_id
function actualizarCantidadProducto(productoId, nuevaCantidad, variantId = '') {
    const cantidad = parseInt(nuevaCantidad);
    if (cantidad >= 1 && cantidad <= 99) {
        // Obtener cantidad actual desde el DOM usando variant_id si está disponible
        const variantIdStr = variantId || 'null';
        let cantidadInput = document.getElementById(`cantidad-${productoId}-${variantIdStr}`);
        if (!cantidadInput) {
            // Fallback: buscar por data attributes
            const inputs = document.querySelectorAll(`input[data-producto-id="${productoId}"]`);
            cantidadInput = Array.from(inputs).find(inp => {
                const inputVariantId = inp.getAttribute('data-variant-id') || '';
                return (variantId === '' && inputVariantId === '') || inputVariantId === variantId;
            });
        }
        if (cantidadInput) {
            const cantidadActual = parseInt(cantidadInput.value) || 1;
            cambiarCantidadProducto(productoId, cantidad - cantidadActual, variantId);
        }
    }
}

// Actualizar total general de la lista
function actualizarTotalGeneral() {
    const rows = document.querySelectorAll('#productos-lista-container tbody tr');
    let totalGeneral = 0;
    
    rows.forEach(row => {
        const precioCell = row.querySelector('td:nth-child(2)');
        const cantidadInput = row.querySelector('input[type="number"]');
        const cantidadBadge = row.querySelector('.badge.bg-secondary');
        
        if (precioCell) {
            const precio = parseFloat(precioCell.textContent.replace('$', '').replace(',', '')) || 0;
            let cantidad = 1;
            
            if (cantidadInput) {
                cantidad = parseInt(cantidadInput.value) || 1;
            } else if (cantidadBadge) {
                cantidad = parseInt(cantidadBadge.textContent) || 1;
            }
            
            totalGeneral += precio * cantidad;
        }
    });
    
    // Actualizar el total general en el DOM
    const totalElement = document.querySelector('#productos-lista-container .alert-success strong');
    if (totalElement) {
        totalElement.textContent = `Total General: $${totalGeneral.toLocaleString()}`;
    }
}

// Mostrar información sobre productos editables
function mostrarInfoProductosEditables() {
    const productosOriginales = document.querySelectorAll('#productos-lista-container tbody tr.table-info');
    const productosAgregados = document.querySelectorAll('#productos-lista-container tbody tr.table-success');
    
    let mensaje = '📋 Información de la lista personalizada:\n\n';
    mensaje += `🔵 Productos originales de la lista: ${productosOriginales.length}\n`;
    mensaje += `🟢 Productos agregados por ti: ${productosAgregados.length}\n\n`;
    mensaje += '💡 Esta es tu lista personalizada. Puedes:\n';
    mensaje += '• Modificar cantidades de cualquier producto\n';
    mensaje += '• Eliminar productos que no quieras\n';
    mensaje += '• Agregar productos adicionales\n\n';
    mensaje += '⚠️ Los cambios solo afectan tu lista personalizada, no la lista original del administrador.';
    
    alert(mensaje);
}

// Eliminar producto de la lista personalizada - ahora recibe también variant_id
async function eliminarProductoDeLista(productoId, variantId = '') {
    if (!currentListaId) {
        mostrarNotificacion('Error: No hay lista seleccionada', 'error');
        return;
    }
    
    // Buscar la fila específica por producto_shopify_id y variant_id
    const variantIdStr = variantId || 'null';
    let cantidadInput = document.getElementById(`cantidad-${productoId}-${variantIdStr}`);
    if (!cantidadInput) {
        // Fallback: buscar por data attributes
        const inputs = document.querySelectorAll(`input[data-producto-id="${productoId}"]`);
        cantidadInput = Array.from(inputs).find(inp => {
            const inputVariantId = inp.getAttribute('data-variant-id') || '';
            return (variantId === '' && inputVariantId === '') || inputVariantId === variantId;
        });
    }
    
    const row = cantidadInput?.closest('tr');
    if (!row) {
        mostrarNotificacion('Error: No se pudo encontrar el producto o no es editable', 'error');
        return;
    }
    
    // Verificar que el producto sea editable (todos los productos en lista personalizada son editables)
    const isEditable = row.classList.contains('table-success') || row.classList.contains('table-info');
    
    if (!isEditable) {
        mostrarNotificacion('Error: No se puede eliminar este producto', 'warning');
        return;
    }
    
    const nombreProducto = row.querySelector('strong')?.textContent || 'Producto';
    
    const mensajeConfirmacion = `¿Estás seguro de que quieres eliminar "${nombreProducto}" de tu lista personalizada?\n\n⚠️ Nota: Este cambio se guardará temporalmente y durará 1 hora.`;
    
    if (confirm(mensajeConfirmacion)) {
        try {
            // Incluir variant_id en la URL si está disponible
            let url = `/api/listas/personalizada/${currentListaId}/producto/${productoId}`;
            if (variantId && variantId !== '') {
                url += `?variant_id=${variantId}`;
            }
            
            const response = await fetch(url, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Ocultar la fila del producto eliminado
                row.style.display = 'none';
                
                // Actualizar total general
                actualizarTotalGeneral();
                
                mostrarNotificacion(`"${nombreProducto}" eliminado de tu lista personalizada`, 'info');
            } else {
                mostrarNotificacion('Error eliminando producto: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error eliminando producto:', error);
            mostrarNotificacion('Error de conexión al eliminar producto', 'error');
        }
    }
}

// Resetear lista a la original (restaurar lista del administrador)
async function resetearListaPersonalizada() {
    if (!currentListaId) {
        mostrarNotificacion('Error: No hay lista seleccionada para restaurar', 'error');
        return;
    }
    
    const mensajeConfirmacion = `¿Estás seguro de que quieres restaurar la lista original del administrador?\n\n⚠️ Se perderán todos los cambios realizados en tu lista personalizada:\n• Productos agregados\n• Productos eliminados\n• Cantidades modificadas\n\nLa lista volverá a su estado original.`;
    
    if (confirm(mensajeConfirmacion)) {
        try {
            const response = await fetch(`/api/listas/personalizada/${currentListaId}/reset`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Después del reset, recargar la lista personalizada para que copie los productos base
                // Esto asegura que todos los productos sean editables
                await verListaCliente(currentListaId);
                
                mostrarNotificacion('✅ Lista restaurada a la original del administrador. Todos los productos son editables.', 'success');
            } else {
                mostrarNotificacion('Error restaurando lista: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error restaurando lista:', error);
            mostrarNotificacion('Error de conexión al restaurar lista', 'error');
        }
    }
}

// Ver lista temporal (productos agregados por el usuario)
function verListaTemporal() {
    if (!listaPersonalizada || !listaPersonalizada.productos || listaPersonalizada.productos.length === 0) {
        mostrarNotificacion('❌ No hay lista seleccionada o productos en tu lista personalizada.', 'warning');
        return;
    }
    
    console.log('📋 Mostrando lista personalizada:', listaPersonalizada.nombre_colegio);
    mostrarModalListaPersonalizada(listaPersonalizada);
}

// Actualizar badge de lista personalizada
function actualizarBadgePersonalizada() {
    const badge = document.getElementById('lista-personalizada-badge');
    
    // Contar productos con cantidades modificadas
    let productosConCantidadModificada = 0;
    if (listaPersonalizada && listaPersonalizada.productos && listaOriginal && listaOriginal.productos) {
        listaPersonalizada.productos.forEach(producto => {
            const productoOriginal = listaOriginal.productos.find(p => p.producto_shopify_id === producto.producto_shopify_id);
            if (productoOriginal && producto.cantidad !== productoOriginal.cantidad) {
                productosConCantidadModificada++;
            }
        });
    }
    
    const tieneCambios = productosAgregados.length > 0 || productosEliminados.size > 0 || productosConCantidadModificada > 0;
    
    if (tieneCambios) {
        let badgeText = `<i class="fas fa-edit me-1"></i>Lista Personalizada`;
        let cambios = [];
        
        if (productosAgregados.length > 0) {
            cambios.push(`${productosAgregados.length} agregados`);
        }
        if (productosEliminados.size > 0) {
            cambios.push(`${productosEliminados.size} eliminados`);
        }
        if (productosConCantidadModificada > 0) {
            cambios.push(`${productosConCantidadModificada} cantidades modificadas`);
        }
        
        badge.innerHTML = `${badgeText} (${cambios.join(', ')})`;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

// Verificar estado de la lista personalizada (para debugging)
function verificarEstadoLista() {
    console.log('🔍 Estado actual de la lista personalizada:', {
        listaOriginal: listaOriginal,
        listaPersonalizada: listaPersonalizada,
        productosAgregados: productosAgregados,
        productosEliminados: Array.from(productosEliminados),
        currentListaId: currentListaId
    });
}

// Mostrar información de la lista actual
function mostrarInfoListaActual() {
    if (listaPersonalizada) {
        console.log('📋 Lista actual:', {
            nombre: listaPersonalizada.nombre_colegio,
            nivel: listaPersonalizada.nivel,
            productos: listaPersonalizada.productos.length,
            region: listaPersonalizada.region,
            comuna: listaPersonalizada.comuna
        });
        
        mostrarNotificacion(`📋 Lista actual: ${listaPersonalizada.nombre_colegio} - ${listaPersonalizada.nivel} (${listaPersonalizada.productos.length} productos)`, 'info');
    } else {
        console.log('❌ No hay lista seleccionada');
        mostrarNotificacion('❌ No hay lista seleccionada. Selecciona una lista primero.', 'warning');
    }
}

// Mostrar información sobre el comportamiento de sesión
function mostrarInfoSesion() {
    const mensaje = `
        <strong>💡 Información sobre Listas Personalizadas:</strong><br><br>
        
        <strong>📋 Listas del Administrador:</strong><br>
        • Son las listas base creadas por el administrador<br>
        • Contienen productos predefinidos para cada colegio<br>
        • No se pueden modificar<br><br>
        
        <strong>✨ Lista Personalizada:</strong><br>
        • Puedes agregar productos extra a cualquier lista<br>
        • Puedes eliminar productos que no necesites<br>
        • Puedes modificar cantidades de productos<br>
        • Los cambios son temporales (1 hora)<br><br>
        
        <strong>🔄 Comportamiento:</strong><br>
        • Los cambios solo afectan tu sesión actual<br>
        • Si recargas la página, mantienes tus cambios<br>
        • Después de 1 hora, los cambios se eliminan automáticamente<br>
        • Otros usuarios ven las listas originales del administrador<br><br>
        
        <strong>🛒 Carrito de Compras:</strong><br>
        • Usa el botón "Cargar al Carrito" para comprar<br>
        • Se agregarán todos los productos de tu lista personalizada<br>
        • Incluye productos originales + productos agregados - productos eliminados
    `;
    
    mostrarNotificacion(mensaje, 'info', 10000);
}

// Cargar lista personalizada al carrito
async function cargarListaAlCarrito() {
    console.log('🚀 FUNCIÓN cargarListaAlCarrito EJECUTÁNDOSE');
    
    // Obtener el botón y bloquearlo para evitar múltiples clics
    const btnCarrito = document.querySelector('button[onclick="cargarListaAlCarrito()"]');
    let originalText = '';
    if (btnCarrito) {
        originalText = btnCarrito.innerHTML;
        btnCarrito.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Enviando a carrito...';
        btnCarrito.disabled = true;
        btnCarrito.classList.add('btn-secondary');
        btnCarrito.classList.remove('btn-primary');
    }
    
    try {
        // Obtener productos directamente desde el DOM para reflejar el estado actual
        const productosParaEnviar = [];
        const rows = document.querySelectorAll('#productos-lista-container tbody tr');
        
        console.log(`🔍 Encontradas ${rows.length} filas en el DOM`);
        
        rows.forEach(row => {
            // Solo procesar filas visibles (no ocultas por eliminación)
            if (row.style.display === 'none') {
                return;
            }
            
            // Obtener datos del producto desde el input
            const cantidadInput = row.querySelector('input[type="number"]');
            if (!cantidadInput) {
                return; // Fila sin input de cantidad, saltar
            }
            
            // Obtener producto_shopify_id y variant_id desde atributos data
            const producto_shopify_id = cantidadInput.getAttribute('data-producto-id');
            const variant_id = cantidadInput.getAttribute('data-variant-id');
            const cantidad = parseInt(cantidadInput.value) || 1;
            
            // Obtener nombre del producto desde la fila
            const nombreElement = row.querySelector('strong');
            const nombre = nombreElement ? nombreElement.textContent.trim() : 'Producto';
            
            if (producto_shopify_id && cantidad > 0) {
                productosParaEnviar.push({
                    producto_shopify_id: producto_shopify_id,
                    variant_id: variant_id && variant_id !== '' ? variant_id : null,
                    cantidad: cantidad,
                    nombre: nombre
                });
            }
        });
        
        console.log('🛒 Productos para enviar al carrito (desde DOM):', productosParaEnviar);
        
        if (productosParaEnviar.length === 0) {
            mostrarNotificacion('No hay productos visibles para agregar al carrito', 'warning');
        // Restaurar botón
            if (btnCarrito && originalText) {
            btnCarrito.innerHTML = originalText;
            btnCarrito.disabled = false;
            btnCarrito.classList.remove('btn-secondary');
            btnCarrito.classList.add('btn-primary');
        }
        return;
    }
    
        console.log('📤 Enviando petición al servidor...');
        
        // Enviar lista personalizada al carrito
        const response = await fetch('/api/shopify/carrito/personalizado', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productos: productosParaEnviar
            })
        });
        
        console.log('📥 Respuesta recibida del servidor');
        
        const data = await response.json();
        console.log('📦 Respuesta del servidor:', data);
        
        if (data.success && data.data.items && data.data.items.length > 0) {
            console.log('✅ Respuesta exitosa del servidor:', data);
            
            // Agregar productos al carrito usando la API de Cart de Shopify
            // Esto respeta las cookies y sincroniza el carrito correctamente
            const storefrontUrl = data.data.storefront_url || 'https://bichoto.myshopify.com';
            const cartUrl = data.data.cart_url || 'https://bichoto.myshopify.com/cart';
            
            console.log('🛒 Agregando productos al carrito de Shopify...');
            mostrarNotificacion(`🛒 Agregando ${data.data.items.length} productos al carrito...`, 'info');
            
            try {
                // Agregar productos al carrito usando la API de Cart de Shopify
                // Esta API respeta las cookies automáticamente
                const addToCartResponse = await fetch(`${storefrontUrl}/cart/add.js`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include', // Importante: incluir cookies
                    body: JSON.stringify({
                        items: data.data.items
                    })
                });
                
                if (addToCartResponse.ok) {
                    const cartData = await addToCartResponse.json();
                    console.log('✅ Productos agregados al carrito:', cartData);
                    
                    // Refrescar el carrito para asegurar sincronización
                    await fetch(`${storefrontUrl}/cart.js`, {
                        method: 'GET',
                        credentials: 'include'
                    });
                    
                    mostrarNotificacion(`✅ ${data.data.items.length} productos agregados al carrito exitosamente!`, 'success');
                    
                    // Redirigir al carrito después de un breve delay para asegurar que se guardó
                    setTimeout(() => {
                        window.location.href = cartUrl;
                    }, 500);
                } else {
                    const errorData = await addToCartResponse.json();
                    console.error('❌ Error agregando al carrito:', errorData);
                    throw new Error(errorData.description || 'Error agregando productos al carrito');
                }
            } catch (cartError) {
                console.error('❌ Error en API de Cart:', cartError);
                // Fallback: usar URL directa del carrito
                mostrarNotificacion(`⚠️ Usando método alternativo para agregar productos...`, 'warning');
                const cartItems = data.data.items.map(item => `${item.variant_id}:${item.quantity}`).join(',');
                window.location.href = `${cartUrl}/${cartItems}`;
            }
        } else if (data.success && (!data.data.items || data.data.items.length === 0)) {
            mostrarNotificacion('⚠️ No hay productos válidos para agregar al carrito', 'warning');
        } else {
            console.error('Error agregando lista al carrito:', data.error);
            mostrarNotificacion('❌ No se pudieron agregar productos al carrito: ' + (data.error || 'Error desconocido'), 'error');
        }
        
    } catch (error) {
        console.error('Error cargando lista al carrito:', error);
        mostrarNotificacion('Error de conexión al cargar lista al carrito', 'error');
    } finally {
        // Restaurar botón siempre al final
        if (btnCarrito && originalText) {
            btnCarrito.innerHTML = originalText;
            btnCarrito.disabled = false;
            btnCarrito.classList.remove('btn-secondary');
            btnCarrito.classList.add('btn-primary');
        }
    }
}

// Mostrar resumen de cambios realizados
function mostrarResumenCambios() {
    if (!listaOriginal || !listaPersonalizada) {
        mostrarNotificacion('No hay lista para comparar', 'warning');
        return;
    }
    
    const productosOriginales = listaOriginal.productos || [];
    const productosPersonalizados = listaPersonalizada.productos || [];
    
    const productosAgregados = productosPersonalizados.filter(p => 
        p.es_agregado || p.id.toString().startsWith('temp_')
    );
    
    const productosEliminados = productosOriginales.filter(p => 
        !productosPersonalizados.some(personalizado => 
            personalizado.producto_shopify_id === p.producto_shopify_id
        )
    );
    
    const productosModificados = productosPersonalizados.filter(p => {
        const original = productosOriginales.find(orig => orig.producto_shopify_id === p.producto_shopify_id);
        return original && p.cantidad !== original.cantidad;
    });
    
    let mensaje = `<strong>📊 Resumen de Cambios:</strong><br><br>`;
    
    if (productosAgregados.length > 0) {
        mensaje += `<strong>➕ Productos Agregados (${productosAgregados.length}):</strong><br>`;
        productosAgregados.forEach(p => {
            mensaje += `• ${p.nombre_producto} - Cantidad: ${p.cantidad}<br>`;
        });
        mensaje += `<br>`;
    }
    
    if (productosEliminados.length > 0) {
        mensaje += `<strong>➖ Productos Eliminados (${productosEliminados.length}):</strong><br>`;
        productosEliminados.forEach(p => {
            mensaje += `• ${p.nombre_producto}<br>`;
        });
        mensaje += `<br>`;
    }
    
    if (productosModificados.length > 0) {
        mensaje += `<strong>✏️ Cantidades Modificadas (${productosModificados.length}):</strong><br>`;
        productosModificados.forEach(p => {
            const original = productosOriginales.find(orig => orig.producto_shopify_id === p.producto_shopify_id);
            mensaje += `• ${p.nombre_producto}: ${original.cantidad} → ${p.cantidad}<br>`;
        });
        mensaje += `<br>`;
    }
    
    if (productosAgregados.length === 0 && productosEliminados.length === 0 && productosModificados.length === 0) {
        mensaje += `✅ No se han realizado cambios en esta lista.`;
    }
    
    mostrarNotificacion(mensaje, 'info', 8000);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    inicializarSistemaListas();
    
    // Configurar event listener para el buscador de productos
    const buscadorInput = document.getElementById('buscador-productos-input');
    if (buscadorInput) {
        buscadorInput.addEventListener('input', buscarProductosParaLista);
    }
});
