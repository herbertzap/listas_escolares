/**
 * Script para la página principal (www.bichoto.cl) que contiene el iframe de listas escolares.
 * Incluir en la página con: <script src="https://listas.bichoto.cl/cart-listener.js"></script>
 *
 * Cuando el iframe envía los productos (postMessage CART_ADD_ITEMS), este script
 * llama a /cart/add.js de la tienda y redirige a /cart.
 */
(function() {
  'use strict';
  if (typeof window === 'undefined') return;

  window.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'CART_ADD_ITEMS' || !e.data.items || !e.data.items.length) return;

    var items = e.data.items;
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
    .then(function() {
      window.location.href = '/cart';
    })
    .catch(function(err) {
      console.error('[Listas] Error agregando al carrito:', err);
      window.location.href = '/cart';
    });
  });
})();
