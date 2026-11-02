import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  getDoc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError } from './lib/firebase';
import { FestiveLayout } from './components/FestiveLayout';
import { Roulette } from './components/Roulette';
import { 
  Plus, 
  Users, 
  UserPlus,
  Gift, 
  ArrowRight, 
  Lock, 
  AlertCircle, 
  Loader2, 
  Clipboard, 
  CheckCircle2,
  Trash2,
  Play,
  LogOut,
  Sparkles,
  ArrowLeft,
  Package,
  Edit3,
  Share2
} from 'lucide-react';
import { festiveAudio } from './lib/festiveAudio';
import { FestiveWaitingHero } from './components/FestiveWaitingHero';
import { FestiveWaitingList } from './components/FestiveWaitingList';
import { FestiveGiftSavedModal } from './components/FestiveGiftSavedModal';
import { AdminParticipantManager } from './components/AdminParticipantManager';
import { FestiveRevealExperience } from './components/FestiveRevealExperience';
import { FestiveFamilyInviteModal } from './components/FestiveFamilyInviteModal';
import confetti from 'canvas-confetti';

// --- Types ---
interface Room {
  id: string;
  name: string;
  status: 'WAITING' | 'DRAWING' | 'FINISHED';
  adminPassword?: string;
  giftList?: string;
}

interface Participant {
  id: string;
  name: string;
  password?: string;
  giftBoxes?: string[];
  wishlist?: string;
  uid?: string;
}

interface UserProfile {
  id: string;
  name: string;
  password?: string;
  giftBoxes: string[];
}

interface DrawResult {
  targetId: string;
  targetName: string;
}

type ViewState = 
  | 'HOME' 
  | 'REGISTER' 
  | 'LOGIN_PROFILE' 
  | 'PROFILE' 
  | 'JOIN_ROOM' 
  | 'DASHBOARD' 
  | 'ADMIN_LOGIN' 
  | 'ADMIN' 
  | 'CREATE';

