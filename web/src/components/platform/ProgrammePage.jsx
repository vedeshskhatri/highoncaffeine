import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Download,
  CheckCircle2,
  ChevronRight,
  IndianRupee,
  Layers,
  ArrowUpRight,
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

  // Budget in INR (Default: ₹1.4 Crore)
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
    return (
      <div className="programme-loading-state">
        <div className="telemetry-spinner" />
        <span>Optimizing portfolio retrofit allocation across high-altitude sites...</span>
      </div>
    );
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
          <button type="button" className="btn-secondary" onClick={handleExportCsv}>
            <Download size={14} />
            <span>Export Procurement Pack</span>
          </button>
        </div>
      </div>

      {/* Budget Selector Card */}
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

        <div className="budget-preset-strip">
          {PRESETS.map(p => (
            <button
              key={p.value}
              type="button"
              className={`preset-btn ${budget === p.value ? 'active' : ''}`}
              onClick={() => setBudget(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Executive Headline Banner */}
      <div className="programme-headline-banner">
        <div className="headline-icon-box">
          <TrendingUp size={22} />
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
        <div className="card-header-block">
          <h3 className="card-title-text">Cumulative Return Curve (Spend vs Fuel Avoided)</h3>
          <p className="card-sub-text">
            Demonstrates the diminishing returns curve across candidate outposts. The vertical marker indicates the ₹{(budget / 100000.0).toFixed(0)} Lakh sanctioned limit.
          </p>
        </div>

        <div className="cumulative-chart-wrapper">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1E40AF" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="spend_lakh"
                stroke="#64748B"
                fontSize={12}
                tickLine={false}
                tickFormatter={v => `₹${v}L`}
              />
              <YAxis
                stroke="#64748B"
                fontSize={12}
                tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(1)}k L`}
              />
              <Tooltip
                formatter={(val, name) => [
                  name === 'litres_saved' ? `${val.toLocaleString()} L / yr` : val,
                  'Cumulative Avoided Fuel',
                ]}
                labelFormatter={l => `Cumulative Spend: ₹${l} Lakh`}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '10px',
                  boxShadow: '0 4px 16px rgba(15,23,42,0.08)',
                  fontSize: '12.5px',
                }}
              />
              <ReferenceLine
                x={budgetLakh}
                stroke="#0F172A"
                strokeDasharray="4 4"
                label={{ value: 'Sanctioned Budget', fill: '#0F172A', fontSize: 11, position: 'top' }}
              />
              <Area
                type="monotone"
                dataKey="litres_saved"
                stroke="#1E40AF"
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
        <div className="card-header-block">
          <h3 className="card-title-text">Ranked Procurement Schedule</h3>
          <p className="card-sub-text">
            Ordered strictly by fuel savings efficiency. Interventions marked with a green badge fit within the available budget.
          </p>
        </div>

        <div className="table-wrapper-spacious">
          <table className="spacious-data-table">
            <thead>
              <tr>
                <th>RANK</th>
                <th>TARGET POST</th>
                <th>INTERVENTION PACKAGE</th>
                <th>CAPEX (₹)</th>
                <th>BASIS</th>
                <th>ANNUAL FUEL SAVED</th>
                <th>EFFICIENCY (L / ₹1k)</th>
                <th>CUMULATIVE SPEND</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {programme?.items?.map(item => (
                <tr
                  key={`${item.site_id}-${item.rank}`}
                  className={`clickable-row ${item.funded ? 'row-funded' : 'row-unfunded'}`}
                  onClick={() => navigate(`/sites/${item.site_id}`)}
                >
                  <td className="mono rank-cell">#{item.rank}</td>
                  <td>
                    <div className="post-cell">
                      <span className="post-name">{item.site_name}</span>
                      <span className="post-sector">{item.district}</span>
                    </div>
                  </td>
                  <td className="intervention-cell">{item.intervention}</td>
                  <td className="mono">₹{item.cost_inr.toLocaleString()}</td>
                  <td>
                    <span className="estimate-chip">{item.cost_basis}</span>
                  </td>
                  <td className="mono fuel-cell">
                    {item.litres_saved_per_year.toLocaleString()} L/yr
                  </td>
                  <td className="mono font-semibold">
                    {item.litres_per_1000_inr.toFixed(2)}
                  </td>
                  <td className="mono text-muted">
                    ₹{(item.cumulative_cost_inr / 100000.0).toFixed(2)} L
                  </td>
                  <td>
                    {item.funded ? (
                      <span className="status-badge status-badge-comfort">
                        <CheckCircle2 size={12} />
                        <span>Funded</span>
                      </span>
                    ) : (
                      <span className="status-badge status-badge-neutral">
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
