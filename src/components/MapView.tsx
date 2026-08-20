import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, ExternalLink } from 'lucide-react';
import type { Activity, ActivityCategory, Day } from '../types';
import EmptyState from './EmptyState';

interface MapViewProps {
  days: Day[];
  currency: string;
  selectedActivityId?: string | null;
  onSelectActivity?: (activityId: string) => void;
}

const categoryDotColor: Record<ActivityCategory, string> = {
  Food: '#f59e0b',
  Culture: '#38bdf8',
  Nature: '#34d399',
  Adventure: '#fb923c',
  History: '#a8a29e',
  Shopping: '#f472b6',
  Nightlife: '#a78bfa',
  Transport: '#94a3b8',
  Accommodation: '#2dd4bf',
  Other: '#9ca7be',
};

function markerIcon(color: string, isSelected: boolean): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: ${isSelected ? 20 : 14}px;
      height: ${isSelected ? 20 : 14}px;
      border-radius: 9999px;
      background: ${color};
      border: 2px solid ${isSelected ? '#eff2f8' : 'rgba(255,255,255,0.6)'};
      box-shadow: 0 0 0 ${isSelected ? '4px' : '0'} rgba(34,211,238,0.35);
    "></div>`,
    iconSize: [isSelected ? 20 : 14, isSelected ? 20 : 14],
    iconAnchor: [isSelected ? 10 : 7, isSelected ? 10 : 7],
  });
}

/** Recenters the map imperatively when the selected activity changes. */
function FlyToSelected({ activity }: { activity: Activity | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (activity?.latitude != null && activity?.longitude != null) {
      map.flyTo([activity.latitude, activity.longitude], Math.max(map.getZoom(), 14), { duration: 0.6 });
    }
  }, [activity, map]);
  return null;
}

export default function MapView({ days, currency, selectedActivityId, onSelectActivity }: MapViewProps) {
  const markerRefs = useRef(new Map<string, L.Marker>());

  const mappable = useMemo(
    () =>
      days.flatMap((d) =>
        d.activities
          .filter((a) => a.latitude != null && a.longitude != null)
          .map((a) => ({ activity: a, day: d })),
      ),
    [days],
  );

  const selected = mappable.find((m) => m.activity.id === selectedActivityId)?.activity;

  useEffect(() => {
    if (selectedActivityId) {
      markerRefs.current.get(selectedActivityId)?.openPopup();
    }
  }, [selectedActivityId]);

  if (mappable.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={<MapPin size={22} />}
          title="Map unavailable"
          description="Activities need coordinates before they can appear on the map. Newly generated or AI-added activities are placed automatically."
        />
      </div>
    );
  }

  const center: [number, number] = [
    mappable.reduce((s, m) => s + m.activity.latitude!, 0) / mappable.length,
    mappable.reduce((s, m) => s + m.activity.longitude!, 0) / mappable.length,
  ];

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-glass/10 bg-ink-200/30 flex items-center justify-between">
        <p className="text-sm font-600 text-ink-900 flex items-center gap-1.5">
          <MapPin size={14} className="text-brand-400" /> Trip map
        </p>
        <p className="text-xs text-ink-600">Click a marker to highlight the activity</p>
      </div>
      <div className="h-[28vh] sm:h-[320px] md:h-[420px] lg:h-[480px] w-full">
        <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FlyToSelected activity={selected} />

          {days.map((day) => {
            const coords = day.activities
              .filter((a) => a.latitude != null && a.longitude != null)
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((a) => [a.latitude!, a.longitude!] as [number, number]);
            if (coords.length < 2) return null;
            return (
              <Polyline
                key={day.id}
                positions={coords}
                pathOptions={{ color: '#22d3ee', weight: 2, opacity: 0.5, dashArray: '4 6' }}
              />
            );
          })}

          {mappable.map(({ activity }) => (
            <Marker
              key={activity.id}
              position={[activity.latitude!, activity.longitude!]}
              icon={markerIcon(categoryDotColor[activity.category] ?? categoryDotColor.Other, activity.id === selectedActivityId)}
              ref={(ref) => {
                if (ref) markerRefs.current.set(activity.id, ref);
                else markerRefs.current.delete(activity.id);
              }}
              eventHandlers={{ click: () => onSelectActivity?.(activity.id) }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold">{activity.title}</p>
                  <p className="text-ink-600">{activity.time} · {activity.category}</p>
                  {activity.location && <p>{activity.location}</p>}
                  <p>{activity.cost === 0 ? 'Free' : `${currency} ${activity.cost.toLocaleString()}`}</p>
                  <a
                    className="inline-flex items-center gap-1 text-brand-600 mt-1"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location + ', ' + activity.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Google Maps <ExternalLink size={11} />
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="px-4 py-2.5 border-t border-glass/10 flex flex-wrap gap-x-3 gap-y-1">
        {(Object.keys(categoryDotColor) as ActivityCategory[])
          .filter((cat) => mappable.some((m) => m.activity.category === cat))
          .map((cat) => (
            <span key={cat} className="flex items-center gap-1.5 text-xs text-ink-600">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: categoryDotColor[cat] }} />
              {cat}
            </span>
          ))}
      </div>
    </div>
  );
}
