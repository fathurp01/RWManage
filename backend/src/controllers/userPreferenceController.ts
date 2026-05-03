import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

interface UpdatePreferenceBody {
  dark_mode?: boolean;
  tema_warna?: string;
  bahasa?: string;
  notifikasi_email?: boolean;
  notifikasi_sms?: boolean;
}

export const getUserPreference = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    let preference = await prisma.userPreference.findUnique({
      where: { user_id: req.user.id },
    });

    if (!preference) {
      // Buat preference default jika belum ada
      preference = await prisma.userPreference.create({
        data: {
          user_id: req.user.id,
          dark_mode: false,
          tema_warna: "blue",
          bahasa: "id",
          notifikasi_email: true,
          notifikasi_sms: false,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Preferensi pengguna berhasil diambil.",
      data: preference,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil preferensi pengguna.",
    });
  }
};

export const updateUserPreference = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    const {
      dark_mode,
      tema_warna,
      bahasa,
      notifikasi_email,
      notifikasi_sms,
    } = req.body as UpdatePreferenceBody;

    // Validasi tema_warna jika diberikan
    const validThemes = ["blue", "red", "green", "purple", "orange"];
    if (tema_warna && !validThemes.includes(tema_warna)) {
      res.status(400).json({
        success: false,
        message:
          "tema_warna harus salah satu dari: blue, red, green, purple, orange.",
      });
      return;
    }

    // Validasi bahasa jika diberikan
    const validLanguages = ["id", "en"];
    if (bahasa && !validLanguages.includes(bahasa)) {
      res.status(400).json({
        success: false,
        message: "bahasa harus salah satu dari: id, en.",
      });
      return;
    }

    let preference = await prisma.userPreference.findUnique({
      where: { user_id: req.user.id },
    });

    if (!preference) {
      // Buat preference default jika belum ada
      preference = await prisma.userPreference.create({
        data: {
          user_id: req.user.id,
          dark_mode: false,
          tema_warna: "blue",
          bahasa: "id",
          notifikasi_email: true,
          notifikasi_sms: false,
        },
      });
    }

    // Update hanya field yang diberikan
    const updated = await prisma.userPreference.update({
      where: { user_id: req.user.id },
      data: {
        ...(typeof dark_mode !== "undefined" && { dark_mode }),
        ...(tema_warna && { tema_warna }),
        ...(bahasa && { bahasa }),
        ...(typeof notifikasi_email !== "undefined" && { notifikasi_email }),
        ...(typeof notifikasi_sms !== "undefined" && { notifikasi_sms }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Preferensi pengguna berhasil diupdate.",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengupdate preferensi pengguna.",
    });
  }
};

export const toggleDarkMode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    let preference = await prisma.userPreference.findUnique({
      where: { user_id: req.user.id },
    });

    if (!preference) {
      // Buat preference default
      preference = await prisma.userPreference.create({
        data: {
          user_id: req.user.id,
          dark_mode: true,
          tema_warna: "blue",
          bahasa: "id",
          notifikasi_email: true,
          notifikasi_sms: false,
        },
      });
    } else {
      // Toggle dark mode
      preference = await prisma.userPreference.update({
        where: { user_id: req.user.id },
        data: { dark_mode: !preference.dark_mode },
      });
    }

    res.status(200).json({
      success: true,
      message: `Mode gelap ${preference.dark_mode ? "diaktifkan" : "dinonaktifkan"}.`,
      data: preference,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengubah mode gelap.",
    });
  }
};

export const resetPreference = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "User belum terautentikasi.",
      });
      return;
    }

    const preference = await prisma.userPreference.update({
      where: { user_id: req.user.id },
      data: {
        dark_mode: false,
        tema_warna: "blue",
        bahasa: "id",
        notifikasi_email: true,
        notifikasi_sms: false,
      },
    });

    res.status(200).json({
      success: true,
      message: "Preferensi pengguna berhasil direset ke default.",
      data: preference,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mereset preferensi pengguna.",
    });
  }
};
