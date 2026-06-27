import React, { useState } from 'react';
import { User, TransactionLog } from '../types';

interface UserManagementWindowProps {
  currentUser: User | null;
  users: User[];
  onAddUser: (u: User) => void;
  onUpdateUser: (id: string, u: User) => void;
  onDeleteUser: (id: string) => void;
  transactionLogs: TransactionLog[];
  onAddLog: (action: string) => void;
  onClose: () => void;
}

export const PERMISSIONS_LIST = [
  { code: '1', label: '1 Saisie achats' },
  { code: '2', label: '2 Saisie ventes' },
  { code: '3', label: '3 Produits' },
  { code: '4', label: '4 Fournisseurs' },
  { code: '5', label: '5 Clients' },
  { code: '6', label: '6 Situations fournisseurs' },
  { code: '7', label: '7 Situations clients' },
  { code: '8', label: '8 Consultation bons d\'achats' },
  { code: '9', label: '9 Consultation bons de ventes' },
  { code: '10', label: '10 Statistiques' },
  { code: '11', label: '11 Inventaire' },
  { code: '12', label: '12 Etat de la journée' },
  { code: '13', label: '13 Configuration' },
  { code: '14', label: '14 Gestion des utilisateurs' },
  { code: '15', label: '15 Gestion des charges' },
  { code: '16', label: '16 Facturations' },
  { code: '17', label: '17 <Réservé>' },
  { code: '18', label: '18 Sauvegardes' },
  { code: '19', label: '19 Famille de produits' },
  { code: '20', label: '20 Mouvements des produits' },
  { code: '21', label: '21 Saisie ventes - Changer le prix' },
  { code: '22', label: '22 Saisie ventes - Remise' },
  { code: '23', label: '23 Coffres' },
  { code: '24', label: '24 Afficher liste des produits étendue' },
  { code: '25', label: '25 Module de fabrication' },
  { code: '26', label: '26 Module de numéros de séries' },
  { code: '27', label: '27 Autoriser la modification du bon d\'achat' },
  { code: '28', label: '28 Autoriser la modification du bon de vente' },
  { code: '29', label: '29 <Réservé>' },
  { code: '30', label: '30 Gestion des pertes' },
  { code: '31', label: '31 Consulter prix achat dans la vente' },
  { code: '32', label: '32 Consulter bénéfice dans la vente' },
  { code: '33', label: '33 Synthèse' },
  { code: '34', label: '34 Autres états d\'achats' },
  { code: '35', label: '35 Autres états de ventes' },
  { code: '36', label: '36 Alarmes' },
  { code: '37', label: '37 Téléchargements' },
  { code: '38', label: '38 Voir Prix de revient pour module Fabrication' }
];

