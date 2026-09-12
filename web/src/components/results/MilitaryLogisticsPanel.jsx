import React from 'react';
import { motion } from 'framer-motion';
import { Fuel, Truck, Plane, IndianRupee, Snowflake } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';

/**
 * MilitaryLogisticsPanel.jsx
 * High-Altitude Winter Heating Fuel Demand & Supply Logistics Engine.
 * Conforms to Alpine Precision Light Theme:
 * - Crisp white card surface (#FFFFFF) with subtle border (#E2E8F0)
 * - Restrained typography and realistic engineering metrics
 * - High-pass delivered fuel cost and isolation period stocking calculation
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

  const baselineFuelLitres = 22.0 * winterDays;
  const displacedPct = ((1 - (totalLitres / baselineFuelLitres)) * 100).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        background: '#FFFFFF',
        border: '1px solid var(--border, #E2E8F0)',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        width: '100%',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Top Header: Title, Elevation / Garrison Meta, Efficiency Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: '#FFF7ED',
              border: '1px solid #FFEDD5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent, #C2410C)',
              flexShrink: 0,
            }}
          >
            <Fuel size={15} />
          </div>
          <div>
            <span
              style={{
                fontFamily: 'var(--font-heading, Inter, sans-serif)',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-primary, #0F172A)',
                letterSpacing: '-0.01em',
              }}
            >
              Winter Heating Fuel Demand & Supply Logistics
            </span>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary, #64748B)', marginTop: '2px' }}>
              {winterDays}-Day Winter Isolation Analysis · Site Elevation: {altitude_m}m ASL · Garrison: {occupants} Occupants
            </div>
          </div>
        </div>

        {/* Efficiency Offset Pill */}
        <div
          style={{
            fontFamily: 'var(--font-body, Inter, sans-serif)',
            fontSize: '11.5px',
            fontWeight: 600,
            padding: '3px 9px',
            borderRadius: '4px',
            background: '#ECFDF5',
            color: '#059669',
            border: '1px solid #A7F3D0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>✓ {riskReduction}% Baseline Fuel Displaced</span>
        </div>
      </div>

      {/* Grid of 4 Clean Engineering Key Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
        }}
      >
        {/* Metric 1: Seasonal Fuel Savings */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid var(--border, #E2E8F0)',
            borderRadius: '6px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-heading, Inter, sans-serif)',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--text-secondary, #64748B)',
              }}
            >
              Delivered Fuel Savings
            </span>
            <IndianRupee size={12} color="#059669" />
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '18px',
              fontWeight: 700,
              color: '#059669',
              margin: '2px 0',
            }}
          >
            ₹{animSavings ? Math.round(animSavings).toLocaleString('en-IN') : '—'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #94A3B8)' }}>
            High-altitude delivered multiplier vs base rate
          </div>
        </div>

        {/* Metric 2: Transport Sorties Avoided */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid var(--border, #E2E8F0)',
            borderRadius: '6px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-heading, Inter, sans-serif)',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--text-secondary, #64748B)',
              }}
            >
              Transport Sorties Avoided
            </span>
            <Plane size={12} color="var(--accent, #C2410C)" />
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-primary, #0F172A)',
              margin: '2px 0',
            }}
          >
            {animHeliSaved ?? heliSaved} Air · {animConvoySaved ?? convoySaved} Convoy
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #94A3B8)' }}>
            High-pass resupply transport missions eliminated
          </div>
        </div>

        {/* Metric 3: Winter Isolation Fuel Mass */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid var(--border, #E2E8F0)',
            borderRadius: '6px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-heading, Inter, sans-serif)',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--text-secondary, #64748B)',
              }}
            >
              180-Day Fuel Stocking
            </span>
            <Snowflake size={12} color="#0284C7" />
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-primary, #0F172A)',
              margin: '2px 0',
            }}
          >
            {totalLitres.toLocaleString()} L ({animStockingMass ? Math.round(animStockingMass).toLocaleString() : '—'} kg)
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #94A3B8)' }}>
            Total winter shelter heating fuel payload
          </div>
        </div>

        {/* Metric 4: Delivered Supply Cost */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid var(--border, #E2E8F0)',
            borderRadius: '6px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-heading, Inter, sans-serif)',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--text-secondary, #64748B)',
              }}
            >
              Delivered Post Cost
            </span>
            <Truck size={12} color="var(--text-muted, #64748B)" />
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-primary, #0F172A)',
              margin: '2px 0',
            }}
          >
            ₹{deliveredCostInr.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #94A3B8)' }}>
            Delivered mountain supply basis (₹2,400/L)
          </div>
        </div>
      </div>

      {/* Breakdown Footer Bar */}
      <div
        style={{
          background: '#F8FAFC',
          borderRadius: '6px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text-secondary, #64748B)',
          border: '1px solid var(--border, #E2E8F0)',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Fuel size={13} color="var(--accent, #C2410C)" />
          <span>
            Passive solar envelope offset: <strong>{displacedPct}%</strong> of uninsulated shelter baseline burn.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'var(--font-mono, monospace)', fontSize: '10.5px' }}>
          <span>Daily Kerosene: <strong>{dailyLitres.toFixed(1)} L/night</strong></span>
          <span>Sorties: <strong>{heliSorties}</strong></span>
          <span>Vehicles: <strong>{convoyTrucks}</strong></span>
        </div>
      </div>
    </motion.div>
  );
}
