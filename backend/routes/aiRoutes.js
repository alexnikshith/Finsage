const express = require('express');
const router = express.Router();
const multer = require('multer');
const aiController = require('../controllers/aiController');
const auth = require('../middleware/auth');

// Multer memory storage configuration
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB Limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only receipt images are allowed.'), false);
    }
  }
});

const uploadAudio = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB Limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept audio
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed.'), false);
    }
  }
});

// @route   POST api/ai/scan-receipt
// @desc    Upload receipt, perform OCR, and extract details
// @access  Private
router.post('/scan-receipt', auth, (req, res, next) => {
  upload.single('receipt')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File is too large. Max size is 5MB.' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, aiController.scanReceipt);

// @route   POST api/ai/process-voice
// @desc    Process voice expense transcript and extract details
// @access  Private
router.post('/process-voice', auth, aiController.processVoice);

// @route   POST api/ai/process-voice-file
// @desc    Upload audio file, perform transcript extraction and entity recognition
// @access  Private
router.post('/process-voice-file', auth, (req, res, next) => {
  uploadAudio.single('voice')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File is too large. Max size is 5MB.' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, aiController.processVoiceFile);

module.exports = router;

