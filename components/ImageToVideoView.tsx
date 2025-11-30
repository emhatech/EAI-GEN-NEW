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
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    // Cleanup Blob URL
    useEffect(() => {
        return () => { if (videoUrl) URL.revokeObjectURL(videoUrl); };
    }, [videoUrl]);

    const handleGenerate = async () => {
        if (!image) return alert("Unggah gambar dulu!");
        setIsGenerating(true);
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);

        try {
            const url = await generateVeoImageToVideo(image.base64, prompt);
            setVideoUrl(url);
        } catch (e: any) {
            const msg = e.message || "Error";
            if (msg.includes("404")) alert("Veo Error: Butuh API Key Berbayar (Billing Active).");
            else alert(msg);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="animate-fade-in pb-6 space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg">
                <div className="flex items-center mb-6">
                    <div className="bg-indigo-600 p-3 rounded-lg mr-4 shadow">
                        <VideoCameraIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Image to Video (Veo 3)</h2>
                        <p className="text-sm text-indigo-600 dark:text-indigo-400">Hidupkan gambar statis menjadi video animasi.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <ImageUploader image={image} onImageChange={setImage} label="Gambar Sumber" heightClass="h-48" />
                        <textarea 
                            value={prompt} onChange={(e) => setPrompt(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border dark:border-slate-600 rounded-lg p-3 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            placeholder="Deskripsi gerakan (Contoh: Zoom in perlahan, rambut tertiup angin...)"
                        />
                        <button 
                            onClick={handleGenerate} disabled={isGenerating || !image}
                            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center"
                        >
                            {isGenerating ? <><Spinner className="h-5 w-5 mr-2"/> Memproses (30-60s)...</> : <><SparklesIcon className="h-5 w-5 mr-2"/> Generate Video</>}
                        </button>
                    </div>

                    <div className="bg-slate-100 dark:bg-black rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px] border dark:border-slate-700">
                        {videoUrl ? (
                            <div className="w-full space-y-4">
                                <video src={videoUrl} controls autoPlay loop className="w-full rounded shadow" />
                                <a href={videoUrl} download="veo_video.mp4" className="block w-full text-center bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700">
                                    <DownloadIcon className="h-5 w-5 inline mr-2"/> Unduh MP4
                                </a>
                            </div>
                        ) : (
                            <div className="text-center text-slate-400">
                                {isGenerating ? <div className="animate-pulse">Sedang membuat video...</div> : "Hasil video akan muncul di sini"}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};