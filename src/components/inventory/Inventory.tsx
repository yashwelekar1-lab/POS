import { useMemo, useState } from "react";
import { Package, Plus, Search, Trash2 } from "lucide-react";

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

export function Inventory() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return products;

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.barcode.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query),
    );
  }, [products, search]);

  const deleteProduct = (id: string) => {
    setProducts((current) =>
      current.filter((product) => product.id !== id),
    );
  };

  return (
    <section className="inventory-page">
      <div className="page-heading">
        <div>
          <h2>Inventory</h2>
          <p>Manage products, prices and stock levels.</p>
        </div>

        <button className="primary-button" type="button">
          <Plus size={18} />
          Add Product
        </button>
      </div>

      <div className="inventory-toolbar">
        <div className="search-input-wrapper">
          <Search size={18} />

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search product, SKU, barcode or category..."
          />
        </div>

        <div className="inventory-count">
          {filteredProducts.length} product
          {filteredProducts.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="inventory-card">
        {filteredProducts.length === 0 ? (
          <div className="empty-inventory">
            <div className="empty-icon">
              <Package size={30} />
            </div>

            <h3>No products yet</h3>

            <p>
              Your inventory is empty. Add your first product to start
              billing.
            </p>

            <button className="primary-button" type="button">
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
                  <th />
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
                    <td>₹{product.purchasePrice.toFixed(2)}</td>
                    <td>₹{product.sellingPrice.toFixed(2)}</td>
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
                    <td>
                      <button
                        className="icon-button danger"
                        type="button"
                        onClick={() => deleteProduct(product.id)}
                        aria-label={`Delete ${product.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
