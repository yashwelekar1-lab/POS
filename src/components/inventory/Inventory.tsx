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

function calculateEAN13CheckDigit(first12: string): number {
  let sum = 0;

  for (let i = 0; i < 12; i++) {
    const digit = Number(first12[i]);

    sum += i % 2 === 0 ? digit : digit * 3;
  }

  return (10 - (sum % 10)) % 10;
}

function generateEAN13(): string {
  const first12 =
    "890" +
    Math.floor(100000000 + Math.random() * 900000000)
      .toString()
      .slice(0, 9);

  const checkDigit = calculateEAN13CheckDigit(first12);

  return `${first12}${checkDigit}`;
}

function generateSKU(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(1000 + Math.random() * 9000);

  return `PRD-${timestamp}-${random}`;
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

    if (!query) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.barcode.includes(query) ||
        product.category.toLowerCase().includes(query)
      );
    });
  }, [products, search]);

  const loadProducts = async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("products")
      .select(
        "id,name,sku,barcode,category,purchase_price,selling_price,gst_rate,current_stock,min_stock_level"
      )
      .eq("is_active", true)
      .order("created_at", {
        ascending: false,
      });

    if (fetchError) {
      console.error("Inventory load error:", fetchError);
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setProducts(
      ((data || []) as ProductRow[]).map(mapProduct)
    );

    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openAddProduct = () => {
    setError("");
    setForm(emptyForm);
    setShowAddProduct(true);
  };

  const closeAddProduct = () => {
    if (saving) {
      return;
    }

    setShowAddProduct(false);
    setError("");
    setForm(emptyForm);
  };

  const updateForm = (
    field: keyof ProductForm,
    value: string
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

    if (
      !Number.isFinite(purchasePrice) ||
      purchasePrice < 0
    ) {
      setError("Please enter a valid purchase price.");
      return;
    }

    if (
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0
    ) {
      setError("Please enter a valid selling price.");
      return;
    }

    if (
      !Number.isFinite(gstRate) ||
      gstRate < 0 ||
      gstRate > 100
    ) {
      setError("Please enter a valid GST rate.");
      return;
    }

    if (
      !Number.isInteger(openingStock) ||
      openingStock < 0
    ) {
      setError("Please enter a valid opening stock.");
      return;
    }

    if (
      !Number.isInteger(minStockLevel) ||
      minStockLevel < 0
    ) {
      setError("Please enter a valid minimum stock level.");
      return;
    }

    if (sellingPrice < purchasePrice) {
      setError(
        "Selling price cannot be lower than purchase price."
      );
      return;
    }

    setSaving(true);

    try {
      let sku = generateSKU();
      let barcode = generateEAN13();

      /*
       * Make sure the automatically generated SKU and
       * barcode do not already exist.
       */
      let attempts = 0;

      while (attempts < 10) {
        const { data: existingSku } = await supabase
          .from("products")
          .select("id")
          .eq("sku", sku)
          .maybeSingle();

        const { data: existingBarcode } = await supabase
          .from("products")
          .select("id")
          .eq("barcode", barcode)
          .maybeSingle();

        if (!existingSku && !existingBarcode) {
          break;
        }

        sku = generateSKU();
        barcode = generateEAN13();

        attempts++;
      }

      if (attempts >= 10) {
        setError(
          "Could not generate a unique SKU and barcode. Please try again."
        );
        setSaving(false);
        return;
      }

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
          "id,name,sku,barcode,category,purchase_price,selling_price,gst_rate,current_stock,min_stock_level"
        )
        .single();

      if (insertError) {
        console.error("Product insert error:", insertError);

        setError(insertError.message);
        setSaving(false);
        return;
      }

      const newProduct = mapProduct(
        data as ProductRow
      );

      setProducts((current) => [
        newProduct,
        ...current,
      ]);

      setForm(emptyForm);
      setShowAddProduct(false);
      setSaving(false);
    } catch (unknownError) {
      console.error(unknownError);

      setError(
        unknownError instanceof Error
          ? unknownError.message
          : "Something went wrong while saving the product."
      );

      setSaving(false);
    }
  };

  return (
    <section className="inventory-page">

      {/* TOOLBAR */}
      <div className="inventory-toolbar">

        <div className="search-input-wrapper">
          <Search size={18} />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
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
          onClick={openAddProduct}
        >
          <Plus size={18} />
          Add Product
        </button>

      </div>

      {/* ERROR */}
      {error && !showAddProduct && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* INVENTORY CARD */}
      <div className="inventory-card">

        {loading ? (

          <div className="empty-inventory">

            <div className="empty-icon">
              <Package size={30} />
            </div>

            <h3>
              Loading inventory
            </h3>

            <p>
              Connecting to your product database.
            </p>

          </div>

        ) : filteredProducts.length === 0 ? (

          <div className="empty-inventory">

            <div className="empty-icon">
              <Package size={30} />
            </div>

            <h3>
              Your inventory is empty
            </h3>

            <p>
              Add your first product. Its SKU and
              EAN-13 barcode will be generated
              automatically.
            </p>

            <button
              className="primary-button"
              type="button"
              onClick={openAddProduct}
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
                      <strong>
                        {product.name}
                      </strong>
                    </td>

                    <td>
                      {product.sku}
                    </td>

                    <td>
                      {product.barcode}
                    </td>

                    <td>
                      {product.category}
                    </td>

                    <td>
                      ₹{product.purchasePrice.toFixed(2)}
                    </td>

                    <td>
                      ₹{product.sellingPrice.toFixed(2)}
                    </td>

                    <td>
                      {product.gstRate}%
                    </td>

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

      {/* ADD PRODUCT MODAL */}
      {showAddProduct && (

        <div
          className="modal-backdrop"
          onMouseDown={(event) => {

            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              closeAddProduct();
            }

          }}
        >

          <div
            className="product-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-product-title"
          >

            {/* MODAL HEADER */}
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
                disabled={saving}
                onClick={closeAddProduct}
                aria-label="Close"
              >
                <X size={19} />
              </button>

            </div>

            {/* MODAL ERROR */}
            {error && (

              <div className="error-message modal-error">
                {error}
              </div>

            )}

            {/* FORM */}
            <div className="product-form">

              {/* PRODUCT INFORMATION */}
              <div className="form-section">

                <span className="form-section-title">
                  PRODUCT INFORMATION
                </span>

                <label>
                  Product name

                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      updateForm(
                        "name",
                        event.target.value
                      )
                    }
                    placeholder="e.g. Herbal Shampoo"
                    disabled={saving}
                    autoFocus
                  />

                </label>

                <label>
                  Category

                  <input
                    type="text"
                    value={form.category}
                    onChange={(event) =>
                      updateForm(
                        "category",
                        event.target.value
                      )
                    }
                    placeholder="e.g. Hair Care"
                    disabled={saving}
                  />

                </label>

              </div>

              {/* PRICING & STOCK */}
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
                          event.target.value
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
                          event.target.value
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
                          event.target.value
                        )
                      }
                      disabled={saving}
                    >
                      <option value="0">
                        0%
                      </option>

                      <option value="5">
                        5%
                      </option>

                      <option value="12">
                        12%
                      </option>

                      <option value="18">
                        18%
                      </option>

                      <option value="28">
                        28%
                      </option>

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
                          event.target.value
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
                          event.target.value
                        )
                      }
                      placeholder="0"
                      disabled={saving}
                    />

                  </label>

                </div>

              </div>

              {/* BARCODE NOTICE */}
              <div className="barcode-notice">

                <div className="barcode-notice-mark">
                  EAN
                </div>

                <div>

                  <strong>
                    Barcode generated automatically
                  </strong>

                  <span>
                    A unique 13-digit EAN-13 barcode
                    will be created when this product
                    is saved.
                  </span>

                </div>

              </div>

            </div>

            {/* FOOTER */}
            <div className="modal-footer">

              <button
                className="secondary-button"
                type="button"
                disabled={saving}
                onClick={closeAddProduct}
              >
                Cancel
              </button>

              <button
                className="primary-button"
                type="button"
                disabled={saving}
                onClick={addProduct}
              >
                {saving
                  ? "Saving..."
                  : "Save Product"}
              </button>

            </div>

          </div>

        </div>

      )}

    </section>
  );
}
