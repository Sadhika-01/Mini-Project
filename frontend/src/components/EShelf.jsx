import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Upload,
  FileText,
  Download,
  Search,
  Filter,
  Users,
  CheckCircle,
  AlertCircle,
  FileCode,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  X,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  Layers,
  RotateCw,
  RefreshCw,
  ThumbsUp,
  RotateCcw
} from 'lucide-react';

export default function EShelf() {
  const { token, user } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [resources, setResources] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadGroupId, setUploadGroupId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // AI Summary Modal State
  const [summaryModalData, setSummaryModalData] = useState(null);
  const [summarizingId, setSummarizingId] = useState(null);

  // AI Quiz Modal State
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizGeneratingId, setQuizGeneratingId] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { question_id: option_index }
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  // AI Flashcards Modal State
  const [activeFlashcardSet, setActiveFlashcardSet] = useState(null);
  const [fcGeneratingId, setFcGeneratingId] = useState(null);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState({}); // { card_id: boolean }

  // Fetch groups user belongs to
  const fetchMyGroups = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/groups/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyGroups(data);
        if (data.length > 0) setUploadGroupId(data[0].id.toString());
      }
    } catch (err) {
      console.error("Failed to load my groups for upload:", err);
    }
  };

  // Fetch resources
  const fetchResources = async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const endpoint = selectedGroupId === 'all'
        ? `${API_BASE_URL}/api/v1/resources/my`
        : `${API_BASE_URL}/api/v1/groups/${selectedGroupId}/resources`;

      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setResources(data);
      } else {
        setError('Failed to fetch E-Shelf resources.');
      }
    } catch (err) {
      setError('Error connecting to backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyGroups();
  }, [token]);

  useEffect(() => {
    fetchResources();
  }, [token, selectedGroupId]);

  // Handle File Upload Submit
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');

    if (!selectedFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    if (!uploadGroupId) {
      setUploadError('Please select a study group.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setUploading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/groups/${uploadGroupId}/resources/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setUploadSuccess(`Successfully uploaded "${data.filename}"!`);
        setSelectedFile(null);
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadSuccess('');
          fetchResources();
        }, 1200);
      } else {
        setUploadError(data.detail || 'Failed to upload resource.');
      }
    } catch (err) {
      setUploadError('Network error during upload.');
    } finally {
      setUploading(false);
    }
  };

  // Handle File Download
  const handleDownload = async (resourceId, filename) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/resources/${resourceId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        alert("Failed to download file. You may not have access to this group.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  // Handle Generate AI Summary for PDF
  const handleGenerateSummary = async (resourceId, filename) => {
    setSummarizingId(resourceId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/resources/${resourceId}/summarize`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setSummaryModalData(data);
      } else {
        alert(data.detail || "Failed to generate AI summary.");
      }
    } catch (err) {
      console.error("AI Summarize error:", err);
      alert("Failed to connect to backend for AI summarization.");
    } finally {
      setSummarizingId(null);
    }
  };

  // Handle Generate AI Quiz for PDF
  const handleGenerateQuiz = async (resourceId, filename) => {
    setQuizGeneratingId(resourceId);
    setQuizResult(null);
    setSelectedAnswers({});
    setCurrentQuestionIdx(0);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/quizzes/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resource_id: resourceId, num_questions: 5 })
      });

      const data = await res.json();
      if (res.ok) {
        setActiveQuiz(data);
      } else {
        alert(data.detail || "Failed to generate AI Quiz from PDF.");
      }
    } catch (err) {
      console.error("AI Quiz error:", err);
      alert("Failed to connect to backend for AI Quiz generation.");
    } finally {
      setQuizGeneratingId(null);
    }
  };

  // Handle Generate AI Flashcards for PDF
  const handleGenerateFlashcards = async (resourceId, filename) => {
    setFcGeneratingId(resourceId);
    setCurrentCardIdx(0);
    setIsFlipped(false);
    setKnownCards({});

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/flashcards/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resource_id: resourceId, num_cards: 10 })
      });

      const data = await res.json();
      if (res.ok) {
        setActiveFlashcardSet(data);
      } else {
        alert(data.detail || "Failed to generate AI Flashcards from PDF.");
      }
    } catch (err) {
      console.error("AI Flashcards error:", err);
      alert("Failed to connect to backend for AI Flashcard generation.");
    } finally {
      setFcGeneratingId(null);
    }
  };

  // Select Quiz Option
  const handleSelectOption = (questionId, optionIdx) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: optionIdx
    });
  };

  // Submit Quiz Attempt
  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setSubmittingQuiz(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/quizzes/${activeQuiz.id}/attempt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers: selectedAnswers })
      });

      const data = await res.json();
      if (res.ok) {
        setQuizResult(data);
      } else {
        alert(data.detail || "Failed to submit quiz attempt.");
      }
    } catch (err) {
      console.error("Quiz submission error:", err);
      alert("Network error submitting quiz attempt.");
    } finally {
      setSubmittingQuiz(false);
    }
  };

  // Close Quiz Modal
  const handleCloseQuiz = () => {
    setActiveQuiz(null);
    setQuizResult(null);
    setSelectedAnswers({});
    setCurrentQuestionIdx(0);
  };

  // Close Flashcard Modal
  const handleCloseFlashcards = () => {
    setActiveFlashcardSet(null);
    setCurrentCardIdx(0);
    setIsFlipped(false);
    setKnownCards({});
  };

  // Toggle Flashcard Flip State
  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
  };

  // Navigate Flashcards
  const handleNextCard = () => {
    if (activeFlashcardSet && currentCardIdx < activeFlashcardSet.cards.length - 1) {
      setIsFlipped(false);
      setCurrentCardIdx(prev => prev + 1);
    }
  };

  const handlePrevCard = () => {
    if (currentCardIdx > 0) {
      setIsFlipped(false);
      setCurrentCardIdx(prev => prev - 1);
    }
  };

  // Toggle "I Know This" state for current card
  const handleToggleKnown = (cardId, isKnown) => {
    setKnownCards({
      ...knownCards,
      [cardId]: isKnown
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType) => {
    const type = fileType.toLowerCase();
    if (type === 'pdf') return <FileText className="w-5 h-5 text-rose-400" />;
    if (['ppt', 'pptx'].includes(type)) return <FileText className="w-5 h-5 text-amber-400" />;
    if (['doc', 'docx'].includes(type)) return <FileText className="w-5 h-5 text-blue-400" />;
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(type)) return <ImageIcon className="w-5 h-5 text-emerald-400" />;
    return <FileCode className="w-5 h-5 text-indigo-400" />;
  };

  const filteredResources = resources.filter(r =>
    r.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.uploader_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-emerald-900/50 via-slate-900 to-slate-900 border border-emerald-500/30 p-6 rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Digital Study Repository & AI Tools</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Shared E-Shelf</h2>
          <p className="text-slate-400 text-sm mt-1">
            Access study materials, generate AI PDF summaries, take practice quizzes, and revise with flashcards.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg transition flex items-center space-x-2 text-sm shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Resource</span>
        </button>
      </div>

      {/* Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Group Filter Dropdown */}
        <div className="flex items-center space-x-2 bg-slate-900 p-2 rounded-xl border border-slate-800 text-xs">
          <Filter className="w-4 h-4 text-slate-400 ml-1" />
          <span className="text-slate-400 font-medium">Filter Group:</span>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="bg-slate-950 text-white border border-slate-800 rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Joined Groups</option>
            {myGroups.map((g) => (
              <option key={g.id} value={g.id.toString()}>{g.name}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search filenames or uploaders..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Upload Resource Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Upload Study Resource</h3>

            {uploadError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Target Study Group</label>
                {myGroups.length === 0 ? (
                  <p className="text-xs text-amber-400">You must join at least one study group before uploading files.</p>
                ) : (
                  <select
                    value={uploadGroupId}
                    onChange={(e) => setUploadGroupId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                  >
                    {myGroups.map((g) => (
                      <option key={g.id} value={g.id.toString()}>{g.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Select File (PDF, PPT, DOC, PNG, JPG - max 15MB)
                </label>
                <input
                  type="file"
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif"
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  required
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer bg-slate-950 p-2 border border-slate-800 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || myGroups.length === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Summary View Modal */}
      {summaryModalData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col relative">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gemini AI Academic Summary</span>
                </div>
                <h3 className="text-xl font-bold text-white leading-snug">{summaryModalData.filename}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Processed {summaryModalData.total_pages} pages ({summaryModalData.extracted_chars} characters)
                </p>
              </div>
              <button onClick={() => setSummaryModalData(null)} className="p-1 text-slate-400 hover:text-white rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
              <pre className="text-xs sm:text-sm text-slate-200 font-sans leading-relaxed whitespace-pre-wrap">
                {summaryModalData.summary}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setSummaryModalData(null)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition">
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE AI FLASHCARDS STUDY MODAL */}
      {activeFlashcardSet && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 flex flex-col relative">

            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Gemini AI Study Deck</span>
                </div>
                <h3 className="text-xl font-bold text-white leading-snug">{activeFlashcardSet.title}</h3>
              </div>
              <button onClick={handleCloseFlashcards} className="p-1 text-slate-400 hover:text-white rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar & Indicators */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-400 font-mono font-semibold">
                <span>Card {currentCardIdx + 1} of {activeFlashcardSet.cards.length}</span>
                <span>{Math.round(((currentCardIdx + 1) / activeFlashcardSet.cards.length) * 100)}% Reviewed</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300 rounded-full"
                  style={{ width: `${((currentCardIdx + 1) / activeFlashcardSet.cards.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Interactive Flip Flashcard Box */}
            {activeFlashcardSet.cards[currentCardIdx] && (
              <div
                onClick={handleFlipCard}
                className="w-full min-h-[240px] p-6 bg-slate-950/90 border border-slate-800 hover:border-purple-500/50 rounded-2xl shadow-xl flex flex-col justify-between cursor-pointer transition transform hover:scale-[1.01]"
              >
                <div className="flex justify-between items-center">
                  <span className="px-2.5 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded-md text-[11px] font-mono font-semibold uppercase">
                    {activeFlashcardSet.cards[currentCardIdx].topic || 'Concept'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono flex items-center space-x-1">
                    <RotateCw className="w-3 h-3 text-purple-400" />
                    <span>{isFlipped ? 'Answer (Click to Flip Question)' : 'Question (Click to Flip Answer)'}</span>
                  </span>
                </div>

                <div className="py-6 text-center my-auto">
                  {isFlipped ? (
                    <p className="text-base sm:text-lg font-semibold text-emerald-300 leading-relaxed font-sans">
                      {activeFlashcardSet.cards[currentCardIdx].back}
                    </p>
                  ) : (
                    <h4 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                      {activeFlashcardSet.cards[currentCardIdx].front}
                    </h4>
                  )}
                </div>

                <div className="text-center text-[11px] text-slate-500 font-mono">
                  {isFlipped ? 'Showing Back Side' : 'Showing Front Side'}
                </div>
              </div>
            )}

            {/* Action Bar: Self-Assessment & Card Navigation */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              {/* Optional Self Assessment Buttons */}
              <div className="flex justify-center items-center space-x-3">
                {activeFlashcardSet.cards[currentCardIdx] && (
                  <>
                    <button
                      onClick={() => handleToggleKnown(activeFlashcardSet.cards[currentCardIdx].id, false)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 border ${
                        knownCards[activeFlashcardSet.cards[currentCardIdx].id] === false
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Review Again</span>
                    </button>
                    <button
                      onClick={() => handleToggleKnown(activeFlashcardSet.cards[currentCardIdx].id, true)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 border ${
                        knownCards[activeFlashcardSet.cards[currentCardIdx].id] === true
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>I Know This</span>
                    </button>
                  </>
                )}
              </div>

              {/* Navigation Controls */}
              <div className="flex justify-between items-center">
                <button
                  onClick={handlePrevCard}
                  disabled={currentCardIdx === 0}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-xl text-xs font-semibold transition flex items-center space-x-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleFlipCard}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-md"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>Flip Card</span>
                  </button>

                  <button
                    onClick={() => { setCurrentCardIdx(0); setIsFlipped(false); }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl transition"
                    title="Restart Deck"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={handleNextCard}
                  disabled={currentCardIdx === activeFlashcardSet.cards.length - 1}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-xl text-xs font-semibold transition flex items-center space-x-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE AI QUIZ MODAL */}
      {activeQuiz && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col relative">

            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Gemini AI Practice Quiz</span>
                </div>
                <h3 className="text-xl font-bold text-white leading-snug">{activeQuiz.title}</h3>
              </div>
              <button onClick={handleCloseQuiz} className="p-1 text-slate-400 hover:text-white rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* RESULTS VIEW AFTER SUBMISSION */}
            {quizResult ? (
              <div className="overflow-y-auto flex-1 space-y-6 pr-2">
                {/* Score Summary Box */}
                <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                  <div>
                    <div className="flex items-center justify-center sm:justify-start space-x-2 text-amber-400 text-xs font-bold uppercase mb-1">
                      <Award className="w-4 h-4" />
                      <span>Quiz Attempt Complete</span>
                    </div>
                    <h4 className="text-2xl font-black text-white">
                      Score: {quizResult.score} / {quizResult.total_questions} ({quizResult.percentage}%)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {quizResult.percentage >= 80 ? '🎉 Excellent performance! High-score bonus awarded.' : 'Good effort! Review the academic explanations below.'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                      <span className="block text-[10px] text-amber-300 uppercase font-semibold">Points Earned</span>
                      <span className="text-lg font-black text-amber-400 font-mono">+{quizResult.points_earned} XP</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Question Review */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Question Review & Gemini Explanations</h4>
                  {quizResult.feedback.map((fb, idx) => (
                    <div key={fb.question_id} className={`p-4 rounded-xl border space-y-3 ${fb.is_correct ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-rose-950/20 border-rose-500/30'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-semibold text-sm text-white leading-snug">
                          {idx + 1}. {fb.question_text}
                        </h5>
                        {fb.is_correct ? (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded flex items-center space-x-1 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Correct</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-xs font-bold rounded flex items-center space-x-1 shrink-0">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Incorrect</span>
                          </span>
                        )}
                      </div>

                      {/* Options Review */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {fb.options.map((opt, optIdx) => {
                          const isCorrectOpt = optIdx === fb.correct_option;
                          const isSelectedOpt = optIdx === fb.selected_option;
                          return (
                            <div
                              key={optIdx}
                              className={`p-2.5 rounded-lg border font-medium flex items-center justify-between ${
                                isCorrectOpt
                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200 font-bold'
                                  : isSelectedOpt
                                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-200'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
                              }`}
                            >
                              <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                              {isCorrectOpt && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                              {isSelectedOpt && !isCorrectOpt && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Academic Explanation */}
                      {fb.explanation && (
                        <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-lg text-xs text-indigo-200 leading-relaxed font-sans">
                          <strong>💡 Gemini Explanation:</strong> {fb.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button onClick={handleCloseQuiz} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow-lg transition">
                    Back to E-Shelf
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE QUIZ QUESTION TAKING VIEW */
              <div className="flex-1 flex flex-col justify-between overflow-y-auto space-y-6 pr-2">
                {/* Progress Bar & Indicators */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-400 font-mono font-semibold">
                    <span>Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}</span>
                    <span>{Math.round(((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100)}% Complete</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 transition-all duration-300 rounded-full"
                      style={{ width: `${((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Current Question */}
                {activeQuiz.questions[currentQuestionIdx] && (
                  <div className="space-y-4 bg-slate-950/70 border border-slate-800/80 p-5 rounded-2xl">
                    <h4 className="text-base font-bold text-white leading-relaxed">
                      {currentQuestionIdx + 1}. {activeQuiz.questions[currentQuestionIdx].question_text}
                    </h4>

                    {/* 4 Option Selection Cards */}
                    <div className="space-y-2.5">
                      {activeQuiz.questions[currentQuestionIdx].options.map((opt, optIdx) => {
                        const qId = activeQuiz.questions[currentQuestionIdx].id;
                        const isSelected = selectedAnswers[qId] === optIdx;

                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleSelectOption(qId, optIdx)}
                            className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-md'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{opt}</span>
                            </div>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-indigo-400 bg-indigo-600' : 'border-slate-700'}`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Question Navigation Controls */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setCurrentQuestionIdx(prev => Math.max(prev - 1, 0))}
                    disabled={currentQuestionIdx === 0}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-xl text-xs font-semibold transition flex items-center space-x-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  {currentQuestionIdx < activeQuiz.questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestionIdx(prev => Math.min(prev + 1, activeQuiz.questions.length - 1))}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1 shadow-lg"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={submittingQuiz}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      {submittingQuiz ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Submit Quiz</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resources Table / List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Loading E-Shelf resources...</div>
      ) : filteredResources.length === 0 ? (
        <div className="p-12 bg-slate-900/60 border border-slate-800 rounded-2xl text-center text-slate-400 text-sm">
          No resources found in E-Shelf. Click "Upload Resource" to share course materials!
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Document</th>
                  <th className="px-6 py-4 font-semibold">Format</th>
                  <th className="px-6 py-4 font-semibold">Size</th>
                  <th className="px-6 py-4 font-semibold">Uploaded By</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredResources.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-medium text-white flex items-center space-x-3 truncate">
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                        {getFileIcon(res.file_type)}
                      </div>
                      <span className="truncate max-w-xs">{res.filename}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono uppercase text-emerald-400">
                        {res.file_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {formatFileSize(res.file_size)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300">
                      {res.uploader_name}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {new Date(res.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* AI Tools for Study Resources */}
                        {true && (
                          <>
                            <button
                              onClick={() => handleGenerateFlashcards(res.id, res.filename)}
                              disabled={fcGeneratingId === res.id}
                              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
                            >
                              {fcGeneratingId === res.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Flashcards...</span>
                                </>
                              ) : (
                                <>
                                  <Layers className="w-3.5 h-3.5" />
                                  <span>Flashcards</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleGenerateQuiz(res.id, res.filename)}
                              disabled={quizGeneratingId === res.id}
                              className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
                            >
                              {quizGeneratingId === res.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Quiz...</span>
                                </>
                              ) : (
                                <>
                                  <HelpCircle className="w-3.5 h-3.5" />
                                  <span>Generate Quiz</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleGenerateSummary(res.id, res.filename)}
                              disabled={summarizingId === res.id}
                              className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
                            >
                              {summarizingId === res.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Summary...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>AI Summary</span>
                                </>
                              )}
                            </button>
                          </>
                        )}

                        {/* Download Action */}
                        <button
                          onClick={() => handleDownload(res.id, res.filename)}
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
