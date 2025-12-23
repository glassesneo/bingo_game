interface NumberBallProps {
  number: number;
  size?: "sm" | "md" | "lg";
  isNew?: boolean;
}

export function NumberBall({
  number,
  size = "md",
  isNew = false,
}: NumberBallProps) {
  const sizeClasses = {
    sm: "w-10 h-10 text-lg",
    md: "w-16 h-16 text-2xl",
    lg: "w-24 h-24 text-4xl",
  };

  // Get the letter for the number (B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75)
  const getLetter = (n: number): string => {
    if (n <= 15) return "B";
    if (n <= 30) return "I";
    if (n <= 45) return "N";
    if (n <= 60) return "G";
    return "O";
  };

  const letter = getLetter(number);

  return (
    <div
      className={`${sizeClasses[size]} ${isNew ? "number-drawn" : ""} rounded-full bg-primary text-primary-content flex flex-col items-center justify-center font-bold shadow-lg`}
    >
      <span className="text-xs opacity-70">{letter}</span>
      <span className="-mt-1">{number}</span>
    </div>
  );
}
