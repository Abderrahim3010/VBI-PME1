import React, { useState } from 'react';
import { Settings, ShieldCheck, HelpCircle, Save, CheckCircle2 } from 'lucide-react';

interface ConfigWindowProps {
  currentCompany: string;
  currentUser: string;
  isActivated: boolean;
  onUpdateConfig: (data: { company: string; user: string; isActivated: boolean }) => void;
  onClose: () => void;
}

export default function ConfigWindow({
  currentCompany,
  currentUser,
  isActivated,
  onUpdateConfig,
  onClose
}: ConfigWindowProps) {
  const [company, setCompany] = useState(currentCompany);
  const [user, setUser] = useState(currentUser);
  const [activated, setActivated] = useState(isActivated);
  
  // Custom activation key simulator
  const [activationKey, setActivationKey] = useState('');
  const [showKeyError, setShowKeyError] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({ company, user, isActivated: activated });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const verifyKey = () => {
    const trimmed = activationKey.trim().toLowerCase();
    if (trimmed === 'vbi-2026' || trimmed === 'compos-2026' || trimmed.length > 5) {
      setActivated(true);
      setShowKeyError(false);
      setActivationSuccess(true);
      onUpdateConfig({ company, user, isActivated: true });
      setTimeout(() => setActivationSuccess(false), 5000);
    } else {
      setShowKeyError(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4 font-sans text-xs select-none text-slate-800 dark:text-slate-100">
      
      {/* Banner */}
      <div className="bg-m3-surface-container dark:bg-slate-950 p-4 rounded-2xl flex justify-between items-center border border-m3-outline-variant/10">
        <span className="text-sm font-bold font-display flex items-center gap-2 text-m3-primary dark:text-sky-400">
          <Settings size={18} className="animate-spin-slow" /> PARAMÈTRES DU SYSTÈME & IDENTITÉ DE L'ENTREPRISE
        </span>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[220px]">
        
        {/* Settings column */}
        <form onSubmit={handleApply} className="bg-white dark:bg-slate-900 p-4 border border-m3-outline-variant/15 rounded-2xl flex flex-col justify-between shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="font-bold border-b border-slate-100 dark:border-slate-800 text-[10px] text-m3-primary dark:text-sky-300 pb-2 uppercase tracking-wider font-display">
              Paramètres Généraux
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wide">Nom de l'Entreprise / Société</label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-9 rounded-xl px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/10 transition-all dark:text-slate-150"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wide">Utilisateur connecté Actif</label>
              <input
                type="text"
                required
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="h-9 rounded-xl px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-semibold outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/10 transition-all dark:text-slate-150"
              />
            </div>
            
            <p className="text-[10px] text-slate-400 leading-normal mt-1 flex items-start gap-1">
              <HelpCircle size={12} className="shrink-0 mt-0.5" /> Ces champs mettront à jour la facture de vente et la signature de l'opérateur en temps réel.
            </p>

            {saveSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/30 text-emerald-800 dark:text-emerald-300 text-[11px] p-2 rounded-xl font-bold flex items-center gap-1.5 animate-pulse">
                <CheckCircle2 size={13} className="text-emerald-500" /> Configuration enregistrée !
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full h-10 mt-4 rounded-xl bg-m3-primary text-xs font-bold text-white hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-m3-primary/10"
          >
            <Save size={14} /> Enregistrer les variables
          </button>
        </form>

        {/* License activation column */}
        <div className="bg-white dark:bg-slate-900 p-4 border border-m3-outline-variant/15 rounded-2xl flex flex-col justify-between shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="font-bold border-b border-slate-100 dark:border-slate-800 text-[10px] text-m3-primary dark:text-sky-300 pb-2 uppercase tracking-wider font-display">
              Statut Key d'Activation
            </div>

            <div className="flex gap-3 items-center p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
              <ShieldCheck size={24} className={activated ? 'text-emerald-500' : 'text-amber-500 animate-pulse'} />
              <div className="flex flex-col">
                <span className="font-bold uppercase text-[9px] text-slate-400">Statut Contrat</span>
                <span className={`font-mono text-[10px] font-bold tracking-wide ${activated ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 animate-pulse'}`}>
                  {activated ? 'LICENCE ORIGINALE ACTIVE (PRO)' : 'VERSION D\'ÉVALUATION'}
                </span>
              </div>
            </div>

            {activationSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/30 text-emerald-800 dark:text-emerald-300 text-[10px] p-2.5 rounded-xl font-bold flex items-center gap-1.5 animate-bounce">
                🚀 Félicitations! Logiciel activé avec succès.
              </div>
            )}

            {!activated && (
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wide">Clef d'activation :</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Clé (ex: VBI-2026)"
                    value={activationKey}
                    onChange={(e) => setActivationKey(e.target.value)}
                    className="flex-1 h-9 rounded-xl px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/10 transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={verifyKey}
                    className="px-4 h-9 bg-m3-primary-container text-m3-primary font-bold rounded-xl text-xs hover:opacity-90 transition duration-150 active:scale-95 cursor-pointer"
                  >
                    Activer
                  </button>
                </div>
                {showKeyError && (
                  <p className="text-[10px] font-bold text-rose-500 animate-pulse mt-0.5">
                    Clé invalide. Tapez <strong className="font-mono">VBI-2026</strong> pour tester l'activation.
                  </p>
                )}
              </div>
            )}

            {activated && (
              <p className="text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400 bg-emerald-50/20 dark:bg-emerald-950/10 p-3 rounded-xl border border-emerald-500/10">
                Votre logiciel <strong className="font-bold">VBI PME</strong> est pleinement enregistré. Merci pour votre évaluation de notre suite ERP moderne !
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full h-10 mt-4 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer border border-transparent"
          >
            Fermer l'onglet
          </button>
        </div>

      </div>
    </div>
  );
}
