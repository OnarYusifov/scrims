"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@trayb/types";
import { AuthPage } from "@/components/auth-page";
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

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [success, setSuccess] = useState(false);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      // Backend always sends OTP now (even if user doesn't exist, for security)
      // Always redirect to reset-password page where user can enter OTP
      if (response.ok || result.message) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/reset-password?email=${encodeURIComponent(data.email)}`);
        }, 1000);
      } else {
        // Only show error if it's a real server error (500)
        form.setError("root", {
          message: result.error || "Failed to send reset code. Please try again.",
        });
      }
    } catch {
      form.setError("root", {
        message: "An error occurred. Please try again.",
      });
    }
  };

  return (
    <AuthPage mode="login" showSocialButtons={false} hideTitle={true}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {success ? (
            <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-700 dark:text-green-400 text-center">
              Password reset code sent! Redirecting to verification page...
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-xl font-bold">Forgot Password?</h2>
                <p className="text-sm text-muted-foreground">
                  Enter your email address and we'll send you a verification code to reset your password.
                </p>
              </div>
              {form.formState.errors.root && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {form.formState.errors.root.message}
                </div>
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="name@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Sending..." : "Send Reset Code"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  Back to Login
                </button>
              </div>
            </>
          )}
        </form>
      </Form>
    </AuthPage>
  );
}


