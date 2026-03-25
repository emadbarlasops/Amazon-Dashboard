"use client";

import { useState, useMemo } from "react";
import {
  Target, Zap, AlertTriangle, CheckCircle2, TrendingDown,
  TrendingUp, ChevronUp, ChevronDown, ChevronsUpDown,
  ArrowDownRight, ArrowUpRight, Sparkles, XCircle, DollarSign,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetCloseButton, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface Campaign {
  id: string; name: string;
  type: "Sponsored Products"|"Sponsored Brand"|"Sponsored Display";
  spend: number; sales: number; acos: number; roas: number;
  impressions: number; clicks: number; orders: number;
  ctr: number; cvr: number; cpc: number;
  status: "healthy"|"warning"|"critical"; breakEvenAcos: number;
}

interface WastedKeyword {
  term: string; spend: number; clicks: number; orders: number;
  acos: number | null; action: "Pause"|"Add Negative"|"Reduce Bid"; impact: string;
}

interface BidRec {
  keyword: string; matchType: "Exact"|"Phrase"|"Broad";
  currentBid: number; suggestedBid: number;
  currentAcos: number; targetAcos: number;
  reason: string; urgency: "TODAY"|"THIS_WEEK";
}

// ── Mock data ──────────────────────────────────────────────────────────────

const CAMPAIGNS: Campaign[] = [
  { id:"C001", name:"Brand Defense — Earbuds",       type:"Sponsored Products", spend:1240, sales:10333, acos:12.0, roas:8.3,  impressions:142000, clicks:1136, orders:91,  ctr:0.80, cvr:8.0, cpc:1.09, status:"healthy",  breakEvenAcos:28 },
  { id:"C002", name:"Category Attack — Electronics", type:"Sponsored Products", spend:3800, sales:13571, acos:28.0, roas:3.6,  impressions:520000, clicks:3640, orders:196, ctr:0.70, cvr:5.4, cpc:1.04, status:"warning",  breakEvenAcos:28 },
  { id:"C003", name:"Competitor Conquest",           type:"Sponsored Products", spend:2100, sales:9545,  acos:22.0, roas:4.5,  impressions:310000, clicks:2480, orders:134, ctr:0.80, cvr:5.4, cpc:0.85, status:"healthy",  breakEvenAcos:28 },
  { id:"C004", name:"Retargeting — Past Visitors",  type:"Sponsored Display",  spend:680,  sales:7556,  acos:9.0,  roas:11.1, impressions:88000,  clicks:616,  orders:62,  ctr:0.70, cvr:10.1,cpc:1.10, status:"healthy",  breakEvenAcos:28 },
  { id:"C005", name:"Auto — New Products Launch",   type:"Sponsored Products", spend:950,  sales:2317,  acos:41.0, roas:2.4,  impressions:204000, clicks:1428, orders:30,  ctr:0.70, cvr:2.1, cpc:0.67, status:"critical", breakEvenAcos:22 },
  { id:"C006", name:"Sponsored Brand — Video",      type:"Sponsored Brand",    spend:420,  sales:2800,  acos:15.0, roas:6.7,  impressions:95000,  clicks:570,  orders:38,  ctr:0.60, cvr:6.7, cpc:0.74, status:"healthy",  breakEvenAcos:28 },
];

const WASTED_KEYWORDS: WastedKeyword[] = [
  { term:"usb hub desktop",     spend:94, clicks:112, orders:0, acos:null, action:"Add Negative", impact:"Stop $94/mo waste"  },
  { term:"wired earbuds",       spend:76, clicks:88,  orders:0, acos:null, action:"Add Negative", impact:"Stop $76/mo waste"  },
  { term:"gaming headset",      spend:68, clicks:71,  orders:0, acos:null, action:"Pause",        impact:"Stop $68/mo waste"  },
  { term:"cheap earphones",     spend:54, clicks:63,  orders:0, acos:null, action:"Add Negative", impact:"Stop $54/mo waste"  },
  { term:"usb splitter",        spend:48, clicks:55,  orders:0, acos:null, action:"Add Negative", impact:"Stop $48/mo waste"  },
  { term:"laptop stand wooden", spend:41, clicks:49,  orders:0, acos:null, action:"Reduce Bid",   impact:"Reduce to $0.25 bid"},
];

const CAMPAIGN_DETAILS: Record<string, { wastedKws: WastedKeyword[]; bidRecs: BidRec[] }> = {
  "C001": {
    wastedKws: [{ term:"cheap earphones", spend:54, clicks:63, orders:0, acos:null, action:"Add Negative", impact:"Stop $54/mo waste" }],
    bidRecs: [
      { keyword:"wireless earbuds pro", matchType:"Exact", currentBid:1.10, suggestedBid:1.45, currentAcos:9.2, targetAcos:12, reason:"Strong performer — 9.2% ACoS well below break-even. Scale up bid for more volume.", urgency:"TODAY" },
      { keyword:"bluetooth noise cancelling earbuds", matchType:"Phrase", currentBid:0.90, suggestedBid:1.20, currentAcos:11.4, targetAcos:12, reason:"Near break-even target. Modest bid increase to capture more impressions.", urgency:"THIS_WEEK" },
    ],
  },
  "C002": {
    wastedKws: [
      { term:"gaming headset",  spend:68, clicks:71,  orders:0, acos:null, action:"Pause",        impact:"Stop $68/mo waste"  },
      { term:"usb hub desktop", spend:94, clicks:112, orders:0, acos:null, action:"Add Negative", impact:"Stop $94/mo waste"  },
      { term:"wired earbuds",   spend:76, clicks:88,  orders:0, acos:null, action:"Add Negative", impact:"Stop $76/mo waste"  },
    ],
    bidRecs: [
      { keyword:"earbuds bluetooth",  matchType:"Broad",  currentBid:1.20, suggestedBid:0.85, currentAcos:31.5, targetAcos:25, reason:"ACoS exceeding target. Reduce broad match bid — capture with phrase/exact instead.", urgency:"TODAY" },
      { keyword:"wireless earphones", matchType:"Phrase", currentBid:1.05, suggestedBid:0.78, currentAcos:29.4, targetAcos:25, reason:"Slightly above target. Trim bid 25% and monitor CVR.", urgency:"THIS_WEEK" },
    ],
  },
  "C003": {
    wastedKws: [],
    bidRecs: [
      { keyword:"anker earbuds", matchType:"Exact", currentBid:0.70, suggestedBid:0.95, currentAcos:17.2, targetAcos:22, reason:"Competitor conquest at 17.2% — well inside break-even. Push more volume.", urgency:"TODAY" },
    ],
  },
  "C004": {
    wastedKws: [],
    bidRecs: [
      { keyword:"retargeting audience", matchType:"Exact", currentBid:1.10, suggestedBid:1.35, currentAcos:7.8, targetAcos:12, reason:"Highest ROAS campaign (11.1x). Increase budget + bids to scale proven audience.", urgency:"TODAY" },
    ],
  },
  "C005": {
    wastedKws: [
      { term:"laptop stand wooden", spend:41, clicks:49, orders:0, acos:null, action:"Reduce Bid",   impact:"Reduce to $0.25 bid"},
      { term:"cheap earphones",     spend:54, clicks:63, orders:0, acos:null, action:"Add Negative", impact:"Stop $54/mo waste"  },
      { term:"usb splitter",        spend:48, clicks:55, orders:0, acos:null, action:"Add Negative", impact:"Stop $48/mo waste"  },
    ],
    bidRecs: [
      { keyword:"monitor light bar", matchType:"Broad", currentBid:0.67, suggestedBid:0.35, currentAcos:41.0, targetAcos:22, reason:"ACoS nearly 2× break-even. Halve broad-match bids immediately. Harvest to exact.", urgency:"TODAY" },
      { keyword:"led monitor light",  matchType:"Exact", currentBid:0.67, suggestedBid:0.50, currentAcos:35.2, targetAcos:22, reason:"Below break-even ACoS. Reduce bid until CVR-adjusted ACoS normalizes.", urgency:"TODAY" },
    ],
  },
  "C006": {
    wastedKws: [],
    bidRecs: [
      { keyword:"wireless earbuds brand video", matchType:"Exact", currentBid:0.74, suggestedBid:0.95, currentAcos:13.2, targetAcos:15, reason:"Video ad performing well. Increase bid to win more top-of-page slots.", urgency:"THIS_WEEK" },
    ],
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

type SortKey = "spend"|"sales"|"acos"|"roas"|"ctr"|"cvr"|"orders";

const STATUS_MAP = {
  healthy:  { label:"Healthy",  variant:"success" as const, Icon:CheckCircle2 },
  warning:  { label:"Warning",  variant:"warning" as const, Icon:AlertTriangle },
  critical: { label:"Critical", variant:"danger"  as const, Icon:XCircle       },
};

const FMT = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits:0, maximumFractionDigits:0 })}`;
const FMT_K = (n: number) => n >= 1000 ? `${(n/1000).toFixed(0)}K` : n.toString();

function AcosBar({ acos, breakEven }: { acos: number; breakEven: number }) {
  const pct = Math.min((acos / (breakEven * 1.5)) * 100, 100);
  return (
    <div className="w-20 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{
        width: `${pct}%`,
        backgroundColor: acos > breakEven ? "#EF4444" : acos > breakEven * 0.85 ? "#F59E0B" : "#10B981",
      }} />
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function PPCOptimizerPage() {
  const [sortKey, setSortKey]     = useState<SortKey>("spend");
  const [sortDir, setSortDir]     = useState<"asc"|"desc">("desc");
  const [selected, setSelected]   = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState<"bids"|"waste">("bids");

  const sorted = useMemo(() => {
    return [...CAMPAIGNS].sort((a, b) => {
      const dir = sortDir === "desc" ? -1 : 1;
      return (a[sortKey] - b[sortKey]) * dir;
    });
  }, [sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const detail = selected ? CAMPAIGN_DETAILS[selected.id] : null;

  const totalSpend  = CAMPAIGNS.reduce((s, c) => s + c.spend, 0);
  const totalSales  = CAMPAIGNS.reduce((s, c) => s + c.sales, 0);
  const totalOrders = CAMPAIGNS.reduce((s, c) => s + c.orders, 0);
  const blendedAcos = ((totalSpend / totalSales) * 100).toFixed(1);
  const totalWaste  = WASTED_KEYWORDS.reduce((s, k) => s + k.spend, 0);

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-2xl font-bold text-[#0F172A]">PPC Optimizer</h2>
        <p className="text-sm text-[#94A3B8] mt-1">Monitor, diagnose, and optimize Amazon Sponsored Ads campaigns</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label:"Total Ad Spend",    value:FMT(totalSpend),   sub:"This month",   icon:DollarSign,   iconBg:"#EFF6FF", iconColor:"#2563EB", change:"+4.2%",       up:true  },
          { label:"Blended ACoS",      value:`${blendedAcos}%`, sub:"Target: 20%",  icon:Target,       iconBg:"#F0FDF4", iconColor:"#10B981", change:"-1.8pp",      up:true  },
          { label:"Total Ad Orders",   value:totalOrders.toLocaleString(), sub:`${FMT(Math.round(totalSales/totalOrders))} avg order`, icon:TrendingUp, iconBg:"#FDF4FF", iconColor:"#9333EA", change:"+11.2%", up:true },
          { label:"Identified Waste",  value:FMT(totalWaste),   sub:`${WASTED_KEYWORDS.length} keywords to fix`, icon:AlertTriangle, iconBg:"#FFF1F2", iconColor:"#EF4444", change:"Action needed", up:false },
        ].map(({ label, value, sub, icon: Icon, iconBg, iconColor, change, up }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg" style={{ backgroundColor: iconBg }}>
                <Icon size={17} style={{ color: iconColor }} />
              </div>
              <span className={cn(
                "flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
                up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
              )}>
                {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {change}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] font-medium">{label}</p>
            <p className="text-2xl font-bold text-[#0F172A] mt-0.5 tabular-nums">{value}</p>
            <p className="text-xs text-[#CBD5E1] mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Wasted Spend Banner */}
      <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-4">
        <AlertTriangle size={17} className="text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-700">
            ${totalWaste.toLocaleString()} in wasted ad spend identified this month
          </p>
          <p className="text-xs text-red-500 mt-0.5">
            {WASTED_KEYWORDS.length} search terms with zero orders. Click any campaign row to view recommended fixes.
          </p>
        </div>
        <Button variant="danger" size="sm" onClick={() => setSelected(CAMPAIGNS.find((c) => c.id === "C005") ?? null)}>
          View Fixes
        </Button>
      </div>

      {/* Campaign Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">Campaign Performance</h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">Click any row to open AI bid recommendations</p>
          </div>
          <button
            onClick={() => {
              // Heuristic: open the most critical campaign drawer.
              setSelected(CAMPAIGNS.find((c) => c.id === "C005") ?? null);
              setActiveTab("bids");
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white rounded-lg
                       hover:opacity-90 transition-opacity active:scale-95"
            style={{ backgroundColor: "#2563EB" }}
          >
            <Zap size={13} />Auto-Optimize All
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] text-left border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Campaign</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Type</th>
                <SortTh label="Spend"  col="spend"  active={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Sales"  col="sales"  active={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="ACoS"   col="acos"   active={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="ROAS"   col="roas"   active={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Orders" col="orders" active={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="CVR"    col="cvr"    active={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {sorted.map((c) => {
                const s = STATUS_MAP[c.status];
                const Icon = s.Icon;
                return (
                  <tr key={c.id} onClick={() => setSelected(c)}
                    className="cursor-pointer transition-all duration-100 group
                               hover:bg-[#EFF6FF] hover:shadow-[inset_0_0_0_1px_rgba(37,99,235,0.12)]">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Target size={13} className="text-[#CBD5E1] shrink-0" />
                        <span className="font-medium text-[#0F172A] text-sm">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><Badge variant="outline" className="text-[11px]">{c.type}</Badge></td>
                    <td className="px-4 py-3.5 tabular-nums font-medium text-[#334155]">{FMT(c.spend)}</td>
                    <td className="px-4 py-3.5 tabular-nums font-medium text-[#334155]">{FMT(c.sales)}</td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <span className={cn("text-xs font-bold tabular-nums",
                          c.acos > c.breakEvenAcos ? "text-red-500" : c.acos > c.breakEvenAcos * 0.85 ? "text-amber-600" : "text-emerald-600")}>
                          {c.acos.toFixed(1)}%
                        </span>
                        <AcosBar acos={c.acos} breakEven={c.breakEvenAcos} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 tabular-nums font-semibold text-[#0F172A]">{c.roas.toFixed(1)}x</td>
                    <td className="px-4 py-3.5 tabular-nums text-[#334155]">{c.orders}</td>
                    <td className="px-4 py-3.5 tabular-nums text-[#64748B]">{c.cvr.toFixed(1)}%</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={s.variant} className="flex items-center gap-1 w-fit">
                        <Icon size={11} />{s.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <span className="text-xs text-[#94A3B8]">{CAMPAIGNS.length} campaigns · Last 30 days</span>
          <div className="flex items-center gap-4 text-xs text-[#94A3B8]">
            <span>Total Spend: <strong className="text-[#0F172A]">{FMT(totalSpend)}</strong></span>
            <span>Total Sales: <strong className="text-[#0F172A]">{FMT(totalSales)}</strong></span>
            <span>Blended ACoS: <strong className={parseFloat(blendedAcos) > 25 ? "text-red-500" : "text-emerald-600"}>{blendedAcos}%</strong></span>
          </div>
        </div>
      </div>

      {/* Campaign Drawer */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent width={580}>
          {selected && detail && (
            <>
              <SheetHeader>
                <div className="flex-1 min-w-0">
                  <div className={cn("h-1 rounded-full mb-3 w-16",
                    selected.status === "healthy" ? "bg-emerald-500"
                    : selected.status === "warning" ? "bg-amber-500" : "bg-red-500")} />
                  <SheetTitle>{selected.name}</SheetTitle>
                  <SheetDescription>
                    {selected.type}
                    <span className="mx-1.5 text-[#CBD5E1]">·</span>
                    ACoS {selected.acos}%
                    <span className="mx-1.5 text-[#CBD5E1]">·</span>
                    Break-even {selected.breakEvenAcos}%
                  </SheetDescription>
                </div>
                <SheetCloseButton />
              </SheetHeader>

              <SheetBody>

                {/* Stats grid */}
                <section>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label:"Spend",       value:FMT(selected.spend)      },
                      { label:"Sales",       value:FMT(selected.sales)      },
                      { label:"ROAS",        value:`${selected.roas.toFixed(1)}x` },
                      { label:"Orders",      value:selected.orders.toString()},
                      { label:"Impressions", value:FMT_K(selected.impressions)},
                      { label:"Clicks",      value:selected.clicks.toLocaleString()},
                      { label:"CTR",         value:`${selected.ctr.toFixed(2)}%`},
                      { label:"CVR",         value:`${selected.cvr.toFixed(1)}%`},
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2.5">
                        <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wide">{label}</p>
                        <p className="text-sm font-bold text-[#0F172A] tabular-nums mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* ACoS gauge */}
                  <div className="mt-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#64748B]">ACoS vs Break-even</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-[#64748B]">
                          <span className="w-2 h-2 rounded-full bg-[#2563EB] inline-block" />ACoS {selected.acos}%
                        </span>
                        <span className="flex items-center gap-1 text-xs text-[#64748B]">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />B/E {selected.breakEvenAcos}%
                        </span>
                      </div>
                    </div>
                    <div className="relative h-3 bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{
                        width: `${Math.min((selected.acos / (selected.breakEvenAcos * 1.5)) * 100, 100)}%`,
                        backgroundColor: selected.acos > selected.breakEvenAcos ? "#EF4444"
                          : selected.acos > selected.breakEvenAcos * 0.85 ? "#F59E0B" : "#10B981",
                      }} />
                      <div className="absolute inset-y-0 w-0.5 bg-emerald-500"
                        style={{ left:`${(selected.breakEvenAcos / (selected.breakEvenAcos * 1.5)) * 100}%` }} />
                    </div>
                    <p className="text-xs text-[#64748B] mt-1.5">
                      {selected.acos < selected.breakEvenAcos
                        ? `${(selected.breakEvenAcos - selected.acos).toFixed(1)}pp headroom — consider scaling budget`
                        : `${(selected.acos - selected.breakEvenAcos).toFixed(1)}pp over break-even — reduce bids`}
                    </p>
                  </div>
                </section>

                {/* Tabs */}
                <section>
                  <div className="flex gap-1 border-b border-[#E2E8F0]">
                    {(["bids","waste"] as const).map((tab) => (
                      <button key={tab} onClick={() => setActiveTab(tab)}
                        className={cn(
                          "px-4 py-2 text-xs font-semibold capitalize transition-colors border-b-2 -mb-px",
                          activeTab === tab
                            ? "border-[#2563EB] text-[#2563EB]"
                            : "border-transparent text-[#94A3B8] hover:text-[#64748B]"
                        )}>
                        {tab === "bids" ? "Bid Recommendations" : `Wasted Spend${detail.wastedKws.length > 0 ? ` (${detail.wastedKws.length})` : ""}`}
                      </button>
                    ))}
                  </div>

                  {activeTab === "bids" && (
                    <div className="space-y-3 pt-3">
                      {detail.bidRecs.length === 0 && (
                        <p className="text-sm text-[#94A3B8] py-6 text-center">No bid changes needed — this campaign is well optimized.</p>
                      )}
                      {detail.bidRecs.map((rec, i) => (
                        <div key={i} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3
                                                 hover:border-[#BFDBFE] hover:bg-[#EFF6FF] transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#0F172A]">{rec.keyword}</p>
                              <Badge variant="outline" className="text-[11px] mt-1">{rec.matchType}</Badge>
                            </div>
                            <Badge variant={rec.urgency === "TODAY" ? "danger" : "warning"}
                              className="shrink-0 flex items-center gap-1">
                              <Clock size={10} />
                              {rec.urgency === "TODAY" ? "Today" : "This Week"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-[#94A3B8] text-xs">Current</span>
                            <span className="font-bold text-[#0F172A]">${rec.currentBid.toFixed(2)}</span>
                            {rec.suggestedBid > rec.currentBid
                              ? <TrendingUp size={13} className="text-emerald-500" />
                              : <TrendingDown size={13} className="text-red-500" />}
                            <span className="text-[#94A3B8] text-xs">Suggested</span>
                            <span className={cn("font-bold text-sm",
                              rec.suggestedBid > rec.currentBid ? "text-emerald-600" : "text-red-500")}>
                              ${rec.suggestedBid.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-[#64748B] leading-snug">{rec.reason}</p>
                          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                            <span>Current ACoS: <strong className="text-[#334155]">{rec.currentAcos}%</strong></span>
                            <span>·</span>
                            <span>Target: <strong className="text-[#334155]">{rec.targetAcos}%</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "waste" && (
                    <div className="space-y-3 pt-3">
                      {detail.wastedKws.length === 0 && (
                        <div className="flex items-center gap-3 py-6 justify-center text-emerald-600">
                          <CheckCircle2 size={17} />
                          <p className="text-sm font-medium">No wasted keywords — campaign is clean.</p>
                        </div>
                      )}
                      {detail.wastedKws.map((kw, i) => (
                        <div key={i} className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-[#0F172A] font-mono">{kw.term}</p>
                            <p className="text-xs text-[#64748B] mt-0.5">${kw.spend} spent · {kw.clicks} clicks · 0 orders</p>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge variant="danger" className="mb-1">{kw.action}</Badge>
                            <p className="text-xs text-emerald-600 font-semibold">{kw.impact}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

              </SheetBody>

              <SheetFooter>
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={() => {
                    // Front-end only demo: close the drawer.
                    setSelected(null);
                  }}
                >
                  <Sparkles size={14} />Apply All Recommendations
                </Button>
                <Button variant="outline" size="md" onClick={() => setSelected(null)}>Close</Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
}

// ── SortTh ────────────────────────────────────────────────────────────────

function SortTh({ label, col, active, dir, onSort }: {
  label: string; col: SortKey; active: SortKey; dir: "asc"|"desc"; onSort: (k: SortKey) => void;
}) {
  const isActive = active === col;
  return (
    <th className={cn(
      "px-4 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors hover:text-[#0F172A]",
      isActive ? "text-[#2563EB]" : "text-[#94A3B8]"
    )} onClick={() => onSort(col)}>
      <span className="flex items-center gap-1">
        {label}
        {isActive
          ? dir === "desc" ? <ChevronDown size={13} /> : <ChevronUp size={13} />
          : <ChevronsUpDown size={12} className="opacity-40" />}
      </span>
    </th>
  );
}
