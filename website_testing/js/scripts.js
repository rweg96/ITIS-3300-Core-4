(function () {
  'use strict';

  /* ----------------------------- Utilities ----------------------------- */
  class Dom {
    static $(sel, root = document) { return root.querySelector(sel); }
    static $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
    static make(tag, className = "", html = "") {
      const el = document.createElement(tag);
      if (className) el.className = className;
      if (html) el.innerHTML = html;
      return el;
    }
  }

  class Store {
    static getCart() {
      try { return JSON.parse(localStorage.getItem('cart')) || []; }
      catch { return []; }
    }
    static setCart(cart) { localStorage.setItem('cart', JSON.stringify(cart)); }
    static clearCart() { localStorage.removeItem('cart'); }
  }

  /* ------------------------------ Catalog ------------------------------ */
  class Catalog {
    static async load(csvPath = 'data/catalog.csv') {
      const grid = Dom.$('#catalog');
      if (!grid) return;

      try {
        const res = await fetch(csvPath);
        const text = await res.text();
        const lines = text.split('\n').slice(1);

        grid.innerHTML = '';
        const frag = document.createDocumentFragment();

        for (const line of lines) {
          if (!line.trim()) continue;
          const parts = line.split(',');
          const name = parts[0] ? parts[0].trim() : '';
          const price = parts[1] ? parts[1].trim() : '';
          const img = parts[2] ? parts[2].trim() : '';
          if (!name || !price || !img) continue;
          const p = parseFloat(price);
          if (isNaN(p)) continue;

          const col = Dom.make('div', 'col-md-3 col-sm-6 mb-4');
          col.innerHTML =
            '<div class="card shadow-sm h-100">' +
              '<img src="' + img + '" class="card-img-top" alt="' + name + '" onerror="this.src=\'images/default.jpg\';">' +
              '<div class="card-body text-center">' +
                '<h5>' + name + '</h5>' +
                '<p>$' + p.toFixed(2) + '</p>' +
                '<button class="btn btn-success btn-sm" data-action="add" data-name="' + name.replace(/"/g, '&quot;') + '" data-price="' + p + '">Add to Cart</button>' +
              '</div>' +
            '</div>';
          frag.appendChild(col);
        }

        grid.appendChild(frag);

        // one-time delegated handler
        if (!grid._boundAddHandler) {
          grid.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action="add"]');
            if (!btn) return;
            const name = btn.getAttribute('data-name');
            const price = parseFloat(btn.getAttribute('data-price'));
            Cart.add(name, price);
            UI.updateCartCount();
          });
          grid._boundAddHandler = true;
        }
      } catch (err) {
        console.log('Error loading products:', err);
      }
    }
  }

  /* -------------------------------- Cart -------------------------------- */
  class Cart {
    static add(name, price) {
      let cart = Store.getCart();
      let found = cart.find(i => i.name === name);
      if (found) found.quantity++;
      else cart.push({ name, price, quantity: 1 });
      Store.setCart(cart);
    }
    static changeQuantity(index, delta) {
      let cart = Store.getCart();
      if (!cart[index]) return;
      cart[index].quantity += delta;
      if (cart[index].quantity <= 0) cart.splice(index, 1);
      Store.setCart(cart);
    }
    static remove(index) {
      let cart = Store.getCart();
      cart.splice(index, 1);
      Store.setCart(cart);
    }
    static clear() { Store.clearCart(); }
    static count() { return Store.getCart().reduce((n, i) => n + i.quantity, 0); }
    static total() { return Store.getCart().reduce((s, i) => s + i.price * i.quantity, 0); }
    static items() { return Store.getCart(); }
  }

  /* --------------------------------- UI --------------------------------- */
  class UI {
    static updateCartCount() {
      const badge = Dom.$('#cart-count');
      if (badge) badge.textContent = Cart.count();
    }

    static renderCartTable(itemsId = 'cart-items', totalId = 'cart-total') {
      const tbody = Dom.$('#' + itemsId);
      const totalEl = Dom.$('#' + totalId);
      if (!tbody || !totalEl) return;

      const cart = Cart.items();
      tbody.innerHTML = '';
      let total = 0;

      cart.forEach((item, i) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const tr = Dom.make('tr');
        tr.innerHTML =
          '<td>' + item.name + '</td>' +
          '<td>' +
            '<button class="btn btn-sm btn-outline-secondary" data-action="dec" data-index="' + i + '">-</button> ' +
            item.quantity +
            ' <button class="btn btn-sm btn-outline-secondary" data-action="inc" data-index="' + i + '">+</button>' +
          '</td>' +
          '<td>$' + item.price.toFixed(2) + '</td>' +
          '<td>$' + itemTotal.toFixed(2) + '</td>' +
          '<td><button class="btn btn-danger btn-sm" data-action="remove" data-index="' + i + '">Remove</button></td>';
        tbody.appendChild(tr);
      });

      totalEl.textContent = total.toFixed(2);

      // delegate +/-/remove only once
      if (!tbody._boundCartHandler) {
        tbody.addEventListener('click', (e) => {
          const btn = e.target.closest('button[data-action]');
          if (!btn) return;
          const action = btn.getAttribute('data-action');
          const index = parseInt(btn.getAttribute('data-index'));
          if (Number.isNaN(index)) return;

          if (action === 'dec') Cart.changeQuantity(index, -1);
          else if (action === 'inc') Cart.changeQuantity(index, +1);
          else if (action === 'remove') Cart.remove(index);

          UI.renderCartTable(itemsId, totalId);
          UI.updateCartCount();
        });
        tbody._boundCartHandler = true;
      }
    }
  }

  /* -------------------------------- App --------------------------------- */
  class App {
    static init() {
      Catalog.load('data/catalog.csv');
      UI.updateCartCount();
      if (Dom.$('#cart-items')) {
        UI.renderCartTable('cart-items', 'cart-total');
      }

      // Clear cart buttons (if any elements with data-clear exist)
      Dom.$all('[data-clear-cart]').forEach(btn => {
        btn.addEventListener('click', () => {
          Cart.clear();
          UI.renderCartTable('cart-items', 'cart-total');
          UI.updateCartCount();
        });
      });
    }
  }

  window.addEventListener('DOMContentLoaded', App.init);
})();
