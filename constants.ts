
import { Hospital, Route, CityZone, FleetVehicle } from './types';

export const MOCK_HOSPITALS: Hospital[] = [
  {
    id: 'h1',
    name: 'Metropolitan Trauma HQ',
    distanceKm: 3.2,
    etaMinutes: 8,
    crowdLevel: 'Medium',
    bedsAvailable: 12,
    specialization: ['Trauma', 'Accident', 'General'],
    status: 'Ready',
    lat: 0.03,
    lng: 0.02,
    erLoad: 45,
    avgWaitMinutes: 5
  },
  {
    id: 'h2',
    name: 'National Cardiac Center',
    distanceKm: 4.5,
    etaMinutes: 12,
    crowdLevel: 'Low',
    bedsAvailable: 5,
    specialization: ['Cardiac', 'General'],
    status: 'Busy',
    lat: -0.01,
    lng: 0.05,
    erLoad: 78,
    avgWaitMinutes: 15
  },
  {
    id: 'h3',
    name: 'Unity Neuro Institute',
    distanceKm: 2.1,
    etaMinutes: 15,
    crowdLevel: 'High',
    bedsAvailable: 2,
    specialization: ['Neuro', 'General'],
    status: 'Critical Load',
    lat: 0.04,
    lng: -0.03,
    erLoad: 92,
    avgWaitMinutes: 45
  }
];

export const MOCK_ROUTES: Route[] = [
  {
    id: 'r1',
    name: 'Tactical Corridor Alpha',
    distanceKm: 3.5,
    etaMinutes: 7,
    redSignals: 2,
    congestion: 'Clear',
    path: 'M 10,90 Q 50,10 90,90',
    confidence: 'High',
    zone: 'Z1'
  },
  {
    id: 'r2',
    name: 'Central Expressway Beta',
    distanceKm: 4.2,
    etaMinutes: 9,
    redSignals: 4,
    congestion: 'Moderate',
    path: 'M 10,90 L 50,50 L 90,90',
    confidence: 'Medium',
    zone: 'Z2'
  },
  {
    id: 'r3',
    name: 'Ring Road Gamma',
    distanceKm: 5.8,
    etaMinutes: 14,
    redSignals: 6,
    congestion: 'Heavy',
    path: 'M 10,90 C 20,40 80,40 90,90',
    confidence: 'Low',
    zone: 'Z3'
  }
];

export const MOCK_ZONES: CityZone[] = [
  { id: 'Z1', name: 'Downtown Core', status: 'Green', events: [] },
  { id: 'Z2', name: 'Industrial Belt', status: 'Yellow', events: ['Construction on Sector 4'] },
  { id: 'Z3', name: 'Residential West', status: 'Red', events: ['Heavy Rain', 'Public Rally'] }
];

export const MOCK_FLEET: FleetVehicle[] = [
  { id: 'P-101', agency: 'POLICE', type: 'Patrol', status: 'IDLE', lat: 30, lng: 30, eta: 0 },
  { id: 'F-402', agency: 'FIRE', type: 'Ladder', status: 'ACTIVE', lat: 70, lng: 10, eta: 5 },
  { id: 'A-55', agency: 'EMS', type: 'ALS', status: 'IDLE', lat: 40, lng: 60, eta: 0 }
];