export default function App() {
  const [view, setView] = useState<ViewState>('HOME');
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [user, setUser] = useState<{ id: string; name: string; role: 'ADMIN' | 'PARTICIPANT' } | null>(null);
  const [giftBoxes, setGiftBoxes] = useState<string[]>(['', '', '']);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [result, setResult] = useState<DrawResult | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<{ id: string; name: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showGiftSavedModal, setShowGiftSavedModal] = useState<boolean>(false);
  const [showFamilyInviteModal, setShowFamilyInviteModal] = useState<boolean>(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Persistence restoration
  useEffect(() => {
    const saved = localStorage.getItem('amigo-secreto-session');
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const { roomId, userId, role, name } = parsed;
        setUser({ id: userId, role, name });

        if (role === 'ADMIN') {
          if (roomId) {
            fetchRoom(roomId, 'ADMIN');
          } else {
            setView('ADMIN');
            setLoading(false);
          }
        } else {
          // Participant: fetch profile
          fetchUserProfile(userId).then(() => {
            if (roomId) {
              fetchRoom(roomId, 'DASHBOARD');
            } else if (roomParam) {
              setView('JOIN_ROOM');
              setLoading(false);
            } else {
              setView('PROFILE');
              setLoading(false);
            }
          });
        }
      } catch {
        setLoading(false);
      }
    } else if (roomParam) {
      setView('JOIN_ROOM');
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  // Clear messages after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Listen to all rooms if admin
  useEffect(() => {
    if (view === 'ADMIN' && user?.role === 'ADMIN') {
      const q = collection(db, 'rooms');
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const roomsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Room));
        setAllRooms(roomsList);
      }, (err) => {
        console.error("Erro ao listar salas:", err);
      });
      return unsubscribe;
    }
  }, [view, user?.role]);

  // Listen to participants of current room
  useEffect(() => {
    if (room?.id) {
      const q = collection(db, `rooms/${room.id}/participants`);
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant));
        setParticipants(list);
      }, (err) => handleFirestoreError(err, OperationType.LIST, `rooms/${room.id}/participants`));
      return unsubscribe;
    }
  }, [room?.id]);

  // Listen to draw results if participant
  useEffect(() => {
    if (room?.status === 'FINISHED' && user?.role === 'PARTICIPANT' && user.id) {
      const docRef = doc(db, `rooms/${room.id}/results/${user.id}`);
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          setResult(snapshot.data() as DrawResult);
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, `rooms/${room.id}/results/${user.id}`));
      return unsubscribe;
    }
  }, [room?.status, user]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        if (Array.isArray(data.giftBoxes) && data.giftBoxes.length > 0) {
          setGiftBoxes(data.giftBoxes);
        } else {
          setGiftBoxes(['', '', '']);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
    }
  };

  const fetchRoom = async (roomId: string, targetView: 'ADMIN' | 'DASHBOARD') => {
    if (!roomId) {
      setLoading(false);
      return;
    }
    try {
      const docRef = doc(db, 'rooms', roomId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setRoom({ id: snapshot.id, ...snapshot.data() } as Room);
        setView(targetView);
      } else {
        setError("Sala não encontrada.");
        setView('HOME');
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar sala.");
    } finally {
      setLoading(false);
    }
  };

  // --- Admin Login ---
  const handleAdminLogin = async (username: string, password: string) => {
    if (username.trim().toLowerCase() === 'admin' && password === '123456') {
      setUser({ id: 'GLOBAL_ADMIN', role: 'ADMIN', name: 'Administrador Geral' });
      localStorage.setItem('amigo-secreto-session', JSON.stringify({ userId: 'GLOBAL_ADMIN', role: 'ADMIN', name: 'Administrador Geral' }));
      setView('ADMIN');
      setError(null);
    } else {
      setError("Usuário ou senha incorretos. Use 'admin' e '123456'.");
    }
  };

  // --- Participant Registration (ONLY Name and Password) ---
  const handleRegisterParticipant = async (name: string, password: string) => {
    setLoading(true);
    setError(null);
    const trimmedName = name.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName || !trimmedPassword) {
      setError("Por favor, preencha o nome e a senha.");
      setLoading(false);
      return;
    }

    try {
      // Check if user already exists
      const q = query(collection(db, 'users'), where('name', '==', trimmedName));
      const existing = await getDocs(q);
      if (!existing.empty) {
        setError("Já existe um participante cadastrado com este nome. Faça login com sua senha.");
        setLoading(false);
        return;
      }

      // Anonymous auth to secure firestore interaction
      try {
        await signInAnonymously(auth);
      } catch (authErr) {
        console.warn("Auth warning:", authErr);
      }

      const defaultGifts = ['', '', ''];
      const docRef = await addDoc(collection(db, 'users'), {
        name: trimmedName,
        password: trimmedPassword,
        giftBoxes: defaultGifts,
        createdAt: serverTimestamp()
      });

      const newUserId = docRef.id;
      setUser({ id: newUserId, role: 'PARTICIPANT', name: trimmedName });
      setGiftBoxes(defaultGifts);
      localStorage.setItem('amigo-secreto-session', JSON.stringify({
        userId: newUserId,
        role: 'PARTICIPANT',
        name: trimmedName
      }));

      setSuccessMessage("Cadastro realizado com sucesso! Adicione agora seus presentes nas caixas abaixo.");
      festiveAudio.playRegistrationSuccess();
      confetti({
        particleCount: 90,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ef4444', '#eab308', '#22c55e', '#ffffff']
      });
      setView('PROFILE');
    } catch (err) {
      console.error(err);
      setError("Erro ao realizar o cadastro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // --- Participant Login to Profile ---
  const handleLoginParticipant = async (name: string, password: string) => {
    setLoading(true);
    setError(null);
    const trimmedName = name.trim();
    const trimmedPassword = password.trim();

    try {
      const q = query(collection(db, 'users'), where('name', '==', trimmedName));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError("Participante não encontrado. Cadastre-se primeiro.");
        setLoading(false);
        return;
      }

      const userDoc = snap.docs[0];
      const userData = userDoc.data();

      if (userData.password !== trimmedPassword) {
        setError("Senha incorreta.");
        setLoading(false);
        return;
      }

      const userId = userDoc.id;
      const loadedBoxes = Array.isArray(userData.giftBoxes) && userData.giftBoxes.length > 0 
        ? userData.giftBoxes 
        : ['', '', ''];

      setUser({ id: userId, role: 'PARTICIPANT', name: trimmedName });
      setGiftBoxes(loadedBoxes);
      localStorage.setItem('amigo-secreto-session', JSON.stringify({
        userId,
        role: 'PARTICIPANT',
        name: trimmedName
      }));

      setView('PROFILE');
    } catch (err) {
      console.error(err);
      setError("Erro ao acessar o perfil. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  };

  // --- Save / Update Gift Boxes ---
  const handleSaveGiftBoxes = async (boxesToSave: string[], showFeedback = true) => {
    if (!user || user.role !== 'PARTICIPANT') return;
    setSaveStatus('saving');

    try {
      // 1. Update in users collection
      await updateDoc(doc(db, 'users', user.id), {
        giftBoxes: boxesToSave,
        updatedAt: serverTimestamp()
      });

      // 2. If user is currently in a room, update participant doc as well
      if (room?.id) {
        const participantRef = doc(db, `rooms/${room.id}/participants`, user.id);
        const partSnap = await getDoc(participantRef);
        if (partSnap.exists()) {
          const formattedWishlist = boxesToSave.filter(b => b.trim().length > 0).join(', ');
          await updateDoc(participantRef, {
            giftBoxes: boxesToSave,
            wishlist: formattedWishlist
          });
        }
      }

      setSaveStatus('saved');
      if (showFeedback) {
        setSuccessMessage("🎁 Suas caixas de presente foram salvas com sucesso! O Papai Noel já registrou seus desejos.");
        setShowGiftSavedModal(true);
      }
      setTimeout(() => setSaveStatus('idle'), 4000);
    } catch (err) {
      console.error("Erro ao salvar presentes:", err);
      setSaveStatus('idle');
      if (showFeedback) {
        setError("Erro ao salvar lista de presentes. Tente novamente.");
      }
    }

  };

  const handleGiftBoxChange = (index: number, value: string) => {
    const updated = [...giftBoxes];
    updated[index] = value;
    setGiftBoxes(updated);

    // Debounced autosave
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      handleSaveGiftBoxes(updated, false);
    }, 1200);
  };

  const handleAddGiftBox = () => {
    const updated = [...giftBoxes, ''];
    setGiftBoxes(updated);
  };

  const handleRemoveGiftBox = (index: number) => {
    if (giftBoxes.length <= 1) {
      setGiftBoxes(['']);
      handleSaveGiftBoxes(['']);
      return;
    }
    const updated = giftBoxes.filter((_, i) => i !== index);
    setGiftBoxes(updated);
    handleSaveGiftBoxes(updated);
  };

  // --- Entering a Room with Registered Profile ---
  const handleEnterRoom = async (roomIdInput: string, participantName?: string, participantPassword?: string) => {
    setLoading(true);
    setError(null);
    const trimmedRoomId = roomIdInput.trim();

    if (!trimmedRoomId) {
      setError("Por favor, informe o ID da Sala.");
      setLoading(false);
      return;
    }

    try {
      // 1. Check room existence
      const roomSnap = await getDoc(doc(db, 'rooms', trimmedRoomId));
      if (!roomSnap.exists()) {
        setError("Sala não encontrada. Verifique o ID da sala.");
        setLoading(false);
        return;
      }
      const roomData = { id: roomSnap.id, ...roomSnap.data() } as Room;

      let currentUserId = user?.id;
      let currentUserName = user?.name;

      // If user is not yet logged in from profile, perform or verify credentials
      if (!currentUserId || !currentUserName) {
        if (!participantName || !participantPassword) {
          setError("Informe seu nome e senha para entrar na sala.");
          setLoading(false);
          return;
        }

        const nameTrimmed = participantName.trim();
        const passTrimmed = participantPassword.trim();

        // Check if user profile exists
        const userQuery = query(collection(db, 'users'), where('name', '==', nameTrimmed));
        const userSnap = await getDocs(userQuery);

        if (!userSnap.empty) {
          const existingUserDoc = userSnap.docs[0];
          if (existingUserDoc.data().password !== passTrimmed) {
            setError("Senha incorreta para este usuário.");
            setLoading(false);
            return;
          }
          currentUserId = existingUserDoc.id;
          currentUserName = nameTrimmed;
          const loadedBoxes = existingUserDoc.data().giftBoxes || ['', '', ''];
          setGiftBoxes(loadedBoxes);
        } else {
          // Quick register profile
          const newDoc = await addDoc(collection(db, 'users'), {
            name: nameTrimmed,
            password: passTrimmed,
            giftBoxes: ['', '', ''],
            createdAt: serverTimestamp()
          });
          currentUserId = newDoc.id;
          currentUserName = nameTrimmed;
          setGiftBoxes(['', '', '']);
        }

        setUser({ id: currentUserId, role: 'PARTICIPANT', name: currentUserName });
      }

      // Anonymous auth check
      try {
        await signInAnonymously(auth);
      } catch (authErr) {
        console.warn("Auth warning:", authErr);
      }

      // 2. Add or update participant in this specific room
      const formattedWishlist = giftBoxes.filter(b => b.trim().length > 0).join(', ');
      const participantRef = doc(db, `rooms/${trimmedRoomId}/participants`, currentUserId);
      const existingPartSnap = await getDoc(participantRef);

      if (!existingPartSnap.exists()) {
        if (roomData.status === 'FINISHED') {
          setError("Esta sala já realizou o sorteio e não aceita novos participantes.");
          setLoading(false);
          return;
        }

        await setDoc(participantRef, {
          name: currentUserName,
          password: user?.id ? 'PROFILE_AUTH' : (participantPassword || '1234'),
          giftBoxes: giftBoxes,
          wishlist: formattedWishlist,
          createdAt: serverTimestamp()
        });
      } else {
        // Update their gift boxes in case they updated their profile
        await updateDoc(participantRef, {
          giftBoxes: giftBoxes,
          wishlist: formattedWishlist
        });
      }

      setRoom(roomData);
      localStorage.setItem('amigo-secreto-session', JSON.stringify({
        roomId: trimmedRoomId,
        userId: currentUserId,
        role: 'PARTICIPANT',
        name: currentUserName
      }));

      festiveAudio.playRoomEntry();
      confetti({
        particleCount: 60,
        spread: 55,
        origin: { y: 0.5 },
        colors: ['#ef4444', '#3b82f6', '#10b981', '#eab308']
      });

      setView('DASHBOARD');
    } catch (err) {
      console.error(err);
      setError("Erro ao entrar na sala. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // --- Admin: Create Room ---
  const handleCreateRoom = async (name: string, adminPassword?: string) => {
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'rooms'), {
        name: name.trim(),
        adminPassword: adminPassword?.trim() || '123456',
        status: 'WAITING',
        createdAt: serverTimestamp()
      });
      const newRoom = { id: docRef.id, name: name.trim(), status: 'WAITING' as const };
      setRoom(newRoom);
      setUser({ id: 'GLOBAL_ADMIN', role: 'ADMIN', name: 'Administrador Geral' });
      localStorage.setItem('amigo-secreto-session', JSON.stringify({ 
        roomId: docRef.id, 
        userId: 'GLOBAL_ADMIN', 
        role: 'ADMIN', 
        name: 'Administrador Geral' 
      }));
      setView('ADMIN');
      setShowFamilyInviteModal(true);
      festiveAudio.playRegistrationSuccess();
      setSuccessMessage("🎉 Sala criada com sucesso! Divulgue o código da sala para os participantes pelo botão WhatsApp abaixo.");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'rooms');
    } finally {
      setLoading(false);
    }
  };

  // --- Admin: Start Draw ---
  const handleStartDraw = async () => {
    if (!room || participants.length < 3) {
      setError("Mínimo de 3 participantes para realizar o sorteio.");
      return;
    }
    
    setLoading(true);
    try {
      let shuffled = [...participants];
      let isValid = false;
      let attempts = 0;

      while (!isValid && attempts < 100) {
        shuffled = shuffled.sort(() => Math.random() - 0.5);
        isValid = participants.every((p, i) => p.id !== shuffled[i].id);
        attempts++;
      }

      if (!isValid) throw new Error("Falha ao gerar sorteio. Tente novamente.");

      const promises = participants.map((p, i) => {
        const target = shuffled[i];
        return setDoc(doc(db, `rooms/${room.id}/results`, p.id), {
          targetId: target.id,
          targetName: target.name
        });
      });

      await Promise.all(promises);
      await updateDoc(doc(db, 'rooms', room.id), { status: 'FINISHED' });
      setRoom({ ...room, status: 'FINISHED' });
      festiveAudio.playDrawFinished();
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#ff0000', '#ffd700', '#22c55e', '#ffffff']
      });
    } catch (err) {
      console.error(err);
      setError("Erro ao realizar sorteio.");
    } finally {
      setLoading(false);
    }
  };

  // --- Admin: Delete Room ---
  const confirmDeleteRoom = async () => {
    if (!roomToDelete || user?.role !== 'ADMIN') return;
    setLoading(true);
    const targetRoomId = roomToDelete.id;
    try {
      const partDocs = await getDocs(collection(db, `rooms/${targetRoomId}/participants`));
      const partDeletes = partDocs.docs.flatMap(d => [
        deleteDoc(d.ref),
        deleteDoc(doc(db, `rooms/${targetRoomId}/results`, d.id))
      ]);
      await Promise.all(partDeletes);
      await deleteDoc(doc(db, 'rooms', targetRoomId));

      if (room?.id === targetRoomId) {
        setRoom(null);
      }
      setAllRooms(prev => prev.filter(r => r.id !== targetRoomId));
      setRoomToDelete(null);
      setSuccessMessage("Sala excluída com sucesso.");
    } catch (err) {
      console.error("Erro ao excluir sala:", err);
      setError("Erro ao excluir sala.");
    } finally {
      setLoading(false);
    }
  };

  // --- Logout ---
  const logout = () => {
    localStorage.removeItem('amigo-secreto-session');
    setView('HOME');
    setRoom(null);
    setUser(null);
    setParticipants([]);
    setResult(null);
    setGiftBoxes(['', '', '']);
    setError(null);
  };

  // Helper to get drawn target's gifts
  const drawnParticipant = result ? participants.find(p => p.id === result.targetId) : null;
  const targetGiftBoxes = drawnParticipant?.giftBoxes?.filter(g => g.trim().length > 0) || [];

  if (loading && !room && view !== 'HOME' && view !== 'REGISTER' && view !== 'JOIN_ROOM') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
      </div>
    );
  }

  return (
    <FestiveLayout>
      <div className="w-full">
        <AnimatePresence mode="wait">
          
          {/* ===================== HOME ===================== */}
          {view === 'HOME' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8"
            >
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  Amigo Secreto Natalino
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white leading-tight">
                  Organize seu <span className="text-red-600">Amigo Secreto</span> em Segundos
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                  Seguro, anônimo e cheio de magia. Crie seu perfil de presentes, entre na sala e participe do sorteio!
                </p>
              </div>

              {/* Connected Participant quick bar */}
              {user && user.role === 'PARTICIPANT' && (
                <div className="max-w-md mx-auto p-4 bg-white dark:bg-slate-900 border-2 border-red-200 dark:border-red-900/50 rounded-2xl shadow-sm text-left flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase text-slate-500 font-bold block">Conectado como</span>
                    <strong className="text-slate-900 dark:text-white font-black text-base">{user.name}</strong>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setView('PROFILE')}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center gap-1"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      Meu Perfil
                    </button>
                    <button
                      onClick={logout}
                      className="px-2.5 py-1.5 text-slate-500 hover:text-red-600 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800"
                      title="Sair da conta"
                    >
                      Sair
                    </button>
                  </div>
                </div>
              )}

              {/* Main Actions: Cadastrar Participante e Entrar na Sala */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
                <button
                  onClick={() => {
                    setError(null);
                    setView('REGISTER');
                  }}
                  className="w-full sm:w-1/2 px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-base shadow-xl shadow-red-600/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-5 h-5 shrink-0" />
                  <span>Cadastrar Participante</span>
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    setView('JOIN_ROOM');
                  }}
                  className="w-full sm:w-1/2 px-6 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-base hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Users className="w-5 h-5 shrink-0 text-red-600" />
                  <span>Entrar na Sala</span>
                </button>
              </div>

              {/* Option: Já possui cadastro? Acessar meu perfil e caixas de presentes */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="max-w-lg mx-auto pt-2"
              >
                <button
                  onClick={() => {
                    setError(null);
                    if (user && user.role === 'PARTICIPANT') {
                      setView('PROFILE');
                    } else {
                      setView('LOGIN_PROFILE');
                    }
                  }}
                  className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-red-500/10 to-amber-500/10 hover:from-amber-500/20 hover:via-red-500/20 hover:to-amber-500/20 dark:from-amber-950/40 dark:via-red-950/40 dark:to-amber-950/40 border-2 border-amber-400/80 dark:border-amber-600/60 shadow-lg shadow-amber-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-between gap-4 group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/30 group-hover:rotate-6 group-hover:scale-110 transition-transform shrink-0">
                      <Gift className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Já possui cadastro?
                      </div>
                      <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                        Acessar Meu Perfil e Caixas de Presentes
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 group-hover:bg-red-600 group-hover:text-white transition-colors shadow-sm shrink-0">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </button>
              </motion.div>

              {/* Acesso Admin: Somente o ícone de cadeado */}
              <div className="pt-6 flex justify-center">
                <button 
                  onClick={() => {
                    setError(null);
                    setView('ADMIN_LOGIN');
                  }}
                  className="p-3 text-slate-400 hover:text-red-600 hover:bg-white dark:hover:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm transition-all"
                  title="Acesso Administrativo (Organizador)"
                  aria-label="Acesso Administrativo"
                >
                  <Lock className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ===================== PARTICIPANT REGISTRATION ===================== */}
          {view === 'REGISTER' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-md mx-auto bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="mb-6 text-center space-y-2">
                <div className="w-14 h-14 bg-red-100 dark:bg-red-950/60 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <UserPlus className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Cadastro do Participante</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Preencha apenas seu nome e uma senha. Logo em seguida você configurará suas caixas de presentes!
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-200 dark:border-red-900/50">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleRegisterParticipant(
                  formData.get('name') as string,
                  formData.get('password') as string
                );
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Seu Nome
                  </label>
                  <input 
                    name="name" 
                    required 
                    placeholder="Ex: Maria Clara Silva" 
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-semibold focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Senha de Acesso
                  </label>
                  <input 
                    name="password" 
                    type="password" 
                    required 
                    placeholder="Digite uma senha simples" 
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-semibold focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" 
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Guarde essa senha para acessar seu perfil e conferir seu sorteio.
                  </p>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Gift className="w-5 h-5" />
                  <span>Cadastrar e Criar Lista de Presentes</span>
                </button>

                <div className="pt-2 text-center space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setView('LOGIN_PROFILE');
                    }}
                    className="text-xs text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-bold block mx-auto"
                  >
                    Já cadastrado? Clique para entrar no seu perfil
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setView('HOME')} 
                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white font-semibold flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao Início
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ===================== PARTICIPANT PROFILE LOGIN ===================== */}
          {view === 'LOGIN_PROFILE' && (
            <motion.div
              key="login-profile"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="mb-6 text-center space-y-2">
                <div className="w-14 h-14 bg-red-100 dark:bg-red-950/60 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <Gift className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Acessar Meu Perfil</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Entre com seu nome e senha para gerenciar suas caixas de presente.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-200 dark:border-red-900/50">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleLoginParticipant(
                  formData.get('name') as string,
                  formData.get('password') as string
                );
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Seu Nome Cadastrado
                  </label>
                  <input 
                    name="name" 
                    required 
                    placeholder="Ex: Maria Clara Silva" 
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-semibold focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Sua Senha
                  </label>
                  <input 
                    name="password" 
                    type="password" 
                    required 
                    placeholder="Sua senha" 
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-semibold focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" 
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 transition-all"
                >
                  Entrar no Perfil
                </button>

                <div className="pt-2 text-center space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setView('REGISTER');
                    }}
                    className="text-xs text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-bold block mx-auto"
                  >
                    Ainda não possui cadastro? Clique aqui
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setView('HOME')} 
                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white font-semibold flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao Início
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ===================== PARTICIPANT PROFILE & GIFT BOXES ===================== */}
          {view === 'PROFILE' && user && user.role === 'PARTICIPANT' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              {/* Profile Top Bar */}
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 font-bold text-xs">
                      Perfil do Participante
                    </span>
                    {saveStatus === 'saving' && (
                      <span className="text-xs text-slate-400 flex items-center gap-1 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
                      </span>
                    )}
                    {saveStatus === 'saved' && (
                      <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Salvo!
                      </span>
                    )}
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    {user.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Aqui você monta suas caixas de presente natalinas para quem te tirar no amigo secreto!
                  </p>
                </div>

                <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
                  {room && (
                    <button
                      onClick={() => setView('DASHBOARD')}
                      className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                    >
                      <Users className="w-4 h-4" />
                      Ir para Sala Atual
                    </button>
                  )}
                  <button 
                    onClick={logout} 
                    className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-600 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors flex items-center gap-1"
                    title="Sair da Conta"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </div>
              </div>

              {/* Feedback Alert with Festive Delight */}
              {successMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 dark:from-emerald-950/60 dark:via-teal-950/50 dark:to-emerald-950/60 text-emerald-900 dark:text-emerald-100 rounded-2xl text-sm font-bold flex items-center justify-between gap-3 border-2 border-emerald-400 dark:border-emerald-600 shadow-lg shadow-emerald-500/10"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl animate-bounce">🎅</span>
                    <div>
                      <p className="font-black text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Lista Salva no Trenó do Papai Noel!
                      </p>
                      <p className="text-xs md:text-sm font-semibold">{successMessage}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSuccessMessage(null)}
                    className="px-2.5 py-1 text-xs bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-lg shrink-0 font-bold transition-colors"
                  >
                    Fechar
                  </button>
                </motion.div>
              )}


              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 rounded-2xl text-sm font-bold flex items-center gap-2 border border-red-200 dark:border-red-900/50 shadow-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* SECTION: Várias Caixas de Presente */}
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Gift className="w-6 h-6 text-red-600" />
                      Minhas Caixas de Presente ({giftBoxes.filter(b => b.trim().length > 0).length})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Coloque um presente desejado em cada caixa de presente. Seu amigo secreto verá essas caixas!
                    </p>
                  </div>

                  <button
                    onClick={handleAddGiftBox}
                    className="self-start sm:self-auto px-4 py-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Outra Caixa
                  </button>
                </div>

                {/* Grid de Caixas de Presente */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {giftBoxes.map((box, idx) => (
                    <motion.div
                      key={`gift-box-${idx}`}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative p-5 rounded-2xl bg-gradient-to-b from-red-50/60 to-white dark:from-slate-800/60 dark:to-slate-900 border-2 border-red-200 dark:border-red-900/40 shadow-sm flex flex-col justify-between space-y-3 group hover:border-red-400 transition-all"
                    >
                      {/* Box Header Badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-black uppercase tracking-wider shadow-sm">
                          <Package className="w-3.5 h-3.5" />
                          <span>Caixa #{idx + 1}</span>
                        </div>

                        {giftBoxes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveGiftBox(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                            title="Remover esta caixa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Gift Input with High Contrast */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Nome do Presente:
                        </label>
                        <input
                          type="text"
                          value={box}
                          onChange={(e) => handleGiftBoxChange(idx, e.target.value)}
                          placeholder={`Ex: Presente desejado #${idx + 1}`}
                          className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-semibold text-sm focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                        />
                      </div>

                      <div className="text-[10px] text-slate-400 italic">
                        {box.trim() ? "🎁 Presente preenchido" : "Caixa vazia"}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500">
                    Suas caixas salvam automaticamente ao digitar.
                  </p>
                  <button
                    onClick={() => handleSaveGiftBoxes(giftBoxes, true)}
                    disabled={saveStatus === 'saving'}
                    className={`w-full sm:w-auto px-7 py-3.5 rounded-xl text-sm font-black shadow-lg transition-all flex items-center justify-center gap-2.5 ${
                      saveStatus === 'saved'
                        ? 'bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 text-white shadow-emerald-500/30 scale-105 ring-2 ring-emerald-300'
                        : saveStatus === 'saving'
                        ? 'bg-red-500 text-white opacity-80 cursor-wait'
                        : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-red-600/30 active:scale-95'
                    }`}
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Salvando com Carinho...</span>
                      </>
                    ) : saveStatus === 'saved' ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-200 animate-bounce" />
                        <span>🎁 Caixas Salvas com Sucesso! ✨</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Salvar Caixas de Presente</span>
                      </>
                    )}
                  </button>

                </div>
              </div>

              {/* SECTION: Entrar na Sala de Sorteio */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 md:p-8 rounded-3xl shadow-xl space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    Participar de um Sorteio
                  </span>
                  <h3 className="text-2xl font-black">Entrar em uma Sala de Amigo Secreto</h3>
                  <p className="text-xs text-slate-300">
                    O organizador do amigo secreto lhe forneceu um ID ou código da sala? Digite-o abaixo para entrar com sua lista de presentes cadastrada:
                  </p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleEnterRoom(formData.get('roomId') as string);
                }} className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      name="roomId" 
                      required 
                      defaultValue={new URLSearchParams(window.location.search).get('room') || room?.id || ''}
                      placeholder="Cole ou digite o ID da Sala aqui" 
                      className="flex-1 px-4 py-3.5 rounded-xl border-2 border-slate-400 dark:border-slate-600 bg-white text-slate-950 placeholder:text-slate-500 font-semibold focus:border-red-500 outline-none" 
                    />
                    <button 
                      type="submit" 
                      className="px-8 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 shrink-0"
                    >
                      <span>Entrar na Sala</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={() => setView('HOME')}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white font-semibold inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar para Tela Inicial
                </button>
              </div>
            </motion.div>
          )}

          {/* ===================== JOIN ROOM ===================== */}
          {view === 'JOIN_ROOM' && (
            <motion.div
              key="join-room"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-md mx-auto bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="mb-6 text-center space-y-2">
                <div className="w-14 h-14 bg-red-100 dark:bg-red-950/60 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <Users className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Entrar na Sala</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {user && user.role === 'PARTICIPANT' 
                    ? `Você está conectado como ${user.name}. Digite o ID da sala para participar do sorteio.`
                    : 'Informe o ID da sala e seus dados de participante para entrar no sorteio.'}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-200 dark:border-red-900/50">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleEnterRoom(
                  formData.get('roomId') as string,
                  formData.get('name') as string | undefined,
                  formData.get('password') as string | undefined
                );
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                    ID da Sala
                  </label>
                  <input 
                    name="roomId" 
                    required 
                    defaultValue={new URLSearchParams(window.location.search).get('room') || room?.id || ''}
                    placeholder="Cole ou digite o código da sala" 
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-semibold focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" 
                  />
                </div>

                {(!user || user.role !== 'PARTICIPANT') && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                        Seu Nome
                      </label>
                      <input 
                        name="name" 
                        required 
                        placeholder="Seu nome completo" 
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-semibold focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" 
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                        Sua Senha
                      </label>
                      <input 
                        name="password" 
                        type="password" 
                        required 
                        placeholder="Sua senha de participante" 
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-semibold focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" 
                      />
                    </div>
                  </>
                )}

                <button 
                  type="submit" 
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  <span>Entrar na Sala do Sorteio</span>
                </button>

                <div className="pt-2 text-center space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setView('REGISTER');
                    }}
                    className="text-xs text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-bold block mx-auto"
                  >
                    Ainda não possui cadastro básico? Cadastre-se aqui
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setView('HOME')} 
                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white font-semibold flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao Início
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ===================== ADMIN LOGIN ===================== */}
          {view === 'ADMIN_LOGIN' && (
            <motion.div
              key="admin-login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="mb-6 text-center space-y-2">
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Acesso Administrativo</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Painel exclusivo para administradores criarem e gerenciarem salas de sorteio.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-200 dark:border-red-900/50">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleAdminLogin(
                  formData.get('username') as string, 
                  formData.get('password') as string
                );
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Usuário Admin
                  </label>
                  <input 
                    name="username" 
                    required 
                    defaultValue="admin" 
                    placeholder="admin" 
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-semibold outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Senha Admin
                  </label>
                  <input 
                    name="password" 
                    type="password" 
                    required 
                    placeholder="Digite a senha admin" 
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-semibold outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20" 
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
                >
                  Entrar no Painel do Administrador
                </button>

                <button 
                  type="button" 
                  onClick={() => setView('HOME')} 
                  className="w-full py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao Início
                </button>
              </form>
            </motion.div>
          )}

          {/* ===================== ADMIN CREATE ROOM ===================== */}
          {view === 'CREATE' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-md mx-auto bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="mb-6 space-y-1">
                <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Acesso Admin</span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Criar Nova Sala</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Crie um novo evento de amigo secreto para compartilhar o ID com os participantes.
                </p>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateRoom(formData.get('name') as string, formData.get('password') as string);
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Nome do Evento / Sala
                  </label>
                  <input 
                    name="name" 
                    required 
                    placeholder="Ex: Família Silva 2026 ou Amigos do Trabalho" 
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-semibold focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Senha Opcional da Sala (Padrão: 123456)
                  </label>
                  <input 
                    name="password" 
                    type="password" 
                    defaultValue="123456" 
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-semibold focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none" 
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Criar Sala</span>
                </button>

                <button 
                  type="button" 
                  onClick={() => setView('ADMIN')} 
                  className="w-full py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao Painel do Administrador
                </button>
              </form>
            </motion.div>
          )}

          {/* ===================== ADMIN PANEL ===================== */}
          {view === 'ADMIN' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Painel Administrativo</span>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white">Gerenciamento de Salas</h2>
                  <p className="text-slate-500 text-xs">Exclusivo do Administrador</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setView('HOME')}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-800"
                  >
                    Ver Home
                  </button>
                  <button 
                    onClick={logout} 
                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/40 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </div>
              </div>

              {!room ? (
                <div className="space-y-8">
                  {/* Botão Criar Sala DENTRO do Acesso Adm */}
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border-2 border-dashed border-red-200 dark:border-red-900/40 text-center space-y-4">
                    <div className="w-14 h-14 bg-red-100 dark:bg-red-950/60 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                      <Plus className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Criar Nova Sala de Amigo Secreto</h3>
                      <p className="text-slate-500 text-xs max-w-sm mx-auto">
                        Inicie uma nova sala para gerar o ID de convite aos participantes.
                      </p>
                    </div>
                    <button 
                      onClick={() => setView('CREATE')}
                      className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 transition-all flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Criar Nova Sala</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Salas Cadastradas ({allRooms.length})
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {allRooms.map((r, idx) => (
                        <div 
                          key={`room-${r.id || idx}`} 
                          className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:border-red-200 transition-colors group"
                        >
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-900 dark:text-white text-base">{r.name}</h4>
                            <p className="text-xs text-slate-400 font-mono">ID: {r.id}</p>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block ${
                              r.status === 'FINISHED' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300' 
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            }`}>
                              {r.status === 'FINISHED' ? 'Sorteio Realizado' : 'Aguardando Sorteio'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Excluir sala: apenas o adm poderá excluir salas */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setRoomToDelete({ id: r.id, name: r.name });
                              }}
                              className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all"
                              title="Excluir Sala (Apenas Administrador)"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>

                            <button 
                              onClick={() => setRoom(r)}
                              className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-all"
                              title="Gerenciar Sala"
                            >
                              <ArrowRight className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {allRooms.length === 0 && (
                        <p className="text-center py-12 text-slate-400 text-sm">
                          Nenhuma sala criada ainda. Clique em "Criar Nova Sala" acima para começar.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <button 
                    onClick={() => setRoom(null)}
                    className="text-xs font-bold text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para lista de salas
                  </button>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white">{room.name}</h2>
                      <p className="text-slate-500 flex items-center gap-2 mt-1 text-xs font-semibold">
                        Status da Sala:
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          room.status === 'FINISHED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}>
                          {room.status === 'FINISHED' ? 'Sorteio Finalizado' : 'Aguardando Início do Sorteio'}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                      {room.status === 'WAITING' && (
                        <button 
                          onClick={handleStartDraw}
                          disabled={participants.length < 3}
                          className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl text-xs font-black disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>Realizar Sorteio Agora ({participants.length}/3)</span>
                        </button>
                      )}

                      <button
                        onClick={() => setRoomToDelete({ id: room.id, name: room.name })}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl border border-red-200 dark:border-red-900/40 transition-colors"
                        title="Excluir Sala permanentemente"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Excluir Sala</span>
                      </button>
                    </div>
                  </div>

                  {/* Gerenciamento Completo de Participantes pelo ADM com Sigilo Mantido */}
                  <AdminParticipantManager
                    roomId={room.id}
                    roomName={room.name}
                    participants={participants}
                    roomStatus={room.status}
                    onSuccessMessage={(msg) => setSuccessMessage(msg)}
                    onErrorMessage={(msg) => setError(msg)}
                  />

                  {/* Convite & Compartilhamento da Chave da Sala pelo ADM */}
                  <div className="bg-gradient-to-br from-red-50 via-amber-50 to-red-50 dark:from-red-950/40 dark:via-slate-900 dark:to-red-950/40 p-6 rounded-3xl border-2 border-red-200 dark:border-red-900/40 space-y-4 shadow-lg shadow-red-500/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-red-200/60 dark:border-red-900/40 pb-3">
                      <div>
                        <h3 className="font-black text-red-900 dark:text-red-300 text-lg flex items-center gap-2">
                          <Share2 className="w-5 h-5 text-red-600" />
                          Compartilhar Chave da Sala via WhatsApp
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          Envie a chave da sala e o link direto para os participantes entrarem!
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider rounded-full self-start sm:self-auto">
                        Link Oficial Vercel
                      </span>
                    </div>

                    {/* Room ID display & copy */}
                    <div className="flex flex-col sm:flex-row items-stretch gap-3">
                      <div className="flex-1 p-3 bg-white dark:bg-slate-900 rounded-2xl font-mono text-center text-red-600 font-black border-2 border-red-200 dark:border-red-800 text-sm flex items-center justify-center gap-2 shadow-inner">
                        <span className="text-xs font-bold text-slate-400 font-sans uppercase">Chave:</span>
                        <span>{room.id}</span>
                      </div>

                      <button 
                        onClick={() => {
                          const url = `https://meuamigofamily.vercel.app?room=${room.id}`;
                          navigator.clipboard.writeText(url);
                          setSuccessMessage("Link da sala (meuamigofamily.vercel.app) copiado para a área de transferência!");
                          festiveAudio.playJingle();
                        }}
                        className="px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                        title="Copiar Link direto da Sala"
                      >
                        <Clipboard className="w-4 h-4 text-red-600" />
                        <span>Copiar Link</span>
                      </button>

                      <button
                        onClick={() => {
                          const baseUrl = 'https://meuamigofamily.vercel.app';
                          const shareUrl = `${baseUrl}?room=${room.id}`;
                          const msg = `🎄✨ *AMIGO SECRETO DA FAMÍLIA DE FIM DE ANO!* 🎅🎁\n\nBoas Festas, pessoal! O nosso sorteio da sala *${room.name}* já está pronto! 🌟\n\n🔑 *CHAVE DA SALA:* *${room.id}*\n👉 *ENTRE DIRETO PELO LINK:* ${shareUrl}\n\nCadastre seu nome e suas caixas de presente! Bom sorteio a todos! ❤️🎅✨`;
                          const encoded = encodeURIComponent(msg);
                          window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
                        }}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Enviar Chave no WhatsApp</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                      <span>Link gerado: <strong className="text-red-600">https://meuamigofamily.vercel.app?room={room.id}</strong></span>
                      <button
                        onClick={() => setShowFamilyInviteModal(true)}
                        className="text-red-600 hover:underline font-bold"
                      >
                        Ver Cartão de Convite Completo
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ===================== PARTICIPANT ROOM DASHBOARD ===================== */}
          {view === 'DASHBOARD' && room && user && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Top Bar inside Room */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left space-y-1">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-red-600">Sala do Sorteio</span>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{room.name}</h2>
                  <p className="text-xs text-slate-500">Participante: <strong className="text-slate-800 dark:text-slate-200">{user.name}</strong></p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setView('PROFILE')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-red-600/20"
                  >
                    <Gift className="w-4 h-4" />
                    <span>Minhas Caixas de Presente</span>
                  </button>

                  <button 
                    onClick={logout} 
                    className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-600 rounded-xl border border-slate-200 dark:border-slate-800"
                    title="Sair da sala"
                  >
                    Sair
                  </button>
                </div>
              </div>

              {/* Waiting Room Status */}
              {room.status === 'WAITING' && (
                <div className="space-y-8">
                  {/* Creative Person Name with Special Effects */}
                  <FestiveWaitingHero
                    userName={user.name}
                    roomName={room.name}
                    giftBoxesCount={giftBoxes.filter(b => b.trim().length > 0).length}
                    onEditGifts={() => setView('PROFILE')}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Participant's current gift boxes overview */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Gift className="w-5 h-5 text-red-600" />
                        Seus Presentes para Esta Sala
                      </h3>
                      <button
                        onClick={() => setView('PROFILE')}
                        className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar Caixas
                      </button>
                    </div>

                    <div className="space-y-2">
                      {giftBoxes.filter(b => b.trim().length > 0).map((box, i) => (
                        <div key={`my-box-preview-${i}`} className="p-3 bg-red-50/50 dark:bg-slate-800/50 rounded-xl border border-red-100 dark:border-slate-700 flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                          <Package className="w-4 h-4 text-red-600 shrink-0" />
                          <span className="font-bold text-xs text-red-600">Caixa #{i + 1}:</span>
                          <span className="font-medium">{box}</span>
                        </div>
                      ))}
                      {giftBoxes.filter(b => b.trim().length > 0).length === 0 && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                          Você ainda não colocou nenhum presente em suas caixas. Clique em "Editar Caixas" acima para preenchê-las!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Room status & participants list with creative person name & special effects */}
                  <div className="space-y-6">
                    <FestiveWaitingList
                      participants={participants}
                      currentUserName={user.name}
                      currentUserId={user.id}
                      giftBoxesCount={giftBoxes.filter(b => b.trim().length > 0).length}
                      onEditGifts={() => setView('PROFILE')}
                    />
                  </div>
                </div>
                </div>
              )}

              {/* Finished Sorteio Status */}
              {room.status === 'FINISHED' && (
                <div className="flex flex-col items-center space-y-8">
                  {result ? (
                    <FestiveRevealExperience
                      result={result}
                      drawnParticipant={drawnParticipant}
                      currentUserName={user.name}
                    />
                  ) : (
                    <div className="text-center space-y-6 py-8 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 max-w-lg mx-auto">
                      <motion.div
                        animate={{ rotate: [0, -10, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Gift className="w-20 h-20 text-red-600 mx-auto" />
                      </motion.div>
                      <div className="space-y-2">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                          O Sorteio foi Realizado!
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">
                          O resultado do seu amigo secreto já está gravado. Carregando dados do seu sorteio...
                        </p>
                      </div>
                    </div>
                  )}

                  {isSpinning && (
                    <div className="fixed inset-0 z-50 bg-white/95 dark:bg-slate-950/95 flex flex-col items-center justify-center p-6 backdrop-blur-xl">
                      <Roulette 
                        participants={participants} 
                        isSpinning={isSpinning} 
                        onSpinEnd={() => {
                          festiveAudio.playDrawFinished();
                          setTimeout(() => setIsSpinning(false), 2000);
                        }}
                      />
                      <button 
                        onClick={() => setIsSpinning(false)}
                        className="mt-12 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        Fechar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ===================== DELETE ROOM CONFIRMATION MODAL ===================== */}
      <AnimatePresence>
        {roomToDelete && user?.role === 'ADMIN' && (
          <motion.div
            key="delete-room-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              key="delete-room-modal-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-2xl border border-red-200 dark:border-red-900/40 text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Excluir Sala?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                  Tem certeza que deseja excluir a sala <strong className="text-red-600">{roomToDelete.name}</strong>?
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                  Todos os participantes cadastrados e os dados do sorteio desta sala serão apagados permanentemente. Esta ação só pode ser realizada pelo administrador.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRoomToDelete(null)}
                  className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteRoom}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg shadow-red-600/30 transition-all"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Festive Modal for Saved Gift Boxes */}
      <FestiveGiftSavedModal
        isOpen={showGiftSavedModal}
        onClose={() => setShowGiftSavedModal(false)}
        giftBoxes={giftBoxes}
        roomName={room?.name}
        onGoToRoom={() => setView('DASHBOARD')}
      />

      {/* Festive Family Invite Modal */}
      <FestiveFamilyInviteModal
        isOpen={showFamilyInviteModal}
        onClose={() => setShowFamilyInviteModal(false)}
        roomId={room?.id}
        roomName={room?.name}
      />
    </FestiveLayout>

  );
}
