THERMA EXPANDED DATASET
========================
Purpose:
Physics-grounded synthetic training dataset for THERMA / DRDO PS 26051.

Scale:
120,000 hourly records from 5,000 complete 24-hour simulations.

Coverage:
Representative high-altitude Himalayan, Ladakh/Karakoram, Jammu & Kashmir,
Himachal Pradesh, Uttarakhand, Sikkim and Arunachal Pradesh scenarios.

Important provenance:
All thermal/weather simulation records in this package are synthetic and are
labelled synthetic_flag=True. The site list is representative scenario metadata;
it must NOT be interpreted as military telemetry, deployment data, or measured
field data. No fabricated field measurements are included.

Physics variables:
Solar geometry, GHI/DNI/DHI, surface incidence, Swinbank sky temperature,
altitude pressure/density, envelope conduction, infiltration, thermal mass,
radiative loss, solar gain, indoor/MRT/operative temperatures and energy balance.

Safety:
The dataset includes the THERMA ACH safety interlock status. Deterministic
safety logic should remain authoritative in the application; ML must not
override it.

ML split:
train/validation/test are split by simulation_id, preventing hourly records
from the same simulation from leaking across splits.

Recommended use:
Use this dataset to train surrogate/regression/classification models. Keep
real measured DIHAR/DRDO/ANSYS validation data in separate evaluation datasets.
