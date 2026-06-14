const express  = require('express');
const supabase = require('../db/supabase');
const verify   = require('../middleware/auth');

const router = express.Router();
router.use(verify);

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('followups')
      .select('*, leads(company_name, contact_name)')
      .eq('assigned_to', req.user.id)
      .order('due_date', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { lead_id, enquiry_id, due_date, type, notes } = req.body;

    const { data, error } = await supabase
      .from('followups')
      .insert([{
        lead_id, enquiry_id, due_date, type, notes,
        assigned_to: req.user.id,
        status: 'pending'
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
      .from('followups')
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
