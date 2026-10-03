import { useState } from 'react';
import { Share2 } from 'lucide-react';
import type { Group } from '../../types';
import { tripShareText, tripShareUrl } from '../../utils/groups';

/** Share button for the trip hero: the phone's share sheet where there is one, otherwise copies the link. */
export const ShareTrip = ({ group, destination }: { group: Group; destination: string }) => {
  const [shareNote, setShareNote] = useState('');

  const handleShare = async () => {
    const url = tripShareUrl(group);
    try {
      if (navigator.share) {
        await navigator.share({ title: group.title, text: tripShareText(group, destination), url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareNote('Link copied');
        setTimeout(() => setShareNote(''), 2000);
      }
    } catch {
      /* share sheet dismissed */
    }
  };

  return (
    <button onClick={handleShare} className="btn-ghost" aria-live="polite">
      <Share2 className="w-4 h-4" /> {shareNote || 'Share'}
    </button>
  );
};
