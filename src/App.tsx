/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  Timestamp,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  increment
} from 'firebase/firestore';
import { auth, db, signInWithGoogle, logout } from './lib/firebase';
import { cn } from './lib/utils';
import { 
  Flame, 
  Search, 
  User, 
  Users, 
  MapPin, 
  Clock, 
  Plus, 
  LogOut, 
  MessageSquare,
  UserPlus,
  Check,
  X,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface Flare {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  subject: string;
  description: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  location?: {
    latitude: number;
    longitude: number;
  };
  hostel: string;
  maxPartners: number;
  currentPartners: number;
  active: boolean;
}

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  bio: string;
  hostel?: string;
  lastLocation?: {
    latitude: number;
    longitude: number;
  };
}

interface Message {
  id: string;
  flareId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: Timestamp;
}

// --- Translations ---

const translations = {
    en: {
      discover: "Discover",
      friends: "Friends",
      chats: "Chats",
      profile: "Profile",
      activeFlares: "Active Flares",
      nearbyStudents: "Students studying in your hostel",
      noFlares: "No active flares in your hostel. Be the first!",
      broadcast: "Broadcast Flare",
      subject: "Subject",
      description: "Description (Optional)",
      duration: "Duration",
      ignite: "Ignite Flare",
      join: "Join Study",
      chat: "Chat",
      typeMessage: "Type a message...",
      send: "Send",
      language: "Language",
      minutes: "Minutes",
      hour: "Hour",
      hours: "Hours",
      activeChats: "Active Chats",
      noChats: "No active chats. Join a study group to start talking!",
      selectHostel: "Select Your Hostel",
      hostel: "Hostel",
      saveProfile: "Save Profile",
      boysHostel: "Boys Hostel",
      girlsHostel: "Girls Hostel",
      maxPartners: "Max Partners",
      partners: "Partners",
      full: "Full"
    },
    hi: {
      discover: "खोजें",
      friends: "मित्र",
      chats: "चैट",
      profile: "प्रोफ़ाइल",
      activeFlares: "सक्रिय फ्लेयर्स",
      nearbyStudents: "आपके हॉस्टल में पढ़ रहे छात्र",
      noFlares: "आपके हॉस्टल में कोई सक्रिय फ्लेयर नहीं है। पहले आप शुरू करें!",
      broadcast: "फ्लेयर प्रसारित करें",
      subject: "विषय",
      description: "विवरण (वैकल्पिक)",
      duration: "अवधि",
      ignite: "फ्लेयर जलाएं",
      join: "पढ़ाई में शामिल हों",
      chat: "चैट",
      typeMessage: "संदेश टाइप करें...",
      send: "भेजें",
      language: "भाषा",
      minutes: "मिनट",
      hour: "घंटा",
      hours: "घंटे",
      activeChats: "सक्रिय चैट",
      noChats: "कोई सक्रिय चैट नहीं। बात शुरू करने के लिए एक अध्ययन समूह में शामिल हों!",
      selectHostel: "अपना हॉस्टल चुनें",
      hostel: "हॉस्टल",
      saveProfile: "प्रोफ़ाइल सहेजें",
      boysHostel: "बॉयज हॉस्टल",
      girlsHostel: "गर्ल्स हॉस्टल",
      maxPartners: "अधिकतम साथी",
      partners: "साथी",
      full: "भरा हुआ"
    }
  };

const HOSTELS = [
  "Boys Hostel 1", "Boys Hostel 2", "Boys Hostel 3", "Boys Hostel 4",
  "Boys Hostel 5", "Boys Hostel 6", "Boys Hostel 7", "Boys Hostel 8",
  "Girls Hostel 1", "Girls Hostel 2"
];

// --- Error Handling ---

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Utils ---

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

