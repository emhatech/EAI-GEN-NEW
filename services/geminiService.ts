import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Gender, AspectRatio, ProductCategory, LyricLine } from '../types';

let apiKeys: string[] = [];

export function setApiKeys(keys: string[]) {
    apiKeys = keys;
}

// Helper: Get API Key safely from Environment (Vite/Next/CRA compatible)
export function getSystemApiKey(): string {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
            // @ts-ignore
            return import.meta.env.VITE_API_KEY;
        }
        if (typeof process !== 'undefined' && process.env) {
            return process.env.REACT_APP_API_KEY || process.env.API_KEY || '';
        }
    } catch (e) {
        return '';
    }
    return '';
}

// Helper: Parse Error Messages
function getErrorMessage(error: any): string {
    if (!error) return "Unknown Error";
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    
    if (error.error) {
        return error.error.message || JSON.stringify(error.error);
    }
    return JSON.stringify(error);
}

// Helper: Resize Image
async function resizeImageBase64(base64Str: string, maxWidth = 512): Promise<string> {
    if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxWidth) {
                    width = Math.round((width * maxWidth) / height);
                    height = maxWidth;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            } else {
                resolve(base64Str);
            }
        };
        img.onerror = () => resolve(base64Str);
        img.src = base64Str;
    });
}

// Helper: Retry Wrapper (for Network/RPC errors)
async function retryOperation<T>(fn: () => Promise<T>, retries = 3, operationName = "Operation"): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            const msg = getErrorMessage(error);
            const isTransient = msg.includes("Rpc failed") || msg.includes("xhr error") || msg.includes("fetch failed") || msg.includes("503");
            
            if (isTransient && i < retries - 1) {
                console.warn(`${operationName} retry ${i + 1}/${retries}...`);
                await new Promise(r => setTimeout(r, 2000 * (i + 1)));
            } else {
                throw error;
            }
        }
    }
    throw new Error(`${operationName} failed after retries.`);
}

// Helper: API Key Rotation System
async function callWithApiKeyRotation<T>(operation: (client: GoogleGenAI, key: string) => Promise<T>): Promise<T> {
    const systemKey = getSystemApiKey();
    // Use user keys first, then system key
    const keysToTry = apiKeys.length > 0 ? apiKeys : (systemKey ? [systemKey] : []);
    
    let lastError: any;
    
    for (const key of keysToTry) {
        if (!key) continue;
        try {
            // Retry logic PER key for network glitches
            return await retryOperation(async () => {
                const client = new GoogleGenAI({ apiKey: key });
                return await operation(client, key);
            }, 2, "API Call");
        } catch (error: any) {
            console.warn(`API Key ending in ...${key.slice(-4)} failed:`, getErrorMessage(error));
            lastError = error;
            // Continue to next key
        }
    }
    
    const finalMsg = getErrorMessage(lastError);
    if (finalMsg.includes("API key not valid") || keysToTry.length === 0) {
        throw new Error("Kunci API tidak valid atau habis. Masukkan API Key baru di menu pengaturan.");
    }
    throw lastError || new Error("Semua API Key gagal.");
}

function safeJsonParse(text: string, fallback: any) {
    try {
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBracket = cleaned.indexOf('[');
        const lastBracket = cleaned.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1) {
             return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
        }
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("JSON Parse Error", e);
        return fallback;
    }
}

// --- CORE AI FUNCTIONS ---

export async function generateStoryIdeas(genre: string): Promise<{id: string, text: string}[]> {
    return callWithApiKeyRotation(async (client) => {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate 8 creative story ideas for genre "${genre}". Return JSON array of strings.`,
            config: { responseMimeType: "application/json" }
        });
        const texts: string[] = safeJsonParse(response.text || "[]", []);
        return texts.map((text, i) => ({ id: Date.now() + '-' + i, text }));
    });
}

export async function polishStoryText(text: string): Promise<string> {
    return callWithApiKeyRotation(async (client) => {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Polish this story text to be more engaging in Indonesian:\n${text}`
        });
        return response.text || text;
    });
}

export async function generateFullStory(storyText: string, genre: string, gender: Gender, sceneCount: number = 10): Promise<string> {
    return callWithApiKeyRotation(async (client) => {
        const genderText = gender === 'male' ? 'Laki-laki' : gender === 'female' ? 'Perempuan' : 'Umum';
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Write a complete story in INDONESIAN based on: "${storyText}". Genre: ${genre}. Main Character: ${genderText}.
            Structure it into exactly ${sceneCount} distinct scenes/chapters. Make it cinematic and emotional.`
        });
        return (response.text || "").trim();
    });
}

export async function generateStoryScenes(fullStory: string, characterDesc: string = '', sceneCount: number = 10): Promise<{ imagePrompt: string; narration: string }[]> {
    return callWithApiKeyRotation(async (client) => {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze this story and break it down into EXACTLY ${sceneCount} scenes.
            
            OUTPUT JSON FORMAT: Array of objects with:
            1. "imagePrompt": A highly detailed CINEMATIC VIDEO PROMPT for Veo 3. 
               - Language: **BAHASA INDONESIA**.
               - Include camera movements (e.g., "Kamera zoom in perlahan", "Drone shot", "Tracking shot").
               - Describe lighting and action vividly.
               - Character context: ${characterDesc}.
            2. "narration": Voice over script in Indonesian (Short, emotional).

            STORY:\n${fullStory}`,
            config: { responseMimeType: "application/json" }
        });
        return safeJsonParse(response.text || "[]", []).slice(0, sceneCount);
    });
}

