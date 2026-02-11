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
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = "khrystyna.kachmaryk@gmail.com";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [pair, setPair] = useState<any>(null);

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
          met: false,
          pairId: null,
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

      if (currentProfile.pairId) {
        const foundPair = arr.find(
          (x) => x.id === currentProfile.pairId
        );
        setPair(foundPair);
      }
    });
  }, []);

  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      alert("Login failed. Check email/password.");
    }
  };

  const saveProfile = async () => {
    if (!nameInput || !countryInput) {
      alert("Please fill all fields 🙂");
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
    if (!pair) return;

    const ok = confirm(
      `Did you REALLY meet ${pair.name} in person? 🙂`
    );

    if (!ok) return;

    const ref = doc(db, "users", user.uid);

    const updated = {
      ...profile,
      met: true,
      completed: (profile.completed || 0) + 1,
    };

    await updateDoc(ref, updated);
    setProfile(updated);
  };

  // 🔥 ADMIN — GENERATE PAIRS
  const generatePairs = async () => {
    if (!confirm("Generate NEW pairs?")) return;

    const shuffled = [...users].sort(
      () => Math.random() - 0.5
    );

    for (let i = 0; i < shuffled.length; i += 2) {
      const a = shuffled[i];
      const b = shuffled[i + 1];

      if (!b) break;

      await updateDoc(doc(db, "users", a.id), {
        pairId: b.id,
        met: false,
      });

      await updateDoc(doc(db, "users", b.id), {
        pairId: a.id,
        met: false,
      });
    }

    alert("🔥 Pairs generated!");
    location.reload();
  };

  // LOGIN SCREEN
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

  // FIRST LOGIN
  if (!profile?.name) {
    return (
      <div style={{ padding: 40 }}>
        <Image src="/logo.png" alt="Logo" width={140} height={140} />

        <h2>Tell us about yourself 🙂</h2>

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

  // MAIN APP
  return (
    <div style={{ padding: 40 }}>
      <Image src="/logo.png" alt="Logo" width={140} height={140} />

      <h2>Welcome, {profile.name}</h2>
      <p>Meetings completed: {profile.completed || 0}</p>

      <button onClick={() => signOut(auth)}>
        Logout
      </button>

      <hr />

      {pair ? (
        <div>
          <h3>Your meeting partner:</h3>

          <p><strong>{pair.name}</strong></p>
          <p>{pair.country}</p>
          <p>{pair.email}</p>

          {!profile.met ? (
            <>
              <button onClick={confirmMeeting}>
                ✅ Confirm meeting
              </button>

              <p style={{ fontSize: 14, opacity: 0.6 }}>
                Press only AFTER you actually meet in person 🙂
              </p>
            </>
          ) : (
            <h3>✅ Meeting confirmed!</h3>
          )}
        </div>
      ) : (
        <h3>Admin will assign your partner soon 🙂</h3>
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

          <button onClick={generatePairs}>
            🔥 Generate pairs
          </button>

          {users.map((u) => (
            <div key={u.id}>
              {u.name} — met:{" "}
              {u.met ? "YES" : "NO"}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
