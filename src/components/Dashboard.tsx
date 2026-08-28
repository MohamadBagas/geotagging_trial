import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { subscribeToGeotags, Geotag } from '../lib/firebase';
import { Plus, List, Map as MapIcon, Image as ImageIcon, Video as VideoIcon, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to recenter map when new tags are added
function MapUpdater({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng]);
  }, [center, map]);
  return null;
}

export default function Dashboard() {
  const [geotags, setGeotags] = useState<Geotag[]>([]);
  const [selectedTag, setSelectedTag] = useState<Geotag | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = subscribeToGeotags((data) => {
      setGeotags(data);
    });
    return () => unsubscribe();
  }, []);

  const defaultCenter = geotags.length > 0 
    ? { lat: geotags[0].latitude, lng: geotags[0].longitude }
    : { lat: -6.200000, lng: 106.816666 }; // Default to Jakarta if empty

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-indigo-600 rounded flex items-center justify-center">
            <MapIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Geodata Central</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{geotags.length} points mapped</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="bg-slate-100 p-1 rounded-md border border-slate-200 hidden sm:flex">
            <button 
              onClick={() => setView('map')}
              className={`px-4 py-1.5 rounded-sm text-xs font-bold transition-all uppercase tracking-wider ${view === 'map' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Map
            </button>
            <button 
              onClick={() => setView('list')}
              className={`px-4 py-1.5 rounded-sm text-xs font-bold transition-all uppercase tracking-wider ${view === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              List
            </button>
          </div>
          <button
            onClick={() => navigate('/input')}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md active:scale-[0.98] transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Geotag</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {view === 'map' ? (
          <div className="flex-1 relative w-full h-full z-0">
            <MapContainer
              center={[defaultCenter.lat, defaultCenter.lng]}
              zoom={11}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
            >
              <MapUpdater center={defaultCenter} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {geotags.map((tag) => (
                <Marker
                  key={tag.id}
                  position={[tag.latitude, tag.longitude]}
                  icon={customIcon}
                  eventHandlers={{
                    click: () => setSelectedTag(tag),
                  }}
                />
              ))}
            </MapContainer>

            {/* Mobile View Toggle (Floating) */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 sm:hidden z-10">
              <div className="bg-white p-1.5 rounded-full shadow-md border border-slate-200 flex">
                <button 
                  onClick={() => setView('map')}
                  className={`p-2.5 rounded-full transition-all ${view === 'map' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}
                >
                  <MapIcon className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setView('list')}
                  className={`p-2.5 rounded-full transition-all ${view === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Selected Tag Info Card */}
            {selectedTag && (
              <div className="absolute bottom-6 left-6 right-6 sm:right-auto sm:w-80 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden z-10 transition-all duration-300">
                <div className="h-40 bg-slate-100 relative">
                  {(selectedTag.mediaUrl || selectedTag.photoBase64) ? (
                    selectedTag.mediaType === 'video' ? (
                      <video src={selectedTag.mediaUrl} controls className="w-full h-full object-cover" />
                    ) : (
                      <img src={selectedTag.mediaUrl || selectedTag.photoBase64} alt={selectedTag.title} className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                  <button 
                    onClick={() => setSelectedTag(null)}
                    className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-lg p-1.5 backdrop-blur-sm transition-colors"
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-800">{selectedTag.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{selectedTag.description || 'No description provided.'}</p>
                  <div className="flex items-center text-[10px] font-bold text-slate-400 mt-3 pt-3 border-t border-slate-100 uppercase tracking-widest">
                    <MapPin className="w-3 h-3 mr-1" />
                    {selectedTag.latitude.toFixed(4)}, {selectedTag.longitude.toFixed(4)}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {geotags.length === 0 ? (
                <div className="text-center py-20">
                  <div className="bg-slate-100 border border-slate-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-slate-800 font-bold">No geotags yet</h3>
                  <p className="text-slate-500 text-sm mt-1">Start by adding your first location from a mobile device.</p>
                </div>
              ) : (
                geotags.map((tag) => (
                  <div key={tag.id} className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5 hover:border-indigo-300 transition-colors">
                    <div className="w-full sm:w-32 h-40 sm:h-24 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-100 relative">
                      {(tag.mediaUrl || tag.photoBase64) ? (
                        tag.mediaType === 'video' ? (
                           <div className="w-full h-full relative group bg-black">
                             <video src={tag.mediaUrl} className="w-full h-full object-cover opacity-80" />
                             <div className="absolute inset-0 flex items-center justify-center">
                               <VideoIcon className="w-6 h-6 text-white drop-shadow-md" />
                             </div>
                           </div>
                        ) : (
                          <img src={tag.mediaUrl || tag.photoBase64} alt={tag.title} className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-sm font-bold text-slate-800 truncate">{tag.title}</h3>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md shrink-0 uppercase tracking-wide">
                          {tag.createdAt ? new Date(tag.createdAt.toDate?.() || tag.createdAt).toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 text-xs leading-relaxed">{tag.description}</p>
                      <div className="flex items-center text-[10px] font-bold text-slate-500 mt-3 bg-slate-50 inline-flex px-2 py-1 rounded border border-slate-200 uppercase tracking-widest">
                        <MapPin className="w-3 h-3 mr-1.5 text-slate-400" />
                        Lat: {tag.latitude.toFixed(4)} | Long: {tag.longitude.toFixed(4)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