export async function generateImage(prompt: string, aspectRatio: AspectRatio, refImages: string[] = []): Promise<string> {
    return callWithApiKeyRotation(async (client) => {
        const ratio = aspectRatio === '16:9' ? '16:9' : '9:16';
        const parts: any[] = [];
        
        if (refImages.length > 0) {
            const resized = await Promise.all(refImages.map(img => resizeImageBase64(img)));
            resized.forEach(b64 => {
                parts.push({ inlineData: { mimeType: 'image/jpeg', data: b64.split(',')[1] } });
            });
        }
        parts.push({ text: `Cinematic Shot: ${prompt}. High resolution, 8k, photorealistic.` });

        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: { imageConfig: { aspectRatio: ratio } }
        });

        const imgData = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
        if (!imgData) throw new Error("Safety filter triggered or no image returned.");
        return `data:image/png;base64,${imgData}`;
    });
}

export async function generateSpeech(text: string, voice: string): Promise<string> {
    return callWithApiKeyRotation(async (client) => {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: { parts: [{ text }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
            }
        });
        const audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audio) throw new Error("No audio generated.");
        return audio;
    });
}

export async function generateUGCScripts(prompt: string, language: string, charDesc: string, prodDesc: string, useProd: boolean, prodImg: string | undefined, cat: ProductCategory, shotType: string): Promise<any[]> {
    return callWithApiKeyRotation(async (client) => {
        let shotInstr = shotType === 'hand_focus' ? "EXTREME CLOSE-UP HANDS ONLY. NO FACES." : shotType;
        
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create exactly 6 Scenes for a UGC Video.
            Context: ${prompt}. Char: ${charDesc}. Product: ${useProd ? prodDesc : 'None'}.
            Constraint: Each scene is EXACTLY 8 SECONDS.
            Shot Type: ${shotInstr}.
            
            Return JSON Array:
            - "visual_prompt": Detailed English prompt for video generator (8 sec duration).
            - "spoken_script": Indonesian Voice Over (approx 15 words).`,
            config: { responseMimeType: "application/json" }
        });
        return safeJsonParse(response.text || "[]", []).slice(0, 6);
    });
}

export async function generateLyrics(query: string): Promise<{lyrics: string, sources: any[]}> {
    return callWithApiKeyRotation(async (client) => {
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Find lyrics for: "${query}". Return lyrics with structure tags [Verse], [Chorus]. No translation.`,
            config: { tools: [{ googleSearch: {} }] }
        });
        return { 
            lyrics: response.text || "Not found", 
            sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
                title: c.web?.title || 'Source', uri: c.web?.uri || '#'
            })) || [] 
        };
    });
}

export async function translateLyrics(lyrics: string, lang: string): Promise<LyricLine[]> {
    return callWithApiKeyRotation(async (client) => {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate to ${lang}. Return JSON array: [{original: "line", translated: "line"}]`,
            config: { responseMimeType: "application/json" }
        });
        return safeJsonParse(response.text || "[]", []);
    });
}

export async function optimizeVideoPrompt(idea: string): Promise<string> {
    return callWithApiKeyRotation(async (client) => {
        const res = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Optimize this for Grok/Flux image generation (Photorealistic, 8k): "${idea}". Output prompt only.`
        });
        return res.text || "";
    });
}

// VEO IMAGE TO VIDEO - SECURE BLOB FETCHING
export async function generateVeoImageToVideo(imageBase64: string, prompt: string): Promise<string> {
    return callWithApiKeyRotation(async (client, activeKey) => {
        const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
        const mimeType = imageBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

        let operation = await client.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt || "Cinematic movement",
            image: { imageBytes: cleanBase64, mimeType },
        });

        while (!operation.done) {
            await new Promise(r => setTimeout(r, 5000));
            operation = await client.operations.getVideosOperation({ operation });
            if (operation.error) throw new Error(String(operation.error.message));
        }

        const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!uri) throw new Error("No video URI returned");

        // Fetch using the key internally, return BLOB URL to UI (Key hidden)
        const vidRes = await fetch(`${uri}&key=${activeKey}`);
        if (!vidRes.ok) throw new Error("Failed to download video blob");
        
        const blob = await vidRes.blob();
        return URL.createObjectURL(blob);
    });
}