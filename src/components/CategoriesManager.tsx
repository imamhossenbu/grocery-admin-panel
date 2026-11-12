'use client';

import React, { useState } from 'react';
import { Edit, Layers, Plus, Trash2 } from 'lucide-react';
import { Category, Product } from '@/types/store';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { EmptyState } from './ui/EmptyState';

interface CategoriesManagerProps {
  categories: Category[];
  products: Product[];
  onSaveCategory: (category: Category) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export function CategoriesManager({
  categories,
  products,
  onSaveCategory,
  onDeleteCategory,
}: CategoriesManagerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Category>>({
    id: '',
    name: '',
    blurb: '',
    image: '',
  });

  const openAdd = () => {
    setEditingCategory(null);
    setForm({
      id: '',
      name: '',
      blurb: '',
      image:
        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    });
    setModalOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditingCategory(c);
    setForm({ ...c });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) return;

    const id =
      editingCategory?.id ||
      form.id?.trim().toLowerCase().replace(/\s+/g, '-') ||
      form.name.trim().toLowerCase().replace(/\s+/g, '-');

    const catToSave: Category = {
      id,
      name: form.name.trim(),
      blurb: form.blurb?.trim() || 'Farm-fresh grocery aisle',
      image:
        form.image?.trim() ||
        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    };

    await onSaveCategory(catToSave);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#112a1d]">
            Grocery Aisles &amp; Categories
          </h2>
          <p className="text-xs text-[#5a7165]">
            Configure grocery departments, icons, and hero photography.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={openAdd}>
          <Plus className="w-4 h-4" />
          <span>Add New Category</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((cat) => {
          const count = products.filter((p) => p.category === cat.id).length;

          return (
            <div
              key={cat.id}
              className="rounded-3xl border border-[#dfece3] bg-white p-5 shadow-soft hover:shadow-card transition flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-[#f0f7f2] mb-4">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-3 right-3 rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-[#1a663b] shadow-sm">
                    {count} products
                  </span>
                </div>

                <h3 className="font-display text-lg font-bold text-[#112a1d]">
                  {cat.name}
                </h3>
                <span className="text-[11px] font-mono text-[#5a7165] block">
                  Slug: {cat.id}
                </span>
                <p className="mt-1 text-xs text-[#5a7165] line-clamp-2">
                  {cat.blurb}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#f0f7f2] flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(cat)}
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Button>
                <button
                  onClick={() => setDeleteId(cat.id)}
                  className="rounded-xl p-2 text-[#789d87] hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                  title="Delete category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create New Category'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#5a7165] mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Exotic Fruits & Berries"
              className="w-full rounded-xl border border-[#cfe3d6] px-3.5 py-2 text-xs focus:border-[#1a663b] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5a7165] mb-1">
              Unique ID Slug *
            </label>
            <input
              type="text"
              required
              disabled={!!editingCategory}
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              placeholder="e.g. exotic-fruits"
              className="w-full rounded-xl border border-[#cfe3d6] px-3.5 py-2 text-xs focus:border-[#1a663b] focus:outline-none disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5a7165] mb-1">
              Short Description / Blurb
            </label>
            <input
              type="text"
              value={form.blurb}
              onChange={(e) => setForm({ ...form, blurb: e.target.value })}
              placeholder="e.g. Seasonal & farm-picked delights"
              className="w-full rounded-xl border border-[#cfe3d6] px-3.5 py-2 text-xs focus:border-[#1a663b] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5a7165] mb-1">
              Image URL
            </label>
            <input
              type="url"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="https://..."
              className="w-full rounded-xl border border-[#cfe3d6] px-3.5 py-2 text-xs focus:border-[#1a663b] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#e6f0e9]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Category"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#5a7165]">
            Are you sure you want to remove this category? Products in this category may become uncategorized.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                if (deleteId) {
                  await onDeleteCategory(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
