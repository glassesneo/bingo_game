interface NumberBallProps {
  number: number;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
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
    xl: "w-80 h-80 text-9xl",
    "2xl": "w-[28rem] h-[28rem] text-[12rem]",
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

  const letterSizeClasses = {
    sm: "text-xs",
    md: "text-xs",
    lg: "text-sm",
    xl: "text-5xl",
    "2xl": "text-6xl",
  };

  const numberMarginClasses = {
    sm: "-mt-1",
    md: "-mt-1",
    lg: "-mt-1",
    xl: "-mt-2",
    "2xl": "-mt-4",
  };

  return (
    <div
      className={`${sizeClasses[size]} ${isNew ? "number-drawn" : ""} rounded-full bg-primary text-primary-content flex flex-col items-center justify-center font-bold ${size === "xl" || size === "2xl" ? "shadow-2xl" : "shadow-lg"}`}
    >
      <span className={`${letterSizeClasses[size]} opacity-70`}>{letter}</span>
      <span className={numberMarginClasses[size]}>{number}</span>
    </div>
  );
}
