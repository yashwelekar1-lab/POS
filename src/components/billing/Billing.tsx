import { useMemo, useState } from "react";
import {
  Barcode,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";

type CartItem = {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
};

export function Billing() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const subtotal = useMemo(
    () => cart.reduce((total, item) => total + item.price * item.quantity, 0),
    [cart],
  );

  const totalItems = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart],
  );

  const updateQuantity = (id: string, change: number) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== id) return item;

          const quantity = item.quantity + change;

          return {
            ...item,
            quantity,
          };
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (id: string) => {
    setCart((current) => current.filter((item) => item.id !== id));
  };

  return (
    <section className="billing-page">
      <div className="page-heading">
        <div>
          <h2>Billing</h2>
          <p>Create a new bill and process the payment.</p>
        </div>

        <div className="bill-status">
          <span className="status-dot" />
          New Bill
        </div>
      </div>

      <div className="billing-layout">
        <div className="billing-products">
          <div className="search-panel">
            <div className="search-input-wrapper">
              <Search size={18} />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search product by name, SKU or barcode..."
              />
              {search && (
                <button
                  className="clear-search"
                  onClick={() => setSearch("")}
                  type="button"
                >
                  Clear
                </button>
              )}
            </div>

            <button className="scan-button" type="button">
              <Barcode size={19} />
              Scan
            </button>
          </div>

          <div className="product-area">
            <div className="empty-products">
              <div className="empty-icon">
                <ShoppingCart size={28} />
              </div>

              <h3>No products available</h3>

              <p>
                Add products from Inventory before creating a bill.
              </p>

              <span>
                Products added to Inventory will appear here automatically.
              </span>
            </div>
          </div>
        </div>

        <aside className="bill-panel">
          <div className="bill-panel-header">
            <div>
              <h3>Current Bill</h3>
              <p>
                {totalItems === 0
                  ? "No items added"
                  : `${totalItems} item${totalItems === 1 ? "" : "s"}`}
              </p>
            </div>

            <button
              className="clear-cart"
              type="button"
              disabled={cart.length === 0}
              onClick={() => setCart([])}
            >
              Clear
            </button>
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-cart">
                <ShoppingCart size={34} />
                <strong>Your cart is empty</strong>
                <span>
                  Select products from the left to add them to the bill.
                </span>
              </div>
            ) : (
              cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item-info">
                    <strong>{item.name}</strong>
                    <span>{item.sku}</span>
                    <b>₹{item.price.toFixed(2)}</b>
                  </div>

                  <div className="cart-item-actions">
                    <div className="quantity-control">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus size={14} />
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      className="remove-item"
                      type="button"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bill-summary">
            <div>
              <span>Items</span>
              <strong>{totalItems}</strong>
            </div>

            <div>
              <span>Subtotal</span>
              <strong>₹{subtotal.toFixed(2)}</strong>
            </div>

            <div>
              <span>Discount</span>
              <strong>₹0.00</strong>
            </div>

            <div>
              <span>GST</span>
              <strong>₹0.00</strong>
            </div>

            <div className="bill-total">
              <span>Total</span>
              <strong>₹{subtotal.toFixed(2)}</strong>
            </div>
          </div>

          <button
            className="payment-button"
            type="button"
            disabled={cart.length === 0}
          >
            Proceed to Payment
          </button>
        </aside>
      </div>
    </section>
  );
}
