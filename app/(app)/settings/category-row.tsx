"use client";

import { Modal } from "@/components/ui/modal";
import { CategoryForm } from "@/components/forms/category-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { setCategoryActive, deleteCategory } from "@/lib/actions/categories";
import type { Category } from "@/lib/types";

export function CategoryRow({ category }: { category: Category }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className={category.is_active ? "text-foreground" : "text-muted line-through"}>
        {category.name}
      </span>

      <div className="flex items-center gap-3 text-xs">
        <Modal trigger={<button className="text-muted hover:text-foreground">Edit</button>} title="Edit category">
          <CategoryForm category={category} />
        </Modal>

        {category.is_active ? (
          <ConfirmButton
            className="text-muted hover:text-foreground"
            confirmMessage={`Deactivate "${category.name}"? Past transactions keep showing this category.`}
            action={() => setCategoryActive(category.id, false)}
          >
            Deactivate
          </ConfirmButton>
        ) : (
          <ConfirmButton
            className="text-accent hover:brightness-110"
            confirmMessage={`Reactivate "${category.name}"?`}
            action={() => setCategoryActive(category.id, true)}
          >
            Reactivate
          </ConfirmButton>
        )}

        <ConfirmButton
          className="text-danger hover:brightness-110"
          confirmMessage={`Delete "${category.name}"? If it has transactions it will be deactivated instead.`}
          action={() => deleteCategory(category.id)}
        >
          Delete
        </ConfirmButton>
      </div>
    </div>
  );
}
