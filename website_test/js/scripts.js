
//====CATALOG====//
// load products from CSV file into the catalog
function loadProducts() {
  const catalog = document.getElementById('catalog');
  if (!catalog) return;

  fetch('data/catalog.csv')
    .then(res => res.text())
    .then(data => {
      const lines = data.split('\n').slice(1);
      catalog.innerHTML = '';

      lines.forEach(line => {
        if (!line.trim()) return;

        const parts = line.split(',');
        const name = parts[0] ? parts[0].trim() : '';
        const price = parts[1] ? parts[1].trim() : '';
        const img = parts[2] ? parts[2].trim() : '';

        if (!name || !price || !img) return;

        const p = parseFloat(price);
        if (isNaN(p)) return;

        const div = document.createElement('div');
        div.className = 'col-md-3 col-sm-6 mb-4';
        div.innerHTML =
          '<div class="card shadow-sm h-100">' +
            '<img src="' + img + '" class="card-img-top" alt="' + name + '" onerror="this.src=\'images/default.jpg\';">' +
            '<div class="card-body text-center">' +
              '<h5>' + name + '</h5>' +
              '<p>$' + p.toFixed(2) + '</p>' +
              '<button class="btn btn-success btn-sm" onclick="addToCart(\'' + name + '\',' + p + ')">Add to Cart</button>' +
            '</div>' +
          '</div>';
        catalog.appendChild(div);
      });
    })
    .catch(err => console.log('Error loading products:', err));
}

//====Add to the current cart ====//
function addToCart(name, price) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  
  let found = null;
  for (let i = 0; i < cart.length; i++) {
    if (cart[i].name === name) {
      found = cart[i];
      break;
    }
  }

  if (found) {
    found.quantity++;
  } else {
    cart.push({ name: name, price: price, quantity: 1 });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
}


//====Cart badge====//
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  let count = 0;
  cart.forEach(i => count += i.quantity);

  const badge = document.getElementById('cart-count');
  if (badge) badge.textContent = count;
}

//==== Cart page====//
function renderCartTable(itemsId, totalId) {
  const cartItems = document.getElementById(itemsId);
  const cartTotal = document.getElementById(totalId);
  const cart = JSON.parse(localStorage.getItem('cart')) || [];

  if (!cartItems || !cartTotal) return;

  cartItems.innerHTML = '';
  let total = 0;

  cart.forEach((item, i) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;

    const row = document.createElement('tr');
    row.innerHTML =
      '<td>' + item.name + '</td>' +
      '<td>' +
        '<button class="btn btn-sm btn-outline-secondary" onclick="changeQuantity(' + i + ', -1)">-</button> ' +
        item.quantity +
        ' <button class="btn btn-sm btn-outline-secondary" onclick="changeQuantity(' + i + ', 1)">+</button>' +
      '</td>' +
      '<td>$' + item.price.toFixed(2) + '</td>' +
      '<td>$' + itemTotal.toFixed(2) + '</td>' +
      '<td><button class="btn btn-danger btn-sm" onclick="removeItem(' + i + ')">Remove</button></td>';

    cartItems.appendChild(row);
  });

  cartTotal.textContent = total.toFixed(2);
  updateCartCount();
}

//====Cart management for items====//
function changeQuantity(index, num) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart[index].quantity += num;
  if (cart[index].quantity <= 0) cart.splice(index, 1);
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCartTable('cart-items', 'cart-total');
}

function removeItem(index) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart.splice(index, 1);
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCartTable('cart-items', 'cart-total');
}


function clearCart() {
  localStorage.removeItem('cart');
  renderCartTable('cart-items', 'cart-total');
}

//====page loads====//
window.onload = function() {
  loadProducts();
  updateCartCount();

  if (document.getElementById('cart-items')) {
    renderCartTable('cart-items', 'cart-total');
  }
};
