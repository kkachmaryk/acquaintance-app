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
  apiKey: "AIzaSyBgOBAT6dK5PnuRD-6XchHce2kwXd1TaSE",
  authDomain: "rtapp-c795f.firebaseapp.com",
  projectId: "rtapp-c795f",
  storageBucket: "rtapp-c795f.firebasestorage.app",
  messagingSenderId: "712624544807",
  appId: "1:712624544807:web:a1e1afc696a59897ce4202",
  measurementId: "G-6TW2BZ05Y9",
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
          currentMatch: null,
        };
        await setDoc(ref, currentProfile);
      } else {
        currentProfile = snap.data();
      }

      const all = await getDocs(collection(db, "users"));
      const arr: any[] = [];
      all.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setUsers(arr);

      // 🔥 СТАБІЛЬНИЙ MATCH
      let nextUser = null;

      if (currentProfile.currentMatch) {
        nextUser = arr.find(
          (u) => u.id === currentProfile.currentMatch
        );
      }

      if (!nextUser) {
        nextUser = getRandomUser(
          u.uid,
          arr,
          currentProfile.met || []
        );

        if (nextUser) {
          await updateDoc(ref, {
            currentMatch: nextUser.id,
          });
          currentProfile.currentMatch = nextUser.id;
        }
      }

      setProfile(currentProfile);
      setMatch(nextUser);
    });
  }, []);

  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      alert("Login failed. Check email or password.");
    }
  };

  const saveProfile = async () => {
    if (!nameInput || !countryInput) {
      alert("Please fill in all fields 🙂");
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

  const completeMeeting = async () => {
    if (!match) return;

    if (!confirm(`Did you REALLY meet ${match.name}? 🙂`))
      return;

    const ref = doc(db, "users", user.uid);

    const updatedMet = [...(profile.met || []), match.id];

    const updated = {
      ...profile,
      completed: (profile.completed || 0) + 1,
      met: updatedMet,
      currentMatch: null,
    };

    await updateDoc(ref, updated);
    setProfile(updated);

    const next = getRandomUser(user.uid, users, updatedMet);

    if (next) {
      await updateDoc(ref, { currentMatch: next.id });
      updated.currentMatch = next.id;
    }

    setMatch(next);
  };

  const undoMeeting = async () => {
    if (!profile.met?.length) return;

    const ref = doc(db, "users", user.uid);

    const updatedMet = profile.met.slice(0, -1);

    const updated = {
      ...profile,
      completed: Math.max(
        (profile.completed || 1) - 1,
        0
      ),
      met: updatedMet,
      currentMatch: null,
    };

    await updateDoc(ref, updated);
    setProfile(updated);

    const next = getRandomUser(user.uid, users, updatedMet);

    if (next) {
      await updateDoc(ref, { currentMatch: next.id });
      updated.currentMatch = next.id;
    }

    setMatch(next);
  };

  if (!user) {
    return (
      <div style={{ padding: 40 }}>
        <Image src="/logo.png" alt="Logo" width={140} height={140} />
        <h1>RT Meeting App</h1>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />
        <br /><br />

        <input
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />
        <br /><br />

        <button onClick={login}>Login</button>
      </div>
    );
  }

  if (!profile?.name) {
    return (
      <div style={{ padding: 40 }}>
        <Image src="/logo.png" alt="Logo" width={140} height={140} />
        <h2>Welcome 🙂 Tell us about yourself</h2>

        <input
          placeholder="Full name"
          value={nameInput}
          onChange={(e) =>
            setNameInput(e.target.value)
          }
        />
        <br /><br />

        <input
          placeholder="Country"
          value={countryInput}
          onChange={(e) =>
            setCountryInput(e.target.value)
          }
        />
        <br /><br />

        <button onClick={saveProfile}>Save</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <Image src="/logo.png" alt="Logo" width={140} height={140} />

      <h2>Welcome, {profile.name}</h2>
      <p>Country: {profile.country}</p>
      <p>Completed meetings: {profile.completed}</p>

      <button onClick={() => signOut(auth)}>
        Logout
      </button>

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

          {profile.met?.length > 0 && (
            <button
              onClick={undoMeeting}
              style={{ marginLeft: 10 }}
            >
              Undo
            </button>
          )}
        </div>
      ) : (
        <h3>🎉 You met everyone!</h3>
      )}

      <hr />

      <h3>Leaderboard</h3>

      {users
        .slice()
        .sort(
          (a, b) =>
            (b.completed || 0) -
            (a.completed || 0)
        )
        .map((u) => (
          <div key={u.id}>
            {u.name || "Unnamed"} —{" "}
            {u.completed || 0}
          </div>
        ))}

      {user.email === ADMIN_EMAIL && (
        <>
          <hr />
          <h2>ADMIN PANEL</h2>

          {users.map((u) => (
            <div key={u.id}>
              {u.name} — meetings:{" "}
              {u.completed || 0}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
