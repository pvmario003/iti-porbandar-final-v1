/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { User } from "./types";
import { initializeStorage, addAuditLog, syncFromSupabase, getUsers } from "./utils/storage";
import { verifyConnection } from "./utils/supabaseClient";
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import SupervisorDashboard from "./components/SupervisorDashboard";
import { Download, Monitor, X } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [showConnectionSuccess, setShowConnectionSuccess] = useState(true);

  useEffect(() => {
    async function init() {
      // 1. Initialize local memory storage
      initializeStorage();

      // 1b. Verify Supabase connection and sync data
      try {
        const isConnected = await verifyConnection();
        if (isConnected) {
          setSupabaseConnected(true);
          await syncFromSupabase();
        } else {
          setSupabaseConnected(false);
        }
      } catch (e) {
        console.error("Connection verification failed", e);
        setSupabaseConnected(false);
      }

      // 2. Restore User Session from stored session
      try {
        const savedUserStr = sessionStorage.getItem("iti_current_user");
        if (savedUserStr) {
          const parsedUser: User = JSON.parse(savedUserStr);
          const allUsers = getUsers();
          const activeUser = allUsers.find(
            u => u.username.toLowerCase() === parsedUser.username.toLowerCase() && u.isActive
          );
          if (activeUser) {
            setCurrentUser(activeUser);
          } else if (parsedUser.isActive) {
            setCurrentUser(parsedUser);
          } else {
            sessionStorage.removeItem("iti_current_user");
          }
        }
      } catch (e) {
        console.error("Auth session check failed:", e);
      }

      setLoading(false);
    }

    init();

    // 3. Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      addAuditLog("System", "PWA Installation prompt available");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    addAuditLog("User", `PWA Installation choice: ${outcome}`);
    if (outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem("iti_current_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    if (currentUser) {
      addAuditLog(currentUser.name, "User logged out");
    }
    setCurrentUser(null);
    sessionStorage.removeItem("iti_current_user");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">Loading ITI Porbandar Management System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative font-sans antialiased">
      {/* Supabase Connection Success Badge */}
      {supabaseConnected && showConnectionSuccess && (
        <div 
          id="supabase-connected-badge" 
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 font-bold text-xs border border-emerald-500 transition-all duration-300"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shrink-0"></span>
          <span>✅ Supabase Connected Successfully</span>
          <button 
            onClick={() => setShowConnectionSuccess(false)}
            className="ml-2 hover:text-emerald-200 transition-colors cursor-pointer text-sm font-black focus:outline-none"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {!currentUser ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : currentUser.role === "ADMIN" ? (
        <AdminDashboard currentUser={currentUser} onLogout={handleLogout} />
      ) : (
        <SupervisorDashboard currentUser={currentUser} onLogout={handleLogout} />
      )}

      {/* Premium Native App Install Prompt banner */}
      {installPrompt && showBanner && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 animate-slideUp flex gap-3.5 items-start">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shrink-0 mt-0.5">
            <Monitor size={18} className="animate-bounce" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs font-black tracking-tight">Install Offline Desktop App</p>
            <p className="text-[10px] text-slate-400 leading-normal font-semibold">
              Install the ITI Porbandar App for quick offline access, keyboard shortcuts, and desktop integration.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
              >
                <Download size={10} /> Install Now
              </button>
              <button
                onClick={() => setShowBanner(false)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="text-slate-400 hover:text-white transition-all shrink-0 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

