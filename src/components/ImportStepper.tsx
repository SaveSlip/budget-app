"use client";

import { Check } from "lucide-react";

interface ImportStepperProps {
  currentStep: 1 | 2 | 3;
}

const STEPS = ["Account", "Columns", "Review"] as const;

export function ImportStepper({ currentStep }: ImportStepperProps) {
  return (
    <div className="flex items-start">
      {STEPS.map((label, i) => {
        const stepNum = (i + 1) as 1 | 2 | 3;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;

        return (
          <div key={label} className="flex items-start flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold ${
                  isCompleted || isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : stepNum}
              </div>
              <span
                className={`mt-1 text-[11px] whitespace-nowrap ${
                  isActive ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mt-2.5 mx-1 ${
                  currentStep > stepNum ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
