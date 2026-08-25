
import {
  BarChart3,
  Boxes,
  CalendarDays,
  IndianRupee,
  Receipt,
  Download,
  X,
  User,
  CreditCard,
  FileText,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
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
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);

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

  const dateOnly = (value: string) =>
    new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const getSaleItems = (saleId: string) =>
    saleItems.filter((item) => item.sale_id === saleId);


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
    setInvoicePreviewOpen(false);
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
        doc.text(
          formatMoney(Number(item.line_total || 0)),
          pageWidth - 20,
          y,
          { align: "right" },
        );

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
        ["Discount", formatMoney(Number(selectedSale.discount_amount || 0))],
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
                  {new Date(selectedSale.created_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>

              <div className="sale-details-actions">
                <button
                  type="button"
                  className="invoice-preview-button"
                  onClick={() => setInvoicePreviewOpen(true)}
                  disabled={detailsLoading}
                >
                  <FileText size={16} />
                  Invoice
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
                  <div className="sale-info-icon"><User size={18} /></div>
                  <div>
                    <span>Customer</span>
                    <strong>{selectedSale.customer_name || "Walk-in Customer"}</strong>
                    <small>{selectedSale.customer_phone || "No phone number"}</small>
                  </div>
                </div>

                <div className="sale-info-card">
                  <div className="sale-info-icon"><CreditCard size={18} /></div>
                  <div>
                    <span>Payment Method</span>
                    <strong>{selectedSale.payment_method?.toUpperCase() || "—"}</strong>
                    <small>Completed payment</small>
                  </div>
                </div>

                <div className="sale-info-card">
                  <div className="sale-info-icon"><Receipt size={18} /></div>
                  <div>
                    <span>Bill Number</span>
                    <strong>{selectedSale.bill_number}</strong>
                    <small>{dateOnly(selectedSale.created_at)}</small>
                  </div>
                </div>

                <div className="sale-info-card">
                  <div className="sale-info-icon"><IndianRupee size={18} /></div>
                  <div>
                    <span>Total Paid</span>
                    <strong>{formatMoney(Number(selectedSale.total_amount || 0))}</strong>
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
                      (total, item) => total + Number(item.quantity || 0),
                      0,
                    )} items
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
                              <small className="product-id">
                                ID: {item.product_id}
                              </small>
                            </td>
                            <td>{item.sku || "—"}</td>
                            <td>{item.barcode || "—"}</td>
                            <td>{item.quantity}</td>
                            <td>{formatMoney(Number(item.unit_price || 0))}</td>
                            <td>
                              {Number(item.gst_rate || 0)}%
                              <small className="gst-amount">
                                {formatMoney(Number(item.gst_amount || 0))}
                              </small>
                            </td>
                            <td>
                              <strong>{formatMoney(Number(item.line_total || 0))}</strong>
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
                  <strong>{formatMoney(Number(selectedSale.subtotal || 0))}</strong>
                </div>
                <div>
                  <span>CGST</span>
                  <strong>{formatMoney(Number(selectedSale.gst_amount || 0) / 2)}</strong>
                </div>
                <div>
                  <span>SGST</span>
                  <strong>{formatMoney(Number(selectedSale.gst_amount || 0) / 2)}</strong>
                </div>
                <div>
                  <span>Discount</span>
                  <strong>{formatMoney(Number(selectedSale.discount_amount || 0))}</strong>
                </div>
                <div className="sale-summary-total">
                  <span>Total</span>
                  <strong>{formatMoney(Number(selectedSale.total_amount || 0))}</strong>
                </div>
              </div>

              <div className="invoice-hint">
                <FileText size={16} />
                Click <strong>Invoice</strong> above to open the invoice preview.
              </div>
            </div>
          </div>
        </div>
      )}

      {invoicePreviewOpen && selectedSale && (
        <div
          className="invoice-preview-overlay"
          onClick={() => setInvoicePreviewOpen(false)}
        >
          <div
            className="invoice-preview-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="invoice-preview-toolbar">
              <div>
                <span className="eyebrow">ORDERLY INVOICE</span>
                <h2>Invoice Preview</h2>
              </div>

              <div className="invoice-preview-actions">
                <button
                  type="button"
                  className="invoice-download-button"
                  onClick={downloadInvoice}
                  disabled={downloadingInvoice || detailsLoading}
                >
                  <Download size={16} />
                  {downloadingInvoice ? "Creating..." : "Download Invoice"}
                </button>

                <button
                  type="button"
                  className="sale-details-close"
                  onClick={() => setInvoicePreviewOpen(false)}
                  aria-label="Close invoice"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="invoice-paper">
              <div className="invoice-paper-top">
                <div>
                  <div className="invoice-brand">ORDERLY</div>
                  <div className="invoice-subtitle">RETAIL POINT OF SALE</div>
                </div>
                <div className="invoice-title-block">
                  <h1>TAX INVOICE</h1>
                  <span>{selectedSale.bill_number}</span>
                  <span>
                    {new Date(selectedSale.created_at).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="invoice-divider" />

              <div className="invoice-customer-row">
                <div>
                  <span className="invoice-label">BILL TO</span>
                  <strong>
                    {selectedSale.customer_name || "Walk-in Customer"}
                  </strong>
                  <span>
                    {selectedSale.customer_phone || "No phone number"}
                  </span>
                </div>

                <div className="invoice-payment-box">
                  <span className="invoice-label">PAYMENT</span>
                  <strong>
                    {selectedSale.payment_method?.toUpperCase() || "—"}
                  </strong>
                </div>
              </div>

              <div className="invoice-items">
                <div className="invoice-item-head">
                  <span>PRODUCT</span>
                  <span>QTY</span>
                  <span>UNIT PRICE</span>
                  <span>GST</span>
                  <span>TOTAL</span>
                </div>

                {selectedSaleItems.map((item) => (
                  <div className="invoice-item-row" key={item.id}>
                    <div>
                      <strong>{item.product_name}</strong>
                      <small>
                        SKU: {item.sku || "—"} · Barcode: {item.barcode || "—"}
                      </small>
                    </div>
                    <span>{item.quantity}</span>
                    <span>{formatMoney(Number(item.unit_price || 0))}</span>
                    <span>{Number(item.gst_rate || 0)}%</span>
                    <strong>
                      {formatMoney(Number(item.line_total || 0))}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="invoice-total-area">
                <div className="invoice-total-lines">
                  <div>
                    <span>Subtotal</span>
                    <strong>
                      {formatMoney(Number(selectedSale.subtotal || 0))}
                    </strong>
                  </div>
                  <div>
                    <span>CGST</span>
                    <strong>
                      {formatMoney(Number(selectedSale.gst_amount || 0) / 2)}
                    </strong>
                  </div>
                  <div>
                    <span>SGST</span>
                    <strong>
                      {formatMoney(Number(selectedSale.gst_amount || 0) / 2)}
                    </strong>
                  </div>
                  <div>
                    <span>Discount</span>
                    <strong>
                      {formatMoney(Number(selectedSale.discount_amount || 0))}
                    </strong>
                  </div>
                  <div className="invoice-grand-total">
                    <span>Total</span>
                    <strong>
                      {formatMoney(Number(selectedSale.total_amount || 0))}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="invoice-footer">
                Thank you for shopping with Orderly.
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .sale-clickable-row {
          cursor: pointer !important;
          transition: background-color .15s ease;
        }
        .sale-clickable-row:hover {
          background: #faf8f4 !important;
        }
        .sale-details-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: rgba(0,0,0,.58);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .sale-details-modal {
          width: min(1120px, 100%);
          max-height: 92vh;
          overflow-y: auto;
          background: #fff;
          box-shadow: 0 25px 80px rgba(0,0,0,.3);
        }
        .sale-details-header {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 24px 28px;
          background: #fff;
          border-bottom: 1px solid #ddd;
        }
        .sale-details-header h2 {
          margin: 5px 0;
          font-family: Georgia, serif;
          font-weight: 500;
        }
        .sale-details-header p {
          margin: 0;
          color: #77818d;
          font-size: 13px;
        }
        .sale-details-actions {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .invoice-download-button {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 0;
          background: #111;
          color: #fff;
          padding: 12px 16px;
          cursor: pointer;
          font-weight: 600;
        }
        .invoice-download-button:disabled {
          opacity: .6;
          cursor: wait;
        }
        .sale-details-close {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border: 1px solid #ddd;
          background: #fff;
          cursor: pointer;
        }
        .sale-details-body {
          padding: 28px;
        }
        .sale-info-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        .sale-info-card {
          display: flex;
          gap: 12px;
          border: 1px solid #e2e2e2;
          padding: 16px;
        }
        .sale-info-icon {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: grid;
          place-items: center;
          background: #f3f1ed;
        }
        .sale-info-card span,
        .sale-info-card small {
          display: block;
        }
        .sale-info-card span {
          color: #7a8490;
          font-size: 11px;
          margin-bottom: 5px;
        }
        .sale-info-card small {
          color: #89929d;
          font-size: 11px;
          margin-top: 5px;
        }
        .sale-products-section {
          border: 1px solid #e1e1e1;
        }
        .sale-products-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 18px 20px;
          border-bottom: 1px solid #e1e1e1;
        }
        .sale-products-heading h3 {
          margin: 0;
        }
        .sale-products-heading p {
          margin: 5px 0 0;
          color: #7b8490;
          font-size: 12px;
        }
        .sale-products-heading > span {
          color: #68727d;
          font-size: 12px;
        }
        .sale-details-table .product-id,
        .sale-details-table .gst-amount {
          display: block;
          margin-top: 4px;
          color: #89929d;
          font-size: 10px;
        }
        .sale-summary {
          width: min(390px, 100%);
          margin: 22px 0 0 auto;
          border-top: 2px solid #111;
          padding-top: 9px;
        }
        .sale-summary > div {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
        }
        .sale-summary-total {
          margin-top: 6px;
          padding-top: 12px !important;
          border-top: 1px solid #ddd;
          font-size: 18px;
        }
        .invoice-hint {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 22px;
          padding-top: 16px;
          border-top: 1px solid #eee;
          color: #7b8490;
          font-size: 12px;
        }
        @media (max-width: 900px) {
          .sale-info-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 650px) {
          .sale-details-overlay { padding: 0; }
          .sale-details-modal { max-height: 100vh; }
          .sale-details-header { padding: 18px; }
          .sale-details-body { padding: 18px; }
          .sale-info-grid { grid-template-columns: 1fr; }
          .sale-details-actions { flex-direction: column; }
        }

        .invoice-preview-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #111;
          background: #111;
          color: #fff;
          padding: 12px 18px;
          cursor: pointer;
          font-weight: 600;
        }

        .invoice-preview-button:disabled {
          opacity: .55;
          cursor: wait;
        }

        .invoice-preview-overlay {
          position: fixed;
          inset: 0;
          z-index: 100000;
          background: rgba(0, 0, 0, .68);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .invoice-preview-modal {
          width: min(900px, 100%);
          max-height: 94vh;
          overflow: auto;
          background: #f1f1ef;
          box-shadow: 0 30px 100px rgba(0,0,0,.4);
        }

        .invoice-preview-toolbar {
          position: sticky;
          top: 0;
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 16px 20px;
          background: #fff;
          border-bottom: 1px solid #ddd;
        }

        .invoice-preview-toolbar h2 {
          margin: 4px 0 0;
          font-family: Georgia, serif;
          font-weight: 500;
        }

        .invoice-preview-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .invoice-paper {
          width: min(760px, calc(100% - 40px));
          margin: 28px auto;
          padding: 46px 48px;
          background: #fff;
          color: #171717;
          box-shadow: 0 10px 35px rgba(0,0,0,.12);
        }

        .invoice-paper-top {
          display: flex;
          justify-content: space-between;
          gap: 30px;
        }

        .invoice-brand {
          font-family: Georgia, serif;
          font-size: 30px;
          letter-spacing: .08em;
        }

        .invoice-subtitle {
          margin-top: 5px;
          color: #777;
          font-size: 9px;
          letter-spacing: .16em;
        }

        .invoice-title-block {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          text-align: right;
          font-size: 11px;
          color: #666;
        }

        .invoice-title-block h1 {
          margin: 0 0 3px;
          font-family: Georgia, serif;
          font-size: 20px;
          color: #111;
          font-weight: 500;
        }

        .invoice-divider {
          height: 1px;
          background: #d8d8d8;
          margin: 28px 0;
        }

        .invoice-customer-row {
          display: flex;
          justify-content: space-between;
          gap: 40px;
          margin-bottom: 30px;
        }

        .invoice-customer-row > div {
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-size: 12px;
        }

        .invoice-customer-row strong {
          font-size: 14px;
        }

        .invoice-label {
          color: #888;
          font-size: 9px;
          letter-spacing: .14em;
          margin-bottom: 3px;
        }

        .invoice-payment-box {
          min-width: 150px;
          text-align: right;
        }

        .invoice-items {
          border-top: 1px solid #222;
        }

        .invoice-item-head,
        .invoice-item-row {
          display: grid;
          grid-template-columns: minmax(200px, 1fr) 45px 100px 55px 105px;
          gap: 10px;
          align-items: center;
        }

        .invoice-item-head {
          padding: 11px 0;
          border-bottom: 1px solid #ddd;
          color: #777;
          font-size: 8px;
          letter-spacing: .12em;
        }

        .invoice-item-head span:not(:first-child),
        .invoice-item-row > span,
        .invoice-item-row > strong {
          text-align: right;
        }

        .invoice-item-row {
          padding: 14px 0;
          border-bottom: 1px solid #eee;
          font-size: 11px;
        }

        .invoice-item-row > div {
          min-width: 0;
        }

        .invoice-item-row small {
          display: block;
          margin-top: 4px;
          color: #888;
          font-size: 8px;
        }

        .invoice-total-area {
          display: flex;
          justify-content: flex-end;
          margin-top: 25px;
        }

        .invoice-total-lines {
          width: 300px;
        }

        .invoice-total-lines > div {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          font-size: 11px;
        }

        .invoice-grand-total {
          margin-top: 8px;
          padding-top: 12px !important;
          border-top: 1px solid #222;
          font-size: 17px !important;
        }

        .invoice-footer {
          margin-top: 45px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #777;
          font-size: 10px;
        }

        @media (max-width: 700px) {
          .invoice-preview-overlay {
            padding: 0;
          }

          .invoice-preview-modal {
            max-height: 100vh;
          }

          .invoice-preview-toolbar {
            padding: 12px;
          }

          .invoice-paper {
            width: calc(100% - 24px);
            margin: 12px auto;
            padding: 28px 18px;
          }

          .invoice-item-head,
          .invoice-item-row {
            grid-template-columns: minmax(130px, 1fr) 35px 75px 45px 80px;
            gap: 5px;
          }
        }
      `}</style>

    </section>
  );
}
