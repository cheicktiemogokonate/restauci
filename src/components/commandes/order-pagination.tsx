"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface OrderPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (count: number) => void;
}

export function OrderPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: OrderPaginationProps) {
  const pages = generatePageNumbers(currentPage, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-6">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground/80">Affichage</span>
        <Select
          value={itemsPerPage.toString()}
          onValueChange={(value) => onItemsPerPageChange(parseInt(value))}
        >
          <SelectTrigger className="w-[70px] h-9 bg-white border-border/60 shadow-sm rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">6</SelectItem>
            <SelectItem value="12">12</SelectItem>
            <SelectItem value="24">24</SelectItem>
            <SelectItem value="48">48</SelectItem>
          </SelectContent>
        </Select>
        <span className="font-medium text-foreground/80">sur {totalItems} commandes</span>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 border-none bg-transparent hover:bg-muted text-muted-foreground"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Page précédente</span>
        </Button>

        {pages.map((page, index) => (
          <span key={index}>
            {page === "..." ? (
              <span className="px-1.5 text-muted-foreground font-medium">...</span>
            ) : (
              <Button
                variant={currentPage === page ? "default" : "outline"}
                size="icon"
                className={cn(
                  "h-9 w-9 text-sm font-semibold rounded-lg border-none shadow-none",
                  currentPage === page 
                    ? "bg-[#2d7d46] text-white hover:bg-[#2d7d46]/90" 
                    : "bg-transparent text-foreground hover:bg-muted/50"
                )}
                onClick={() => onPageChange(page as number)}
              >
                {page}
              </Button>
            )}
          </span>
        ))}

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 border-none bg-transparent hover:bg-muted text-muted-foreground"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Page suivante</span>
        </Button>
      </div>
    </div>
  );
}

function generatePageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];
  
  // Always show first page
  pages.push(1);

  if (current > 3) {
    pages.push("...");
  }

  // Show pages around current
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    if (!pages.includes(i)) {
      pages.push(i);
    }
  }

  if (current < total - 2) {
    pages.push("...");
  }

  // Always show last page
  if (!pages.includes(total)) {
    pages.push(total);
  }

  return pages;
}
