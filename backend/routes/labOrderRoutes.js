const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/labOrderController');

router.route('/').get(protect, ctrl.getAll).post(protect, ctrl.create);
router.route('/:id').get(protect, ctrl.getById).put(protect, ctrl.update).delete(protect, ctrl.remove);

module.exports = router;
