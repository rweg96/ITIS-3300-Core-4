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

    // generic helpers (used by account)
    static get(key, fallback = null) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    }
    static set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
    static remove(key) { localStorage.removeItem(key); }
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

  /* --------------------------- Account (View/Edit) --------------------------- */
  class UserAuth {
    static key = 'bb_user';
    static get() {
      try { return JSON.parse(localStorage.getItem(this.key)) || null; }
      catch { return null; }
    }
    static save(u)  { localStorage.setItem(this.key, JSON.stringify(u)); }
    static update(patch) {
      const u = this.get() || {};
      const next = { ...u, ...patch };
      this.save(next);
      return next;
    }
    static del()    { localStorage.removeItem(this.key); }
    static isLoggedIn() { return !!this.get(); }
  }

  class AccountPage {
    static form() { return Dom.$('#registerForm') || Dom.$('#accountForm'); }

    static populate() {
      const f = this.form(); if (!f) return;
      const u = UserAuth.get(); if (!u) return; // stay in "Create" mode if no user yet

      Dom.$('#fullName')?.setAttribute('value', u.fullName || '');  // optional; next lines set .value
      const setIf = (id, v) => { const el = Dom.$(id); if (el) el.value = v ?? ''; };
      setIf('#fullName', u.fullName);
      setIf('#email',    u.email);
      setIf('#password', u.password);
      setIf('#address',  u.address);
      setIf('#billing',  u.billing);

      const h = Dom.$('#accountHeading');
      if (h) h.textContent = 'Edit Account';
      const submit = f.querySelector('[type="submit"]');
      if (submit) submit.textContent = 'Save Changes';

      const del = Dom.$('#deleteAccount');
      if (del) del.classList.remove('d-none');
    }

    static bind() {
      const f = this.form(); if (!f) return;

      // show/hide delete button based on stored user
      const delBtn = Dom.$('#deleteAccount');
      if (delBtn) delBtn.classList.toggle('d-none', !UserAuth.get());

      // submit handler: create or update
      f.addEventListener('submit', (e) => {
        e.preventDefault();

        const val = (id) => Dom.$(id)?.value?.trim() || '';
        const fullName = val('#fullName');
        const email    = val('#email');
        const password = val('#password');
        const address  = val('#address');
        const billing  = val('#billing');

        if (!fullName || !email || !password) {
          alert('Name, email, and password are required.');
          return;
        }

        if (UserAuth.isLoggedIn()) {
          UserAuth.update({ fullName, email, password, address, billing });
          alert('Account updated.');
          NavbarUser.render();           
        } else {
          UserAuth.save({
            id: 'u-' + Math.random().toString(36).slice(2,8),
            fullName, email, password, address, billing
          });
          alert('Account created.');
          NavbarUser.render();           
          this.populate();               
        }
      });

      // delete account
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          if (!confirm('Delete your account? This cannot be undone.')) return;

          UserAuth.del();
          alert('Account deleted.');
          NavbarUser.render();           

          ['#fullName','#email','#password','#address','#billing'].forEach(sel => {
            const el = Dom.$(sel); if (el) el.value = '';
          });
          delBtn.classList.add('d-none');
          const h = Dom.$('#accountHeading'); if (h) h.textContent = 'Create Your Account';
          const submit = f.querySelector('[type="submit"]'); if (submit) submit.textContent = 'Create Account';
        });
      }
    }
  }

  /* ------------------------------ Navbar User ------------------------------ */
  class NavbarUser {
    static mount() {
      // Find right-side nav
      const navRight = document.querySelector('.navbar .navbar-nav.ms-auto');
      if (!navRight) return;

      // Create once
      if (!document.getElementById('nav-user-status')) {
        const li = document.createElement('li');
        li.id = 'nav-user-status';
        li.className = 'nav-item ms-2';
        li.innerHTML = '<span class="nav-link small"></span>';
        navRight.insertBefore(li, navRight.firstChild);
      }
      this.render();
    }

    static render() {
      const slot = document.querySelector('#nav-user-status .nav-link');
      if (!slot) return;
      const u = (typeof UserAuth !== 'undefined') ? UserAuth.get() : null;
      slot.textContent = (u && u.email) ? `Logged in as ${u.email}` : '';
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
      NavbarUser.mount();
      NavbarUser.render();

      // account page (view/edit)
      if (AccountPage.form()) { AccountPage.bind(); AccountPage.populate(); }

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
