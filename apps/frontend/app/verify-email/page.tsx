"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { VerifyPageLayout } from "@/components/verify-page-layout";
import { OTPForm } from "@/components/otp-form";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationType, setVerificationType] = useState<"register" | "login">("register");
  const otpInputRef = useRef<HTMLInputElement>(null);
  
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

    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();

        if (data.authenticated && data.verified) {
          // User is already verified - redirect to home
          router.push("/");
          return;
        }

        if (data.authenticated && !data.verified) {
          // User is logged in but not verified - use their email
          if (!emailFromQuery && data.user?.email) {
            setEmail(data.user.email);
          }
        } else if (!data.authenticated && verificationType === "register") {
          // Not authenticated and it's registration flow - redirect to login
          router.push("/login");
        }
        // For login flow, allow unauthenticated (they're logging in)
      } catch (error) {
        // Error checking auth - only redirect if it's registration flow
        if (verificationType === "register") {
          router.push("/login");
        }
      }
    };

    if (emailFromQuery) {
      setEmail(emailFromQuery);
    } else if (verificationType === "register") {
      checkAuth();
    }
  }, [emailFromQuery, verificationType, router]);

  useEffect(() => {
    // Intercept form submission
    const form = document.querySelector('form');
    if (!form) return;

    const handleSubmit = async (e: Event) => {
      e.preventDefault();
      setError(null);
      setResendMessage(null);

      // Get OTP value from the input
      const otpInput = document.getElementById('otp') as HTMLInputElement;
      const otpValue = otpInput?.value || '';

      if (!email) {
        setError("Email is required");
        return;
      }

      if (otpValue.length !== 6) {
        setError("Please enter the complete 6-digit code");
        return;
      }

      try {
        // Use different endpoint based on verification type
        const endpoint = verificationType === "login" 
          ? "/api/auth/verify-login" 
          : "/api/auth/verify-email";
        
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            code: otpValue,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          setError(result.error || "Verification failed");
          return;
        }

        // Success - email verified
        // For registration flow, redirect to login (user can now log in)
        // For login flow, user should already be authenticated
        if (verificationType === "register") {
          router.push("/login?verified=true");
        } else {
          router.push("/");
        }
      } catch {
        setError("An error occurred. Please try again.");
      }
    };

    form.addEventListener('submit', handleSubmit);
    return () => form.removeEventListener('submit', handleSubmit);
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
        const endpoint = verificationType === "login"
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
          const otpInput = document.getElementById('otp') as HTMLInputElement;
          if (otpInput) otpInput.value = '';
        } else {
          setResendMessage(result.error || "Failed to resend code");
        }
      } catch {
        setResendMessage("An error occurred. Please try again.");
      } finally {
        setIsResending(false);
      }
    };

    resendLink.addEventListener('click', handleResend);
    return () => resendLink.removeEventListener('click', handleResend);
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
    <Suspense fallback={
      <VerifyPageLayout>
        <div className="space-y-4">
          <div className="text-center text-muted-foreground">Loading...</div>
        </div>
      </VerifyPageLayout>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

