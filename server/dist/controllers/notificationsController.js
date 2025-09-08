"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearMyNotifications = exports.deleteNotification = exports.markAsRead = exports.getMyNotifications = void 0;
const asyncHandler_1 = __importDefault(require("../middlewares/asyncHandler"));
const index_1 = require("../index");
// ✅ Get all notifications
exports.getMyNotifications = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: "Unauthorized" });
    const { rows } = await index_1.pool.query(`SELECT * FROM notifications WHERE "userId" = $1 ORDER BY "createdAt" DESC`, [req.user.id]);
    res.json(rows);
});
// ✅ Mark as read
exports.markAsRead = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const { rows } = await index_1.pool.query(`UPDATE notifications SET "isRead" = true WHERE id = $1 AND "userId" = $2 RETURNING *`, [id, req.user.id]);
    if (!rows.length)
        return res.status(404).json({ message: "Not found" });
    res.json(rows[0]);
});
// ✅ Delete single
exports.deleteNotification = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const { rowCount } = await index_1.pool.query(`DELETE FROM notifications WHERE id = $1 AND "userId" = $2`, [id, req.user.id]);
    if (!rowCount)
        return res.status(404).json({ message: "Not found" });
    res.json({ message: "Notification deleted" });
});
// ✅ Clear all
exports.clearMyNotifications = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: "Unauthorized" });
    await index_1.pool.query(`DELETE FROM notifications WHERE "userId" = $1`, [req.user.id]);
    res.json({ message: "All notifications cleared" });
});
