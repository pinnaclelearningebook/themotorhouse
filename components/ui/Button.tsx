import Link from "next/link";

const buttonClasses =
  "inline-block rounded bg-oxblood px-8 py-4 text-center font-medium text-paper transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-oxblood-lt disabled:cursor-not-allowed disabled:opacity-60";

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
}: {
  children: React.ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <Link href={href} className={`${buttonClasses} ${className}`}>
      {children}
    </Link>
  );
}
