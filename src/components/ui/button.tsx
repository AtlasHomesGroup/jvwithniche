import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Niche navy - primary form actions, "Get Started"-style CTAs
        default:
          "bg-brand-navy text-white shadow-sm hover:bg-brand-navy-hover",
        // Niche orange - accent / hero CTAs, "Start JV submission"
        accent:
          "bg-brand-orange text-white shadow-sm hover:bg-brand-orange-hover",
        // Outlined navy ghost - "Join the Community"-style secondary actions
        outline:
          "border border-brand-navy/20 bg-transparent text-brand-navy hover:border-brand-navy hover:bg-brand-navy/5",
        secondary:
          "bg-brand-navy-light text-brand-navy hover:bg-brand-navy-light/80",
        ghost:
          "bg-transparent text-brand-navy hover:bg-brand-navy/5 hover:text-brand-navy-hover",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        link: "text-brand-orange underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-[13px]",
        default: "h-11 px-5",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-10 w-10",
      },
      shape: {
        pill: "rounded-full",
        rounded: "rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "pill",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, shape, asChild = false, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, shape, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
