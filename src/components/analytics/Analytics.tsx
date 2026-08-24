import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  IndianRupee,
  Receipt,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type Sale = {
  id: string;
  bill_number: string;
  subtotal: number;
  gst_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
};

type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  barcode: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  gst_amount: number;
  line_total: number;
};

type Product = {
  id: string;
  name: string;
  current_stock: number;
  selling_price: number;
};

export function Analytics() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [salesResult, itemsResult, productsResult] = await Promise.all([
        supabase
          .from("sales")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("sale_items")
          .select("*")
          .order("id", { ascending: false }),

        supabase
          .from("products")
          .select("id,name,current_stock,selling_price")
          .eq("is_active", true),
      ]);

      if (salesResult.error) throw salesResult.error;
      if (itemsResult.error) throw itemsResult.error;
      if (productsResult.error) throw productsResult.error;

      setSales((salesResult.data || []) as Sale[]);
      setSaleItems((itemsResult.data || []) as SaleItem[]);
      setProducts((productsResult.data || []) as Product[]);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load sales data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const todaySales = useMemo(() => {
    const today = new Date();

    return sales.filter((sale) => {
      const date = new Date(sale.created_at);

      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    });
  }, [sales]);

  const todayRevenue = useMemo(
    () =>
      todaySales.reduce(
        (total, sale) => total + Number(sale.total_amount || 0),
        0,
      ),
    [todaySales],
  );

  const todayItems = useMemo(() => {
    const ids = new Set(todaySales.map((sale) => sale.id));

    return saleItems
      .filter((item) => ids.has(item.sale_id))
      .reduce((total, item) => total + Number(item.quantity || 0), 0);
  }, [todaySales, saleItems]);

  const stockValue = useMemo(
    () =>
      products.reduce(
        (total, product) =>
          total +
          Number(product.current_stock || 0) *
            Number(product.selling_price || 0),
        0,
      ),
    [products],
  );

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value);

  const getSaleItems = (saleId: string) =>
    saleItems.filter((item) => item.sale_id === saleId);

  return (
    <section className="analytics-page">
      <div className="analytics-header">
        <div>
          <span className="eyebrow">RETAIL INTELLIGENCE</span>
          <h1>Sales & Analytics</h1>
          <p>
            Real-time performance from your Orderly transactions.
          </p>
        </div>

        <button
          className="analytics-refresh"
          type="button"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="analytics-error">
          {error}
        </div>
      )}

      <div className="analytics-cards">
        <div className="analytics-card">
          <div className="analytics-card-icon">
            <IndianRupee size={20} />
          </div>

          <div>
            <span>Today's Sales</span>
            <strong>{formatMoney(todayRevenue)}</strong>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon">
            <Receipt size={20} />
          </div>

          <div>
            <span>Bills Today</span>
            <strong>{todaySales.length}</strong>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon">
            <ShoppingBag size={20} />
          </div>

          <div>
            <span>Items Sold Today</span>
            <strong>{todayItems}</strong>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon">
            <Boxes size={20} />
          </div>

          <div>
            <span>Stock Value</span>
            <strong>{formatMoney(stockValue)}</strong>
          </div>
        </div>
      </div>

      <div className="analytics-section">
        <div className="analytics-section-header">
          <div>
            <h2>Recent Sales</h2>
            <p>Completed transactions from Orderly.</p>
          </div>

          <span className="sales-count">
            {sales.length} {sales.length === 1 ? "bill" : "bills"}
          </span>
        </div>

        {loading ? (
          <div className="analytics-empty">
            <RefreshCw className="spin" size={24} />
            <strong>Loading sales...</strong>
          </div>
        ) : sales.length === 0 ? (
          <div className="analytics-empty">
            <BarChart3 size={32} />
            <strong>No sales yet</strong>
            <span>
              Completed bills will appear here automatically.
            </span>
          </div>
        ) : (
          <div className="sales-table-wrapper">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Bill</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>GST</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {sales.map((sale) => {
                  const items = getSaleItems(sale.id);

                  return (
                    <tr key={sale.id}>
                      <td>
                        <div className="bill-cell">
                          <strong>{sale.bill_number}</strong>

                          {items.map((item) => (
                            <span key={item.id}>
                              {item.product_name} × {item.quantity}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td>
                        {new Date(sale.created_at).toLocaleString(
                          "en-IN",
                          {
                            dateStyle: "medium",
                            timeStyle: "short",
                          },
                        )}
                      </td>

                      <td>
                        {items.reduce(
                          (total, item) =>
                            total + Number(item.quantity || 0),
                          0,
                        )}
                      </td>

                      <td>
                        <span className="payment-badge">
                          {sale.payment_method?.toUpperCase() || "—"}
                        </span>
                      </td>

                      <td>
                        {formatMoney(Number(sale.gst_amount || 0))}
                      </td>

                      <td>
                        <strong>
                          {formatMoney(
                            Number(sale.total_amount || 0),
                          )}
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="analytics-section">
        <div className="analytics-section-header">
          <div>
            <h2>Sales Items</h2>
            <p>Every product included in completed bills.</p>
          </div>
        </div>

        {saleItems.length === 0 ? (
          <div className="analytics-empty">
            <ShoppingBag size={32} />
            <strong>No sales items</strong>
          </div>
        ) : (
          <div className="sales-table-wrapper">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Barcode</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>GST</th>
                  <th>Line Total</th>
                </tr>
              </thead>

              <tbody>
                {saleItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.product_name}</strong>
                    </td>

                    <td>{item.sku}</td>

                    <td>{item.barcode}</td>

                    <td>{item.quantity}</td>

                    <td>
                      {formatMoney(Number(item.unit_price || 0))}
                    </td>

                    <td>{item.gst_rate}%</td>

                    <td>
                      <strong>
                        {formatMoney(
                          Number(item.line_total || 0),
                        )}
                      </strong>
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
