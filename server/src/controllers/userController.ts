import { NextFunction, Request, Response } from "express";
import dotenv from "dotenv"
import asyncHandler from "../middlewares/asyncHandler";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken";
import { UserRequest } from "../utils/types/userTypes";
import {pool} from "../index"
import { createAndSendNotification } from "../services/notificationService";



dotenv.config()
//Debugging  - check if env var are loaded correctly  

const jwtSecret:any = process.env.ACCESS_TOKEN_SECRET;
const refreshSecret:any= process.env.REFRESH_TOKEN_SECRET;

const generateToken = (res: Response, id: string, role: string) => {
  if (!jwtSecret || !refreshSecret) {
      throw new Error("ACCESS_TOKEN_SECRET or REFRESH_TOKEN_SECRET is not defined in environment variables");
  }

  try {
      const accessToken = jwt.sign({ id, role }, jwtSecret, { expiresIn: "1d" });
      const refreshToken = jwt.sign({ id }, refreshSecret, { expiresIn: "30d" });

      res.cookie("access_token", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV !== "production",
          sameSite: "strict",
          maxAge: 24 * 60 * 60 * 1000 // 1 day in ms
      });

      res.cookie("refresh_token", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV !== "production",
          sameSite: "strict",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      return { accessToken, refreshToken, expiresIn: 900 }; // 900s = 15min
  } catch (error) {
      console.error("Error generating JWT:", error);
      throw new Error("Error generating authentication tokens");
  }
};


/** Create a new user */
export const createUser = asyncHandler(async (req:Request, res:Response) => {
  const { email, phone, password, firstName, lastName, role } = req.body;

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const { rows } = await pool.query(
    `INSERT INTO users (email, phone, password, "firstName", "lastName", role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, "firstName", "lastName", role, "isActive"`,
    [email, phone, hashedPassword, firstName, lastName, role.toUpperCase()]
  );

  const user = rows[0];

  // Notify all admins
  await createAndSendNotification({
    role: "ADMIN",
    title: "New user registration",
    message: `New user ${user.email} registered and is awaiting approval.`,
    type: "GENERAL",
    data: { id: user.id, email: user.email },
  });

  // Notify the user
  await createAndSendNotification({
    userId: user.id,
    title: "Account pending approval",
    message: "Thanks for signing up! An admin will review your account shortly.",
    type: "GENERAL",
  });

  res.status(201).json({
    message: "Account created. Please wait for admin approval.",
    user,
  });
});

/** Login user and return JWT */
export const loginUser = asyncHandler(async (req:Request, res:Response) => {
  const { email, password } = req.body;

  const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  if (!rows.length) return res.status(401).json({ message: "Invalid email or password" });

  const user = rows[0];

  if (!user.isActive) {
    return res.status(403).json({
      message: "Your account is pending admin approval. Please wait before logging in.",
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

  const tokens = await generateToken(res, user.id, user.role);

  return res.status(200).json({
    message: "Login successful",
    accessToken: tokens.accessToken,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

export const getMe = asyncHandler(async (req: UserRequest, res: Response) => {
  // console.log("🔥 getMe endpoint hit");
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Fetch the user from DB to get the latest info
  const { rows } = await pool.query(
    `SELECT id, email, phone, "firstName", "lastName", avatar, role, "isActive", "isVerified", "createdAt", "updatedAt"
     FROM users
     WHERE id = $1`,
    [req.user.id]
  );

  if (!rows.length) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(rows[0]);
});

export const logoutUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  //We need to immedietly invalidate the access token and the refreh token 
  res.cookie("access_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "production",
      sameSite: "strict",
      expires: new Date(0) // Expire immediately
  });

  res.cookie("refresh_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "production",
      sameSite: "strict",
      expires: new Date(0) // Expire immediately
  });

  res.status(200).json({ message: "User logged out successfully" });
});

export const approveUser = asyncHandler(async (req: UserRequest, res: Response) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Only admins can approve users" });
  }

  const { id } = req.params;

  const { rows } = await pool.query(
    `UPDATE users SET "isActive" = true WHERE id = $1 RETURNING *`,
    [id]
  );

  if (!rows.length) return res.status(404).json({ message: "User not found" });

  const user = rows[0];

  await createAndSendNotification({
    userId: user.id,
    title: "Account approved 🎉",
    message: "Your account has been approved! You can now log in.",
    type: "GENERAL",
  });

  res.json({ message: "User approved successfully", user });
});

/**
 * Suspend a user (Admins only)
 */
export const suspendUser = asyncHandler(async (req: UserRequest, res: Response) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Only admins can suspend users" });
  }

  const { id } = req.params;

  const { rows } = await pool.query(
    `UPDATE users SET "isActive" = false WHERE id = $1 RETURNING *`,
    [id]
  );

  if (!rows.length) return res.status(404).json({ message: "User not found" });

  const user = rows[0];

  await createAndSendNotification({
    userId: user.id,
    title: "Account suspended ⛔",
    message: "Your account has been suspended. Please contact support.",
    type: "GENERAL",
  });

  res.json({ message: "User suspended successfully", user });
});

/** Get all users */
export const getAllUsers = asyncHandler(async (req: Request, res: Response)=> {
  try {
    const { rows } = await pool.query(`SELECT * FROM users`);
    res.json(rows);
  } catch (error:any) {
    res.status(500).json({ message: error.message });
  }
})

/** Get user by ID */
export const getUserById = asyncHandler(async (req: Request, res: Response)=> {
  try {
    const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (error:any) {
    res.status(500).json({ message: error.message });
  }
})

/** Update user */
export const updateUser = asyncHandler(async (req: Request, res: Response)=> {
  try {
    const { name, email, role } = req.body;
    const query = `UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4 RETURNING *`;
    const values = [name, email, role, req.params.id];
    const { rows } = await pool.query(query, values);
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (error:any) {
    res.status(500).json({ message: error.message });
  }
})

/** Delete user */
export const deleteUser= asyncHandler(async (req: Request, res: Response)=> {
  try {
    const { rowCount } = await pool.query(`DELETE FROM users WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (error:any) {
    res.status(500).json({ message: error.message });
  }
})
