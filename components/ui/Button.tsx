import Link from "next/link";

/**
 * `min-h-11` is 44px, the tap target floor. Every size below sets its
 * padding for how the button should look; this stops the smallest of
 * them looking right and missing the thumb, which is what `tight` was
 * doing in the header at 36px tall.
 */
const base =
  "inline-flex min-h-11 items-center justify-center rounded bg-oxblood text-center font-medium text-paper transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-oxblood-lt disabled:cursor-not-allowed disabled:opacity-60";

const sizes = {
  default: "px-8 py-4",
  compact: "px-5 py-2.5 text-sm",
  // The header at 375, where the lockup, the call to action and the
  // menu button have to share 327px of container.
  tight: "px-4 py-2 text-sm sm:px-5 sm:py-2.5",
} as const;

type ButtonSize = keyof typeof sizes;

const buttonClasses = `${base} ${sizes.default}`;

export function Button({
  children,
  type = "submit",
  disabled,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  type?: "submit" | "button";
  disabled?: boolean;
  className?: string;
  /** Only meaningful inside a client component. */
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${buttonClasses} ${className}`}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  href,
  className = "",
  size = "default",
}: {
  children: React.ReactNode;
  href: string;
  className?: string;
  size?: ButtonSize;
}) {
  return (
    <Link href={href} className={`${base} ${sizes[size]} ${className}`}>
      {children}
    </Link>
  );
}
