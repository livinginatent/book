import { z } from "zod";

// Password requirements
const passwordRequirements = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecial: /[!@#$%^&*(),.?":{}|<>]/,
};

export const passwordSchema = z
  .string()
  .min(
    passwordRequirements.minLength,
    `Password must be at least ${passwordRequirements.minLength} characters`
  )
  .regex(passwordRequirements.hasUppercase, "Password must contain an uppercase letter")
  .regex(passwordRequirements.hasLowercase, "Password must contain a lowercase letter")
  .regex(passwordRequirements.hasNumber, "Password must contain a number")
  .regex(passwordRequirements.hasSpecial, "Password must contain a special character");

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Password strength checker
export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  requirements: { label: string; met: boolean }[];
} {
  const requirements = [
    {
      label: `At least ${passwordRequirements.minLength} characters`,
      met: password.length >= passwordRequirements.minLength,
    },
    {
      label: "Contains uppercase letter",
      met: passwordRequirements.hasUppercase.test(password),
    },
    {
      label: "Contains lowercase letter",
      met: passwordRequirements.hasLowercase.test(password),
    },
    {
      label: "Contains a number",
      met: passwordRequirements.hasNumber.test(password),
    },
    {
      label: "Contains special character",
      met: passwordRequirements.hasSpecial.test(password),
    },
  ];

  const score = requirements.filter((r) => r.met).length;

  let label: string;
  let color: string;

  if (score === 0) {
    label = "";
    color = "bg-muted";
  } else if (score <= 2) {
    label = "Weak";
    color = "bg-destructive";
  } else if (score <= 3) {
    label = "Fair";
    color = "bg-orange-500";
  } else if (score <= 4) {
    label = "Good";
    color = "bg-yellow-500";
  } else {
    label = "Strong";
    color = "bg-green-500";
  }

  return { score, label, color, requirements };
}

