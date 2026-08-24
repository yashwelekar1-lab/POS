import { useEffect, useMemo, useState } from "react";
import { Package, Plus, Search, X } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  gstRate: number;
  currentStock: number;
  minStockLevel: number;
};

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  gst_rate: number;
  current_stock: number;
  min_stock_level: number;
};

type ProductForm = {
  name: string;
  category: string;
  purchasePrice: string;
  sellingPrice: string;
  gstRate: string;
  openingStock: string;
  minStockLevel: string;
};

const emptyForm: ProductForm = {
  name: "",
  category: "",
  purchasePrice: "",
  sellingPrice: "",
  gstRate: "18",
  openingStock: "",
  minStockLevel: "",
};

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    category: row.category,
    purchasePrice: Number(row.purchase_price),
    sellingPrice: Number(row.selling_price),
    gstRate: Number(row.gst_rate),
    currentStock: Number(row.current_stock),
    minStockLevel: Number(row.min_stock_level),
  };
}

function calculateEAN13CheckDigit(first12: string) {
  let sum = 0;

  for (let i = 0; i < first12.length; i++) {
    const digit = Number(first12[i]);

    sum += i % 2 === 0 ? digit : digit * 3;
  }

  return (10 - (sum % 10)) % 10;
}

function generateEAN13() {
  const first12 =
    "890" +
    Math.floor(100000000 + Math.random() * 900000000)
      .toString()
      .slice(0, 9);

  const checkDigit = calculateEAN13CheckDigit(first12);

  return `${first12}${checkDigit}`;
}

function generateSKU() {
  const random = Math.floor(1000 + Math.random() * 9000);

  return `PRD-${Date.now().toString().slice(-6)}-${random}`;
}

