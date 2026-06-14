const express  = require('express');
const supabase = require('../db/supabase');
const verify   = require('../middleware/auth');

const router = express.Router();
router.use(verify);

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('assigned_to', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { company_name, contact_name, phone, email, source, notes } = req.body;

    const { data, error } = await supabase
      .from('leads')
      .insert([{
        company_name, contact_name, phone, email, source, notes,
        assigned_to: req.user.id,
        status: 'new'
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
      .from('leads')
      .update({ ...req.body, updated_at: new Date() })
      .eq('id', req.params.id)
      .eq('assigned_to', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
