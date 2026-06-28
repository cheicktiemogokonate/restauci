import type { ComponentType } from "react";

export type StepNumber = 1 | 2 | 3;

export interface PlatWizardData {
  nom: string;
  description: string;
  prix: string;
  image: string | null;
  categorieId: string;
  newCategorieName: string;
  disponible: boolean;
}

export interface Step {
  id: number;
  title: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
}

export interface CategorieOption {
  id: string;
  nom: string;
}
