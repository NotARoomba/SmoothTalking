import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local",
  );
}
const client = new MongoClient(MONGODB_URI);
const dbName = "SmoothTalking";
const usersCollection = "users";
const tokensCollection = "resetTokens";

export async function POST(request: Request) {
  const { email, token, newPassword } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection(usersCollection);
    const tokens = db.collection(tokensCollection);
    const user = await users.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (token) {
      const resetToken = await tokens.findOne({ token, userId: user.id });
      if (!resetToken) {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 400 },
        );
      }
      if (resetToken.expires < new Date()) {
        return NextResponse.json(
          { error: "Token has expired" },
          { status: 400 },
        );
      }
      if (!newPassword) {
        return NextResponse.json(
          { error: "New password is required" },
          { status: 400 },
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      console.log("Hashed Password:", hashedPassword);
      console.log("Original Password:", newPassword);
      await users.updateOne(
        { id: user.id },
        { $set: { password: hashedPassword } },
      );
      await tokens.deleteOne({ token, userId: user.id });
      return NextResponse.json(
        { message: "Password has been reset successfully" },
        { status: 200 },
      );
    } else {
      const newToken = uuidv4();
      const expires = new Date(Date.now() + 3600000);
      await tokens.insertOne({ userId: user.id, token: newToken, expires });
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      const resetLink = `http://${process.env.NEXTAUTH_URL}/reset-password?token=${newToken}&email=${email}`;
      const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Password Reset",
        text: `Click the link to reset your password: ${resetLink}`,
      };
      await transporter.sendMail(mailOptions);
      return NextResponse.json(
        { message: "Password reset email sent" },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    await client.close();
  }
}
