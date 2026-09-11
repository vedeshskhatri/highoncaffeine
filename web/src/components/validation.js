/*
 * validation.js — Phase S2
 * Client-side validation for SimulateRequest.
 *
 * Rules match 07_API_CONTRACT.md exactly — not stricter, not looser.
 * Returns { [fieldPath]: errorMessage } for all invalid fields.
 * Empty object = valid.
 */

const WEATHER_MODES   = ['typical_day', 'design_winter_night', 'user_csv'];
const HEATER_TYPES    = ['none', 'unflued_combustion', 'flued_stove', 'electric'];
const FACING_VALUES   = ['north', 'east', 'south', 'west', 'roof'];
const GLAZING_VALUES  = ['single_pane', 'double_pane', 'triple_pane'];

/** Returns error string or null */
function err(condition, message) {
  return condition ? null : message;
}

/**
 * Validate a full SimulateRequest.
 * @param {object} req
 * @param {string[]} knownMaterials — list of material IDs from GET /materials
 * @returns {{ [path]: string }} — empty if valid
 */
export function validateRequest(req, knownMaterials = []) {
  const errors = {};

  const set = (path, msg) => { if (msg) errors[path] = msg; };

  // ── location ──────────────────────────────────────────────────────────
  set('location.lat',
    err(typeof req.location?.lat === 'number' &&
        req.location.lat >= -90 && req.location.lat <= 90,
        'Latitude must be between −90 and 90'));

  set('location.lon',
    err(typeof req.location?.lon === 'number' &&
        req.location.lon >= -180 && req.location.lon <= 180,
        'Longitude must be between −180 and 180'));

  set('location.altitude_m',
    err(typeof req.location?.altitude_m === 'number' &&
        req.location.altitude_m >= 0 && req.location.altitude_m <= 8849,
        'Altitude must be 0 – 8849 m'));

  // ── weather ───────────────────────────────────────────────────────────
  set('weather.mode',
    err(WEATHER_MODES.includes(req.weather?.mode),
        `Mode must be one of: ${WEATHER_MODES.join(', ')}`));

  if (req.weather?.mode === 'user_csv') {
    set('weather.user_csv_id',
      err(!!req.weather?.user_csv_id,
          'user_csv_id is required when mode is user_csv'));
  }

  // ── geometry ──────────────────────────────────────────────────────────
  set('geometry.length_m',
    err(typeof req.geometry?.length_m === 'number' && req.geometry.length_m > 0,
        'Length must be > 0'));

  set('geometry.width_m',
    err(typeof req.geometry?.width_m === 'number' && req.geometry.width_m > 0,
        'Width must be > 0'));

  set('geometry.height_m',
    err(typeof req.geometry?.height_m === 'number' && req.geometry.height_m > 0,
        'Height must be > 0'));

  set('geometry.orientation_deg',
    err(typeof req.geometry?.orientation_deg === 'number' &&
        req.geometry.orientation_deg >= 0 && req.geometry.orientation_deg <= 360,
        'Orientation must be 0 – 360°'));

  // ── envelope ──────────────────────────────────────────────────────────
  const validateLayers = (layers, prefix) => {
    if (!Array.isArray(layers) || layers.length === 0) {
      set(prefix, `At least one layer required`);
      return;
    }
    layers.forEach((layer, i) => {
      if (knownMaterials.length > 0) {
        set(`${prefix}[${i}].material`,
          err(knownMaterials.includes(layer.material),
              `Unknown material: ${layer.material}`));
      }
      set(`${prefix}[${i}].thickness_m`,
        err(typeof layer.thickness_m === 'number' && layer.thickness_m > 0,
            'Thickness must be > 0'));
    });
  };

  validateLayers(req.envelope?.walls, 'envelope.walls');
  validateLayers(req.envelope?.roof,  'envelope.roof');
  validateLayers(req.envelope?.floor, 'envelope.floor');

  set('envelope.roof_emissivity',
    err(typeof req.envelope?.roof_emissivity === 'number' &&
        req.envelope.roof_emissivity >= 0 && req.envelope.roof_emissivity <= 1,
        'Emissivity must be 0 – 1'));

  // ── openings ──────────────────────────────────────────────────────────
  (req.openings || []).forEach((op, i) => {
    set(`openings[${i}].facing`,
      err(FACING_VALUES.includes(op.facing),
          `Facing must be: ${FACING_VALUES.join(', ')}`));

    set(`openings[${i}].area_m2`,
      err(typeof op.area_m2 === 'number' && op.area_m2 > 0,
          'Area must be > 0'));

    set(`openings[${i}].glazing`,
      err(GLAZING_VALUES.includes(op.glazing),
          `Glazing must be: ${GLAZING_VALUES.join(', ')}`));
  });

  // ── ventilation ───────────────────────────────────────────────────────
  set('ventilation.ach',
    err(typeof req.ventilation?.ach === 'number' && req.ventilation.ach > 0,
        'ACH must be > 0'));

  set('ventilation.heater_type',
    err(HEATER_TYPES.includes(req.ventilation?.heater_type),
        `Heater type must be: ${HEATER_TYPES.join(', ')}`));

  // ── occupancy ─────────────────────────────────────────────────────────
  set('occupancy.people',
    err(Number.isInteger(req.occupancy?.people) && req.occupancy.people >= 1,
        'People must be an integer ≥ 1'));

  set('occupancy.watts_per_person',
    err(typeof req.occupancy?.watts_per_person === 'number' &&
        req.occupancy.watts_per_person > 0,
        'Watts per person must be > 0'));

  // ── ground ────────────────────────────────────────────────────────────
  set('ground.snow_cover',
    err(typeof req.ground?.snow_cover === 'boolean',
        'snow_cover must be a boolean'));
  // ground.albedo: null → derived from snow_cover (no client validation needed)

  return errors;
}

/** True if the request has zero validation errors */
export function isValid(errors) {
  return Object.keys(errors).length === 0;
}

/** Helper: get the error for a specific path, or null */
export function fieldError(errors, path) {
  return errors[path] ?? null;
}

/** Helper: check if any layer in an array has errors */
export function layerErrors(errors, prefix) {
  return Object.keys(errors).filter(k => k.startsWith(prefix));
}
