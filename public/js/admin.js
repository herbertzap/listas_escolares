// Variables globales
let isAdminMode = true; // Siempre true en admin
let currentListaId = null;
let productosSeleccionados = [];
let currentColegioId = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin inicializado');
    
    // Verificar autenticación con delay para dar tiempo a que la sesión se guarde
    setTimeout(() => {
        verificarAutenticacion();
    }, 500);
    
    // Cargar datos iniciales
    cargarRegiones();
    cargarTodasLasListas();
    cargarProductos();
    
    // Configurar event listeners
    setupEventListeners();
});

// Verificar autenticación
async function verificarAutenticacion() {
    try {
        console.log('🔍 Verificando autenticación...');
        const response = await fetch('/auth/status');
        const data = await response.json();
        
        console.log('📊 Respuesta de autenticación:', data);
        
        if (!data.authenticated) {
            console.log('❌ No autenticado, redirigiendo al login');
            window.location.href = '/auth/login';
            return;
        }
        
        console.log('✅ Usuario autenticado correctamente');
        // Actualizar información del usuario
        if (data.user) {
            document.getElementById('userName').textContent = data.user.name || 'Administrador';
        }
    } catch (error) {
        console.error('❌ Error verificando autenticación:', error);
        window.location.href = '/auth/login';
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Búsqueda de productos
    const searchProductos = document.getElementById('searchProductos');
    if (searchProductos) {
        searchProductos.addEventListener('input', debounce(function() {
            cargarProductos(this.value);
        }, 300));
    }
    
    // Búsqueda en modal
    const searchProductosModal = document.getElementById('searchProductosModal');
    if (searchProductosModal) {
        searchProductosModal.addEventListener('input', debounce(function() {
            cargarProductosModal(this.value);
        }, 300));
    }
}

// Función debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Cargar regiones
async function cargarRegiones() {
    try {
        const response = await fetch('/api/chile/regiones');
        const data = await response.json();
        
        if (data.success) {
            const selectRegion = document.getElementById('selectRegion');
            const selectRegionModal = document.getElementById('region');
            
            data.data.forEach(region => {
                const option = new Option(region.nombre, region.nombre);
                selectRegion.add(option.cloneNode(true));
                selectRegionModal.add(option);
            });
        }
    } catch (error) {
        console.error('Error cargando regiones:', error);
    }
}

// Cargar comunas por región
async function cargarComunas(region, selectElement) {
    try {
        console.log('🔄 cargarComunas ejecutado:', { region, selectElementId: selectElement.id });
        
        // Determinar qué API usar basado en el contexto
        let url;
        if (selectElement.id === 'comuna') {
            // Estamos en el modal de nueva lista - usar todas las comunas de Chile
            url = `/api/listas/chile-comunas?region=${encodeURIComponent(region)}`;
        } else {
            // Estamos en los filtros principales - usar solo comunas con datos
            url = `/api/listas/comunas?region=${encodeURIComponent(region)}`;
        }
        
        console.log('🌐 URL:', url);
        
        const response = await fetch(url);
        console.log('📡 Response status:', response.status);
        
        const data = await response.json();
        console.log('📊 Respuesta API:', data);
        
        if (data.success) {
            // Limpiar opciones existentes
            if (selectElement.id === 'selectComuna') {
                selectElement.innerHTML = '<option value="">Todas las comunas</option>';
            } else {
                selectElement.innerHTML = '<option value="">Selecciona una comuna</option>';
            }
            
            data.data.forEach(comuna => {
                const option = new Option(comuna, comuna);
                selectElement.add(option);
            });
            
            console.log('✅ Comunas cargadas:', data.data.length);
        } else {
            console.error('❌ Error en respuesta API:', data.error);
        }
    } catch (error) {
        console.error('❌ Error cargando comunas:', error);
    }
}

// Event handlers para filtros
function onRegionChange() {
    console.log('🔄 onRegionChange ejecutado');
    console.log('📍 Event:', event);
    console.log('📍 Event target:', event ? event.target : 'null');
    console.log('📍 Event target id:', event && event.target ? event.target.id : 'null');
    
    const selectRegion = document.getElementById('selectRegion');
    const selectComuna = document.getElementById('selectComuna');
    const selectRegionModal = document.getElementById('region');
    const selectComunaModal = document.getElementById('comuna');
    
    console.log('📍 Elementos encontrados:', {
        selectRegion: !!selectRegion,
        selectComuna: !!selectComuna,
        selectRegionModal: !!selectRegionModal,
        selectComunaModal: !!selectComunaModal
    });
    
    // Determinar si estamos en el modal o en la vista principal
    const isInModal = event && event.target && event.target.id === 'region';
    console.log('📍 ¿Estamos en modal?', isInModal);
    
    if (isInModal) {
        console.log('🎯 Procesando modal de nueva lista');
        console.log('📍 Valor región modal:', selectRegionModal ? selectRegionModal.value : 'null');
        
        // Estamos en el modal de nueva lista
        if (selectComunaModal) {
            selectComunaModal.innerHTML = '<option value="">Selecciona una comuna</option>';
            console.log('🧹 Comuna modal limpiada');
        }
        
        if (selectRegionModal && selectRegionModal.value) {
            console.log('🚀 Llamando cargarComunas para modal');
            cargarComunas(selectRegionModal.value, selectComunaModal);
        } else {
            console.log('⚠️ No hay región seleccionada en modal');
        }
    } else {
        console.log('🎯 Procesando filtros principales');
        // Estamos en la vista principal
        if (selectComuna) {
            selectComuna.innerHTML = '<option value="">Todas las comunas</option>';
        }
        
        if (selectRegion && selectRegion.value) {
            cargarComunas(selectRegion.value, selectComuna);
        }
        
        // Aplicar filtros automáticamente
        aplicarFiltros();
    }
}

function onComunaChange() {
    // Aplicar filtros automáticamente cuando cambia comuna
    aplicarFiltros();
}

// Buscar colegios con debounce
let buscarColegiosTimeout;
function buscarColegios() {
    clearTimeout(buscarColegiosTimeout);
    buscarColegiosTimeout = setTimeout(() => {
        aplicarFiltros();
    }, 300);
}

// Aplicar filtros y cargar listas
async function aplicarFiltros(page = 1) {
    const region = document.getElementById('selectRegion').value;
    const comuna = document.getElementById('selectComuna').value;
    const colegio = document.getElementById('searchColegio').value;
    
    // Mostrar indicador de carga
    const container = document.getElementById('listas-container');
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
        
        // Agregar parámetros de paginación
        params.append('page', page.toString());
        params.append('limit', '20'); // Mostrar 20 listas por página
        
        const response = await fetch(`/api/listas?${params.toString()}`);
        const data = await response.json();
        
        if (data.success) {
            renderAdminListas(data.data, data.pagination);
        }
    } catch (error) {
        console.error('Error aplicando filtros:', error);
        mostrarNotificacion('Error aplicando filtros', 'error');
        
        // Mostrar mensaje de error
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error al aplicar filtros. Intenta de nuevo.
            </div>
        `;
    }
}

// Cargar todas las listas
async function cargarTodasLasListas() {
    try {
        const response = await fetch('/api/listas?page=1&limit=20');
        const data = await response.json();
        
        if (data.success) {
            renderAdminListas(data.data, data.pagination);
        }
    } catch (error) {
        console.error('Error cargando listas:', error);
        mostrarNotificacion('Error cargando listas', 'error');
    }
}

// Limpiar filtros
function limpiarFiltros() {
    document.getElementById('selectRegion').value = '';
    document.getElementById('selectComuna').innerHTML = '<option value="">Todas las comunas</option>';
    document.getElementById('searchColegio').value = '';
    aplicarFiltros();
}

// Función para manejar paginación
function cambiarPagina(page) {
    aplicarFiltros(page);
}

// Buscar coincidencias de colegios
let buscarCoincidenciasTimeout;
async function buscarCoincidenciasColegios() {
    const nombreColegio = document.getElementById('nombreColegio').value.trim();
    const coincidenciasDiv = document.getElementById('coincidencias-colegios');
    const listaCoincidencias = document.getElementById('lista-coincidencias');
    
    clearTimeout(buscarCoincidenciasTimeout);
    
    if (nombreColegio.length < 2) {
        coincidenciasDiv.style.display = 'none';
        return;
    }
    
    buscarCoincidenciasTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`/api/listas?colegio=${encodeURIComponent(nombreColegio)}`);
            const data = await response.json();
            
            if (data.success && data.data.length > 0) {
                // Agrupar por colegio (nombre-región-comuna)
                const colegiosUnicos = {};
                data.data.forEach(lista => {
                    const key = `${lista.nombre_colegio}-${lista.region}-${lista.comuna}`;
                    if (!colegiosUnicos[key]) {
                        colegiosUnicos[key] = {
                            nombre: lista.nombre_colegio,
                            region: lista.region,
                            comuna: lista.comuna,
                            cursos: []
                        };
                    }
                    colegiosUnicos[key].cursos.push(lista.nivel_completo || lista.nivel);
                });
                
                // Mostrar coincidencias
                let html = '';
                Object.values(colegiosUnicos).forEach(colegio => {
                    html += `
                        <div class="alert alert-warning alert-sm py-2 mb-1">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <strong>${colegio.nombre}</strong><br>
                                    <small class="text-muted">${colegio.region} - ${colegio.comuna}</small><br>
                                    <small class="text-info">Cursos: ${colegio.cursos.join(', ')}</small>
                                </div>
                                <button class="btn btn-sm btn-outline-primary" onclick="cargarDatosColegio('${colegio.nombre}', '${colegio.region}', '${colegio.comuna}')">
                                    <i class="fas fa-arrow-down"></i> Cargar
                                </button>
                            </div>
                        </div>
                    `;
                });
                
                listaCoincidencias.innerHTML = html;
                coincidenciasDiv.style.display = 'block';
            } else {
                coincidenciasDiv.style.display = 'none';
            }
        } catch (error) {
            console.error('Error buscando coincidencias:', error);
        }
    }, 300);
}

// Cargar datos de un colegio existente
async function cargarDatosColegio(nombre, region, comuna) {
    // Cargar datos en el formulario
    document.getElementById('nombreColegio').value = nombre;
    document.getElementById('region').value = region;
    
    // Cargar comunas de la región
    await cargarComunas(region, document.getElementById('comuna'));
    document.getElementById('comuna').value = comuna;
    
    // Cargar niveles disponibles (excluyendo los ya creados)
    await cargarNivelesDisponibles(nombre, region, comuna, document.getElementById('nivel'));
    
    // Ocultar coincidencias
    document.getElementById('coincidencias-colegios').style.display = 'none';
    
    // Mostrar mensaje informativo
    mostrarNotificacion(`Datos del colegio "${nombre}" cargados. Selecciona un nivel educativo disponible.`, 'info');
}

// Renderizar listas en admin
function renderAdminListas(listas, pagination) {
    const container = document.getElementById('listas-container');
    
    if (!listas || listas.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No hay listas creadas. Crea la primera lista haciendo clic en "Nueva Lista".
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
                cursos: []
            };
        }
        colegios[key].cursos.push({
            id: lista.id,
            nivel: lista.nivel_completo || lista.nivel,
            productos_count: lista.productos_count || 0
        });
    });
    
    let html = `
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Colegio</th>
                        <th>Región</th>
                        <th>Comuna</th>
                        <th>Cursos/Niveles</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    Object.values(colegios).forEach(colegio => {
        const totalProductos = colegio.cursos.reduce((sum, curso) => sum + curso.productos_count, 0);
        const cursosHtml = colegio.cursos.map(curso => 
            `<span class="badge bg-secondary me-1">${curso.nivel} (${curso.productos_count})</span>`
        ).join('');
        
        // Escapar comillas simples y dobles para evitar errores de sintaxis
        const nombreEscapado = colegio.nombre.replace(/'/g, "\\'").replace(/"/g, '\\"');
        const regionEscapada = colegio.region.replace(/'/g, "\\'").replace(/"/g, '\\"');
        const comunaEscapada = colegio.comuna.replace(/'/g, "\\'").replace(/"/g, '\\"');
        
        html += `
            <tr>
                <td><strong>${colegio.nombre}</strong></td>
                <td>${colegio.region}</td>
                <td>${colegio.comuna}</td>
                <td>
                    ${cursosHtml}
                    <br><small class="text-muted">Total productos: ${totalProductos}</small>
                </td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="verColegio('${nombreEscapado}', '${regionEscapada}', '${comunaEscapada}')" title="Ver cursos del colegio">
                            <i class="fas fa-eye"></i> Ver Cursos
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="agregarCurso('${nombreEscapado}', '${regionEscapada}', '${comunaEscapada}')" title="Agregar nuevo curso">
                            <i class="fas fa-plus"></i> Nuevo Curso
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-eliminar-colegio" 
                                data-nombre="${colegio.nombre.replace(/"/g, '&quot;')}" 
                                data-region="${colegio.region.replace(/"/g, '&quot;')}" 
                                data-comuna="${colegio.comuna.replace(/"/g, '&quot;')}" 
                                data-productos="${totalProductos}" 
                                data-cursos="${colegio.cursos.length}"
                                title="Eliminar colegio">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    // Agregar paginación si existe
    if (pagination && pagination.totalPages > 1) {
        html += renderPagination(pagination);
    }
    
    container.innerHTML = html;
    
    // Agregar event listeners a los botones de eliminar (usando data attributes para evitar problemas con comillas)
    container.querySelectorAll('.btn-eliminar-colegio').forEach(btn => {
        btn.addEventListener('click', function() {
            const nombre = this.getAttribute('data-nombre');
            const region = this.getAttribute('data-region');
            const comuna = this.getAttribute('data-comuna');
            const productos = parseInt(this.getAttribute('data-productos')) || 0;
            const cursos = parseInt(this.getAttribute('data-cursos')) || 0;
            confirmarEliminarColegio(nombre, region, comuna, productos, cursos);
        });
    });
}

// Ver cursos de un colegio
async function verColegio(nombre, region, comuna) {
    try {
        // Guardar información del colegio actual
        currentColegioId = { nombre, region, comuna };
        
        const response = await fetch(`/api/listas?colegio=${encodeURIComponent(nombre)}&region=${encodeURIComponent(region)}&comuna=${encodeURIComponent(comuna)}`);
        const data = await response.json();
        
        if (data.success) {
            mostrarModalCursos(nombre, data.data);
        }
    } catch (error) {
        console.error('Error cargando cursos del colegio:', error);
        mostrarNotificacion('Error cargando cursos', 'error');
    }
}

// Mostrar modal con cursos del colegio
function mostrarModalCursos(nombreColegio, cursos) {
    let html = `
        <div class="modal fade" id="modalCursos" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Cursos de ${nombreColegio}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Curso/Nivel</th>
                                        <th>Productos</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
    `;
    
    cursos.forEach(curso => {
        html += `
            <tr>
                <td><strong>${curso.nivel_completo || curso.nivel}</strong></td>
                <td><span class="badge bg-primary">${curso.productos_count || 0}</span></td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="verLista(${curso.id})" title="Ver productos">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="agregarProductos(${curso.id})" title="Agregar productos">
                            <i class="fas fa-plus"></i> Productos
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminarLista(${curso.id})" title="Eliminar">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remover modal anterior si existe
    const modalAnterior = document.getElementById('modalCursos');
    if (modalAnterior) {
        modalAnterior.remove();
    }
    
    // Agregar nuevo modal
    document.body.insertAdjacentHTML('beforeend', html);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modalCursos'));
    modal.show();
}

// Confirmar eliminación de colegio
function confirmarEliminarColegio(nombre, region, comuna, totalProductos, totalCursos) {
    // Llenar el modal con la información del colegio
    document.getElementById('nombreColegioEliminar').textContent = nombre;
    document.getElementById('regionColegioEliminar').textContent = region;
    document.getElementById('comunaColegioEliminar').textContent = comuna;
    document.getElementById('cursosColegioEliminar').textContent = totalCursos;
    document.getElementById('productosColegioEliminar').textContent = totalProductos;
    
    // Configurar el botón de confirmar
    const btnConfirmar = document.getElementById('btnConfirmarEliminarColegio');
    btnConfirmar.onclick = () => eliminarColegio(nombre, region, comuna);
    
    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('modalEliminarColegio'));
    modal.show();
}

// Eliminar colegio completo
async function eliminarColegio(nombre, region, comuna) {
    try {
        // Deshabilitar botón mientras se procesa
        const btnConfirmar = document.getElementById('btnConfirmarEliminarColegio');
        const textoOriginal = btnConfirmar.innerHTML;
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Eliminando...';
        
        const response = await fetch(`/api/listas/colegio?nombre=${encodeURIComponent(nombre)}&region=${encodeURIComponent(region)}&comuna=${encodeURIComponent(comuna)}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalEliminarColegio'));
            modal.hide();
            
            // Mostrar mensaje de éxito
            mostrarNotificacion(
                `✅ Colegio "${nombre}" eliminado exitosamente. ${data.data.listas_eliminadas} listas y ${data.data.productos_eliminados} productos eliminados.`,
                'success'
            );
            
            // Recargar la lista de colegios
            setTimeout(() => {
                cargarTodasLasListas();
            }, 1000);
        } else {
            mostrarNotificacion('❌ Error eliminando colegio: ' + data.error, 'error');
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = textoOriginal;
        }
    } catch (error) {
        console.error('Error eliminando colegio:', error);
        mostrarNotificacion('❌ Error de conexión al eliminar colegio', 'error');
        const btnConfirmar = document.getElementById('btnConfirmarEliminarColegio');
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = '<i class="fas fa-trash me-1"></i>Sí, Eliminar Colegio';
    }
}

// Agregar nuevo curso a un colegio
async function agregarCurso(nombre, region, comuna) {
    // Pre-llenar el modal de nuevo curso
    document.getElementById('nombreColegioCurso').value = nombre;
    document.getElementById('regionCurso').value = region;
    document.getElementById('comunaCurso').value = comuna;
    
    // Cargar niveles disponibles (excluyendo los ya creados)
    await cargarNivelesDisponibles(nombre, region, comuna);
    
    // Mostrar modal de nuevo curso
    const modal = new bootstrap.Modal(document.getElementById('modalNuevoCurso'));
    modal.show();
}

// Cargar niveles disponibles para un colegio
async function cargarNivelesDisponibles(nombre, region, comuna, selectElement = null) {
    try {
        // Obtener combinaciones nivel-sigla existentes del colegio
        const response = await fetch(`/api/listas/niveles-siglas/${encodeURIComponent(nombre)}?region=${encodeURIComponent(region)}&comuna=${encodeURIComponent(comuna)}`);
        const data = await response.json();
        
        if (data.success) {
            // Crear un mapa de niveles y sus siglas usadas
            const nivelesConSiglas = {};
            data.data.forEach(item => {
                if (!nivelesConSiglas[item.nivel]) {
                    nivelesConSiglas[item.nivel] = [];
                }
                nivelesConSiglas[item.nivel].push(item.sigla_curso || '');
            });
            
            // Guardar esta información globalmente para usar en actualizarSiglasDisponibles
            window.nivelesConSiglas = nivelesConSiglas;
            
            // Obtener todos los niveles educativos
            const nivelesResponse = await fetch('/api/chile/niveles');
            const nivelesData = await nivelesResponse.json();
            
            if (nivelesData.success) {
                // Determinar qué select usar
                const selectNivel = selectElement || document.getElementById('nivelCurso') || document.getElementById('nivel');
                selectNivel.innerHTML = '<option value="">Selecciona un nivel</option>';
                
                nivelesData.data.forEach(nivel => {
                    const siglasUsadas = nivelesConSiglas[nivel.nombre] || [];
                    const tieneGeneral = siglasUsadas.includes('');
                    
                    // Mostrar el nivel con información sobre siglas usadas
                    let textoNivel = nivel.nombre;
                    if (siglasUsadas.length > 0) {
                        const siglasTexto = siglasUsadas.filter(s => s !== '').join(', ');
                        if (tieneGeneral) {
                            textoNivel += ` (General + ${siglasTexto})`;
                        } else {
                            textoNivel += ` (${siglasTexto})`;
                        }
                    }
                    
                    selectNivel.innerHTML += `<option value="${nivel.nombre}">${textoNivel}</option>`;
                });
            }
        }
    } catch (error) {
        console.error('Error cargando niveles disponibles:', error);
    }
}

// Actualizar siglas disponibles según el nivel seleccionado
function actualizarSiglasDisponibles() {
    const nivelSeleccionado = document.getElementById('nivel').value;
    const siglaSelect = document.getElementById('siglaCurso');
    
    if (!nivelSeleccionado) {
        siglaSelect.innerHTML = '<option value="">Selecciona un nivel primero</option>';
        siglaSelect.disabled = true;
        return;
    }
    
    siglaSelect.disabled = false;
    siglaSelect.innerHTML = '<option value="">General (sin diferenciación)</option>';
    
    // Obtener siglas usadas para este nivel
    const siglasUsadas = window.nivelesConSiglas?.[nivelSeleccionado] || [];
    const tieneGeneral = siglasUsadas.includes('');
    
    // Si ya tiene "General", deshabilitar esa opción
    if (tieneGeneral) {
        siglaSelect.innerHTML = '<option value="" disabled>General (ya ingresado)</option>';
    }
    
    // Opciones de letras
    const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    
    letras.forEach(letra => {
        const estaUsada = siglasUsadas.includes(letra);
        const disabled = estaUsada ? 'disabled' : '';
        const texto = estaUsada ? `${letra} (ya ingresado)` : letra;
        siglaSelect.innerHTML += `<option value="${letra}" ${disabled}>${texto}</option>`;
    });
    
    // Mostrar información sobre el nivel seleccionado
    if (siglasUsadas.length > 0) {
        const siglasTexto = siglasUsadas.filter(s => s !== '').join(', ');
        const mensaje = tieneGeneral ? 
            `Este nivel ya tiene: General + ${siglasTexto}` : 
            `Este nivel ya tiene: ${siglasTexto}`;
        
        // Crear o actualizar mensaje informativo
        let infoDiv = document.getElementById('sigla-info');
        if (!infoDiv) {
            infoDiv = document.createElement('div');
            infoDiv.id = 'sigla-info';
            infoDiv.className = 'form-text text-info mt-2';
            siglaSelect.parentNode.appendChild(infoDiv);
        }
        infoDiv.innerHTML = `<i class="fas fa-info-circle me-1"></i>${mensaje}`;
    } else {
        // Remover mensaje si no hay siglas usadas
        const infoDiv = document.getElementById('sigla-info');
        if (infoDiv) {
            infoDiv.remove();
        }
    }
}

// Actualizar siglas disponibles según el nivel seleccionado (para modal nuevo curso)
function actualizarSiglasDisponiblesNuevo() {
    const nivelSeleccionado = document.getElementById('nivelCurso').value;
    const siglaSelect = document.getElementById('siglaCursoNuevo');
    
    if (!nivelSeleccionado) {
        siglaSelect.innerHTML = '<option value="">Selecciona un nivel primero</option>';
        siglaSelect.disabled = true;
        return;
    }
    
    siglaSelect.disabled = false;
    siglaSelect.innerHTML = '<option value="">General (sin diferenciación)</option>';
    
    // Obtener siglas usadas para este nivel
    const siglasUsadas = window.nivelesConSiglas?.[nivelSeleccionado] || [];
    const tieneGeneral = siglasUsadas.includes('');
    
    // Si ya tiene "General", deshabilitar esa opción
    if (tieneGeneral) {
        siglaSelect.innerHTML = '<option value="" disabled>General (ya ingresado)</option>';
    }
    
    // Opciones de letras
    const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    
    letras.forEach(letra => {
        const estaUsada = siglasUsadas.includes(letra);
        const disabled = estaUsada ? 'disabled' : '';
        const texto = estaUsada ? `${letra} (ya ingresado)` : letra;
        siglaSelect.innerHTML += `<option value="${letra}" ${disabled}>${texto}</option>`;
    });
    
    // Mostrar información sobre el nivel seleccionado
    if (siglasUsadas.length > 0) {
        const siglasTexto = siglasUsadas.filter(s => s !== '').join(', ');
        const mensaje = tieneGeneral ? 
            `Este nivel ya tiene: General + ${siglasTexto}` : 
            `Este nivel ya tiene: ${siglasTexto}`;
        
        // Crear o actualizar mensaje informativo
        let infoDiv = document.getElementById('sigla-info-nuevo');
        if (!infoDiv) {
            infoDiv = document.createElement('div');
            infoDiv.id = 'sigla-info-nuevo';
            infoDiv.className = 'form-text text-info mt-2';
            siglaSelect.parentNode.appendChild(infoDiv);
        }
        infoDiv.innerHTML = `<i class="fas fa-info-circle me-1"></i>${mensaje}`;
    } else {
        // Remover mensaje si no hay siglas usadas
        const infoDiv = document.getElementById('sigla-info-nuevo');
        if (infoDiv) {
            infoDiv.remove();
        }
    }
}

// Renderizar paginación
function renderPagination(pagination) {
    let html = '<nav><ul class="pagination justify-content-center">';
    
    // Botón anterior
    if (pagination.currentPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="cargarTodasLasListas(${pagination.currentPage - 1})">Anterior</a></li>`;
    }
    
    // Números de página
    for (let i = 1; i <= pagination.totalPages; i++) {
        const active = i === pagination.currentPage ? 'active' : '';
        html += `<li class="page-item ${active}"><a class="page-link" href="#" onclick="cargarTodasLasListas(${i})">${i}</a></li>`;
    }
    
    // Botón siguiente
    if (pagination.currentPage < pagination.totalPages) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="cargarTodasLasListas(${pagination.currentPage + 1})">Siguiente</a></li>`;
    }
    
    html += '</ul></nav>';
    return html;
}

// Cargar productos
async function cargarProductos(search = '') {
    try {
        const url = search ? `/api/shopify/productos?search=${encodeURIComponent(search)}` : '/api/shopify/productos';
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            renderProductos(data.data);
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

// Renderizar productos
function renderProductos(productos) {
    const container = document.getElementById('productos-container');
    
    if (!productos || productos.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No se encontraron productos.</div>';
        return;
    }
    
    let html = '<div class="row">';
    
    productos.forEach(producto => {
        html += `
            <div class="col-md-4 mb-3">
                <div class="card h-100">
                    <img src="${producto.image || '/images/no-image.png'}" class="card-img-top" alt="${producto.title}" style="height: 200px; object-fit: cover;">
                    <div class="card-body">
                        <h6 class="card-title">${producto.title}</h6>
                        <p class="card-text text-muted">$${producto.price}</p>
                        <p class="card-text"><small class="text-muted">ID: ${producto.id}</small></p>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Variable para debounce
let searchTimeout;

// Cargar productos para modal
async function cargarProductosModal(search = '') {
    try {
        if (!search.trim()) {
            // Si no hay búsqueda, mostrar mensaje para buscar
            renderProductosModal([]);
            return;
        }
        
        const url = `/api/shopify/productos/buscar?q=${encodeURIComponent(search)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            renderProductosModal(data.data);
        }
    } catch (error) {
        console.error('Error cargando productos para modal:', error);
    }
}

// Renderizar productos en modal
function renderProductosModal(productos) {
    const container = document.getElementById('productos-modal-container');
    
    if (!productos || productos.length === 0) {
        const searchValue = document.getElementById('searchProductosModal')?.value || '';
        if (!searchValue.trim()) {
            container.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="fas fa-search fa-3x mb-3"></i>
                    <h5>Buscar Productos</h5>
                    <p>Escribe el nombre o código del producto para buscar</p>
                </div>
            `;
        } else {
            container.innerHTML = '<div class="alert alert-info">No se encontraron productos con esa búsqueda.</div>';
        }
        return;
    }
    
    let html = `
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Seleccionar</th>
                        <th>Imagen</th>
                        <th>Producto</th>
                        <th>Precio</th>
                        <th>Stock</th>
                        <th>Cantidad</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    productos.forEach(producto => {
        const hasVariants = producto.variants && producto.variants.length > 1;
        // Verificar si hay alguna variante de este producto seleccionada
        const productosSeleccionadosDeEste = productosSeleccionados.filter(p => p.producto_shopify_id === producto.id);
        const isSelected = productosSeleccionadosDeEste.length > 0;
        // Para mostrar en el select, usar la primera variante seleccionada (si hay múltiples)
        const productoSeleccionado = productosSeleccionadosDeEste[0] || null;
        const cantidadSeleccionada = productoSeleccionado?.cantidad || 1;
        const variantIdSeleccionado = productoSeleccionado?.variant_id || null;
        
        // Si tiene variantes, mostrar selector de variantes
        let variantSelector = '';
        if (hasVariants) {
            variantSelector = `
                <select class="form-select form-select-sm" id="variant-select-${producto.id}" 
                        onchange="actualizarVariantSeleccionado(${producto.id}, this.value)" 
                        style="width: 200px;">
                    <option value="">Selecciona una opción</option>
                    ${producto.variants.map(variant => `
                        <option value="${variant.id}" 
                                data-price="${variant.price}"
                                ${variantIdSeleccionado == variant.id ? 'selected' : ''}>
                            ${variant.title} - $${variant.price}
                            ${variant.inventory_quantity !== undefined ? ` (Stock: ${variant.inventory_quantity})` : ''}
                        </option>
                    `).join('')}
                </select>
            `;
        }
        
        html += `
            <tr>
                <td>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="${producto.id}" 
                               id="producto-${producto.id}" ${isSelected ? 'checked' : ''}
                               onchange="toggleProductoSeleccionado(${producto.id}, '${producto.title}', ${producto.price}, ${hasVariants ? 'true' : 'false'})">
                    </div>
                </td>
                <td>
                    <img src="${producto.image || '/images/logo.png'}" class="img-thumbnail" style="width: 50px; height: 50px; object-fit: cover;">
                </td>
                <td>
                    <strong>${producto.title}</strong><br>
                    <small class="text-muted">ID: ${producto.id}</small>
                    ${hasVariants ? `<br><small class="text-warning"><i class="fas fa-info-circle"></i> Producto con variantes</small>` : ''}
                </td>
                <td>
                    ${hasVariants && isSelected && variantIdSeleccionado ? 
                        `$${productoSeleccionado.precio || producto.price}` : 
                        `$${producto.price}`}
                    ${productosSeleccionadosDeEste.length > 1 ? 
                        `<br><small class="text-info"><i class="fas fa-info-circle"></i> ${productosSeleccionadosDeEste.length} variantes seleccionadas</small>` : ''}
                </td>
                <td>
                    ${hasVariants ? variantSelector : '<span class="badge bg-success">Disponible</span>'}
                </td>
                <td>
                    ${isSelected && productoSeleccionado ? `
                        <input type="number" class="form-control form-control-sm" 
                               value="${cantidadSeleccionada}"
                               min="1" style="width: 80px;" 
                               onchange="actualizarCantidad(${producto.id}, this.value, ${productoSeleccionado.variant_id !== null && productoSeleccionado.variant_id !== undefined ? productoSeleccionado.variant_id : 'null'})">
                    ` : '-'}
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

// Toggle producto seleccionado
function toggleProductoSeleccionado(id, title, price, hasVariants = false) {
        // Si tiene variantes, requerir selección de variante
        if (hasVariants) {
            mostrarNotificacion('Por favor selecciona una variante del producto antes de agregarlo', 'warning');
            // Desmarcar el checkbox
            const checkbox = document.getElementById(`producto-${id}`);
            if (checkbox) {
                checkbox.checked = false;
            }
            return;
        }
        
    // Para productos sin variantes, buscar por producto_shopify_id y variant_id null
    const index = productosSeleccionados.findIndex(p => 
        p.producto_shopify_id === id && (p.variant_id === null || p.variant_id === undefined)
    );
    
    if (index > -1) {
        productosSeleccionados.splice(index, 1);
    } else {
        productosSeleccionados.push({
            producto_shopify_id: id,
            variant_id: null,
            nombre_producto: title,
            precio: price,
            cantidad: 1,
            orden: productosSeleccionados.length + 1
        });
    }
    
    // Actualizar la interfaz
    actualizarProductosSeleccionados();
    
    // Recargar productos para mostrar/ocultar campos de cantidad y variantes
    cargarProductosModal(document.getElementById('searchProductosModal')?.value || '');
}

// Actualizar variante seleccionada
function actualizarVariantSeleccionado(productoId, variantId) {
    if (!variantId || variantId === '') {
        // Si se deselecciona la variante, no hacer nada (permitir que otras variantes sigan seleccionadas)
        // Solo actualizar la interfaz
        actualizarProductosSeleccionados();
        cargarProductosModal(document.getElementById('searchProductosModal')?.value || '');
        return;
    }
    
    // Buscar el producto en la lista de productos cargados para obtener su información
    const productosContainer = document.getElementById('productos-modal-container');
    const productoRow = productosContainer?.querySelector(`tr:has(#producto-${productoId})`);
    if (!productoRow) {
        console.error('No se encontró el producto en el DOM');
        return;
    }
    
    // Obtener información de la variante del select
    const select = document.getElementById(`variant-select-${productoId}`);
    const option = select?.options[select.selectedIndex];
    if (!option) {
        console.error('No se encontró la opción seleccionada');
        return;
    }
    
    const variantPrice = parseFloat(option.dataset.price) || 0;
    const variantTitle = option.textContent.split(' - ')[0];
    const variantIdNum = parseInt(variantId);
    
    // Buscar el producto con esta combinación específica de producto_shopify_id Y variant_id
    let producto = productosSeleccionados.find(p => 
        p.producto_shopify_id === productoId && p.variant_id === variantIdNum
    );
    
    if (!producto) {
        // Si no existe esta combinación, agregar como nuevo producto (permitir múltiples variantes del mismo producto)
        // Necesitamos obtener el título del producto desde el DOM
        const productoTitleElement = productoRow.querySelector('td:nth-child(3) strong');
        const productoTitle = productoTitleElement?.textContent || 'Producto';
        
        producto = {
            producto_shopify_id: productoId,
            variant_id: variantIdNum,
            nombre_producto: `${productoTitle} - ${variantTitle}`,
            precio: variantPrice,
            cantidad: 1,
            orden: productosSeleccionados.length + 1
        };
        productosSeleccionados.push(producto);
        
        // Marcar el checkbox
        const checkbox = document.getElementById(`producto-${productoId}`);
        if (checkbox) {
            checkbox.checked = true;
        }
        
        console.log('✅ Nueva variante agregada (mismo producto, diferente variante):', {
            producto_shopify_id: producto.producto_shopify_id,
            variant_id: producto.variant_id,
            nombre_producto: producto.nombre_producto
        });
    } else {
        // Si ya existe esta combinación exacta, actualizar precio y nombre (por si cambió)
        producto.precio = variantPrice;
        const productoTitleElement = productoRow.querySelector('td:nth-child(3) strong');
        const productoTitle = productoTitleElement?.textContent || producto.nombre_producto.split(' - ')[0];
        producto.nombre_producto = `${productoTitle} - ${variantTitle}`;
        
        console.log('✅ Variante existente actualizada:', {
            producto_shopify_id: producto.producto_shopify_id,
            variant_id: producto.variant_id,
            nombre_producto: producto.nombre_producto
        });
    }
    
    // Actualizar la interfaz
    actualizarProductosSeleccionados();
    
    // Recargar productos para mostrar el precio actualizado
    cargarProductosModal(document.getElementById('searchProductosModal')?.value || '');
}

// Actualizar cantidad - ahora recibe también variant_id para identificar correctamente el producto
function actualizarCantidad(id, cantidad, variantId = null) {
    // Buscar por producto_shopify_id y variant_id (si se proporciona)
    const producto = productosSeleccionados.find(p => {
        if (variantId !== null && variantId !== undefined) {
            return p.producto_shopify_id === id && p.variant_id === parseInt(variantId);
        } else {
            return p.producto_shopify_id === id && (p.variant_id === null || p.variant_id === undefined);
        }
    });
    
    if (producto) {
        producto.cantidad = parseInt(cantidad);
    }
    actualizarProductosSeleccionados();
}

// Actualizar interfaz de productos seleccionados
function actualizarProductosSeleccionados() {
    const section = document.getElementById('productos-seleccionados-section');
    const container = document.getElementById('productos-seleccionados-container');
    const contador = document.getElementById('contador-productos');
    const contadorFooter = document.getElementById('contador-footer');
    const btnGuardar = document.getElementById('btn-guardar-productos');
    
    if (productosSeleccionados.length === 0) {
        section.style.display = 'none';
        btnGuardar.disabled = true;
        contadorFooter.textContent = '0';
        return;
    }
    
    section.style.display = 'block';
    btnGuardar.disabled = false;
    contador.textContent = productosSeleccionados.length;
    contadorFooter.textContent = productosSeleccionados.length;
    
    let html = `
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
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
    
    productosSeleccionados.forEach((producto, index) => {
        const total = producto.precio * producto.cantidad;
        const variantIdParam = producto.variant_id !== null && producto.variant_id !== undefined 
            ? producto.variant_id 
            : 'null';
        html += `
            <tr>
                <td>
                    <strong>${producto.nombre_producto}</strong><br>
                    <small class="text-muted">ID: ${producto.producto_shopify_id}${producto.variant_id ? ` | Variante: ${producto.variant_id}` : ''}</small>
                </td>
                <td>$${producto.precio}</td>
                <td>
                    <input type="number" class="form-control form-control-sm" 
                           value="${producto.cantidad}" min="1" style="width: 80px;" 
                           onchange="actualizarCantidad(${producto.producto_shopify_id}, this.value, ${variantIdParam})">
                </td>
                <td>$${total}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="removerProductoSeleccionado(${producto.producto_shopify_id}, ${variantIdParam})">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

// Remover producto seleccionado - ahora recibe también variant_id para identificar correctamente
function removerProductoSeleccionado(id, variantId = null) {
    // Buscar por producto_shopify_id y variant_id (si se proporciona)
    const index = productosSeleccionados.findIndex(p => {
        if (variantId !== null && variantId !== undefined) {
            return p.producto_shopify_id === id && p.variant_id === parseInt(variantId);
        } else {
            return p.producto_shopify_id === id && (p.variant_id === null || p.variant_id === undefined);
        }
    });
    
    if (index > -1) {
        productosSeleccionados.splice(index, 1);
        actualizarProductosSeleccionados();
        cargarProductosModal(document.getElementById('searchProductosModal')?.value || '');
        
        // Si el producto tiene variantes, desmarcar el checkbox solo si no quedan más variantes seleccionadas
        const quedanVariantes = productosSeleccionados.some(p => p.producto_shopify_id === id);
        if (!quedanVariantes) {
            const checkbox = document.getElementById(`producto-${id}`);
            if (checkbox) {
                checkbox.checked = false;
            }
        }
    }
}

// Volver a cursos del colegio
async function volverACursos(nombre, region, comuna) {
    try {
        const response = await fetch(`/api/listas?colegio=${encodeURIComponent(nombre)}&region=${encodeURIComponent(region)}&comuna=${encodeURIComponent(comuna)}`);
        const data = await response.json();
        
        if (data.success) {
            // Cerrar modal actual
            const modalActual = document.getElementById('modalDetallesLista');
            if (modalActual) {
                const bsModal = bootstrap.Modal.getInstance(modalActual);
                if (bsModal) {
                    bsModal.hide();
                }
            }
            
            // Mostrar modal de cursos
            mostrarModalCursos(nombre, data.data);
        }
    } catch (error) {
        console.error('Error volviendo a cursos:', error);
        mostrarNotificacion('Error cargando cursos', 'error');
    }
}

// Manejar búsqueda de productos
function buscarProductos() {
    const searchValue = document.getElementById('searchProductosModal').value;
    
    // Limpiar timeout anterior
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Si la búsqueda tiene menos de 2 caracteres, no buscar
    if (searchValue.trim().length < 2) {
        cargarProductosModal('');
        return;
    }
    
    // Esperar 500ms antes de buscar
    searchTimeout = setTimeout(() => {
        cargarProductosModal(searchValue);
    }, 500);
}

// Mostrar modal nueva lista
async function mostrarModalNuevaLista() {
    await cargarRegiones();
    await cargarNivelesEducativos();
    
    // Limpiar coincidencias y formulario
    document.getElementById('coincidencias-colegios').style.display = 'none';
    document.getElementById('nombreColegio').value = '';
    document.getElementById('formNuevaLista').reset();
    
    const modal = new bootstrap.Modal(document.getElementById('modalNuevaLista'));
    modal.show();
}

// Cargar niveles educativos
async function cargarNivelesEducativos() {
    try {
        const response = await fetch('/api/chile/niveles');
        const data = await response.json();
        
        if (data.success) {
            const selectNivel = document.getElementById('nivel');
            selectNivel.innerHTML = '<option value="">Selecciona un nivel</option>';
            
            data.data.forEach(nivel => {
                selectNivel.innerHTML += `<option value="${nivel.nombre}">${nivel.nombre}</option>`;
            });
        }
    } catch (error) {
        console.error('Error cargando niveles educativos:', error);
    }
}

// Crear nuevo curso
async function crearNuevoCurso() {
    const nombre = document.getElementById('nombreColegioCurso').value;
    const region = document.getElementById('regionCurso').value;
    const comuna = document.getElementById('comunaCurso').value;
    const nivel = document.getElementById('nivelCurso').value;
    
    if (!nombre || !region || !comuna || !nivel) {
        mostrarNotificacion('Todos los campos son requeridos', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/listas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre_colegio: nombre,
                region: region,
                comuna: comuna,
                nivel: nivel
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacion('Curso creado exitosamente', 'success');
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalNuevoCurso'));
            modal.hide();
            
            // Recargar listas
            cargarTodasLasListas();
        } else {
            mostrarNotificacion(data.message || 'Error creando curso', 'error');
        }
    } catch (error) {
        console.error('Error creando curso:', error);
        mostrarNotificacion('Error creando curso', 'error');
    }
}

// Crear lista
async function crearLista() {
    const nombreColegio = document.getElementById('nombreColegio').value;
    const region = document.getElementById('region').value;
    const comuna = document.getElementById('comuna').value;
    const nivel = document.getElementById('nivel').value;
    const siglaCurso = document.getElementById('siglaCurso').value;
    
    if (!nombreColegio || !region || !comuna || !nivel) {
        mostrarNotificacion('Por favor completa todos los campos obligatorios', 'error');
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
                nivel: nivel,
                sigla_curso: siglaCurso || null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacion('Lista creada exitosamente', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalNuevaLista')).hide();
            document.getElementById('formNuevaLista').reset();
            cargarTodasLasListas();
        } else {
            mostrarNotificacion(data.error || 'Error creando lista', 'error');
        }
    } catch (error) {
        console.error('Error creando lista:', error);
        mostrarNotificacion('Error creando lista', 'error');
    }
}

// Agregar productos a lista
function agregarProductos(listaId) {
    currentListaId = listaId;
    productosSeleccionados = [];
    
    // Cerrar todos los modales abiertos
    const modalesAbiertos = document.querySelectorAll('.modal.show');
    modalesAbiertos.forEach(modal => {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) {
            bsModal.hide();
        }
    });
    
    // Mostrar modal de productos después de un delay
    setTimeout(() => {
        const modal = new bootstrap.Modal(document.getElementById('modalProductos'));
        modal.show();
        
        // Inicializar interfaz
        actualizarProductosSeleccionados();
        cargarProductosModal();
        
        // Limpiar búsqueda
        document.getElementById('searchProductosModal').value = '';
    }, 500);
}

// Guardar productos a lista
async function guardarProductosLista() {
    if (!currentListaId || productosSeleccionados.length === 0) {
        mostrarNotificacion('Selecciona al menos un producto', 'error');
        return;
    }
    
    try {
        console.log('📤 Enviando productos al servidor:', productosSeleccionados.map(p => ({
            producto_shopify_id: p.producto_shopify_id,
            variant_id: p.variant_id,
            nombre_producto: p.nombre_producto
        })));
        
        const response = await fetch(`/api/listas/${currentListaId}/productos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productos: productosSeleccionados
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacion('Productos agregados exitosamente', 'success');
            
            // Cerrar modal de productos y limpiar backdrop
            const modalProductos = bootstrap.Modal.getInstance(document.getElementById('modalProductos'));
            modalProductos.hide();
            
            // Remover backdrop manualmente para evitar problemas de opacidad
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            
            // Limpiar productos seleccionados
            productosSeleccionados = [];
            actualizarProductosSeleccionados();
            
            // Recargar la lista y volver a abrir el modal de detalles
            setTimeout(async () => {
                try {
                    const listaResponse = await fetch(`/api/listas/${currentListaId}`);
                    const listaData = await listaResponse.json();
                    
                    if (listaData.success) {
                        mostrarModalDetallesLista(listaData.data);
                        
                        // Si venimos del modal de cursos, volver a abrirlo
                        if (currentColegioId && currentColegioId.nombre && currentColegioId.region && currentColegioId.comuna) {
                            setTimeout(() => {
                                verColegio(currentColegioId.nombre, currentColegioId.region, currentColegioId.comuna);
                            }, 100);
                        }
                    }
                } catch (error) {
                    console.error('Error recargando lista:', error);
                }
            }, 300);
            
            cargarTodasLasListas();
        } else {
            mostrarNotificacion(data.error || 'Error agregando productos', 'error');
        }
    } catch (error) {
        console.error('Error agregando productos:', error);
        mostrarNotificacion('Error agregando productos', 'error');
    }
}

// Ver lista
async function verLista(listaId) {
    try {
        const response = await fetch(`/api/listas/${listaId}`);
        const data = await response.json();
        
        if (data.success) {
            mostrarModalDetallesLista(data.data);
        }
    } catch (error) {
        console.error('Error cargando lista:', error);
        mostrarNotificacion('Error cargando lista', 'error');
    }
}

// Mostrar modal con detalles de la lista
async function mostrarModalDetallesLista(lista) {
    let productosHtml = '';
    let totalGeneral = 0;
    
    if (lista.productos && lista.productos.length > 0) {
        // Verificar disponibilidad de productos
        await verificarDisponibilidadProductos(lista.productos, 'admin');
        
        lista.productos.forEach(producto => {
            const precioUnitario = parseFloat(producto.precio) || 0;
            const cantidad = parseInt(producto.cantidad) || 0;
            const totalProducto = precioUnitario * cantidad;
            totalGeneral += totalProducto;
            
            const imagenSrc = producto.imagen || '/images/logo.png';
            const disponibilidad = producto.disponibilidad || 'Verificando...';
            
            productosHtml += `
                <tr>
                    <td>
                        <img src="${imagenSrc}" alt="${producto.nombre_producto}" 
                             style="width: 50px; height: 50px; object-fit: cover;" 
                             class="rounded">
                    </td>
                    <td>
                        <strong>${producto.nombre_producto}</strong><br>
                        <small class="text-muted">ID Shopify: ${producto.producto_shopify_id || 'N/A'}</small>
                    </td>
                    <td class="text-center">
                        <span class="badge bg-primary">${cantidad}</span>
                    </td>
                    <td class="text-end">$${precioUnitario.toLocaleString('es-CL')}</td>
                    <td class="text-end">
                        <strong>$${totalProducto.toLocaleString('es-CL')}</strong>
                    </td>
                    <td class="text-center">
                        <span class="badge ${disponibilidad.includes('Error') ? 'bg-danger' : disponibilidad === 'Verificando...' ? 'bg-warning' : 'bg-success'}">
                            ${disponibilidad}
                        </span>
                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="eliminarProductoDeLista(${lista.id}, ${producto.id})" 
                                title="Eliminar producto">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } else {
        productosHtml = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-inbox fa-2x mb-2"></i><br>
                    No hay productos en esta lista
                </td>
            </tr>
        `;
    }
    
    const modalHtml = `
        <div class="modal fade" id="modalDetallesLista" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-list me-2"></i>
                            ${lista.nombre_colegio} - ${lista.nivel_completo || lista.nivel}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-3">
                            <div class="col-md-4">
                                <strong>Colegio:</strong> ${lista.nombre_colegio}
                            </div>
                            <div class="col-md-4">
                                <strong>Región:</strong> ${lista.region}
                            </div>
                            <div class="col-md-4">
                                <strong>Comuna:</strong> ${lista.comuna}
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-4">
                                <strong>Nivel:</strong> ${lista.nivel_completo || lista.nivel}
                            </div>
                            <div class="col-md-4">
                                <strong>Total Productos:</strong> ${lista.productos?.length || 0}
                            </div>
                            <div class="col-md-4">
                                <strong>Total General:</strong> 
                                <span class="text-success fw-bold">$${totalGeneral.toLocaleString('es-CL')}</span>
                            </div>
                        </div>
                        
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Imagen</th>
                                        <th>Producto</th>
                                        <th class="text-center">Cantidad</th>
                                        <th class="text-end">Precio Unit.</th>
                                        <th class="text-end">Total</th>
                                        <th class="text-center">Stock</th>
                                        <th class="text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${productosHtml}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="text-end mt-3">
                            <small class="text-muted">*Valor no incluye gastos de envío e impuestos.</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" onclick="volverACursos('${lista.nombre_colegio}', '${lista.region}', '${lista.comuna}')">
                            <i class="fas fa-arrow-left me-2"></i>Volver a Cursos
                        </button>
                        <div>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            <button type="button" class="btn btn-success" onclick="agregarProductos(${lista.id})">
                                <i class="fas fa-plus me-2"></i>Agregar Productos
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remover modal anterior si existe
    const modalAnterior = document.getElementById('modalDetallesLista');
    if (modalAnterior) {
        modalAnterior.remove();
    }
    
    // Agregar nuevo modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modalDetallesLista'));
    modal.show();
}

// Verificar disponibilidad de productos
async function verificarDisponibilidadProductos(productos, modo = 'admin') {
    const stockPromises = productos.map(async (producto) => {
        try {
            // Limpiar ID del producto
            let productId = producto.producto_shopify_id;
            
            // Verificar que el ID sea válido
            if (!productId || productId === 'undefined' || productId === 'null') {
                producto.disponibilidad = 'ID de producto inválido';
                return;
            }
            
            if (typeof productId === 'string' && productId.includes('.')) {
                productId = productId.split('.')[0];
            }
            
            if (typeof productId === 'string') {
                const parsedId = parseInt(productId, 10);
                if (isNaN(parsedId)) {
                    producto.disponibilidad = 'ID de producto inválido';
                    return;
                }
                productId = parsedId;
            }
            
            const response = await fetch(`/api/shopify/productos/${productId}`);
            
            // Verificar si la respuesta es HTML (error 404)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                producto.disponibilidad = 'Producto no encontrado en Shopify';
                return;
            }
            
            const data = await response.json();
            
            if (data.success && data.data.variants && data.data.variants.length > 0) {
                const stock = data.data.variants[0].inventory_quantity || 0;
                const cantidad = parseInt(producto.cantidad) || 1;
                const disponible = stock >= cantidad;
                
                if (modo === 'admin') {
                    // Para admin: mostrar cantidad exacta
                    producto.disponibilidad = `Stock: ${stock}`;
                } else {
                    // Para cliente: solo disponible/no disponible
                    producto.disponibilidad = disponible ? 'Disponible' : 'No disponible';
                }
            } else if (data.success && data.data) {
                // Producto existe pero no tiene variantes
                producto.disponibilidad = 'Sin stock disponible';
            } else {
                producto.disponibilidad = 'Producto no encontrado';
            }
        } catch (error) {
            console.error('Error verificando stock:', error);
            producto.disponibilidad = 'Error al verificar';
        }
    });
    
    await Promise.all(stockPromises);
}

// Eliminar producto de la lista
async function eliminarProductoDeLista(listaId, productoId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto de la lista?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/listas/${listaId}/productos/${productoId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacion('Producto eliminado de la lista', 'success');
            // Recargar el modal de detalles
            const lista = await fetch(`/api/listas/${listaId}`).then(r => r.json());
            if (lista.success) {
                mostrarModalDetallesLista(lista.data);
            }
        } else {
            mostrarNotificacion(data.message || 'Error eliminando producto', 'error');
        }
    } catch (error) {
        console.error('Error eliminando producto:', error);
        mostrarNotificacion('Error eliminando producto', 'error');
    }
}

// Editar lista
function editarLista(listaId) {
    // Implementar edición de lista
    mostrarNotificacion('Funcionalidad en desarrollo', 'info');
}

// Eliminar lista
async function eliminarLista(listaId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta lista?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/listas/${listaId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacion('Lista eliminada exitosamente', 'success');
            cargarTodasLasListas();
        } else {
            mostrarNotificacion(data.error || 'Error eliminando lista', 'error');
        }
    } catch (error) {
        console.error('Error eliminando lista:', error);
        mostrarNotificacion('Error eliminando lista', 'error');
    }
}



// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear notificación Bootstrap
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${mensaje}
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