export const UserManagementWindow: React.FC<UserManagementWindowProps> = ({
  currentUser,
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  transactionLogs,
  onAddLog,
  onClose
}) => {
  const [selectedUserIndex, setSelectedUserIndex] = useState<number>(0);
  const [searchLogQuery, setSearchLogQuery] = useState<string>('');
  
  // Custom dialogs states
  const [customAlert, setCustomAlert] = useState<{ title: string; message: string } | null>(null);
  const [customConfirm, setCustomConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const showAlert = (title: string, message: string) => {
    setCustomAlert({ title, message });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setCustomConfirm({ title, message, onConfirm });
  };

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'insert' | 'edit'>('insert');
  
  // Edit Form Fields
  const [username, setUsername] = useState('');
  const [userType, setUserType] = useState<'1' | '9'>('9');
  const [password, setPassword] = useState('');
  const [checkedPermissions, setCheckedPermissions] = useState<string[]>([]);

  const selectedUser = users[selectedUserIndex] || users[0];

  // Navigation functions
  const handleGoFirst = () => setSelectedUserIndex(0);
  const handleGoPrev = () => setSelectedUserIndex(prev => Math.max(0, prev - 1));
  const handleGoNext = () => setSelectedUserIndex(prev => Math.min(users.length - 1, prev + 1));
  const handleGoLast = () => setSelectedUserIndex(users.length - 1);

  const openInsertModal = () => {
    setModalMode('insert');
    setUsername('');
    setUserType('9');
    setPassword('');
    // Default: typical default custom permissions (some standard ones like sales/clients)
    setCheckedPermissions(['2', '3', '5', '9']); 
    setIsModalOpen(true);
  };

  const openEditModal = () => {
    if (!selectedUser) return;
    if (selectedUser.username.toLowerCase() === 'admin') {
      showAlert("Sécurité Système", "L'administrateur principal 'admin' ne peut pas être modifié pour des raisons de sécurité.");
      return;
    }
    setModalMode('edit');
    setUsername(selectedUser.username);
    setUserType(selectedUser.type);
    setPassword(selectedUser.password || '');
    setCheckedPermissions(selectedUser.permissions || []);
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    if (!selectedUser) return;
    if (!currentUser || currentUser.username.toLowerCase() !== 'admin') {
      showAlert("Accès Refusé", "Autorisation insuffisante ! Seul l'administrateur principal 'admin' est autorisé à supprimer des utilisateurs.");
      return;
    }
    if (selectedUser.username.toLowerCase() === 'admin') {
      showAlert("Sécurité Système", "L'administrateur principal 'admin' ne peut pas être supprimé.");
      return;
    }
    showConfirm(
      "Confirmation de Suppression",
      `Voulez-vous vraiment supprimer définitivement l'utilisateur '${selectedUser.username}' ?`,
      () => {
        onDeleteUser(selectedUser.id);
        onAddLog(`Suppression utilisateur : ${selectedUser.username}`);
        setSelectedUserIndex(0);
      }
    );
  };

  // Checkbox helpers
  const handleTogglePermission = (code: string) => {
    setCheckedPermissions(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleCheckAll = () => {
    setCheckedPermissions(PERMISSIONS_LIST.map(p => p.code));
  };

  const handleUncheckAll = () => {
    setCheckedPermissions([]);
  };

  const handleInvertCheck = () => {
    setCheckedPermissions(prev => 
      PERMISSIONS_LIST.filter(p => !prev.includes(p.code)).map(p => p.code)
    );
  };

  const handleSaveUser = () => {
    if (!username.trim()) {
      showAlert("Saisie Incorrecte", "Veuillez saisir un nom d'utilisateur.");
      return;
    }
    if (!password.trim()) {
      showAlert("Saisie Incorrecte", "Veuillez saisir un mot de passe.");
      return;
    }

    if (modalMode === 'insert') {
      // Check duplicate
      const exists = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
      if (exists) {
        showAlert("Erreur de Saisie", "Ce nom d'utilisateur existe déjà !");
        return;
      }

      const newUser: User = {
        id: 'user_' + Date.now(),
        username: username.trim().toUpperCase(),
        password: password.trim(),
        type: userType,
        permissions: checkedPermissions
      };

      onAddUser(newUser);
      onAddLog(`Création utilisateur : ${newUser.username}`);
      setSelectedUserIndex(users.length); // will match new user
    } else {
      // Edit mode
      const updated: User = {
        id: selectedUser.id,
        username: username.trim().toUpperCase(),
        password: password.trim(),
        type: userType,
        permissions: checkedPermissions
      };

      onUpdateUser(selectedUser.id, updated);
      onAddLog(`Mise à jour utilisateur : ${updated.username}`);
    }

    setIsModalOpen(false);
  };

  const handleExportToExcel = () => {
    showAlert("Exportation Réussie", "Exportation du Journal de Transactions vers Microsoft Excel réussie (Fichier: journal_secu.xlsx) !");
  };

  // Filter logs based on search query
  const filteredLogs = transactionLogs.filter(log => 
    log.user.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
    log.action.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
    log.date.includes(searchLogQuery) ||
    log.time.includes(searchLogQuery)
  );

  return (
    <div id="user-management-root" className="flex flex-col h-full bg-[#f0ede6] text-black text-xs select-none relative">
      
      {/* Upper Main Section */}
      <div className="flex-1 p-3 flex flex-col md:flex-row gap-4 overflow-hidden">
        
        {/* Left Side: Users Grid & CRUD Controls */}
        <div className="flex-[3] flex flex-col gap-2 overflow-hidden">
          
          <div className="flex items-center justify-between">
            <h2 className="text-red-700 font-extrabold text-[15px] uppercase tracking-wide flex items-center gap-1.5 font-sans">
              <span>👤</span> GESTION DES UTILISATEURS
            </h2>
          </div>

          {/* Retro Toolbar Ribbon */}
          <div className="flex items-center gap-1 bg-[#d4d0c8] p-1 border-t border-l border-white border-r-[#808080] border-b-[#808080] rounded shadow-xs shrink-0">
            {/* Pager Buttons */}
            <button
              onClick={handleGoFirst}
              disabled={selectedUserIndex <= 0}
              className="px-2 py-1 bg-[#d4d0c8] font-bold text-[10px] uppercase border border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white disabled:opacity-40"
            >
              ⏮ Début
            </button>
            <button
              onClick={handleGoPrev}
              disabled={selectedUserIndex <= 0}
              className="px-2 py-1 bg-[#d4d0c8] font-bold text-[10px] uppercase border border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white disabled:opacity-40"
            >
              ◀ Préc.
            </button>
            <button
              onClick={handleGoNext}
              disabled={selectedUserIndex >= users.length - 1}
              className="px-2 py-1 bg-[#d4d0c8] font-bold text-[10px] uppercase border border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white disabled:opacity-40"
            >
              Suivant ▶
            </button>
            <button
              onClick={handleGoLast}
              disabled={selectedUserIndex >= users.length - 1}
              className="px-2 py-1 bg-[#d4d0c8] font-bold text-[10px] uppercase border border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white disabled:opacity-40"
            >
              Fin ⏭
            </button>

            <div className="h-4 w-[1px] bg-slate-400 mx-1.5" />

            {/* Insert, Modify, Delete */}
            <button
              onClick={openInsertModal}
              className="px-2 py-1 bg-[#d4d0c8] font-bold text-[10px] uppercase border border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white text-blue-900 flex items-center gap-1"
            >
              <span className="text-blue-600 font-black">+</span> Insérer utilisateur
            </button>
            <button
              onClick={openEditModal}
              className="px-2 py-1 bg-[#d4d0c8] font-bold text-[10px] uppercase border border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white text-slate-800 flex items-center gap-1"
            >
              <span className="text-yellow-600 font-black">✏️</span> Modifier utilisateur
            </button>
            <button
              onClick={handleDelete}
              className="px-2 py-1 bg-[#d4d0c8] font-bold text-[10px] uppercase border border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white text-red-800 flex items-center gap-1"
            >
              <span className="text-red-600 font-black">-</span> Supprimer utilisateur
            </button>
          </div>

          {/* Grid list container */}
          <div className="flex-1 bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white overflow-y-auto min-h-[140px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#e0e0d8] text-slate-700 font-bold border-b border-[#a0a090] sticky top-0 z-10">
                  <th className="px-4 py-1.5 border-r border-[#a0a090]">Utilisateur</th>
                  <th className="px-4 py-1.5">Type</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedUserIndex(idx)}
                    className={`cursor-default ${
                      idx === selectedUserIndex 
                        ? 'bg-[#000080] text-white font-bold' 
                        : 'hover:bg-slate-100 border-b border-[#f0eee0]'
                    }`}
                  >
                    <td className="px-4 py-1.5 font-mono border-r border-[#a0a090] tracking-wider uppercase">{user.username}</td>
                    <td className="px-4 py-1.5 font-bold font-mono">{user.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* Right Side: Informative illustration panel with lock */}
        <div className="flex-[2] bg-[#e4dfd5] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] p-4.5 rounded-xl flex flex-col justify-start items-center text-center overflow-y-auto shrink-0 w-full md:w-80">
          
          {/* Padlock visual graphics */}
          <div className="relative mb-3.5 flex flex-col items-center">
            <div className="w-20 h-20 text-[#a0a090] flex items-center justify-center">
              <svg className="w-16 h-16 drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="5" y="11" width="14" height="11" rx="2" strokeWidth="2" />
                <path d="M12 2a5 5 0 0 0-5 5v4h10V7a5 5 0 0 0-5-5z" strokeWidth="2" />
              </svg>
            </div>
            {/* Faces decoration representing users */}
            <div className="flex gap-1.5 mt-1">
              <span className="text-xl">👨‍💼</span>
              <span className="text-xl">🧑‍🔧</span>
            </div>
          </div>

          <div className="w-full text-left space-y-3 font-sans leading-relaxed text-slate-800">
            <div>
              <h4 className="font-extrabold text-red-800 text-[12.5px] uppercase">Utilisateurs de type "1"</h4>
              <ul className="list-disc list-inside text-[11px] text-slate-750 pl-1">
                <li>Administrateur Principal</li>
                <li>Accès intégral aux comptes utilisateurs</li>
                <li>Mise à jour et modification des données</li>
                <li>Consultation rapports et statistiques</li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold text-blue-900 text-[12.5px] uppercase">Utilisateurs de type "9"</h4>
              <ul className="list-disc list-inside text-[11px] text-slate-750 pl-1">
                <li>Utilisateur personnalisé de terrain</li>
                <li>Accès restreint par module et option</li>
              </ul>
            </div>

            <div className="border-t border-dashed border-red-400/40 pt-2.5">
              <h4 className="font-black text-rose-700 text-[12px] flex items-center gap-1">⚠️ IMPORTANT !!!</h4>
              <p className="text-[10px] text-slate-650 mt-1 italic font-semibold">
                Pour une sécurité optimale du système de facturation, assurez-vous de n'enregistrer qu'un seul administrateur principal.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Bottom Half: JOURNAL DE TRANSACTIONS */}
      <div className="h-[210px] p-3 border-t border-slate-350 bg-[#e4dfd5] flex flex-col overflow-hidden shrink-0">
        
        <div className="flex items-center justify-between mb-1.5 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-red-700 font-extrabold text-[13px] uppercase tracking-wide">
              📊 JOURNAL DE TRANSACTIONS (SÉCURITÉ)
            </h3>
            <button
              onClick={handleExportToExcel}
              className="px-2.5 py-1 bg-emerald-50 border border-emerald-300 rounded text-[10px] font-bold hover:bg-emerald-100 flex items-center gap-1 text-emerald-900 cursor-pointer"
            >
              🟢 Exporter vers Excel
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[11.5px] text-slate-700">Recherche:</span>
            <input
              type="text"
              value={searchLogQuery}
              onChange={(e) => setSearchLogQuery(e.target.value)}
              placeholder="Nom, date ou action..."
              className="w-48 h-6 px-1.5 text-[11.5px] font-mono bg-white text-black border border-slate-400 rounded focus:outline-none"
            />
          </div>
        </div>

        {/* Logs Table Container */}
        <div className="flex-1 bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#e0e0d8] text-slate-700 font-bold border-b border-[#a0a090] sticky top-0 z-10 text-[10.5px]">
                <th className="px-3 py-1 border-r border-[#a0a090] w-24">Utilisateur</th>
                <th className="px-3 py-1 border-r border-[#a0a090] w-24">Date</th>
                <th className="px-3 py-1 border-r border-[#a0a090] w-20">Heure</th>
                <th className="px-3 py-1">Action Journalisée</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.slice().reverse().map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 border-b border-[#f2f0e0] font-mono text-[11px] text-slate-800">
                  <td className="px-3 py-1 border-r border-[#f2f0e0] font-extrabold text-blue-900 uppercase">{log.user}</td>
                  <td className="px-3 py-1 border-r border-[#f2f0e0] text-slate-600">{log.date}</td>
                  <td className="px-3 py-1 border-r border-[#f2f0e0] text-slate-600">{log.time}</td>
                  <td className="px-3 py-1 font-sans text-slate-900">{log.action}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-500 italic">
                    Aucune transaction enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Footer Area with Quitter Button */}
      <div className="p-2 bg-[#d4d0c8] border-t border-white flex justify-end shrink-0">
        <button
          onClick={onClose}
          className="px-6 h-7 bg-[#d4d0c8] text-black font-extrabold text-[12px] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white hover:bg-[#eae6df] flex items-center gap-1.5 cursor-pointer"
        >
          🚪 Quitter
        </button>
      </div>

      {/* --- M.A.J UTILISATEUR DIALOG MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-[10000]">
          <div className="w-[820px] max-h-[92vh] bg-[#d4d0c8] text-black border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] shadow-2xl flex flex-col overflow-hidden font-sans">
            
            {/* Title Bar */}
            <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-1 flex items-center justify-between text-white font-bold text-[13px] tracking-wide shrink-0">
              <span className="flex items-center gap-1.5">
                <span>📝</span> M.A.J UTILISATEUR
              </span>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-[16px] h-[14px] bg-[#d4d0c8] text-black font-extrabold flex items-center justify-center text-[10px] border border-t-white border-l-white border-r-[#404040] border-b-[#404040] focus:outline-none"
              >
                ✕
              </button>
            </div>

            {/* Form & Fields */}
            <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1">
              
              {/* Header text */}
              <h3 className="text-red-800 font-extrabold text-[14px] tracking-wide border-b border-slate-350 pb-1 uppercase">
                M.A.J UTILISATEUR
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Nom */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11.5px] font-bold text-slate-700">Nom de l'utilisateur</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={modalMode === 'edit'}
                    className="h-6 px-1.5 text-[12.5px] font-mono bg-white text-black border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 uppercase font-bold"
                  />
                </div>

                {/* Type */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11.5px] font-bold text-slate-700">Type de l'utilisateur</label>
                  <div className="relative">
                    <select
                      value={userType}
                      onChange={(e) => {
                        const val = e.target.value as '1' | '9';
                        setUserType(val);
                        if (val === '1') {
                          // Administrators automatically get all permissions
                          setCheckedPermissions(PERMISSIONS_LIST.map(p => p.code));
                        }
                      }}
                      className="w-full h-6 px-1.5 text-[12px] bg-white text-black border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] focus:outline-none appearance-none cursor-default"
                    >
                      <option value="1">1-Administrateur</option>
                      <option value="9">9-Personnalisé</option>
                    </select>
                    <div className="absolute right-0.5 top-0.5 bottom-0.5 w-5 bg-[#d4d0c8] border border-t-white border-l-white border-r-[#404040] border-b-[#404040] flex items-center justify-center text-[9px] pointer-events-none">
                      ▼
                    </div>
                  </div>
                </div>

                {/* Mot de passe */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11.5px] font-bold text-slate-700">Mot de passe</label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-6 px-1.5 text-[12.5px] font-mono bg-white text-black border-2 border-b-white border-r-white border-t-[#808080] border-l-[#808080] focus:outline-none"
                  />
                </div>
              </div>

              {/* Accès autorisés panel header */}
              <div className="mt-2.5 flex items-center justify-between border-b border-slate-350 pb-1 shrink-0">
                <span className="font-extrabold text-[12px] text-slate-800 uppercase">
                  Accès autorisés pour cet utilisateur
                </span>

                {/* Utility action selection buttons */}
                <div className="flex gap-1.5 text-[10px]">
                  <button
                    onClick={handleCheckAll}
                    disabled={userType === '1'}
                    className="px-2 py-0.5 bg-[#d4d0c8] border border-t-white border-l-white border-r-[#404040] border-b-[#404040] font-bold text-[10px] text-green-900 active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white disabled:opacity-40"
                  >
                    🟢 Cocher tous
                  </button>
                  <button
                    onClick={handleUncheckAll}
                    disabled={userType === '1'}
                    className="px-2 py-0.5 bg-[#d4d0c8] border border-t-white border-l-white border-r-[#404040] border-b-[#404040] font-bold text-[10px] text-slate-800 active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white disabled:opacity-40"
                  >
                    ⚪ Décocher tous
                  </button>
                  <button
                    onClick={handleInvertCheck}
                    disabled={userType === '1'}
                    className="px-2 py-0.5 bg-[#d4d0c8] border border-t-white border-l-white border-r-[#404040] border-b-[#404040] font-bold text-[10px] text-amber-900 active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white disabled:opacity-40"
                  >
                    🟠 Inverser
                  </button>
                </div>
              </div>

              {/* Permissions Grid Panel */}
              <div className="flex-1 min-h-[220px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white p-2 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1.5 text-[11px]">
                  {PERMISSIONS_LIST.map((perm) => {
                    const isChecked = checkedPermissions.includes(perm.code);
                    const isUserAdmin = userType === '1';

                    return (
                      <label 
                        key={perm.code} 
                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer border ${
                          isChecked 
                            ? 'bg-blue-50/70 border-blue-200 text-blue-950 font-semibold' 
                            : 'border-transparent hover:bg-slate-50 text-slate-800'
                        } ${isUserAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isUserAdmin}
                          onChange={() => handleTogglePermission(perm.code)}
                          className="w-3.5 h-3.5 border-slate-350 focus:ring-0 cursor-pointer"
                        />
                        <span className="truncate">{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Bottom Panel Actions */}
            <div 
              className="p-3 bg-[#c0bab0] border-t-2 border-t-[#f0f0f0] flex items-center justify-center gap-4.5 shrink-0"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 2px, transparent 2px, transparent 4px)',
              }}
            >
              <button
                onClick={handleSaveUser}
                className="w-32 h-8 bg-[#d4d0c8] text-black font-extrabold text-[12px] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white hover:bg-[#eae6df] flex items-center justify-center gap-1 cursor-pointer"
              >
                ✔️ OK
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-32 h-8 bg-[#d4d0c8] text-black font-extrabold text-[12px] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white hover:bg-[#eae6df] flex items-center justify-center gap-1 cursor-pointer"
              >
                ❌ ANNULER
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- CUSTOM ALERT DIALOG MODAL --- */}
      {customAlert && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[11000] select-none animate-in fade-in zoom-in duration-75">
          <div className="bg-[#d4d0c8] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] p-1.5 w-[380px] shadow-2xl">
            <div className="bg-[#000080] px-2 py-1 flex items-center justify-between text-white font-sans font-bold text-[12px]">
              <span className="flex items-center gap-1.5">
                ⚠️ {customAlert.title}
              </span>
              <button 
                onClick={() => setCustomAlert(null)}
                className="w-4.5 h-4.5 bg-[#d4d0c8] border border-t-white border-l-white border-r-[#404040] border-b-[#404040] text-black font-extrabold flex items-center justify-center text-[10px] hover:bg-slate-200 active:bg-slate-300 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex gap-3 bg-[#d4d0c8] text-black font-sans text-[12px] items-start">
              <span className="text-2xl select-none">ℹ️</span>
              <div className="flex-1 leading-relaxed whitespace-pre-line">
                {customAlert.message}
              </div>
            </div>
            <div className="bg-[#d4d0c8] py-2 border-t border-slate-300 flex justify-end px-3">
              <button
                onClick={() => setCustomAlert(null)}
                className="px-6 py-1 bg-[#d4d0c8] text-black font-bold font-sans text-[12px] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white hover:bg-slate-100 cursor-pointer shadow-sm"
              >
                D'accord (OK)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOM CONFIRM DIALOG MODAL --- */}
      {customConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[11000] select-none animate-in fade-in zoom-in duration-75">
          <div className="bg-[#d4d0c8] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] p-1.5 w-[380px] shadow-2xl">
            <div className="bg-[#000080] px-2 py-1 flex items-center justify-between text-white font-sans font-bold text-[12px]">
              <span className="flex items-center gap-1.5">
                ❓ {customConfirm.title}
              </span>
              <button 
                onClick={() => setCustomConfirm(null)}
                className="w-4.5 h-4.5 bg-[#d4d0c8] border border-t-white border-l-white border-r-[#404040] border-b-[#404040] text-black font-extrabold flex items-center justify-center text-[10px] hover:bg-slate-200 active:bg-slate-300 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex gap-3 bg-[#d4d0c8] text-black font-sans text-[12px] items-start">
              <span className="text-2xl select-none">❓</span>
              <div className="flex-1 leading-relaxed whitespace-pre-line">
                {customConfirm.message}
              </div>
            </div>
            <div className="bg-[#d4d0c8] py-2 border-t border-slate-300 flex justify-end px-3 gap-2">
              <button
                onClick={() => {
                  customConfirm.onConfirm();
                  setCustomConfirm(null);
                }}
                className="px-6 py-1 bg-[#d4d0c8] text-black font-bold font-sans text-[12px] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white hover:bg-slate-100 cursor-pointer shadow-sm"
              >
                Oui (OK)
              </button>
              <button
                onClick={() => setCustomConfirm(null)}
                className="px-4 py-1 bg-[#d4d0c8] text-black font-sans text-[12px] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white hover:bg-slate-100 cursor-pointer shadow-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
