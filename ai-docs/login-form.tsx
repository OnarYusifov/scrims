"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn as nextAuthSignIn, useSession } from "next-auth/react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AUTH_ERROR_CODES,
  AuthErrorCode,
  getAuthErrorMessage,
} from "@/types/auth_codes";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const loginSchema = z.object({
  username: z.string().min(1, "İstifadəçi adı tələb olunur"),
  password: z.string().min(1, "Şifrə tələb olunur"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { data: session } = useSession();
  const error = session?.error;
  const errorMessage = error
    ? getAuthErrorMessage(
        error.code as (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES]
      )
    : null;
  const toastShownRef = useRef<string | null>(null);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (errorMessage && error?.code && toastShownRef.current !== error.code) {
      toastShownRef.current = error.code;
      toast.error(errorMessage);
    }
    // Reset ref when error is cleared
    if (!errorMessage) {
      toastShownRef.current = null;
    }
  }, [errorMessage, error?.code]);

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      const result = await nextAuthSignIn("credentials", {
        username: data.username,
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        const errorCode = result.code as AuthErrorCode;
        const errorMessage = getAuthErrorMessage(errorCode);
        toast.error(errorMessage);
      } else {
        router.refresh();
        toast.success("Uğurla daxil oldunuz");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Giriş zamanı xəta baş verdi");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Xoş Gəlmişsiniz</CardTitle>
          <CardDescription>Hesabınıza daxil olun</CardDescription>
        </CardHeader>
        <CardContent>
          <form id="login-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="username"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="login-form-username">
                      İstifadəçi adı
                    </FieldLabel>
                    <Input
                      {...field}
                      id="login-form-username"
                      type="text"
                      placeholder="İstifadəçi adı"
                      autoComplete="username"
                      aria-invalid={fieldState.invalid}
                      disabled={isLoading}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="login-form-password">
                        Şifrə
                      </FieldLabel>
                      {/* <a
                        href="#"
                        className="ml-auto text-sm underline-offset-4 hover:underline"
                      >
                        Şifrənizi unutmusunuz?
                      </a> */}
                    </div>
                    <Input
                      {...field}
                      id="login-form-password"
                      type="password"
                      placeholder="Şifrə"
                      autoComplete="current-password"
                      aria-invalid={fieldState.invalid}
                      disabled={isLoading}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Field>
                <Button type="submit" form="login-form" disabled={isLoading}>
                  {isLoading ? "Giriş edilir..." : "Daxil ol"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
