import { prisma } from "@/lib/db";
import { money } from "@/lib/format";
import Icon from "@/components/shared/Icon";
import ToastButton from "@/components/shared/ToastButton";
import AddProductForm from "@/components/products/AddProductForm";

export const dynamic = "force-dynamic";

function MiniStat({ label, value, color, delta }: { label: string; value: string; color: string; delta: string }) {
  return (
    <div className="card mini">
      <div className="l"><span style={{ width: 8, height: 8, borderRadius: 3, background: color, display: "inline-block" }} />{label}</div>
      <div className="v num">{value}</div><div className="d" style={{ color: "var(--muted)" }}>{delta}</div>
    </div>
  );
}

export default async function ProductsPage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" }, include: { category: true } });
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  const lowCount = products.filter((p) => p.status === "Low").length;

  return (
    <>
      <div className="page-head">
        <div><div className="page-title">Products</div><div className="page-sub">Catalogue with base cost set by Head Office · selling price per branch</div></div>
        <div className="head-actions">
          <ToastButton title="Import Excel" message="Upload your product spreadsheet" label="Import Excel" icon="download" />
          <ToastButton title="Export" message="Download catalogue as Excel" label="Export" icon="upload" />
          <AddProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
      </div>

      <div className="grid mini-stats">
        <MiniStat label="Total products" value={String(products.length)} color="var(--brand)" delta={products.length ? "in catalogue" : "None added yet"} />
        <MiniStat label="Categories" value={String(categories.length)} color="var(--cdf)" delta="defined" />
        <MiniStat label="Low stock" value={String(lowCount)} color="var(--warn)" delta={lowCount ? "reorder needed" : "nothing to reorder"} />
        <MiniStat label="Base currencies" value="CDF · USD" color="var(--good)" delta="dual tracking" />
      </div>

      {products.length === 0 ? (
        <div className="card"><div className="empty">
          <Icon name="box" className="ico" size={44} stroke={1.5} />
          <div style={{ fontWeight: 640, fontSize: 15, color: "var(--text)" }}>No products yet</div>
          <div style={{ margin: "4px auto 16px", maxWidth: 360 }}>Head Office adds the catalogue and sets each item&apos;s base cost. Import your existing list from Excel, or add products one by one.</div>
          <AddProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
        </div></div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Category</th><th>Base cost</th><th>Unit</th><th>Barcode</th><th>Status</th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="t-name">{p.name}</td>
                  <td><span className="prod-cat">{p.category?.name ?? "—"}</span></td>
                  <td className="num" style={{ fontWeight: 600 }}>{money(p.baseCost, p.currency as "CDF" | "USD")}</td>
                  <td className="dot-unit">{p.unit}</td>
                  <td className="dot-unit num">{p.barcode || "—"}</td>
                  <td><span className={`status ${p.status === "Active" ? "approved" : p.status === "Low" ? "pending" : "missing"}`}><i />{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
