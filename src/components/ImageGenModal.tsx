import React, { useState } from 'react';
import { X, Sparkles, Download, Plus, Check } from 'lucide-react';
import { Attachment } from '../types';

interface ImageGenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttachImage: (att: Attachment) => void;
  token: string | null;
}

export const ImageGenModal: React.FC<ImageGenModalProps> = ({
  isOpen,
  onClose,
  onAttachImage,
  token,
}) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attached, setAttached] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setAttached(false);

    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt, aspectRatio }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setGeneratedImage(data.imageUrl);
    } catch (err: any) {
      setError(err.message || 'Image generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAttachToChat = () => {
    if (!generatedImage) return;

    const attachment: Attachment = {
      id: 'att_gen_' + Date.now(),
      name: `ai-generated-${Date.now()}.jpg`,
      type: 'image',
      mimeType: 'image/jpeg',
      size: 512000,
      url: generatedImage,
      extractedText: `[AI Generated Image: "${prompt}"]`,
    };

    onAttachImage(attachment);
    setAttached(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1e1e1e] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 text-gray-900 dark:text-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-500" />
            <h3 className="font-bold text-base">AI Image Studio</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleGenerate} className="space-y-4 my-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Image Description / Prompt
            </label>
            <textarea
              rows={3}
              required
              placeholder="A futuristic cybernetic city at twilight with glowing neon waterfalls, highly detailed digital concept art..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="w-full bg-gray-100 dark:bg-[#282828] p-3 rounded-xl text-xs outline-none border border-transparent focus:border-purple-500 resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Aspect Ratio</span>
            <div className="flex gap-2">
              {['1:1', '16:9', '9:16', '4:3'].map(ratio => (
                <button
                  type="button"
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                    aspectRatio === ratio
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-gray-100 dark:bg-[#282828] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-500">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles size={14} />
            <span>{loading ? 'Synthesizing artwork...' : 'Generate Artwork'}</span>
          </button>
        </form>

        {/* Preview */}
        {generatedImage && (
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="relative rounded-2xl overflow-hidden aspect-square max-h-72 bg-black flex items-center justify-center">
              <img
                src={generatedImage}
                alt="Generated"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex gap-2">
              <a
                href={generatedImage}
                download="ai-image.jpg"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-semibold transition-colors"
              >
                <Download size={14} />
                <span>Download</span>
              </a>
              <button
                onClick={handleAttachToChat}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {attached ? <Check size={14} /> : <Plus size={14} />}
                <span>{attached ? 'Attached!' : 'Attach to Chat'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
