import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Register({ onSwitchToLogin, onRegisterSuccess }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name, email, password);
      if (onRegisterSuccess) onRegisterSuccess();
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto bg-white border border-[#E8DDEB] rounded-2xl p-8 shadow-xl">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[#2E003E] mb-2">Create Account</h2>
        <p className="text-sm text-[#756A78]">Join the collaborative learning platform</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#2E003E] uppercase tracking-wider mb-1.5">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vasudev Dasari"
            required
            className="w-full px-4 py-2.5 rounded-lg bg-[#F8F3F9] border border-[#E8DDEB] text-[#241A26] placeholder-[#756A78] focus:outline-none focus:border-[#2E003E] text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#2E003E] uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
            required
            className="w-full px-4 py-2.5 rounded-lg bg-[#F8F3F9] border border-[#E8DDEB] text-[#241A26] placeholder-[#756A78] focus:outline-none focus:border-[#2E003E] text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#2E003E] uppercase tracking-wider mb-1.5">
            Password (min 6 characters)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full px-4 py-2.5 rounded-lg bg-[#F8F3F9] border border-[#E8DDEB] text-[#241A26] placeholder-[#756A78] focus:outline-none focus:border-[#2E003E] text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 bg-[#2E003E] hover:opacity-90 text-white font-semibold rounded-lg shadow-md transition duration-150 disabled:opacity-50 text-sm"
        >
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-[#756A78]">
        Already have an account?{' '}
        <button
          onClick={onSwitchToLogin}
          className="text-[#2E003E] hover:underline font-bold"
        >
          Sign in here
        </button>
      </div>
    </div>
  );
}