// --- Components ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('studyflare_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const [flares, setFlares] = useState<Flare[]>([]);
  const [view, setView] = useState<'discovery' | 'profile' | 'friends' | 'chats'>('discovery');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showFlareForm, setShowFlareForm] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [radius, setRadius] = useState(500); // 500m radius
  const [lang, setLang] = useState<'en' | 'hi'>(() => {
    const saved = localStorage.getItem('studyflare_lang');
    return (saved as 'en' | 'hi') || 'en';
  });
  const [activeChatFlare, setActiveChatFlare] = useState<Flare | null>(null);
  const [involvedFlares, setInvolvedFlares] = useState<Flare[]>([]);
  const [joinedFlareIds, setJoinedFlareIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('studyflare_joined_flares');
    return saved ? JSON.parse(saved) : [];
  });

  const t = translations[lang];

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, 'users', u.uid);
        try {
          const snap = await getDoc(userRef);
          let userProfile: UserProfile;
          if (snap.exists()) {
            userProfile = snap.data() as UserProfile;
          } else {
            userProfile = {
              uid: u.uid,
              displayName: u.displayName || 'Anonymous',
              photoURL: u.photoURL || `https://picsum.photos/seed/${u.uid}/200`,
              email: u.email || '',
              bio: 'Studying hard!',
            };
            await setDoc(userRef, userProfile);
          }
          setProfile(userProfile);
          localStorage.setItem('studyflare_profile', JSON.stringify(userProfile));
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `users/${u.uid}`);
        }
      }
      setIsAuthReady(true);
    });
    return unsubscribe;
  }, []);

  // Geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition((position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      });
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Flares Listener
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const q = query(
      collection(db, 'flares'),
      where('active', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const flareData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Flare[];
      
      const now = new Date();
      let filtered = flareData.filter(f => f.expiresAt.toDate() > now);

      // Filter by hostel if user has one selected
      if (profile?.hostel) {
        filtered = filtered.filter(f => f.hostel === profile.hostel);
      } else {
        // If user hasn't selected a hostel, maybe show nothing or prompt
        // For now, let's show nothing to enforce the "only similar location" rule
        filtered = [];
      }

      setFlares(filtered);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'flares');
    });

    return unsubscribe;
  }, [isAuthReady, user, location, radius, profile?.hostel]);

  // Involved Flares Listener (Flares you created or joined)
  useEffect(() => {
    if (!isAuthReady || !user) return;

    // We find flares where the user is the owner
    const qOwner = query(
      collection(db, 'flares'),
      where('userId', '==', user.uid),
      where('active', '==', true)
    );

    // We also want flares where the user has sent messages
    // For simplicity in a hackathon, we'll just listen to all active flares
    // but we'll filter them in the UI or here.
    const qAll = query(
      collection(db, 'flares'),
      where('active', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(qAll, (snapshot) => {
      const allFlares = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Flare));
      // Filter by hostel to match the "only same location" requirement
      const filtered = profile?.hostel 
        ? allFlares.filter(f => f.hostel === profile.hostel)
        : [];
      setInvolvedFlares(filtered);
    });

    return unsubscribe;
  }, [isAuthReady, user, profile?.hostel]);

  // Global Message Listener for Auto-Open
  useEffect(() => {
    if (!isAuthReady || !user || flares.length === 0) return;

    const q = query(
      collection(db, 'messages'),
      where('createdAt', '>', Timestamp.now()),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const msg = change.doc.data() as Message;
          if (msg.senderId !== user.uid) {
            // If I am the owner of the flare OR if I have joined this flare
            const flare = flares.find(f => f.id === msg.flareId);
            if (flare && (flare.userId === user.uid || joinedFlareIds.includes(flare.id))) {
              setActiveChatFlare(flare);
            }
          }
        }
      });
    });

    return unsubscribe;
  }, [isAuthReady, user, flares]);

  const broadcastFlare = async (subject: string, description: string, durationMinutes: number, selectedHostel: string, maxPartners: number) => {
    if (!user || !profile) return;

    const expiresAt = new Date(Date.now() + durationMinutes * 60000);
    
    try {
      // Update profile hostel if it changed or was empty
      if (profile.hostel !== selectedHostel) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { hostel: selectedHostel });
        const updatedProfile = { ...profile, hostel: selectedHostel };
        setProfile(updatedProfile);
        localStorage.setItem('studyflare_profile', JSON.stringify(updatedProfile));
      }

      await addDoc(collection(db, 'flares'), {
        userId: user.uid,
        userName: profile.displayName,
        userPhoto: profile.photoURL,
        subject,
        description,
        expiresAt: Timestamp.fromDate(expiresAt),
        createdAt: serverTimestamp(),
        location: location ? { latitude: location.lat, longitude: location.lng } : null,
        hostel: selectedHostel,
        maxPartners,
        currentPartners: 0,
        active: true
      });
      setShowFlareForm(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'flares');
    }
  };

  const handleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        console.log('Sign-in cancelled by user');
      } else {
        setAuthError(error.message || 'Failed to sign in');
        console.error('Sign-in error:', error);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleJoin = async (flare: Flare) => {
    if (!joinedFlareIds.includes(flare.id)) {
      // Check if full
      if (flare.currentPartners >= flare.maxPartners) {
        // Maybe show a toast or alert, but for now just open chat if already joined
        // or do nothing if not joined and full.
        // Actually, if they haven't joined and it's full, they shouldn't be able to join.
        return;
      }

      try {
        const flareRef = doc(db, 'flares', flare.id);
        await updateDoc(flareRef, {
          currentPartners: increment(1)
        });

        const newJoined = [...joinedFlareIds, flare.id];
        setJoinedFlareIds(newJoined);
        localStorage.setItem('studyflare_joined_flares', JSON.stringify(newJoined));
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `flares/${flare.id}`);
      }
    }
    setActiveChatFlare(flare);
  };
  const toggleLang = () => {
    const newLang = lang === 'en' ? 'hi' : 'en';
    setLang(newLang);
    localStorage.setItem('studyflare_lang', newLang);
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-orange-500"
        >
          <Flame size={48} fill="currentColor" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10"
        >
          <div className="mb-6 inline-flex p-4 bg-orange-500/10 rounded-3xl border border-orange-500/20">
            <Flame size={64} className="text-orange-500" fill="currentColor" />
          </div>
          <h1 className="text-6xl font-bold tracking-tighter mb-4 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            StudyFlare
          </h1>
          <p className="text-xl text-white/40 max-w-md mb-12 font-medium">
            Broadcast your study intentions. Find your nearest study partners instantly.
          </p>
          
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="group relative px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center gap-3">
              {isSigningIn ? 'Connecting...' : 'Get Started with Google'}
              {!isSigningIn && (
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Plus size={20} />
                </motion.div>
              )}
            </span>
          </button>

          {authError && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-red-500 text-sm font-medium"
            >
              {authError}
            </motion.p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30">
      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 md:top-0 md:bottom-auto md:pt-6">
        <div className="max-w-xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-2 flex items-center justify-between shadow-2xl shadow-black/50">
          <NavButton active={view === 'discovery'} onClick={() => setView('discovery')} icon={<Search size={20} />} label={t.discover} />
          <NavButton active={view === 'chats'} onClick={() => setView('chats')} icon={<MessageSquare size={20} />} label={t.chats} />
          <NavButton active={view === 'friends'} onClick={() => setView('friends')} icon={<Users size={20} />} label={t.friends} />
          <NavButton active={view === 'profile'} onClick={() => setView('profile')} icon={<User size={20} />} label={t.profile} />
          <button 
            onClick={toggleLang}
            className="px-3 py-2 text-xs font-bold text-orange-500 hover:bg-orange-500/10 rounded-xl transition-colors"
          >
            {lang === 'en' ? 'हिन्दी' : 'EN'}
          </button>
          <button 
            onClick={logout}
            className="p-3 text-white/40 hover:text-red-500 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto pt-8 pb-32 px-4 md:pt-32">
        <AnimatePresence mode="wait">
          {view === 'discovery' && (
            <motion.div
              key="discovery"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">{t.activeFlares}</h2>
                  <p className="text-white/40">{profile?.hostel ? `${t.nearbyStudents} (${profile.hostel})` : t.nearbyStudents}</p>
                </div>
                <button
                  onClick={() => setShowFlareForm(true)}
                  className="p-4 bg-orange-500 rounded-2xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
                >
                  <Plus size={24} />
                </button>
              </div>

              {!profile?.hostel ? (
                <div className="py-20 text-center space-y-6 bg-white/5 border border-white/10 rounded-[40px] px-8">
                  <div className="inline-flex p-6 bg-orange-500/10 rounded-full text-orange-500">
                    <MapPin size={48} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">{t.selectHostel}</h3>
                    <p className="text-white/40">You need to select your hostel to see study flares from your peers.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-w-xs mx-auto">
                    {HOSTELS.map(h => (
                      <button
                        key={h}
                        onClick={async () => {
                          if (!user || !profile) return;
                          const userRef = doc(db, 'users', user.uid);
                          await updateDoc(userRef, { hostel: h });
                          const updatedProfile = { ...profile, hostel: h };
                          setProfile(updatedProfile);
                          localStorage.setItem('studyflare_profile', JSON.stringify(updatedProfile));
                        }}
                        className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-orange-500/20 hover:border-orange-500/50 transition-all text-sm font-medium"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              ) : flares.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="inline-flex p-6 bg-white/5 rounded-full text-white/20">
                    <BookOpen size={48} />
                  </div>
                  <p className="text-white/40">{t.noFlares}</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {flares.map(flare => (
                    <FlareCard 
                      key={flare.id} 
                      flare={flare} 
                      currentUserId={user.uid} 
                      joinedFlareIds={joinedFlareIds}
                      onJoin={() => handleJoin(flare)}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {view === 'profile' && profile && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center">
                <div className="relative inline-block mb-6">
                  <img src={profile.photoURL} alt="" className="w-24 h-24 rounded-full border-4 border-orange-500/20" referrerPolicy="no-referrer" />
                  <div className="absolute -bottom-1 -right-1 p-2 bg-orange-500 rounded-full">
                    <User size={16} />
                  </div>
                </div>
                <h2 className="text-2xl font-bold">{profile.displayName}</h2>
                <p className="text-white/40 mb-6">{profile.email}</p>
                <div className="bg-white/5 rounded-2xl p-4 text-left space-y-4">
                  <div>
                    <label className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2 block">Bio</label>
                    <p className="text-white/80">{profile.bio}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2 block">{t.hostel}</label>
                    <select 
                      value={profile.hostel || ''}
                      onChange={async (e) => {
                        const h = e.target.value;
                        if (!user || !profile) return;
                        const userRef = doc(db, 'users', user.uid);
                        await updateDoc(userRef, { hostel: h });
                        const updatedProfile = { ...profile, hostel: h };
                        setProfile(updatedProfile);
                        localStorage.setItem('studyflare_profile', JSON.stringify(updatedProfile));
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 transition-colors appearance-none text-sm"
                    >
                      <option value="" disabled>{t.selectHostel}</option>
                      {HOSTELS.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'friends' && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <h2 className="text-3xl font-bold tracking-tight">{t.friends}</h2>
              <div className="py-20 text-center space-y-4">
                <div className="inline-flex p-6 bg-white/5 rounded-full text-white/20">
                  <Users size={48} />
                </div>
                <p className="text-white/40">Connect with students through study flares to build your network.</p>
              </div>
            </motion.div>
          )}

          {view === 'chats' && (
            <motion.div
              key="chats"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <h2 className="text-3xl font-bold tracking-tight">{t.activeChats}</h2>
              {involvedFlares.filter(f => f.userId === user.uid || joinedFlareIds.includes(f.id)).length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="inline-flex p-6 bg-white/5 rounded-full text-white/20">
                    <MessageSquare size={48} />
                  </div>
                  <p className="text-white/40">{t.noChats}</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {involvedFlares.filter(f => f.userId === user.uid || joinedFlareIds.includes(f.id)).map(flare => (
                    <button
                      key={flare.id}
                      onClick={() => setActiveChatFlare(flare)}
                      className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors text-left"
                    >
                      <img src={flare.userPhoto} alt="" className="w-12 h-12 rounded-full" referrerPolicy="no-referrer" />
                      <div className="flex-1">
                        <h4 className="font-bold">{flare.subject}</h4>
                        <p className="text-xs text-white/40">{flare.userName}</p>
                      </div>
                      <div className="p-2 bg-orange-500/20 text-orange-500 rounded-full">
                        <MessageSquare size={16} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Flare Form Modal */}
      <AnimatePresence>
        {showFlareForm && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFlareForm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-md bg-[#151515] border border-white/10 rounded-[40px] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6">{t.broadcast}</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                broadcastFlare(
                  formData.get('subject') as string,
                  formData.get('description') as string,
                  Number(formData.get('duration')),
                  formData.get('hostel') as string,
                  Number(formData.get('maxPartners'))
                );
              }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">{t.subject}</label>
                  <input 
                    name="subject" 
                    required 
                    placeholder="e.g. Data Structures"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-orange-500 outline-none transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">{t.hostel}</label>
                  <select 
                    name="hostel"
                    required
                    defaultValue={profile?.hostel || ''}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-orange-500 outline-none transition-colors appearance-none"
                  >
                    <option value="" disabled>{t.selectHostel}</option>
                    {HOSTELS.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">{t.description}</label>
                  <textarea 
                    name="description" 
                    placeholder="Where are you? What are you working on?"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-orange-500 outline-none transition-colors h-24 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">{t.duration}</label>
                    <select 
                      name="duration"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-orange-500 outline-none transition-colors appearance-none"
                    >
                      <option value="30">30 {t.minutes}</option>
                      <option value="60">1 {t.hour}</option>
                      <option value="120">2 {t.hours}</option>
                      <option value="180">3 {t.hours}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">{t.maxPartners}</label>
                    <input 
                      name="maxPartners"
                      type="number"
                      min="1"
                      max="10"
                      defaultValue="3"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-orange-500 outline-none transition-colors"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                >
                  <Flame size={20} fill="currentColor" />
                  {t.ignite}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      <AnimatePresence>
        {activeChatFlare && (
          <ChatModal 
            flare={activeChatFlare} 
            user={user} 
            profile={profile} 
            onClose={() => setActiveChatFlare(null)} 
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ChatModal({ flare, user, profile, onClose, t }: { flare: Flare, user: FirebaseUser, profile: UserProfile | null, onClose: () => void, t: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'messages'),
      where('flareId', '==', flare.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    });

    return unsubscribe;
  }, [flare.id]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !profile) return;

    try {
      await addDoc(collection(db, 'messages'), {
        flareId: flare.id,
        senderId: user.uid,
        senderName: profile.displayName,
        text: text.trim(),
        createdAt: serverTimestamp()
      });
      setText('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'messages');
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="relative w-full max-w-md bg-[#151515] border border-white/10 rounded-[40px] flex flex-col h-[80vh] overflow-hidden shadow-2xl">
        <div className="p-6 border-bottom border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <img src={flare.userPhoto} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
            <div>
              <h3 className="font-bold text-sm">{flare.subject}</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">{t.chat} with {flare.userName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={cn("flex flex-col", msg.senderId === user.uid ? "items-end" : "items-start")}>
              <div className={cn("max-w-[80%] p-3 rounded-2xl text-sm", msg.senderId === user.uid ? "bg-orange-500 text-white rounded-tr-none" : "bg-white/10 text-white rounded-tl-none")}>
                {msg.text}
              </div>
              <span className="text-[10px] text-white/20 mt-1">{msg.senderName}</span>
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} className="p-6 bg-white/5 border-top border-white/10 flex gap-2">
          <input 
            value={text} 
            onChange={e => setText(e.target.value)} 
            placeholder={t.typeMessage}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-orange-500 transition-colors"
          />
          <button type="submit" className="p-3 bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors">
            <MessageSquare size={20} />
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all duration-300",
        active ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-white/40 hover:text-white/60"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}

function FlareCard({ flare, currentUserId, joinedFlareIds, onJoin, t }: { flare: Flare, currentUserId: string, joinedFlareIds: string[], onJoin: () => void, t: any, key?: string }) {
  const isOwn = flare.userId === currentUserId;
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = flare.expiresAt.toDate().getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const mins = Math.floor(diff / 60000);
      setTimeLeft(`${mins}m left`);
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [flare.expiresAt]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-white/20 transition-all group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl pointer-events-none group-hover:bg-orange-500/10 transition-colors" />
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img src={flare.userPhoto} alt="" className="w-10 h-10 rounded-full border border-white/10" referrerPolicy="no-referrer" />
          <div>
            <h4 className="font-bold text-sm">{flare.userName}</h4>
            <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
              <Clock size={10} />
              {timeLeft}
            </div>
          </div>
        </div>
        {isOwn && (
          <button 
            onClick={async () => {
              try {
                await updateDoc(doc(db, 'flares', flare.id), { active: false });
              } catch (e) {
                handleFirestoreError(e, OperationType.UPDATE, `flares/${flare.id}`);
              }
            }}
            className="p-2 text-white/20 hover:text-red-500 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 text-orange-500 rounded-full text-xs font-bold border border-orange-500/20">
          <BookOpen size={12} />
          {flare.subject}
        </div>
        {flare.description && (
          <p className="text-white/60 text-sm leading-relaxed">{flare.description}</p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <MapPin size={12} />
            <span>Nearby</span>
          </div>
          <div className="flex items-center gap-2 text-orange-500 text-[10px] font-bold uppercase tracking-widest">
            <Users size={12} />
            {t.partners}: {flare.currentPartners}/{flare.maxPartners}
          </div>
        </div>
        {!isOwn && (
          <button 
            onClick={onJoin}
            disabled={flare.currentPartners >= flare.maxPartners && !joinedFlareIds.includes(flare.id)}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
              (flare.currentPartners >= flare.maxPartners && !joinedFlareIds.includes(flare.id))
                ? "bg-white/5 text-white/20 cursor-not-allowed" 
                : "bg-white text-black hover:bg-orange-500 hover:text-white"
            )}
          >
            <MessageSquare size={14} />
            {(flare.currentPartners >= flare.maxPartners && !joinedFlareIds.includes(flare.id)) ? t.full : t.join}
          </button>
        )}
      </div>
    </motion.div>
  );
}
