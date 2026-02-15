"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBgOBAT6dK5PnuRD-6XchHce2kwXd1TaSE",
  authDomain: "rtapp-c795f.firebaseapp.com",
  projectId: "rtapp-c795f",
  storageBucket: "rtapp-c795f.firebasestorage.app",
  messagingSenderId: "712624544807",
  appId: "1:712624544807:web:a1e1afc696a59897ce4202",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = "khrystyna.kachmaryk@gmail.com";

function pickSmartMatch(myId: string, users: any[], met: string[]) {
  const available = users.filter(
    (u) =>
      u.id !== myId &&
      !(met || []).includes(u.id) &&
      !(u.met || []).includes(myId)
  );

  if (!available.length) return null;

  return available[Math.floor(Math.random() * available.length)];
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [match, setMatch] = useState<any>(null);
  const [eventStarted, setEventStarted] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("123456");

  const [nameInput, setNameInput] = useState("");
  const [countryInput, setCountryInput] = useState("");

  // LOAD USERS
  const loadUsers = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const arr: any[] = [];
    snapshot.forEach((d) => arr.push({ id: d.id, ...d.data() }));
    setUsers(arr);
    return arr;
  };

  // LOAD EVENT STATE
  const loadEventState = async () => {
    const ref = doc(db, "settings", "event");
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, { started: false });
      setEventStarted(false);
    } else {
      setEventStarted(snap.data().started);
    }
  };

  // GENERATE MATCH
  const generateMatch = async (uid: string, metList: string[]) => {
    const freshUsers = await loadUsers();
    const smart = pickSmartMatch(uid, freshUsers, metList);

    if (!smart) return null;

    await updateDoc(doc(db, "users", uid), {
      currentMatch: smart.id,
    });

    return smart;
  };

  useEffect(() => {
    loadEventState();

    onAuthStateChanged(auth, async (u) => {
      if (!u) return;

      setUser(u);

      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);

      let data;

      if (!snap.exists()) {
        data = {
          name: "",
          country: "",
          email: u.email,
          met: [],
          completed: 0,
          currentMatch: null,
        };
        await setDoc(ref, data);
      } else {
        data = snap.data();
      }

      setProfile(data);

      const allUsers = await loadUsers();

      if (!eventStarted) return;

      if (data.currentMatch) {
        const partner = allUsers.find((x) => x.id === data.currentMatch);
        if (partner) {
          setMatch(partner);
          return;
        }
      }

      const smart = pickSmartMatch(u.uid, allUsers, data.met || []);

      if (smart) {
        await updateDoc(ref, { currentMatch: smart.id });
      }

      setMatch(smart);
    });
  }, [eventStarted]);

  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      alert("Login failed");
    }
  };

  const saveProfile = async () => {
    if (!nameInput || !countryInput) {
      alert("Fill all fields 🙂");
      return;
    }

    const ref = doc(db, "users", user.uid);

    const updated = {
      ...profile,
      name: nameInput,
      country: countryInput,
    };

    await updateDoc(ref, updated);
    setProfile(updated);
  };

  const confirmMeeting = async () => {
    if (!match) return;
    if (profile.currentMatch !== match.id) return;

    if (!confirm(`Did you REALLY meet ${match.name}?`)) return;

    const myRef = doc(db, "users", user.uid);
    const theirRef = doc(db, "users", match.id);

    await updateDoc(myRef, {
      met: arrayUnion(match.id),
      completed: (profile.completed || 0) + 1,
      currentMatch: null,
    });

    await updateDoc(theirRef, {
      met: arrayUnion(user.uid),
    });

    const newMet = [...(profile.met || []), match.id];

    const next = await generateMatch(user.uid, newMet);

    setProfile({
      ...profile,
      met: newMet,
      completed: (profile.completed || 0) + 1,
      currentMatch: next?.id || null,
    });

    setMatch(next);
  };

  const undoMeeting = async () => {
    if (!profile.met?.length) {
      alert("No meeting to undo");
      return;
    }

    const lastMetId = profile.met[profile.met.length - 1];
    const previousUser = users.find((u) => u.id === lastMetId);

    const myRef = doc(db, "users", user.uid);
    const theirRef = doc(db, "users", lastMetId);

    await updateDoc(myRef, {
      met: profile.met.slice(0, -1),
      completed: Math.max((profile.completed || 1) - 1, 0),
      currentMatch: lastMetId,
    });

    await updateDoc(theirRef, {
      met: arrayRemove(user.uid),
    });

    setProfile({
      ...profile,
      met: profile.met.slice(0, -1),
      completed: Math.max((profile.completed || 1) - 1, 0),
      currentMatch: lastMetId,
    });

    setMatch(previousUser);
  };

  // LOGIN
  if (!user) {
    return (
      <div style={{ padding: 40 }}>
        <Image src="/logo.png" alt="Logo" width={140} height={140} />
        <h1>RT Meeting App</h1>

        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <br /><br />

        <input placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <br /><br />

        <button onClick={login}>Login</button>
      </div>
    );
  }

  // FIRST LOGIN
  if (!profile?.name) {
    return (
      <div style={{ padding: 40 }}>
        <Image src="/logo.png" alt="Logo" width={140} height={140} />

        <h2>Tell us about yourself 🙂</h2>

        <input placeholder="Full name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
        <br /><br />

        <input placeholder="Country" value={countryInput} onChange={(e) => setCountryInput(e.target.value)} />
        <br /><br />

        <button onClick={saveProfile}>Save</button>
      </div>
    );
  }

  // WAITING SCREEN (with logout + profile visible)
if (!eventStarted) {
  return (
    <div style={{ padding: 40 }}>
      <Image src="/logo.png" alt="Logo" width={140} height={140} />

      <h2>Welcome, {profile.name}</h2>
      <p>⏳ Event has not started yet</p>
      <p>Please wait for organizer 🙂</p>

      <button onClick={() => signOut(auth)}>Logout</button>

      {user.email === ADMIN_EMAIL && (
        <>
          <hr />
          <h3>ADMIN PANEL</h3>

          <button
  className="primary-btn"
  onClick={async () => {
    await setDoc(doc(db, "settings", "event"), {
      started: true,
    });
    setEventStarted(true);
    location.reload();
  }}
>
  🚀 Start Event
</button>
        </>
      )}
    </div>
  );
}


  // MAIN APP
  return (
    <div style={{ padding: 40 }}>
      <Image src="/logo.png" alt="Logo" width={140} height={140} />

      <h2>Welcome, {profile.name}</h2>
      <p>Meetings completed: {profile.completed}</p>

      <button onClick={() => signOut(auth)}>Logout</button>

      <hr />

      {match ? (
        <div>
          <h3>Your next meeting partner:</h3>

          <p><strong>{match.name}</strong></p>
          <p>{match.country}</p>
          <p>{match.email}</p>

          <button className="primary-btn" onClick={confirmMeeting}>
          <button onClick={undoMeeting} style={{ marginLeft: 10 }}>↩️ Return</button>

          <p style={{ fontSize: 14, opacity: 0.6 }}>
            Press only AFTER you actually meet 🙂
          </p>
        </div>
      ) : (
        <h3>No new matches available right now 🙂</h3>
      )}

      <hr />
      <h3>Leaderboard</h3>

      {users
        .slice()
        .sort((a, b) => (b.completed || 0) - (a.completed || 0))
        .map((u) => (
          <div key={u.id}>
            {u.name || "Unnamed"} — {u.completed || 0}
          </div>
        ))}
    </div>
  );
}
