import React, { useState, useEffect } from 'react';
import { ImageUploader } from './common/ImageUploader';
import { Spinner } from './common/Spinner';
import { CharacterImageData } from '../types';
import { VideoCameraIcon, SparklesIcon, DownloadIcon } from './Icons';
import { generateVeoImageToVideo } from '../services/geminiService';

export const ImageToVideoView: React.FC = () => {
    const [image, setImage] = useState<CharacterImageData | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [progressMsg, setProgressMsg] = useState('');

    // Clean up Blob URL when component unmounts or URL changes
    useEffect(() => {
        return () => {
            if (generatedVideoUrl) {
                URL.revokeObjectURL(generatedVideoUrl);
            }
        };
    }, [generatedVideoUrl]);

    const handleGenerate = async () => {
        if (!image) {
            alert("Silakan unggah gambar terlebih dahulu.");
            return;
        }

        setIsGenerating(true);
        // Revoke old URL before creating a new one
        if (generatedVideoUrl) URL.revokeObjectURL(generatedVideoUrl);
        setGeneratedVideoUrl(null);
        
        setProgressMsg("Menginisialisasi Veo Model...");

        try {
            setProgressMsg("Sedang memproses video (Estimasi 30-60 detik)...");
            
            // Call service directly. Authentication is handled by geminiService.
            const videoUrl = await generateVeoImageToVideo(image.base64, prompt);
            
            setGeneratedVideoUrl(videoUrl);
        } catch (error: any) {
            console.error("Video Generation Error:", error);
            const msg = error.message || "Gagal membuat video.";
            
            if (msg.includes("404") || msg.includes("NOT_FOUND")) {
                alert("Error 404: Fitur Veo memerlukan API Key Google Cloud Project dengan Billing Aktif. Key gratis AI Studio tidak didukung.");
            } else {
                alert(`Error: ${msg}`);
            }
        } finally {
            setIsGenerating(false);
            setProgressMsg('');
        }
    };

    return (
        <div className="animate-fade-in space-y-6 pb-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg">
                <div className="flex items-center mb-6">
                    <div className="bg-indigo-600 p-3 rounded-lg mr-4 shadow-md">
                        <VideoCameraIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            Image to Video (Veo)
                        </h2>
                        <p className="text-sm text-indigo-600 dark:text-indigo-400">
                            Hidupkan gambar statis menjadi video animasi menggunakan Google Veo 3.1.
                        </p>
                    </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg">
                    <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                        ⚠️ <strong>Penting:</strong> Fitur ini menggunakan model <code>veo-3.1-fast-generate-preview</code> yang memerlukan <strong>Paid API Key (Vertex AI/GCP)</strong>. Key gratis biasa mungkin akan error 404.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* INPUT SECTION */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                1. Unggah Gambar Sumber
                            </label>
                            <ImageUploader 
                                image={image} 
                                onImageChange={setImage} 
                                label="" 
                                heightClass="h-48"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                2. Instruksi Gerakan (Prompt)
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                                placeholder="Contoh: Kamera zoom in perlahan, rambut tertiup angin, latar belakang bergerak..."
                            />
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !image}
                            className="w-full bg-indigo-600 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            {isGenerating ? (
                                <>
                                    <Spinner className="h-5 w-5 mr-3 text-white" />
                                    {progressMsg || "Memproses..."}
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="h-5 w-5 mr-3" />
                                    Generate Video
                                </>
                            )}
                        </button>
                    </div>

                    {/* OUTPUT SECTION */}
                    <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center min-h-[300px]">
                        {generatedVideoUrl ? (
                            <div className="w-full space-y-4">
                                <h3 className="text-center font-bold text-slate-700 dark:text-slate-300">Hasil Video</h3>
                                <div className="relative rounded-lg overflow-hidden shadow-lg border border-slate-300 dark:border-slate-600 bg-black aspect-video">
                                    <video 
                                        src={generatedVideoUrl} 
                                        controls 
                                        autoPlay 
                                        loop 
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <a 
                                    href={generatedVideoUrl} 
                                    download="veo_image_to_video.mp4"
                                    className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        <DownloadIcon className="h-5 w-5"/> Unduh MP4
                                    </span>
                                </a>
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 dark:text-slate-500">
                                {isGenerating ? (
                                    <div className="animate-pulse flex flex-col items-center">
                                        <div className="h-16 w-16 bg-slate-300 dark:bg-slate-700 rounded-full mb-4"></div>
                                        <p>Sedang membuat video...</p>
                                    </div>
                                ) : (
                                    <>
                                        <VideoCameraIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                        <p>Hasil video akan muncul di sini</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};