export function Inventory() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return products;

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.barcode.includes(query) ||
        product.category.toLowerCase().includes(query),
    );
  }, [products, search]);

  const loadProducts = async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("products")
      .select(
        "id,name,sku,barcode,category,purchase_price,selling_price,gst_rate,current_stock,min_stock_level",
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setProducts((data as ProductRow[]).map(mapProduct));
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const updateForm = (
    field: keyof ProductForm,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const addProduct = async () => {
    setError("");

    const name = form.name.trim();
    const category = form.category.trim();
    const purchasePrice = Number(form.purchasePrice);
    const sellingPrice = Number(form.sellingPrice);
    const gstRate = Number(form.gstRate);
    const openingStock = Number(form.openingStock);
    const minStockLevel = Number(form.minStockLevel);

    if (!name) {
      setError("Please enter a product name.");
      return;
    }

    if (!category) {
      setError("Please enter a category.");
      return;
    }

    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
      setError("Please enter a valid purchase price.");
      return;
    }

    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      setError("Please enter a valid selling price.");
      return;
    }

    if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
      setError("Please enter a valid GST rate.");
      return;
    }

    if (!Number.isInteger(openingStock) || openingStock < 0) {
      setError("Please enter a valid opening stock.");
      return;
    }

    if (!Number.isInteger(minStockLevel) || minStockLevel < 0) {
      setError("Please enter a valid minimum stock level.");
      return;
    }

    setSaving(true);

    const sku = generateSKU();
    const barcode = generateEAN13();

    const { data, error: insertError } = await supabase
      .from("products")
      .insert({
        name,
        sku,
        barcode,
        category,
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        gst_rate: gstRate,
        current_stock: openingStock,
        min_stock_level: minStockLevel,
        is_active: true,
      })
      .select(
        "id,name,sku,barcode,category,purchase_price,selling_price,gst_rate,current_stock,min_stock_level",
      )
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setProducts((current) => [mapProduct(data as ProductRow), ...current]);

    setForm(emptyForm);
    setShowAddProduct(false);
    setSaving(false);
  };

  return (
    <section className="inventory-page">
      <div className="inventory-toolbar">
        <div className="search-input-wrapper">
          <Search size={18} />

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search product, SKU or barcode..."
          />
        </div>

        <div className="inventory-count">
          {filteredProducts.length} product
          {filteredProducts.length === 1 ? "" : "s"}
        </div>

        <button
  type="button"
  onClick={() => setShowAddProduct(true)}
  style={{
    background: "#111",
    color: "#fff",
    border: "none",
    padding: "14px 24px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    position: "relative",
    zIndex: 100,
  }}
>
  <Plus size={18} />
  Add Product
</button>
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {error && !showAddProduct && (
        <div className="error-message">{error}</div>
      )}

      <div className="inventory-card">
        {loading ? (
          <div className="empty-inventory">
            <div className="empty-icon">
              <Package size={30} />
            </div>

            <h3>Loading inventory</h3>

            <p>Connecting to your product database.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-inventory">
            <div className="empty-icon">
              <Package size={30} />
            </div>

            <h3>Your inventory is empty</h3>

            <p>
              Add your first product. Its SKU and EAN-13 barcode
              will be generated automatically.
            </p>

            <button
  type="button"
  onClick={() => setShowAddProduct(true)}
  style={{
    background: "#111",
    color: "#fff",
    border: "none",
    padding: "14px 24px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    position: "relative",
    zIndex: 100,
  }}
>
  <Plus size={18} />
  Add Your First Product
</button>
              <Plus size={18} />
              Add Your First Product
            </button>
          </div>
        ) : (
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Barcode</th>
                  <th>Category</th>
                  <th>Purchase</th>
                  <th>Selling</th>
                  <th>GST</th>
                  <th>Stock</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                    </td>

                    <td>{product.sku}</td>

                    <td>{product.barcode}</td>

                    <td>{product.category}</td>

                    <td>
                      ₹{product.purchasePrice.toFixed(2)}
                    </td>

                    <td>
                      ₹{product.sellingPrice.toFixed(2)}
                    </td>

                    <td>{product.gstRate}%</td>

                    <td>
                      <span
                        className={
                          product.currentStock <= product.minStockLevel
                            ? "stock-low"
                            : "stock-ok"
                        }
                      >
                        {product.currentStock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddProduct && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowAddProduct(false);
            }
          }}
        >
          <div
            className="product-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-product-title"
          >
            <div className="modal-header">
              <div>
                <span className="section-kicker">
                  INVENTORY
                </span>

                <h2 id="add-product-title">Add Product</h2>
              </div>

              <button
                className="modal-close"
                type="button"
                disabled={saving}
                onClick={() => setShowAddProduct(false)}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            {error && (
              <div className="error-message modal-error">
                {error}
              </div>
            )}

            <div className="product-form">
              <div className="form-section">
                <span className="form-section-title">
                  PRODUCT INFORMATION
                </span>

                <label>
                  Product name
                  <input
                    value={form.name}
                    onChange={(event) =>
                      updateForm("name", event.target.value)
                    }
                    placeholder="e.g. Herbal Shampoo"
                    disabled={saving}
                  />
                </label>

                <label>
                  Category
                  <input
                    value={form.category}
                    onChange={(event) =>
                      updateForm("category", event.target.value)
                    }
                    placeholder="e.g. Hair Care"
                    disabled={saving}
                  />
                </label>
              </div>

              <div className="form-section">
                <span className="form-section-title">
                  PRICING & STOCK
                </span>

                <div className="form-grid">
                  <label>
                    Purchase price
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.purchasePrice}
                      onChange={(event) =>
                        updateForm(
                          "purchasePrice",
                          event.target.value,
                        )
                      }
                      placeholder="0.00"
                      disabled={saving}
                    />
                  </label>

                  <label>
                    Selling price
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.sellingPrice}
                      onChange={(event) =>
                        updateForm(
                          "sellingPrice",
                          event.target.value,
                        )
                      }
                      placeholder="0.00"
                      disabled={saving}
                    />
                  </label>

                  <label>
                    GST %
                    <select
                      value={form.gstRate}
                      onChange={(event) =>
                        updateForm(
                          "gstRate",
                          event.target.value,
                        )
                      }
                      disabled={saving}
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </label>

                  <label>
                    Opening stock
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.openingStock}
                      onChange={(event) =>
                        updateForm(
                          "openingStock",
                          event.target.value,
                        )
                      }
                      placeholder="0"
                      disabled={saving}
                    />
                  </label>

                  <label>
                    Minimum stock
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.minStockLevel}
                      onChange={(event) =>
                        updateForm(
                          "minStockLevel",
                          event.target.value,
                        )
                      }
                      placeholder="0"
                      disabled={saving}
                    />
                  </label>
                </div>
              </div>

              <div className="barcode-notice">
                <div className="barcode-notice-mark">
                  EAN
                </div>

                <div>
                  <strong>
                    Barcode generated automatically
                  </strong>

                  <span>
                    A unique 13-digit EAN-13-compatible barcode
                    will be created when this product is saved.
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="secondary-button"
                type="button"
                disabled={saving}
                onClick={() => setShowAddProduct(false)}
              >
                Cancel
              </button>

              <button
                className="primary-button"
                type="button"
                disabled={saving}
                onClick={addProduct}
              >
                {saving ? "Saving..." : "Save Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
