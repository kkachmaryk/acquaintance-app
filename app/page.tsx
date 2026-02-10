"use client";

import { useEffect, useState } from "react";
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

// ✅ ТИ — АДМІН
const ADMIN_EMAILS = ["khrystyna.kachmaryk@gmail.com"];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function buildPairs(users: any[]) {
  const shuffled = [...users].sort(() => Math.random() - 0.5);
  const pairs: any = {};

  for (let i = 0; i < shuffled.length - 1; i += 2) {
    const a = shuffled[i];
    const b = shuffled[i + 1];

    pairs[a.id] = b;
    pairs[b.id] = a;
  }

  return pairs;
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [pair, setPair] = useState<any>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("123456");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");

  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    onAuthStateChanged(auth, async (u) => {
      if (!u) return;

      setUser(u);

      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);

      let currentProfile;

      // ✅ автостворення профілю
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

      // ✅ всі користувачі
      const allSnap = await getDocs(collection(db, "users"));
      const allUsers: any[] = [];
      allSnap.forEach((d) => {
        allUsers.push({ id: d.id, ...d.data() });
      });

      setUsers(allUsers);

      // ✅ будуємо пари
      const remaining = allUsers.filter(
        (x) => !currentProfile.met.includes(x.id)
      );

      const pairs = buildPairs(remaining);
      setPair(pairs[u.uid] || null);
    });
  }, []);

  const login = async () => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const completeMeeting = async () => {
    if (!pair) return;

    const myRef = doc(db, "users", user.uid);
    const otherRef = doc(db, "users", pair.id);

    await updateDoc(myRef, {
      completed: profile.completed + 1,
      met: [...profile.met, pair.id],
    });

    await updateDoc(otherRef, {
      completed: (pair.completed || 0) + 1,
      met: [...(pair.met || []), user.uid],
    });

    setProfile({
      ...profile,
      completed: profile.completed + 1,
      met: [...profile.met, pair.id],
    });
  };

  // 🔐 LOGIN
  if (!user) {
    return (
      <div style={{ padding: 40 }}>
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

  // ✍️ FIRST LOGIN
  if (profile && (!profile.name || !profile.country)) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Welcome! Tell us about yourself 👇</h2>

        <input
          placeholder="Your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <br /><br />

        <input
          placeholder="Your country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />
        <br /><br />

        <button
          onClick={async () => {
            await updateDoc(doc(db, "users", user.uid), {
              name,
              country,
            });

            setProfile({
              ...profile,
              name,
              country,
            });
          }}
        >
          Save
        </button>
      </div>
    );
  }

  // 🤝 MAIN
  return (
    <div style={{ padding: 40 }}>
     <h2>Welcome, {profile?.name}</h2>
      <p>Country: {profile?.country}</p>
      <p>Completed meetings: {profile?.completed}</p>

      <button onClick={() => signOut(auth)}>Logout</button>

      <hr />

      {pair ? (
        <div>
          <h3>Your mutual pair:</h3>

          <p>
            <strong>{pair.name}</strong> ({pair.country})
          </p>

          <p>{pair.email}</p>

          <button onClick={completeMeeting}>
            We met ✅
          </button>
        </div>
      ) : (
        <h3>🎉 You met everyone!</h3>
      )}

      {/* ✅ ADMIN PANEL */}
      {isAdmin && (
        <>
          <hr />
          <h2>🛠 Admin Panel</h2>

          {users
            .slice()
            .sort((a, b) => b.completed - a.completed)
            .map((u) => (
              <div key={u.id}>
                <strong>{u.name || u.email}</strong> — {u.completed} meetings
                {u.completed === 0 && " 🚨"}
              </div>
            ))}
        </>
      )}
    </div>
  );
}
