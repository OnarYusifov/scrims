"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, type ControllerRenderProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { signIn as nextAuthSignIn } from "next-auth/react";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@trayb/types";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContents,
  TabsContent,
} from "@/components/animate-ui/components/animate/tabs";
import { hashPassword } from "@/lib/password-hash";
import { Checkbox } from "@/components/animate-ui/components/radix/checkbox";
import { AUTH_ERROR_CODES, getAuthErrorMessage, type AuthErrorCode } from "@/lib/auth-codes";
// Note: 
// - Login: Sends plain password over HTTPS, backend uses bcrypt.compare() to verify
// - Registration: Hashes password on client side before sending to backend

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const error = session?.error;
  
  const defaultTab = useMemo(() => {
    const t = searchParams?.get("tab");
    return t === "register" ? "register" : "login";
  }, [searchParams]);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Check if user is already logged in but unverified
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();

        if (data.authenticated && !data.verified) {
          // User is logged in but email not verified - redirect to verification
          router.push(`/verify-email?email=${encodeURIComponent(data.user?.email || "")}`);
        } else if (data.authenticated && data.verified) {
          // User is fully authenticated - redirect to home
          router.push("/");
        }
      } catch {
        // Not authenticated, allow login page to show
      }
    };

    checkAuth();
  }, [router]);
  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Set error from session to form when session error appears
  useEffect(() => {
    if (error?.code) {
      const errorMessage = getAuthErrorMessage(error.code as AuthErrorCode);
      loginForm.setError("root", {
        message: errorMessage,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error?.code]);

  const onLogin = async (data: LoginInput) => {
    try {
      // Use next-auth signIn directly - errors will be in session
      const result = await nextAuthSignIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        // Error code might be in result.code or we'll get it from session
        // Refresh session to get error from session
        router.refresh();
        
        // Also show error from result if available
        type SignInResult = typeof result & { code?: AuthErrorCode };
        const errorCode = (result as SignInResult)?.code;
        const errorMessage = errorCode 
          ? getAuthErrorMessage(errorCode)
          : getAuthErrorMessage(AUTH_ERROR_CODES.AUTH_ERROR);
        
        loginForm.setError("root", {
          message: errorMessage,
        });
        return;
      }

      if (result?.ok) {
        // Login successful
        router.refresh();
        router.push("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = getAuthErrorMessage(AUTH_ERROR_CODES.AUTH_ERROR);
      loginForm.setError("root", {
        message: errorMessage,
      });
    }
  };

  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onRegister = async (data: RegisterInput) => {
    try {
      const hashedPassword = await hashPassword(data.password);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          password: hashedPassword,
          confirmPassword: hashedPassword,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        registerForm.setError("root", {
          message: result.error || "Registration failed",
        });
        return;
      }
      const email = result.email || data.email;
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      registerForm.setError("root", {
        message: "An error occurred. Please try again.",
      });
    }
  };

  return (
    <Tabs defaultValue={defaultTab}>
      <AuthPage
        hideTitle
        showSocialButtons
        mode="login"
        topSlot={
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
        }
      >
        <TabsContents style={{ overflow: "hidden" }}>
          <TabsContent value="login">
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Sign in to your account</h2>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  {loginForm.formState.errors.root && (
                    <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                      {loginForm.formState.errors.root.message}
                    </div>
                  )}
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }: { field: ControllerRenderProps<LoginInput | RegisterInput, keyof (LoginInput | RegisterInput)> }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="name@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }: { field: ControllerRenderProps<LoginInput | RegisterInput, keyof (LoginInput | RegisterInput)> }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                    {loginForm.formState.isSubmitting ? "Logging in..." : "Login"}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => router.push("/forgot-password")}
                      className="text-sm text-muted-foreground hover:text-foreground underline"
                    >
                      I forgor my password
                    </button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>
          <TabsContent value="register">
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Create your account</h2>
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  {registerForm.formState.errors.root && (
                    <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                      {registerForm.formState.errors.root.message}
                    </div>
                  )}
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }: { field: ControllerRenderProps<LoginInput | RegisterInput, keyof (LoginInput | RegisterInput)> }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="johndoe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }: { field: ControllerRenderProps<LoginInput | RegisterInput, keyof (LoginInput | RegisterInput)> }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="name@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }: { field: ControllerRenderProps<LoginInput | RegisterInput, keyof (LoginInput | RegisterInput)> }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }: { field: ControllerRenderProps<LoginInput | RegisterInput, keyof (LoginInput | RegisterInput)> }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={acceptTerms}
                      onCheckedChange={(v: boolean | "indeterminate") => setAcceptTerms(Boolean(v))}
                      aria-label="Agree to terms"
                    />
                    <span className="text-muted-foreground">
                      I agree to the{" "}
                      <a href="#" className="underline underline-offset-4 hover:text-primary">
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a href="#" className="underline underline-offset-4 hover:text-primary">
                        Privacy Policy
                      </a>
                      .
                    </span>
                  </div>
                  <Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting || !acceptTerms}>
                    {registerForm.formState.isSubmitting ? "Creating account..." : "Register"}
                  </Button>
                </form>
              </Form>
            </div>
          </TabsContent>
        </TabsContents>
      </AuthPage>
    </Tabs>
  );
}

