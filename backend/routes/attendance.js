const express = require('express');
const supabase = require('../db/supabase');
const verify = require('../middleware/auth');

const router = express.Router();
router.use(verify);

// Map backend auth subject -> sales_person_id
// If your JWT subject is not sales_person_id, update this mapping accordingly.
function getSalesPersonId(req) {
  return req.user?.id;
}

function todayISODate() {
  return new Date().toISOString().split('T')[0];
}

router.post('/checkin', async (req, res, next) => {
  try {
    const sales_person_id = getSalesPersonId(req);
    const {
      check_in_lat,
      check_in_lng,
      check_in_accuracy_meters,
      attendance_date,
      check_in_at,
      site_name,
      site_address,
      notes,
      device_info,
      status,
      approval_status,
    } = req.body || {};

    if (!sales_person_id) {
      return res.status(401).json({ error: 'Unauthorized: missing sales_person_id' });
    }

    // Reject invalid/placeholder GPS.
    if (check_in_lat == null || check_in_lng == null) {
      return res.status(400).json({ error: 'GPS coordinates required (check_in_lat, check_in_lng)' });
    }

    if (check_in_lat === 0 && check_in_lng === 0) {
      return res.status(400).json({ error: 'Invalid GPS: (0,0) is not allowed' });
    }

    // Enforce accuracy threshold if provided.
    const MAX_ACCEPTABLE_ACCURACY_METERS = 50;
    if (
      check_in_accuracy_meters != null &&
      typeof check_in_accuracy_meters === 'number' &&
      check_in_accuracy_meters > MAX_ACCEPTABLE_ACCURACY_METERS
    ) {
      return res.status(400).json({
        error: 'GPS accuracy too low',
        max_acceptable_accuracy_meters: MAX_ACCEPTABLE_ACCURACY_METERS,
        got_accuracy_meters: check_in_accuracy_meters,
      });
    }


    const date = attendance_date || todayISODate();
    const ts = check_in_at || new Date().toISOString();

    const payload = {
      sales_person_id,
      attendance_date: date,
      check_in_at: ts,
      check_in_lat,
      check_in_lng,
      check_in_accuracy_meters: check_in_accuracy_meters ?? null,
      site_name: site_name ?? null,
      site_address: site_address ?? null,
      notes: notes ?? null,
      device_info,
      status: status || 'checked_in',
      approval_status: approval_status || 'pending',
    };

    // Prevent duplicate check-ins for same day/person
    const existing = await supabase
      .from('sales_attendance')
      .select('id')
      .eq('sales_person_id', sales_person_id)
      .eq('attendance_date', date)
      .maybeSingle();

    if (existing.error) throw existing.error;
    if (existing.data?.id) {
      return res.status(409).json({
        error: 'Check-in already exists for today',
        existing_id: existing.data.id,
      });
    }

    const { data, error } = await supabase
      .from('sales_attendance')
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) throw error;
    res.status(201).json({ message: 'Check-in recorded', record: data });
  } catch (err) {
    next(err);
  }
});

router.post('/checkout', async (req, res, next) => {
  try {
    const sales_person_id = getSalesPersonId(req);
    const {
      attendance_date,
      check_out_at,
      check_out_lat,
      check_out_lng,
      check_out_accuracy_meters,
      status,
    } = req.body || {};

    if (!sales_person_id) {
      return res.status(401).json({ error: 'Unauthorized: missing sales_person_id' });
    }

    const date = attendance_date || todayISODate();
    const checkoutTs = check_out_at || new Date().toISOString();

    // Enforce basic validation for checkout coordinates.
    const MAX_ACCEPTABLE_ACCURACY_METERS = 50;
    if (check_out_lat === 0 && check_out_lng === 0) {
      return res.status(400).json({ error: 'Invalid GPS: (0,0) is not allowed for checkout' });
    }
    if (
      check_out_accuracy_meters != null &&
      typeof check_out_accuracy_meters === 'number' &&
      check_out_accuracy_meters > MAX_ACCEPTABLE_ACCURACY_METERS
    ) {
      return res.status(400).json({
        error: 'GPS accuracy too low (checkout)',
        max_acceptable_accuracy_meters: MAX_ACCEPTABLE_ACCURACY_METERS,
        got_accuracy_meters: check_out_accuracy_meters,
      });
    }

    const updatePayload = {
      check_out_at: checkoutTs,
      status: status || 'checked_out',
      check_out_lat: check_out_lat ?? null,
      check_out_lng: check_out_lng ?? null,
      check_out_accuracy_meters: check_out_accuracy_meters ?? null,
    };


    const { data, error } = await supabase
      .from('sales_attendance')
      .update(updatePayload)
      .eq('sales_person_id', sales_person_id)
      .eq('attendance_date', date)
      .is('check_out_at', null)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'No open attendance row found to checkout for today' });
    }

    res.json({ message: 'Check-out recorded', record: data });
  } catch (err) {
    next(err);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const sales_person_id = getSalesPersonId(req);
    if (!sales_person_id) {
      return res.status(401).json({ error: 'Unauthorized: missing sales_person_id' });
    }

    const { data, error } = await supabase
      .from('sales_attendance')
      .select('*')
      .eq('sales_person_id', sales_person_id)
      .order('attendance_date', { ascending: false })
      .limit(30);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

