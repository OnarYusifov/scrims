"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useState, useEffect, Suspense } from "react";
import { VerifyPageLayout } from "@/components/verify-page-layout";
import { OTPForm } from "@/components/otp-form";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationType, setVerificationType] = useState<
    "register" | "login"
  >("register");

  const emailFromQuery = searchParams.get("email") || "";
  const typeFromQuery = searchParams.get("type") || "";

  // Set verification type from query param
  useEffect(() => {
    if (typeFromQuery === "login") {
      setVerificationType("login");
    }
  }, [typeFromQuery]);

  // Check if user is authenticated and get email if not in query
  useEffect(() => {
    // For login flow, don't check auth (user is in process of logging in)
    if (verificationType === "login" && emailFromQuery) {
      setEmail(emailFromQuery);
      return;
    }

    // Set email from query if available
    if (emailFromQuery) {
      setEmail(emailFromQuery);
      return;
    }

    // For registration flow, check session
    if (verificationType === "register") {
      if (status === "loading") return;

      // Use session directly - no need for API call
      if (session?.user) {
        // User is authenticated - redirect to home
        router.push("/");
        return;
      }

      // Not authenticated - redirect to login
      router.push("/login");
    }
  }, [emailFromQuery, verificationType, session, status, router]);

  useEffect(() => {
    // Intercept form submission
    const form = document.querySelector("form");
    if (!form) return;

    const handleSubmit = async (e: Event) => {
      e.preventDefault();
      setError(null);
      setResendMessage(null);

      // Get OTP value from the input
      const otpInput = document.getElementById("otp") as HTMLInputElement;
      const otpValue = otpInput?.value || "";

      if (!email) {
        setError("Email is required");
        return;
      }

      if (otpValue.length !== 6) {
        setError("Please enter the complete 6-digit code");
        return;
      }

      try {
        if (verificationType === "login") {
          // Login OTP flow: Backend verifies OTP and returns token + user
          // Then we create NextAuth session directly using the token
          const getBackendUrl = () => {
            if (process.env.NEXT_PUBLIC_API_URL)
              return process.env.NEXT_PUBLIC_API_URL;
            const port = Number(process.env.NEXT_PUBLIC_BACKEND_PORT);
            if (!port) throw new Error("BACKEND_PORT must be set");
            return `http://localhost:${port}`;
          };

          // Verify OTP with backend - this returns token and user
          const verifyResponse = await fetch(
            `${getBackendUrl()}/auth/verify-login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, code: otpValue }),
            }
          );

          const verifyResult = await verifyResponse.json();

          if (!verifyResponse.ok) {
            setError(verifyResult.error || "Verification failed");
            return;
          }

          // OTP verified - backend returned token and user
          // Now use this token as trustedDeviceToken to authenticate with NextAuth
          // We'll call signIn with email and a dummy password, but the token will authenticate
          const signInResult = await signIn("credentials", {
            email,
            password: "OTP_VERIFIED", // Dummy password - backend will use token instead
            trustedDeviceToken: verifyResult.token,
            redirect: false,
          });

          if (signInResult?.error) {
            setError("Failed to create session. Please try logging in again.");
            return;
          }

          // Session created - refresh and redirect
          router.refresh();
          router.push("/");
        } else {
          // Registration flow: Just verify email via backend
          const response = await fetch("/api/auth/verify-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code: otpValue }),
          });

          const result = await response.json();

          if (!response.ok) {
            setError(result.error || "Verification failed");
            return;
          }

          // Email verified - redirect to login
          router.push("/login?verified=true");
        }
      } catch (err) {
        console.error("Verification error:", err);
        setError("An error occurred. Please try again.");
      }
    };

    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, [email, verificationType, router]);

  useEffect(() => {
    // Handle resend link click
    const resendLink = document.querySelector('a[href="#"]');
    if (!resendLink) return;

    const handleResend = async (e: Event) => {
      e.preventDefault();

      if (!email) {
        setError("Email is required to resend code");
        return;
      }

      setIsResending(true);
      setResendMessage(null);
      setError(null);

      try {
        // Use different endpoint based on verification type
        const endpoint =
          verificationType === "login"
            ? "/api/auth/resend-login-otp"
            : "/api/auth/resend-verification";

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        const result = await response.json();

        if (response.ok) {
          setResendMessage("Verification code sent! Please check your email.");
          // Clear the OTP input
          const otpInput = document.getElementById("otp") as HTMLInputElement;
          if (otpInput) otpInput.value = "";
        } else {
          setResendMessage(result.error || "Failed to resend code");
        }
      } catch {
        setResendMessage("An error occurred. Please try again.");
      } finally {
        setIsResending(false);
      }
    };

    resendLink.addEventListener("click", handleResend);
    return () => resendLink.removeEventListener("click", handleResend);
  }, [email, verificationType]);

  return (
    <VerifyPageLayout>
      <div className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive text-center">
            {error}
          </div>
        )}
        {resendMessage && (
          <div
            className={`rounded-md p-3 text-sm text-center ${
              resendMessage.includes("sent")
                ? "bg-green-500/15 text-green-700 dark:text-green-400"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            {resendMessage}
          </div>
        )}
        {email && (
          <div className="text-center text-sm text-muted-foreground">
            Code sent to: <strong>{email}</strong>
          </div>
        )}
        <OTPForm />
      </div>
    </VerifyPageLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <VerifyPageLayout>
          <div className="space-y-4">
            <div className="text-center text-muted-foreground">Loading...</div>
          </div>
        </VerifyPageLayout>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
