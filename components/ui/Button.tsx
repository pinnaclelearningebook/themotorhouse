import Link from "next/link";

const base =
  "inline-block rounded bg-oxblood text-center font-medium text-paper transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-oxblood-lt disabled:cursor-not-allowed disabled:opacity-60";

const sizes = {
  default: "px-8 py-4",
  compact: "px-5 py-2.5 text-sm",
} as const;

type ButtonSize = keyof typeof sizes;

const buttonClasses = `${base} ${sizes.default}`;

export function Button({
  children,
  type = "submit",
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  type?: "submit" | "button";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
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
