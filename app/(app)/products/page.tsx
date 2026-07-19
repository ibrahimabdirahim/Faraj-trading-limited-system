import { prisma } from "@/lib/db";
import ToastButton from "@/components/shared/ToastButton";
import AddProductForm from "@/components/products/AddProductForm";
import ProductsTable from "@/components/products/ProductsTable";

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

      <ProductsTable
        products={products.map((p) => ({
          id: p.id, name: p.name, categoryName: p.category?.name ?? null,
          baseCost: p.baseCost, currency: p.currency as "CDF" | "USD", unit: p.unit, barcode: p.barcode, status: p.status,
        }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </>
  );
}
