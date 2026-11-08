import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Edit3, 
  Trash2, 
  Plus, 
  Lock, 
  Gift, 
  X, 
  Check, 
  AlertTriangle,
  UserPlus,
  Package,
  ShieldCheck,
  Info
} from 'lucide-react';
import { 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  addDoc, 
  collection, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { festiveAudio } from '../lib/festiveAudio';

export interface Participant {
  id: string;
  name: string;
  password?: string;
  giftBoxes?: string[];
  wishlist?: string;
  uid?: string;
  familyGroup?: string;
}

interface AdminParticipantManagerProps {
  roomId: string;
  roomName: string;
  participants: Participant[];
  roomStatus: 'WAITING' | 'DRAWING' | 'FINISHED';
  onSuccessMessage: (msg: string) => void;
  onErrorMessage: (msg: string) => void;
}

export const AdminParticipantManager: React.FC<AdminParticipantManagerProps> = ({
  roomId,
  roomName,
  participants,
  roomStatus,
  onSuccessMessage,
  onErrorMessage
}) => {
  // Editing state
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [editName, setEditName] = useState('');
  const [editGiftBoxes, setEditGiftBoxes] = useState<string[]>(['', '', '']);
  const [editFamilyGroup, setEditFamilyGroup] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete modal state
  const [deletingParticipant, setDeletingParticipant] = useState<Participant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add new participant state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('1234');
  const [newGiftBoxes, setNewGiftBoxes] = useState<string[]>(['', '', '']);
  const [newFamilyGroup, setNewFamilyGroup] = useState('');
  const [isSavingNew, setIsSavingNew] = useState(false);

  // Unique family groups for suggestions
  const existingFamilies = Array.from(new Set(participants.map(p => p.familyGroup).filter(Boolean))) as string[];

  // Quick inline family assignment on card
  const [quickEditingParticipantId, setQuickEditingParticipantId] = useState<string | null>(null);
  const [quickFamilyInput, setQuickFamilyInput] = useState<string>('');

  const handleQuickChangeFamily = async (p: Participant, selectedValue: string) => {
    if (selectedValue === '__NEW__') {
      setQuickEditingParticipantId(p.id);
      setQuickFamilyInput('');
      return;
    }

    try {
      const targetFamily = selectedValue.trim();
      const partRef = doc(db, `rooms/${roomId}/participants`, p.id);
      await updateDoc(partRef, { familyGroup: targetFamily });
      
      try {
        await updateDoc(doc(db, 'users', p.id), { familyGroup: targetFamily });
      } catch {}

      if (targetFamily) {
        onSuccessMessage(`Grupo familiar de "${p.name}" alterado para "${targetFamily}".`);
      } else {
        onSuccessMessage(`Grupo familiar de "${p.name}" removido.`);
      }
    } catch (err) {
      console.error("Erro ao atualizar grupo familiar:", err);
      onErrorMessage("Erro ao atualizar grupo familiar.");
    }
  };

  const handleSaveQuickCustomFamily = async (p: Participant) => {
    if (!quickFamilyInput.trim()) {
      setQuickEditingParticipantId(null);
      return;
    }
    const val = quickFamilyInput.trim();
    setQuickEditingParticipantId(null);
    setQuickFamilyInput('');
    await handleQuickChangeFamily(p, val);
  };

  // Start editing participant
  const handleOpenEdit = (p: Participant) => {
    setEditingParticipant(p);
    setEditName(p.name);
    setEditFamilyGroup(p.familyGroup || '');
    const boxes = Array.isArray(p.giftBoxes) && p.giftBoxes.length > 0 
      ? [...p.giftBoxes] 
      : (p.wishlist ? p.wishlist.split(',').map(s => s.trim()) : ['', '', '']);
    // Ensure at least 3 boxes for nice layout
    while (boxes.length < 3) boxes.push('');
    setEditGiftBoxes(boxes);
  };

  const handleSaveEdit = async () => {
    if (!editingParticipant || !editName.trim()) {
      onErrorMessage("O nome do participante é obrigatório.");
      return;
    }

    setIsSavingEdit(true);
    try {
      const formattedWishlist = editGiftBoxes.filter(b => b.trim().length > 0).join(', ');
      
      // Update participant inside room
      const partRef = doc(db, `rooms/${roomId}/participants`, editingParticipant.id);
      await updateDoc(partRef, {
        name: editName.trim(),
        giftBoxes: editGiftBoxes,
        wishlist: formattedWishlist,
        familyGroup: editFamilyGroup.trim()
      });

      // Also attempt updating user doc if exists
      try {
        const userRef = doc(db, 'users', editingParticipant.id);
        await updateDoc(userRef, {
          name: editName.trim(),
          giftBoxes: editGiftBoxes,
          familyGroup: editFamilyGroup.trim()
        });
      } catch {
        // Ignore if user doc ID doesn't directly match
      }

      onSuccessMessage(`Participante "${editName.trim()}" atualizado com sucesso!`);
      setEditingParticipant(null);
    } catch (err) {
      console.error("Erro ao atualizar participante:", err);
      onErrorMessage("Erro ao salvar as alterações do participante.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Confirm delete participant
  const handleConfirmDelete = async () => {
    if (!deletingParticipant) return;
    setIsDeleting(true);

    try {
      // 1. Delete participant doc in room
      await deleteDoc(doc(db, `rooms/${roomId}/participants`, deletingParticipant.id));
      
      // 2. Delete result doc in room if exists
      try {
        await deleteDoc(doc(db, `rooms/${roomId}/results`, deletingParticipant.id));
      } catch {
        // Result might not exist yet
      }

      onSuccessMessage(`Participante "${deletingParticipant.name}" removido da sala.`);
      setDeletingParticipant(null);
    } catch (err) {
      console.error("Erro ao remover participante:", err);
      onErrorMessage("Erro ao remover o participante da sala.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Add participant by Admin
  const handleCreateParticipant = async () => {
    if (!newName.trim()) {
      onErrorMessage("Informe o nome do participante.");
      return;
    }

    if (roomStatus === 'FINISHED') {
      onErrorMessage("Não é possível adicionar participantes em um sorteio já finalizado.");
      return;
    }

    setIsSavingNew(true);
    try {
      const formattedWishlist = newGiftBoxes.filter(b => b.trim().length > 0).join(', ');

      // Create new user in users collection
      const userDocRef = await addDoc(collection(db, 'users'), {
        name: newName.trim(),
        password: newPassword.trim() || '1234',
        giftBoxes: newGiftBoxes,
        familyGroup: newFamilyGroup.trim(),
        createdAt: serverTimestamp()
      });

      const newUserId = userDocRef.id;

      // Add to room participants
      await setDoc(doc(db, `rooms/${roomId}/participants`, newUserId), {
        name: newName.trim(),
        password: newPassword.trim() || '1234',
        giftBoxes: newGiftBoxes,
        wishlist: formattedWishlist,
        familyGroup: newFamilyGroup.trim(),
        createdAt: serverTimestamp()
      });

      festiveAudio.playRegistrationSuccess();
      onSuccessMessage(`Novo participante "${newName.trim()}" adicionado à sala!`);
      setIsAddingNew(false);
      setNewName('');
      setNewPassword('1234');
      setNewGiftBoxes(['', '', '']);
      setNewFamilyGroup('');
    } catch (err) {
      console.error("Erro ao adicionar participante:", err);
      onErrorMessage("Erro ao adicionar novo participante.");
    } finally {
      setIsSavingNew(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-slate-700 space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-red-950 text-red-400 font-bold text-xs uppercase tracking-wider border border-red-900/50">
              Painel do Administrador
            </span>
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-red-500" /> {participants.length} Participantes
            </span>
          </div>
          <h3 className="text-2xl font-black text-white mt-1">
            Gerenciar Participantes
          </h3>
          <p className="text-xs text-slate-400">
            Edite dados, altere caixas de presentes, atribua restrição de família diretamente nos cards ou remova participantes.
          </p>
        </div>

        <button
          onClick={() => setIsAddingNew(true)}
          disabled={roomStatus === 'FINISHED'}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Novo Participante</span>
        </button>
      </div>

      {/* STRICT PRIVACY BANNER */}
      <div className="p-4 bg-slate-900 border-2 border-slate-700 rounded-2xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-950 text-red-400 flex items-center justify-center shrink-0 shadow-md">
          <Lock className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-0.5">
          <strong className="text-white font-black flex items-center gap-1.5 uppercase tracking-wide">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Sigilo Absoluto dos Sorteados Garantido
          </strong>
          <p className="text-slate-300 font-medium">
            Você pode editar dados e gerenciar os integrantes da sala, mas <span className="font-bold underline text-red-400">jamais poderá ver quem tirou quem</span>. Os resultados permanecem totalmente secretos e visíveis exclusivamente para cada sorteado ao consultar seu amigo secreto.
          </p>
        </div>
      </div>

      {/* Participants List Table / Cards */}
      <div className="space-y-3">
        {participants.map((p, index) => {
          const filledBoxes = p.giftBoxes?.filter(g => g.trim().length > 0) || [];

          return (
             <motion.div
              key={`admin-part-${p.id || index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-slate-800 rounded-2xl border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-red-600 transition-all group"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-900 text-red-200 text-xs font-black flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <h4 className="font-black text-white text-base truncate">
                    {p.name}
                  </h4>

                  {/* INLINE QUICK FAMILY GROUP SELECTOR RIGHT ON CARD */}
                  {quickEditingParticipantId === p.id ? (
                    <div className="inline-flex items-center gap-1.5 bg-slate-900 border-2 border-purple-600 rounded-xl px-2 py-1 shadow-lg">
                      <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <input
                        type="text"
                        autoFocus
                        value={quickFamilyInput}
                        onChange={(e) => setQuickFamilyInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveQuickCustomFamily(p);
                          if (e.key === 'Escape') setQuickEditingParticipantId(null);
                        }}
                        placeholder="Nome da família..."
                        className="bg-transparent text-white font-bold text-xs outline-none w-28 sm:w-36"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveQuickCustomFamily(p)}
                        className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer"
                        title="Salvar Família"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickEditingParticipantId(null)}
                        className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold border transition-all ${
                      p.familyGroup 
                        ? 'bg-purple-950/90 border-purple-700 text-purple-300 shadow-xs hover:border-purple-500' 
                        : 'bg-slate-900/90 border-slate-700 text-slate-400 hover:border-purple-600 hover:text-purple-300'
                    }`}>
                      <Users className={`w-3.5 h-3.5 ${p.familyGroup ? 'text-purple-400' : 'text-slate-500'}`} />
                      <select
                        value={p.familyGroup || ''}
                        onChange={(e) => handleQuickChangeFamily(p, e.target.value)}
                        className="bg-transparent text-purple-200 font-bold text-xs outline-none cursor-pointer pr-1"
                        title="Alterar Grupo Familiar diretamente no card"
                      >
                        <option value="" className="bg-slate-900 text-slate-300">
                          {p.familyGroup ? '❌ Remover Família' : '👥 Sem Família (Definir...)'}
                        </option>
                        {existingFamilies.map(fam => (
                          <option key={`fam-opt-${fam}`} value={fam} className="bg-slate-900 text-purple-300">
                            Família: {fam}
                          </option>
                        ))}
                        <option value="__NEW__" className="bg-slate-900 text-amber-400 font-bold">
                          ➕ Criar Novo Grupo...
                        </option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Gift Boxes Preview */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {filledBoxes.length > 0 ? (
                    filledBoxes.map((g, gi) => (
                      <span
                        key={`admin-box-tag-${gi}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-slate-200 text-xs font-medium border border-slate-700 shadow-2xs"
                      >
                        <Package className="w-3 h-3 text-red-500" />
                        <span className="font-bold text-[11px] text-red-400">#{gi + 1}:</span>
                        <span className="max-w-[150px] truncate">{g}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-amber-400 italic flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      Nenhum presente preenchido
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                <button
                  onClick={() => handleOpenEdit(p)}
                  className="px-3 py-2 bg-slate-200/70 hover:bg-red-600 hover:text-white dark:bg-slate-800 dark:hover:bg-red-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                  title="Editar Nome e Lista de Presentes"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>

                <button
                  onClick={() => setDeletingParticipant(p)}
                  className="px-3 py-2 bg-red-50 hover:bg-red-600 hover:text-white dark:bg-red-950/40 dark:hover:bg-red-600 text-red-600 dark:text-red-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-red-200 dark:border-red-900/40"
                  title="Excluir Participante da Sala"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              </div>
            </motion.div>
          );
        })}

        {participants.length === 0 && (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <Users className="w-10 h-10 mx-auto opacity-40 text-red-600" />
            <p className="text-sm font-semibold">Nenhum participante nesta sala ainda.</p>
            <p className="text-xs">Clique em "Cadastrar Novo Participante" para adicionar manualmente.</p>
          </div>
        )}
      </div>

      {/* ================= MODAL: EDIT PARTICIPANT ================= */}
      <AnimatePresence>
        {editingParticipant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-700 space-y-6 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 rounded-xl bg-red-950 text-red-400">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">
                      Editar Participante
                    </h3>
                    <p className="text-xs text-slate-400">
                      Modifique o nome ou os presentes desejados
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setEditingParticipant(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Nome do Participante
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-700 bg-slate-900 text-white font-bold text-sm focus:border-red-600 outline-none"
                    placeholder="Nome completo"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-purple-400" />
                      Grupo Familiar / Restrição de Sorteio
                    </span>
                    <span className="text-[10px] text-purple-400 font-normal">Evita sorteio interno</span>
                  </label>
                  <input
                    type="text"
                    value={editFamilyGroup}
                    onChange={(e) => setEditFamilyGroup(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-700 bg-slate-900 text-white font-bold text-sm focus:border-purple-500 outline-none"
                    placeholder="Ex: Família Silva ou Grupo A"
                  />
                  {existingFamilies.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                      <span className="text-[10px] text-slate-400 font-semibold">Grupos na sala:</span>
                      {existingFamilies.map(f => (
                        <button
                          key={`edit-fam-tag-${f}`}
                          type="button"
                          onClick={() => setEditFamilyGroup(f)}
                          className="px-2 py-0.5 rounded-md bg-purple-950/60 hover:bg-purple-900 text-purple-300 border border-purple-800 text-[10px] font-bold transition-colors"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    Integrantes marcados com o mesmo Grupo Familiar NÃO serão sorteados entre si.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-red-600" />
                      Caixas de Presentes ({editGiftBoxes.length})
                    </label>

                    <button
                      type="button"
                      onClick={() => setEditGiftBoxes([...editGiftBoxes, ''])}
                      className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Caixa
                    </button>
                  </div>

                  {editGiftBoxes.map((box, idx) => (
                    <div key={`edit-box-${idx}`} className="flex items-center gap-2">
                      <span className="w-7 text-xs font-black text-red-600 shrink-0">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={box}
                        onChange={(e) => {
                          const updated = [...editGiftBoxes];
                          updated[idx] = e.target.value;
                          setEditGiftBoxes(updated);
                        }}
                        placeholder={`Presente desejado #${idx + 1}`}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-950 dark:text-white font-semibold text-xs focus:border-red-600 outline-none"
                      />
                      {editGiftBoxes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEditGiftBoxes(editGiftBoxes.filter((_, i) => i !== idx))}
                          className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingParticipant(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingEdit ? "Salvando..." : "Salvar Alterações"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: ADD NEW PARTICIPANT BY ADMIN ================= */}
      <AnimatePresence>
        {isAddingNew && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-700 space-y-6 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 rounded-xl bg-red-950 text-red-400">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">
                      Cadastrar Participante
                    </h3>
                    <p className="text-xs text-slate-400">
                      Adicione um novo integrante diretamente à sala
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAddingNew(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Nome do Participante *
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: João Pedro Santos"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-950 dark:text-white font-bold text-sm focus:border-red-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Senha de Acesso do Participante
                  </label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Senha para ele logar (ex: 1234)"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-700 bg-slate-900 text-white font-bold text-sm focus:border-red-600 outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    O participante utilizará essa senha para acessar seu perfil e conferir o sorteio.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-purple-400" />
                      Grupo Familiar / Restrição de Sorteio
                    </span>
                    <span className="text-[10px] text-purple-400 font-normal">Evita sorteio interno</span>
                  </label>
                  <input
                    type="text"
                    value={newFamilyGroup}
                    onChange={(e) => setNewFamilyGroup(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-700 bg-slate-900 text-white font-bold text-sm focus:border-purple-500 outline-none"
                    placeholder="Ex: Família Silva, Núcleo A, etc."
                  />
                  {existingFamilies.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                      <span className="text-[10px] text-slate-400 font-semibold">Grupos existentes:</span>
                      {existingFamilies.map(f => (
                        <button
                          key={`new-fam-tag-${f}`}
                          type="button"
                          onClick={() => setNewFamilyGroup(f)}
                          className="px-2 py-0.5 rounded-md bg-purple-950/60 hover:bg-purple-900 text-purple-300 border border-purple-800 text-[10px] font-bold transition-colors"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    Pessoas com o mesmo grupo não serão sorteadas entre si no amigo secreto.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-red-600" />
                      Caixas de Presentes Iniciais
                    </label>

                    <button
                      type="button"
                      onClick={() => setNewGiftBoxes([...newGiftBoxes, ''])}
                      className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Caixa
                    </button>
                  </div>

                  {newGiftBoxes.map((box, idx) => (
                    <div key={`new-box-${idx}`} className="flex items-center gap-2">
                      <span className="w-7 text-xs font-black text-red-600 shrink-0">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={box}
                        onChange={(e) => {
                          const updated = [...newGiftBoxes];
                          updated[idx] = e.target.value;
                          setNewGiftBoxes(updated);
                        }}
                        placeholder={`Sugestão de presente #${idx + 1}`}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-950 dark:text-white font-semibold text-xs focus:border-red-600 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateParticipant}
                  disabled={isSavingNew}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSavingNew ? "Cadastrando..." : "Confirmar Cadastro"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: CONFIRM DELETE PARTICIPANT ================= */}
      <AnimatePresence>
        {deletingParticipant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-red-900/40 text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-red-950 text-red-400 flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-white">
                  Remover Participante?
                </h3>
                <p className="text-sm text-slate-300 mt-2">
                  Tem certeza que deseja remover <strong className="text-red-500">{deletingParticipant.name}</strong> da sala <strong className="text-white">{roomName}</strong>?
                </p>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Esta ação excluirá a participação de {deletingParticipant.name} nesta sala.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingParticipant(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-900/40 transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? "Removendo..." : "Confirmar Remoção"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
