const express  = require('express');
const supabase = require('../db/supabase');
const verify   = require('../middleware/auth');

const router = express.Router();
router.use(verify);

// Get next enquiry number for a salesperson (system-wide running sequence)
router.get('/next-enquiry-no', async (req, res, next) => {
  try {
    const salesPersonId = req.query.sales_person_id || req.user.sales_person_id;

    if (!salesPersonId) {
      return res.status(400).json({ error: 'Salesperson ID is required' });
    }

    // Get the latest enquiry number system-wide (not per salesperson)
    const { data: latestEnquiry, error: fetchError } = await supabase
      .from('enquiries')
      .select('enquiry_no')
      .not('enquiry_no', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();


    if (fetchError) {
      console.error('Error fetching latest enquiry:', fetchError);
      throw fetchError;
    }

    let nextSequence = 1;

    if (latestEnquiry && latestEnquiry.enquiry_no) {
      // Extract the numeric part from ENQ-XXXXXX format
      const match = latestEnquiry.enquiry_no.match(/ENQ-(\d+)/);
      if (match) {
        nextSequence = parseInt(match[1], 10) + 1;
      }
    }

    // Generate the next enquiry number with zero-padded sequence
    const enquiryNo = `ENQ-${nextSequence.toString().padStart(6, '0')}`;

    res.json({
      enquiry_no: enquiryNo,
      sequence: nextSequence,
      sales_person_id: salesPersonId
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('enquiries')
      .select('*')
      .eq('salesperson_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { lead_id, cargo_type, origin, destination, weight_kg, pickup_date, notes } = req.body;

    const { data, error } = await supabase
      .from('enquiries')
      .insert([{
        lead_id, cargo_type, origin, destination,
        weight_kg, pickup_date, notes,
        salesperson_id: req.user.id,
        status: 'open'
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('enquiries')
      .update({ ...req.body, updated_at: new Date() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
