const express = require('express');
const router = express.Router();
const Plan = require('../models/Plan');
const { protect } = require('../middleware/auth');

// Get current user's plan
router.get('/', protect, async (req, res) => {
  try {
    const plan = await Plan.findOne({ userId: req.user._id });
    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Save/update current user's plan
router.post('/', protect, async (req, res) => {
  try {
    const { years } = req.body;
    let plan = await Plan.findOne({ userId: req.user._id });
    if (plan) {
      plan.years = years;
      plan.updatedAt = new Date();
      await plan.save();
    } else {
      plan = await Plan.create({ userId: req.user._id, years });
    }
    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 