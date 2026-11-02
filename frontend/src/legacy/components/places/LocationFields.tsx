import type { ClipboardEvent } from 'react';
import { TriangleAlert } from 'lucide-react';
import { coordsFromMapLink, parseCoordPair } from '../../utils/mapLink';

/** Warns when the pasted link has no position in it and the coordinate boxes (if any) are empty too. */
export const MapLinkNotice = ({
  mapLink,
  latitude = '',
  longitude = '',
}: {
  mapLink: string;
  latitude?: string;
  longitude?: string;
}) => {
  const link = mapLink.trim();
  if (!link || coordsFromMapLink(link) || (latitude.trim() && longitude.trim())) return null;

  return (
    <div role="status" className="mt-2 flex items-start gap-2 rounded-xl bg-boarding-soft px-3 py-2.5 text-xs leading-relaxed text-boarding-text">
      <TriangleAlert className="w-4 h-4 shrink-0 mt-px" />
      <span>
        <strong className="font-semibold">This link has no location, so the place may not get a map pin.</strong> Open it in your
        browser and paste the full address-bar URL instead (it contains <code>@12.9…,77.5…</code>), not the link from the Share button.
      </span>
    </div>
  );
};

interface CoordinateFieldsProps {
  latitude: string;
  longitude: string;
  onChange: (latitude: string, longitude: string) => void;
  error?: string | null;
  labelClassName?: string;
  inputClassName?: string;
}

/** Latitude and longitude boxes. Pasting "12.97, 77.59" into either one fills both. */
export const CoordinateFields = ({ latitude, longitude, onChange, error, labelClassName = '', inputClassName = '' }: CoordinateFieldsProps) => {
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pair = parseCoordPair(e.clipboardData.getData('text'));
    if (pair) {
      e.preventDefault();
      onChange(pair[0], pair[1]);
    }
  };

  return (
    <div className="mt-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="latitude" className={labelClassName}>Latitude</label>
          <input
            id="latitude"
            type="text"
            inputMode="decimal"
            value={latitude}
            onChange={(e) => onChange(e.target.value, longitude)}
            onPaste={handlePaste}
            className={inputClassName}
            placeholder="12.9716"
            aria-invalid={Boolean(error)}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="longitude" className={labelClassName}>Longitude</label>
          <input
            id="longitude"
            type="text"
            inputMode="decimal"
            value={longitude}
            onChange={(e) => onChange(latitude, e.target.value)}
            onPaste={handlePaste}
            className={inputClassName}
            placeholder="77.5946"
            aria-invalid={Boolean(error)}
          />
        </div>
      </div>
      {error ? (
        <p className="text-sm text-[#B42318] mt-2">{error}</p>
      ) : (
        <p className="text-xs text-muted mt-2">
          Optional. In Google Maps, right-click the pin and click the numbers at the top of the menu to copy them, then paste here.
        </p>
      )}
    </div>
  );
};
