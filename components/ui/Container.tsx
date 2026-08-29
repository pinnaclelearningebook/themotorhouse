export function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-300 px-6 md:px-10 ${className}`}>
      {children}
    </div>
  );
}
