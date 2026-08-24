import { useMemo, useState } from "react";
import { Package, Plus, Search, X } from "lucide-react";

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

function generateEAN13(existingBarcodes: string[]) {
  let barcode = "";

  do {
    const prefix = "890";
    const randomPart = Math.floor(
      100000000 + Math.random() * 900000000,
    ).toString();

    const first12 = `${prefix}${randomPart}`.slice(0, 12);

    let sum = 0;

    for (let i = 0; i < first12.length; i++) {
      const digit = Number(first12[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }

    const checkDigit = (10 - (sum % 10)) % 10;

    barcode = `${first12}${checkDigit}`;
  } while (existingBarcodes.includes(barcode));

  return barcode;
}

function generateSKU(existingProducts: Product[]) {
  const nextNumber = existingProducts.length + 1;

  return `PRD-${nextNumber.toString().padStart(4, "0")}`;
}

export function Inventory() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);

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

  const updateForm = (
    field: keyof ProductForm,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const addProduct = () => {
    const name = form.name.trim();
    const category = form.category.trim();
    const purchasePrice = Number(form.purchasePrice);
    const sellingPrice = Number(form.sellingPrice);
    const gstRate = Number(form.gstRate);
    const openingStock = Number(form.openingStock);
    const minStockLevel = Number(form.minStockLevel);

    if (!name) {
      alert("Please enter a product name.");
      return;
    }

    if (!category) {
      alert("Please enter a category.");
      return;
    }

    if (
      !Number.isFinite(purchasePrice) ||
      purchasePrice < 0
    ) {
      alert("Please enter a valid purchase price.");
      return;
    }

    if (
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0
    ) {
      alert("Please enter a valid selling price.");
      return;
    }

    if (
      !Number.isFinite(gstRate) ||
      gstRate < 0 ||
      gstRate > 100
    ) {
      alert("Please enter a valid GST rate.");
      return;
    }

    if (
      !Number.isInteger(openingStock) ||
      openingStock < 0
    ) {
      alert("Please enter a valid opening stock.");
      return;
    }

    if (
      !Number.isInteger(minStockLevel) ||
      minStockLevel < 0
    ) {
      alert("Please enter a valid minimum stock level.");
      return;
    }

    const barcode = generateEAN13(
      products.map((product) => product.barcode),
    );

    const sku = generateSKU(products);

    const newProduct: Product = {
      id: crypto.randomUUID(),
      name,
      sku,
      barcode,
      category,
      purchasePrice,
      sellingPrice,
      gstRate,
      currentStock: openingStock,
      minStockLevel,
    };

    setProducts((current) => [...current, newProduct]);
    setForm(emptyForm);
    setShowAddProduct(false);
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
          className="primary-button"
          type="button"
          onClick={() => setShowAddProduct(true)}
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      <div className="inventory-card">
        {filteredProducts.length === 0 ? (
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
              className="primary-button"
              type="button"
              onClick={() => setShowAddProduct(true)}
            >
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
                          product.currentStock <=
                          product.minStockLevel
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
            if (event.target === event.currentTarget) {
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

                <h2 id="add-product-title">
                  Add Product
                </h2>
              </div>

              <button
                className="modal-close"
                type="button"
                onClick={() => setShowAddProduct(false)}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

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
                  />
                </label>

                <label>
                  Category
                  <input
                    value={form.category}
                    onChange={(event) =>
                      updateForm(
                        "category",
                        event.target.value,
                      )
                    }
                    placeholder="e.g. Hair Care"
                  />
                </label>
              </div>

              <div className="form-section">
                <span className="form-section-title">
                  PRICING
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
                    A unique 13-digit EAN-13-compatible
                    barcode will be created when you save
                    this product.
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setShowAddProduct(false)}
              >
                Cancel
              </button>

              <button
                className="primary-button"
                type="button"
                onClick={addProduct}
              >
                Save Product
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
