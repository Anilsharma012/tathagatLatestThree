const mongoose = require('mongoose');

const BillingSettingsSchema = new mongoose.Schema({
  companyName: { type: String, default: 'Tathagat Education' },
  companyLogo: { type: String, default: '' },
  gstNumber: { type: String, default: '' },
  panNumber: { type: String, default: '' },
  cinNumber: { type: String, default: '' },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    country: { type: String, default: 'India' }
  },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  website: { type: String, default: '' },
  
  centreDetails: {
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    stateCode: { type: String, default: '' }
  },
  
  taxSettings: {
    cgstRate: { type: Number, default: 9 },
    sgstRate: { type: Number, default: 9 },
    igstRate: { type: Number, default: 18 },
    defaultHsnCode: { type: String, default: '999293' }
  },
  
  authorizedSignatory: {
    name: { type: String, default: '' },
    designation: { type: String, default: '' },
    signatureImage: { type: String, default: '' }
  },
  
  bankDetails: {
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    accountHolderName: { type: String, default: '' }
  },
  
  termsAndConditions: { type: String, default: '1. Cheques/Drafts/Pay Order must be drawn in favour of the company only.\n2. Material will be issued only after the full fee has been received.\n3. Terms & Conditions are printed on the reverse of this receipt.' },
  footerNote: { type: String, default: 'Thank you for your purchase!' },
  invoicePrefix: { type: String, default: 'STX' },
  invoiceCounter: { type: Number, default: 1000 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.BillingSettings || mongoose.model('BillingSettings', BillingSettingsSchema);
