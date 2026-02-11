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
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = "khrystyna.kachmaryk@gmail.com";

function getRandomUser(currentId: string, users: any[], met: string[]) {
  const available = users.filter(
    (u) => u.id !== currentId && !met.includes(u.id)
  );
  if (!available.length) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [match, setMatch] = useState<any>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("123456");

  const [nameInput, setNameInput] = useState("");
  const [countryInput, setCountryInput] = useState("");

  useEffect(() => {
    onAuthStateChanged(auth, async (u) => {
      if (!u) return;

      setUser(u);

      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);

      let currentProfile;

      if (!snap.exists()) {
        currentProfile = {
          name: "",
          country: "",
          email: u.email,
          completed: 0,
          met: [],
        };

        await setDoc(ref, currentProfile);
      } else {
        currentProfile = snap.data();
      }

      setProfile(currentProfile);

      const all = await getDocs(collection(db, "users"));
      const arr: any[] = [];
      all.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setUsers(arr);

      const next = getRandomUser(u.uid, arr, currentProfile.met || []);
      setMatch(next);
    });
  }, []);

  const login = async () => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const saveProfile = async () => {
    const ref = doc(db, "users", user.uid);

    const updated = {
      ...profile,
      name: nameInput,
      country: countryInput,
    };

    await updateDoc(ref, updated);
    setProfile(updated);
  };

  const completeMeeting = async () => {
    if (!match) return;

    const ref = doc(db, "users", user.uid);
    const updatedMet = [...(profile.met || []), match.id];

    const updated = {
      ...profile,
      completed: (profile.completed || 0) + 1,
      met: updatedMet,
    };

    await updateDoc(ref, updated);
    setProfile(updated);

    const next = getRandomUser(user.uid, users, updatedMet);
    setMatch(next);
  };

  // LOGIN SCREEN
  if (!user) {
    return (
      <div style={{ padding: 40 }}>
        <Image src="/logo.png" alt="Logo" width={140} height={140} />

        <h1>Acquaintance App</h1>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <br /><br />

        <input
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br /><br />

        <button onClick={login}>Login</button>
      </div>
    );
  }

  // FIRST TIME PROFILE
  if (!profile?.name) {
    return (
      <div style={{ padding: 40 }}>
        <Image src="/logo.png" alt="Logo" width={140} height={140} />

        <h2>Welcome! Tell us about yourself 🙂</h2>

        <input
          placeholder="Full name"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
        />
        <br /><br />

        <input
          placeholder="Country"
          value={countryInput}
          onChange={(e) => setCountryInput(e.target.value)}
        />
        <br /><br />

        <button onClick={saveProfile}>Save</button>
      </div>
    );
  }

  // MAIN APP
  return (
    <div style={{ padding: 40 }}>
      <Image src="/logo.png" alt="Logo" width={140} height={140} />

      <h2>Welcome, {profile.name}</h2>
      <p>Country: {profile.country}</p>
      <p>Completed meetings: {profile.completed}</p>

      <button onClick={() => signOut(auth)}>Logout</button>

      <hr />

      {match ? (
        <div>
          <h3>Your next person:</h3>
          <p><strong>{match.name}</strong></p>
          <p>{match.country}</p>
          <p>{match.email}</p>

          <button onClick={completeMeeting}>
            We met ✅
          </button>
        </div>
      ) : (
        <h3>🎉 You met everyone!</h3>
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

      {user.email === ADMIN_EMAIL && (
        <>
          <hr />
          <h2>ADMIN PANEL</h2>

          {users.map((u) => (
            <div key={u.id}>
              {u.name} — meetings: {u.completed || 0}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
