#!/usr/bin/env bun
/**
 * Simple script to verify environment variables are loaded correctly
 * Run from root: bun run apps/backend/test-env.ts
 */

console.log("🔍 Checking Environment Variables...\n");

const requiredVars = {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_FROM: process.env.SMTP_FROM,
  FRONTEND_URL: process.env.FRONTEND_URL || process.env.NEXTAUTH_URL,
};

let allSet = true;

console.log("Environment Variables Status:");
console.log("─".repeat(50));

for (const [key, value] of Object.entries(requiredVars)) {
  const isSet = value !== undefined && value !== "";
  const displayValue = key === "SMTP_PASSWORD" 
    ? (isSet ? "***SET***" : "NOT SET")
    : (value || "NOT SET");
  
  const status = isSet ? "✅" : "❌";
  console.log(`${status} ${key.padEnd(20)} = ${displayValue}`);
  
  if (!isSet && key !== "FRONTEND_URL") {
    allSet = false;
  }
}

console.log("─".repeat(50));

if (allSet) {
  console.log("\n✅ All required SMTP variables are set!");
  console.log("\n🧪 Testing SMTP connection...\n");
  
  try {
    const nodemailer = await import("nodemailer");
    
    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    console.log("Verifying SMTP connection...");
    await transporter.verify();
    console.log("✅ SMTP connection verified successfully!");
    
    console.log("\n📧 Sending test email...");
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: "SMTP Test Email",
      text: "If you received this email, your SMTP configuration is working correctly!",
    });
    
    console.log(`✅ Test email sent! Message ID: ${info.messageId}`);
    console.log("\n🎉 Everything is working correctly!");
    
  } catch (error) {
    console.error("\n❌ SMTP test failed:");
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
      
      if (error.message.includes("Invalid login")) {
        console.error("\n💡 Tip: Check your SMTP_USER and SMTP_PASSWORD");
      } else if (error.message.includes("ECONNREFUSED") || error.message.includes("ETIMEDOUT")) {
        console.error(`\n💡 Tip: Cannot connect to ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
        console.error("   Check your SMTP_HOST and SMTP_PORT settings");
      } else if (error.message.includes("certificate")) {
        console.error("\n💡 Tip: SSL/TLS certificate error. Check SMTP_SECURE setting.");
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
} else {
  console.log("\n❌ Some required variables are missing!");
  console.log("\n💡 Make sure your .env file is in the root directory (/home/yunar/scrims/.env)");
  console.log("   and contains all SMTP configuration variables.");
  process.exit(1);
}










