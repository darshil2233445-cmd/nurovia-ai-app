import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, User, Mail, Calendar, LogOut, Trash2, ShieldAlert, Check, RefreshCw, AlertCircle } from "lucide-react";

interface UserProfile {
  email: string;
  name: string;
  photoUrl?: string;
  createdAt?: string;
}

interface UserProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onUpdateProfile: (updated: Partial<UserProfile>) => Promise<boolean>;
  onSignOut: () => void;
  onDeleteAccount: () => Promise<boolean>;
}

export default function UserProfileModal({
  user,
  onClose,
  onUpdateProfile,
  onSignOut,
  onDeleteAccount,
}: UserProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Danger zone flags for deleting account
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteConfirmationEmail, setDeleteConfirmationEmail] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const ok = await onUpdateProfile({ name: name.trim() });
      if (ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error("Failed to update name.");
      }
    } catch (err: any) {
      setError(err.message || "Could not save changes.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmationEmail.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
      setError("Email address does not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ok = await onDeleteAccount();
      if (!ok) {
        throw new Error("Failed to delete account. Please try again.");
      }
      onSignOut(); // Sign out user locally
    } catch (err: any) {
      setError(err.message || "Failed to delete account.");
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto selection:bg-blue-500/20">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden text-slate-800 dark:text-slate-100"
        id="user-profile-modal-container"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
            <h2 className="text-xl font-display font-extrabold text-slate-950 dark:text-slate-100">Your Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            id="profile-modal-close"
          >
            <X size={18} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!showConfirmDelete ? (
            <motion.div
              key="main-profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Profile Avatar and Info */}
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
                <img
                  src={user.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl shadow-inner border border-slate-200 dark:border-slate-700 object-cover"
                />
                <div>
                  <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 leading-none">{user.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 flex items-center gap-1">
                    <Mail size={12} className="text-slate-400" />
                    <span>{user.email}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                    <Calendar size={12} className="text-slate-400" />
                    <span>Member since {formatDate(user.createdAt)}</span>
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-300 p-3 rounded-xl text-xs font-semibold">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 p-3 rounded-xl text-xs font-semibold">
                  <Check size={15} className="shrink-0" />
                  <span>Profile updated successfully!</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-display">Display Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User size={15} />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your display name"
                      className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-hidden transition-all bg-white dark:bg-slate-800 min-h-[44px]"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="submit"
                    disabled={loading || name === user.name}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-40 cursor-pointer min-h-[44px] font-display"
                  >
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : "Save Changes"}
                  </button>
                </div>
              </form>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  onClick={onSignOut}
                  className="w-full py-2.5 px-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] font-display"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>

                <button
                  onClick={() => setShowConfirmDelete(true)}
                  className="w-full py-2.5 px-4 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] font-display"
                >
                  <Trash2 size={16} />
                  <span>Delete Account</span>
                </button>
              </div>
            </motion.div>
          ) : (
            /* Delete Confirmation Step */
            <motion.div
              key="delete-confirm"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-6"
            >
              <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3 text-rose-700 dark:text-rose-300">
                <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold font-display">Irreversible Account Deletion</p>
                  <p className="leading-relaxed">
                    This will permanently remove your study history, saved notes, flashcards, and preferences.
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-300 p-3 rounded-xl text-xs font-semibold">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-display">
                  Type <span className="text-slate-900 dark:text-slate-100 font-extrabold">{user.email}</span> to confirm
                </label>
                <input
                  type="email"
                  value={deleteConfirmationEmail}
                  onChange={(e) => setDeleteConfirmationEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-hidden transition-all bg-white dark:bg-slate-800 min-h-[44px]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all min-h-[44px] cursor-pointer font-display"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading || deleteConfirmationEmail.toLowerCase().trim() !== user.email.toLowerCase().trim()}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-40 min-h-[44px] cursor-pointer font-display"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin mx-auto" /> : "Delete Permanently"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
