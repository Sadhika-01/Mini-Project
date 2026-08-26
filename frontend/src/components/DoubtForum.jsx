import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  HelpCircle,
  MessageSquare,
  Sparkles,
  Send,
  Bot,
  Search,
  PlusCircle,
  Loader2
} from 'lucide-react';

export default function DoubtForum() {
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [doubts, setDoubts] = useState([
    {
      id: 1,
      title: 'What is the main difference between Amazon S3 and EBS in AWS?',
      category: 'Cloud Computing',
      author: 'Rahul Verma',
      time: '2 hours ago',
      votes: 12,
      answers: [
        {
          id: 101,
          author: 'Priya Sharma',
          text: 'S3 is object storage accessible via REST API anywhere over HTTP, suitable for static assets. EBS is block storage attached directly to an EC2 instance like a hard drive.',
          votes: 8,
          aiImprovedText: null
        }
      ],
      aiExplanation: null
    },
    {
      id: 2,
      title: 'How does Gradient Descent optimize weights during Backpropagation?',
      category: 'Machine Learning',
      author: 'Ananya S.',
      time: '5 hours ago',
      votes: 19,
      answers: [
        {
          id: 102,
          author: 'Vasudev D.',
          text: 'Gradient descent computes the partial derivative of the loss function with respect to each weight using the chain rule, then updates weights in the opposite direction of the gradient.',
          votes: 14,
          aiImprovedText: null
        }
      ],
      aiExplanation: null
    }
  ]);

  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [newQuestionCategory, setNewQuestionCategory] = useState('General Study');
  const [showAskModal, setShowAskModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingAiId, setLoadingAiId] = useState(null);
  const [loadingImproveId, setLoadingImproveId] = useState(null);
  const [answerInputs, setAnswerInputs] = useState({});

  const handleAskSubmit = (e) => {
    e.preventDefault();
    if (!newQuestionTitle.trim()) return;

    const newDoubt = {
      id: Date.now(),
      title: newQuestionTitle,
      category: newQuestionCategory,
      author: 'You (Current Student)',
      time: 'Just now',
      votes: 1,
      answers: [],
      aiExplanation: null
    };

    setDoubts([newDoubt, ...doubts]);
    setNewQuestionTitle('');
    setShowAskModal(false);
  };

  const handleAddAnswer = (doubtId) => {
    const text = answerInputs[doubtId];
    if (!text || !text.trim()) return;

    setDoubts(doubts.map(d => {
      if (d.id === doubtId) {
        return {
          ...d,
          answers: [
            ...d.answers,
            {
              id: Date.now(),
              author: 'You (Current Student)',
              text: text.trim(),
              votes: 0,
              aiImprovedText: null
            }
          ]
        };
      }
      return d;
    }));

    setAnswerInputs({ ...answerInputs, [doubtId]: '' });
  };

  // AI Assistance: Call backend POST /api/v1/ai/explain
  const handleAiExplain = async (doubtId, question, category) => {
    setLoadingAiId(doubtId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ai/explain`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question, category })
      });

      if (res.ok) {
        const data = await res.json();
        setDoubts(doubts.map(d => {
          if (d.id === doubtId) {
            return {
              ...d,
              aiExplanation: data.explanation
            };
          }
          return d;
        }));
      }
    } catch (err) {
      console.error("AI Explain API Error:", err);
    } finally {
      setLoadingAiId(null);
    }
  };

  // AI Assistance: Call backend POST /api/v1/ai/improve-answer
  const handleAiImproveAnswer = async (doubtId, answerId, question, rawAnswer) => {
    setLoadingImproveId(answerId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ai/improve-answer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question, raw_answer: rawAnswer })
      });

      if (res.ok) {
        const data = await res.json();
        setDoubts(doubts.map(d => {
          if (d.id === doubtId) {
            const updatedAnswers = d.answers.map(ans => {
              if (ans.id === answerId) {
                return {
                  ...ans,
                  aiImprovedText: data.improved_answer
                };
              }
              return ans;
            });
            return { ...d, answers: updatedAnswers };
          }
          return d;
        }));
      }
    } catch (err) {
      console.error("AI Improve Answer API Error:", err);
    } finally {
      setLoadingImproveId(null);
    }
  };

  const filteredDoubts = doubts.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-indigo-900/50 via-slate-900 to-slate-900 border border-indigo-500/30 p-6 rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Google Gemini AI-Powered Q&A</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Doubt Forum</h2>
          <p className="text-slate-400 text-sm mt-1">
            Ask technical doubts, get community answers, and generate instant AI explanations.
          </p>
        </div>
        <button
          onClick={() => setShowAskModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg transition flex items-center space-x-2 text-sm shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Ask a Doubt</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search doubts by topic, keyword, or course subject..."
          className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
        />
      </div>

      {/* Ask Doubt Modal */}
      {showAskModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Post Your Study Doubt</h3>
            <form onSubmit={handleAskSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Subject / Category</label>
                <select
                  value={newQuestionCategory}
                  onChange={(e) => setNewQuestionCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm"
                >
                  <option value="Cloud Computing">Cloud Computing</option>
                  <option value="Machine Learning">Machine Learning</option>
                  <option value="Data Structures">Data Structures</option>
                  <option value="Operating Systems">Operating Systems</option>
                  <option value="General Study">General Study</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Your Question</label>
                <textarea
                  value={newQuestionTitle}
                  onChange={(e) => setNewQuestionTitle(e.target.value)}
                  rows={4}
                  placeholder="Type your question or concept doubt clearly..."
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAskModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg"
                >
                  Post Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doubts List */}
      <div className="space-y-6">
        {filteredDoubts.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400 text-sm">
            No doubts found matching your search. Be the first to ask!
          </div>
        ) : (
          filteredDoubts.map((doubt) => (
            <div key={doubt.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-block px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-md text-xs font-mono mb-2">
                    {doubt.category}
                  </span>
                  <h3 className="text-lg font-bold text-white leading-snug">{doubt.title}</h3>
                  <div className="flex items-center space-x-3 text-xs text-slate-400 mt-2">
                    <span>Asked by <strong className="text-slate-200">{doubt.author}</strong></span>
                    <span>•</span>
                    <span>{doubt.time}</span>
                  </div>
                </div>

                {/* AI Explain Button */}
                <button
                  onClick={() => handleAiExplain(doubt.id, doubt.title, doubt.category)}
                  disabled={loadingAiId === doubt.id}
                  className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center space-x-1.5 shrink-0 disabled:opacity-50"
                >
                  {loadingAiId === doubt.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Asking Gemini AI...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-3.5 h-3.5" />
                      <span>AI Explain</span>
                    </>
                  )}
                </button>
              </div>

              {/* AI Generated Explanation Card */}
              {doubt.aiExplanation && (
                <div className="p-4 bg-indigo-950/40 border border-indigo-500/40 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Gemini AI Assistant Explanation</span>
                  </div>
                  <pre className="text-xs text-indigo-100 whitespace-pre-wrap font-sans leading-relaxed">
                    {doubt.aiExplanation}
                  </pre>
                </div>
              )}

              {/* Community Answers Section */}
              <div className="border-t border-slate-800/80 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Community Answers ({doubt.answers.length})</span>
                </h4>

                {doubt.answers.map((ans) => (
                  <div key={ans.id} className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-300">{ans.author}</span>
                      <button
                        onClick={() => handleAiImproveAnswer(doubt.id, ans.id, doubt.title, ans.text)}
                        disabled={loadingImproveId === ans.id}
                        className="text-[11px] px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-md transition flex items-center space-x-1 disabled:opacity-50"
                      >
                        {loadingImproveId === ans.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Improving...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            <span>AI Improve Answer</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-sm text-slate-200 leading-relaxed">{ans.text}</p>

                    {/* AI Refined Answer Output */}
                    {ans.aiImprovedText && (
                      <div className="mt-3 p-3 bg-purple-950/30 border border-purple-500/30 rounded-lg text-xs text-purple-200 whitespace-pre-wrap leading-relaxed font-sans">
                        {ans.aiImprovedText}
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Community Answer Input */}
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="text"
                    value={answerInputs[doubt.id] || ''}
                    onChange={(e) => setAnswerInputs({ ...answerInputs, [doubt.id]: e.target.value })}
                    placeholder="Write a community answer..."
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => handleAddAnswer(doubt.id)}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
