import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  Eye, 
  EyeOff, 
  Package, 
  Trash2, 
  Check, 
  X, 
  Copy, 
  Sparkles, 
  Filter, 
  AlertTriangle,
  Gift,
  KeyRound,
  Calendar,
  UserPlus,
  DoorOpen,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { doc, updateDoc, deleteDoc, setDoc, serverTimestamp, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { festiveAudio } from '../lib/festiveAudio';

export interface UserProfileItem {
  id: string;
  name: string;
  password?: string;
  giftBoxes?: string[];
  familyGroup?: string;
  createdAt?: any;
}

export interface RoomItem {
  id: string;
  name: string;
  status: 'WAITING' | 'DRAWING' | 'FINISHED';
}

export interface UserRoomInfo {
  room: RoomItem;
  participantId: string;
}

interface AdminUsersDirectoryProps {
  users: UserProfileItem[];
  rooms?: RoomItem[];
  onSuccessMessage: (msg: string) => void;
  onErrorMessage: (msg: string) => void;
  compact?: boolean;
  onSelectRoom?: (roomId: string) => void;
}

export const AdminUsersDirectory: React.FC<AdminUsersDirectoryProps> = ({
  users,
  rooms = [],
  onSuccessMessage,
  onErrorMessage,
  compact = false,
  onSelectRoom
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamilyFilter, setSelectedFamilyFilter] = useState<string>('ALL');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('ALL');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Real-time map of room participants: roomId -> { id: string; name: string }[]
  const [roomParticipantsMap, setRoomParticipantsMap] = useState<Record<string, { id: string; name: string }[]>>({});

  // Quick family edit state
  const [quickEditingUserId, setQuickEditingUserId] = useState<string | null>(null);
  const [quickFamilyInput, setQuickFamilyInput] = useState<string>('');
  
  // User deletion state
  const [userToDelete, setUserToDelete] = useState<UserProfileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add user to room state
  const [userToAddToRoom, setUserToAddToRoom] = useState<UserProfileItem | null>(null);
  const [addingToRoomId, setAddingToRoomId] = useState<string | null>(null);

  // Remove participant from room confirmation state
  const [removalTarget, setRemovalTarget] = useState<{
    user: UserProfileItem;
    room: RoomItem;
    participantId: string;
  } | null>(null);
  const [isRemovingFromRoom, setIsRemovingFromRoom] = useState(false);

  // Subscribe to participants of each room to know in real-time which room(s) each user is in
  useEffect(() => {
    if (!rooms || rooms.length === 0) {
      setRoomParticipantsMap({});
      return;
    }

    const unsubscribes: (() => void)[] = [];

    rooms.forEach((r) => {
      const q = collection(db, `rooms/${r.id}/participants`);
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const partList = snapshot.docs.map((d) => ({
            id: d.id,
            name: ((d.data().name || '') as string).trim()
          }));
          setRoomParticipantsMap((prev) => ({
            ...prev,
            [r.id]: partList
          }));
        },
        (err) => {
          console.error(`Erro ao carregar participantes da sala ${r.id}:`, err);
        }
      );
      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [rooms]);

  // Helper to get all rooms a given user is enrolled in
  const getUserRooms = (userId: string, userName: string): UserRoomInfo[] => {
    const userRooms: UserRoomInfo[] = [];
    const normalizedName = userName.trim().toLowerCase();

    for (const r of rooms) {
      const pList = roomParticipantsMap[r.id] || [];
      const match = pList.find(
        (p) => p.id === userId || (p.name && p.name.toLowerCase() === normalizedName)
      );
      if (match) {
        userRooms.push({ room: r, participantId: match.id });
      }
    }
    return userRooms;
  };

  // Compute metrics
  const usersWithRoomsCount = users.filter((u) => getUserRooms(u.id, u.name).length > 0).length;
  const usersWithoutRoomsCount = users.length - usersWithRoomsCount;

  // Extract all distinct families from users
  const distinctFamilies = Array.from(
    new Set(users.map((u) => u.familyGroup?.trim()).filter(Boolean))
  ) as string[];

  // Filter users based on search, family filter, and room status filter
  const filteredUsers = users.filter((user) => {
    const userRooms = getUserRooms(user.id, user.name);

    // Search filter: matches name, family group, gift boxes, or enrolled room name
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.familyGroup && user.familyGroup.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.giftBoxes && user.giftBoxes.some((g) => g.toLowerCase().includes(searchTerm.toLowerCase()))) ||
      userRooms.some((ur) => ur.room.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // Family filter
    if (selectedFamilyFilter === 'NO_FAMILY') {
      if (user.familyGroup && user.familyGroup.trim() !== '') return false;
    } else if (selectedFamilyFilter !== 'ALL') {
      if (user.familyGroup !== selectedFamilyFilter) return false;
    }

    // Room status filter
    if (selectedRoomFilter === 'NO_ROOM') {
      if (userRooms.length > 0) return false;
    } else if (selectedRoomFilter === 'HAS_ROOM') {
      if (userRooms.length === 0) return false;
    } else if (selectedRoomFilter !== 'ALL') {
      if (!userRooms.some((ur) => ur.room.id === selectedRoomFilter)) return false;
    }

    return true;
  });

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyCredentials = (u: UserProfileItem) => {
    const userRooms = getUserRooms(u.id, u.name);
    const roomInfoText = userRooms.length > 0 
      ? `🏛️ *Sala(s):* ${userRooms.map((ur) => ur.room.name).join(', ')}`
      : `⚠️ *Ainda sem sala definida* (o organizador irá adicionar você em breve)`;

    const text = `🎄 *Amigo Secreto da Família*\n👤 *Nome:* ${u.name}\n🔑 *Senha:* ${u.password || '1234'}\n${roomInfoText}\n🎁 Acesse o app e veja seus presentes!`;
    navigator.clipboard.writeText(text);
    setCopiedId(u.id);
    festiveAudio.playJingle();
    onSuccessMessage(`Dados de acesso de "${u.name}" copiados para enviar!`);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleQuickChangeFamily = async (u: UserProfileItem, selectedValue: string) => {
    if (selectedValue === '__NEW__') {
      setQuickEditingUserId(u.id);
      setQuickFamilyInput('');
      return;
    }

    try {
      const targetFamily = selectedValue.trim();
      await updateDoc(doc(db, 'users', u.id), { familyGroup: targetFamily });

      if (targetFamily) {
        onSuccessMessage(`Grupo familiar de "${u.name}" alterado para "${targetFamily}".`);
      } else {
        onSuccessMessage(`Grupo familiar de "${u.name}" removido.`);
      }
    } catch (err) {
      console.error("Erro ao atualizar grupo familiar:", err);
      onErrorMessage("Erro ao atualizar grupo familiar.");
    }
  };

  const handleSaveQuickCustomFamily = async (u: UserProfileItem) => {
    if (!quickFamilyInput.trim()) {
      setQuickEditingUserId(null);
      return;
    }
    const val = quickFamilyInput.trim();
    setQuickEditingUserId(null);
    setQuickFamilyInput('');
    await handleQuickChangeFamily(u, val);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      onSuccessMessage(`Cadastro de "${userToDelete.name}" excluído do sistema.`);
      setUserToDelete(null);
    } catch (err) {
      console.error("Erro ao remover usuário:", err);
      onErrorMessage("Erro ao remover usuário.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddUserToRoom = async (u: UserProfileItem, r: RoomItem) => {
    if (r.status === 'FINISHED') {
      onErrorMessage("Esta sala já realizou o sorteio e não aceita novos participantes.");
      return;
    }

    setAddingToRoomId(r.id);
    try {
      const formattedWishlist = (u.giftBoxes || []).filter((b) => b.trim().length > 0).join(', ');
      await setDoc(doc(db, `rooms/${r.id}/participants`, u.id), {
        name: u.name.trim(),
        password: u.password?.trim() || '1234',
        giftBoxes: u.giftBoxes || ['', '', ''],
        wishlist: formattedWishlist,
        familyGroup: u.familyGroup?.trim() || '',
        createdAt: serverTimestamp()
      });

      festiveAudio.playRegistrationSuccess();
      onSuccessMessage(`"${u.name}" foi adicionado(a) com sucesso à sala "${r.name}"!`);
      setUserToAddToRoom(null);
    } catch (err) {
      console.error("Erro ao adicionar usuário à sala:", err);
      onErrorMessage("Erro ao adicionar participante à sala selecionada.");
    } finally {
      setAddingToRoomId(null);
    }
  };

  const handleConfirmRemoveFromRoom = async () => {
    if (!removalTarget) return;
    setIsRemovingFromRoom(true);
    try {
      await deleteDoc(doc(db, `rooms/${removalTarget.room.id}/participants`, removalTarget.participantId));
      festiveAudio.playJingle();
      onSuccessMessage(`"${removalTarget.user.name}" foi removido(a) da sala "${removalTarget.room.name}".`);
      setRemovalTarget(null);
    } catch (err) {
      console.error("Erro ao remover participante da sala:", err);
      onErrorMessage("Erro ao desvincular participante da sala.");
    } finally {
      setIsRemovingFromRoom(false);
    }
  };

  // Helper to format date
  const formatDate = (ts: any) => {
    if (!ts) return null;
    try {
      const date = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return null;
    }
  };

  return (
    <div className={`space-y-5 ${compact ? 'text-sm' : ''}`}>
      {/* ================= SUMMARY STATS PILLS / CARDS ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => {
            setSelectedRoomFilter('ALL');
            setSelectedFamilyFilter('ALL');
          }}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedRoomFilter === 'ALL' && selectedFamilyFilter === 'ALL'
              ? 'bg-slate-800 border-red-500 shadow-md shadow-red-500/10'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Geral</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-white">{users.length}</div>
          <div className="text-[10px] text-slate-400 font-medium">cadastros no app</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRoomFilter('HAS_ROOM')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedRoomFilter === 'HAS_ROOM'
              ? 'bg-emerald-950/70 border-emerald-500 shadow-md shadow-emerald-500/10'
              : 'bg-slate-900/80 border-slate-800 hover:border-emerald-800/60'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Com Sala</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-300">{usersWithRoomsCount}</div>
          <div className="text-[10px] text-emerald-400/80 font-medium">em salas ativas</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRoomFilter('NO_ROOM')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedRoomFilter === 'NO_ROOM'
              ? 'bg-amber-950/70 border-amber-500 shadow-md shadow-amber-500/10'
              : 'bg-slate-900/80 border-slate-800 hover:border-amber-800/60'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Sem Sala Ainda</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-300">{usersWithoutRoomsCount}</div>
          <div className="text-[10px] text-amber-400/80 font-medium">precisam de sala</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedFamilyFilter('ALL')}
          className="p-3 rounded-2xl border bg-slate-900/80 border-slate-800 text-left"
        >
          <div className="flex items-center justify-between text-purple-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Famílias</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-300">{distinctFamilies.length}</div>
          <div className="text-[10px] text-purple-400/80 font-medium">grupos definidos</div>
        </button>
      </div>

      {/* ================= CONTROLS: SEARCH & FILTERS ================= */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, família, sala ou presente..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border-2 border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 font-semibold text-xs focus:border-red-600 outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Room Status Filter Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <DoorOpen className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedRoomFilter}
            onChange={(e) => setSelectedRoomFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border-2 border-slate-700 bg-slate-950 text-white font-bold text-xs outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">🏛️ Todas as Situações de Sala</option>
            <option value="NO_ROOM">⚠️ Sem sala ainda ({usersWithoutRoomsCount})</option>
            <option value="HAS_ROOM">✅ Em alguma sala ({usersWithRoomsCount})</option>
            {rooms.length > 0 && (
              <optgroup label="Salas Específicas:">
                {rooms.map((r) => (
                  <option key={`filter-room-opt-${r.id}`} value={r.id}>
                    Sala: {r.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Family Group Filter Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedFamilyFilter}
            onChange={(e) => setSelectedFamilyFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border-2 border-slate-700 bg-slate-950 text-white font-bold text-xs outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="ALL">👥 Todas as Famílias</option>
            <option value="NO_FAMILY">👥 Sem Família Definida</option>
            {distinctFamilies.map((fam) => (
              <option key={`fam-filter-opt-${fam}`} value={fam}>
                Família: {fam}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active filters notice if any filter is active */}
      {(selectedRoomFilter !== 'ALL' || selectedFamilyFilter !== 'ALL' || searchTerm) && (
        <div className="flex items-center justify-between text-xs px-2 text-slate-400">
          <span>
            Mostrando <strong>{filteredUsers.length}</strong> de <strong>{users.length}</strong> participantes cadastrados
          </span>
          <button
            onClick={() => {
              setSelectedRoomFilter('ALL');
              setSelectedFamilyFilter('ALL');
              setSearchTerm('');
            }}
            className="text-red-400 hover:text-red-300 font-bold underline cursor-pointer"
          >
            Limpar Filtros
          </button>
        </div>
      )}

      {/* ================= USERS LIST ================= */}
      <div className="space-y-3.5 max-h-[620px] overflow-y-auto pr-1">
        {filteredUsers.map((u, index) => {
          const filledBoxes = u.giftBoxes?.filter((g) => g && g.trim().length > 0) || [];
          const isPasswordVisible = visiblePasswords[u.id];
          const regDate = formatDate(u.createdAt);
          const userRooms = getUserRooms(u.id, u.name);
          const hasRooms = userRooms.length > 0;

          return (
            <motion.div
              key={`user-card-${u.id || index}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 md:p-5 rounded-2xl border transition-all space-y-3.5 ${
                hasRooms
                  ? 'bg-slate-900/90 border-slate-700/80 hover:border-emerald-600/70'
                  : 'bg-slate-900/90 border-amber-900/40 hover:border-amber-500/70 shadow-sm'
              }`}
            >
              {/* Header: Name, Avatar, Family Group Selector, Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Initial Avatar */}
                  <div className={`w-11 h-11 rounded-2xl font-black text-sm flex items-center justify-center shrink-0 shadow-md ${
                    hasRooms
                      ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white'
                      : 'bg-gradient-to-br from-amber-600 to-red-600 text-white'
                  }`}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-black text-white text-base truncate">
                        {u.name}
                      </h4>

                      {/* INLINE QUICK FAMILY GROUP SELECTOR */}
                      {quickEditingUserId === u.id ? (
                        <div className="inline-flex items-center gap-1 bg-slate-950 border-2 border-purple-600 rounded-xl px-2 py-0.5 shadow-md">
                          <Users className="w-3 h-3 text-purple-400 shrink-0" />
                          <input
                            type="text"
                            autoFocus
                            value={quickFamilyInput}
                            onChange={(e) => setQuickFamilyInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveQuickCustomFamily(u);
                              if (e.key === 'Escape') setQuickEditingUserId(null);
                            }}
                            placeholder="Nome da família..."
                            className="bg-transparent text-white font-bold text-xs outline-none w-24 sm:w-32"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveQuickCustomFamily(u)}
                            className="p-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer"
                            title="Salvar Família"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickEditingUserId(null)}
                            className="p-0.5 bg-slate-800 text-slate-300 rounded cursor-pointer"
                            title="Cancelar"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border transition-all ${
                          u.familyGroup 
                            ? 'bg-purple-950 text-purple-300 border-purple-800 shadow-2xs' 
                            : 'bg-slate-950 text-slate-400 border-slate-700'
                        }`}>
                          <Users className={`w-3 h-3 ${u.familyGroup ? 'text-purple-400' : 'text-slate-500'}`} />
                          <select
                            value={u.familyGroup || ''}
                            onChange={(e) => handleQuickChangeFamily(u, e.target.value)}
                            className="bg-transparent text-purple-200 font-bold text-[11px] outline-none cursor-pointer pr-1"
                            title="Alterar Grupo Familiar"
                          >
                            <option value="" className="bg-slate-900 text-slate-300">
                              {u.familyGroup ? '❌ Remover Família' : '👥 Sem Família (Definir...)'}
                            </option>
                            {distinctFamilies.map((fam) => (
                              <option key={`fam-opt-u-${fam}`} value={fam} className="bg-slate-900 text-purple-300">
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

                    {/* Metadata line: date */}
                    {regDate && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        Cadastrado em {regDate}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {/* Add to Room Button */}
                  {rooms && rooms.length > 0 && (
                    <button
                      onClick={() => setUserToAddToRoom(u)}
                      className={`px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-sm ${
                        hasRooms
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-emerald-900/30'
                      }`}
                      title="Adicionar esta pessoa a uma sala de amigo secreto"
                    >
                      <DoorOpen className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold">
                        {hasRooms ? 'Adicionar a Outra Sala' : 'Adicionar à Sala'}
                      </span>
                    </button>
                  )}

                  {/* Copy Credentials Button */}
                  <button
                    onClick={() => handleCopyCredentials(u)}
                    className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors flex items-center gap-1 text-xs font-bold"
                    title="Copiar dados de acesso (Nome e Senha) para WhatsApp"
                  >
                    {copiedId === u.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 text-[11px]">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px]">Acesso</span>
                      </>
                    )}
                  </button>

                  {/* Delete User Button */}
                  <button
                    onClick={() => setUserToDelete(u)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl border border-transparent hover:border-red-900/40 transition-colors"
                    title="Excluir cadastro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ================= ROOM STATUS VISUALIZER / RÓTULO ================= */}
              <div className="pt-0.5">
                {hasRooms ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-emerald-900/40 shadow-inner">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>Adicionado à(s) Sala(s):</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {userRooms.map(({ room: rm, participantId }) => (
                          <div
                            key={`user-room-badge-${u.id}-${rm.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/80 text-emerald-200 border border-emerald-700/80 text-xs font-bold shadow-xs"
                          >
                            <DoorOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-white font-black">{rm.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full uppercase font-black ${
                              rm.status === 'FINISHED'
                                ? 'bg-purple-900 text-purple-200 border border-purple-700'
                                : 'bg-emerald-900 text-emerald-300 border border-emerald-700'
                            }`}>
                              {rm.status === 'FINISHED' ? 'Sorteado' : 'Aguardando'}
                            </span>

                            {/* View / Manage room shortcut */}
                            {onSelectRoom && (
                              <button
                                type="button"
                                onClick={() => onSelectRoom(rm.id)}
                                className="text-[10px] text-emerald-300 hover:text-white underline font-bold cursor-pointer ml-1"
                                title={`Abrir gerenciamento da sala "${rm.name}"`}
                              >
                                Abrir
                              </button>
                            )}

                            {/* Unlink / remove from room */}
                            <button
                              type="button"
                              onClick={() => setRemovalTarget({ user: u, room: rm, participantId })}
                              className="p-0.5 text-emerald-400/80 hover:text-red-400 hover:bg-red-950/70 rounded transition-colors ml-0.5 cursor-pointer"
                              title={`Remover "${u.name}" da sala "${rm.name}"`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-400 font-semibold self-end sm:self-auto shrink-0">
                      {userRooms.length === 1 ? '1 sala vinculada' : `${userRooms.length} salas vinculadas`}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-amber-950/30 border border-amber-800/50 shadow-inner">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-950 text-amber-400 flex items-center justify-center shrink-0 border border-amber-800/60">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-black text-amber-300">
                            Sem sala ainda
                          </span>
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60 uppercase">
                            Não sorteando
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-200/70 mt-0.5">
                          Esta pessoa ainda não entrou nem foi adicionada a nenhuma sala de sorteio.
                        </p>
                      </div>
                    </div>

                    {rooms && rooms.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setUserToAddToRoom(u)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-md shadow-amber-950/30 shrink-0"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Adicionar a uma Sala</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Password & Security Row */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-slate-400 font-semibold text-[11px]">Senha:</span>
                  <span className="font-mono font-bold text-white tracking-wider">
                    {isPasswordVisible ? (u.password || '1234') : '••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(u.id)}
                    className="ml-1 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                    title={isPasswordVisible ? "Ocultar senha" : "Ver senha"}
                  >
                    {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Gift Boxes Summary */}
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px] bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Gift className="w-3.5 h-3.5 text-red-500" />
                  <span>{filledBoxes.length} {filledBoxes.length === 1 ? 'presente cadastrado' : 'presentes cadastrados'}</span>
                </div>
              </div>

              {/* Gift Boxes Preview Tags */}
              {filledBoxes.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {filledBoxes.map((g, gi) => (
                    <span
                      key={`user-gift-${u.id}-${gi}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 text-slate-200 text-xs font-medium border border-slate-800 shadow-2xs"
                    >
                      <Package className="w-3 h-3 text-red-500" />
                      <span className="font-bold text-[11px] text-red-400">#{gi + 1}:</span>
                      <span className="max-w-[180px] truncate">{g}</span>
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 p-6 space-y-3">
            <Users className="w-12 h-12 mx-auto text-slate-600" />
            <h5 className="font-bold text-white text-base">Nenhum participante encontrado</h5>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchTerm 
                ? `Nenhum resultado corresponde à busca "${searchTerm}".`
                : selectedRoomFilter === 'NO_ROOM'
                ? "Todas as pessoas cadastradas já foram adicionadas a pelo menos uma sala!"
                : selectedRoomFilter === 'HAS_ROOM'
                ? "Nenhuma pessoa foi adicionada a salas ainda."
                : "Ainda não há nenhuma pessoa cadastrada no app."}
            </p>
            {(selectedRoomFilter !== 'ALL' || selectedFamilyFilter !== 'ALL' || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedRoomFilter('ALL');
                  setSelectedFamilyFilter('ALL');
                  setSearchTerm('');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Limpar Todos os Filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* ================= MODAL: CONFIRM DELETE USER ================= */}
      <AnimatePresence>
        {userToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-red-900/50 text-center space-y-5"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-950 text-red-400 flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">
                  Excluir Cadastro?
                </h3>
                <p className="text-sm text-slate-300 mt-2">
                  Deseja excluir permanentemente o cadastro de <strong className="text-red-400">{userToDelete.name}</strong> do sistema?
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Se esta pessoa estiver participando de alguma sala de sorteio, ela não conseguirá mais logar com essa conta.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-900/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? "Excluindo..." : "Confirmar Exclusão"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: CONFIRM REMOVE USER FROM SPECIFIC ROOM ================= */}
      <AnimatePresence>
        {removalTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-amber-900/50 text-center space-y-5"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-950 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                <DoorOpen className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">
                  Desvincular da Sala?
                </h3>
                <p className="text-sm text-slate-300 mt-2">
                  Deseja remover <strong className="text-white">{removalTarget.user.name}</strong> da sala <strong className="text-emerald-400">{removalTarget.room.name}</strong>?
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  O cadastro da pessoa no aplicativo não será excluído, ela apenas deixará de participar desta sala específica de amigo secreto.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRemovalTarget(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemoveFromRoom}
                  disabled={isRemovingFromRoom}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>{isRemovingFromRoom ? "Removendo..." : "Confirmar Remoção"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: ADD USER TO ROOM ================= */}
      <AnimatePresence>
        {userToAddToRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-700 space-y-5 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-950 text-emerald-400">
                    <DoorOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">
                      Adicionar à Sala
                    </h3>
                    <p className="text-xs text-slate-400">
                      Escolha a sala para adicionar <strong className="text-white">{userToAddToRoom.name}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setUserToAddToRoom(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Rooms list */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {rooms.map((r) => {
                  const alreadyEnrolled = (roomParticipantsMap[r.id] || []).some(
                    (p) => p.id === userToAddToRoom.id || p.name.toLowerCase() === userToAddToRoom.name.trim().toLowerCase()
                  );

                  return (
                    <div
                      key={`modal-room-opt-${r.id}`}
                      className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 hover:border-emerald-600/70 transition-colors"
                    >
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-sm truncate">{r.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">ID: {r.id}</span>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            r.status === 'FINISHED' 
                              ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}>
                            {r.status === 'FINISHED' ? 'Finalizado' : 'Aguardando Sorteio'}
                          </span>
                        </div>
                      </div>

                      {alreadyEnrolled ? (
                        <span className="px-3 py-1.5 bg-emerald-950/60 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-800/80 flex items-center gap-1 shrink-0">
                          <Check className="w-3.5 h-3.5" />
                          <span>Já na Sala</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddUserToRoom(userToAddToRoom, r)}
                          disabled={addingToRoomId === r.id || r.status === 'FINISHED'}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{addingToRoomId === r.id ? 'Adicionando...' : 'Adicionar'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}

                {rooms.length === 0 && (
                  <div className="text-center py-8 text-slate-400 space-y-2">
                    <DoorOpen className="w-8 h-8 mx-auto opacity-40 text-slate-500" />
                    <p className="text-xs">Nenhuma sala cadastrada no momento.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setUserToAddToRoom(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
