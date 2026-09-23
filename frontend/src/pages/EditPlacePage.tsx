import React, { useState, useEffect } from 'react';
import { Save, MapPin, CheckCircle, Info, IndianRupee, List, Navigation, Clock } from 'lucide-react';
import { placesApi } from '../api/client';
import { Link, useParams } from 'react-router-dom';
import type { Place } from '../types';
import { PLACE_CATEGORIES } from '../types';
import { ImageUploader } from '../components/ImageUploader';

export const EditPlacePage = () => {
  const { id } = useParams<{ id: string }>();
  const [place, setPlace] = useState<Place | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (data: Record<string, string>) => {
    const newErrors: Record<string, string> = {};
    if (!data.place_name?.trim()) newErrors.place_name = 'Place name is required';
    if (!data.approximate_location?.trim()) newErrors.approximate_location = 'Location is required';
    if (!data.description?.trim()) newErrors.description = 'Description is required';
    if (data.description?.trim() && data.description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }
    if (data.estimated_cost === undefined || data.estimated_cost.trim() === '' || isNaN(Number(data.estimated_cost)) || Number(data.estimated_cost) < 0) {
      newErrors.estimated_cost = 'Please enter a valid cost (enter 0 for free sightseeing)';
    }

    if (!data.category) newErrors.category = 'Please select a category';

    // Practical Info validation (Compulsory for Admin)
    if (!data.opening_hours?.trim()) newErrors.opening_hours = 'Opening time is compulsory for admin';
    if (!data.closing_hours?.trim()) newErrors.closing_hours = 'Closing time is compulsory for admin';
    if (!data.transport_options?.trim()) newErrors.transport_options = 'Transport options are compulsory for admin';
    if (!data.nearby_facilities?.trim()) newErrors.nearby_facilities = 'Nearby facilities are compulsory for admin';

    return newErrors;
  };

  const [imageUrl, setImageUrl] = useState<string>('');
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

  useEffect(() => {
    const fetchPlace = async () => {
      if (!id) return;
      try {
        const data = await placesApi.getPlaceById(id);
        if (data) {
          setPlace(data);
          setImageUrl(data.image_url || '');
          setGalleryUrls(data.gallery_images || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchPlace();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

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
      const success = await placesApi.editPlace(Number(id), {
        name: data.place_name,
        description: data.description,
        state: data.approximate_location,
        budget_tier: String(data.estimated_cost),
        image_url: imageUrl || place?.image_url || 'https://images.unsplash.com/photo-1506461883276-594543d04e12',
        gallery_images: galleryUrls,
        map_link: data.map_link,
        category: data.category,
        opening_hours: data.opening_hours,
        closing_hours: data.closing_hours,
        transport_options: data.transport_options,
        nearby_facilities: data.nearby_facilities,
      });

      if (success) {
        setIsSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert('The backend rejected the data. Check the console!');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to submit. Please try again.');
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

            <h2 className="text-3xl font-serif font-bold text-gray-900 mb-3">Changes Saved!</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Your changes have been saved successfully to the database.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={`/places/${id}`}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#1a4731] text-white rounded-xl font-bold hover:bg-[#123523] transition-colors shadow-lg"
              >
                View Place
              </Link>
              <Link
                to="/explore"
                className="w-full sm:w-auto px-8 py-3.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Back to Explore
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-32 text-center">
        <p className="text-gray-500 text-lg animate-pulse">Loading destination details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full relative">
      {/* Decorative background blur */}
      <div className="absolute top-20 left-0 w-72 h-72 bg-orange-50 rounded-full blur-3xl -ml-32 opacity-60 pointer-events-none z-0"></div>

      <div className="mb-12 text-center relative z-10">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#1a4731] mb-6 leading-tight">
          Edit Place Details
        </h1>
        <p className="text-gray-600 max-w-xl mx-auto text-lg">
          Update the information to keep the community informed.
        </p>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-3xl border border-gray-100 shadow-xl relative z-10">
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
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.place_name ? 'border-rose-300 bg-rose-50 focus:ring-rose-200 focus:border-rose-500' : 'border-gray-200 focus:ring-[#f97316]/20 focus:border-[#f97316]'} outline-none focus:ring-4 transition-all`}
                    placeholder="e.g. Avalabetta Viewpoint"
                    defaultValue={place.name}
                  />
                </div>
                {errors.place_name && <p className="text-sm text-rose-500 mt-1 flex items-center gap-1"><Info className="w-4 h-4" /> {errors.place_name}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="approximate_location" className="block text-sm font-semibold text-gray-900">Approximate Location <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${errors.approximate_location ? 'text-rose-400' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    id="approximate_location"
                    name="approximate_location"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.approximate_location ? 'border-rose-300 bg-rose-50 focus:ring-rose-200 focus:border-rose-500' : 'border-gray-200 focus:ring-[#f97316]/20 focus:border-[#f97316]'} outline-none focus:ring-4 transition-all`}
                    placeholder="e.g. Chikkaballapur District"
                    defaultValue={place.state}
                  />
                </div>
                {errors.approximate_location && <p className="text-sm text-rose-500 mt-1 flex items-center gap-1"><Info className="w-4 h-4" /> {errors.approximate_location}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-semibold text-gray-900">Description <span className="text-rose-500">*</span></label>
              <textarea
                id="description"
                name="description"
                rows={5}
                className={`w-full px-4 py-3 rounded-xl border ${errors.description ? 'border-rose-300 bg-rose-50 focus:ring-rose-200 focus:border-rose-500' : 'border-gray-200 focus:ring-[#f97316]/20 focus:border-[#f97316]'} outline-none focus:ring-4 transition-all resize-none`}
                placeholder="What makes this place special? How is the road condition? Is there anything travelers should be cautious about?"
                defaultValue={place.description}
              ></textarea>
              {errors.description && <p className="text-sm text-rose-500 mt-1 flex items-center gap-1"><Info className="w-4 h-4" /> {errors.description}</p>}
            </div>
          </div>

          {/* Section: Details */}
          <div className="space-y-6 pt-4">
            <h2 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-2">2. Details</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="estimated_cost" className="block text-sm font-semibold text-gray-900">Estimated Cost per person (₹) <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <IndianRupee className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${errors.estimated_cost ? 'text-rose-400' : 'text-gray-400'}`} />
                  <input
                    type="number"
                    id="estimated_cost"
                    name="estimated_cost"
                    min="0"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.estimated_cost ? 'border-rose-300 bg-rose-50 focus:ring-rose-200 focus:border-rose-500' : 'border-gray-200 focus:ring-[#f97316]/20 focus:border-[#f97316]'} outline-none focus:ring-4 transition-all`}
                    placeholder="500"
                    defaultValue={place.budget_tier}
                  />
                </div>
                {errors.estimated_cost && <p className="text-sm text-rose-500 mt-1 flex items-center gap-1"><Info className="w-4 h-4" /> {errors.estimated_cost}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="category" className="block text-sm font-semibold text-gray-900">Category <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <List className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${errors.category ? 'text-rose-400' : 'text-gray-400'}`} />
                  <select
                    id="category"
                    name="category"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.category ? 'border-rose-300 bg-rose-50 focus:ring-rose-200 focus:border-rose-500' : 'border-gray-200 focus:ring-[#f97316]/20 focus:border-[#f97316]'} outline-none focus:ring-4 transition-all appearance-none bg-transparent`}
                    defaultValue={place.category}
                  >
                    <option value="">Select a category</option>
                    {PLACE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.category && <p className="text-sm text-rose-500 mt-1 flex items-center gap-1"><Info className="w-4 h-4" /> {errors.category}</p>}
              </div>
            </div>
          </div>

          {/* Section: Photos & Media */}
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
              <label htmlFor="map_link" className="block text-sm font-semibold text-gray-900">Google Map Link</label>
              <input
                type="url"
                id="map_link"
                name="map_link"
                defaultValue={place.map_link || ''}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all"
                placeholder="Link to a blog, Google Maps pin, or official website"
              />
            </div>
          </div>

          {/* Section: Practical Info (Admin Curated) */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="text-xl font-bold text-gray-900">4. Practical Info</h2>
              <span className="text-xs font-semibold text-[#1a4731] bg-[#1a4731]/10 px-2.5 py-1 rounded-full">
                Compulsory for Admin
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="opening_hours" className="block text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gray-400" /> Opening Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    id="opening_hours"
                    name="opening_hours"
                    defaultValue={place.opening_hours || '09:00'}
                    className={`w-full px-4 py-3 rounded-xl border ${errors.opening_hours ? 'border-rose-300 bg-rose-50' : 'border-gray-200 focus:ring-[#f97316]/20 focus:border-[#f97316]'} outline-none focus:ring-4 transition-all`}
                  />
                  {errors.opening_hours && <p className="text-sm text-rose-500 mt-1 flex items-center gap-1"><Info className="w-4 h-4" /> {errors.opening_hours}</p>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="closing_hours" className="block text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gray-400" /> Closing Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    id="closing_hours"
                    name="closing_hours"
                    defaultValue={place.closing_hours || '21:00'}
                    className={`w-full px-4 py-3 rounded-xl border ${errors.closing_hours ? 'border-rose-300 bg-rose-50' : 'border-gray-200 focus:ring-[#f97316]/20 focus:border-[#f97316]'} outline-none focus:ring-4 transition-all`}
                  />
                  {errors.closing_hours && <p className="text-sm text-rose-500 mt-1 flex items-center gap-1"><Info className="w-4 h-4" /> {errors.closing_hours}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="transport_options" className="block text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-gray-400" /> Transport Options <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="transport_options"
                  name="transport_options"
                  defaultValue={place.transport_options || 'Local cabs and buses available'}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.transport_options ? 'border-rose-300 bg-rose-50' : 'border-gray-200 focus:ring-[#f97316]/20 focus:border-[#f97316]'} outline-none focus:ring-4 transition-all`}
                  placeholder="e.g. Local cabs and buses available, Nearest metro 1.5 km"
                />
                {errors.transport_options && <p className="text-sm text-rose-500 mt-1 flex items-center gap-1"><Info className="w-4 h-4" /> {errors.transport_options}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="nearby_facilities" className="block text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" /> Nearby Facilities <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="nearby_facilities"
                  name="nearby_facilities"
                  defaultValue={place.nearby_facilities || 'Basic eateries, Restrooms'}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.nearby_facilities ? 'border-rose-300 bg-rose-50' : 'border-gray-200 focus:ring-[#f97316]/20 focus:border-[#f97316]'} outline-none focus:ring-4 transition-all`}
                  placeholder="Comma-separated: Parking, Restrooms, Drinking water, Eateries"
                />
                <p className="text-xs text-gray-500">Separate items with commas so they render as bullet points.</p>
                {errors.nearby_facilities && <p className="text-sm text-rose-500 mt-1 flex items-center gap-1"><Info className="w-4 h-4" /> {errors.nearby_facilities}</p>}
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
                <span className="flex items-center gap-2">Saving...</span>
              ) : (
                <>Save Changes <Save className="w-5 h-5" /></>
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
