import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Boxes, MapPin, Clock, Truck, ShieldCheck, AlertCircle } from 'lucide-react';
import './MaterialsPage.css';

export default function MaterialsPage() {
  const { estate } = useOutletContext();
  const [district, setDistrict] = useState('Leh');
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  const DISTRICT_OPTIONS = ['Leh', 'Chushul', 'DBO', 'Kargil', 'Rasuwa'];

  useEffect(() => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/materials/availability?district=${encodeURIComponent(district)}`)
      .then(r => r.json())
      .then(data => {
        setMaterials(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [district]);

  return (
    <div className="materials-page">
      {/* 1. Header */}
      <div className="materials-header">
        <div>
          <h2 className="materials-title">Materials & Regional Logistics Realities</h2>
          <p className="materials-subtitle">
            Catalog with availability, lead times, and transport constraints across Himalayan forward outposts.
          </p>
        </div>

        {/* District Switcher */}
        <div className="district-filter-strip">
          <span className="filter-lead">Active Supply Sector:</span>
          <div className="district-pill-group">
            {DISTRICT_OPTIONS.map(d => (
              <button
                key={d}
                type="button"
                className={`district-pill ${district === d ? 'active' : ''}`}
                onClick={() => setDistrict(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Materials Table Card */}
      <div className="materials-card">
        <table className="materials-table">
          <thead>
            <tr>
              <th>Material Name</th>
              <th>Category</th>
              <th>Conductivity (k)</th>
              <th>Cost / m³</th>
              <th>Cost Basis</th>
              <th>Local Availability</th>
              <th>Transit Lead Time</th>
              <th>Logistics & Transport Constraint</th>
              <th>Sourced Cite</th>
            </tr>
          </thead>
          <tbody>
            {materials.map(m => (
              <tr key={m.id}>
                <td className="font-bold">{m.name}</td>
                <td>
                  <span className="category-chip">{m.category}</span>
                </td>
                <td className="mono">{m.k.toFixed(3)} W/m·K</td>
                <td className="mono">
                  {m.cost_per_m3 ? `₹${m.cost_per_m3.toLocaleString()}` : '—'}
                </td>
                <td>
                  <span className={`cost-basis-chip basis-${m.cost_basis}`}>
                    [{m.cost_basis}]
                  </span>
                </td>
                <td>
                  {m.locally_available ? (
                    <span className="avail-tag tag-yes">Local Stock</span>
                  ) : (
                    <span className="avail-tag tag-no">Air/Convoy Only</span>
                  )}
                </td>
                <td className="mono">
                  <strong>{m.lead_time_days}</strong> days
                </td>
                <td className="constraint-cell">{m.transport_constraint}</td>
                <td className="cite-cell">{m.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
