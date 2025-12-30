
export type Language = 'en' | 'hi';
export type AgencyType = 'EMS' | 'POLICE' | 'FIRE';
export type MissionStatus = 'PLANNING' | 'ENROUTE' | 'COMPLETED' | 'ABORTED';
export type SurvivalStatus = 'SAFE' | 'RISKY' | 'CRITICAL';

export enum VehicleType {
  BLS = 'Basic Life Support',
  ALS = 'Advanced Life Support',
  PATROL = 'Police Patrol',
  LADDER = 'Fire Ladder'
}

export type EmergencyType = 'Trauma' | 'Cardiac' | 'Accident' | 'General' | 'Neuro' | 'Fire' | 'Security';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
export type SeverityLevel = 'Moderate' | 'High' | 'Critical';
export type ZoneStatus = 'Green' | 'Yellow' | 'Red';

export interface Hospital {
  id: string;
  name: string;
  distanceKm: number;
  etaMinutes: number;
  crowdLevel: 'Low' | 'Medium' | 'High';
  bedsAvailable: number;
  specialization: EmergencyType[];
  status: 'Ready' | 'Busy' | 'Critical Load';
  lat: number;
  lng: number;
  erLoad: number;
  avgWaitMinutes: number;
}

export interface Route {
  id: string;
  name: string;
  distanceKm: number;
  etaMinutes: number;
  redSignals: number;
  congestion: 'Clear' | 'Moderate' | 'Heavy';
  path: string;
  confidence: ConfidenceLevel;
  zone: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  severity: SeverityLevel;
  initiatedBy: string;
}

export interface OverrideAnalysis {
  setupDelaySeconds: number;
  coordinationCost: number; // 0-100
  riskFactor: number; // 0-100
  benefitRatio: number; // calculated score
}

export interface RecommendationResult {
  recommendation: string;
  routeId: string;
  primaryReason: string;
  secondaryReason: string;
  confidence: ConfidenceLevel;
  severityScore: number;
  factors: {
    label: string;
    weight: number;
  }[];
  signalOverrideRecommended: boolean;
  overrideAnalysis?: OverrideAnalysis;
  goldenMinutesRemaining: number;
  survivalStatus: SurvivalStatus;
}

export interface MissionSummary {
  goldenMinutesPreserved: number;
  totalTravelTime: number;
  signalsOverridden: number;
  survivalProbability: number;
}

export interface UserProfile {
  ambulanceId: string;
  driverName: string;
  vehicleType: VehicleType;
  agency: AgencyType;
  city: string;
  language: Language;
}

export interface CityZone {
  id: string;
  name: string;
  status: ZoneStatus;
  events: string[];
}

export interface FleetVehicle {
  id: string;
  agency: AgencyType;
  type: string;
  status: 'IDLE' | 'ACTIVE';
  lat: number;
  lng: number;
  eta: number;
}

export interface Translation {
  login: string;
  ambulanceId: string;
  continueGoogle: string;
  verifyOtp: string;
  otpDescription: string;
  driverProfile: string;
  nearbyHospitals: string;
  recommendation: string;
  startNavigation: string;
  priorityMode: string;
  eta: string;
  distance: string;
  signals: string;
  congestion: string;
  bestRoute: string;
  hospitalDetails: string;
  availableBeds: string;
  specialization: string;
  emergencyType: string;
  notifyHospital: string;
  voiceMode: string;
  analytics: string;
  confidence: string;
}

export const Translations: Record<Language, Translation> = {
  en: {
    login: 'Log In',
    ambulanceId: 'Asset ID',
    continueGoogle: 'Continue with Google',
    verifyOtp: 'Verify OTP',
    otpDescription: 'Enter the 6-digit code sent to your device',
    driverProfile: 'Operator Profile',
    nearbyHospitals: 'Nearby Facilities',
    recommendation: 'Strategic AI Decision',
    startNavigation: 'Initiate Mission',
    priorityMode: 'Emergency Priority',
    eta: 'ETA',
    distance: 'Distance',
    signals: 'Signals',
    congestion: 'Traffic',
    bestRoute: 'Optimal Corridor',
    hospitalDetails: 'Facility Stats',
    availableBeds: 'Beds',
    specialization: 'Specialty',
    emergencyType: 'Incident Type',
    notifyHospital: 'Alert Facility',
    voiceMode: 'Voice Protocol',
    analytics: 'Fleet Command',
    confidence: 'Reliability'
  },
  hi: {
    login: 'लॉग इन करें',
    ambulanceId: 'एम्बुलेंस आईडी',
    continueGoogle: 'गूगल के साथ जारी रखें',
    verifyOtp: 'ओटीपी सत्यापित करें',
    otpDescription: '6-अंकों का कोड दर्ज करें',
    driverProfile: 'ड्राइवर प्रोफाइल',
    nearbyHospitals: 'पास के अस्पताल',
    recommendation: 'एआई निर्णय इंजन',
    startNavigation: 'नेविगेशन शुरू करें',
    priorityMode: 'आपातकालीन प्राथमिकता',
    eta: 'पहुंचने का समय',
    distance: 'दूरी',
    signals: 'सिग्नल',
    congestion: 'ट्रैफिक',
    bestRoute: 'सबसे अच्छा रास्ता',
    hospitalDetails: 'अस्पताल विवरण',
    availableBeds: 'बेड',
    specialization: 'विशेषज्ञता',
    emergencyType: 'आपातकालीन प्रकार',
    notifyHospital: 'अस्पताल को सूचित करें',
    voiceMode: 'वॉयस गाइडेंस',
    analytics: 'एनालिटिक्स',
    confidence: 'आत्मविश्वास स्तर'
  }
};
