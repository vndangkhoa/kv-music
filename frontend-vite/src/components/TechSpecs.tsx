import { AudioQuality } from '../types';

interface TechSpecsProps {
    isOpen: boolean;
    onClose: () => void;
    quality: AudioQuality | null;
    trackTitle: string;
}

export default function TechSpecs({ isOpen, onClose, quality, trackTitle }: TechSpecsProps) {
    if (!isOpen) return null;

    const formatBitrate = (bitrate: number) => {
        return bitrate > 1000 ? `${(bitrate / 1000).toFixed(0)} kbps` : `${bitrate} bps`;
    };

    const formatSampleRate = (rate: number) => {
        return rate >= 1000 ? `${(rate / 1000).toFixed(1)} kHz` : `${rate} Hz`;
    };

    return (
        <div
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-xl w-full max-w-sm shadow-2xl animate-in overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold">Audio Quality</h2>
                        <button
                            onClick={onClose}
                            className="text-neutral-400 hover:text-white transition"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-sm text-neutral-400 mt-1 truncate">{trackTitle}</p>
                </div>

                {/* Specs Grid */}
                <div className="p-6 space-y-4">
                    {quality ? (
                        <>
                            {/* Hi-Res Badge */}
                            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-black">
                                        <path d="M9 18V5l12-2v13M9 9h12" />
                                        <circle cx="6" cy="18" r="3" />
                                        <circle cx="18" cy="16" r="3" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-green-400">HI-RES AUDIO</p>
                                    <p className="text-xs text-neutral-400">Lossless Quality</p>
                                </div>
                            </div>

                            {/* Specs List */}
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-neutral-400">Format</span>
                                    <span className="font-medium">{quality.format}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-neutral-400">Codec</span>
                                    <span className="font-medium">{quality.codec || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-neutral-400">Sample Rate</span>
                                    <span className="font-medium">{formatSampleRate(quality.sampleRate)}</span>
                                </div>
                                {quality.bitDepth && (
                                    <div className="flex justify-between">
                                        <span className="text-neutral-400">Bit Depth</span>
                                        <span className="font-medium">{quality.bitDepth}-bit</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-neutral-400">Bitrate</span>
                                    <span className="font-medium">{formatBitrate(quality.bitrate)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-neutral-400">Channels</span>
                                    <span className="font-medium">{quality.channels === 2 ? 'Stereo' : quality.channels === 1 ? 'Mono' : `${quality.channels}ch`}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 bg-neutral-700 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400">
                                    <path d="M9 18V5l12-2v13" />
                                    <circle cx="6" cy="18" r="3" />
                                    <circle cx="18" cy="16" r="3" />
                                </svg>
                            </div>
                            <p className="text-neutral-400">Analyzing audio...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
