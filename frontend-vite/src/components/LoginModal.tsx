import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GradientColor {
  from: string;
  to: string;
}

const AVATAR_COLORS: GradientColor[] = [
  { from: '#ff6b6b', to: '#ee5a24' },  // Coral
  { from: '#a29bfe', to: '#6c5ce7' },  // Lavender
  { from: '#00b894', to: '#00cec9' },  // Mint
  { from: '#fdcb6e', to: '#e17055' },  // Sunset
  { from: '#74b9ff', to: '#0984e3' },  // Ocean
  { from: '#fd79a8', to: '#e84393' },  // Pink
  { from: '#55efc4', to: '#00b894' },  // Emerald
  { from: '#dfe6e9', to: '#b2bec3' },  // Silver
];

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const login = useAuthStore(s => s.login);
  const [name, setName] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  if (!isOpen) return null;

  const selectedColor = AVATAR_COLORS[selectedColorIndex];
  const displayLetter = name.trim().length > 0 ? name.trim()[0].toUpperCase() : '?';
  const isValid = name.trim().length >= 1;

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!isValid) return;
    login(name.trim(), JSON.stringify(selectedColor));
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <style>{`
        @keyframes loginModalFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes loginModalScaleUp {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .login-backdrop {
          animation: loginModalFadeIn 0.2s ease-out forwards;
        }
        .login-modal-card {
          animation: loginModalScaleUp 0.3s ease-out forwards;
        }
      `}</style>

      <div
        className="login-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <div className="login-modal-card bg-[#1a1a2e]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <h2
              className="text-3xl font-bold mb-2"
              style={{
                background: 'linear-gradient(to bottom, #ffffff, #a3a3a3)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Welcome to KV Music
            </h2>
            <p className="text-neutral-400 text-sm">Create your profile to start tracking</p>
          </div>

          {/* Preview Avatar */}
          <div className="flex justify-center mb-6">
            <div
              className="flex items-center justify-center rounded-full text-white text-2xl font-bold"
              style={{
                width: 64,
                height: 64,
                background: `linear-gradient(135deg, ${selectedColor.from}, ${selectedColor.to})`,
              }}
            >
              {displayLetter}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Name Input */}
            <div className="mb-6">
              <input
                type="text"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:border-white/30 focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {/* Color Picker */}
            <div className="mb-8">
              <p className="text-neutral-400 text-sm mb-3">Choose your avatar color</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {AVATAR_COLORS.map((color, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedColorIndex(index)}
                    className="rounded-full border-2 transition-all duration-200"
                    style={{
                      width: 40,
                      height: 40,
                      background: `linear-gradient(135deg, ${color.from}, ${color.to})`,
                      borderColor: selectedColorIndex === index ? '#ffffff' : 'transparent',
                      transform: selectedColorIndex === index ? 'scale(1.1)' : 'scale(1)',
                    }}
                    aria-label={`Color option ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isValid}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-black font-bold py-3 rounded-full hover:scale-[1.02] active:scale-95 transition disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100"
            >
              Create Profile
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default LoginModal;
