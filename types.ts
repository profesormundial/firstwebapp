
export enum GravityType {
  EARTH = 'Tierra (9.81)',
  MOON = 'Luna (1.62)',
  MARS = 'Marte (3.71)',
  SUN = 'Sol (274.0)',
  CUSTOM = 'Personalizada'
}

export const GRAVITY_VALUES: Record<GravityType, number> = {
  [GravityType.EARTH]: 9.81,
  [GravityType.MOON]: 1.62,
  [GravityType.MARS]: 3.71,
  [GravityType.SUN]: 274.0,
  [GravityType.CUSTOM]: 9.81
};

export interface PhysicsParams {
  theta: number; // Angle in degrees
  v0: number;    // Initial velocity m/s
  h0: number;    // Initial height m
  gravity: number; // m/s^2
  mass: number;    // kg (not used in vacuum trajectory but for labels)
}

export interface TelemetryData {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  v: number;
}

export interface SimulationResult {
  maxHeight: number;
  maxRange: number;
  totalTime: number;
  path: { x: number, y: number }[];
}
