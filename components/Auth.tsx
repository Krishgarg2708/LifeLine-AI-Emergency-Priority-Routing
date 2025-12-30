
import React, { useState } from 'react';
import { Translations, Language } from '../types';

interface AuthProps {
  onAuthComplete: (profile: any) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthComplete, language, setLanguage }) => {
  const [step, setStep] = useState<'login' | 'otp' | 'profile'>('login');
  const [unitId, setUnitId] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(59);
  const t = Translations[language];

  const handleLogin = () => {
    if (unitId && password) setStep('otp');
  };

  const handleOtp = () => {
    if (otp.length === 6) setStep('profile');
  };

  const [profile, setProfile] = useState({
    ambulanceId: '',
    driverName: '',
    vehicleType: 'Advanced Life Support',
    city: 'Registry Zone 1',
    agency: 'EMS'
  });

  const handleProfileComplete = () => {
    onAuthComplete({ ...profile, ambulanceId: unitId || profile.ambulanceId, language });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-command-bg border border-muted-slate/20 p-10 rounded-none shadow-[0_0_100px_rgba(0,0,0,0.8)] relative">
        <div className="absolute -top-px left-0 w-1/3 h-[2px] bg-ai-cyan glow-cyan"></div>
        
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-ai-cyan rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black tracking-[0.4em] text-muted-slate uppercase mono">Secure Terminal</span>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight">
            Authorized Personnel <br/> Access Required
          </h1>
          <p className="text-[10px] text-muted-slate uppercase mt-2 tracking-widest mono">
            National Emergency Intelligence Engine v5.2.0
          </p>
        </div>

        {step === 'login' && (
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-muted-slate uppercase tracking-widest mono">Unit Identifier</label>
                <input
                  type="text"
                  placeholder="UNIT-A1-000"
                  className="w-full bg-black/40 border border-muted-slate/20 rounded-none p-4 text-white focus:border-ai-cyan outline-none transition-all mono text-sm"
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-muted-slate uppercase tracking-widest mono">Security Protocol Pass</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-muted-slate/20 rounded-none p-4 text-white focus:border-ai-cyan outline-none transition-all mono text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <button 
              onClick={handleLogin}
              className="w-full bg-ai-cyan hover:bg-ai-cyan/80 text-black font-black py-4 rounded-none transition-all active:scale-[0.98] uppercase text-xs tracking-[0.2em] shadow-lg shadow-ai-cyan/10"
            >
              Verify Credentials
            </button>
            
            <div className="flex items-center gap-4 py-2">
              <div className="h-px bg-muted-slate/10 flex-grow"></div>
              <span className="text-[8px] font-bold text-muted-slate uppercase tracking-widest mono">Alternative Auth</span>
              <div className="h-px bg-muted-slate/10 flex-grow"></div>
            </div>
            
            <button className="w-full border border-muted-slate/20 text-muted-slate hover:text-white font-bold py-3 rounded-none flex items-center justify-center gap-3 transition-all uppercase text-[9px] tracking-widest">
              Continue with Google Account
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-ai-cyan/5 border-l-2 border-ai-cyan p-4">
              <p className="text-[10px] text-ai-cyan font-bold leading-relaxed uppercase tracking-widest mono">
                Validation code transmitted to registered mobile asset. Enter 6-digit hex code.
              </p>
            </div>
            <div className="space-y-6">
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                className="w-full bg-black/40 border border-muted-slate/20 rounded-none p-5 text-white text-center text-4xl tracking-[1.5rem] focus:border-ai-cyan outline-none mono"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <div className="flex justify-between items-center text-[10px] font-bold text-muted-slate tracking-widest mono">
                <span>00:{timer < 10 ? `0${timer}` : timer} REMAINING</span>
                <button className="hover:text-ai-cyan transition-colors underline uppercase">Resend</button>
              </div>
              <button 
                onClick={handleOtp}
                className="w-full bg-ai-cyan text-black font-black py-4 rounded-none transition-all uppercase text-xs tracking-[0.2em]"
              >
                Establish Secure Link
              </button>
            </div>
          </div>
        )}

        {step === 'profile' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-xs font-black text-white uppercase tracking-[0.3em] mono border-b border-muted-slate/10 pb-4">Initialization Data</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-muted-slate uppercase tracking-widest mono">Personnel Name</label>
                <input
                  type="text"
                  placeholder="Officer Name"
                  className="w-full bg-black/40 border border-muted-slate/20 rounded-none p-4 text-white outline-none focus:border-ai-cyan mono text-xs"
                  value={profile.driverName}
                  onChange={(e) => setProfile({...profile, driverName: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-muted-slate uppercase tracking-widest mono">Asset Class</label>
                <select 
                  className="w-full bg-black/40 border border-muted-slate/20 rounded-none p-4 text-white outline-none focus:border-ai-cyan mono text-xs appearance-none"
                  value={profile.vehicleType}
                  onChange={(e) => setProfile({...profile, vehicleType: e.target.value as any})}
                >
                  <option>Advanced Life Support (ALS)</option>
                  <option>Basic Life Support (BLS)</option>
                  <option>Police Interceptor</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-muted-slate uppercase tracking-widest mono">Primary Language</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setLanguage('en')}
                    className={`flex-1 py-3 border transition-all mono text-[10px] font-black ${language === 'en' ? 'bg-ai-cyan border-ai-cyan text-black' : 'border-muted-slate/20 text-muted-slate'}`}
                  >
                    ENGLISH [EN]
                  </button>
                  <button 
                    onClick={() => setLanguage('hi')}
                    className={`flex-1 py-3 border transition-all mono text-[10px] font-black ${language === 'hi' ? 'bg-ai-cyan border-ai-cyan text-black' : 'border-muted-slate/20 text-muted-slate'}`}
                  >
                    HINDI [HI]
                  </button>
                </div>
              </div>
              <button 
                onClick={handleProfileComplete}
                className="w-full bg-success-green text-black font-black py-5 rounded-none transition-all uppercase text-xs tracking-[0.2em] mt-4"
              >
                Confirm System Entry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
