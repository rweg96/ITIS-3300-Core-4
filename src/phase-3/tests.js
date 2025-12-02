function test(name, fn) {
  try {
    fn();
    console.log(`✔ PASS: ${name}`);
  } catch (err) {
    console.log(`✖ FAIL: ${name}`);
    console.error(err);
  }
}

// ---------------- Test environment ----------------

function makeStorage() {
  return {
    _s: {},
    getItem(k) { return this._s[k] ?? null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; },
    clear() { this._s = {}; }
  };
}

global.window = {
  addEventListener: () => {},          
  localStorage: makeStorage(),
  sessionStorage: makeStorage()
};

global.document = {
  addEventListener: () => {},         
};

global.localStorage = window.localStorage;
global.sessionStorage = window.sessionStorage;
global.alert = () => {};
global.confirm = () => true;
global.window.bootstrap = { Modal: class {} };

// ---------------- Load script ----------------
require('./js/scripts.js');

if (!window.__bbTest) {
  console.error("❌ window.__bbTest missing. Add the export snippet to scripts.js");
  process.exit(1);
}

const { Cart, Store, UserAuth, coupons } = window.__bbTest;

// Reset before each test
function reset() {
  localStorage.clear();
  sessionStorage.clear();
}

// ========================================================
//                         TESTS  
// ========================================================

// 1. Cart.add creates an item
test("Cart.add creates item", () => {
  reset();
  Cart.add("Milk", 3.00);
  const items = Cart.items();

  if (items.length !== 1) throw "Expected 1 item";
  if (items[0].name !== "Milk") throw "Wrong item name";
  if (items[0].quantity !== 1) throw "Quantity should be 1";
});

// 2. Cart.add increments quantity
test("Cart.add increments quantity", () => {
  reset();
  Cart.add("Apple", 1);
  Cart.add("Apple", 1);

  if (Cart.items()[0].quantity !== 2) throw "Quantity should be 2";
});

// 3. Cart.total calculates price * qty
test("Cart.total works", () => {
  reset();
  Cart.add("A", 2);   // 2
  Cart.add("A", 2);   // 4
  Cart.add("B", 3);   // 7

  if (Cart.total() !== 7) throw "Total should be 7";
});

// 4. Store.set/get
test("Store.set/get works", () => {
  reset();
  Store.set("x", { a: 1 });
  if (Store.get("x").a !== 1) throw "Store.get did not return correct value";
});

// 5. UserAuth.save/get
test("UserAuth.save/get user", () => {
  reset();
  const u = { email: "test@example.com" };
  UserAuth.save(u);
  const got = UserAuth.get();

  if (got.email !== "test@example.com") throw "Email mismatch";
});

// 6. UserAuth.update merges fields
test("UserAuth.update merges fields", () => {
  reset();
  UserAuth.save({ email: "old@example.com", rewards: 0 });
  UserAuth.update({ rewards: 10 });

  const u = UserAuth.get();
  if (u.rewards !== 10) throw "Rewards not updated";
  if (u.email !== "old@example.com") throw "Email should not change";
});

// 7. Login/logout session
test("UserAuth login/logout", () => {
  reset();
  UserAuth.login();
  if (!UserAuth.isSessionActive()) throw "Should be active";

  UserAuth.logout();
  if (UserAuth.isSessionActive()) throw "Should NOT be active";
});

// 8. Coupons test
test("Coupons includes SAVE10", () => {
  const c = coupons.find(c => c.code === "SAVE10");
  if (!c) throw "SAVE10 missing";
  if (c.discount !== 0.10) throw "SAVE10 discount should be 0.10";
});