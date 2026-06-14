const express  = require('express');
const supabase = require('../db/supabase');
const verify   = require('../middleware/auth');

const router = express.Router();
router.use(verify);

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
