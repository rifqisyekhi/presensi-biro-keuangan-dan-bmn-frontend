const mongoose = require('mongoose');

const absensiSchema = new mongoose.Schema(
  {
    nip: {
      type: String,
      required: true,
      index: true,
    },

    nama: {
      type: String,
      required: true,
    },

    tanggal: {
      type: String,
      required: true,
      match: /^\d{2}-\d{2}-\d{4}$/,
      index: true,
    },

    jenis_absen: {
      type: String,
      enum: ['WFH', 'WFO', 'DINAS'],
      required: true,
    },

    status_absen: {
      type: String,
      enum: ['belum_absen', 'clock_in', 'clock_out'],
      default: 'belum_absen',
    },

    jam_checkin: {
      type: String,
      default: null,
    },

    jam_checkout: {
      type: String,
      default: null,
    },

    kinerja_harian: {
      type: String,
      default: '',
    },

    foto_checkin: {
      type: String,
      default: '',
    },

    foto_checkout: {
      type: String,
      default: '',
    },

    lokasi_checkin: {
      lat: {
        type: Number,
        default: null,
      },
      lng: {
        type: Number,
        default: null,
      },
      alamat: {
        type: String,
        default: null,
      },
    },

    lokasi_checkout: {
      lat: {
        type: Number,
        default: null,
      },
      lng: {
        type: Number,
        default: null,
      },
      alamat: {
        type: String,
        default: null,
      },
    },
  },
  {
    collection: 'absensi',
    timestamps: true,
  }
);

module.exports = mongoose.model('Absensi', absensiSchema);
