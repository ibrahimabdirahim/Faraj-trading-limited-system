import { Coins, DollarSign, PiggyBank } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";

// Available Cash = Total Cash Collected − Supplier Payments − Branch Expenses − Other Company
// Expenses (see lib/metrics.ts getAvailableCash). Deliberately never subtracted from Total
// Cash Collected itself — that figure must always stay a pure "money received" number.
export default function AvailableCashCard({
  todayCdf, todayUsd, overallCdf, overallUsd,
}: {
  todayCdf: number; todayUsd: number; overallCdf: number; overallUsd: number;
}) {
  return (
    <div className="cash-hero cash-hero-available fade-in-up">
      <div className="cash-hero-head"><PiggyBank size={17} />Available Cash</div>

      <div className="cash-hero-section">
        <div className="cash-hero-label">Today</div>
        <div className="cash-hero-grid">
          <div className="cash-hero-col">
            <div className="cash-hero-ico"><Coins size={22} /></div>
            <div>
              <div className={`cash-hero-amt ${todayCdf < 0 ? "negative" : ""}`}>{todayCdf < 0 ? "-" : ""}<AnimatedCounter value={Math.abs(todayCdf)} /></div>
              <div className="cash-hero-cur">CDF · Congolese Franc</div>
            </div>
          </div>
          <div className="cash-hero-divider" />
          <div className="cash-hero-col">
            <div className="cash-hero-ico"><DollarSign size={22} /></div>
            <div>
              <div className={`cash-hero-amt ${todayUsd < 0 ? "negative" : ""}`}>{todayUsd < 0 ? "-$" : "$"}<AnimatedCounter value={Math.abs(todayUsd)} /></div>
              <div className="cash-hero-cur">USD · US Dollar</div>
            </div>
          </div>
        </div>
      </div>

      <div className="cash-hero-section overall">
        <div className="cash-hero-label">Overall · since system started</div>
        <div className="cash-hero-grid">
          <div className="cash-hero-col">
            <div className="cash-hero-ico"><Coins size={18} /></div>
            <div>
              <div className={`cash-hero-amt ${overallCdf < 0 ? "negative" : ""}`}>{overallCdf < 0 ? "-" : ""}<AnimatedCounter value={Math.abs(overallCdf)} /></div>
              <div className="cash-hero-cur">CDF · Congolese Franc</div>
            </div>
          </div>
          <div className="cash-hero-divider" />
          <div className="cash-hero-col">
            <div className="cash-hero-ico"><DollarSign size={18} /></div>
            <div>
              <div className={`cash-hero-amt ${overallUsd < 0 ? "negative" : ""}`}>{overallUsd < 0 ? "-$" : "$"}<AnimatedCounter value={Math.abs(overallUsd)} /></div>
              <div className="cash-hero-cur">USD · US Dollar</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
