import { Coins, DollarSign, PiggyBank } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";

// Available Cash — the company's current spendable cash, a single running balance (NOT a
// "today" figure — it carries forward every day). Equals Overall Cash Collected minus every
// approved Supplier Payment and approved Expense ever recorded (see lib/metrics.ts
// getAvailableCash, the one canonical source for this number). Deliberately never subtracted
// from Overall Cash Collected itself — that figure must always stay a pure "money received" number.
export default function AvailableCashCard({
  cdf, usd,
}: {
  cdf: number; usd: number;
}) {
  return (
    <div className="cash-hero cash-hero-available fade-in-up">
      <div className="cash-hero-head"><PiggyBank size={17} />Available Cash</div>

      <div className="cash-hero-section">
        <div className="cash-hero-label">Current balance</div>
        <div className="cash-hero-grid">
          <div className="cash-hero-col">
            <div className="cash-hero-ico"><Coins size={22} /></div>
            <div>
              <div className={`cash-hero-amt ${cdf < 0 ? "negative" : ""}`}>{cdf < 0 ? "-" : ""}<AnimatedCounter value={Math.abs(cdf)} /></div>
              <div className="cash-hero-cur">CDF · Congolese Franc</div>
            </div>
          </div>
          <div className="cash-hero-divider" />
          <div className="cash-hero-col">
            <div className="cash-hero-ico"><DollarSign size={22} /></div>
            <div>
              <div className={`cash-hero-amt ${usd < 0 ? "negative" : ""}`}>{usd < 0 ? "-$" : "$"}<AnimatedCounter value={Math.abs(usd)} /></div>
              <div className="cash-hero-cur">USD · US Dollar</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
