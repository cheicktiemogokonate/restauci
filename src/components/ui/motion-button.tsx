"use client";

import React, { FC } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MotionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: "primary" | "secondary";
  classes?: string;
  animate?: boolean;
  delay?: number;
  href?: string;
}

export const MotionButton: FC<MotionButtonProps> = ({
  label,
  classes,
  href,
  onClick,
  ...rest
}) => {
  const buttonContent = (
    <>
      <span className="motion-btn-circle" aria-hidden="true" />
      <div className="motion-btn-inner">
        <div className="motion-btn-icon">
          <ArrowRight className="size-4" />
        </div>
        <span className="motion-btn-label">
          {label}
        </span>
      </div>
    </>
  );

  const sharedClasses = cn("motion-btn", classes);

  if (href) {
    return (
      <a href={href} className={sharedClasses}>
        {buttonContent}
      </a>
    );
  }

  return (
    <button className={sharedClasses} onClick={onClick} {...rest}>
      {buttonContent}
    </button>
  );
};

export default MotionButton;
