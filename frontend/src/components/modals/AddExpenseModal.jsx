import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addTransaction } from '../../features/finance/financeSlice';
import { X, PlusCircle, Camera, Mic, RefreshCw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const AddExpenseModal = ({ isOpen, onClose }) => {
  const categories = useSelector(state => state.finance.categories);
  const { currency = 'INR', locale = 'en-IN' } = useSelector(state => state.finance);
  const dispatch = useDispatch();
  
  // Standard Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');

  // AI & Media States
  const [mode, setMode] = useState('form'); // 'form', 'camera', 'voice', 'processing', 'review'
  const [processingMessage, setProcessingMessage] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [isListening, setIsListening] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [stream, setStream] = useState(null);

  // Review Screen State
  const [extractedData, setExtractedData] = useState({
    amount: '',
    merchant: '',
    category: 'other',
    date: new Date().toISOString().split('T')[0],
    confidence: 1.0,
    source: 'manual',
    imageUrl: ''
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const formatCurrency = (val) => new Intl.NumberFormat(locale, { 
    style: 'currency', 
    currency: currency, 
    maximumFractionDigits: 0 
  }).format(val || 0);

  // Standard Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (amount > 0) {
      const now = new Date();
      dispatch(addTransaction({
        title: description || `Spending on ${category}`,
        amount: Number(amount),
        description: description || `Manual expense entry`,
        category,
        type: 'expense',
        date: now.toISOString(),
        source: 'manual',
        merchant: '',
        confidenceScore: 1.0,
        receiptImageUrl: ''
      }));
      resetForm();
      onClose();
    }
  };

  // Reset form and UI states
  const resetForm = () => {
    setAmount('');
    setDescription('');
    setCategory('other');
    setMode('form');
    setProcessingMessage('');
    setIsListening(false);
    setSpeechText('');
    stopCamera();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping media recorder on reset:", err);
      }
    }
  };

  // Camera Management
  const startCamera = async (cFacingMode = 'environment') => {
    setFacingMode(cFacingMode);
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const constraints = {
        video: { facingMode: cFacingMode }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Could not access camera. Please check camera permissions in your browser.");
      setMode('form');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        stopCamera();
        if (blob) {
          uploadAndScanReceipt(blob);
        } else {
          alert("Capture failed. Please try again.");
          setMode('form');
        }
      }, 'image/jpeg');
    }
  };

  const uploadAndScanReceipt = async (imageBlob) => {
    setMode('processing');
    setProcessingMessage('Analyzing receipt with FinSage AI...');
    try {
      const formData = new FormData();
      formData.append('receipt', imageBlob, 'receipt.jpg');
      
      const res = await api.post('/ai/scan-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (res.data && res.data.success) {
        const extracted = res.data.data;
        setExtractedData({
          amount: extracted.amount || '',
          merchant: extracted.merchant || '',
          category: extracted.category || 'other',
          date: extracted.date || new Date().toISOString().split('T')[0],
          confidence: extracted.confidence || 0.8,
          source: 'camera',
          imageUrl: res.data.receiptImageUrl
        });
        setMode('review');
      } else {
        alert("Receipt processing failed. Please enter details manually.");
        setMode('form');
      }
    } catch (err) {
      console.error("OCR Scan Error:", err);
      alert(err.response?.data?.message || "Error during receipt scan. Please check your internet connection.");
      setMode('form');
    }
  };

  // Voice Recording Management
  const startVoiceRecording = async () => {
    try {
      audioChunksRef.current = [];
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const options = { mimeType: 'audio/webm' };
      let recorder;
      try {
        recorder = new MediaRecorder(audioStream, options);
      } catch (e) {
        recorder = new MediaRecorder(audioStream);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        audioStream.getTracks().forEach(track => track.stop());
        
        if (audioBlob.size > 0) {
          await uploadAndProcessVoice(audioBlob);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(200);
      setIsListening(true);
      setMode('voice');
      setSpeechText('Listening... Speak your expense details clearly.');
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Could not access microphone. Please check permissions in your browser.");
      setMode('form');
      setIsListening(false);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const uploadAndProcessVoice = async (audioBlob) => {
    setMode('processing');
    setProcessingMessage('AI Voice Assistant analyzing audio statement...');
    try {
      const formData = new FormData();
      formData.append('voice', audioBlob, 'voice.webm');
      
      const res = await api.post('/ai/process-voice-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (res.data && res.data.success) {
        const extracted = res.data.data;
        setExtractedData({
          amount: extracted.amount || '',
          merchant: extracted.merchant || '',
          category: extracted.category || 'other',
          date: extracted.date || new Date().toISOString().split('T')[0],
          confidence: extracted.confidence || 0.8,
          source: 'voice',
          imageUrl: ''
        });
        setMode('review');
      } else {
        alert("Voice processing failed. Please enter details manually.");
        setMode('form');
      }
    } catch (err) {
      console.error("Voice Processing Error:", err);
      alert(err.response?.data?.message || "Error processing voice input. Please try again.");
      setMode('form');
    }
  };

  // AI Review Screen Submission
  const handleReviewConfirm = (e) => {
    e.preventDefault();
    if (extractedData.amount > 0) {
      dispatch(addTransaction({
        title: extractedData.merchant || `Spending on ${extractedData.category}`,
        amount: Number(extractedData.amount),
        description: extractedData.merchant ? `AI transaction at ${extractedData.merchant}` : `AI expense entry`,
        category: extractedData.category,
        type: 'expense',
        date: new Date(extractedData.date).toISOString(),
        source: extractedData.source,
        merchant: extractedData.merchant || '',
        confidenceScore: Number(extractedData.confidence),
        receiptImageUrl: extractedData.imageUrl || ''
      }));
      resetForm();
      onClose();
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        
        {/* VIEW 1: Standard Expense Form */}
        {mode === 'form' && (
          <motion.div 
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-morphism w-full max-w-md p-6 rounded-3xl space-y-4 shadow-2xl border border-white/10 relative"
          >
            <button 
              onClick={handleClose}
              className="absolute right-5 top-5 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                  <PlusCircle size={20} />
                </div>
                <h2 className="text-xl font-bold">Add Expense</h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('camera');
                    startCamera(facingMode);
                  }}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold border border-white/5 active:scale-95"
                  title="Scan receipt with camera"
                >
                  <Camera size={15} />
                  <span>Scan</span>
                </button>
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold border border-white/5 active:scale-95"
                  title="Enter expense by voice"
                >
                  <Mic size={15} />
                  <span>Voice</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                      {currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₹'}
                    </span>
                    <input
                      type="number"
                      required
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-xl font-bold focus:outline-none focus:ring-1 focus:ring-white/50"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>

                {/* Category Grid */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex flex-col items-center p-3 rounded-2xl border transition-all ${
                          category === cat.id 
                          ? 'bg-white text-black border-white shadow-lg' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-xl mb-1">{cat.icon}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-tight ${category === cat.id ? 'text-black' : 'text-slate-400'}`}>{cat.label.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="What was this for?"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-6 focus:outline-none focus:ring-1 focus:ring-white/50 text-sm"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-white text-black py-3 rounded-2xl font-bold transition-all active:scale-[0.98] hover:bg-slate-200"
              >
                Save Expense
              </button>
            </form>
          </motion.div>
        )}

        {/* VIEW 2: Camera Capture */}
        {mode === 'camera' && (
          <motion.div 
            key="camera"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-morphism w-full max-w-md p-6 rounded-3xl space-y-4 shadow-2xl border border-white/10 relative"
          >
            <button 
              onClick={() => {
                stopCamera();
                setMode('form');
              }}
              className="absolute right-5 top-5 text-slate-400 hover:text-white transition-colors z-10"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                <Camera size={20} />
              </div>
              <h2 className="text-xl font-bold">Receipt Scanner</h2>
            </div>

            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-black border border-white/10 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  const newFacing = facingMode === 'environment' ? 'user' : 'environment';
                  startCamera(newFacing);
                }}
                className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                Switch
              </button>
              <button
                type="button"
                onClick={handleCapture}
                className="flex-[2] py-3 bg-white text-black font-extrabold rounded-2xl transition-all active:scale-[0.98] hover:bg-slate-200 px-6 flex items-center justify-center gap-2 shadow-lg"
              >
                <Sparkles size={18} />
                Capture & Scan
              </button>
            </div>
          </motion.div>
        )}

        {/* VIEW 3: Voice input assistant */}
        {mode === 'voice' && (
          <motion.div 
            key="voice"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-morphism w-full max-w-sm p-8 rounded-[2.5rem] space-y-6 shadow-2xl border border-white/10 relative text-center"
          >
            <button 
              onClick={() => {
                if (mediaRecorderRef.current) {
                  mediaRecorderRef.current.onstop = null;
                  if (mediaRecorderRef.current.state !== 'inactive') {
                    mediaRecorderRef.current.stop();
                  }
                }
                setMode('form');
                setIsListening(false);
              }}
              className="absolute right-5 top-5 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="space-y-2">
              <h2 className="text-xl font-bold">Voice Assistant</h2>
              <p className="text-slate-400 text-xs leading-relaxed">Speak naturally. E.g., "Paid 1200 rupees for petrol" or "I spent 450 rupees on groceries today"</p>
            </div>

            <div className="relative flex items-center justify-center py-6">
              <div className="absolute w-24 h-24 bg-white/5 rounded-full animate-ping" />
              <div className="absolute w-20 h-20 bg-white/10 rounded-full animate-pulse" />
              <div className="w-16 h-16 bg-white text-black rounded-2xl flex items-center justify-center shadow-lg relative">
                <Mic size={24} className="animate-bounce" />
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 min-h-[60px] flex items-center justify-center text-sm font-medium text-slate-300 italic">
              {speechText}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (mediaRecorderRef.current) {
                    mediaRecorderRef.current.onstop = null;
                    if (mediaRecorderRef.current.state !== 'inactive') {
                      mediaRecorderRef.current.stop();
                    }
                  }
                  setMode('form');
                  setIsListening(false);
                }}
                className="flex-1 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-bold rounded-2xl transition-all text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={stopVoiceRecording}
                className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl transition-all active:scale-[0.98] text-sm px-6 shadow-lg shadow-emerald-600/20"
              >
                Stop & Analyze
              </button>
            </div>
          </motion.div>
        )}

        {/* VIEW 4: Loading / Processing AI */}
        {mode === 'processing' && (
          <motion.div 
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-morphism w-full max-w-sm p-8 rounded-[2.5rem] space-y-6 shadow-2xl border border-white/10 relative text-center"
          >
            <div className="relative flex items-center justify-center py-4">
              <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin" />
              <Sparkles size={24} className="absolute text-white animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">AI Analysis In Progress</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{processingMessage}</p>
            </div>
          </motion.div>
        )}

        {/* VIEW 5: AI Extraction Review Screen */}
        {mode === 'review' && (
          <motion.div 
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-morphism w-full max-w-md p-6 rounded-3xl space-y-4 shadow-2xl border border-white/10 relative max-h-[90vh] overflow-y-auto"
          >
            <button 
              onClick={() => setMode('form')}
              className="absolute right-5 top-5 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Review AI Extraction</h2>
                <p className="text-xs text-slate-400">Processed from {extractedData.source === 'camera' ? 'Receipt Camera Scan' : 'Voice Command'}</p>
              </div>
            </div>

            {extractedData.imageUrl && (
              <div className="relative rounded-2xl overflow-hidden aspect-[16/9] bg-black/40 border border-white/5">
                <img 
                  src={extractedData.imageUrl} 
                  alt="Receipt Thumbnail" 
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                  <span className="text-[10px] bg-white/10 backdrop-blur-md text-white font-bold px-2.5 py-1 rounded-full border border-white/15">Cloudinary Receipt Image Stored</span>
                </div>
              </div>
            )}

            <form onSubmit={handleReviewConfirm} className="space-y-4">
              <div className="space-y-3">
                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                      {currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₹'}
                    </span>
                    <input
                      type="number"
                      required
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-xl font-bold focus:outline-none focus:ring-1 focus:ring-white/50"
                      value={extractedData.amount}
                      onChange={(e) => setExtractedData({ ...extractedData, amount: e.target.value })}
                    />
                  </div>
                </div>

                {/* Merchant */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Merchant</label>
                  <input
                    type="text"
                    placeholder="Merchant name (e.g. Domino's)"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:ring-1 focus:ring-white/50 text-sm font-medium"
                    value={extractedData.merchant || ''}
                    onChange={(e) => setExtractedData({ ...extractedData, merchant: e.target.value })}
                  />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Transaction Date</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:ring-1 focus:ring-white/50 text-sm font-medium text-white"
                    value={extractedData.date}
                    onChange={(e) => setExtractedData({ ...extractedData, date: e.target.value })}
                  />
                </div>

                {/* Category Grid */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setExtractedData({ ...extractedData, category: cat.id })}
                        className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
                          extractedData.category === cat.id 
                          ? 'bg-white text-black border-white shadow-lg' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-lg mb-0.5">{cat.icon}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-tight ${extractedData.category === cat.id ? 'text-black' : 'text-slate-400'}`}>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Confidence Meter */}
                <div className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI Confidence Score</span>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${(extractedData.confidence || 0.8) * 100}%`,
                          backgroundColor: (extractedData.confidence || 0.8) > 0.8 ? '#10b981' : (extractedData.confidence || 0.8) > 0.5 ? '#fbbf24' : '#f43f5e'
                        }}
                      />
                    </div>
                  </div>
                  <div className={`px-2.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${
                    (extractedData.confidence || 0.8) > 0.8 ? 'bg-emerald-500/10 text-emerald-400' : (extractedData.confidence || 0.8) > 0.5 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {Math.round((extractedData.confidence || 0.8) * 100)}%
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('form')}
                  className="flex-1 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-bold rounded-2xl transition-all text-sm"
                >
                  Start Over
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl transition-all active:scale-[0.98] text-sm px-6 shadow-lg shadow-emerald-600/20"
                >
                  Confirm & Save
                </button>
              </div>
            </form>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default AddExpenseModal;
