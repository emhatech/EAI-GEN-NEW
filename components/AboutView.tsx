
import React from 'react';
import { FilmIcon } from './Icons';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-8">
        <h2 className="text-2xl font-semibold text-cyan-700 dark:text-cyan-400 border-b border-slate-300 dark:border-slate-600 pb-2 mb-4">
            {title}
        </h2>
        {children}
    </section>
);

const ListItem: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <li className="mt-2">
        <strong className="text-slate-800 dark:text-slate-200">{title}:</strong>
        <span className="text-slate-600 dark:text-slate-400"> {children}</span>
    </li>
);

export const AboutView: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg animate-fade-in transition-colors duration-300 max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
            <div className="bg-cyan-600 p-3 rounded-lg mr-4 shadow-md">
                <FilmIcon className="h-8 w-8 text-white" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Tentang EMHATECH AI GENERATOR
                </h1>
                <p className="text-cyan-700 dark:text-cyan-400 mt-1">
                    Platform All-in-One untuk Kreator Konten Digital
                </p>
            </div>
        </div>
        
        <div className="text-slate-700 dark:text-slate-300 space-y-4">
             <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg mb-6">
                <h3 className="font-bold text-green-700 dark:text-green-300 flex items-center gap-2">
                    ✅ Status: Aman & Siap Digunakan
                </h3>
                <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    Aplikasi ini telah diperbarui dengan sistem keamanan API yang terpusat. Kunci API Anda disimpan secara lokal di browser Anda atau menggunakan Environment Variables server yang aman.
                </p>
            </div>

            <p>
                EmhaTech AI Generator adalah asisten kreatif serbaguna yang dirancang untuk mengubah ide sederhana menjadi konten multimedia yang kaya.
            </p>

            <Section title="1. Generator Cerita">
                <ul className="list-disc space-y-2 pl-5 mt-4">
                    <ListItem title="Ideasi & Penulisan">Dapatkan ide cerita instan, tulis plot, dan poles narasi dengan bantuan AI.</ListItem>
                    <ListItem title="Visualisasi">Hasilkan buku cerita bergambar dengan konsistensi karakter.</ListItem>
                    <ListItem title="Audio Narasi">Konversi teks cerita menjadi file audio (WAV) utuh yang siap didengar.</ListItem>
                </ul>
            </Section>

            <Section title="2. UGC & Video Marketing">
                <ul className="list-disc space-y-2 pl-5 mt-4">
                    <ListItem title="Smart UGC">Gabungkan foto karakter dan produk untuk membuat materi iklan yang natural.</ListItem>
                    <ListItem title="Video Script">Dapatkan prompt visual video (Veo/Runway) dan naskah voice over dalam satu paket JSON.</ListItem>
                    <ListItem title="Video Generator (Veo)">
                        Fitur premium untuk mengubah Gambar menjadi Video. 
                        <br/>
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded ml-1">Requires Paid API Key</span>
                    </ListItem>
                </ul>
            </Section>

            <Section title="3. Musik & Lirik">
                <ul className="list-disc space-y-2 pl-5 mt-4">
                    <ListItem title="Analisis Lirik">Cari lirik lagu dari YouTube dan terjemahkan tanpa merusak struktur lagu.</ListItem>
                    <ListItem title="Suno AI Ready">Format output lirik sudah dioptimalkan untuk digunakan di generator musik AI.</ListItem>
                </ul>
            </Section>

             <Section title="Panduan Deployment (Web)">
                <p className="text-slate-600 dark:text-slate-400 mb-2">
                    Aplikasi ini siap di-deploy ke Vercel, Netlify, atau GitHub Pages.
                </p>
                <ul className="list-disc space-y-2 pl-5">
                    <ListItem title="Environment Variables">
                        Untuk keamanan maksimal, set API Key Anda di pengaturan hosting sebagai:
                        <code className="bg-slate-200 dark:bg-slate-700 px-1 mx-1 rounded text-sm">VITE_API_KEY</code> atau <code className="bg-slate-200 dark:bg-slate-700 px-1 mx-1 rounded text-sm">REACT_APP_API_KEY</code>.
                    </ListItem>
                    <ListItem title="Fallback">
                        Jika env var tidak diset, aplikasi akan meminta pengguna memasukkan API Key secara manual melalui tombol "Gerigi" di pojok kanan atas.
                    </ListItem>
                </ul>
            </Section>
        </div>
    </div>
  );
};
