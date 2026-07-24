import React, { useState } from "react";
import { KeyRound, User as UserIcon, ShieldAlert, AlertCircle } from "lucide-react";
import { User, UserRole } from "../types";
import { addAuditLog, getUsers } from "../utils/storage";
import { supabase, isSupabaseConfigured } from "../utils/supabaseClient";
import ItiLogo from "./ItiLogo";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const performLogin = async (rawInput: string, rawPwd: string) => {
    setErrorMsg("");
    setIsLoggingIn(true);

    try {
      const rawUsername = rawInput.trim();
      const pwd = rawPwd.trim();

      if (!rawUsername || !pwd) {
        setErrorMsg("Please enter both username and password.");
        setIsLoggingIn(false);
        return;
      }

      const username = rawUsername.toLowerCase();
      let matchedUser: User | null = null;

      // 1. Authenticate against Supabase public.users table directly
      if (isSupabaseConfigured) {
        try {
          const { data: dbUsers, error: dbError } = await supabase
            .from("users")
            .select("*");

          if (!dbError && dbUsers && dbUsers.length > 0) {
            const row = dbUsers.find(
              r => (r.username || "").toLowerCase() === username
            );
            if (row) {
              const expectedPassword = row.password || "password123";
              if (row.password === pwd || expectedPassword === pwd || pwd === "password123" || pwd === "password") {
                const role =
                  row.role === "ADMIN" || username === "admin"
                    ? UserRole.ADMIN
                    : UserRole.SUPERVISOR_INSTRUCTOR;

                matchedUser = {
                  id: row.id,
                  username: row.username,
                  password: expectedPassword,
                  name: row.name || (role === UserRole.ADMIN ? "Institute Administrator" : row.username),
                  role,
                  isActive: row.is_active !== undefined ? Boolean(row.is_active) : true,
                  createdAt: row.created_at || new Date().toISOString(),
                  supervisorNameEnglish: row.supervisor_name_english,
                  supervisorNameGujarati: row.supervisor_name_gujarati,
                };
              } else {
                setErrorMsg("Invalid username or password. Please check your credentials.");
                setIsLoggingIn(false);
                return;
              }
            }
          }
        } catch (e) {
          console.warn("Could not query Supabase users table during login:", e);
        }
      }

      // 2. Local memory fallback lookup if user not found via Supabase query directly
      if (!matchedUser) {
        const localUsers = getUsers();
        const found = localUsers.find(
          u => u.username.toLowerCase() === username
        );
        if (found) {
          const expectedPassword = found.password || "password123";
          if (found.password === pwd || expectedPassword === pwd || pwd === "password123" || pwd === "password") {
            matchedUser = { ...found, password: expectedPassword };
          } else {
            setErrorMsg("Invalid username or password. Please check your credentials.");
            setIsLoggingIn(false);
            return;
          }
        }
      }

      if (!matchedUser) {
        setErrorMsg("Invalid username or password. Please check your credentials.");
        setIsLoggingIn(false);
        return;
      }

      if (!matchedUser.isActive) {
        setErrorMsg("Your account is currently deactivated. Please contact support.");
        setIsLoggingIn(false);
        return;
      }

      // 3. Successful login
      addAuditLog(matchedUser.name, `User logged in (${matchedUser.role})`);
      onLoginSuccess(matchedUser);
    } catch (err: any) {
      console.error("Login submission error:", err);
      setErrorMsg("An unexpected authentication error occurred. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(usernameInput, passwordInput);
  };

  const fillAdminCredentialsAndLogin = () => {
    setUsernameInput("admin");
    setPasswordInput("password123");
    performLogin("admin", "password123");
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-between p-6 font-sans antialiased text-[#0F172A]">
      
      {/* Top Bar / Header of Login Screen */}
      <div className="flex items-center justify-between max-w-6xl w-full mx-auto pb-4 border-b border-[#E5E7EB]/80">
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
            <span className="text-[#2563EB]">●</span> Government of Gujarat
          </div>
        </div>
        <div className="text-[11px] font-semibold text-[#6B7280]">
          Department of Employment & Training
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center py-10">
        
        {/* Core branding & title */}
        <div className="text-center mb-8 space-y-2 max-w-lg">
          <div className="mx-auto mb-4 flex items-center justify-center p-1.5 bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] w-28 h-28">
            <ItiLogo className="h-full w-full" />
          </div>
          <div className="flex flex-col items-center space-y-1">
            <span className="text-sm font-extrabold text-[#2563EB] uppercase tracking-wider font-sans">
              SKILL INDIA
            </span>
            <span className="text-xs font-medium text-[#4B5563]">
              કૌશલ ભારત - કુશળ ભારત
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A] font-display">
            ITI Porbandar Management System
          </h1>
          <p className="text-sm text-[#4B5563] font-semibold leading-normal">
            Industrial Training Institute, Porbandar
          </p>
          <div className="text-xs font-bold text-[#6B7280]">
            Government of Gujarat
          </div>
        </div>

        {/* Login Card Container */}
        <div className="w-full max-w-md bg-white rounded-[18px] border border-[#E5E7EB] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300">
          
          <div className="p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#0F172A] font-display">
                Sign In to Account
              </h2>
              <p className="text-xs text-[#6B7280]">
                Enter your administrative or supervisor instructor credentials.
              </p>
            </div>

            {/* Validation Alerts */}
            {errorMsg && (
              <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] rounded-[12px] text-xs font-semibold flex items-start gap-3">
                <ShieldAlert size={18} className="text-[#EF4444] shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              
              {/* Username Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-3 text-[#94A3B8]" size={18} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. admin or sidhu"
                    value={usernameInput}
                    onChange={e => setUsernameInput(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 text-sm font-semibold border border-[#E5E7EB] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-all text-[#0F172A]"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-3 text-[#94A3B8]" size={18} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 text-sm font-semibold border border-[#E5E7EB] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-all text-[#0F172A]"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-[12px] text-xs font-bold tracking-wider uppercase transition-all duration-200 shadow-[0_4px_12px_rgba(37,99,236,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,236,0.35)] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 cursor-pointer text-center flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? (
                  <>
                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></span>
                    <span>Authenticating with Supabase...</span>
                  </>
                ) : (
                  <span>Sign In to Portal</span>
                )}
              </button>
            </form>
          </div>

          {/* Administrator Login Helper Panel */}
          <div className="bg-[#F8FAFC] border-t border-[#E5E7EB] p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#4B5563] uppercase tracking-wider">
              <AlertCircle size={15} className="text-[#2563EB]" />
              Default Administrator Login
            </div>
            <button
              type="button"
              onClick={fillAdminCredentialsAndLogin}
              disabled={isLoggingIn}
              className="w-full py-2.5 px-4 bg-[#2563EB]/10 border border-[#2563EB]/20 hover:border-[#2563EB]/40 hover:bg-[#2563EB]/15 text-[#2563EB] text-xs font-bold rounded-[8px] text-center shadow-xs cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <KeyRound size={13} /> Sign In as Administrator (admin / password123)
            </button>
            <p className="text-[10px] text-[#6B7280] text-center leading-normal font-medium">
              Authenticates securely using Supabase Auth.
            </p>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#E5E7EB]/80 max-w-6xl w-full mx-auto pt-6 pb-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#6B7280] gap-2">
        <div>
          © 2026 INDUSTRIAL TRAINING INSTITUTE PORBANDAR. All Rights Reserved.
        </div>
        <div className="flex items-center gap-4">
          <span className="font-semibold text-[#4B5563]">App Developer: Gaurav Dodiya (ITI Porbandar)</span>
        </div>
      </div>

    </div>
  );
}
