import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Crosshair, MapPin, Search } from 'lucide-react';

export interface StructuredDeliveryAddress {
  label: string;
  fullName: string;
  mobile: string;
  email: string;
  buildingName: string;
  street: string;
  area: string;
  district: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  deliveryInstructions: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  formattedAddress?: string;
}

interface AddressLocationPickerProps {
  initialValue?: Partial<StructuredDeliveryAddress>;
  submitLabel?: string;
  onSave: (addr: StructuredDeliveryAddress) => void | Promise<void>;
  onCancel?: () => void;
}

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bengaluru aquatic gallery hub

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /RESOURCE_EXHAUSTED|OVER_QUERY_LIMIT|OverQuotaMapError|QuotaExceeded|429/i.test(msg);
}

interface PlacesAddressComponent {
  types: string[];
  longText?: string;
}

interface PlacesResolvedPlace {
  id?: string;
  displayName?: string;
  formattedAddress?: string;
  addressComponents?: PlacesAddressComponent[];
  location?: {
    lat: () => number;
    lng: () => number;
  };
  fetchFields: (opts: { fields: string[] }) => Promise<void>;
}

interface PlacesSuggestionItem {
  placePrediction?: {
    text?: { text?: string };
    toPlace: () => PlacesResolvedPlace;
  };
}

function usePlacesAutocomplete(inputString: string) {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef = useRef<unknown>(null);
  const [suggestions, setSuggestions] = useState<PlacesSuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!placesLib) return;
    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    const q = inputString.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = window.setTimeout(() => {
      AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q,
        sessionToken: (sessionTokenRef.current ?? undefined) as never,
        includedRegionCodes: ['in'],
      })
        .then((res: { suggestions?: PlacesSuggestionItem[] }) => {
          if (!cancelled) {
            setSuggestions(res.suggestions ?? []);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (isQuotaError(err)) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
          if (!cancelled) {
            setSuggestions([]);
            setLoading(false);
          }
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [placesLib, inputString]);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSuggestions([]);
  }, []);

  return { placesLib, suggestions, loading, resetSession };
}

