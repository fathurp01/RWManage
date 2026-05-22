import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5",
    "overflow-hidden rounded-full border border-transparent",
    "px-2.5 py-0.5 text-xs font-semibold tracking-wide whitespace-nowrap",
    "transition-all duration-200",
    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
    "[&>svg]:pointer-events-none [&>svg]:size-3!",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-primary/20 shadow-sm [a]:hover:bg-primary/80",
        rw: [
          "bg-indigo-50 text-indigo-700 border-indigo-200/60",
          "dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40",
          "glow-rw",
        ].join(" "),
        rt: [
          "bg-cyan-50 text-cyan-700 border-cyan-200/60",
          "dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/40",
          "glow-rt",
        ].join(" "),
        masjid: [
          "bg-emerald-50 text-emerald-700 border-emerald-200/60",
          "dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
          "glow-masjid",
        ].join(" "),
        success: [
          "bg-emerald-50 text-emerald-700 border-emerald-200/60",
          "dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
          "glow-success",
        ].join(" "),
        pending: [
          "bg-amber-50 text-amber-700 border-amber-200/60",
          "dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40",
          "glow-pending",
        ].join(" "),
        secondary:
          "bg-secondary text-secondary-foreground border-border [a]:hover:bg-secondary/80",
        destructive: [
          "bg-destructive/10 text-destructive border-destructive/20",
          "glow-error",
          "focus-visible:ring-destructive/20",
          "dark:bg-destructive/20 dark:border-destructive/30",
          "[a]:hover:bg-destructive/20",
        ].join(" "),
        outline:
          "border-border bg-white/50 text-foreground dark:bg-input/20 [a]:hover:bg-muted",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
