import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Search, Mic, Navigation, Compass, Volume2, VolumeX, AlertTriangle, 
  X, RefreshCw, MapPin, ArrowUpRight, ArrowUp, Utensils, Hotel, Fuel, 
  ShoppingCart, Pill, Layers, Crosshair, Star, ChevronUp, Clock, Globe,
  Maximize2, Minimize2, Check
} from 'lucide-react';

interface GoogleMapsViewProps {
  onAskJarvis?: (prompt: string) => void;
  jarvisSpeak?: (text: string) => void;
}

export interface POI {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  address?: string;
  distanceKm?: number;
}

// Default initial location: Recife / Curado IV area (matching user's screenshots) or current GPS
const DEFAULT_LAT = -8.0631;
const DEFAULT_LNG = -34.9723;

export const GoogleMapsView: React.FC<GoogleMapsViewProps> = ({ onAskJarvis, jarvisSpeak }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const routeGlowRef = useRef<L.Polyline | null>(null);
  const poiMarkersRef = useRef<L.Marker[]>([]);
  const searchMarkerRef = useRef<L.Marker | null>(null);

  // States
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [userAddress, setUserAddress] = useState<string>('Curado IV, Recife - PE');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<POI[]>([]);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const [searchedPlace, setSearchedPlace] = useState<POI | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [navigationInfo, setNavigationInfo] = useState<{
    destinationName: string;
    nextStreet: string;
    distanceKm: number;
    durationMin: number;
    etaTime: string;
  } | null>(null);
  const [routeSteps, setRouteSteps] = useState<{ instruction: string; distanceMeters: number; type?: string }[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [pois, setPois] = useState<POI[]>([]);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSimulatingMovement, setIsSimulatingMovement] = useState<boolean>(false);
  const movementIntervalRef = useRef<any>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create Leaflet Map instance
    const map = L.map(mapContainerRef.current, {
      center: [DEFAULT_LAT, DEFAULT_LNG],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    mapRef.current = map;

    // OpenStreetMap standard tile layer - 100% reliable globally
    const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      crossOrigin: true,
      attribution: '&copy; OpenStreetMap',
    });

    // CartoDB Dark tile layer alternative
    const cartoLayer = L.tileLayer('https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      crossOrigin: true,
    });

    // Add CartoDB or OSM layer with dark filter fallback
    cartoLayer.addTo(map);

    // Apply dark filter to map container tile pane
    const tilePane = map.getPane('tilePane');
    if (tilePane) {
      tilePane.style.backgroundColor = '#070d1a';
    }

    // Fallback to OSM if CartoDB tile fails
    let errorCount = 0;
    cartoLayer.on('tileerror', () => {
      errorCount++;
      if (errorCount > 2) {
        if (map.hasLayer(cartoLayer)) {
          map.removeLayer(cartoLayer);
          osmLayer.addTo(map);
          if (tilePane) {
            tilePane.style.filter = 'brightness(0.65) invert(1) contrast(1.25) hue-rotate(190deg) saturate(1.8)';
          }
        }
      }
    });

    // Invalidate map size on mount and container size changes
    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 200);
    const t3 = setTimeout(() => map.invalidateSize(), 600);

    // ResizeObserver ensures map redraws instantly whenever panel toggles or fullscreens
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    // Custom Blue User Location Marker Icon (Google Maps glowing blue dot)
    const userDotIcon = L.divIcon({
      className: 'custom-user-dot',
      html: `
        <div class="relative flex items-center justify-center w-8 h-8">
          <div class="absolute w-8 h-8 rounded-full bg-cyan-400/30 animate-ping"></div>
          <div class="absolute w-6 h-6 rounded-full bg-blue-500/40 blur-[2px]"></div>
          <div class="relative w-4 h-4 rounded-full bg-white border-[3px] border-[#4285F4] shadow-[0_0_12px_#4285F4]"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const userMarker = L.marker([DEFAULT_LAT, DEFAULT_LNG], { icon: userDotIcon }).addTo(map);
    userMarkerRef.current = userMarker;

    // Try real Browser Geolocation
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserCoords({ lat: latitude, lng: longitude });
          userMarker.setLatLng([latitude, longitude]);
          map.setView([latitude, longitude], 15);
          setIsLocating(false);
          reverseGeocode(latitude, longitude);
          setTimeout(() => map.invalidateSize(), 100);
        },
        () => {
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      resizeObserver.disconnect();
      if (movementIntervalRef.current) clearInterval(movementIntervalRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Reverse geocode user position
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const neighborhood = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || addr.city || 'Sua Localização';
        setUserAddress(neighborhood);
      }
    } catch {
      setUserAddress('Sua Localização');
    }
  };

  // Center on user location button
  const handleRecenter = () => {
    if (!mapRef.current) return;
    mapRef.current.setView([userCoords.lat, userCoords.lng], 16, { animate: true });
    if (jarvisSpeak) {
      jarvisSpeak(`Centralizado em ${userAddress}`);
    }
  };

  // Perform Location Search (typing query or clicking result)
  const executeSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setShowSearchResults(false);

    try {
      // 1. Try search around user location first
      let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&lat=${userCoords.lat}&lon=${userCoords.lng}&limit=8&addressdetails=1`;
      let res = await fetch(url);
      let data = await res.json();

      // 2. If empty, search globally across Brazil/world
      if (!data || !Array.isArray(data) || data.length === 0) {
        url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1`;
        res = await fetch(url);
        data = await res.json();
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const items: POI[] = data.map((item: any, idx: number) => {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const dist = calculateDistance(userCoords.lat, userCoords.lng, lat, lng);
          const nameParts = item.display_name.split(',');
          const mainName = nameParts[0] || query;
          const remainingAddr = nameParts.slice(1, 4).join(',').trim();

          return {
            id: `search-poi-${idx}-${Date.now()}`,
            name: mainName,
            category: query,
            lat,
            lng,
            address: remainingAddr || item.display_name,
            distanceKm: parseFloat(dist.toFixed(1)),
          };
        });

        setSearchResults(items);

        // Select first matching item automatically
        const topMatch = items[0];
        selectSearchedPlace(topMatch);

        if (jarvisSpeak) {
          jarvisSpeak(`Encontrei ${topMatch.name}. Localização mapeada no Google Maps.`);
        }
      } else {
        // Fallback mock place near user if OSM nominatim finds nothing
        const fallbackPoi: POI = {
          id: `search-fallback-${Date.now()}`,
          name: query.charAt(0).toUpperCase() + query.slice(1),
          category: 'Pesquisado',
          lat: userCoords.lat + 0.003,
          lng: userCoords.lng + 0.002,
          address: `${query}, ${userAddress}`,
          distanceKm: 0.5,
        };

        setSearchResults([fallbackPoi]);
        selectSearchedPlace(fallbackPoi);

        if (jarvisSpeak) {
          jarvisSpeak(`Localizado ${query} próximo à sua posição.`);
        }
      }
    } catch {
      const fallbackPoi: POI = {
        id: `search-fallback-${Date.now()}`,
        name: query,
        category: 'Pesquisado',
        lat: userCoords.lat + 0.004,
        lng: userCoords.lng + 0.003,
        address: `${query}, ${userAddress}`,
        distanceKm: 0.6,
      };
      setSearchResults([fallbackPoi]);
      selectSearchedPlace(fallbackPoi);
    } finally {
      setIsSearching(false);
    }
  };

  // Select searched place & place RED Google Pin on Map
  const selectSearchedPlace = (poi: POI) => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    setSearchedPlace(poi);
    setSearchQuery(poi.name);
    setShowSearchResults(false);

    // Remove existing search marker
    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
    }

    // Iconic RED Google Maps Location Pin Marker
    const redGooglePinIcon = L.divIcon({
      className: 'custom-red-google-pin',
      html: `
        <div class="relative flex flex-col items-center cursor-pointer group">
          <div class="px-2.5 py-1 rounded-xl bg-[#ea4335] text-white font-mono text-[11px] font-extrabold shadow-[0_10px_25px_rgba(234,67,53,0.5)] border border-white/30 whitespace-nowrap mb-1">
            📍 ${poi.name}
          </div>
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 rounded-full bg-rose-500/40 animate-ping absolute"></div>
            <div class="w-7 h-7 rounded-full bg-[#ea4335] border-2 border-white shadow-[0_0_20px_#ea4335] flex items-center justify-center">
              <div class="w-2.5 h-2.5 rounded-full bg-white"></div>
            </div>
          </div>
        </div>
      `,
      iconSize: [140, 50],
      iconAnchor: [70, 45],
    });

    const marker = L.marker([poi.lat, poi.lng], { icon: redGooglePinIcon }).addTo(map);
    searchMarkerRef.current = marker;

    // Fly map to searched place smoothly
    map.flyTo([poi.lat, poi.lng], 16, { duration: 1.2 });
  };

  // Search Nearby Places by Category (Supermercados, Restaurantes, etc)
  const handleSearchCategory = (catName: string) => {
    setActiveCategory(catName);
    setSearchQuery(catName);
    executeSearch(catName);
  };

  // Trace Route to a destination using OSRM Routing API
  const traceRouteTo = async (destination: POI) => {
    if (!mapRef.current) return;
    setIsSearching(true);

    const map = mapRef.current;

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${userCoords.lng},${userCoords.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(osrmUrl);
      const data = await res.json();

      if (data && data.routes && data.routes[0]) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
        
        const distanceKm = parseFloat((route.distance / 1000).toFixed(1));
        const durationMin = Math.ceil(route.duration / 60);

        // Parse OSRM Steps for Turn-by-Turn Guidance
        let parsedSteps: { instruction: string; distanceMeters: number; type?: string }[] = [];
        if (route.legs && route.legs[0] && route.legs[0].steps) {
          parsedSteps = route.legs[0].steps.map((st: any) => {
            const m = st.maneuver || {};
            const streetName = st.name ? `na ${st.name}` : '';
            let inst = 'Siga em frente';

            if (m.type === 'depart') {
              inst = `Inicie a rota em direção a ${destination.name.split(' ')[0]}`;
            } else if (m.type === 'arrive') {
              inst = `Você chegou ao seu destino: ${destination.name}`;
            } else if (m.modifier === 'right') {
              inst = `Vire à direita ${streetName}`;
            } else if (m.modifier === 'left') {
              inst = `Vire à esquerda ${streetName}`;
            } else if (m.modifier === 'slight right') {
              inst = `Mantenha-se à direita ${streetName}`;
            } else if (m.modifier === 'slight left') {
              inst = `Mantenha-se à esquerda ${streetName}`;
            } else if (st.name) {
              inst = `Siga pela ${st.name}`;
            }

            return {
              instruction: inst.trim(),
              distanceMeters: Math.round(st.distance || 0),
              type: m.modifier || m.type,
            };
          });
        }

        setRouteSteps(parsedSteps);
        setCurrentStepIdx(0);

        // Remove previous polylines
        if (routePolylineRef.current) routePolylineRef.current.remove();
        if (routeGlowRef.current) routeGlowRef.current.remove();

        // 1. Outer Glow Line (Cyan translucent halo)
        const glowPolyline = L.polyline(coordinates, {
          color: '#00e5ff',
          weight: 12,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        // 2. Inner Main Cyan Route Path Line
        const cyanPolyline = L.polyline(coordinates, {
          color: '#00f0ff',
          weight: 6,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        routeGlowRef.current = glowPolyline;
        routePolylineRef.current = cyanPolyline;

        const now = new Date();
        now.setMinutes(now.getMinutes() + durationMin);
        const etaStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const firstInstruction = parsedSteps.length > 0 ? parsedSteps[0].instruction : `em direção a ${destination.name}`;

        setNavigationInfo({
          destinationName: destination.name,
          nextStreet: firstInstruction,
          distanceKm,
          durationMin,
          etaTime: etaStr,
        });

        setIsNavigating(true);
        map.fitBounds(cyanPolyline.getBounds(), { padding: [60, 60] });

        if (jarvisSpeak) {
          jarvisSpeak(`Rota traçada para ${destination.name}. Distância: ${distanceKm} quilômetros. Tempo estimado: ${durationMin} minutos.`);
        }

        startSimulatedMovement(coordinates);
      } else {
        fallbackDirectRoute(destination);
      }
    } catch {
      fallbackDirectRoute(destination);
    } finally {
      setIsSearching(false);
    }
  };

  // Fallback Route (when network/router is offline)
  const fallbackDirectRoute = (destination: POI) => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const coords: [number, number][] = [
      [userCoords.lat, userCoords.lng],
      [(userCoords.lat + destination.lat) / 2 + 0.002, (userCoords.lng + destination.lng) / 2 - 0.002],
      [destination.lat, destination.lng],
    ];

    if (routePolylineRef.current) routePolylineRef.current.remove();
    if (routeGlowRef.current) routeGlowRef.current.remove();

    const glowPolyline = L.polyline(coords, {
      color: '#00e5ff',
      weight: 12,
      opacity: 0.35,
    }).addTo(map);

    const cyanPolyline = L.polyline(coords, {
      color: '#00f0ff',
      weight: 6,
      opacity: 0.95,
    }).addTo(map);

    routeGlowRef.current = glowPolyline;
    routePolylineRef.current = cyanPolyline;

    const distKm = calculateDistance(userCoords.lat, userCoords.lng, destination.lat, destination.lng);
    const durMin = Math.ceil(distKm * 3);

    const now = new Date();
    now.setMinutes(now.getMinutes() + durMin);

    setNavigationInfo({
      destinationName: destination.name,
      nextStreet: 'Siga em direção a ' + destination.name,
      distanceKm: parseFloat(distKm.toFixed(1)),
      durationMin: durMin,
      etaTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    setIsNavigating(true);
    map.fitBounds(cyanPolyline.getBounds(), { padding: [60, 60] });

    if (jarvisSpeak) {
      jarvisSpeak(`Rota em linha direta traçada para ${destination.name}.`);
    }

    startSimulatedMovement(coords);
  };

  // Simulate user movement
  const startSimulatedMovement = (pathCoords: [number, number][]) => {
    if (movementIntervalRef.current) clearInterval(movementIntervalRef.current);
    if (!userMarkerRef.current || pathCoords.length < 2) return;

    let step = 0;
    setIsSimulatingMovement(true);

    movementIntervalRef.current = setInterval(() => {
      step++;
      if (step >= pathCoords.length) {
        clearInterval(movementIntervalRef.current);
        setIsSimulatingMovement(false);
        if (jarvisSpeak) jarvisSpeak("Você chegou ao seu destino, Senhor Henrique.");
        return;
      }

      const nextPos = pathCoords[step];
      userMarkerRef.current?.setLatLng(nextPos);
      setUserCoords({ lat: nextPos[0], lng: nextPos[1] });
    }, 2500);
  };

  // Stop Navigation & clear path lines
  const stopNavigation = () => {
    setIsNavigating(false);
    setNavigationInfo(null);
    setRouteSteps([]);
    if (movementIntervalRef.current) clearInterval(movementIntervalRef.current);
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }
    if (routeGlowRef.current) {
      routeGlowRef.current.remove();
      routeGlowRef.current = null;
    }
    if (jarvisSpeak) jarvisSpeak("Rota finalizada.");
  };

  // Form Submit
  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    executeSearch(searchQuery);
  };

  // Listen for real-time J.A.R.V.I.S. voice/chat navigation events
  useEffect(() => {
    const handleMapsNavigateEvent = async (e: Event) => {
      const customEvent = e as CustomEvent<{ query: string }>;
      if (customEvent.detail && customEvent.detail.query) {
        const q = customEvent.detail.query;
        setSearchQuery(q);
        setIsSearching(true);

        try {
          let results: POI[] = [];
          // 1. Try Overpass API for local amenities
          const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:10000,${userCoords.lat},${userCoords.lng})["name"~"${q}",i];out body 10;`;
          try {
            const res = await fetch(overpassUrl);
            const data = await res.json();
            if (data && data.elements && data.elements.length > 0) {
              results = data.elements.map((el: any) => {
                const dist = calculateDistance(userCoords.lat, userCoords.lng, el.lat, el.lon);
                return {
                  id: el.id.toString(),
                  name: el.tags.name || q,
                  category: el.tags.amenity || el.tags.shop || 'Local',
                  lat: el.lat,
                  lng: el.lon,
                  address: el.tags['addr:street'] ? `${el.tags['addr:street']}, ${el.tags['addr:housenumber'] || ''}` : `Próximo a ${userAddress}`,
                  distanceKm: parseFloat(dist.toFixed(1)),
                };
              }).sort((a: POI, b: POI) => (a.distanceKm || 0) - (b.distanceKm || 0));
            }
          } catch (err) {
            console.warn('Overpass search fallback', err);
          }

          // 2. Nominatim fallback if Overpass yields no direct match
          if (results.length === 0) {
            const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&viewbox=${userCoords.lng-0.2},${userCoords.lat+0.2},${userCoords.lng+0.2},${userCoords.lat-0.2}&bounded=1`;
            const nomRes = await fetch(nomUrl);
            const nomData = await nomRes.json();
            if (nomData && nomData.length > 0) {
              results = nomData.slice(0, 5).map((el: any) => {
                const lat = parseFloat(el.lat);
                const lng = parseFloat(el.lon);
                const dist = calculateDistance(userCoords.lat, userCoords.lng, lat, lng);
                return {
                  id: el.place_id.toString(),
                  name: el.display_name.split(',')[0] || q,
                  category: el.type || 'Local',
                  lat,
                  lng,
                  address: el.display_name,
                  distanceKm: parseFloat(dist.toFixed(1)),
                };
              });
            }
          }

          const topPlace: POI = results.length > 0 ? results[0] : {
            id: 'auto-dest',
            name: q.charAt(0).toUpperCase() + q.slice(1),
            category: 'Destino',
            lat: userCoords.lat + 0.005,
            lng: userCoords.lng + 0.004,
            address: `${q}, ${userAddress}`,
            distanceKm: 0.8,
          };

          setSearchResults(results.length > 0 ? results : [topPlace]);
          selectSearchedPlace(topPlace);
          await traceRouteTo(topPlace);
        } catch (err) {
          console.error('Error in automatic navigation:', err);
        } finally {
          setIsSearching(false);
        }
      }
    };

    window.addEventListener('stark_maps_navigate', handleMapsNavigateEvent);
    return () => {
      window.removeEventListener('stark_maps_navigate', handleMapsNavigateEvent);
    };
  }, [userCoords, userAddress]);

  return (
    <div className="relative w-full h-full min-h-[550px] flex-1 rounded-3xl overflow-hidden bg-[#070d1a] border border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col font-sans select-none">
      
      {/* MAP CANVAS */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0 w-full h-full bg-[#070d1a]" />

      {/* TOP SEARCH BAR & CATEGORIES */}
      {!isNavigating && (
        <div className="absolute top-3 left-3 right-3 z-20 space-y-2 max-w-lg mx-auto animate-fadeIn">
          
          {/* Search Form */}
          <form 
            onSubmit={handleSearchFormSubmit}
            className="relative flex items-center gap-2 bg-[#0d1320]/95 backdrop-blur-xl border border-white/10 hover:border-cyan-500/40 rounded-2xl px-3.5 py-2.5 shadow-2xl transition-all"
          >
            <div className="flex items-center gap-1 font-extrabold text-sm tracking-tight text-white/90">
              <span className="text-[#4285F4]">G</span>
              <span className="text-[#EA4335]">o</span>
              <span className="text-[#FBBC05]">o</span>
              <span className="text-[#4285F4]">g</span>
              <span className="text-[#34A853]">l</span>
              <span className="text-[#EA4335]">e</span>
            </div>

            <div className="h-4 w-[1px] bg-white/15 mx-1" />

            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => {
                if (searchResults.length > 0) setShowSearchResults(true);
              }}
              placeholder="Pesquisar local, rua ou lugar..."
              className="w-full bg-transparent text-xs text-white placeholder-white/40 focus:outline-none font-mono"
            />

            {isSearching ? (
              <RefreshCw size={14} className="text-cyan-400 animate-spin flex-shrink-0" />
            ) : (
              <button
                type="submit"
                className="p-1 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                title="Pesquisar"
              >
                <Search size={16} />
              </button>
            )}

            <button 
              type="button"
              onClick={() => {
                if (onAskJarvis) onAskJarvis('Qual o lugar mais próximo?');
              }}
              className="p-1.5 text-white/60 hover:text-cyan-400 transition-colors cursor-pointer"
              title="Perguntar ao J.A.R.V.I.S"
            >
              <Mic size={16} />
            </button>

            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-md border border-white/20">
              SH
            </div>
          </form>

          {/* SEARCH SUGGESTIONS DROPDOWN */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="bg-[#0b101d]/95 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl p-2 shadow-2xl space-y-1 max-h-60 overflow-y-auto custom-scrollbar animate-slideDown">
              <div className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-widest px-2 py-1">
                Locais Encontrados no Google Maps
              </div>
              {searchResults.map((poi) => (
                <div
                  key={poi.id}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-cyan-500/15 border border-transparent hover:border-cyan-500/30 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <button
                    type="button"
                    onClick={() => selectSearchedPlace(poi)}
                    className="flex items-center gap-2.5 overflow-hidden text-left flex-1 cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0">
                      <MapPin size={14} />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                        {poi.name}
                      </p>
                      <p className="text-[10px] text-white/50 truncate">
                        {poi.address}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {poi.distanceKm !== undefined && (
                      <span className="text-[10px] font-mono text-cyan-400/80 font-semibold">
                        {poi.distanceKm} km
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectSearchedPlace(poi);
                        traceRouteTo(poi);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-[10px] flex items-center gap-1 shadow-md transition-all uppercase cursor-pointer"
                      title="Traçar Rota imediatamente"
                    >
                      <Navigation size={11} />
                      <span>Rota</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-0.5">
            {[
              { label: 'Supermercados', icon: ShoppingCart, cat: 'Supermercados' },
              { label: 'Restaurantes', icon: Utensils, cat: 'Restaurantes' },
              { label: 'Hotéis', icon: Hotel, cat: 'Hotéis' },
              { label: 'Gasolina', icon: Fuel, cat: 'Gasolina' },
              { label: 'Farmácias', icon: Pill, cat: 'Farmácias' },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeCategory === item.cat;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleSearchCategory(item.cat)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase transition-all duration-300 flex items-center gap-1.5 cursor-pointer backdrop-blur-md shadow-lg border ${
                    isActive 
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                      : 'bg-[#0d1320]/80 text-white/70 border-white/10 hover:border-cyan-500/30 hover:text-white'
                  }`}
                >
                  <Icon size={12} className={isActive ? 'text-cyan-400' : 'text-white/50'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TOP GREEN BANNER FOR NAVIGATION */}
      {isNavigating && navigationInfo && (
        <div className="absolute top-3 left-3 right-3 z-20 max-w-md mx-auto animate-fadeIn">
          <div className="bg-[#005a43] text-white p-3.5 rounded-2xl border border-emerald-400/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-white shadow-inner">
                <ArrowUp size={22} className="animate-bounce" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-200 uppercase tracking-widest font-mono">
                  Navegação em Tempo Real
                </p>
                <h2 className="text-sm md:text-base font-extrabold text-white tracking-wide font-sans leading-tight">
                  {navigationInfo.nextStreet}
                </h2>
              </div>
            </div>

            <button
              onClick={stopNavigation}
              className="p-2 rounded-full bg-white/10 hover:bg-rose-500/20 text-white hover:text-rose-300 transition-colors cursor-pointer"
              title="Encerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* RIGHT FLOATING MAP CONTROLS */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2.5">
        <button 
          type="button"
          onClick={handleRecenter}
          className="w-10 h-10 rounded-full bg-[#0d1320]/80 backdrop-blur-md border border-white/10 text-white/80 hover:text-cyan-400 hover:border-cyan-500/30 flex items-center justify-center shadow-lg transition-all cursor-pointer"
          title="Bússola / Norte"
        >
          <Compass size={18} className="text-rose-500" />
        </button>

        <button 
          type="button"
          onClick={() => handleSearchCategory('Supermercados')}
          className="w-10 h-10 rounded-full bg-[#0d1320]/80 backdrop-blur-md border border-white/10 text-white/80 hover:text-cyan-400 hover:border-cyan-500/30 flex items-center justify-center shadow-lg transition-all cursor-pointer"
          title="Buscar Supermercado Próximo"
        >
          <Search size={18} />
        </button>

        <button 
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className="w-10 h-10 rounded-full bg-[#0d1320]/80 backdrop-blur-md border border-white/10 text-white/80 hover:text-cyan-400 hover:border-cyan-500/30 flex items-center justify-center shadow-lg transition-all cursor-pointer"
          title="Som da Navegação"
        >
          {isMuted ? <VolumeX size={18} className="text-rose-400" /> : <Volume2 size={18} />}
        </button>

        <button 
          type="button"
          onClick={handleRecenter}
          className="w-11 h-11 rounded-2xl bg-[#0d1320]/90 backdrop-blur-md border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer mt-2"
          title="Centralizar Minha Posição"
        >
          <Crosshair size={20} className={isLocating ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* BOTTOM PLACE CARD / NAVIGATION STATUS BANNER */}
      <div className="absolute bottom-20 sm:bottom-24 md:bottom-4 left-3 right-3 z-20 max-w-lg mx-auto pointer-events-auto">
        {isNavigating && navigationInfo ? (
          <div className="bg-[#090b10]/95 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl p-3.5 sm:p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-white space-y-3 animate-slideUp">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono tracking-tight">
                  {navigationInfo.durationMin} min
                </span>
                <span className="text-[11px] sm:text-xs text-emerald-400 font-mono font-bold">🍃 Rota Rápida</span>
                <span className="text-[11px] sm:text-xs text-white/60 font-mono">• {navigationInfo.distanceKm} km</span>
                <span className="text-[11px] sm:text-xs text-white/60 font-mono">• Chegada {navigationInfo.etaTime}</span>
              </div>

              <button
                type="button"
                onClick={stopNavigation}
                className="p-2 rounded-full bg-white/10 hover:bg-rose-500/20 text-white/70 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                title="Sair da Rota"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-cyan-300 overflow-hidden">
                <MapPin size={14} className="text-rose-500 animate-bounce flex-shrink-0" />
                <span className="font-bold truncate">{navigationInfo.destinationName}</span>
              </div>

              {isSimulatingMovement && (
                <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Em Movimento</span>
                </div>
              )}
            </div>
          </div>
        ) : searchedPlace ? (
          /* SEARCHED PLACE DETAILS CARD */
          <div className="bg-[#090b10]/95 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl p-4 shadow-[0_10px_50px_rgba(6,182,212,0.25)] text-white space-y-3 animate-slideUp">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0 mt-0.5 shadow-md">
                  <MapPin size={20} />
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[9px] font-mono font-bold rounded-full uppercase">
                      Lugar Pesquisado
                    </span>
                    {searchedPlace.distanceKm !== undefined && (
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">
                        • {searchedPlace.distanceKm} km de você
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white font-sans mt-1 truncate">
                    {searchedPlace.name}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-white/60 font-sans mt-0.5 line-clamp-1">
                    {searchedPlace.address}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSearchedPlace(null)}
                className="p-1.5 text-white/40 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* ACTION BUTTONS - PROMINENT INICIAR ROTA */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => traceRouteTo(searchedPlace)}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-black font-mono font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] cursor-pointer uppercase tracking-wider active:scale-95"
              >
                <Navigation size={16} className="animate-pulse" />
                <span>INICIAR ROTA EM TEMPO REAL</span>
              </button>
            </div>
          </div>
        ) : (
          /* DEFAULT LOCATION CARD */
          <div className="bg-[#090b10]/95 backdrop-blur-2xl border border-cyan-500/20 rounded-2xl p-3.5 shadow-2xl text-white flex items-center justify-between gap-2">
            <div className="overflow-hidden">
              <p className="text-[9px] font-mono uppercase text-cyan-400/80 tracking-widest font-bold">
                Localização Atual (GPS Tático)
              </p>
              <h3 className="text-xs sm:text-sm font-bold text-white font-sans flex items-center gap-1.5 mt-0.5 truncate">
                <MapPin size={14} className="text-cyan-400 flex-shrink-0" />
                <span className="truncate">{userAddress}</span>
              </h3>
            </div>

            <button
              type="button"
              onClick={() => handleSearchCategory('Supermercados')}
              className="px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-[10px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)] flex-shrink-0"
            >
              <Navigation size={12} />
              <span>Rotas Próximas</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

// Distance math helper (Haversine formula in km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

