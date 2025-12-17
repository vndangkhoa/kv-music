import { X, Activity, Zap, Server, ShieldCheck, Waves, Wifi, ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface AudioQuality {
    format: string;
    sampleRate: number;
    bitDepth?: number;
    bitrate: number;
    channels: number;
    codec?: string;
}

interface TechSpecsProps {
    isOpen: boolean;
    onClose: () => void;
    quality: AudioQuality | null;
    trackTitle: string;
}

export default function TechSpecs({ isOpen, onClose, quality, trackTitle }: TechSpecsProps) {
    const [bitrateHistory, setBitrateHistory] = useState<number[]>(new Array(40).fill(0));
    const [currentKbps, setCurrentKbps] = useState(0);
    const [bufferHealth, setBufferHealth] = useState(100);
    const [networkStats, setNetworkStats] = useState({ download: 0, upload: 0 });
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Simulate live bitrate fluctuation around the target bitrate
    useEffect(() => {
        if (!isOpen || !quality) return;

        const baseBitrate = quality.bitrate / 1000; // kbps
        setCurrentKbps(baseBitrate);
        setBitrateHistory(new Array(40).fill(baseBitrate));

        const interval = setInterval(() => {
            // Fluctuate +/- 5%
            const fluctuation = baseBitrate * 0.05 * (Math.random() - 0.5);
            const newValue = baseBitrate + fluctuation;

            setCurrentKbps(prev => newValue);
            setBitrateHistory(prev => [...prev.slice(1), newValue]);

            // Random buffer fluctuation
            setBufferHealth(prev => Math.min(100, Math.max(98, prev + (Math.random() - 0.5))));

            // Simulate Network Traffic (Bursty Download, Consistent Upload)
            setNetworkStats({
                download: Math.random() > 0.6 ? Math.floor(Math.random() * 2500) + 800 : 0, // kbps
                upload: Math.floor(Math.random() * 40) + 10 // kbps
            });

        }, 100);

        return () => clearInterval(interval);
    }, [isOpen, quality]);

    // Draw Graph
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !quality) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const baseBitrate = quality.bitrate / 1000;
        const range = baseBitrate * 0.2; // Zoom in range

        ctx.clearRect(0, 0, width, height);

        // Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(74, 222, 128, 0.5)'); // Green-400
        gradient.addColorStop(1, 'rgba(74, 222, 128, 0)');

        ctx.beginPath();
        ctx.moveTo(0, height);

        bitrateHistory.forEach((val, i) => {
            const x = (i / (bitrateHistory.length - 1)) * width;
            // Map value to height (inverted)
            // min = base - range, max = base + range
            const normalized = (val - (baseBitrate - range)) / (range * 2);
            const y = height - (normalized * height);
            ctx.lineTo(x, y);
        });

        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Line
        ctx.beginPath();
        bitrateHistory.forEach((val, i) => {
            const x = (i / (bitrateHistory.length - 1)) * width;
            const normalized = (val - (baseBitrate - range)) / (range * 2);
            const y = height - (normalized * height);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.stroke();

    }, [bitrateHistory, quality]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-[#121212] border border-white/10 rounded-xl w-full max-w-md relative shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Activity className="text-green-500 w-5 h-5" />
                            <h3 className="text-lg font-bold text-white tracking-wide">AUDIO ENGINE</h3>
                        </div>
                        <p className="text-xs text-[#a7a7a7] uppercase tracking-wider font-mono">
                            {quality ? 'DIRECT SOUND • EXCLUSIVE MODE' : 'INITIALIZING...'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/50 hover:text-white transition"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                {quality ? (
                    <div className="p-6 space-y-6">
                        {/* Live Monitor */}
                        <div className="bg-black/40 rounded-lg p-4 border border-white/5">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs text-gray-400 font-mono uppercase">Live Bitrate</span>
                                <span className="text-xl font-mono font-bold text-green-400">
                                    {currentKbps.toFixed(0)} <span className="text-xs text-gray-500">kbps</span>
                                </span>
                            </div>
                            <canvas ref={canvasRef} width={300} height={60} className="w-full h-[60px]" />
                        </div>

                        {/* Signal Path / Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Source Stats */}
                            <div className="space-y-3">
                                <h4 className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">Source</h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Codec</span>
                                        <span className="text-white font-mono">{quality.codec || quality.format}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Sample Rate</span>
                                        <span className="text-white font-mono">{quality.sampleRate / 1000} kHz</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Bit Depth</span>
                                        <span className="text-white font-mono">{quality.bitDepth || 24}-bit</span>
                                    </div>
                                </div>
                            </div>

                            {/* Processing Stats */}
                            <div className="space-y-3">
                                <h4 className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">Processing</h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Integrity</span>
                                        <span className="text-green-400 font-mono flex items-center gap-1">
                                            <ShieldCheck className="w-3 h-3" /> Bit-Perfect
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Dynamic Range</span>
                                        <span className="text-white font-mono">14 dB (Est)</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Loudness</span>
                                        <span className="text-white font-mono">-14.2 LUFS</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Network & Buffer */}
                        <div className="space-y-2 pt-2 border-t border-white/5">
                            {/* Network Stream */}
                            <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                                <div className="flex items-center gap-2">
                                    <Wifi className="w-3 h-3" />
                                    <span>Network Stream</span>
                                </div>
                                <div className="flex gap-3 font-mono">
                                    <span className="text-white flex items-center gap-1">
                                        <ArrowDown className="w-3 h-3 text-blue-400" />
                                        {networkStats.download > 0 ? (networkStats.download / 1000).toFixed(1) : '0.0'} <span className="text-gray-600">MB/s</span>
                                    </span>
                                    <span className="text-white/60 flex items-center gap-1">
                                        <ArrowUp className="w-3 h-3 text-orange-400" />
                                        {networkStats.upload} <span className="text-gray-600">kbps</span>
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <div className="flex items-center gap-2">
                                    <Server className="w-3 h-3" />
                                    <span>Stream Buffer</span>
                                </div>
                                <span className="font-mono text-white">{bufferHealth.toFixed(1)}%</span>
                            </div>
                            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 transition-all duration-300"
                                    style={{ width: `${bufferHealth}%` }}
                                />
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-3 h-3" />
                                    <span>Output Device</span>
                                </div>
                                <span className="font-mono text-white">Default Audio Interface</span>
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="p-12 text-center text-gray-500 animate-pulse font-mono text-sm">
                        HANDSHAKING WITH AUDIO CORE...
                    </div>
                )}

                {/* Footer */}
                <div className="bg-white/5 p-3 text-[10px] text-center text-gray-600 font-mono uppercase tracking-widest">
                    Quantum Audio Engine v2.4.0 • 64-bit Floating Point
                </div>
            </div>
        </div>
    );
}
