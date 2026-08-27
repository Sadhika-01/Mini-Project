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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#2E003E] text-white p-6 rounded-2xl shadow-md">
        <div>
          <div className="flex items-center space-x-2 text-[#FFB7C5] text-xs font-semibold uppercase tracking-wider mb-1">
            <BookOpen className="w-3.5 h-3.5 text-[#FFB7C5]" />
            <span>Digital Study Repository & AI Tools</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Shared E-Shelf</h2>
          <p className="text-white/80 text-sm mt-1">
            Access study materials, generate AI PDF summaries, take practice quizzes, and revise with flashcards.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl shadow-md transition flex items-center space-x-2 text-sm shrink-0 border border-[#FFB7C5]/30"
        >
          <Upload className="w-4 h-4 text-[#FFB7C5]" />
          <span>Upload Resource</span>
        </button>
      </div>

      {/* Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Group Filter Dropdown */}
        <div className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-[#E8DDEB] text-xs shadow-sm">
          <Filter className="w-4 h-4 text-[#756A78] ml-1" />
          <span className="text-[#756A78] font-medium">Filter Group:</span>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="bg-[#F8F3F9] text-[#241A26] border border-[#E8DDEB] rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#2E003E]"
          >
            <option value="all">All Joined Groups</option>
            {myGroups.map((g) => (
              <option key={g.id} value={g.id.toString()}>{g.name}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-[#756A78] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search filenames or uploaders..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E8DDEB] rounded-xl text-[#241A26] placeholder-[#756A78] text-xs focus:outline-none focus:border-[#2E003E] shadow-sm"
          />
        </div>
      </div>

      {/* Upload Resource Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-[#2E003E]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DDEB] rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 relative">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-[#E8DDEB] pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#F8F3F9] border border-[#E8DDEB] text-[#2E003E] flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2E003E] leading-tight">Upload Study Resource</h3>
                  <p className="text-xs text-[#756A78] mt-0.5">Share notes, slides, and documents with your study group.</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-[#756A78] hover:text-[#2E003E] rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error & Success Alert Badges */}
            {uploadError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs rounded-xl flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Target Study Group Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#2E003E] uppercase tracking-wider mb-1.5">
                  Target Study Group
                </label>
                {myGroups.length === 0 ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs rounded-xl">
                    You must join at least one study group before uploading files.
                  </div>
                ) : (
                  <div className="relative">
                    <Users className="w-4 h-4 text-[#756A78] absolute left-3.5 top-3" />
                    <select
                      value={uploadGroupId}
                      onChange={(e) => setUploadGroupId(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F3F9] border border-[#E8DDEB] rounded-xl text-[#241A26] text-xs font-medium focus:outline-none focus:border-[#2E003E]"
                    >
                      {myGroups.map((g) => (
                        <option key={g.id} value={g.id.toString()}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Styled File Upload Drop Zone & File Selector Widget */}
              <div>
                <label className="block text-xs font-semibold text-[#2E003E] uppercase tracking-wider mb-1.5">
                  Document File
                </label>
                <div className="relative border-2 border-dashed border-[#E8DDEB] hover:border-[#FFB7C5] bg-[#F8F3F9] rounded-2xl p-5 text-center transition group">
                  <input
                    type="file"
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif"
                    onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                    required
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="space-y-2 pointer-events-none">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8DDEB] text-[#2E003E] flex items-center justify-center mx-auto shadow-sm group-hover:scale-105 transition">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#2E003E]">
                        {selectedFile ? 'Change Selected File' : 'Click or Drag to Select File'}
                      </p>
                      <p className="text-[11px] text-[#756A78] mt-0.5">
                        PDF, PPT, DOC, PNG, JPG (max 15MB)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Selected File Details Box */}
                {selectedFile && (
                  <div className="mt-3 p-3 bg-white border border-[#E8DDEB] rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center space-x-2.5 truncate">
                      <FileText className="w-4 h-4 text-[#2E003E] shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-[#241A26] truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-[#756A78] font-mono">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 shrink-0">
                      Ready
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-[#E8DDEB]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 bg-[#F8F3F9] hover:bg-[#E8DDEB] text-[#756A78] border border-[#E8DDEB] rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || myGroups.length === 0}
                  className="px-5 py-2.5 bg-[#2E003E] hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-2 border border-[#FFB7C5]/30 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#FFB7C5]" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-[#FFB7C5]" />
                      <span>Upload File</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Summary View Modal */}
      {summaryModalData && (
        <div className="fixed inset-0 bg-[#2E003E]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DDEB] rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[85vh] flex flex-col relative">
            <div className="flex justify-between items-start border-b border-[#E8DDEB] pb-3">
              <div>
                <div className="flex items-center space-x-2 text-[#2E003E] text-xs font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFB7C5]" />
                  <span>Gemini AI Academic Summary</span>
                </div>
                <h3 className="text-xl font-bold text-[#2E003E] leading-snug">{summaryModalData.filename}</h3>
                <p className="text-xs text-[#756A78] mt-0.5">
                  Processed {summaryModalData.total_pages} pages ({summaryModalData.extracted_chars} characters)
                </p>
              </div>
              <button onClick={() => setSummaryModalData(null)} className="p-1 text-[#756A78] hover:text-[#2E003E] rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 bg-[#F8F3F9] border border-[#E8DDEB] rounded-xl">
              <pre className="text-xs sm:text-sm text-[#241A26] font-sans leading-relaxed whitespace-pre-wrap">
                {summaryModalData.summary}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setSummaryModalData(null)} className="px-4 py-2 bg-[#2E003E] hover:opacity-90 text-white rounded-xl text-xs font-semibold transition shadow-md">
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE AI FLASHCARDS STUDY MODAL */}
      {activeFlashcardSet && (
        <div className="fixed inset-0 bg-[#2E003E]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DDEB] rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-5 flex flex-col relative">

            {/* Header */}
            <div className="flex justify-between items-start border-b border-[#E8DDEB] pb-3">
              <div>
                <div className="flex items-center space-x-2 text-[#2E003E] text-xs font-bold uppercase tracking-wider mb-1">
                  <Layers className="w-3.5 h-3.5 text-[#FFB7C5]" />
                  <span>Gemini AI Study Deck</span>
                </div>
                <h3 className="text-xl font-bold text-[#2E003E] leading-snug">{activeFlashcardSet.title}</h3>
              </div>
              <button onClick={handleCloseFlashcards} className="p-1 text-[#756A78] hover:text-[#2E003E] rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar & Indicators */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-[#756A78] font-mono font-semibold">
                <span>Card {currentCardIdx + 1} of {activeFlashcardSet.cards.length}</span>
                <span>{Math.round(((currentCardIdx + 1) / activeFlashcardSet.cards.length) * 100)}% Reviewed</span>
              </div>
              <div className="w-full h-2 bg-[#F8F3F9] rounded-full overflow-hidden border border-[#E8DDEB]">
                <div
                  className="h-full bg-gradient-to-r from-[#2E003E] to-[#FFB7C5] transition-all duration-300 rounded-full"
                  style={{ width: `${((currentCardIdx + 1) / activeFlashcardSet.cards.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Interactive Flip Flashcard Box */}
            {activeFlashcardSet.cards[currentCardIdx] && (
              <div
                onClick={handleFlipCard}
                className="w-full min-h-[240px] p-6 bg-[#F8F3F9] border border-[#E8DDEB] hover:border-[#FFB7C5] rounded-2xl shadow-sm flex flex-col justify-between cursor-pointer transition transform hover:scale-[1.01]"
              >
                <div className="flex justify-between items-center">
                  <span className="px-2.5 py-1 bg-[#2E003E] text-white rounded-md text-[11px] font-mono font-semibold uppercase">
                    {activeFlashcardSet.cards[currentCardIdx].topic || 'Concept'}
                  </span>
                  <span className="text-[11px] text-[#756A78] font-mono flex items-center space-x-1">
                    <RotateCw className="w-3 h-3 text-[#2E003E]" />
                    <span>{isFlipped ? 'Answer (Click to Flip Question)' : 'Question (Click to Flip Answer)'}</span>
                  </span>
                </div>

                <div className="py-6 text-center my-auto">
                  {isFlipped ? (
                    <p className="text-base sm:text-lg font-semibold text-[#2E003E] leading-relaxed font-sans">
                      {activeFlashcardSet.cards[currentCardIdx].back}
                    </p>
                  ) : (
                    <h4 className="text-lg sm:text-xl font-bold text-[#241A26] leading-relaxed">
                      {activeFlashcardSet.cards[currentCardIdx].front}
                    </h4>
                  )}
                </div>

                <div className="text-center text-[11px] text-[#756A78] font-mono">
                  {isFlipped ? 'Showing Back Side' : 'Showing Front Side'}
                </div>
              </div>
            )}

            {/* Action Bar: Self-Assessment & Card Navigation */}
            <div className="space-y-4 pt-2 border-t border-[#E8DDEB]">
              {/* Optional Self Assessment Buttons */}
              <div className="flex justify-center items-center space-x-3">
                {activeFlashcardSet.cards[currentCardIdx] && (
                  <>
                    <button
                      onClick={() => handleToggleKnown(activeFlashcardSet.cards[currentCardIdx].id, false)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 border ${
                        knownCards[activeFlashcardSet.cards[currentCardIdx].id] === false
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-700'
                          : 'bg-[#F8F3F9] border-[#E8DDEB] text-[#756A78] hover:text-[#241A26]'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Review Again</span>
                    </button>
                    <button
                      onClick={() => handleToggleKnown(activeFlashcardSet.cards[currentCardIdx].id, true)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 border ${
                        knownCards[activeFlashcardSet.cards[currentCardIdx].id] === true
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-700'
                          : 'bg-[#F8F3F9] border-[#E8DDEB] text-[#756A78] hover:text-[#241A26]'
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
                  className="px-4 py-2 bg-[#F8F3F9] hover:bg-[#E8DDEB] border border-[#E8DDEB] disabled:opacity-40 text-[#241A26] rounded-xl text-xs font-semibold transition flex items-center space-x-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleFlipCard}
                    className="px-4 py-2 bg-[#2E003E] hover:opacity-90 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-md"
                  >
                    <RotateCw className="w-4 h-4 text-[#FFB7C5]" />
                    <span>Flip Card</span>
                  </button>

                  <button
                    onClick={() => { setCurrentCardIdx(0); setIsFlipped(false); }}
                    className="px-3 py-2 bg-[#F8F3F9] hover:bg-[#E8DDEB] text-[#756A78] border border-[#E8DDEB] rounded-xl transition"
                    title="Restart Deck"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={handleNextCard}
                  disabled={currentCardIdx === activeFlashcardSet.cards.length - 1}
                  className="px-4 py-2 bg-[#F8F3F9] hover:bg-[#E8DDEB] border border-[#E8DDEB] disabled:opacity-40 text-[#241A26] rounded-xl text-xs font-semibold transition flex items-center space-x-1"
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
        <div className="fixed inset-0 bg-[#2E003E]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DDEB] rounded-2xl max-w-3xl w-full p-6 shadow-xl space-y-5 max-h-[90vh] flex flex-col relative">

            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-[#E8DDEB] pb-3">
              <div>
                <div className="flex items-center space-x-2 text-[#2E003E] text-xs font-bold uppercase tracking-wider mb-1">
                  <HelpCircle className="w-3.5 h-3.5 text-[#FFB7C5]" />
                  <span>Gemini AI Practice Quiz</span>
                </div>
                <h3 className="text-xl font-bold text-[#2E003E] leading-snug">{activeQuiz.title}</h3>
              </div>
              <button onClick={handleCloseQuiz} className="p-1 text-[#756A78] hover:text-[#2E003E] rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* RESULTS VIEW AFTER SUBMISSION */}
            {quizResult ? (
              <div className="overflow-y-auto flex-1 space-y-6 pr-2">
                {/* Score Summary Box */}
                <div className="p-6 bg-[#2E003E] text-white border border-[#FFB7C5]/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-md">
                  <div>
                    <div className="flex items-center justify-center sm:justify-start space-x-2 text-[#FFB7C5] text-xs font-bold uppercase mb-1">
                      <Award className="w-4 h-4 text-[#FFB7C5]" />
                      <span>Quiz Attempt Complete</span>
                    </div>
                    <h4 className="text-2xl font-black text-white">
                      Score: {quizResult.score} / {quizResult.total_questions} ({quizResult.percentage}%)
                    </h4>
                    <p className="text-xs text-white/80 mt-1">
                      {quizResult.percentage >= 80 ? '🎉 Excellent performance! High-score bonus awarded.' : 'Good effort! Review the academic explanations below.'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="px-4 py-2 bg-white/10 border border-[#FFB7C5]/30 rounded-xl text-center">
                      <span className="block text-[10px] text-[#FFB7C5] uppercase font-semibold">Points Earned</span>
                      <span className="text-lg font-black text-white font-mono">+{quizResult.points_earned} XP</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Question Review */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-[#2E003E] uppercase tracking-wider">Question Review & Gemini Explanations</h4>
                  {quizResult.feedback.map((fb, idx) => (
                    <div key={fb.question_id} className={`p-4 rounded-xl border space-y-3 ${fb.is_correct ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-semibold text-sm text-[#241A26] leading-snug">
                          {idx + 1}. {fb.question_text}
                        </h5>
                        {fb.is_correct ? (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-700 text-xs font-bold rounded flex items-center space-x-1 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Correct</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-700 text-xs font-bold rounded flex items-center space-x-1 shrink-0">
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
                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-800 font-bold'
                                  : isSelectedOpt
                                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-800'
                                  : 'bg-[#F8F3F9] border-[#E8DDEB] text-[#756A78]'
                              }`}
                            >
                              <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                              {isCorrectOpt && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                              {isSelectedOpt && !isCorrectOpt && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Academic Explanation */}
                      {fb.explanation && (
                        <div className="p-3 bg-[#F8F3F9] border border-[#E8DDEB] rounded-lg text-xs text-[#2E003E] leading-relaxed font-sans font-medium">
                          <strong>💡 Gemini Explanation:</strong> {fb.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button onClick={handleCloseQuiz} className="px-5 py-2.5 bg-[#2E003E] hover:opacity-90 text-white font-semibold rounded-xl text-xs shadow-md transition border border-[#FFB7C5]/30">
                    Back to E-Shelf
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE QUIZ QUESTION TAKING VIEW */
              <div className="flex-1 flex flex-col justify-between overflow-y-auto space-y-6 pr-2">
                {/* Progress Bar & Indicators */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-[#756A78] font-mono font-semibold">
                    <span>Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}</span>
                    <span>{Math.round(((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100)}% Complete</span>
                  </div>
                  <div className="w-full h-2 bg-[#F8F3F9] rounded-full overflow-hidden border border-[#E8DDEB]">
                    <div
                      className="h-full bg-gradient-to-r from-[#2E003E] to-[#FFB7C5] transition-all duration-300 rounded-full"
                      style={{ width: `${((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Current Question */}
                {activeQuiz.questions[currentQuestionIdx] && (
                  <div className="space-y-4 bg-[#F8F3F9] border border-[#E8DDEB] p-5 rounded-2xl">
                    <h4 className="text-base font-bold text-[#241A26] leading-relaxed">
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
                                ? 'bg-[#2E003E] border-[#2E003E] text-white shadow-md'
                                : 'bg-white border-[#E8DDEB] text-[#241A26] hover:bg-[#F8F3F9]'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center ${isSelected ? 'bg-[#FFB7C5] text-[#2E003E]' : 'bg-[#F8F3F9] text-[#756A78]'}`}>
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{opt}</span>
                            </div>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#FFB7C5] bg-[#FFB7C5]' : 'border-[#E8DDEB]'}`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#2E003E]"></div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Question Navigation Controls */}
                <div className="flex justify-between items-center pt-3 border-t border-[#E8DDEB]">
                  <button
                    onClick={() => setCurrentQuestionIdx(prev => Math.max(prev - 1, 0))}
                    disabled={currentQuestionIdx === 0}
                    className="px-4 py-2 bg-[#F8F3F9] hover:bg-[#E8DDEB] disabled:opacity-40 text-[#241A26] border border-[#E8DDEB] rounded-xl text-xs font-semibold transition flex items-center space-x-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  {currentQuestionIdx < activeQuiz.questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestionIdx(prev => Math.min(prev + 1, activeQuiz.questions.length - 1))}
                      className="px-4 py-2 bg-[#2E003E] hover:opacity-90 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1 shadow-md border border-[#FFB7C5]/30"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4 text-[#FFB7C5]" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={submittingQuiz}
                      className="px-5 py-2.5 bg-[#2E003E] hover:opacity-90 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center space-x-1.5 disabled:opacity-50 border border-[#FFB7C5]/30"
                    >
                      {submittingQuiz ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#FFB7C5]" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-[#FFB7C5]" />
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
        <div className="py-12 text-center text-[#756A78] text-sm">Loading E-Shelf resources...</div>
      ) : filteredResources.length === 0 ? (
        <div className="p-12 bg-white border border-[#E8DDEB] rounded-2xl text-center text-[#756A78] text-sm shadow-sm">
          No resources found in E-Shelf. Click "Upload Resource" to share course materials!
        </div>
      ) : (
        <div className="bg-white border border-[#E8DDEB] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#241A26]">
              <thead className="bg-[#F8F3F9] text-xs uppercase text-[#2E003E] font-bold border-b border-[#E8DDEB]">
                <tr>
                  <th className="px-6 py-4">Document</th>
                  <th className="px-6 py-4">Format</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4">Uploaded By</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DDEB]">
                {filteredResources.map((res) => (
                  <tr key={res.id} className="hover:bg-[#F8F3F9]/60 transition">
                    <td className="px-6 py-4 font-semibold text-[#241A26] flex items-center space-x-3 truncate">
                      <div className="p-2 rounded-lg bg-[#F8F3F9] border border-[#E8DDEB] text-[#2E003E]">
                        {getFileIcon(res.file_type)}
                      </div>
                      <span className="truncate max-w-xs">{res.filename}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-[#F8F3F9] border border-[#E8DDEB] rounded-md text-xs font-mono uppercase text-[#2E003E] font-bold">
                        {res.file_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-[#756A78]">
                      {formatFileSize(res.file_size)}
                    </td>
                    <td className="px-6 py-4 text-xs text-[#241A26] font-medium">
                      {res.uploader_name}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-[#756A78]">
                      {new Date(res.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* AI Tools for Study Resources */}
                        <button
                          onClick={() => handleGenerateFlashcards(res.id, res.filename)}
                          disabled={fcGeneratingId === res.id}
                          className="px-3 py-1.5 bg-[#2E003E] hover:opacity-90 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm border border-[#FFB7C5]/30 disabled:opacity-50"
                        >
                          {fcGeneratingId === res.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFB7C5]" />
                              <span>Flashcards...</span>
                            </>
                          ) : (
                            <>
                              <Layers className="w-3.5 h-3.5 text-[#FFB7C5]" />
                              <span>Flashcards</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleGenerateQuiz(res.id, res.filename)}
                          disabled={quizGeneratingId === res.id}
                          className="px-3 py-1.5 bg-[#2E003E] hover:opacity-90 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm border border-[#FFB7C5]/30 disabled:opacity-50"
                        >
                          {quizGeneratingId === res.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFB7C5]" />
                              <span>Quiz...</span>
                            </>
                          ) : (
                            <>
                              <HelpCircle className="w-3.5 h-3.5 text-[#FFB7C5]" />
                              <span>Generate Quiz</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleGenerateSummary(res.id, res.filename)}
                          disabled={summarizingId === res.id}
                          className="px-3 py-1.5 bg-[#2E003E] hover:opacity-90 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm border border-[#FFB7C5]/30 disabled:opacity-50"
                        >
                          {summarizingId === res.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFB7C5]" />
                              <span>Summary...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-[#FFB7C5]" />
                              <span>AI Summary</span>
                            </>
                          )}
                        </button>

                        {/* Download Action */}
                        <button
                          onClick={() => handleDownload(res.id, res.filename)}
                          className="px-3 py-1.5 bg-[#F8F3F9] hover:bg-[#E8DDEB] text-[#2E003E] border border-[#E8DDEB] rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5 text-[#2E003E]" />
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
