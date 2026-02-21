const express = require('express');
const router = express.Router();
const controller = require('../controllers/onboardingCategoryController');
const { adminAuth } = require('../middleware/authMiddleware');

router.get('/public', controller.getPublicCategories);

router.get('/', adminAuth, controller.getAllCategories);
router.post('/', adminAuth, controller.createCategory);
router.put('/:id', adminAuth, controller.updateCategory);
router.delete('/:id', adminAuth, controller.deleteCategory);

router.post('/:id/exams', adminAuth, controller.addExam);
router.put('/:id/exams/:examId', adminAuth, controller.updateExam);
router.delete('/:id/exams/:examId', adminAuth, controller.deleteExam);

module.exports = router;
