import React, { useRef, useState } from 'react';
import { Camera, MapPin, Upload, Video } from 'lucide-react';
import { addGeotag, uploadMedia } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

export default function MobileInput() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState<{ url: string; type: 'image' | 'video'; file?: File | Blob; base64Fallback?: string } | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleMediaCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      const objectUrl = URL.createObjectURL(file);
      
      if (!isVideo) {
        // Compress image before saving for fallback
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            
            setMedia({ url: objectUrl, type: 'image', file, base64Fallback: dataUrl });
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        setMedia({ url: objectUrl, type: 'video', file });
      }
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
        setError(null);
      },
      () => {
        setError('Unable to retrieve your location');
        setLoading(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !location || !media) {
      setError('Title, media, and location are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let finalMediaUrl = media.base64Fallback || media.url;
      
      // Try to upload to Firebase Storage if we have a file
      if (media.file) {
        try {
          finalMediaUrl = await uploadMedia(media.file, media.type, media.file instanceof File ? media.file.name : 'upload');
        } catch (storageError) {
          console.warn("Storage failed, using fallback URL.");
          if (media.type === 'video') {
            throw new Error("Video uploads require Firebase Storage configuration, which failed.");
          }
        }
      }

      await addGeotag({
        title,
        description,
        latitude: location.lat,
        longitude: location.lng,
        mediaUrl: finalMediaUrl,
        mediaType: media.type,
        photoBase64: media.type === 'image' ? finalMediaUrl : '', // for backward compatibility in map
      });
      // Reset form
      setTitle('');
      setDescription('');
      if (media?.url) URL.revokeObjectURL(media.url);
      setMedia(null);
      setLocation(null);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to save geotag');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-slate-800">New Geotag</h1>
        <button onClick={() => navigate('/')} className="text-indigo-600 text-sm font-bold">Cancel</button>
      </header>

      <main className="flex-1 p-6">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* Media Capture Section */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Media Documentation</label>
            {!media ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
                  style={{ minHeight: '160px' }}
                >
                  <div className="h-12 w-12 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors mb-3">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-600">Camera</span>
                  <span className="text-[10px] text-slate-400 mt-1">Take photo/video</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
                  style={{ minHeight: '160px' }}
                >
                  <div className="h-12 w-12 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors mb-3">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-600">Gallery</span>
                  <span className="text-[10px] text-slate-400 mt-1">Upload from device</span>
                </button>
              </div>
            ) : (
              <div className="relative border-2 border-slate-200 rounded-lg p-2 bg-slate-50 flex flex-col gap-2">
                {media.type === 'video' ? (
                  <video src={media.url} controls className="max-h-48 rounded shadow-sm w-full object-contain" />
                ) : (
                  <img src={media.url} alt="Preview" className="max-h-48 w-full object-contain rounded shadow-sm" />
                )}
                <div className="flex gap-2 w-full">
                  <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded shadow-sm hover:bg-indigo-50 text-slate-700 font-medium text-xs transition-colors">
                    <Camera className="w-4 h-4" /> Retake Photo
                  </button>
                  <button type="button" onClick={() => galleryInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded shadow-sm hover:bg-indigo-50 text-slate-700 font-medium text-xs transition-colors">
                    <Upload className="w-4 h-4" /> Change File
                  </button>
                </div>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={cameraInputRef} 
              className="hidden" 
              onChange={handleMediaCapture} 
            />
            <input 
              type="file" 
              accept="image/*,video/*" 
              ref={galleryInputRef} 
              className="hidden" 
              onChange={handleMediaCapture} 
            />
          </div>

          {/* Location Section */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Location Coordinates</label>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={getLocation}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors font-medium text-sm flex-1 shadow-sm"
              >
                <MapPin className="w-4 h-4 text-slate-500" />
                <span>{loading ? 'Getting location...' : 'Get Current Location'}</span>
              </button>
            </div>
            {location && (
              <p className="text-xs text-slate-500 mt-2 px-1">
                Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
              </p>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Title</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.g., Pothole on Main St"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Field Notes</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed status of observation..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !media || !location || !title}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md active:scale-[0.98] transition-transform flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-5 h-5" />
            <span>{loading ? 'Saving...' : 'Submit Geotag'}</span>
          </button>
        </form>
      </main>
    </div>
  );
}
