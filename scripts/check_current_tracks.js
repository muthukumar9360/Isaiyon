import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA1uqaS3akPaF43cYWIJSoBRkD-yVRM71A",
  authDomain: "music-player-d0eb8.firebaseapp.com",
  projectId: "music-player-d0eb8",
  storageBucket: "music-player-d0eb8.firebasestorage.app",
  messagingSenderId: "167959878686",
  appId: "1:167959878686:web:199f75f091d0e3d59ca20f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkTracks() {
  const snap = await getDocs(collection(db, 'tracks'));
  console.log(`Found ${snap.size} tracks in Firestore:`);
  snap.forEach(d => {
    const data = d.data();
    console.log(`- [${d.id}] "${data.title}" | Movie: "${data.movie}" | Actors: "${data.actors}" | Artist: "${data.artist}" | Composer: "${data.composer}" | Genre: "${data.genre}" | Mood: "${data.mood}" | Audio: "${data.audioUrl?.slice(0, 40)}"`);
  });
  process.exit(0);
}

checkTracks().catch(err => {
  console.error("Error fetching tracks:", err);
  process.exit(1);
});
