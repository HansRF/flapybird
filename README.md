# Flappy Bot Game Template

Template game Flappy Bot dengan leaderboard berbasis Firebase Firestore.

## Menjalankan game

1. Sajikan folder ini melalui server lokal atau hosting statis. Karena aplikasi menggunakan JavaScript modules, jangan membukanya langsung melalui `file://`.
2. Game dapat dimainkan tanpa Firebase; leaderboard dan penyimpanan skor aktif setelah konfigurasi Firebase diisi.

## Mengaktifkan leaderboard

1. Buat proyek Firebase dan aplikasi Web di Firebase Console.
2. Salin konfigurasi aplikasi Web ke `firebase-config.js`, mengganti semua nilai `YOUR_...`.
3. Aktifkan Cloud Firestore dan siapkan aturan Firestore yang sesuai untuk aplikasi sebelum menerima skor pengguna.

Konfigurasi Firebase Web digunakan oleh browser dan bukan tempat menyimpan rahasia server. Lindungi proyek dengan aturan Firestore dan pembatasan API key yang sesuai.

## Kustomisasi

- Ubah nama, deskripsi, petunjuk, dan isi halaman di `index.html`.
- Sesuaikan warna, tata letak, dan breakpoint di `style.css`.
- Ubah mekanika game serta koleksi `scores` di `script.js`.
- Ganti gambar dan audio di folder `assets/`.
