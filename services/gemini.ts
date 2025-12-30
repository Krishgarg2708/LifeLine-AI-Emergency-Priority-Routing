
import { GoogleGenAI } from "@google/genai";
import { Hospital, Route, Language, RecommendationResult, EmergencyType, SurvivalStatus } from "../types";

/**
 * Simulates temporal hospital load dynamics.
 * Factors in peak traffic hours and typical emergency arrival patterns.
 */
function getPredictedHospitalLoad(hospital: Hospital): { predictedLoad: number; trend: 'Rising' | 'Stable' | 'Falling' } {
  const hour = new Date().getHours();
  let baseTrend: 'Rising' | 'Stable' | 'Falling' = 'Stable';
  let multiplier = 1.0;

  if (hour >= 8 && hour <= 10) {
    multiplier = 1.3;
    baseTrend = 'Rising';
  } else if (hour >= 17 && hour <= 20) {
    multiplier = 1.4;
    baseTrend = 'Rising';
  } else if (hour >= 23 || hour <= 3) {
    multiplier = 1.2;
    baseTrend = 'Stable';
  } else if (hour >= 4 && hour <= 7) {
    multiplier = 0.7;
    baseTrend = 'Falling';
  }

  const predictedLoad = Math.min(100, Math.round(hospital.erLoad * multiplier));
  return { predictedLoad, trend: baseTrend };
}

export interface GroundedRecommendation extends RecommendationResult {
  groundingUrls?: { uri: string; title?: string }[];
}

export async function getRouteRecommendation(
  hospitals: Hospital[],
  routes: Route[],
  emergencyType: EmergencyType,
  severityInput: number,
  lang: Language,
  location?: { latitude: number; longitude: number },
  elapsedMinutes: number = 0
): Promise<GroundedRecommendation> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash"; 
  
  const intelligentHospitals = hospitals.map(h => ({
    ...h,
    intelligenceLayer: getPredictedHospitalLoad(h)
  }));

  const prompt = `
    SYSTEM ROLE: Lead AI Strategist for the National Emergency Intelligence Engine (NEIE).
    PRIMARY GOAL: PRESERVE THE GOLDEN HOUR (The first 60 minutes).
    CITY TRAFFIC STATE MODEL: 
    - Traffic signals are currently managed via a centralized mesh network.
    - Signal Overrides require a 'Setup Delay' (system sync time).
    - 'Coordination Cost' reflects the cascading disruption to crossing traffic.
    - 'Risk Factor' accounts for potential cross-traffic accidents during override.

    TASK: Perform a COST-BENEFIT ANALYSIS. Decide between:
    A) A faster route that requires multiple signal overrides (high tactical cost/risk).
    B) A slightly slower route with clear corridors (low tactical cost/risk).

    EMERGENCY: ${emergencyType}, Severity: ${severityInput}/100.
    CONTEXT: ${elapsedMinutes} minutes elapsed.
    HOSPITALS: ${JSON.stringify(intelligentHospitals)}
    ROUTES: ${JSON.stringify(routes)}
    Language: ${lang}

    DIRECTIONS:
    1. Verify traffic/access using Google Maps tool.
    2. Return ONLY a raw JSON object with this structure:
    {
      "recommendation": "concise guidance in ${lang} explaining the override vs reroute trade-off",
      "routeId": "string",
      "primaryReason": "string",
      "secondaryReason": "string",
      "confidence": "High" | "Medium" | "Low",
      "severityScore": number,
      "factors": [{"label": "string", "weight": number}],
      "signalOverrideRecommended": boolean,
      "overrideAnalysis": {
        "setupDelaySeconds": number,
        "coordinationCost": number (0-100),
        "riskFactor": number (0-100),
        "benefitRatio": number (Calculated as TimeSaved / (Cost + Risk))
      },
      "goldenMinutesRemaining": number,
      "survivalStatus": "SAFE" | "RISKY" | "CRITICAL"
    }
  `;

  const config: any = {
    tools: [{ googleMaps: {} }],
  };

  if (location) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: location
      }
    };
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config,
    });

    const text = response.text || '{}';
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(jsonStr);
    
    const groundingUrls: { uri: string; title?: string }[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.maps?.uri) {
          groundingUrls.push({
            uri: chunk.maps.uri,
            title: chunk.maps.title
          });
        }
      });
    }

    return { ...result, groundingUrls };
  } catch (error) {
    console.error("NEIE intelligence failure.", error);
    return {
      recommendation: "Emergency fallback: Intelligence layer offline. Direct corridor prioritization engaged.",
      routeId: routes[0].id,
      primaryReason: "Direct road access.",
      secondaryReason: "Lowest signal count.",
      confidence: "Medium",
      severityScore: severityInput,
      factors: [{ label: "Time", weight: 1.0 }],
      signalOverrideRecommended: true,
      overrideAnalysis: {
        setupDelaySeconds: 15,
        coordinationCost: 30,
        riskFactor: 10,
        benefitRatio: 2.5
      },
      goldenMinutesRemaining: 60 - (elapsedMinutes + routes[0].etaMinutes),
      survivalStatus: "SAFE",
      groundingUrls: []
    };
  }
}

export async function speakRecommendation(text: string, lang: Language): Promise<void> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
