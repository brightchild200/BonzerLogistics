import { Platform } from 'react-native';
import type { SalesAttendanceInsert } from '@/lib/schema';
import { supabase } from '@/lib/supabase';
import type { SalesAttendanceRow } from '@/lib/types';
import { resolveSalespersonSession } from '@/lib/salesperson-session';

const TAG = '[AttendanceActions]';

function dbg(event: string, payload?: Record<string, unknown>) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`${TAG} ${event}`, payload ?? '');
  }
}
function warn(event: string, payload?: unknown) {
  // eslint-disable-next-line no-console
  console.warn(`${TAG} ${event}`, payload ?? '');
}
function err(event: string, payload?: unknown) {
  // eslint-disable-next-line no-console
  console.error(`${TAG} ${event}`, payload ?? '');
}

async function getLocation(): Promise<{
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  address: string;
}> {
  // Previously we rejected GPS fixes with accuracy worse than 50m.
  // That forces users to stand outdoors until a “good enough” fix is found.
  // To remove that compulsion, we only reject the (0,0) fallback.
  const MAX_ACCEPTABLE_ACCURACY_METERS = Number.POSITIVE_INFINITY;

  function normalizeLocation(input: {
    lat: number;
    lng: number;
    accuracy: number | null;
    address: string;
  }) {
    const { lat, lng, accuracy, address } = input;
    const isZero = lat === 0 && lng === 0;
    const isAccuracyBad = typeof accuracy === 'number' && accuracy > MAX_ACCEPTABLE_ACCURACY_METERS;

    if (isZero || isAccuracyBad) {
      return { lat: null, lng: null, accuracy, address: isZero ? '' : address };
    }
    return { lat, lng, accuracy, address };
  }


  dbg('getLocation → start', { platform: Platform.OS });

  if (Platform.OS === 'web') {
    // Web path
    if (!navigator?.geolocation) {
      warn('getLocation → navigator.geolocation unavailable on web; falling back to (0,0)');
      return { lat: 0, lng: 0, accuracy: null, address: '' };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;
          dbg('getLocation → GPS acquired (web)', { lat, lng, accuracy });

          let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
              { headers: { 'User-Agent': 'SalesHub/1.0' } },
            );
            if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
            const data = await res.json();
            if (data.display_name) {
              address = data.display_name.split(',').slice(0, 3).join(', ').trim();
            }
          } catch (geocodeErr) {
            warn('getLocation → reverse-geocode failed (web); using raw coords', geocodeErr);
          }

          resolve(normalizeLocation({ lat, lng, accuracy, address }));
        },
        (posErr) => {
          warn('getLocation → geolocation.getCurrentPosition error (web)', {
            code: (posErr as any).code,
            message: (posErr as any).message,
          });
          resolve(normalizeLocation({ lat: 0, lng: 0, accuracy: null, address: '' }));
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
      );
    });
  }

  // Native path
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ExpoLocation = require('expo-location') as any;

    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    dbg('getLocation → expo-location permission status (native)', { status });

    if (status !== 'granted') {
      warn('getLocation → location permission denied (native); falling back to (0,0)');
      return { lat: 0, lng: 0, accuracy: null, address: '' };
    }

    const pos = await ExpoLocation.getCurrentPositionAsync({
      accuracy:
        ExpoLocation.Accuracy?.BestForNavigation ??
        ExpoLocation.Accuracy?.Highest ??
        ExpoLocation.Accuracy.High,
    });

    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    dbg('getLocation → GPS acquired (native)', { lat, lng, accuracy });

    let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    try {
      const [geo] = await ExpoLocation.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geo) {
        address = [geo.street, geo.city, geo.region].filter(Boolean).join(', ');
      }
    } catch (geocodeErr) {
      warn('getLocation → reverse-geocode failed (native); using raw coords', geocodeErr);
    }

    return { lat, lng, accuracy: accuracy ?? null, address };
  } catch (nativeErr) {
    err('getLocation → expo-location call failed (native); falling back to (0,0)', nativeErr);
    return { lat: 0, lng: 0, accuracy: null, address: '' };
  }
}

export async function checkInToday(opts: {
  notes?: string;
}): Promise<{ rowId: string | number | null }> {
  const notes = (opts.notes ?? '').trim();

  dbg('checkInToday → start');

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;

  const session = await resolveSalespersonSession(auth.user?.email ?? null);
  if (!session.salesperson) throw new Error('No salesperson record found for this account.');

  const { lat, lng, accuracy, address } = await getLocation();
  if (lat == null || lng == null) {
    throw new Error('Unable to capture a reliable GPS location. Move outdoors and try again.');
  }

  const today = new Date().toISOString().split('T')[0];
  const checkInAt = new Date().toISOString();

  const payload: SalesAttendanceInsert = {
    sales_person_id: session.salesperson.id,
    user_id: session.appUser?.id ?? null,
    attendance_date: today,
    check_in_at: checkInAt,
    check_in_lat: lat as number,
    check_in_lng: lng as number,
    check_in_accuracy_meters: accuracy,
    site_name: address ? address.split(',')[0].trim() : null,
    site_address: address || null,
    notes: notes || null,
    status: 'checked_in',
    approval_status: 'pending',
    device_info: Platform.OS,
  };

  dbg('checkInToday → inserting', { attendance_date: payload.attendance_date });

  const { error: insertError, data: inserted } = await supabase
    .from('sales_attendance')
    .insert(payload)
    .select()
    .maybeSingle();

  if (insertError) throw insertError;

  return { rowId: (inserted as { id?: string | number } | null)?.id ?? null };
}

export async function checkOutToday(opts: {
  todayAttendanceRow: SalesAttendanceRow;
}): Promise<void> {
  dbg('checkOutToday → start', { id: opts.todayAttendanceRow?.id });

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;

  const session = await resolveSalespersonSession(auth.user?.email ?? null);
  if (!session.salesperson) throw new Error('No salesperson record found for this account.');

  const { lat, lng, accuracy } = await getLocation();
  if (lat == null || lng == null) {
    throw new Error('Unable to capture a reliable GPS location. Move outdoors and try again.');
  }

  const checkOutAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('sales_attendance')
    .update({
      check_out_at: checkOutAt,
      check_out_lat: lat,
      check_out_lng: lng,
      check_out_accuracy_meters: accuracy,
      status: 'checked_out',
    })
    .eq('id', opts.todayAttendanceRow.id);

  if (updateError) throw updateError;
}

