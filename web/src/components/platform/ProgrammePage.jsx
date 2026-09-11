import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  IndianRupee,
  Flame,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import './ProgrammePage.css';

export default function ProgrammePage() {
  const { estate } = useOutletContext();
  const navigate = useNavigate();

  // Budget in INR (Default: ₹1.4 Crore per prompt user 2 persona)
  const [budget, setBudget] = useState(14000000);
  const [programme, setProgramme] = useState(null);
  const [loading, setLoading] = useState(true);

  // Preset quick budgets
  const PRESETS = [
    { label: '₹50 Lakh', value: 5000000 },
    { label: '₹1.0 Crore', value: 10000000 },
    { label: '₹1.4 Crore (Sanctioned)', value: 14000000 },
    { label: '₹2.5 Crore', value: 25000000 },
  ];

  const fetchProgramme = () => {
    setLoading(true);
    fetch('http://127.0.0.1:8000/programme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estate, budget_inr: budget }),
    })
      .then(r => r.json())
      .then(data => {
        setProgramme(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchProgramme();
  }, [estate, budget]);

  // Export programme to CSV
  const handleExportCsv = () => {
    if (!programme?.items) return;
    const headers = 'Rank,Site,District,Intervention,Cost_INR,Litres_Saved_Yr,Thermal_Return_L_per_1k,Funded\n';
    const rows = programme.items
      .map(
        i =>
          `${i.rank},"${i.site_name}",${i.district},"${i.intervention}",${i.cost_inr},${i.litres_saved_per_year},${i.litres_per_1000_inr},${i.funded}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `therma_programme_${estate.toLowerCase().replace(' ', '_')}.csv`;
    a.click();
  };

  if (loading && !programme) {
    return <div className="loading-state">Optimizing portfolio retrofit allocation...</div>;
  }

  // Build cumulative chart data
  const chartData = programme?.items?.map(i => ({
    spend_lakh: Number((i.cumulative_cost_inr / 100000.0).toFixed(1)),
    litres_saved: Math.round(i.cumulative_litres_saved),
    site: i.site_name,
    funded: i.funded,
  })) || [];

  const budgetLakh = Number((budget / 100000.0).toFixed(1));

  return (
    <div className="programme-page">
      {/* 1. Header & Budget Allocation Controls */}
      <div className="programme-header">
        <div>
          <h2 className="programme-title">Retrofit Programme Planner</h2>
          <p className="programme-subtitle">
            Algorithmic portfolio allocation ranking interventions by kerosene litres avoided per rupee spent.
          </p>
        </div>

        <div className="programme-header-actions">
          <button type="button" className="secondary-btn" onClick={handleExportCsv}>
            <Download size={14} />
            <span>Export Procurement Pack</span>
          </button>
        </div>
      </div>

      {/* Budget Selector Strip */}
      <div className="budget-control-card">
        <div className="budget-control-left">
          <span className="budget-control-label">SANCTIONED RETROFIT BUDGET</span>
          <div className="budget-input-wrapper">
            <span className="currency-prefix">₹</span>
            <input
              type="number"
              step="100000"
              className="budget-number-input mono"
              value={budget}
              onChange={e => setBudget(Number(e.target.value) || 0)}
            />
            <span className="budget-human-label">
              (₹{(budget / 10000000.0).toFixed(2)} Crore)
            </span>
          </div>
        </div>

        <div className="budget-preset-chips">
          {PRESETS.map(p => (
            <button
              key={p.value}
              type="button"
              className={`preset-chip ${budget === p.value ? 'active' : ''}`}
              onClick={() => setBudget(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Headline Pitch Banner per Phase P4 */}
      <div className="programme-headline-banner">
        <div className="headline-icon-box">
          <TrendingUp size={22} className="text-orange" />
        </div>
        <div className="headline-text-content">
          <h3 className="headline-main-text">{programme?.headline}</h3>
          <span className="headline-meta">
            Coverage: {programme?.coverage_str} · Ranked greedily by litres saved per ₹1,000 capex
          </span>
        </div>
      </div>

      {/* 3. Cumulative Return Curve (Spend vs Fuel Avoided) */}
      <div className="programme-card">
        <div className="card-header-flex">
          <div>
            <h3 className="card-heading">Cumulative Return Curve (Spend vs Fuel Avoided)</h3>
            <span className="card-sub">
              Demonstrates diminishing returns curve across candidate post interventions. The vertical dotted line marks your ₹{(budget / 100000.0).toFixed(0)} Lakh budget limit.
            </span>
          </div>
        </div>

        <div className="cumulative-chart-wrapper">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--orange)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--orange)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="spend_lakh"
                stroke="var(--espresso-70)"
                fontSize={12}
                tickFormatter={v => `₹${v}L`}
              />
              <YAxis
                stroke="var(--espresso-70)"
                fontSize={12}
                tickFormatter={v => `${v / 1000}k L`}
              />
              <Tooltip
                formatter={(val, name) => [
                  name === 'litres_saved' ? `${val.toLocaleString()} L/yr` : val,
                  'Cumulative Avoided Fuel',
                ]}
                labelFormatter={l => `Cumulative Spend: ₹${l} Lakh`}
                contentStyle={{ backgroundColor: 'var(--cream)', borderColor: 'var(--rule)' }}
              />
              <ReferenceLine
                x={budgetLakh}
                stroke="var(--ice)"
                strokeDasharray="4 4"
                label={{ value: 'Budget Limit', fill: 'var(--ice)', fontSize: 11, position: 'top' }}
              />
              <Area
                type="monotone"
                dataKey="litres_saved"
                stroke="var(--orange)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#curveGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Ranked Programme Procurement Table */}
      <div className="programme-card">
        <div className="card-header-flex">
          <div>
            <h3 className="card-heading">Ranked Procurement Schedule</h3>
            <span className="card-sub">
              Ordered strictly by fuel savings efficiency. Interventions marked with a green badge fit within the available budget.
            </span>
          </div>
        </div>

        <div className="programme-table-wrapper">
          <table className="programme-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Target Post</th>
                <th>Intervention Package</th>
                <th>Cost (₹)</th>
                <th>Cost Basis</th>
                <th>Annual Fuel Saved</th>
                <th>Return (L / ₹1k)</th>
                <th>Cumulative Spend</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {programme?.items?.map(item => (
                <tr
                  key={`${item.site_id}-${item.rank}`}
                  className={`programme-row ${item.funded ? 'row-funded' : 'row-unfunded'}`}
                  onClick={() => navigate(`/sites/${item.site_id}`)}
                >
                  <td className="mono rank-cell">#{item.rank}</td>
                  <td>
                    <span className="table-site-name">{item.site_name}</span>
                    <span className="table-district-name">{item.district}</span>
                  </td>
                  <td>{item.intervention}</td>
                  <td className="mono">₹{item.cost_inr.toLocaleString()}</td>
                  <td>
                    <span className="cost-basis-chip">{item.cost_basis}</span>
                  </td>
                  <td className="mono text-orange">
                    {item.litres_saved_per_year.toLocaleString()} L/yr
                  </td>
                  <td className="mono font-bold">
                    {item.litres_per_1000_inr.toFixed(2)}
                  </td>
                  <td className="mono">
                    ₹{(item.cumulative_cost_inr / 100000.0).toFixed(2)} L
                  </td>
                  <td>
                    {item.funded ? (
                      <span className="status-badge-funded">
                        <CheckCircle2 size={12} />
                        <span>Funded</span>
                      </span>
                    ) : (
                      <span className="status-badge-unfunded">
                        <span>Above Budget</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
