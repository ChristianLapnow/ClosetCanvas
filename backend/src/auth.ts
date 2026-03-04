import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { prisma } from "./prisma";
import { env } from "./env";

// In-memory OTP store for dev mode (when no email service configured)
// Maps email -> { otp, expiresAt }
export const devOtpStore = new Map<string, { otp: string; expiresAt: number }>();

async function sendEmail({ to, subject, html, otp }: { to: string; subject: string; html: string; otp?: string }) {
  // Always store OTP as fallback regardless of email service
  if (otp) {
    devOtpStore.set(to.toLowerCase(), { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
  }

  // 1. Gmail SMTP
  if (env.SMTP_USER && env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: env.SMTP_HOST || "smtp.gmail.com",
        port: Number(env.SMTP_PORT) || 587,
        secure: false,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: `Closet Canvas <${env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      console.log(`[SMTP] Sent to ${to}`);
      return;
    } catch (err) {
      console.error(`[SMTP] Failed to send to ${to}:`, err);
    }
  }

  // 2. Resend fallback
  if (env.RESEND_API_KEY) {
    try {
      const resend = new Resend(env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: env.EMAIL_FROM || "Closet Canvas <onboarding@resend.dev>",
        to,
        subject,
        html,
      });
      console.log(`[RESEND] to=${to} id=${result.data?.id} error=${JSON.stringify(result.error)}`);
    } catch (err) {
      console.error(`[RESEND] Failed:`, err);
    }
  }

  console.log(`[EMAIL FALLBACK] OTP for ${to} stored in memory (shown on verify page)`);
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BACKEND_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Closet Canvas password",
        html: `<p>Click <a href="${url}">here</a> to reset your password. This link expires in 1 hour.</p>`,
      });
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 600, // 10 minutes
      async sendVerificationOTP({ email, otp, type }) {
        const subject =
          type === "email-verification"
            ? "Verify your Closet Canvas account"
            : "Your Closet Canvas OTP";
        const html = `
          <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
            <h2 style="color:#C9A96E;margin-bottom:8px">Closet Canvas</h2>
            <p style="color:#666;margin-bottom:24px">
              ${type === "email-verification" ? "Thanks for signing up! Please verify your email address." : "Your one-time password:"}
            </p>
            <div style="background:#f5f5f5;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
              <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#333">${otp}</span>
            </div>
            <p style="color:#999;font-size:12px">This code expires in 10 minutes. Do not share it with anyone.</p>
          </div>
        `;
        await sendEmail({ to: email, subject, html, otp });
      },
    }),
  ],
  trustedOrigins: [
    "http://localhost:*",
    "http://127.0.0.1:*",
    "https://*.dev.vibecode.run",
    "https://*.vibecode.run",
    "https://*.vibecodeapp.com",
    "https://*.vibecode.dev",
    "https://vibecode.dev",
  ],
  advanced: {
    trustedProxyHeaders: true,
    disableCSRFCheck: true,
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      partitioned: true,
    },
  },
});
