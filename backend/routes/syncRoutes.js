const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const auth = require('../middleware/auth');

router.post('/push', auth, syncController.pushState);
router.get('/pull', auth, syncController.pullState);

module.exports = router;
