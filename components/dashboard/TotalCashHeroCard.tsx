import { Coins, DollarSign, Wallet } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";

export default function TotalCashHeroCard({
  todayCdf, todayUsd, overallCdf, overallUsd,
}: {
  todayCdf: number; todayUsd: number; overallCdf: number; overallUsd: number;
}) {
  return (
    <div className="cash-hero fade-in-up">
      <div className="cash-hero-head"><Wallet size={17} />Total Cash Collected</div>

      <div className="cash-hero-section">
        <div className="cash-hero-label">Today</div>
        <div className="cash-hero-grid">
          <div className="cash-hero-col">
            <div className="cash-hero-ico"><Coins size={22} /></div>
            <div>
              <div className="cash-hero-amt"><AnimatedCounter value={todayCdf} /></div>
              <div className="cash-hero-cur">CDF · Congolese Franc</div>
            </div>
          </div>
          <div className="cash-hero-divider" />
          <div className="cash-hero-col">
            <div className="cash-hero-ico"><DollarSign size={22} /></div>
            <div>
              <div className="cash-hero-amt">$<AnimatedCounter value={todayUsd} /></div>
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
              <div className="cash-hero-amt"><AnimatedCounter value={overallCdf} /></div>
              <div className="cash-hero-cur">CDF · Congolese Franc</div>
            </div>
          </div>
          <div className="cash-hero-divider" />
          <div className="cash-hero-col">
            <div className="cash-hero-ico"><DollarSign size={18} /></div>
            <div>
              <div className="cash-hero-amt">$<AnimatedCounter value={overallUsd} /></div>
              <div className="cash-hero-cur">USD · US Dollar</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
