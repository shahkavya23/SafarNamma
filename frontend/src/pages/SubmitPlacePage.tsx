import React, { useState } from 'react';
import { Send, MapPin, CheckCircle, Info, IndianRupee, List, Navigation, Clock } from 'lucide-react';
import { submissionsApi } from '../api/client';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ImageUploader } from '../components/ImageUploader';
import { PLACE_CATEGORIES } from '../types';

export const SubmitPlacePage = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (data: Record<string, string>) => {
    const newErrors: Record<string, string> = {};
    if (!data.place_name?.trim()) newErrors.place_name = 'Place name is required';
    if (!data.approximate_location?.trim()) newErrors.approximate_location = 'Location is required';
    
    // Cost validation: 0 is completely allowed for sightseeing/free spots!
    if (data.estimated_cost === undefined || data.estimated_cost.trim() === '' || isNaN(Number(data.estimated_cost)) || Number(data.estimated_cost) < 0) {
      newErrors.estimated_cost = 'Please enter a valid cost (enter 0 for free sightseeing)';
    }

    if (!data.category) newErrors.category = 'Please select a category';

    // Google Maps security verification: protect community from hazardous/phishing links
    if (data.map_link && data.map_link.trim() !== '') {
      const link = data.map_link.trim();
      const isGoogleMaps = /^https?:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|goo\.gl\/maps|maps\.app\.goo\.gl)/i.test(link);
      if (!isGoogleMaps) {
        newErrors.map_link = 'Please provide a valid Google Maps link (e.g. https://maps.app.goo.gl/... or https://maps.google.com/...)';
      }
    }
    
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setSubmitError(null);
    
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;
    
    const validationErrors = validateForm(data);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Scroll to top to show errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const success = await submissionsApi.submitPlace({
        name: data.place_name,
        description: data.description,
        state: data.approximate_location,
        budget_tier: String(data.estimated_cost),
        image_url: imageUrl || 'https://images.unsplash.com/photo-1506461883276-594543d04e12',
        gallery_images: galleryUrls,
        map_link :data.map_link,
        category: data.category,
        opening_hours: data.opening_hours?.trim() || null,
        closing_hours: data.closing_hours?.trim() || null,
        transport_options: data.transport_options?.trim() || null,
        nearby_facilities: data.nearby_facilities?.trim() || null,
        submitted_by_email: user?.email || null,
        submission_status: 'pending'
      });
      
      if (success) {
        setIsSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.message || 'Failed to submit. Please try again.';
      setSubmitError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex items-center justify-center min-h-[70vh]">
        <div className="max-w-lg w-full bg-white p-10 rounded-3xl border border-gray-100 shadow-2xl text-center transform transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-60 pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-gray-900 mb-4">Submission Successful!</h1>
            <p className="text-gray-600 mb-8 text-lg leading-relaxed">
              Thank you for sharing this hidden gem with the RoamLocal community. Our moderation team will review the details to ensure accuracy before making it public.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => setIsSuccess(false)}
                className="bg-[#1a4731] text-white px-8 py-3 rounded-full font-medium hover:bg-[#123523] transition-colors shadow-sm"
              >
                Submit Another
              </button>
              <Link 
                to="/explore"
                className="bg-[#f5f0e6] text-[#1a4731] px-8 py-3 rounded-full font-medium hover:bg-[#e8ded1] transition-colors"
              >
                Explore Places
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full relative">
      {/* Decorative background blur */}
      <div className="absolute top-20 left-0 w-72 h-72 bg-orange-50 rounded-full blur-3xl -ml-32 opacity-60 pointer-events-none z-0"></div>
      
      <div className="mb-12 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
          Community Contribution
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4 leading-tight">
          Share a Hidden Gem
        </h1>
        <p className="text-slate-400 max-w-xl mx-auto text-base sm:text-lg">
          Know a great spot for a weekend trip? Share it with the community. Detailed submissions help fellow travelers explore better.
        </p>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-3xl border border-gray-100 shadow-2xl relative z-10 text-gray-900">
        {submitError && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-900 flex items-start gap-3 animate-shake shadow-sm">
            <Info className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-950">Submission Blocked</p>
              <p className="text-rose-700 mt-0.5 leading-relaxed">{submitError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          
          {/* Section: Basic Info */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-2">1. Basic Information</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="place_name" className="block text-sm font-semibold text-gray-900">Place Name <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <Navigation className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${errors.place_name ? 'text-rose-400' : 'text-gray-400'}`} />
                  <input 
                    type="text" 
                    id="place_name" 
                    name="place_name" 
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-white text-gray-900 placeholder:text-gray-400 font-medium ${errors.place_name ? 'border-rose-300 bg-rose-50 focus:ring-rose-200 focus:border-rose-500' : 'border-gray-200 focus:ring-[#f97316]/20 focus:border-[#f97316]'} outline-none focus:ring-4 transition-all`} 
                    placeholder="e.g. Avalabetta Viewpoint" 
                  />
                </div>
                {errors.place_name && <p className="text-sm text-rose-500 mt-1 flex items-center gap-1"><Info className="w-4 h-4"/> {errors.place_name}</p>}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="approximate_location" className="block text-sm font-semibold text-gray-900">Approximate Location <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${errors.approximate_location ? 'text-rose-400' : 'text-gray-400'}`} />
                  <input 
                    type="text" 
                    id="approximate_location" 
                    name="approximate_location" 
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-white text-gray-900 placeholder:text-gray-400 font-medium ${errors.approximate_location ? 'border-rose-300 bg-rose-50 focus:ring-rose-200 focus:border-rose-500' : 'border-gray-200 focus:ring-[#f97316]/20 focus:border-[#f97316]'} outline-none focus:ring-4 transition-all`} 
                    placeholder="e.g. Chikkaballapur District" 
                  />
                </div>
                {errors.approximate_location && <p className="text-sm text-rose-500 mt-1 flex items-center gap-1"><Info className="w-4 h-4"/> {errors.approximate_location}</p>}
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-semibold text-gray-900">
                Description <span className="text-xs text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea 
                id="description" 
                name="description" 
                rows={4} 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 font-medium focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none focus:ring-4 transition-all resize-none" 
                placeholder="What makes this place special? Any parking tips or things travelers should be cautious about? (Optional)"
              ></textarea>
            </div>
          </div>

          {/* Section: Details */}
          <div className="space-y-6 pt-4">
            <h2 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-2">2. Details</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="estimated_cost" className="block text-sm font-semibold text-gray-900">
                  Estimated Cost per person (₹) <span className="text-rose-500">*</span> 
                  <span className="text-xs text-gray-500 font-normal ml-1">(Enter 0 for free sightseeing)</span>
                </label>
                <div className="relative">
                  <IndianRupee className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${errors.estimated_cost ? 'text-rose-400' : 'text-gray-400'}`} />
                  <input 
                    type="number" 
                    id="estimated_cost" 
                    name="estimated_cost" 
                    min="0" 
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-white text-gray-900 placeholder:text-gray-400 font-medium ${errors.estimated_cost ? 'border-rose-300 bg-rose-50 focus:ring-rose-200 focus:border-rose-500' : 'border-gray-200 focus:ring-[#f97316]/20 focus:border-[#f97316]'} outline-none focus:ring-4 transition-all`} 
                    placeholder="e.g. 0 or 250" 
                  />
                </div>
                {errors.estimated_cost && <p className="text-sm text-rose-500 mt-1 flex items-center gap-1"><Info className="w-4 h-4"/> {errors.estimated_cost}</p>}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="category" className="block text-sm font-semibold text-gray-900">Category <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <List className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${errors.category ? 'text-rose-400' : 'text-gray-400'}`} />
                  <select 
                    id="category" 
                    name="category" 
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-white text-gray-900 font-medium cursor-pointer ${errors.category ? 'border-rose-300 bg-rose-50 focus:ring-rose-200 focus:border-rose-500' : 'border-gray-200 focus:ring-[#f97316]/20 focus:border-[#f97316]'} outline-none focus:ring-4 transition-all appearance-none`}
                  >
                    <option value="" className="text-gray-400 bg-white">Select a category</option>
                    {PLACE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="text-gray-900 bg-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.category && <p className="text-sm text-rose-500 mt-1 flex items-center gap-1"><Info className="w-4 h-4"/> {errors.category}</p>}
              </div>
            </div>
          </div>

          {/* Section: Media & Photos */}
          <div className="space-y-6 pt-4">
            <h2 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-2">3. Photos & Media</h2>
            
            <ImageUploader
              coverUrl={imageUrl}
              onCoverChange={setImageUrl}
              galleryUrls={galleryUrls}
              onGalleryChange={setGalleryUrls}
              maxGalleryPhotos={5}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="map_link" className="block text-sm font-semibold text-gray-900">
                  Google Maps Pin <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                </label>
                <span className="text-xs text-gray-400">Google Maps URLs only</span>
              </div>
              <input 
                type="url" 
                id="map_link" 
                name="map_link" 
                className={`w-full px-4 py-3 rounded-xl border bg-white text-gray-900 placeholder:text-gray-400 font-medium ${errors.map_link ? 'border-rose-300 bg-rose-50 focus:ring-rose-200 focus:border-rose-500' : 'border-gray-200 focus:ring-[#f97316]/20 focus:border-[#f97316]'} outline-none focus:ring-4 transition-all`} 
                placeholder="https://maps.app.goo.gl/... or https://maps.google.com/..." 
              />
              {errors.map_link && (
                <p className="text-sm text-rose-500 mt-1 flex items-center gap-1">
                  <Info className="w-4 h-4 shrink-0"/> {errors.map_link}
                </p>
              )}
            </div>
          </div>

          {/* Section: Practical Info (Optional for users) */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="text-xl font-bold text-gray-900">4. Practical Info</h2>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                Optional
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="opening_hours" className="block text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gray-400" /> Opening Time
                  </label>
                  <input
                    type="time"
                    id="opening_hours"
                    name="opening_hours"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 font-medium focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none focus:ring-4 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="closing_hours" className="block text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gray-400" /> Closing Time
                  </label>
                  <input
                    type="time"
                    id="closing_hours"
                    name="closing_hours"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 font-medium focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none focus:ring-4 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="transport_options" className="block text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-gray-400" /> How to Reach / Transport Tips
                </label>
                <input
                  type="text"
                  id="transport_options"
                  name="transport_options"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 font-medium focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none focus:ring-4 transition-all"
                  placeholder="e.g. BMTC Bus 335E or metro station nearby"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="nearby_facilities" className="block text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" /> Nearby Facilities
                </label>
                <input
                  type="text"
                  id="nearby_facilities"
                  name="nearby_facilities"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 font-medium focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none focus:ring-4 transition-all"
                  placeholder="e.g. Restrooms, Parking, Street food stalls (comma-separated)"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-8">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-[#f97316] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#ea580c] transition-all transform hover:-translate-y-0.5 shadow-lg flex items-center justify-center gap-3 disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">Processing...</span>
              ) : (
                <>Submit Place for Review <Send className="w-5 h-5" /></>
              )}
            </button>
            <p className="text-center text-xs text-gray-500 mt-4">
              By submitting, you agree to our community guidelines.
            </p>
          </div>
          
        </form>
      </div>
    </div>
  );
};