function PlacesSearchAndMap({
  position,
  onPositionChange,
  onPlaceExtracted,
}: {
  position: { lat: number; lng: number } | null;
  onPositionChange: (coords: { lat: number; lng: number }) => void;
  onPlaceExtracted: (fields: Partial<StructuredDeliveryAddress>) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const { placesLib, suggestions, loading, resetSession } = usePlacesAutocomplete(searchQuery);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    position ?? DEFAULT_CENTER
  );

  const handleSelectSuggestion = async (suggestion: PlacesSuggestionItem) => {
    if (!placesLib || !suggestion.placePrediction) return;
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['addressComponents', 'formattedAddress', 'location', 'displayName'],
      });

      const components = place.addressComponents ?? [];
      const findComponent = (types: string[]) =>
        components.find((c: PlacesAddressComponent) =>
          types.some((t) => c.types.includes(t))
        )?.longText || '';

      const streetNum = findComponent(['street_number']);
      const route = findComponent(['route']);
      const sublocality =
        findComponent(['sublocality_level_1', 'sublocality', 'neighborhood']);
      const district = findComponent(['administrative_area_level_2']);
      const city = findComponent(['locality']) || district || sublocality;
      const state = findComponent(['administrative_area_level_1']);
      const pinCode = findComponent(['postal_code']);
      const country = findComponent(['country']) || 'India';
      const streetCombined = [streetNum, route].filter(Boolean).join(' ') || place.displayName || '';

      const lat = place.location?.lat();
      const lng = place.location?.lng();
      if (typeof lat === 'number' && typeof lng === 'number') {
        const coords = { lat, lng };
        setMapCenter(coords);
        onPositionChange(coords);
      }

      onPlaceExtracted({
        street: streetCombined,
        area: sublocality,
        district: district || city,
        city: city || district,
        state,
        pinCode,
        country,
        placeId: place.id,
        formattedAddress: place.formattedAddress ?? '',
        lat,
        lng,
      });

      setSearchQuery(place.formattedAddress || '');
      resetSession();
    } catch (err) {
      if (isQuotaError(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        setMapCenter(coords);
        onPositionChange(coords);
      },
      () => {
        // User denied or unavailable; keep current coordinates
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 text-cyan-300 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search street, apartment, or area with Google Places..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#040B16]/90 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-cyan-300">
            Searching...
          </span>
        )}

        {suggestions.length > 0 && (
          <ul className="absolute z-30 left-0 right-0 mt-1.5 rounded-xl bg-[#061224] border border-white/15 shadow-2xl max-h-56 overflow-y-auto divide-y divide-white/10">
            {suggestions.map((s, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => void handleSelectSuggestion(s)}
                  className="w-full text-left px-3.5 py-2.5 text-xs text-slate-200 hover:bg-cyan-400/15 hover:text-white flex items-start gap-2 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
                  <span>{s.placePrediction?.text?.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
        <span>Click the map or drag the pin to confirm your exact gate/building location.</span>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400/35 text-cyan-200 hover:bg-cyan-400/15 whitespace-nowrap cursor-pointer"
        >
          <Crosshair className="w-3.5 h-3.5" />
          Use GPS
        </button>
      </div>

      <div className="h-56 rounded-2xl overflow-hidden border border-white/15 bg-[#040B16]">
        <Map
          mapId="DEMO_MAP_ID"
          defaultZoom={position ? 15 : 11}
          center={position ?? mapCenter}
          gestureHandling="greedy"
          disableDefaultUI={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          onClick={(e) => {
            const latLng = e.detail.latLng;
            if (latLng) {
              onPositionChange({
                lat: Number(latLng.lat.toFixed(6)),
                lng: Number(latLng.lng.toFixed(6)),
              });
            }
          }}
        >
          {position && (
            <AdvancedMarker
              position={position}
              draggable
              title="Delivery Location Pin"
              onDragEnd={(e) => {
                const ll = e.latLng;
                if (ll) {
                  onPositionChange({
                    lat: Number(ll.lat().toFixed(6)),
                    lng: Number(ll.lng().toFixed(6)),
                  });
                }
              }}
            >
              <Pin background="#22D3EE" borderColor="#040B16" glyphColor="#040B16" />
            </AdvancedMarker>
          )}
        </Map>
      </div>
    </div>
  );
}

export function AddressLocationPicker({
  initialValue,
  submitLabel = 'Save Delivery Address',
  onSave,
  onCancel,
}: AddressLocationPickerProps) {
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const [label, setLabel] = useState(initialValue?.label || 'Home');
  const [fullName, setFullName] = useState(initialValue?.fullName || '');
  const [mobile, setMobile] = useState(initialValue?.mobile || '');
  const [email, setEmail] = useState(initialValue?.email || '');
  const [buildingName, setBuildingName] = useState(initialValue?.buildingName || '');
  const [street, setStreet] = useState(initialValue?.street || '');
  const [area, setArea] = useState(initialValue?.area || '');
  const [district, setDistrict] = useState(initialValue?.district || '');
  const [city, setCity] = useState(initialValue?.city || '');
  const [stateVal, setStateVal] = useState(initialValue?.state || '');
  const [pinCode, setPinCode] = useState(initialValue?.pinCode || '');
  const [country, setCountry] = useState(initialValue?.country || 'India');
  const [deliveryInstructions, setDeliveryInstructions] = useState(
    initialValue?.deliveryInstructions || ''
  );
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    typeof initialValue?.lat === 'number' && typeof initialValue?.lng === 'number'
      ? { lat: initialValue.lat, lng: initialValue.lng }
      : null
  );
  const [placeId, setPlaceId] = useState(initialValue?.placeId || '');
  const [formattedAddress, setFormattedAddress] = useState(
    initialValue?.formattedAddress || ''
  );
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handlePlaceExtracted = (fields: Partial<StructuredDeliveryAddress>) => {
    if (fields.street) setStreet(fields.street);
    if (fields.area) setArea(fields.area);
    if (fields.district) setDistrict(fields.district);
    if (fields.city) setCity(fields.city);
    if (fields.state) setStateVal(fields.state);
    if (fields.pinCode) setPinCode(fields.pinCode);
    if (fields.country) setCountry(fields.country);
    if (fields.placeId) setPlaceId(fields.placeId);
    if (fields.formattedAddress) setFormattedAddress(fields.formattedAddress);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const mobileDigits = mobile.replace(/[^0-9]/g, '');
    if (mobileDigits.length < 7 || mobileDigits.length > 15) {
      setValidationError('Please enter a valid mobile number (7–15 digits).');
      return;
    }

    const cleanPin = pinCode.trim().replace(/\s+/g, '');
    const normalizedCountry = (country.trim() || 'India').toLowerCase();
    if (normalizedCountry === 'india' && !/^[1-9][0-9]{5}$/.test(cleanPin)) {
      setValidationError('Please enter a valid 6-digit Indian PIN code (e.g. 560038).');
      return;
    }
    if (cleanPin.length < 4 || cleanPin.length > 12) {
      setValidationError('Please enter a valid postal / PIN code.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        label: label.trim() || 'Home',
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        buildingName: buildingName.trim(),
        street: street.trim(),
        area: area.trim(),
        district: district.trim() || city.trim(),
        city: city.trim() || district.trim(),
        state: stateVal.trim(),
        pinCode: cleanPin,
        country: country.trim() || 'India',
        deliveryInstructions: deliveryInstructions.trim(),
        lat: coords?.lat,
        lng: coords?.lng,
        placeId: placeId || undefined,
        formattedAddress: formattedAddress || undefined,
      });
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'Unable to save delivery address. Please retry.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mapsApiKey ? (
        <APIProvider apiKey={mapsApiKey} libraries={['places', 'marker']}>
          <PlacesSearchAndMap
            position={coords}
            onPositionChange={(ll) => setCoords(ll)}
            onPlaceExtracted={handlePlaceExtracted}
          />
        </APIProvider>
      ) : (
        <div className="rounded-xl bg-amber-400/10 border border-amber-300/25 px-4 py-3 text-xs text-amber-200">
          Google Maps key is not injected in this browser environment — please enter your full Indian delivery address and PIN code manually below.
        </div>
      )}

      {coords && (
        <p className="font-mono text-[11px] text-cyan-200">
          Selected Pin Coordinates: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          required
          maxLength={40}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (Home, Office, Gallery)"
          className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
        />
        <input
          type="text"
          required
          maxLength={100}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full Name"
          className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
        />
        <input
          type="tel"
          required
          maxLength={30}
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="Mobile Number (+91 ...)"
          className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
        />
        <input
          type="email"
          required
          maxLength={160}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email Address"
          className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
        />
        <input
          type="text"
          maxLength={160}
          value={buildingName}
          onChange={(e) => setBuildingName(e.target.value)}
          placeholder="House / Flat / Building Name"
          className="sm:col-span-2 px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
        />
        <input
          type="text"
          required
          maxLength={200}
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder="Street / Road"
          className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
        />
        <input
          type="text"
          maxLength={120}
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="Area / Landmark / Locality"
          className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
        />
        <input
          type="text"
          required
          maxLength={80}
          value={district}
          onChange={(e) => {
            setDistrict(e.target.value);
            if (!city) setCity(e.target.value);
          }}
          placeholder="City / District"
          className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
        />
        <input
          type="text"
          required
          maxLength={80}
          value={stateVal}
          onChange={(e) => setStateVal(e.target.value)}
          placeholder="State (e.g. Karnataka, Kerala)"
          className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
        />
        <input
          type="text"
          required
          maxLength={24}
          value={pinCode}
          onChange={(e) => setPinCode(e.target.value)}
          placeholder="PIN Code (e.g. 560038)"
          className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white font-mono"
        />
        <input
          type="text"
          required
          maxLength={80}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Country"
          className="px-3.5 py-2.5 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
        />
        <textarea
          rows={2}
          maxLength={300}
          value={deliveryInstructions}
          onChange={(e) => setDeliveryInstructions(e.target.value)}
          placeholder="Delivery Instructions (gate code, call on arrival, lift access for custom tank...)"
          className="sm:col-span-2 px-3.5 py-2 rounded-xl bg-[#040B16]/80 border border-white/10 text-sm text-white"
        />
      </div>

      {validationError && (
        <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-lg px-3.5 py-2">
          {validationError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] text-xs font-semibold cursor-pointer disabled:opacity-50"
        >
          {saving ? 'Saving Address...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-white/15 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
