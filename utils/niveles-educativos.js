// Niveles educativos de Chile
const nivelesEducativos = [
    {
        id: 1,
        nombre: "Sala Cuna Menor",
        categoria: "Educación Parvularia"
    },
    {
        id: 2,
        nombre: "Sala Cuna Mayor",
        categoria: "Educación Parvularia"
    },
    {
        id: 3,
        nombre: "Medio Menor",
        categoria: "Educación Parvularia"
    },
    {
        id: 4,
        nombre: "Medio Mayor",
        categoria: "Educación Parvularia"
    },
    {
        id: 5,
        nombre: "Pre-Kinder",
        categoria: "Educación Parvularia"
    },
    {
        id: 6,
        nombre: "Kinder",
        categoria: "Educación Parvularia"
    },
    {
        id: 7,
        nombre: "1° Básico",
        categoria: "Educación Básica"
    },
    {
        id: 8,
        nombre: "2° Básico",
        categoria: "Educación Básica"
    },
    {
        id: 9,
        nombre: "3° Básico",
        categoria: "Educación Básica"
    },
    {
        id: 10,
        nombre: "4° Básico",
        categoria: "Educación Básica"
    },
    {
        id: 11,
        nombre: "5° Básico",
        categoria: "Educación Básica"
    },
    {
        id: 12,
        nombre: "6° Básico",
        categoria: "Educación Básica"
    },
    {
        id: 13,
        nombre: "7° Básico",
        categoria: "Educación Básica"
    },
    {
        id: 14,
        nombre: "8° Básico",
        categoria: "Educación Básica"
    },
    {
        id: 15,
        nombre: "1° Medio",
        categoria: "Educación Media"
    },
    {
        id: 16,
        nombre: "2° Medio",
        categoria: "Educación Media"
    },
    {
        id: 17,
        nombre: "3° Medio",
        categoria: "Educación Media"
    },
    {
        id: 18,
        nombre: "4° Medio",
        categoria: "Educación Media"
    }
];

// Función para buscar niveles por término
function buscarNiveles(termino) {
    const terminoLower = termino.toLowerCase();
    return nivelesEducativos.filter(nivel => 
        nivel.nombre.toLowerCase().includes(terminoLower) ||
        nivel.categoria.toLowerCase().includes(terminoLower)
    );
}

// Función para obtener todos los niveles
function obtenerTodosLosNiveles() {
    return nivelesEducativos;
}

// Función para obtener niveles por categoría
function obtenerNivelesPorCategoria(categoria) {
    return nivelesEducativos.filter(nivel => 
        nivel.categoria.toLowerCase() === categoria.toLowerCase()
    );
}

// Función para obtener categorías disponibles
function obtenerCategorias() {
    const categorias = [...new Set(nivelesEducativos.map(nivel => nivel.categoria))];
    return categorias;
}

module.exports = {
    nivelesEducativos,
    buscarNiveles,
    obtenerTodosLosNiveles,
    obtenerNivelesPorCategoria,
    obtenerCategorias
};
