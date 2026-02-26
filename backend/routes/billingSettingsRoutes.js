const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/authMiddleware');
const BillingSettings = require('../models/BillingSettings');

router.get('/', adminAuth, async (req, res) => {
  try {
    let settings = await BillingSettings.findOne({ isActive: true });
    if (!settings) {
      settings = await BillingSettings.create({});
    }
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching billing settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch billing settings' });
  }
});

router.put('/', adminAuth, async (req, res) => {
  try {
    const {
      companyName,
      companyLogo,
      gstNumber,
      panNumber,
      cinNumber,
      address,
      phone,
      email,
      website,
      centreDetails,
      taxSettings,
      authorizedSignatory,
      bankDetails,
      termsAndConditions,
      footerNote,
      invoicePrefix
    } = req.body;

    let settings = await BillingSettings.findOne({ isActive: true });
    if (!settings) {
      settings = new BillingSettings({});
    }

    if (companyName !== undefined) settings.companyName = companyName;
    if (companyLogo !== undefined) settings.companyLogo = companyLogo;
    if (gstNumber !== undefined) settings.gstNumber = gstNumber;
    if (panNumber !== undefined) settings.panNumber = panNumber;
    if (cinNumber !== undefined) settings.cinNumber = cinNumber;
    if (phone !== undefined) settings.phone = phone;
    if (email !== undefined) settings.email = email;
    if (website !== undefined) settings.website = website;
    if (termsAndConditions !== undefined) settings.termsAndConditions = termsAndConditions;
    if (footerNote !== undefined) settings.footerNote = footerNote;
    if (invoicePrefix !== undefined) settings.invoicePrefix = invoicePrefix;

    if (address) {
      settings.address = {
        street: address.street !== undefined ? address.street : (settings.address?.street || ''),
        city: address.city !== undefined ? address.city : (settings.address?.city || ''),
        state: address.state !== undefined ? address.state : (settings.address?.state || ''),
        pincode: address.pincode !== undefined ? address.pincode : (settings.address?.pincode || ''),
        country: address.country !== undefined ? address.country : (settings.address?.country || 'India')
      };
      settings.markModified('address');
    }

    if (centreDetails) {
      settings.centreDetails = {
        name: centreDetails.name !== undefined ? centreDetails.name : (settings.centreDetails?.name || ''),
        address: centreDetails.address !== undefined ? centreDetails.address : (settings.centreDetails?.address || ''),
        city: centreDetails.city !== undefined ? centreDetails.city : (settings.centreDetails?.city || ''),
        state: centreDetails.state !== undefined ? centreDetails.state : (settings.centreDetails?.state || ''),
        stateCode: centreDetails.stateCode !== undefined ? centreDetails.stateCode : (settings.centreDetails?.stateCode || '')
      };
      settings.markModified('centreDetails');
    }

    if (taxSettings) {
      settings.taxSettings = {
        cgstRate: taxSettings.cgstRate !== undefined ? Number(taxSettings.cgstRate) : (settings.taxSettings?.cgstRate ?? 9),
        sgstRate: taxSettings.sgstRate !== undefined ? Number(taxSettings.sgstRate) : (settings.taxSettings?.sgstRate ?? 9),
        igstRate: taxSettings.igstRate !== undefined ? Number(taxSettings.igstRate) : (settings.taxSettings?.igstRate ?? 18),
        defaultHsnCode: taxSettings.defaultHsnCode !== undefined ? taxSettings.defaultHsnCode : (settings.taxSettings?.defaultHsnCode || '999293')
      };
      settings.markModified('taxSettings');
    }

    if (authorizedSignatory) {
      settings.authorizedSignatory = {
        name: authorizedSignatory.name !== undefined ? authorizedSignatory.name : (settings.authorizedSignatory?.name || ''),
        designation: authorizedSignatory.designation !== undefined ? authorizedSignatory.designation : (settings.authorizedSignatory?.designation || ''),
        signatureImage: authorizedSignatory.signatureImage !== undefined ? authorizedSignatory.signatureImage : (settings.authorizedSignatory?.signatureImage || '')
      };
      settings.markModified('authorizedSignatory');
    }

    if (bankDetails) {
      settings.bankDetails = {
        bankName: bankDetails.bankName !== undefined ? bankDetails.bankName : (settings.bankDetails?.bankName || ''),
        accountNumber: bankDetails.accountNumber !== undefined ? bankDetails.accountNumber : (settings.bankDetails?.accountNumber || ''),
        ifscCode: bankDetails.ifscCode !== undefined ? bankDetails.ifscCode : (settings.bankDetails?.ifscCode || ''),
        accountHolderName: bankDetails.accountHolderName !== undefined ? bankDetails.accountHolderName : (settings.bankDetails?.accountHolderName || '')
      };
      settings.markModified('bankDetails');
    }

    await settings.save();
    res.json({ success: true, message: 'Billing settings updated successfully', settings });
  } catch (error) {
    console.error('Error updating billing settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update billing settings' });
  }
});

router.get('/public', async (req, res) => {
  try {
    const settings = await BillingSettings.findOne({ isActive: true }).select(
      'companyName companyLogo gstNumber address phone email website footerNote'
    );
    res.json({ success: true, settings: settings || {} });
  } catch (error) {
    console.error('Error fetching public billing settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch billing settings' });
  }
});

module.exports = router;
