
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Hospital, Route, Language, Translations, UserProfile, EmergencyType, TimelineEvent, MissionSummary, SurvivalStatus, OverrideAnalysis } from '../types';
import { MOCK_HOSPITALS, MOCK_ROUTES } from '../constants';
import { getRouteRecommendation, speakRecommendation, GroundedRecommendation } from '../services/gemini';

interface DashboardProps {
  user: UserProfile;
}

const CORRIDOR_PALETTE = ['#00E5FF', '#FFC107', '#BB86FC', '#2ED573', '#FF3B3B'];

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [emergencyType, setEmergencyType] = useState<EmergencyType | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [currentRoutes, setCurrentRoutes] = useState<Route[]>(MOCK_ROUTES);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [aiResult, setAiResult] = useState<GroundedRecommendation | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPriorityMode, setIsPriorityMode] = useState(false); // Controlled by AI and Manual Toggle
  const [simulatedEta, setSimulatedEta] = useState(0);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [language, setLanguage] = useState<Language>(user.language);
  const [currentPos, setCurrentPos] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  const [notified, setNotified] = useState(false);
  
  // Golden Hour States
  const [goldenHourSeconds, setGoldenHourSeconds] = useState(3600);
  const [missionReport, setMissionReport] = useState<MissionSummary | null>(null);

  const t = Translations[language];
  const navTimerRef = useRef<number | null>(null);
  const voiceTimerRef = useRef<number | null>(null);
  const goldenHourRef = useRef<number | null>(null);

  // Survival Trend Mock Data for AI Reasoning
  const survivalTrend = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      x: i * 8,
      y: 20 + Math.random() * 40 + (aiResult?.survivalStatus === 'SAFE' ? 30 : 0)
    }));
  }, [aiResult]);

  // Hospital Load Trend Data (24 Hours)
  const hospitalLoadData = useMemo(() => {
    if (!selectedHospital) return [];
    return Array.from({ length: 24 }, (_, hour) => {
      const baseLoad = selectedHospital.erLoad;
      const timeFactor = Math.sin((hour - 6) * Math.PI / 12) * 20; 
      const noise = Math.random() * 10 - 5;
      const load = Math.max(10, Math.min(100, baseLoad + timeFactor + noise));
      return { hour, load };
    });
  }, [selectedHospital]);

  // Priority Mode Logic: When engaged, we adjust the ETAs and red signal counts visually
  const displayedRoutes = useMemo(() => {
    if (!isPriorityMode) return currentRoutes;
    return currentRoutes.map(r => ({
      ...r,
      etaMinutes: Math.max(1, Math.round(r.etaMinutes * 0.7)), // 30% reduction in simulation
      redSignals: 0 // Assume all signals green in priority mode
    }));
  }, [currentRoutes, isPriorityMode]);

  // Sync simulatedEta with priority mode if navigation is active
  useEffect(() => {
    if (isNavigating && selectedRoute) {
      const targetEta = isPriorityMode ? Math.max(1, Math.round(selectedRoute.etaMinutes * 0.7)) : selectedRoute.etaMinutes;
      // Gently adjust simulatedEta if navigation is already on
      if (Math.abs(simulatedEta - targetEta) > 1) {
        setSimulatedEta(targetEta);
      }
    }
  }, [isPriorityMode, isNavigating, selectedRoute]);

  // Time ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Golden Hour Countdown logic
  useEffect(() => {
    if (emergencyType && !missionReport) {
      goldenHourRef.current = window.setInterval(() => {
        setGoldenHourSeconds(prev => {
          if (prev <= 0) return 0;
          return prev - 1;
        });
      }, 1000);
    } else {
      if (goldenHourRef.current) clearInterval(goldenHourRef.current);
    }
    return () => { if (goldenHourRef.current) clearInterval(goldenHourRef.current); };
  }, [emergencyType, missionReport]);

  // Geolocation watch
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setCurrentPos({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => console.error("GPS Disconnect", err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const addTimelineEvent = useCallback((description: string, severity: any = 'Moderate') => {
    const newEvent: TimelineEvent = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type: 'MISSION',
      description,
      severity,
      initiatedBy: user.ambulanceId
    };
    setTimeline(prev => [newEvent, ...prev]);
  }, [user.ambulanceId]);

  const handleHospitalSelect = async (hospital: Hospital) => {
    if (!emergencyType) return;
    setSelectedHospital(hospital);
    setNotified(false);
    setIsLoading(true);
    
    const dynamicRoutes = MOCK_ROUTES.map(r => {
      const jitter = Math.floor(Math.random() * 8) - 3;
      const distanceFactor = hospital.distanceKm / 3.2;
      const dynamicEta = Math.max(3, Math.round((r.etaMinutes * distanceFactor) + jitter));
      
      return { ...r, etaMinutes: dynamicEta };
    });

    setCurrentRoutes(dynamicRoutes);
    
    const elapsedMinutes = Math.floor((3600 - goldenHourSeconds) / 60);
    const result = await getRouteRecommendation(
      MOCK_HOSPITALS, 
      dynamicRoutes, 
      emergencyType, 
      80, 
      language,
      currentPos,
      elapsedMinutes
    );
    
    setAiResult(result);
    const rec = dynamicRoutes.find(r => r.id === result.routeId) || dynamicRoutes[0];
    setSelectedRoute(rec);
    setSimulatedEta(rec.etaMinutes);
    setIsLoading(false);
    
    addTimelineEvent(`TARGET SECURED: ${hospital.name}`);
    speakRecommendation(result.recommendation, language);

    if (result.signalOverrideRecommended) {
      setIsPriorityMode(true);
      addTimelineEvent("AI ENGAGED PRIORITY OVERRIDE", "Critical");
    }
  };

  const handleNotifyHospital = () => {
    if (!selectedHospital) return;
    setNotified(true);
    addTimelineEvent(`HOSPITAL NOTIFIED: Incoming ${emergencyType} Patient`, "High");
    const msg = language === 'hi' ? `${selectedHospital.name} को सूचित किया गया।` : `${selectedHospital.name} notified.`;
    speakRecommendation(msg, language);
  };

  const togglePriorityMode = () => {
    const newState = !isPriorityMode;
    setIsPriorityMode(newState);
    addTimelineEvent(`MANUAL PRIORITY ${newState ? 'ENGAGED' : 'DISENGAGED'}`, newState ? 'High' : 'Moderate');
    speakRecommendation(language === 'hi' ? `प्राथमिकता मोड ${newState ? 'चालू' : 'बंद'}` : `Priority mode ${newState ? 'enabled' : 'disabled'}`, language);
  };

  const handleStartMission = () => {
    if (!selectedRoute) return;
    setIsNavigating(true);
    setSimulatedEta(isPriorityMode ? Math.round(selectedRoute.etaMinutes * 0.7) : selectedRoute.etaMinutes);
    addTimelineEvent("MISSION EXECUTED - REAL-TIME TRACKING ACTIVE");
    
    const startMsg = language === 'hi' ? "मिशन शुरू हुआ।" : "Mission started.";
    speakRecommendation(startMsg, language);

    navTimerRef.current = window.setInterval(() => {
      setSimulatedEta(prev => {
        if (prev <= 1) {
          handleMissionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 5000); 

    voiceTimerRef.current = window.setInterval(() => {
      setSimulatedEta(prev => {
        const msg = language === 'hi' ? `${prev} मिनट शेष।` : `${prev} minutes to destination.`;
        speakRecommendation(msg, language);
        return prev;
      });
    }, 15000);
  };

  const handleMissionComplete = () => {
    setIsNavigating(false);
    if (navTimerRef.current) clearInterval(navTimerRef.current);
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    
    const rawProb = Math.min(99.9, Math.max(20, (goldenHourSeconds / 3600) * 100));
    const roundedProb = parseFloat(rawProb.toFixed(1));
    
    const summary: MissionSummary = {
      goldenMinutesPreserved: Math.floor(goldenHourSeconds / 60),
      totalTravelTime: selectedRoute?.etaMinutes || 0,
      signalsOverridden: isPriorityMode ? selectedRoute?.redSignals || 0 : 0,
      survivalProbability: roundedProb
    };
    
    setMissionReport(summary);
    speakRecommendation(language === 'hi' ? "मिशन पूरा हुआ।" : "Mission complete.", language);
    addTimelineEvent("MISSION COMPLETE - TARGET REACHED", "Critical");
  };

  const resetSystem = () => {
    setEmergencyType(null);
    setSelectedHospital(null);
    setCurrentRoutes(MOCK_ROUTES);
    setSelectedRoute(null);
    setAiResult(null);
    setMissionReport(null);
    setGoldenHourSeconds(3600);
    setNotified(false);
    setIsNavigating(false);
    setSimulatedEta(0);
    setIsPriorityMode(false);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getGoldenColor = (seconds: number) => {
    if (seconds > 2400) return 'text-success-green';
    if (seconds > 1200) return 'text-warn-amber';
    return 'text-alert-red animate-pulse';
  };

  const survivalBuffer = Math.max(0, Math.floor(goldenHourSeconds / 60) - simulatedEta);

  return (
    <div className="h-screen flex flex-col bg-command-bg font-sans overflow-hidden relative">
      <header className="h-16 border-b border-muted-slate/20 bg-black/40 flex items-center justify-between px-8 shrink-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-ai-cyan glow-cyan flex items-center justify-center">
              <div className="w-2 h-2 bg-black"></div>
            </div>
            <span className="font-black text-white tracking-tighter uppercase text-lg">NEIE Terminal</span>
          </div>
          <div className="h-6 w-px bg-muted-slate/20"></div>
          
          {emergencyType && (
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-muted-slate uppercase mono tracking-widest">Survival Clock</span>
                <span className={`text-xl font-black mono leading-none ${getGoldenColor(goldenHourSeconds)}`}>
                  {formatTimer(goldenHourSeconds)}
                </span>
              </div>
              <div className="h-6 w-px bg-muted-slate/20"></div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-muted-slate uppercase mono tracking-widest">Protocol</span>
                <span className="text-xs font-black text-white uppercase mono">{emergencyType} Response</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-white mono">{currentTime.toLocaleTimeString()}</span>
            <span className="text-[8px] font-bold text-muted-slate mono">SECTOR-12 // ALPHA NODE</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-[10px] font-black mono ${isPriorityMode ? 'text-alert-red animate-pulse' : 'text-ai-cyan'} glow-text-cyan`}>
              {isPriorityMode ? 'PRIORITY: ACTIVE' : 'AI: CONNECTED'}
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(i => <div key={i} className={`w-1 h-3 ${isPriorityMode ? 'bg-alert-red animate-pulse' : 'bg-ai-cyan'}`}></div>)}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-grow overflow-hidden">
        <aside className="w-[380px] border-r border-muted-slate/20 bg-black/20 flex flex-col shrink-0 overflow-y-auto">
          {!emergencyType ? (
            <div className="p-8 space-y-8 animate-in slide-in-from-left-4 duration-500">
              <div>
                <div className="bg-ai-cyan/10 border border-ai-cyan/20 p-4 mb-8">
                   <h3 className="text-[10px] font-black text-ai-cyan uppercase tracking-widest mb-1">Golden Hour System Active</h3>
                   <p className="text-[9px] text-muted-slate leading-relaxed">Select incident protocol to initialize the 60-minute survival countdown.</p>
                </div>
                <h2 className="text-xs font-black text-muted-slate uppercase tracking-[0.3em] mb-4 mono">01 // Protocol Selection</h2>
                <div className="grid grid-cols-1 gap-3">
                  {(['Trauma', 'Cardiac', 'Accident', 'General'] as EmergencyType[]).map(type => (
                    <button key={type} onClick={() => setEmergencyType(type)} className="w-full bg-muted-slate/5 border border-muted-slate/10 p-5 text-left hover:border-ai-cyan transition-all group flex justify-between items-center">
                      <span className="text-sm font-black text-white uppercase tracking-wider">{type} Response</span>
                      <svg className="w-4 h-4 text-muted-slate group-hover:text-ai-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : !selectedHospital ? (
            <div className="p-8 space-y-6 animate-in slide-in-from-left-4 duration-500">
              <div className="flex justify-between items-end">
                <h2 className="text-xs font-black text-muted-slate uppercase tracking-[0.3em] mono">02 // Target Facility</h2>
                <button onClick={resetSystem} className="text-[8px] font-black text-alert-red uppercase mono hover:underline">Abort</button>
              </div>
              <div className="space-y-3">
                {MOCK_HOSPITALS.map(h => {
                   const statusColor = h.status === 'Ready' ? 'text-success-green bg-success-green/10' : h.status === 'Busy' ? 'text-warn-amber bg-warn-amber/10' : 'text-alert-red bg-alert-red/10';
                   return (
                    <button key={h.id} onClick={() => handleHospitalSelect(h)} className="w-full bg-muted-slate/5 border border-muted-slate/10 p-5 text-left hover:border-ai-cyan transition-all relative group">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-black text-white uppercase">{h.name}</h3>
                        <span className={`text-[8px] font-black uppercase mono px-1.5 py-0.5 rounded-sm ${statusColor}`}>
                          {h.status}
                        </span>
                      </div>
                      <div className="flex gap-4 text-[9px] font-black text-muted-slate mono">
                        <span>{h.distanceKm} KM</span>
                        <span>LOAD: {h.erLoad}%</span>
                      </div>
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-ai-cyan scale-y-0 group-hover:scale-y-100 transition-transform origin-top"></div>
                    </button>
                   )
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-grow">
              <div className="p-8 border-b border-muted-slate/10">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[9px] font-black text-ai-cyan uppercase mono tracking-widest">Target Secured</span>
                    <h2 className="text-lg font-black text-white uppercase leading-none mt-1 tracking-tighter">{selectedHospital.name}</h2>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedHospital.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-[9px] font-bold text-ai-cyan/80 hover:text-ai-cyan transition-all uppercase mono group"
                    >
                      <svg className="w-3 h-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      View on Maps
                    </a>
                  </div>
                  <button onClick={() => {setSelectedHospital(null); setAiResult(null); setNotified(false);}} className="p-2 border border-muted-slate/10 hover:border-alert-red text-muted-slate hover:text-alert-red transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="mt-4 px-8 py-4 bg-alert-red/5 border-y border-alert-red/10 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-alert-red uppercase mono tracking-widest">Priority Mode</span>
                    <span className="text-[10px] font-bold text-muted-slate mono">Signal Preemption Simulation</span>
                  </div>
                  <button 
                    onClick={togglePriorityMode}
                    className={`relative w-12 h-6 transition-all rounded-full border ${isPriorityMode ? 'bg-alert-red border-alert-red' : 'bg-black/40 border-muted-slate/20'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all transform ${isPriorityMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>

                <div className="mt-6 mb-6 p-4 bg-black/40 border border-white/5 relative overflow-hidden">
                   <div className="flex justify-between items-center mb-4">
                      <span className="text-[8px] font-black text-muted-slate uppercase mono tracking-widest">24H Facility Load Trend</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-white mono">{selectedHospital.erLoad}%</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${selectedHospital.erLoad > 80 ? 'bg-alert-red animate-pulse' : selectedHospital.erLoad > 50 ? 'bg-warn-amber' : 'bg-success-green'}`}></div>
                      </div>
                   </div>
                   
                   <div className="h-24 w-full relative">
                      <svg className="w-full h-full" viewBox="0 0 240 100" preserveAspectRatio="none">
                         <defs>
                            <linearGradient id="loadTrendGrad" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.2" />
                               <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
                            </linearGradient>
                         </defs>
                         <line x1="0" y1="20" x2="240" y2="20" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
                         <line x1="0" y1="50" x2="240" y2="50" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
                         <line x1="0" y1="80" x2="240" y2="80" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
                         
                         <path
                           d={`M ${hospitalLoadData.map((d, i) => `${i * 10},${100 - d.load}`).join(' L ')}`}
                           fill="none"
                           stroke="#00E5FF"
                           strokeWidth="1.5"
                           strokeLinecap="round"
                         />
                         <path
                           d={`M ${hospitalLoadData.map((d, i) => `${i * 10},${100 - d.load}`).join(' L ')} L 230,100 L 0,100 Z`}
                           fill="url(#loadTrendGrad)"
                         />
                         
                         <circle 
                            cx={new Date().getHours() * 10} 
                            cy={100 - selectedHospital.erLoad} 
                            r="2.5" 
                            fill="#00E5FF" 
                            className="animate-pulse shadow-[0_0_5px_#00E5FF]" 
                         />
                      </svg>
                      
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1 text-[6px] font-black text-muted-slate mono pt-2 border-t border-white/5">
                         <span>00:00</span>
                         <span>06:00</span>
                         <span>12:00</span>
                         <span>18:00</span>
                         <span>23:59</span>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2 mt-6">
                      <div className="bg-black/20 p-2 border border-white/5">
                        <span className="text-[7px] font-bold text-muted-slate uppercase mono block mb-1">Crowd Status</span>
                        <span className={`text-[10px] font-black uppercase mono ${selectedHospital.crowdLevel === 'High' ? 'text-alert-red' : selectedHospital.crowdLevel === 'Medium' ? 'text-warn-amber' : 'text-success-green'}`}>
                          {selectedHospital.crowdLevel}
                        </span>
                      </div>
                      <div className="bg-black/20 p-2 border border-white/5">
                        <span className="text-[7px] font-bold text-muted-slate uppercase mono block mb-1">Available Beds</span>
                        <span className="text-[10px] font-black text-white mono">{selectedHospital.bedsAvailable}</span>
                      </div>
                   </div>
                </div>
                
                <div className="flex items-center gap-3 mb-6">
                   <button onClick={handleNotifyHospital} disabled={notified} className={`flex-grow text-[9px] font-black uppercase mono py-1 px-3 border transition-all ${notified ? 'bg-success-green/20 border-success-green/30 text-success-green' : 'border-ai-cyan/30 text-ai-cyan hover:bg-ai-cyan/10'}`}>
                     {notified ? '✓ Facility Notified' : 'Notify Hospital'}
                   </button>
                </div>

                {aiResult && (
                  <div className="bg-ai-cyan/5 border-l-2 border-ai-cyan p-5 mb-8">
                    <div className="flex justify-between items-center mb-2">
                       <h3 className="text-[9px] font-black text-ai-cyan uppercase mono tracking-[0.2em]">Tactical Strategy</h3>
                       <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-sm ${aiResult.survivalStatus === 'SAFE' ? 'bg-success-green text-black' : aiResult.survivalStatus === 'RISKY' ? 'bg-warn-amber text-black' : 'bg-alert-red text-white animate-pulse'}`}>
                         {aiResult.survivalStatus}
                       </span>
                    </div>
                    <p className="text-[11px] text-white/90 uppercase font-bold leading-relaxed mb-6">
                      "{aiResult.recommendation}"
                    </p>

                    {aiResult.groundingUrls && aiResult.groundingUrls.length > 0 && (
                      <div className="mb-6 space-y-2">
                        <span className="text-[8px] font-black text-muted-slate uppercase mono tracking-widest block mb-1">Tactical Grounding Nodes</span>
                        <div className="flex flex-wrap gap-2">
                          {aiResult.groundingUrls.map((link, idx) => (
                            <a 
                              key={idx}
                              href={link.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 bg-ai-cyan/10 border border-ai-cyan/30 px-2 py-1 hover:bg-ai-cyan/20 transition-all group"
                            >
                              <span className="text-[8px] font-black text-ai-cyan uppercase mono">
                                [MAP: {link.title || 'EXTERNAL ENDPOINT'}]
                              </span>
                              <svg className="w-2.5 h-2.5 text-ai-cyan group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="h-16 w-full mb-6 relative bg-black/40 border border-white/5 p-1 overflow-hidden">
                       <div className="absolute top-1 left-2 text-[7px] font-bold text-muted-slate uppercase mono z-10">Real-time Survival Propensity</div>
                       <svg className="w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="none">
                          <path
                            d={`M 0,60 ${survivalTrend.map(p => `L ${p.x},${60 - p.y}`).join(' ')} L 100,60`}
                            fill="url(#trendGradient)"
                            className="transition-all duration-1000"
                          />
                          <path
                            d={`M 0,${60 - survivalTrend[0].y} ${survivalTrend.map(p => `L ${p.x},${60 - p.y}`).join(' ')}`}
                            fill="none"
                            stroke="#00E5FF"
                            strokeWidth="1.5"
                            className="transition-all duration-1000"
                          />
                          <defs>
                            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                       </svg>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/20 p-2 border border-white/5">
                        <span className="text-[8px] font-bold text-muted-slate uppercase mono">Survival Buffer</span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-[12px] font-black uppercase mono ${getGoldenColor(aiResult.goldenMinutesRemaining * 60)}`}>{aiResult.goldenMinutesRemaining} MIN</span>
                        </div>
                      </div>
                      <div className="bg-black/20 p-2 border border-white/5">
                        <span className="text-[8px] font-bold text-muted-slate uppercase mono">Route Confidence</span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[12px] font-black text-ai-cyan mono">{aiResult.confidence}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <span className="text-[9px] font-black text-muted-slate uppercase mono tracking-widest">Tactical Corridors</span>
                  {displayedRoutes.map((r, idx) => {
                    const isAI = aiResult?.routeId === r.id;
                    const isSelected = selectedRoute?.id === r.id;
                    const totalRemaining = Math.floor(goldenHourSeconds/60) - r.etaMinutes;
                    const badge = totalRemaining > 30 ? 'SAFE' : totalRemaining > 15 ? 'RISKY' : 'CRITICAL';
                    const badgeClass = badge === 'SAFE' ? 'text-success-green border-success-green/20' : badge === 'RISKY' ? 'text-warn-amber border-warn-amber/20' : 'text-alert-red border-alert-red animate-pulse';

                    return (
                      <button 
                        key={r.id} 
                        onClick={() => !isNavigating && setSelectedRoute(r)}
                        className={`w-full p-5 border text-left transition-all relative ${isSelected ? 'border-ai-cyan bg-ai-cyan/5 shadow-[inset_0_0_20px_rgba(0,229,255,0.05)]' : 'border-muted-slate/10 bg-muted-slate/5 hover:border-muted-slate/30'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CORRIDOR_PALETTE[idx % CORRIDOR_PALETTE.length] }}></div>
                            <h4 className={`text-xs font-black uppercase ${isSelected ? 'text-ai-cyan' : 'text-white'}`}>{r.name}</h4>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                             <span className={`text-[7px] font-bold border px-1.5 py-0.5 mono leading-none ${badgeClass}`}>{badge}</span>
                             <span className={`text-[8px] font-black uppercase mono px-1.5 py-0.5 rounded-sm ${r.confidence === 'High' ? 'bg-success-green/20 text-success-green' : r.confidence === 'Medium' ? 'bg-warn-amber/20 text-warn-amber' : 'bg-alert-red/20 text-alert-red'}`}>
                               {r.confidence}
                             </span>
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px] font-black text-muted-slate mono mt-3">
                          <div className="flex flex-col">
                            <span className="text-[7px] uppercase opacity-60">Time</span>
                            <span className={isPriorityMode ? 'text-alert-red' : ''}>{r.etaMinutes}M ETA</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[7px] uppercase opacity-60">Conflict</span>
                            <span className={isPriorityMode ? 'text-success-green' : ''}>{r.redSignals} SIGNALS</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[7px] uppercase opacity-60">Flow</span>
                            <span className={r.congestion === 'Heavy' ? 'text-alert-red' : 'text-success-green'}>{r.congestion}</span>
                          </div>
                        </div>
                        {isAI && <div className="mt-3 text-[7px] font-black text-ai-cyan uppercase tracking-widest flex items-center gap-1.5 bg-ai-cyan/10 p-1.5 border border-ai-cyan/20">
                           <div className="w-1.5 h-1.5 bg-ai-cyan rounded-full animate-ping"></div>
                           AI STRATEGIC MATCH
                        </div>}
                        {isSelected && <div className="absolute right-0 top-0 bottom-0 w-1 bg-ai-cyan glow-cyan shadow-[0_0_10px_#00E5FF]"></div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-8 mt-auto">
                <button 
                  onClick={isNavigating ? handleMissionComplete : handleStartMission}
                  disabled={!selectedRoute}
                  className={`w-full py-6 font-black uppercase text-sm tracking-[0.3em] transition-all relative overflow-hidden group ${!selectedRoute ? 'bg-muted-slate/10 text-muted-slate cursor-not-allowed' : isNavigating ? 'bg-ai-cyan text-black glow-cyan' : 'bg-alert-red text-white glow-red hover:bg-alert-red/80 active:scale-[0.98]'}`}
                >
                  {isNavigating ? 'FINISH_MISSION' : 'EXECUTE_MISSION'}
                </button>
              </div>
            </div>
          )}
        </aside>

        <main className="flex-grow relative bg-black/40 overflow-hidden">
          <svg className="w-full h-full cursor-crosshair" viewBox="0 0 100 100" preserveAspectRatio="none">
             <defs>
              <filter id="glow"><feGaussianBlur stdDeviation="0.8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <linearGradient id="scannerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0" />
                <stop offset="50%" stopColor="#00E5FF" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[...Array(25)].map((_, i) => (
              <circle key={i} cx={(i % 5) * 25} cy={Math.floor(i / 5) * 25} r="0.1" fill="#00E5FF" opacity="0.3" />
            ))}

            <rect width="100" height="10" fill="url(#scannerGrad)" className="animate-[sweep_6s_infinite_linear]" />

            {displayedRoutes.map((r, idx) => {
              const isSelected = selectedRoute?.id === r.id;
              const isPriorityHighlight = isPriorityMode && isSelected;
              const dashPattern = idx === 0 ? "2, 1" : idx === 1 ? "4, 2" : "1, 3";
              
              return (
                <g key={r.id}>
                  <path
                    d={r.path}
                    fill="none"
                    stroke={isPriorityHighlight ? '#FF3B3B' : CORRIDOR_PALETTE[idx % CORRIDOR_PALETTE.length]}
                    strokeWidth={isSelected ? (isPriorityHighlight ? 3.5 : 2.5) : 0.6}
                    strokeOpacity={isSelected ? 1 : 0.3}
                    strokeDasharray={isSelected ? "none" : dashPattern}
                    filter={isSelected ? "url(#glow)" : "none"}
                    className="transition-all duration-700"
                  />
                  {isSelected && (
                    <path
                      d={r.path}
                      fill="none"
                      stroke={isPriorityHighlight ? '#FFF' : '#FFF'}
                      strokeWidth={isPriorityHighlight ? 2 : 1.2}
                      strokeDasharray="1, 8"
                      className="animate-[dash_1.5s_linear_infinite]"
                    />
                  )}
                </g>
              );
            })}

            {MOCK_HOSPITALS.map(h => (
              <g key={h.id} transform={`translate(${h.lat * 500 + 50}, ${90 - h.lng * 500})`}>
                 <circle r="1" fill={selectedHospital?.id === h.id ? "#FF3B3B" : "#FFF"} opacity={selectedHospital?.id === h.id ? 1 : 0.4} />
                 {selectedHospital?.id === h.id && (
                   <circle r="3" fill="none" stroke="#FF3B3B" strokeWidth="0.1" className="animate-ping" />
                 )}
              </g>
            ))}

            <g transform="translate(10, 90)">
               <circle r="1.5" fill="#FFF" className="animate-pulse" />
               <circle r="5" fill="none" stroke="#00E5FF" strokeWidth="0.1" opacity="0.5" className="animate-[ping_3s_infinite]" />
            </g>
          </svg>

          {/* Simulation Watermark */}
          {isPriorityMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-alert-red/90 text-white font-black uppercase px-6 py-2 tracking-[0.5em] text-[10px] z-50 animate-pulse border-2 border-white shadow-2xl">
              PROJECTED PRIORITY OVERRIDE : SIMULATION ACTIVE
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 h-28 bg-black/60 backdrop-blur-xl border-t border-muted-slate/20 flex items-center px-12 gap-16 z-50 overflow-hidden">
            <div className="flex flex-col min-w-[200px]">
              <span className="text-[9px] font-black text-muted-slate uppercase mono tracking-widest mb-1">Incident Status</span>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isNavigating ? 'bg-alert-red animate-ping' : 'bg-muted-slate'}`}></div>
                <span className="text-xl font-black text-white uppercase tracking-tighter">
                  {isNavigating ? 'Navigating Golden Window' : 'Awaiting Mission Start'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-12">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-muted-slate uppercase mono tracking-widest">Est. Arrival (ETA)</span>
                <span className={`text-4xl font-black mono tracking-tighter ${isNavigating ? (isPriorityMode ? 'text-alert-red glow-text-red' : 'text-ai-cyan glow-text-cyan') : 'text-white'}`}>
                  {isNavigating ? `${simulatedEta}m` : selectedRoute ? (isPriorityMode ? `${Math.round(selectedRoute.etaMinutes * 0.7)}m` : `${selectedRoute.etaMinutes}m`) : '--'}
                </span>
              </div>
              <div className="h-10 w-px bg-muted-slate/10"></div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-muted-slate uppercase mono tracking-widest">Survival Buffer</span>
                <span className={`text-2xl font-black mono tracking-tighter ${getGoldenColor(survivalBuffer * 60)}`}>
                  {survivalBuffer} MIN
                </span>
              </div>
              <div className="h-10 w-px bg-muted-slate/10"></div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-muted-slate uppercase mono tracking-widest">Incident Age</span>
                <span className="text-xl font-black text-white mono">
                  {Math.floor((3600 - goldenHourSeconds)/60)}:{(3600-goldenHourSeconds)%60 < 10 ? `0${(3600-goldenHourSeconds)%60}` : (3600-goldenHourSeconds)%60}
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {missionReport && (
        <div className="absolute inset-0 z-[1000] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-12">
          <div className="w-full max-w-2xl border border-ai-cyan/30 bg-command-bg p-12 relative overflow-hidden shadow-[0_0_100px_rgba(0,229,255,0.2)]">
             <div className="absolute top-0 left-0 w-full h-1 bg-ai-cyan shadow-[0_0_15px_rgba(0,229,255,0.5)]"></div>
             
             <div className="mb-12">
                <span className="text-[10px] font-black text-ai-cyan uppercase tracking-[0.5em] mono mb-4 block">Survival Mission Summary</span>
                <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-none mb-2">Golden Hour Preserved</h2>
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-success-green rounded-full"></div>
                   <span className="text-xs font-black text-success-green uppercase mono tracking-widest">Patient Delivered within Treatment Window</span>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-8 mb-12">
                <div className="space-y-1">
                   <span className="text-[9px] font-black text-muted-slate uppercase mono tracking-widest">Survival Probability</span>
                   <div className="text-4xl font-black text-white mono">{missionReport.survivalProbability}%</div>
                </div>
                <div className="space-y-1">
                   <span className="text-[9px] font-black text-muted-slate uppercase mono tracking-widest">Buffer Preserved</span>
                   <div className="text-4xl font-black text-success-green mono">{missionReport.goldenMinutesPreserved} MIN</div>
                </div>
                <div className="space-y-1">
                   <span className="text-[9px] font-black text-muted-slate uppercase mono tracking-widest">Signals Overridden</span>
                   <div className="text-4xl font-black text-ai-cyan mono">{missionReport.signalsOverridden}</div>
                </div>
                <div className="space-y-1">
                   <span className="text-[9px] font-black text-muted-slate uppercase mono tracking-widest">System Efficiency</span>
                   <div className="text-4xl font-black text-white mono">A+</div>
                </div>
             </div>

             <button onClick={resetSystem} className="w-full py-6 bg-white text-black font-black uppercase tracking-[0.4em] text-sm hover:bg-ai-cyan transition-colors">
                Return to Station / Fleet Standby
             </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-command-bg/80 backdrop-blur-md flex flex-col items-center justify-center z-[200]">
          <div className="w-64 h-1 bg-muted-slate/20 rounded-full mb-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-ai-cyan w-1/3 animate-[loading_1.5s_infinite_linear]"></div>
          </div>
          <p className="text-[10px] font-black text-ai-cyan uppercase tracking-[0.4em] mono animate-pulse">Computing Survival Window...</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
