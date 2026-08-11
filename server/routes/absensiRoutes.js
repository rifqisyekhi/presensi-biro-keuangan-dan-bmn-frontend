const express = require('express');
const router = express.Router();
const Absensi = require('../models/Absensi');

function getTodayDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  return `${day}-${month}-${year}`;
}

// GET /api/absensi/:nip/:tanggal
router.get('/:nip/:tanggal', async (req, res) => {
  try {
    const { nip, tanggal } = req.params;

    const data = await Absensi.findOne({ nip, tanggal });

    if (!data) {
      return res.status(404).json({ message: 'Data absensi tidak ditemukan' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data absensi', error: error.message });
  }
});

// GET /api/absensi/pegawai/:nip
router.get('/pegawai/:nip', async (req, res) => {
  try {
    const { nip } = req.params;

    const data = await Absensi.find({ nip }).sort({ createdAt: -1 });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil riwayat absensi', error: error.message });
  }
});

// GET /api/absensi/today/:nip
router.get('/today/:nip', async (req, res) => {
  try {
    const { nip } = req.params;
    const tanggal = getTodayDate();

    const data = await Absensi.findOne({ nip, tanggal });

    if (!data) {
      return res.status(404).json({ message: 'Belum ada data absensi hari ini' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil absen hari ini', error: error.message });
  }
});

// POST /api/absensi/checkin
router.post('/checkin', async (req, res) => {
  try {
    const {
      nip,
      nama,
      jenis_absen,
      jam_checkin,
      lokasi_checkin,
      foto_checkin,
    } = req.body;

    if (!nip || !nama || !jenis_absen) {
      return res.status(400).json({ message: 'nip, nama, dan jenis_absen wajib diisi' });
    }

    const tanggal = getTodayDate();

    const existing = await Absensi.findOne({ nip, tanggal });

    if (existing) {
      existing.nama = nama;
      existing.jenis_absen = jenis_absen;
      existing.status_absen = 'clock_in';
      existing.jam_checkin = jam_checkin || existing.jam_checkin || null;
      existing.lokasi_checkin = lokasi_checkin || existing.lokasi_checkin;

      if (foto_checkin) {
        existing.foto_checkin = foto_checkin;
      }

      await existing.save();

      return res.status(200).json({ message: 'Check-in berhasil diperbarui', data: existing });
    }

    const data = new Absensi({
      nip,
      nama,
      tanggal,
      jenis_absen,
      status_absen: 'clock_in',
      jam_checkin,
      lokasi_checkin,
      foto_checkin,
      kinerja_harian: '',
      jam_checkout: null,
      foto_checkout: '',
      lokasi_checkout: null,
    });

    await data.save();

    res.status(201).json({ message: 'Check-in berhasil', data });
  } catch (error) {
    res.status(500).json({ message: 'Gagal check-in', error: error.message });
  }
});

// POST /api/absensi/checkout
router.post('/checkout', async (req, res) => {
  try {
    const {
      nip,
      jam_checkout,
      lokasi_checkout,
      foto_checkout,
    } = req.body;

    if (!nip) {
      return res.status(400).json({ message: 'nip wajib diisi' });
    }

    const tanggal = getTodayDate();

    const existing = await Absensi.findOne({ nip, tanggal });

    if (!existing) {
      return res.status(404).json({ message: 'Data check-in hari ini belum ada' });
    }

    existing.status_absen = 'clock_out';
    existing.jam_checkout = jam_checkout || existing.jam_checkout || null;
    existing.lokasi_checkout = lokasi_checkout || existing.lokasi_checkout;

    if (foto_checkout) {
      existing.foto_checkout = foto_checkout;
    }

    await existing.save();

    res.status(200).json({ message: 'Check-out berhasil', data: existing });
  } catch (error) {
    res.status(500).json({ message: 'Gagal check-out', error: error.message });
  }
});

// POST /api/absensi/kinerja
router.post('/kinerja', async (req, res) => {
  try {
    const { nip, kinerja_harian } = req.body;

    if (!nip) {
      return res.status(400).json({ message: 'nip wajib diisi' });
    }

    const tanggal = getTodayDate();

    const existing = await Absensi.findOne({ nip, tanggal });

    if (!existing) {
      return res.status(404).json({ message: 'Data absensi hari ini belum dibuat' });
    }

    existing.kinerja_harian = kinerja_harian || '';
    await existing.save();

    res.status(200).json({ message: 'Kinerja harian berhasil disimpan', data: existing });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menyimpan kinerja harian', error: error.message });
  }
});

module.exports = router;
