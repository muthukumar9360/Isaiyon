import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

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

const initialTracks = [
  {
    id: "ynm-venmegam",
    title: "Venmegam",
    movie: "Yaaradi Nee Mohini",
    artist: "Hariharan",
    composer: "Yuvan Shankar Raja",
    actors: "Dhanush, Nayanthara, Raghuvaran",
    genre: "Melody / Soul",
    mood: "Love Failure",
    duration: 278,
    year: "2008",
    audioUrl: "https://archive.org/download/muthuramalingam_a-vault/Yaaradi_Nee_Mohini/Venmegam/Venmegam.mp4",
    coverUrl: "https://archive.org/download/muthuramalingam_a-vault/Yaaradi_Nee_Mohini/Venmegam/Venmegam.webp",
    archiveAudioPath: "Yaaradi_Nee_Mohini/Venmegam/Venmegam.mp4",
    archiveThumbPath: "Yaaradi_Nee_Mohini/Venmegam/Venmegam.webp",
    vaultIdentifier: "muthuramalingam_a-vault"
  },
  {
    id: "un-ennai-thaalattum",
    title: "Ennai Thaalattum",
    movie: "Unnai Ninaithu",
    artist: "Hariharan, Bhavatharini",
    composer: "Sirpy",
    actors: "Suriya, Laila, Sneha",
    genre: "Melody / Soul",
    mood: "Love Failure",
    duration: 295,
    year: "2002",
    audioUrl: "https://archive.org/download/muthuramalingam_a-vault/Unnai_Ninaithu/Ennai_Thaalattum/Ennai_Thaalattum.mp4",
    coverUrl: "https://archive.org/download/muthuramalingam_a-vault/Unnai_Ninaithu/Ennai_Thaalattum/Ennai_Thaalattum.webp",
    archiveAudioPath: "Unnai_Ninaithu/Ennai_Thaalattum/Ennai_Thaalattum.mp4",
    archiveThumbPath: "Unnai_Ninaithu/Ennai_Thaalattum/Ennai_Thaalattum.webp",
    vaultIdentifier: "muthuramalingam_a-vault"
  }
];

async function seed() {
  console.log("Seeding tracks into Firestore...");
  for (const track of initialTracks) {
    await setDoc(doc(db, "tracks", track.id), {
      ...track,
      createdAt: serverTimestamp()
    });
    console.log(`Saved: ${track.movie} - ${track.title}`);
  }
  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seeding error:", err);
  process.exit(1);
});
