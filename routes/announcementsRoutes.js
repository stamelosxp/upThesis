const express = require("express");
const router = express.Router();

const Announcement = require("../models/Announcement");

// 1. Helper function to get paginated announcements
async function getPaginatedAnnouncements(req) {
  const pageSize = 5;
  const page = Math.max(1, parseInt(req.query.page || "1", 10));

  // Count total documents
  const totalCount = await Announcement.countDocuments();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;

  // Fetch paginated announcements, sorted by updatedAt descending
  const pageItems = await Announcement.find()
    .sort({ updatedAt: -1 }) // descending order
    .skip(skip)
    .limit(pageSize)
    .lean(); // return plain JS objects

  return {
    pageItems,
    totalPages,
    currentPage: safePage,
    pageSize,
    totalCount,
  };
}

// 2. Endpoint to get paginated announcements (public)
router.get("/", async (req, res) => {
  try {
    const { pageItems, totalPages, currentPage, totalCount, pageSize } =
      await getPaginatedAnnouncements(req);

    res.json({
      success: true,
      announcements: pageItems,
      pagination: { totalPages, currentPage, totalCount, pageSize },
    });
  } catch (e) {
    console.error("Error loading announcements from database", e);
    res
      .status(500)
      .json({ success: false, error: "Failed to load announcements" });
  }
});

module.exports = router;
