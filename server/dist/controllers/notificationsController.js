import asyncHandler from "../middlewares/asyncHandler";
import { pool } from "../index";
// ✅ Get all notifications
export const getMyNotifications = asyncHandler(async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: "Unauthorized" });
    const { rows } = await pool.query(`SELECT * FROM notifications WHERE "userId" = $1 ORDER BY "createdAt" DESC`, [req.user.id]);
    res.json(rows);
});
// ✅ Mark as read
export const markAsRead = asyncHandler(async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const { rows } = await pool.query(`UPDATE notifications SET "isRead" = true WHERE id = $1 AND "userId" = $2 RETURNING *`, [id, req.user.id]);
    if (!rows.length)
        return res.status(404).json({ message: "Not found" });
    res.json(rows[0]);
});
// ✅ Delete single
export const deleteNotification = asyncHandler(async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const { rowCount } = await pool.query(`DELETE FROM notifications WHERE id = $1 AND "userId" = $2`, [id, req.user.id]);
    if (!rowCount)
        return res.status(404).json({ message: "Not found" });
    res.json({ message: "Notification deleted" });
});
// ✅ Clear all
export const clearMyNotifications = asyncHandler(async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: "Unauthorized" });
    await pool.query(`DELETE FROM notifications WHERE "userId" = $1`, [req.user.id]);
    res.json({ message: "All notifications cleared" });
});
