/**
 * Script para la página principal (www.bichoto.cl) que contiene el iframe de listas escolares.
 * Incluir en la página con: <script src="https://listas.bichoto.cl/cart-listener.js"></script>
 *
 * Cuando el iframe envía los productos (postMessage CART_ADD_ITEMS), este script
 * llama a /cart/add.js de la tienda y confirma al iframe SIN redirigir, permitiendo
 * agregar múltiples listas sin salir de la página.
 */
(function() {
  'use strict';
  if (typeof window === 'undefined') return;

  window.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'CART_ADD_ITEMS' || !e.data.items || !e.data.items.length) return;

    var items = e.data.items;
    var sourceWindow = e.source;
    var sourceOrigin = e.origin;
    
    console.log('[Listas] CART_ADD_ITEMS recibido,', items.length, 'items. Llamando /cart/add.js...');
    
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ items: items })
    })
    .then(function(r) {
      if (!r.ok) return r.json().then(function(data) { throw new Error(data.description || data.message || 'Error cart/add'); });
      return r.json();
    })
    .then(function(cartData) {
      console.log('[Listas] Productos agregados al carrito exitosamente');
      
      // Enviar confirmación al iframe (sin redirigir)
      if (sourceWindow && sourceWindow.postMessage) {
        sourceWindow.postMessage({
          type: 'CART_ADD_SUCCESS',
          items_added: items.length,
          cart: cartData
        }, sourceOrigin);
      }
      
      // Actualizar contador de carrito si existe (común en temas Shopify)
      if (typeof window.updateCartCount === 'function') {
        window.updateCartCount();
      } else if (cartData && cartData.item_count !== undefined) {
        // Buscar elementos comunes de contador de carrito
        var cartCountEls = document.querySelectorAll('[data-cart-count], .cart-count, #cart-count, .cart__count');
        cartCountEls.forEach(function(el) {
          el.textContent = cartData.item_count;
          el.style.display = cartData.item_count > 0 ? '' : 'none';
        });
      }
    })
    .catch(function(err) {
      console.error('[Listas] Error agregando al carrito:', err);
      
      // Enviar error al iframe
      if (sourceWindow && sourceWindow.postMessage) {
        sourceWindow.postMessage({
          type: 'CART_ADD_ERROR',
          error: err.message || 'Error desconocido'
        }, sourceOrigin);
      }
    });
  });
})();
