import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, AlertCircle, Loader2, ImagePlus, RefreshCw } from 'lucide-react';
import type { CreateItineraryData } from '../../types';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import { setScrollLocked } from '../../hooks/useLenis';

interface CreateItineraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateItineraryData) => Promise<void>;
}

const DURATION_PRESETS = ['2-3 Hours', '4-5 Hours', 'Full Day', 'Weekend (2 Days)'];

export const CreateItineraryModal: React.FC<CreateItineraryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lock background scroll (and Lenis smooth-scroll) so the wheel scrolls inside the modal only
  useEffect(() => {
    if (!isOpen) return;
    setScrollLocked(true);
    return () => setScrollLocked(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setIsUploading(true);
    try {
      const cdnUrl = await uploadImageToCloudinary(file);
      setImageUrl(cdnUrl);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload photo.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    if (!imageUrl.trim()) {
      setError('Cover banner image is required. Please upload a photo or paste an image link.');
      return;
    }

    const trimmedDuration = duration.trim();
    if (!trimmedDuration) {
      setError('Estimated duration is required (e.g. "4-5 Hours" or "Full Day").');
      return;
    }

    // Validation: Prevent negative or invalid duration
    if (
      trimmedDuration.startsWith('-') ||
      (!isNaN(Number(trimmedDuration)) && Number(trimmedDuration) <= 0)
    ) {
      setError('Duration cannot be a negative value or zero. Please enter a valid duration (e.g. "3-4 Hours" or "1 Day").');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        image_url: imageUrl.trim(),
        estimated_duration: trimmedDuration,
        stops: [],
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create itinerary.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-lenis-prevent
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night/60 backdrop-blur-sm overscroll-contain"
    >
      <div
        data-lenis-prevent
        className="bg-paper border border-line rounded-3xl max-w-lg w-full p-6 sm:p-8 card-shadow relative max-h-[85vh] overflow-y-auto overscroll-contain"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-stone text-muted hover:text-ink transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-accent mb-2">
          <Sparkles className="w-5 h-5" />
          <span className="text-xs font-mono uppercase tracking-wider font-semibold">Admin Blueprint Creator</span>
        </div>
        <h2 className="font-display text-2xl text-ink mb-1">Create Curated Itinerary</h2>
        <p className="text-sm text-muted mb-6">
          Design a new multi-stop travel route. You can add specific destination stops right after saving!
        </p>

        {error && (
          <div className="mb-5 p-3.5 bg-[#FDF3F1] border border-[#F2C9C2] rounded-2xl text-xs text-[#8A1C12] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
              Trip Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Mangalore Sunset & Food Crawl"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-sand/40 border border-line rounded-2xl px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
              Trip Overview & Plan *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Explain how the route flows, highlights, and dinner recommendations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-sand/40 border border-line rounded-2xl px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-accent resize-none"
            />
          </div>

          {/* ── Cover Banner Upload Section ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                Cover Banner Image *
              </label>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-xs text-accent hover:underline font-medium"
              >
                {showUrlInput ? '← Switch to file upload' : 'Or paste image link'}
              </button>
            </div>

            {uploadError && (
              <p className="text-xs text-[#8A1C12] mb-2 font-medium">{uploadError}</p>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {showUrlInput ? (
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-sand/40 border border-line rounded-2xl px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-accent"
              />
            ) : imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-line h-40 group">
                <img
                  src={imageUrl}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-night/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="btn-ghost !bg-paper/95 !text-ink text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Change
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="btn-ghost !bg-paper/95 !text-[#B42318] text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
                  >
                    <X className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed border-line/80 hover:border-accent/60 bg-sand/30 hover:bg-sand/60 rounded-2xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 ${
                  isUploading ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                    <span className="text-xs font-semibold text-ink">Uploading photo to CDN…</span>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-paper text-accent flex items-center justify-center shadow-sm">
                      <ImagePlus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-ink">
                        Click to upload cover photo
                      </p>
                      <p className="text-[11px] text-muted mt-0.5">
                        PNG, JPG, or WEBP up to 10MB
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Estimated Duration with Presets (Budget removed) ── */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
              Estimated Duration *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 4-5 Hours / 1 Day"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-sand/40 border border-line rounded-2xl px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-accent"
            />
            {/* Quick preset chips */}
            <div className="flex flex-wrap gap-2 mt-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDuration(preset)}
                  className={`text-[11px] px-3 py-1 rounded-full border transition-colors ${
                    duration === preset
                      ? 'bg-accent text-white border-accent'
                      : 'bg-sand/40 hover:bg-sand text-muted hover:text-ink border-line'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-line mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isUploading}
              className="btn-ghost text-sm py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="btn-primary text-sm py-2.5 px-6 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create Itinerary'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
