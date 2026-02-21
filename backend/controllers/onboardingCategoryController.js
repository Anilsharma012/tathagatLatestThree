const OnboardingCategory = require('../models/OnboardingCategory');

exports.getPublicCategories = async (req, res) => {
  try {
    const categories = await OnboardingCategory.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 });

    const result = categories.map((cat) => ({
      _id: cat._id,
      name: cat.name,
      displayOrder: cat.displayOrder,
      exams: cat.exams
        .filter((e) => e.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((e) => ({ _id: e._id, name: e.name })),
    }));

    res.json({ success: true, categories: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await OnboardingCategory.find()
      .sort({ displayOrder: 1, name: 1 });
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, displayOrder } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    const category = new OnboardingCategory({
      name: name.trim(),
      displayOrder: displayOrder || 0,
      exams: [],
    });
    await category.save();
    res.json({ success: true, category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category name already exists' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { name, displayOrder, isActive } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (displayOrder !== undefined) update.displayOrder = displayOrder;
    if (isActive !== undefined) update.isActive = isActive;

    const category = await OnboardingCategory.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category name already exists' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    await OnboardingCategory.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addExam = async (req, res) => {
  try {
    const { name, displayOrder } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Exam name is required' });
    }
    const category = await OnboardingCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const exists = category.exams.some(
      (e) => e.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (exists) {
      return res.status(400).json({ success: false, message: 'Exam already exists in this category' });
    }

    category.exams.push({ name: name.trim(), displayOrder: displayOrder || 0 });
    await category.save();
    res.json({ success: true, category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateExam = async (req, res) => {
  try {
    const { name, displayOrder, isActive } = req.body;
    const category = await OnboardingCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const exam = category.exams.id(req.params.examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (name !== undefined) exam.name = name.trim();
    if (displayOrder !== undefined) exam.displayOrder = displayOrder;
    if (isActive !== undefined) exam.isActive = isActive;

    await category.save();
    res.json({ success: true, category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteExam = async (req, res) => {
  try {
    const category = await OnboardingCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    category.exams = category.exams.filter(
      (e) => e._id.toString() !== req.params.examId
    );
    await category.save();
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
