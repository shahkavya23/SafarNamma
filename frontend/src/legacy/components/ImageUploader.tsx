import React, { useState, useRef } from 'react';
import { ImagePlus, X, Loader2, Plus, Check, RefreshCw } from 'lucide-react';
import { uploadImageToCloudinary } from '../utils/cloudinary';

interface ImageUploaderProps {
  // Cover Photo
  coverUrl: string;
  onCoverChange: (url: string) => void;
  /** Show the cover as required (admin edit). Community submissions fall back to a default photo. */
  coverRequired?: boolean;

  // Gallery Photos (3 to 5)
  galleryUrls: string[];
  onGalleryChange: (urls: string[]) => void;
  maxGalleryPhotos?: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  coverUrl,
  onCoverChange,
  coverRequired = true,
  galleryUrls,
  onGalleryChange,
  maxGalleryPhotos = 5,
}) => {
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Hidden file input refs
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Handle Cover Upload
  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploadingCover(true);
    try {
      const url = await uploadImageToCloudinary(file);
      onCoverChange(url);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload cover image.');
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // Handle Gallery Uploads
  const handleGalleryFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxGalleryPhotos - galleryUrls.length;
    if (remainingSlots <= 0) {
      setUploadError(`You can only upload up to ${maxGalleryPhotos} gallery photos.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    setUploadError(null);
    setIsUploadingGallery(true);

    try {
      const uploadPromises = filesToUpload.map((f) => uploadImageToCloudinary(f));
      const uploadedUrls = await Promise.all(uploadPromises);
      onGalleryChange([...galleryUrls, ...uploadedUrls]);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload one or more gallery images.');
    } finally {
      setIsUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleRemoveGalleryPhoto = (indexToRemove: number) => {
    onGalleryChange(galleryUrls.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-7">
      {uploadError && (
        <div className="p-3.5 bg-[#FDF3F1] border border-[#F2C9C2] rounded-2xl text-sm text-[#8A1C12] flex items-center justify-between gap-3" role="alert">
          <span>{uploadError}</span>
          <button type="button" onClick={() => setUploadError(null)} className="p-1 hover:text-[#B42318]" aria-label="Dismiss upload error">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Cover photo */}
      <div>
        <p className="field-label">
          Cover photo {coverRequired ? <span className="text-accent-text">*</span> : <span className="font-medium text-muted">(optional)</span>}
        </p>
        <p className="field-hint mb-3">The first photo travellers see, on search cards and at the top of the place page.</p>

        {coverUrl ? (
          <div className="relative rounded-2xl overflow-hidden border border-line bg-stone aspect-[16/9] group">
            <img src={coverUrl} alt="Cover photo preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-night/50 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button type="button" onClick={() => coverInputRef.current?.click()} className="btn-primary !py-2.5 !px-4 !text-xs" style={{ background: 'var(--color-sand)', color: 'var(--color-ink)' }}>
                <RefreshCw className="w-3.5 h-3.5" /> Replace
              </button>
              <button type="button" onClick={() => onCoverChange('')} className="btn-primary !py-2.5 !px-4 !text-xs !bg-[#B42318]">
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
            <span className="absolute bottom-3 left-3 badge glass-dark">
              <Check className="w-3 h-3" /> Cover
            </span>
          </div>
        ) : (
          <button
            type="button"
            disabled={isUploadingCover}
            onClick={() => coverInputRef.current?.click()}
            className="w-full border-2 border-dashed border-line-strong hover:border-ink hover:bg-paper rounded-2xl p-8 text-center transition-all flex flex-col items-center justify-center min-h-[180px] disabled:opacity-60 disabled:cursor-wait"
          >
            {isUploadingCover ? (
              <>
                <Loader2 className="w-7 h-7 text-ink animate-spin mb-3" />
                <p className="text-sm font-semibold text-ink">Uploading your photo…</p>
                <p className="text-xs text-muted mt-1">Optimising it for fast loading</p>
              </>
            ) : (
              <>
                <span className="w-12 h-12 rounded-full bg-accent-soft text-accent-text flex items-center justify-center mb-3">
                  <ImagePlus className="w-5 h-5" />
                </span>
                <p className="text-sm font-bold text-ink">Upload a cover photo</p>
                <p className="text-xs text-muted mt-1">PNG, JPG or WEBP, up to 10 MB</p>
              </>
            )}
          </button>
        )}

        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFileChange} aria-label="Cover photo file" />
      </div>

      {/* 2. Gallery */}
      <div className="pt-6 border-t border-line">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <p className="field-label !mb-1">Gallery photos</p>
            <p className="field-hint">Different angles and highlights. Three to five works best.</p>
          </div>
          <span className="badge bg-stone text-ink shrink-0">
            {galleryUrls.length} / {maxGalleryPhotos}
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {galleryUrls.map((url, index) => (
            <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-line bg-stone group">
              <img src={url} alt={`Gallery photo ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <button
                type="button"
                onClick={() => handleRemoveGalleryPhoto(index)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-night/70 hover:bg-[#B42318] text-white flex items-center justify-center transition-colors"
                aria-label={`Remove gallery photo ${index + 1}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {galleryUrls.length < maxGalleryPhotos && (
            <button
              type="button"
              disabled={isUploadingGallery}
              onClick={() => galleryInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-line-strong hover:border-ink hover:bg-paper text-muted hover:text-ink flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-60 disabled:cursor-wait"
            >
              {isUploadingGallery ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span className="text-xs font-semibold">Add</span>
                </>
              )}
            </button>
          )}
        </div>

        <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryFilesChange} aria-label="Gallery photo files" />
      </div>
    </div>
  );
};
