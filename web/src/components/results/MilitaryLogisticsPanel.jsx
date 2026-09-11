import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Truck, Plane, TrendingDown, AlertOctagon, Fuel, IndianRupee, Snowflake } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';

/**
 * MilitaryLogisticsPanel.jsx
 * DRDO / High-Altitude Forward Post Tactical Fuel Logistics & Winter Stocking Engine.
 * 
 * Computes:
 *  - Helicopter sorties (Mi-17 / ALH @ 1,200 L/sortie)
 *  - 4x4 High-Mobility Truck Convoys (ALS 2.5T @ 2,000 L/convoy)
 *  - Delivered defense logistics cost @ ₹2,400/L (Ladakh/Siachen high-pass multiplier)
 *  - 180-Day Winter Isolation Stocking Mass (kg)
 *  - High-Pass Tactical Risk Reduction Score
 */
export default function MilitaryLogisticsPanel({ summary, location, occupancy }) {
  const impact = summary?.impact || {};
  const mil = impact?.military_logistics || {};
  const backup = summary?.backup_heat || {};

  const altitude_m = location?.altitude_m ?? 3500;
  const occupants = occupancy?.people ?? 8;
  const winterDays = mil.winter_days ?? 180;
  
  const dailyLitres = backup.kerosene_litres_per_night ?? (impact.kerosene_litres_per_year ? (impact.kerosene_litres_per_year / 365) : 0.9);
  const totalLitres = mil.total_winter_fuel_litres ?? Math.round(dailyLitres * winterDays);
  const fuelMassKg = mil.total_fuel_mass_kg ?? Math.round(totalLitres * 0.80);
  
  const deliveredCostInr = mil.delivered_defense_cost_inr ?? Math.round(totalLitres * 2400);
  const defenseSavingsInr = mil.defense_budget_saved_inr ?? Math.round(Math.max(0, (22.0 * winterDays - totalLitres) * 2400));
  
  const heliSorties = mil.heli_sorties_needed ?? (totalLitres > 0 ? (totalLitres / 1200).toFixed(1) : 0);
  const heliSaved = mil.heli_sorties_saved ?? (Math.max(0, 22.0 * winterDays - totalLitres) / 1200).toFixed(1);
  
  const convoyTrucks = mil.convoy_trucks_needed ?? (totalLitres > 0 ? (totalLitres / 2000).toFixed(1) : 0);
  const convoySaved = mil.convoy_trucks_saved ?? (Math.max(0, 22.0 * winterDays - totalLitres) / 2000).toFixed(1);
  
  const riskReduction = mil.tactical_risk_reduction_score ?? Math.min(96, Math.round(((22.0 * winterDays - totalLitres) / (22.0 * winterDays)) * 100));

  const animSavings = useCountUp(defenseSavingsInr, 1000, 0);
  const animHeliSaved = useCountUp(Number(heliSaved), 800, 1);
  const animConvoySaved = useCountUp(Number(convoySaved), 800, 1);
  const animStockingMass = useCountUp(fuelMassKg, 900, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        background: 'linear-gradient(145deg, #0b1329 0%, #0f172a 50%, #1e293b 100%)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: 'var(--space-4, 16px)',
        boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.35)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Banner & Tactical Classification Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            padding: '6px',
            borderRadius: 'var(--radius-md, 8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Shield size={18} color="#38bdf8" />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 14,
              fontWeight: 700,
              color: '#f8fafc',
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              Tactical Forward Post Fuel Logistics & Winter Stocking
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                background: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                padding: '2px 8px',
                borderRadius: 999,
                border: '1px solid rgba(56, 189, 248, 0.35)',
              }}>
                DRDO PS-26051 DEFENSE OPTIMIZED
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              180-Day Winter Isolation Stocking Analysis · Post Elevation: {altitude_m}m ASL · Garrison: {occupants} Troops
            </div>
          </div>
        </div>

        {/* Tactical Risk Score Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.35)',
          padding: '4px 10px',
          borderRadius: 8,
        }}>
          <TrendingDown size={14} color="#4ade80" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#4ade80' }}>
            {riskReduction}% High-Pass Convoy Risk Reduction
          </span>
        </div>
      </div>

      {/* Grid of 4 Tactical Key Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-3, 12px)',
        marginBottom: 14,
      }}>
        {/* Metric 1: Defense Budget Saved */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          padding: '10px 12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
              Delivered Fuel Savings
            </span>
            <IndianRupee size={13} color="#4ade80" />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: '#4ade80' }}>
            ₹{animSavings ? Math.round(animSavings).toLocaleString('en-IN') : '—'}
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
            Based on ₹2,400/L delivered forward multiplier vs ₹80/L base
          </div>
        </div>

        {/* Metric 2: Heli Sorties Avoided */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          padding: '10px 12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
              Helicopter Sorties Saved
            </span>
            <Plane size={13} color="#38bdf8" />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: '#38bdf8' }}>
            {animHeliSaved ?? heliSaved} sorties
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
            Mi-17 / ALH heavy-lift hazardous missions eliminated
          </div>
        </div>

        {/* Metric 3: Convoy Trucks Saved */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          padding: '10px 12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
              Convoy Trucks Avoided
            </span>
            <Truck size={13} color="#f59e0b" />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>
            {animConvoySaved ?? convoySaved} trucks
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
            4x4 ALS 2.5T mountain pass payload reduction
          </div>
        </div>

        {/* Metric 4: Winter Stocking Fuel Mass */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          padding: '10px 12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
              180-Day Stocking Weight
            </span>
            <Snowflake size={13} color="#a855f7" />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: '#c084fc' }}>
            {animStockingMass ? Math.round(animStockingMass).toLocaleString() : '—'} kg
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
            Total winter fuel payload requirement ({totalLitres.toLocaleString()} L)
          </div>
        </div>
      </div>

      {/* Tactical Logistics Breakdown Footer Bar */}
      <div style={{
        background: 'rgba(2, 6, 23, 0.85)',
        borderRadius: 6,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 11,
        color: '#94a3b8',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Fuel size={13} color="#f59e0b" />
          <span>Passive Solar Gain Displaces <strong>{((1 - (totalLitres / (22.0 * winterDays))) * 100).toFixed(1)}%</strong> of baseline shelter kerosene burn</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
          <span>Delivered Post Cost: <strong style={{ color: '#e2e8f0' }}>₹{deliveredCostInr.toLocaleString('en-IN')}</strong></span>
          <span>Required Sorties: <strong style={{ color: '#38bdf8' }}>{heliSorties}</strong></span>
          <span>Convoy Vehicles: <strong style={{ color: '#f59e0b' }}>{convoyTrucks}</strong></span>
        </div>
      </div>
    </motion.div>
  );
}
