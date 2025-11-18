import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import type { CSSProperties } from "react";

interface PasswordResetOTPProps {
  username: string;
  otpCode: string;
  resetUrl?: string;
}

export const PasswordResetOTP = ({
  username,
  otpCode,
  resetUrl = "https://trayb.az/reset-password",
}: PasswordResetOTPProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your Trayb password reset code: {otpCode}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo/Brand Section */}
          <Section style={header}>
            <Heading style={logo}>Trayb</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={heading}>Reset Your Password</Heading>
            <Text style={text}>Hi {username},</Text>
            <Text style={text}>
              You requested to reset your password. Please use the following verification code to reset your password:
            </Text>

            {/* OTP Code Display */}
            <Section style={otpContainer}>
              <Text style={otpCodeStyle}>{otpCode}</Text>
            </Section>

            {/* CTA Button */}
            {resetUrl && (
              <Section style={buttonContainer}>
                <Link href={resetUrl} style={button}>
                  Go to Password Reset Page
                </Link>
              </Section>
            )}

            <Text style={footerText}>
              This verification code will expire in 15 minutes. If you didn't request a password reset, please ignore this email and secure your account.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Trayb. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main: CSSProperties = {
  backgroundColor: "#0a0a0a",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container: CSSProperties = {
  backgroundColor: "#1a1a1a",
  margin: "0 auto",
  padding: "20px",
  maxWidth: "600px",
  borderRadius: "8px",
};

const header: CSSProperties = {
  padding: "20px 0",
  textAlign: "center",
  borderBottom: "1px solid #2a2a2a",
};

const logo: CSSProperties = {
  color: "#ffffff",
  fontSize: "32px",
  fontWeight: "bold",
  margin: "0",
  letterSpacing: "2px",
};

const content: CSSProperties = {
  padding: "30px 20px",
};

const heading: CSSProperties = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "600",
  margin: "0 0 20px 0",
  textAlign: "center",
};

const text: CSSProperties = {
  color: "#d1d5db",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px 0",
};

const otpContainer: CSSProperties = {
  backgroundColor: "#0a0a0a",
  border: "2px solid #3b82f6",
  borderRadius: "12px",
  padding: "30px",
  margin: "30px 0",
  textAlign: "center",
};

const otpCodeStyle: CSSProperties = {
  color: "#3b82f6",
  fontSize: "42px",
  fontWeight: "bold",
  letterSpacing: "12px",
  fontFamily: "'Courier New', monospace",
  margin: "0",
  lineHeight: "1",
};

const buttonContainer: CSSProperties = {
  textAlign: "center",
  margin: "30px 0",
};

const button: CSSProperties = {
  backgroundColor: "#3b82f6",
  color: "#ffffff",
  padding: "14px 32px",
  borderRadius: "6px",
  textDecoration: "none",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "600",
};

const footer: CSSProperties = {
  padding: "20px 0",
  borderTop: "1px solid #2a2a2a",
  textAlign: "center",
};

const footerText: CSSProperties = {
  color: "#9ca3af",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0",
  textAlign: "center",
};

export default PasswordResetOTP;







