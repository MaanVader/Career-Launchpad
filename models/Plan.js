const mongoose = require('mongoose');

const yearEntrySchema = new mongoose.Schema({
  year: { type: Number, required: true },
  age: Number,
  monthly: Number,
  org: String,
  benefit: Number,
  insurance: String,
  perk: Number
}, { _id: false });

const planSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  years: [yearEntrySchema],
  updatedAt: { type: Date, default: Date.now }
});

const Plan = mongoose.model('Plan', planSchema);
module.exports = Plan; 