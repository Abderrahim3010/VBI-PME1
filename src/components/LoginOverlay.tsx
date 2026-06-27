import React, { useState } from 'react';
import { User } from '../types';
import { Lock, Key } from 'lucide-react';

interface LoginOverlayProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export const LoginOverlay: React.FC<LoginOverlayProps> = ({ users, onLoginSuccess }) => {
  const [selectedUser, setSelectedUser] = useState<string>(users[0]?.username || 'admin');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isDialogHidden, setIsDialogHidden] = useState<boolean>(false);

  const handleOk = () => {
    const userObj = users.find(u => u.username.toLowerCase() === selectedUser.toLowerCase());
    if (!userObj) {
      setErrorMsg('Utilisateur introuvable.');
      return;
    }

    if (userObj.password === password) {
      setErrorMsg('');
      onLoginSuccess(userObj);
    } else {
      setErrorMsg('Mot de passe incorrect.');
      // Keep classical sound or alert feel
      const audio = new Audio();
      // Simple beep if supported
    }
  };

  const handleCancel = () => {
    setPassword('');
    setErrorMsg('');
    setIsDialogHidden(true);
  };

  if (isDialogHidden) {
    return (
      <div 
        className="fixed inset-0 bg-transparent z-[9999] cursor-default"
        onClick={() => setIsDialogHidden(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] font-sans">
      {/* 3D Retro Window Container */}
      <div className="w-[380px] bg-[#d4d0c8] text-black border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] shadow-2xl overflow-hidden select-none animate-in fade-in zoom-in-95 duration-100">
        
        {/* Title Bar - Windows 95/98 Blue Gradient Style */}
        <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-1 flex items-center justify-between text-white font-bold text-[13px] tracking-wide select-none">
          <div className="flex items-center gap-1.5">
            <span className="text-base leading-none">🔑</span>
            <span>Mot de Passe</span>
          </div>
          {/* Retro Close Button [X] */}
          <button 
            onClick={handleCancel}
            className="w-[16px] h-[14px] bg-[#d4d0c8] text-black font-extrabold flex items-center justify-center text-[10px] border border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white focus:outline-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content area */}
        <div className="p-4 bg-[#d4d0c8] flex flex-col gap-3.5 relative">
          
          {/* Safe box decorative retro widget */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-14 h-10 bg-[#b8b4a6] border border-t-white border-l-white border-r-[#404040] border-b-[#404040] flex items-center justify-center shadow-md hidden">
            🔒
          </div>

          <div className="flex justify-between items-start">
            <div className="flex-1 flex flex-col gap-3.5">
              {/* Dropdown "Utilisateur" */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-slate-800 tracking-wide">Utilisateur</label>
                <div className="relative">
                  <select
                    value={selectedUser}
                    onChange={(e) => {
                      setSelectedUser(e.target.value);
                      setErrorMsg('');
                    }}
                    className="w-full h-6 px-1.5 text-[13px] font-mono bg-white text-black border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] focus:outline-none focus:ring-0 appearance-none cursor-default"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.username}>{u.username}</option>
                    ))}
                  </select>
                  {/* Custom Arrow */}
                  <div className="absolute right-0.5 top-0.5 bottom-0.5 w-5 bg-[#d4d0c8] border border-t-white border-l-white border-r-[#404040] border-b-[#404040] flex items-center justify-center text-[9px] pointer-events-none active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white">
                    ▼
                  </div>
                </div>
              </div>

              {/* Input "Mot de Passe" */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-slate-800 tracking-wide">Mot de Passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleOk();
                  }}
                  autoFocus
                  className="w-full h-6 px-1.5 text-[13px] bg-white text-black border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] focus:outline-none focus:ring-0"
                />
              </div>
            </div>

            {/* Retro gold keys decoration illustration */}
            <div className="w-16 h-16 flex items-center justify-center relative ml-4 shrink-0 bg-slate-100/30 dark:bg-slate-800/20 rounded-xl border border-slate-300 dark:border-slate-700/50 p-2 shadow-inner">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <Lock className="w-9 h-9 text-slate-700 dark:text-slate-300 absolute top-0 left-0" />
                <Key className="w-7 h-7 text-amber-500 dark:text-amber-400 absolute bottom-0 right-0 rotate-[135deg]" />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="text-red-700 font-bold text-[11.5px] mt-1 bg-red-100 border border-red-300 p-1.5 rounded text-center select-text">
              ⚠️ {errorMsg}
            </div>
          )}
        </div>

        {/* Textured bottom panel - Matches Windows 98 textured look with nice light/shadow line */}
        <div 
          className="p-3.5 bg-[#c0bab0] border-t-2 border-t-[#f0f0f0] flex items-center justify-center gap-4.5"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 2px, transparent 2px, transparent 4px)',
          }}
        >
          <button
            onClick={handleOk}
            className="w-24 h-7 bg-[#d4d0c8] text-black font-bold text-[12px] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white hover:bg-[#eae6df] transition-colors focus:outline-none cursor-pointer"
          >
            Ok
          </button>
          <button
            onClick={handleCancel}
            className="w-24 h-7 bg-[#d4d0c8] text-black font-bold text-[12px] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white hover:bg-[#eae6df] transition-colors focus:outline-none cursor-pointer"
          >
            Annuler
          </button>
        </div>

      </div>
    </div>
  );
};
