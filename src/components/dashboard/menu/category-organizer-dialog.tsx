"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createMenuCategoryAction,
  renameMenuCategoryAction,
} from "@/lib/actions/menu";
import { Check, FolderCog, LoaderCircle, Pencil, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export interface MenuCategory {
  id: string;
  nom: string;
  platCount: number;
}

interface CategoryOrganizerDialogProps {
  categories: MenuCategory[];
}

export default function CategoryOrganizerDialog({
  categories,
}: CategoryOrganizerDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(categories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isPending, startTransition] = useTransition();

  const refreshAfterSuccess = () => router.refresh();

  const createCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;

    startTransition(async () => {
      const result = await createMenuCategoryAction(name);
      if (!result.success || !result.category) {
        toast.error(result.error ?? "Impossible de créer la catégorie.");
        return;
      }

      setNewCategoryName("");
      setItems((current) => [
        ...current,
        { ...result.category, platCount: 0 },
      ]);
      toast.success("Catégorie ajoutée.");
      refreshAfterSuccess();
    });
  };

  const saveRename = (categoryId: string) => {
    const name = editingName.trim();
    if (!name) return;

    const previousItems = items;
    setItems((current) =>
      current.map((item) => (item.id === categoryId ? { ...item, nom: name } : item)),
    );
    setEditingId(null);

    startTransition(async () => {
      const result = await renameMenuCategoryAction(categoryId, name);
      if (result.error) {
        setItems(previousItems);
        toast.error(result.error);
        return;
      }

      toast.success("Catégorie renommée.");
      refreshAfterSuccess();
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full shrink-0 sm:w-auto"
        onClick={() => setOpen(true)}
      >
        <FolderCog className="h-4 w-4 text-brand-green" />
        <span>Gérer les catégories</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-xl gap-5 overflow-y-auto rounded-2xl p-5 sm:p-6">
          <DialogHeader className="pr-8">
            <DialogTitle>Gérer les catégories</DialogTitle>
            <DialogDescription>
              Ajoutez ou renommez les catégories qui structurent votre carte.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-dashed border-brand-green/25 bg-brand-green/[0.035] p-3">
            <label htmlFor="new-category" className="mb-2 block text-sm font-medium text-foreground">
              Nouvelle catégorie
            </label>
            <div className="flex gap-2">
              <Input
                id="new-category"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    createCategory();
                  }
                }}
                placeholder="Ex. Boissons fraîches"
                disabled={isPending}
                className="h-10 bg-background"
              />
              <Button
                type="button"
                onClick={createCategory}
                disabled={isPending || newCategoryName.trim().length < 2}
                size="lg"
              >
                {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span className="sr-only">Ajouter la catégorie</span>
              </Button>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Créez votre première catégorie pour structurer votre carte.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/70">
              {items.map((category) => {
                const isEditing = editingId === category.id;
                return (
                  <div
                    key={category.id}
                    className="flex items-center gap-2 border-b border-border/70 bg-background px-3 py-2.5 last:border-b-0 sm:px-4"
                  >
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <Input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") saveRename(category.id);
                            if (event.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                          disabled={isPending}
                          className="h-8"
                        />
                      ) : (
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{category.nom}</p>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {category.platCount} {category.platCount > 1 ? "plats" : "plat"}
                          </span>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <>
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => saveRename(category.id)} disabled={isPending} aria-label={`Enregistrer ${category.nom}`}>
                          <Check className="h-4 w-4 text-brand-green" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditingId(null)} disabled={isPending} aria-label="Annuler le renommage">
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => { setEditingId(category.id); setEditingName(category.nom); }} disabled={isPending} aria-label={`Renommer ${category.nom}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
