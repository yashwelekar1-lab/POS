import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  IndianRupee,
  Receipt,
  Download,
  X,
  User,
  CreditCard,
  FileText,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { jsPDF } from "jspdf";

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
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedSaleItems, setSelectedSaleItems] = useState<SaleItem[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

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

    
  const openSaleDetails = async (sale: Sale) => {
    setSelectedSale(sale);
    setSelectedSaleItems([]);
    setDetailsLoading(true);
    setError("");

    const { data, error: itemsError } = await supabase
      .from("sale_items")
      .select("*")
      .eq("sale_id", sale.id)
      .order("id", { ascending: true });

    if (itemsError) {
      console.error(itemsError);
      setError(`Unable to load invoice items: ${itemsError.message}`);
    } else {
      setSelectedSaleItems((data || []) as SaleItem[]);
    }

    setDetailsLoading(false);
  };

  const closeSaleDetails = () => {
    setSelectedSale(null);
    setSelectedSaleItems([]);
  };

  const downloadInvoice = async () => {
    if (!selectedSale) return;

    setDownloadingInvoice(true);

    try {
      let items = selectedSaleItems;

      if (!items.length) {
        const { data, error: itemsError } = await supabase
          .from("sale_items")
          .select("*")
          .eq("sale_id", selectedSale.id)
          .order("id", { ascending: true });

        if (itemsError) throw itemsError;
        items = (data || []) as SaleItem[];
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("ORDERLY", 18, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("RETAIL POINT OF SALE", 18, 27);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("TAX INVOICE", pageWidth - 18, 20, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Invoice: ${selectedSale.bill_number}`, pageWidth - 18, 27, {
        align: "right",
      });
      doc.text(
        `Date: ${new Date(selectedSale.created_at).toLocaleString("en-IN")}`,
        pageWidth - 18,
        33,
        { align: "right" },
      );

      doc.setDrawColor(210, 210, 210);
      doc.line(18, 40, pageWidth - 18, 40);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("CUSTOMER", 18, 52);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(selectedSale.customer_name || "Walk-in Customer", 18, 59);
      doc.text(selectedSale.customer_phone || "No phone number", 18, 65);

      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT", pageWidth - 70, 52);
      doc.setFont("helvetica", "normal");
      doc.text(
        selectedSale.payment_method?.toUpperCase() || "—",
        pageWidth - 18,
        59,
        { align: "right" },
      );

      let y = 80;

      doc.setFillColor(245, 245, 245);
      doc.rect(18, y - 7, pageWidth - 36, 10, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("PRODUCT", 20, y);
      doc.text("QTY", 112, y);
      doc.text("UNIT PRICE", 140, y);
      doc.text("GST", 170, y);
      doc.text("TOTAL", pageWidth - 20, y, { align: "right" });

      y += 12;
      doc.setFont("helvetica", "normal");

      items.forEach((item) => {
        if (y > 265) {
          doc.addPage();
          y = 20;
        }

        const name =
          item.product_name.length > 34
            ? `${item.product_name.slice(0, 31)}...`
            : item.product_name;

        doc.text(name, 20, y);
        doc.text(String(item.quantity), 115, y, { align: "right" });
        doc.text(formatMoney(Number(item.unit_price || 0)), 157, y, {
          align: "right",
        });
        doc.text(`${Number(item.gst_rate || 0)}%`, 180, y, {
          align: "right",
        });
        doc.text(formatMoney(Number(item.line_total || 0)), pageWidth - 20, y, {
          align: "right",
        });

        y += 8;

        if (item.sku || item.barcode) {
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.text(
            `SKU: ${item.sku || "-"}   Barcode: ${item.barcode || "-"}`,
            20,
            y,
          );
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(8);
          y += 5;
        }

        y += 3;
      });

      if (y > 245) {
        doc.addPage();
        y = 20;
      }

      doc.setDrawColor(210, 210, 210);
      doc.line(18, y, pageWidth - 18, y);
      y += 12;

      const cgst = Number(selectedSale.gst_amount || 0) / 2;
      const sgst = Number(selectedSale.gst_amount || 0) / 2;

      const summary = [
        ["Subtotal", formatMoney(Number(selectedSale.subtotal || 0))],
        ["CGST", formatMoney(cgst)],
        ["SGST", formatMoney(sgst)],
        [
          "Discount",
          formatMoney(Number(selectedSale.discount_amount || 0)),
        ],
      ];

      doc.setFontSize(10);

      summary.forEach(([label, value]) => {
        doc.setFont("helvetica", "normal");
        doc.text(label, pageWidth - 85, y);
        doc.text(value, pageWidth - 18, y, { align: "right" });
        y += 8;
      });

      doc.setFont("helvetica", "bold");
      doc.text("TOTAL", pageWidth - 85, y + 3);
      doc.text(
        formatMoney(Number(selectedSale.total_amount || 0)),
        pageWidth - 18,
        y + 3,
        { align: "right" },
      );

      y += 20;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("Thank you for shopping with Orderly.", pageWidth / 2, y, {
        align: "center",
      });

      doc.save(`${selectedSale.bill_number}-Invoice.pdf`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? `Invoice download failed: ${err.message}`
          : "Invoice download failed.",
      );
    } finally {
      setDownloadingInvoice(false);
    }
  };

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

  const dateOnly = (value: string) =>
    new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

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
                    <tr
                      key={sale.id}
                      className="sale-clickable-row"
                      onClick={() => openSaleDetails(sale)}
                      title="Click to view complete sale details"
                    >
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
      Number(item.unit_price || 0) *
        Number(item.quantity || 0),
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

      {selectedSale && (
        <div
          className="sale-details-overlay"
          onClick={closeSaleDetails}
        >
          <div
            className="sale-details-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sale-details-header">
              <div>
                <span className="eyebrow">TRANSACTION DETAILS</span>
                <h2>{selectedSale.bill_number}</h2>
                <p>
                  {new Date(selectedSale.created_at).toLocaleString(
                    "en-IN",
                    {
                      dateStyle: "medium",
                      timeStyle: "short",
                    },
                  )}
                </p>
              </div>

              <div className="sale-details-actions">
                <button
                  type="button"
                  className="invoice-download-button"
                  onClick={downloadInvoice}
                  disabled={downloadingInvoice || detailsLoading}
                >
                  <Download size={16} />
                  {downloadingInvoice
                    ? "Creating Invoice..."
                    : "Download Invoice"}
                </button>

                <button
                  type="button"
                  className="sale-details-close"
                  onClick={closeSaleDetails}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="sale-details-body">
              <div className="sale-info-grid">
                <div className="sale-info-card">
                  <div className="sale-info-icon">
                    <User size={18} />
                  </div>
                  <div>
                    <span>Customer</span>
                    <strong>
                      {selectedSale.customer_name || "Walk-in Customer"}
                    </strong>
                    <small>
                      {selectedSale.customer_phone || "No phone number"}
                    </small>
                  </div>
                </div>

                <div className="sale-info-card">
                  <div className="sale-info-icon">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <span>Payment Method</span>
                    <strong>
                      {selectedSale.payment_method?.toUpperCase() || "—"}
                    </strong>
                    <small>Completed payment</small>
                  </div>
                </div>

                <div className="sale-info-card">
                  <div className="sale-info-icon">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <span>Bill Number</span>
                    <strong>{selectedSale.bill_number}</strong>
                    <small>{dateOnly(selectedSale.created_at)}</small>
                  </div>
                </div>

                <div className="sale-info-card">
                  <div className="sale-info-icon">
                    <IndianRupee size={18} />
                  </div>
                  <div>
                    <span>Total Paid</span>
                    <strong>
                      {formatMoney(Number(selectedSale.total_amount || 0))}
                    </strong>
                    <small>Including GST</small>
                  </div>
                </div>
              </div>

              <div className="sale-products-section">
                <div className="sale-products-heading">
                  <div>
                    <h3>Products Purchased</h3>
                    <p>Complete product-level information for this bill.</p>
                  </div>
                  <span>
                    {selectedSaleItems.reduce(
                      (total, item) =>
                        total + Number(item.quantity || 0),
                      0,
                    )}{" "}
                    items
                  </span>
                </div>

                {detailsLoading ? (
                  <div className="analytics-empty">
                    <RefreshCw className="spin" size={22} />
                    <strong>Loading sale details...</strong>
                  </div>
                ) : selectedSaleItems.length === 0 ? (
                  <div className="analytics-empty">
                    <ShoppingBag size={28} />
                    <strong>No items found</strong>
                  </div>
                ) : (
                  <div className="sales-table-wrapper">
                    <table className="sales-table sale-details-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>SKU</th>
                          <th>Barcode</th>
                          <th>Qty</th>
                          <th>Unit Price</th>
                          <th>GST</th>
                          <th>Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSaleItems.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <strong>{item.product_name}</strong>
                              {item.product_id && (
                                <small className="product-id">
                                  ID: {item.product_id}
                                </small>
                              )}
                            </td>
                            <td>{item.sku || "—"}</td>
                            <td>{item.barcode || "—"}</td>
                            <td>{item.quantity}</td>
                            <td>
                              {formatMoney(Number(item.unit_price || 0))}
                            </td>
                            <td>
                              {Number(item.gst_rate || 0)}%
                              <small className="gst-amount">
                                {formatMoney(
                                  Number(item.gst_amount || 0),
                                )}
                              </small>
                            </td>
                            <td>
                              <strong>
                                {formatMoney(Number(item.line_total || 0))}
                              </strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="sale-summary">
                <div>
                  <span>Subtotal</span>
                  <strong>
                    {formatMoney(Number(selectedSale.subtotal || 0))}
                  </strong>
                </div>

                <div>
                  <span>CGST</span>
                  <strong>
                    {formatMoney(
                      Number(selectedSale.gst_amount || 0) / 2,
                    )}
                  </strong>
                </div>

                <div>
                  <span>SGST</span>
                  <strong>
                    {formatMoney(
                      Number(selectedSale.gst_amount || 0) / 2,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Discount</span>
                  <strong>
                    {formatMoney(
                      Number(selectedSale.discount_amount || 0),
                    )}
                  </strong>
                </div>

                <div className="sale-summary-total">
                  <span>Total</span>
                  <strong>
                    {formatMoney(Number(selectedSale.total_amount || 0))}
                  </strong>
                </div>
              </div>

              <div className="invoice-hint">
                <FileText size={16} />
                Click <strong>Download Invoice</strong> to save this exact
                transaction as a PDF.
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
