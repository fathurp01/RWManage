import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center gap-2",
    "rounded-xl border border-transparent bg-clip-padding",
    "font-medium whitespace-nowrap transition-all duration-200 outline-none select-none",
    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
    "active:not-aria-[haspopup]:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
    "dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md hover:shadow-primary/20",
        rw: [
          "bg-blue-600 text-white",
          "shadow-sm hover:shadow-md hover:shadow-blue-500/30",
          "hover:bg-blue-700",
          "dark:bg-blue-600 dark:hover:bg-blue-700",
        ].join(" "),
        masjid: [
          "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white",
          "shadow-sm hover:shadow-md hover:shadow-emerald-500/30",
          "hover:from-emerald-400 hover:to-emerald-600",
          "dark:from-emerald-600 dark:to-emerald-800",
        ].join(" "),
        outline: [
          "border-border bg-background/50 hover:bg-accent hover:text-accent-foreground",
          "aria-expanded:bg-muted aria-expanded:text-foreground",
          "dark:bg-input/20 dark:hover:bg-accent/50",
        ].join(" "),
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary",
        ghost:
          "hover:bg-accent hover:text-accent-foreground aria-expanded:bg-muted dark:hover:bg-muted/30",
        destructive: [
          "bg-destructive/10 text-destructive",
          "hover:bg-destructive/20 hover:shadow-sm hover:shadow-destructive/20",
          "focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
          "dark:bg-destructive/20 dark:hover:bg-destructive/30",
        ].join(" "),
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2 text-sm",
        xs:      "h-7 px-2.5 text-xs rounded-lg",
        sm:      "h-10 px-3 text-sm rounded-xl",
        lg:      "h-12 px-6 text-base sm:text-base",
        xl:      "h-14 px-8 text-base font-bold",
        elder:   "h-16 px-8 text-lg font-bold rounded-2xl tracking-wide",
        icon:    "size-10 [&_svg:not([class*='size-'])]:size-4",
        "icon-xs":  "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":  "size-9 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg":  "size-11 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
