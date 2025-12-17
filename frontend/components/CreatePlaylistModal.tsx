"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";

interface CreatePlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
}

export default function CreatePlaylistModal({ isOpen, onClose, onCreate }: CreatePlaylistModalProps) {
    const [name, setName] = useState("");

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onCreate(name);
            setName("");
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#282828] w-full max-w-sm rounded-lg shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Create Playlist</h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <input
                            type="text"
                            placeholder="My Awesome Playlist"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[#3e3e3e] text-white p-3 rounded-md border border-transparent focus:border-green-500 focus:outline-none transition"
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="bg-green-500 text-black font-bold py-3 rounded-full hover:scale-105 hover:bg-green-400 transition disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                        Create
                    </button>
                </form>
            </div>
        </div>
    );
}
