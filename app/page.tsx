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

function pickSmartMatch(
  myId: string,
  users: any[],
  met: string[]
) {
  const available = users.filter(
    (u) =>
      u.id !== myId &&
      !met.includes(u.id) &&
      !(u.met || []).includes(myId) // 🔥 ключова перевірка
  );

  if (!available.length) return null;

  return available[
    Math.floor(Math.random() * available.length)
  ];
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [match, setMatch] = useState<any>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("123456");

  const [nameInput, setNameInput] = useState("");
  const [countryInput, setCountryInput] = useState("");

  // 🔥 ГЕНЕРАЦІЯ MATCH
  const generateMatch = async (uid: string, myMet: string[]) => {
    const snapshot = await getDocs(collection(db, "users"));

    const users: any[] = [];
    snapshot.forEach((d) =>
      users.push({ id: d.id, ...d.data() })
    );

    const smart = pickSmartMatch(uid, users, myMet);

    if (!smart) return null;

    await updateDoc(doc(db, "users", uid), {
      currentMatch: smart.id,
    });

    return smart;
  };

  useEffect(() => {
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

      // 🔥 якщо вже є match
      if (data.currentMatch) {
        const partner = await getDoc(
          doc(db, "users", data.currentMatch)
        );

        if (partner.exists()) {
          setMatch({
            id: partner.id,
            ...partner.data(),
          });
          return;
        }
      }

      // 🔥 інакше генеруємо
      const smart = await generateMatch(
        u.uid,
        data.met || []
      );

      setMatch(smart);
    });
  }, []);

  const login = async () => {
    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
    } catch {
      alert("Login failed");
    }
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

  // 🔥 CONFIRM MEETING (двосторонній запис)
  const confirmMeeting = async () => {
    if (!match) return;

    if (!confirm(`Did you REALLY meet ${match.name}?`))
      return;

    const myRef = doc(db, "users", user.uid);
    const theirRef = doc(db, "users", match.id);

    // записуємо ОБОМ
    await updateDoc(myRef, {
      met: arrayUnion(match.id),
      completed: (profile.completed || 0) + 1,
      currentMatch: null,
    });

    await updateDoc(theirRef, {
      met: arrayUnion(user.uid),
    });

    const newMet = [...(profile.met || []), match.id];

    const next = await generateMatch(
      user.uid,
      newMet
    );

    setProfile({
      ...profile,
      met: newMet,
      completed: (profile.completed || 0) + 1,
      currentMatch: next?.id || null,
    });

    setMatch(next);
  };

  // LOGIN
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

  return (
    <div style={{ padding: 40 }}>
      <Image src="/logo.png" alt="Logo" width={140} height={140} />

      <h2>Welcome, {profile.name}</h2>
      <p>Meetings completed: {profile.completed}</p>

      <button onClick={() => signOut(auth)}>
        Logout
      </button>

      <hr />

      {match ? (
        <div>
          <h3>Your next meeting partner:</h3>

          <p><strong>{match.name}</strong></p>
          <p>{match.country}</p>
          <p>{match.email}</p>

          <button onClick={confirmMeeting}>
            ✅ Confirm meeting
          </button>

          <p style={{ fontSize: 14, opacity: 0.6 }}>
            Press only AFTER you actually meet 🙂
          </p>
        </div>
      ) : (
        <h3>🎉 You met everyone!</h3>
      )}
    </div>
  );
}
