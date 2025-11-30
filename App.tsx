import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { StoryWizard } from './components/StoryWizard';
import { StorybookView } from './components/StorybookView';
import { ImageAffiliateView } from './components/ImageAffiliateView';
import { AboutView } from './components/AboutView';
import { ApiKeyModal } from './components/ApiKeyModal';
import { MusicLyricView } from './components/MusicLyricView';
import { ImageToVideoView } from './components/ImageToVideoView';
import { TabButton } from './components/common/TabButton';
import { Spinner } from './components/common/Spinner';
import { GENRES } from './constants';
import { 
    Genre, StoryIdea, GeneratedImage, CharacterImageData, Gender, 
    View, Voice, AspectRatio, LyricLine, ProductCategory 
} from './types';
import { 
    setApiKeys, generateFullStory, generateStoryScenes, 
    generateStoryIdeas, polishStoryText, generateImage, generateSpeech,
    generateLyrics, translateLyrics, generateUGCScripts, getSystemApiKey
} from './services/geminiService';
import { pcmToWavBlob, decodeBase64 } from './utils/audio';
import { VOICE_OPTIONS, UGC_LANGUAGES, LYRIC_LANGUAGES } from './constants';

export const App: React.FC = () => {
    // State
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [view, setView] = useState<View>('wizard');
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [apiKeys, setApiKeysState] = useState<string[]>([]);

    // Wizard Data
    const [selectedGenre, setSelectedGenre] = useState<Genre>(GENRES[0]);
    const [storyIdeas, setStoryIdeas] = useState<StoryIdea[]>([]);
    const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
    const [storyText, setStoryText] = useState('');
    const [characterImage, setCharacterImage] = useState<CharacterImageData | null>(null);
    const [characterText, setCharacterText] = useState('');
    const [characterGender, setCharacterGender] = useState<Gender>('unspecified');
    const [animalImage, setAnimalImage] = useState<CharacterImageData | null>(null);
    const [imageAspectRatio, setImageAspectRatio] = useState<AspectRatio>('16:9');
    const [sceneCount, setSceneCount] = useState<number>(10);
    const [isGeneratingStory, setIsGeneratingStory] = useState(false);
    const [isPolishing, setIsPolishing] = useState(false);

    // Storybook Data
    const [fullStory, setFullStory] = useState('');
    const [sceneNarrations, setSceneNarrations] = useState<string[]>([]);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<Voice>('Kore');
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

    // UGC Data
    const [ugcBaseImages, setUgcBaseImages] = useState<(CharacterImageData | null)[]>([null, null]);
    const [ugcCharacterDesc, setUgcCharacterDesc] = useState(''); 
    const [ugcProductDesc, setUgcProductDesc] = useState(''); 
    const [ugcScenario, setUgcScenario] = useState('Cinematic showcase');
    const [ugcGeneratedImages, setUgcGeneratedImages] = useState<(GeneratedImage | null)[]>(Array(6).fill(null));
    const [videoJsons, setVideoJsons] = useState<string[]>([]);
    const [isGeneratingUGC, setIsGeneratingUGC] = useState(false);
    const [ugcLanguage, setUgcLanguage] = useState('Indonesian');
    const [ugcShotType, setUgcShotType] = useState('default');

    // Music Data
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [originalLyrics, setOriginalLyrics] = useState('');
    const [translatedLyrics, setTranslatedLyrics] = useState<LyricLine[] | null>(null);
    const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
    const [isTranslatingLyrics, setIsTranslatingLyrics] = useState(false);
    const [lyricSources, setLyricSources] = useState<any[]>([]);
    const [selectedLyricLanguage, setSelectedLyricLanguage] = useState('Indonesian');

    // Init & Persistence
    useEffect(() => {
        try {
            const savedKeys = localStorage.getItem('gemini_api_keys');
            if (savedKeys) {
                const parsed = JSON.parse(savedKeys);
                setApiKeysState(parsed);
                setApiKeys(parsed);
            } else {
                const sysKey = getSystemApiKey();
                if (!sysKey) setTimeout(() => setShowApiKeyModal(true), 1500);
            }

            const draft = localStorage.getItem('emhatech_draft');
            if (draft) {
                const d = JSON.parse(draft);
                if (d.storyText) setStoryText(d.storyText);
            }
        } catch (e) {
            console.error("Init error", e);
        }
    }, []);

    useEffect(() => {
        document.documentElement.className = theme;
        localStorage.setItem('emhatech_draft', JSON.stringify({ storyText }));
    }, [theme, storyText]);

    // Handlers
    const handleGenerateStoryIdeas = async () => {
        setIsLoadingIdeas(true);
        try {
            const ideas = await generateStoryIdeas(selectedGenre.name);
            setStoryIdeas(ideas);
        } catch (e: any) { alert(e.message); } 
        finally { setIsLoadingIdeas(false); }
    };

    const handleGenerateStory = async () => {
        if (!storyText.trim()) return;
        setIsGeneratingStory(true);
        try {
            const story = await generateFullStory(storyText, selectedGenre.name, characterGender, sceneCount);
            setFullStory(story);
            const scenes = await generateStoryScenes(story, characterText, sceneCount);
            
            setSceneNarrations(scenes.map(s => s.narration));
            
            const imgs = scenes.map((s, i) => ({ id: `${Date.now()}-${i}`, prompt: s.imagePrompt, src: null, isLoading: true }));
            setGeneratedImages(imgs);
            setView('storybook');
            setIsGeneratingStory(false); // UI Switch

            // Generate images in background
            const newImgs = [...imgs];
            const refs = [characterImage?.base64, animalImage?.base64].filter(Boolean) as string[];
            
            for (let i = 0; i < scenes.length; i++) {
                try {
                    await new Promise(r => setTimeout(r, 1000));
                    const b64 = await generateImage(scenes[i].imagePrompt, imageAspectRatio, refs);
                    newImgs[i] = { ...newImgs[i], src: b64, isLoading: false };
                    setGeneratedImages([...newImgs]);
                } catch (e) {
                    newImgs[i] = { ...newImgs[i], isLoading: false };
                    setGeneratedImages([...newImgs]);
                }
            }
        } catch (e: any) {
            alert("Error: " + e.message);
            setIsGeneratingStory(false);
        }
    };

    const handleDownloadAudio = async () => {
        setIsGeneratingAudio(true);
        try {
            const chunks: Uint8Array[] = [];
            const silence = new Uint8Array(24000 * 0.5 * 2); // 0.5s silence

            for (const text of sceneNarrations) {
                if (!text) continue;
                const b64 = await generateSpeech(text, selectedVoice);
                const pcm = decodeBase64(b64);
                chunks.push(pcm);
                chunks.push(silence);
            }

            if (chunks.length === 0) throw new Error("No audio data");

            // Merge
            const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
            const merged = new Uint8Array(totalLen);
            let offset = 0;
            for (const c of chunks) {
                merged.set(c, offset);
                offset += c.length;
            }

            const blob = pcmToWavBlob(merged, 24000, 1, 16);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Full_Story_Narration_${selectedVoice}.wav`;
            a.click();
            URL.revokeObjectURL(url);

        } catch (e: any) { alert("Audio failed: " + e.message); }
        finally { setIsGeneratingAudio(false); }
    };

    const handleGenerateUGC = async (useChar: boolean, useProd: boolean, cat: ProductCategory) => {
        setIsGeneratingUGC(true);
        setUgcGeneratedImages(Array(6).fill(null));
        try {
            const scripts = await generateUGCScripts(ugcScenario, ugcLanguage, ugcCharacterDesc, ugcProductDesc, useProd, ugcBaseImages[1]?.base64, cat, ugcShotType);
            setVideoJsons(scripts.map(s => JSON.stringify(s, null, 2)));
            
            const newImgs = scripts.map((_, i) => ({ id: `ugc-${i}`, prompt: '', src: null, isLoading: true }));
            setUgcGeneratedImages(newImgs);
            
            const refs: string[] = [];
            if (useChar && ugcBaseImages[0]) refs.push(ugcBaseImages[0]!.base64);
            if (useProd && ugcBaseImages[1]) refs.push(ugcBaseImages[1]!.base64);

            for (let i = 0; i < scripts.length; i++) {
                try {
                    await new Promise(r => setTimeout(r, 1000));
                    const b64 = await generateImage(scripts[i].visual_prompt, '9:16', refs);
                    newImgs[i] = { id: `ugc-${i}`, prompt: scripts[i].visual_prompt, src: b64, isLoading: false };
                    setUgcGeneratedImages([...newImgs]);
                } catch (e) {
                    newImgs[i] = { ...newImgs[i], isLoading: false };
                    setUgcGeneratedImages([...newImgs]);
                }
            }
        } catch (e: any) { alert(e.message); }
        finally { setIsGeneratingUGC(false); }
    };

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-slate-900' : 'bg-slate-100'}`}>
            <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col min-h-screen">
                <Header theme={theme} onThemeToggle={() => setTheme(t => t === 'light' ? 'dark' : 'light')} onApiKeySettingsClick={() => setShowApiKeyModal(true)} />
                
                <main className="mt-8 flex flex-col lg:flex-row gap-6 flex-grow">
                    {/* Sidebar */}
                    <aside className="lg:w-64 flex-shrink-0 space-y-2">
                        <nav className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow border dark:border-slate-700 flex flex-col gap-2">
                            <TabButton name="Wizard Cerita" active={view === 'wizard' || view === 'storybook'} onClick={() => setView('wizard')} vertical />
                            <TabButton name="UGC Img & Prompt" active={view === 'imageAffiliate'} onClick={() => setView('imageAffiliate')} vertical />
                            <TabButton name="Lirik Musik" active={view === 'musicLyric'} onClick={() => setView('musicLyric')} vertical />
                            <TabButton name="Img to Video (Veo)" active={view === 'imgToVideo'} onClick={() => setView('imgToVideo')} vertical />
                            <TabButton name="Grok Generator (Web)" active={false} onClick={() => window.open('https://grok.com/', '_blank')} vertical />
                            <a href="https://emhatech.store" target="_blank" className="w-full px-4 py-3 rounded-r-lg border-l-4 font-semibold text-left text-green-600 dark:text-green-400 hover:bg-green-50 border-transparent flex justify-between">
                                Butuh Flow Video? (Store) <span>↗</span>
                            </a>
                            <div className="border-t pt-4 mt-2 dark:border-slate-700">
                                <TabButton name="Tentang" active={view === 'about'} onClick={() => setView('about')} vertical />
                            </div>
                        </nav>
                    </aside>

                    {/* Content */}
                    <div className="flex-1">
                        <div className={view === 'wizard' ? 'block' : 'hidden'}>
                            <StoryWizard 
                                genres={GENRES} selectedGenre={selectedGenre} onGenreChange={setSelectedGenre}
                                storyIdeas={storyIdeas} isLoadingIdeas={isLoadingIdeas} onSelectIdea={(i) => setStoryText(i.text)}
                                storyText={storyText} onStoryTextChange={setStoryText} onDismissIdea={() => {}}
                                isStoryReady={storyText.length > 10} onGenerateStory={handleGenerateStory} isGeneratingStory={isGeneratingStory}
                                characterImage={characterImage} onCharacterImageChange={setCharacterImage}
                                characterText={characterText} onCharacterTextChange={setCharacterText}
                                characterGender={characterGender} onCharacterGenderChange={setCharacterGender}
                                animalImage={animalImage} onAnimalImageChange={setAnimalImage}
                                imageAspectRatio={imageAspectRatio} onImageAspectRatioChange={setImageAspectRatio}
                                sceneCount={sceneCount} onSceneCountChange={setSceneCount}
                                onPolishStory={() => {}} isPolishing={false}
                            />
                        </div>

                        <div className={view === 'storybook' ? 'block' : 'hidden'}>
                            <StorybookView 
                                fullStory={fullStory} generatedImages={generatedImages}
                                isGeneratingAudio={isGeneratingAudio} onDownloadAudio={handleDownloadAudio}
                                onDownloadImages={() => {}} onRegenerateImage={() => {}}
                                selectedVoice={selectedVoice} onVoiceChange={setSelectedVoice}
                                voiceOptions={VOICE_OPTIONS} sceneNarrations={sceneNarrations}
                            />
                        </div>

                        <div className={view === 'imageAffiliate' ? 'block' : 'hidden'}>
                            <ImageAffiliateView 
                                baseImages={ugcBaseImages} onBaseImageChange={(img, i) => { const n = [...ugcBaseImages]; n[i] = img; setUgcBaseImages(n); }}
                                isGenerating={isGeneratingUGC} onGenerate={handleGenerateUGC}
                                generatedImages={ugcGeneratedImages} videoJsons={videoJsons}
                                onDownloadAll={() => {}} scenario={ugcScenario} onScenarioChange={setUgcScenario}
                                languages={UGC_LANGUAGES} selectedLanguage={ugcLanguage} onLanguageChange={setUgcLanguage}
                                onRegenerate={() => {}} characterDesc={ugcCharacterDesc} onCharacterDescChange={setUgcCharacterDesc}
                                productDesc={ugcProductDesc} onProductDescChange={setUgcProductDesc}
                                shotType={ugcShotType} onShotTypeChange={setUgcShotType}
                            />
                        </div>

                        <div className={view === 'musicLyric' ? 'block' : 'hidden'}>
                            <MusicLyricView 
                                youtubeUrl={youtubeUrl} onYoutubeUrlChange={setYoutubeUrl}
                                onGetLyrics={() => {}} isFetchingLyrics={false} originalLyrics={originalLyrics} onOriginalLyricsChange={setOriginalLyrics}
                                onTranslateLyrics={() => {}} isTranslatingLyrics={false} translatedLyrics={translatedLyrics}
                                languages={LYRIC_LANGUAGES} selectedLanguage={selectedLyricLanguage} onLanguageChange={setSelectedLyricLanguage}
                            />
                        </div>

                        <div className={view === 'imgToVideo' ? 'block' : 'hidden'}>
                            <ImageToVideoView />
                        </div>

                        <div className={view === 'about' ? 'block' : 'hidden'}>
                            <AboutView />
                        </div>
                    </div>
                </main>

                <ApiKeyModal isOpen={showApiKeyModal} currentApiKeys={apiKeys} onClose={() => setShowApiKeyModal(false)} onSave={(k) => { setApiKeysState(k); setApiKeys(k); localStorage.setItem('gemini_api_keys', JSON.stringify(k)); setShowApiKeyModal(false); }} />
                <Footer />

                {(isGeneratingStory || isGeneratingUGC) && (
                    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl text-center">
                            <Spinner className="h-12 w-12 text-cyan-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold dark:text-white">Sedang Membuat Konten...</h3>
                            <p className="text-cyan-600 mt-2">AI sedang bekerja keras untuk Anda.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};