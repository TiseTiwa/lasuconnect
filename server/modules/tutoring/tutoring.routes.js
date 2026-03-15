const express = require('express');
const router = express.Router();

// tutoring routes — to be implemented in upcoming steps
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'tutoring module is live' });
});

module.exports = router;
