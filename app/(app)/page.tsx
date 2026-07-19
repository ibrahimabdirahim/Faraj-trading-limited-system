import { getDashboard, getBranchComparison, getProductsReceivedToday, getTodayExpenseCount, getOverallCashCollected, getAvailableCash, getSupplierPaymentsTotal, resolveDateRange } from "@/lib/metrics";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/session";
import DashboardHero from "@/components/dashboard/DashboardHero";
import QuickActionsGrid from "@/components/dashboard/QuickActionsGrid";
import TotalCashHeroCard from "@/components/dashboard/TotalCashHeroCard";
import AvailableCashCard from "@/components/dashboard/AvailableCashCard";
import TodaySummaryGrid from "@/components/dashboard/TodaySummaryGrid";
import BranchRankingPanel from "@/components/dashboard/BranchRankingPanel";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const todayRange = resolveDateRange("today");

  const [{ submitted, totalBranches, totals, activity }, settings, comparisonRows, productsReceived, expenseCount, overall, todaySupplierPayments] = await Promise.all([
    getDashboard(),
    getSettings(),
    getBranchComparison(todayRange.from, todayRange.to),
    getProductsReceivedToday(),
    getTodayExpenseCount(),
    getOverallCashCollected(),
    getSupplierPaymentsTotal("today"),
  ]);
  const availableCash = await getAvailableCash(overall);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <DashboardHero
        companyName={settings.companyName} companyLogo={settings.companyLogo}
        userName={user?.name ?? "there"} greeting={greeting} dateLabel={dateLabel}
        submitted={submitted} totalBranches={totalBranches}
      />

      <div className="cash-rank-row" style={{ marginTop: 16 }}>
        <div className="cash-hero-stack">
          <TotalCashHeroCard todayCdf={totals.cashCdf} todayUsd={totals.cashUsd} overallCdf={overall.cashCdf} overallUsd={overall.cashUsd} />
          <AvailableCashCard cdf={availableCash.cdf} usd={availableCash.usd} />
        </div>
        <BranchRankingPanel rows={comparisonRows} />
      </div>

      <div style={{ fontSize: 13.5, fontWeight: 630, margin: "2px 0 8px" }}>Quick Actions</div>
      <QuickActionsGrid />

      <div style={{ fontSize: 13.5, fontWeight: 630, margin: "2px 0 8px" }}>Today&apos;s Summary</div>
      <TodaySummaryGrid submitted={submitted} totalBranches={totalBranches} totals={totals} expenseCount={expenseCount} productsReceived={productsReceived} supplierPayments={todaySupplierPayments} />

      <div className="card">
        <div className="card-head"><div><h3>Recent Activity</h3><div className="sub">Today only</div></div></div>
        <ActivityTimeline activity={activity} />
      </div>
    </>
  );
}
