"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm, type ControllerRenderProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@trayb/types";
import { VerifyPageLayout } from "@/components/verify-page-layout";
import { OTPForm } from "@/components/otp-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { hashPassword } from "@/lib/password-hash";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"verify" | "reset">("verify");
  const [email, setEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [_isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const emailFromQuery = searchParams.get("email") || "";

  useEffect(() => {
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }
  }, [emailFromQuery]);

  const passwordForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: emailFromQuery,
      code: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (emailFromQuery) {
      passwordForm.setValue("email", emailFromQuery);
    }
  }, [emailFromQuery, passwordForm]);

  // Handle OTP verification
  useEffect(() => {
    if (step !== "verify") return;

    const form = document.querySelector('form');
    if (!form) return;

    const handleSubmit = async (e: Event) => {
      e.preventDefault();
      setError(null);
      setResendMessage(null);

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
        const response = await fetch("/api/auth/verify-password-reset", {
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
          setError(result.error || "Invalid or expired verification code. Please try again.");
          return;
        }

        // Code verified - move to password reset step
        passwordForm.setValue("code", otpValue);
        setOtpValue(otpValue);
        setStep("reset");
      } catch {
        setError("An error occurred. Please try again.");
      }
    };

    form.addEventListener('submit', handleSubmit);
    return () => form.removeEventListener('submit', handleSubmit);
  }, [step, email, passwordForm]);

  // Handle resend
  useEffect(() => {
    if (step !== "verify") return;

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
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        const result = await response.json();

        if (response.ok) {
          setResendMessage("Password reset code sent! Please check your email.");
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
  }, [step, email]);

  const onPasswordSubmit = async (data: ResetPasswordInput) => {
    try {
      // Hash password before sending to API
      const hashedPassword = await hashPassword(data.password);
      
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          code: otpValue,
          password: hashedPassword,
          confirmPassword: hashedPassword, // Also hash confirmPassword for consistency
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        passwordForm.setError("root", {
          message: result.error || "Password reset failed. Please check your code and password, then try again.",
        });
        return;
      }

      // Success - redirect to login
      router.push("/login?message=Password reset successful. Please log in with your new password.");
    } catch {
      passwordForm.setError("root", {
        message: "An error occurred. Please try again.",
      });
    }
  };

  if (step === "verify") {
    return (
      <VerifyPageLayout>
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Reset Your Password</h1>
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to your email to verify your identity.
            </p>
          </div>
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

  return (
    <VerifyPageLayout>
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Set New Password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your new password below.
          </p>
        </div>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            {passwordForm.formState.errors.root && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {passwordForm.formState.errors.root.message}
              </div>
            )}
            <FormField
              control={passwordForm.control}
              name="password"
                    render={({ field }: { field: ControllerRenderProps<ResetPasswordInput, keyof ResetPasswordInput> }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name="confirmPassword"
                    render={({ field }: { field: ControllerRenderProps<ResetPasswordInput, keyof ResetPasswordInput> }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={passwordForm.formState.isSubmitting}>
              {passwordForm.formState.isSubmitting ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </Form>
      </div>
    </VerifyPageLayout>
  );
}


