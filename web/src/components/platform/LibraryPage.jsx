import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Layers,
  Plus,
  ArrowRight,
  GitBranch,
  CheckCircle2,
  Columns,
  Building,
} from 'lucide-react';
import './LibraryPage.css';

export default function LibraryPage() {
  const { estate } = useOutletContext();
  const navigate = useNavigate();

  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  // Apply to site modal
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [sites, setSites] = useState([]);
  const [targetSiteId, setTargetSiteId] = useState('');
  const [applySuccess, setApplySuccess] = useState(null);

  const fetchDesigns = () => {
    setLoading(true);
    fetch('/designs')
      .then(r => r.json())
      .then(data => {
        setDesigns(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDesigns();
    fetch(`/sites?estate=${encodeURIComponent(estate)}`)
      .then(r => r.json())
      .then(data => {
        setSites(Array.isArray(data) ? data : []);
        if (data.length > 0) setTargetSiteId(data[0].id);
      })
      .catch(() => {});
  }, [estate]);

  // Handle Apply
  const handleApplyToSite = async () => {
    if (!selectedDesign || !targetSiteId) return;
    try {
      const res = await fetch(`/designs/${selectedDesign.id}/apply-to/${targetSiteId}`, {
        method: 'POST',
      });
      if (res.ok) {
        setApplySuccess(`Applied ${selectedDesign.name} to site successfully! Re-evaluated.`);
        setTimeout(() => {
          setApplyModalOpen(false);
          setApplySuccess(null);
          navigate(`/sites/${targetSiteId}`);
        }, 1500);
      }
    } catch {
      alert('Failed to apply design.');
    }
  };

  // Toggle selection for comparison
  const toggleCompare = (designId) => {
    if (selectedForCompare.includes(designId)) {
      setSelectedForCompare(selectedForCompare.filter(id => id !== designId));
    } else {
      if (selectedForCompare.length >= 2) {
        setSelectedForCompare([selectedForCompare[1], designId]);
      } else {
        setSelectedForCompare([...selectedForCompare, designId]);
      }
    }
  };

  if (loading) {
    return <div className="loading-state">Loading standard drawings catalog...</div>;
  }

  const compareA = designs.find(d => d.id === selectedForCompare[0]);
  const compareB = designs.find(d => d.id === selectedForCompare[1]);

  return (
    <div className="library-page">
      {/* 1. Header */}
      <div className="library-header">
        <div>
          <h2 className="library-title">Standard Drawings Library</h2>
          <p className="library-subtitle">
            Named, versioned, status-tagged shelter build-up standards ready for single or multi-post deployment.
          </p>
        </div>

        <div className="library-header-actions">
          {selectedForCompare.length === 2 && (
            <button
              type="button"
              className="primary-btn"
              onClick={() => setCompareModalOpen(true)}
            >
              <Columns size={14} />
              <span>Compare 2 Designs Side-by-Side</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Drawings Grid */}
      <div className="drawings-grid">
        {designs.map(d => {
          const isSelected = selectedForCompare.includes(d.id);
          const env = d.design_json?.envelope || {};
          const geom = d.design_json?.geometry || {};
          const area = (geom.length_m * geom.width_m).toFixed(1);

          return (
            <div key={d.id} className="drawing-card">
              <div className="drawing-card-top">
                <div className="drawing-title-group">
                  <span className="revision-pill mono">Rev {d.revision}</span>
                  <span className={`status-pill pill-${d.status}`}>{d.status}</span>
                </div>
                <label className="compare-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCompare(d.id)}
                  />
                  <span>Compare</span>
                </label>
              </div>

              <h3 className="drawing-name">{d.name}</h3>
              <span className="drawing-author">Author: {d.author}</span>

              {/* Build-up Specification Summary */}
              <div className="drawing-specs">
                <div className="spec-row">
                  <span className="spec-k">Dimensions:</span>
                  <span className="spec-v mono">{geom.length_m}m × {geom.width_m}m × {geom.height_m}m ({area} m²)</span>
                </div>
                <div className="spec-row">
                  <span className="spec-k">Wall Layers:</span>
                  <span className="spec-v">
                    {env.walls?.map(w => `${w.material} (${w.thickness_m * 100}cm)`).join(' + ') || 'Standard build'}
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-k">Roof Build-up:</span>
                  <span className="spec-v">
                    {env.roof?.map(r => `${r.material} (${r.thickness_m * 100}cm)`).join(' + ') || 'Standard build'}
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-k">Active Deployment:</span>
                  <span className="spec-v mono font-bold text-sage">
                    {d.active_sites_count || 0} posts currently built
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="drawing-card-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setSelectedDesign(d);
                    setApplyModalOpen(true);
                  }}
                >
                  <Building size={14} />
                  <span>Rollout to Site...</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Apply to Site Modal */}
      {applyModalOpen && selectedDesign && (
        <div className="modal-backdrop" onClick={() => setApplyModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Rollout Standard Drawing</h3>
            <p className="modal-desc">
              Deploying <strong>{selectedDesign.name} (Rev {selectedDesign.revision})</strong> to a forward post.
              This will update the site's envelope specification and immediately run the transient solver.
            </p>

            {applySuccess ? (
              <div className="eval-progress-banner">
                <CheckCircle2 size={16} />
                <span>{applySuccess}</span>
              </div>
            ) : (
              <div className="form-field">
                <label>Select Target Outpost ({estate} Estate):</label>
                <select
                  value={targetSiteId}
                  onChange={e => setTargetSiteId(e.target.value)}
                  className="site-select-input"
                >
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.district} · {s.altitude_m}m)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setApplyModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleApplyToSite}
                disabled={Boolean(applySuccess)}
              >
                Confirm & Re-evaluate Site
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Side-by-Side Comparison Modal */}
      {compareModalOpen && compareA && compareB && (
        <div className="modal-backdrop" onClick={() => setCompareModalOpen(false)}>
          <div className="modal-content compare-modal-wide" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Side-by-Side Standard Drawings Comparison</h3>
            <p className="modal-desc">
              Comparing thermal specifications under identical high-altitude meteorological driving weather.
            </p>

            <div className="compare-grid">
              <div className="compare-col">
                <span className="revision-pill mono">Rev {compareA.revision}</span>
                <h4>{compareA.name}</h4>
                <span className="author-tag">Author: {compareA.author}</span>
                <div className="compare-details">
                  <div className="detail-item">
                    <span>Floor Area:</span>
                    <strong className="mono">
                      {(compareA.design_json?.geometry?.length_m * compareA.design_json?.geometry?.width_m).toFixed(1)} m²
                    </strong>
                  </div>
                  <div className="detail-item">
                    <span>Wall Construction:</span>
                    <span>{compareA.design_json?.envelope?.walls?.map(w => `${w.material} ${w.thickness_m*100}cm`).join(' + ')}</span>
                  </div>
                  <div className="detail-item">
                    <span>Roof Construction:</span>
                    <span>{compareA.design_json?.envelope?.roof?.map(r => `${r.material} ${r.thickness_m*100}cm`).join(' + ')}</span>
                  </div>
                  <div className="detail-item">
                    <span>Glazing:</span>
                    <span>{compareA.design_json?.openings?.[0]?.glazing} ({compareA.design_json?.openings?.[0]?.area_m2} m²)</span>
                  </div>
                </div>
              </div>

              <div className="compare-col">
                <span className="revision-pill mono">Rev {compareB.revision}</span>
                <h4>{compareB.name}</h4>
                <span className="author-tag">Author: {compareB.author}</span>
                <div className="compare-details">
                  <div className="detail-item">
                    <span>Floor Area:</span>
                    <strong className="mono">
                      {(compareB.design_json?.geometry?.length_m * compareB.design_json?.geometry?.width_m).toFixed(1)} m²
                    </strong>
                  </div>
                  <div className="detail-item">
                    <span>Wall Construction:</span>
                    <span>{compareB.design_json?.envelope?.walls?.map(w => `${w.material} ${w.thickness_m*100}cm`).join(' + ')}</span>
                  </div>
                  <div className="detail-item">
                    <span>Roof Construction:</span>
                    <span>{compareB.design_json?.envelope?.roof?.map(r => `${r.material} ${r.thickness_m*100}cm`).join(' + ')}</span>
                  </div>
                  <div className="detail-item">
                    <span>Glazing:</span>
                    <span>{compareB.design_json?.openings?.[0]?.glazing} ({compareB.design_json?.openings?.[0]?.area_m2} m²)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setCompareModalOpen(false)}
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
