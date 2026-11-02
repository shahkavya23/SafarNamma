import React, { useState, useRef } from 'react';
import { UtensilsCrossed, X, Loader2, Plus } from 'lucide-react';
import { uploadImageToCloudinary } from '../utils/cloudinary';

interface MenuUploaderProps {
  menuUrls: string[];
  onMenuChange: (urls: string[]) => void;
  maxMenuPhotos?: number;
}

export const MenuUploader: React.FC<MenuUploaderProps> = ({ menuUrls, onMenuChange, maxMenuPhotos = 5 }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxMenuPhotos - menuUrls.length;
    if (remainingSlots <= 0) {
      setUploadError(`You can only upload up to ${maxMenuPhotos} menu photos.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    setUploadError(null);
    setIsUploading(true);
    try {
      const uploadPromises = filesToUpload.map((f) => uploadImageToCloudinary(f));
      const uploadedUrls = await Promise.all(uploadPromises);
      onMenuChange([...menuUrls, ...uploadedUrls]);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload one or more menu images.');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = (indexToRemove: number) => {
    onMenuChange(menuUrls.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div>
      {uploadError && (
        <div className="mb-4 p-3.5 bg-[#FDF3F1] border border-[#F2C9C2] rounded-2xl text-sm text-[#8A1C12] flex items-center justify-between gap-3" role="alert">
          <span>{uploadError}</span>
          <button type="button" onClick={() => setUploadError(null)} className="p-1 hover:text-[#B42318]" aria-label="Dismiss upload error">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="field-label !mb-1">Menu photos</p>
          <p className="field-hint">Clear shots of the menu card, in order, work best. Shown as a flip-through book.</p>
        </div>
        <span className="badge bg-stone text-ink shrink-0">
          {menuUrls.length} / {maxMenuPhotos}
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {menuUrls.map((url, index) => (
          <div key={index} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-line bg-stone group">
            <img src={url} alt={`Menu page ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-night/70 hover:bg-[#B42318] text-white flex items-center justify-center transition-colors"
              aria-label={`Remove menu photo ${index + 1}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <span className="absolute bottom-1.5 left-1.5 badge glass-dark !text-[10px] !py-0.5 !px-2">Page {index + 1}</span>
          </div>
        ))}

        {menuUrls.length < maxMenuPhotos && (
          <button
            type="button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="aspect-[3/4] rounded-xl border-2 border-dashed border-line-strong hover:border-ink hover:bg-paper text-muted hover:text-ink flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-60 disabled:cursor-wait"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : menuUrls.length === 0 ? (
              <>
                <UtensilsCrossed className="w-5 h-5" />
                <span className="text-xs font-semibold">Add</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span className="text-xs font-semibold">Add</span>
              </>
            )}
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesChange} aria-label="Menu photo files" />
    </div>
  );
};
