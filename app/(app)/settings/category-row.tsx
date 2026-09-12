"use client";

import { Modal } from "@/components/ui/modal";
import { CategoryForm } from "@/components/forms/category-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { setCategoryActive, deleteCategory } from "@/lib/actions/categories";
import type { Category } from "@/lib/types";

export function CategoryRow({ category, onChanged }: { category: Category; onChanged?: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className={category.is_active ? "text-foreground" : "text-muted line-through"}>
        {category.name}
      </span>

      <div className="flex items-center gap-3 text-xs">
        <Modal trigger={<button className="text-muted hover:text-foreground">Edit</button>} title="Edit category">
          <CategoryForm category={category} onSuccess={onChanged} />
        </Modal>

        {category.is_active ? (
          <ConfirmButton
            className="text-muted hover:text-foreground"
            confirmMessage={`Deactivate "${category.name}"? Past transactions keep showing this category.`}
            action={async () => {
              const result = await setCategoryActive(category.id, false);
              onChanged?.();
              return result;
            }}
          >
            Deactivate
          </ConfirmButton>
        ) : (
          <ConfirmButton
            className="text-accent hover:brightness-110"
            confirmMessage={`Reactivate "${category.name}"?`}
            action={async () => {
              const result = await setCategoryActive(category.id, true);
              onChanged?.();
              return result;
            }}
          >
            Reactivate
          </ConfirmButton>
        )}

        <ConfirmButton
          className="text-danger hover:brightness-110"
          confirmMessage={`Delete "${category.name}"? If it has transactions it will be deactivated instead.`}
          action={async () => {
            const result = await deleteCategory(category.id);
            onChanged?.();
            return result;
          }}
        >
          Delete
        </ConfirmButton>
      </div>
    </div>
  );
}
