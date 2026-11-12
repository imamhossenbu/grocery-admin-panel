'use client';

import React, { useMemo, useState } from 'react';
import {
  Check,
  Edit,
  Eye,
  EyeOff,
  Package,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { Category, Product } from '@/types/store';
import { formatBDT } from '@/lib/format';
import { slugify } from '@/lib/slug';
import {
  categoryOptions,
  countByCategory,
  getCategoryPath,
  getSubtreeIds,
} from '@/lib/category-tree';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { EmptyState } from './ui/EmptyState';
import { ImageUploadField } from './ui/ImageUploadField';

interface ProductsManagerProps {
  products: Product[];
  categories: Category[];
  /** `isNew` tells the server to create a row (with a unique slug id) rather than update one. */
  onSaveProduct: (product: Product, isNew: boolean) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onToggleFeatured: (id: string, featured: boolean) => Promise<void>;
  onQuickUpdate: (id: string, stock: number, price?: number) => Promise<void>;
}

export function ProductsManager({
  products,
  categories,
  onSaveProduct,
  onDeleteProduct,
  onToggleActive,
  onToggleFeatured,
  onQuickUpdate,
}: ProductsManagerProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formState, setFormState] = useState<Partial<Product>>({
    name: '',
    category: categories[0]?.id || 'fruits',
    unit: '1 kg',
    price: 100,
    oldPrice: undefined,
    stock: 50,
    sku: '',
    badge: '',
    description: '',
    origin: 'Bogura & Rajshahi Farms',
    nutrition: '100% Farm Fresh & Quality Checked',
    image: '',
    featured: false,
    active: true,
  });

  const [saving, setSaving] = useState(false);

  // Tree-ordered options ("Fruits › Local fruits") and per-product paths.
  const options = useMemo(() => categoryOptions(categories), [categories]);
  const pathById = useMemo(
    () => new Map(categories.map((c) => [c.id, getCategoryPath(categories, c.id)])),
    [categories]
  );
  // Filtering by a category includes everything below it.
  const filterIds = useMemo(
    () => (categoryFilter === 'all' ? null : getSubtreeIds(categories, categoryFilter)),
    [categories, categoryFilter]
  );
  const counts = useMemo(() => countByCategory(categories, products), [categories, products]);

  const filteredProducts = products.filter((p) => {
    const matchesCat = !filterIds || filterIds.has(p.category);
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'low' && p.stock > 0 && p.stock <= 20) ||
      (stockFilter === 'out' && p.stock <= 0);
    const matchesQuery =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesStock && matchesQuery;
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setFormState({
      name: '',
      category: categories[0]?.id || 'fruits',
      unit: '1 kg',
      price: 100,
      oldPrice: undefined,
      stock: 50,
      sku: `PROD-${Math.floor(100 + Math.random() * 900)}`,
      badge: 'Farm Fresh',
      description: '',
      origin: 'Bangladesh',
      nutrition: '100% Organic & Chemical-Free',
      image:
        categories[0]?.image ||
        'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80',
      featured: false,
      active: true,
      rating: 4.8,
    });
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormState({ ...p });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name?.trim()) return;

    setSaving(true);
    const productToSave: Product = {
      // Existing products keep their id forever (it is the storefront URL).
      // New ones get a slug of the name; the server makes it unique.
      id: editingProduct ? editingProduct.id : slugify(formState.name),
      name: formState.name.trim(),
      category: formState.category || 'grocery',
      unit: formState.unit || '1 kg',
      price: Number(formState.price) || 0,
      oldPrice: formState.oldPrice ? Number(formState.oldPrice) : undefined,
      stock: Number(formState.stock) || 0,
      sku: formState.sku || `SKU-${Date.now().toString().slice(-4)}`,
      badge: formState.badge || undefined,
      description: formState.description || '',
      origin: formState.origin || 'Bangladesh',
      nutrition: formState.nutrition || '100% Farm Fresh',
      image:
        formState.image ||
        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
      featured: !!formState.featured,
      active: formState.active !== false,
      rating: formState.rating || 4.8,
    };

    await onSaveProduct(productToSave, !editingProduct);
    setSaving(false);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#112a1d]">
            Product Catalog Management
          </h2>
          <p className="text-xs text-[#5a7165]">
            Manage products, real-time inventory, pricing, and Cloudinary media.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={openAddModal}>
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfece3] bg-white p-4 shadow-soft">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#5a7165] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full rounded-xl border border-[#cfe3d6] pl-10 pr-3 py-2 text-xs focus:border-[#1a663b] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-[#cfe3d6] bg-white px-3 py-2 text-xs font-semibold text-[#112a1d] focus:border-[#1a663b] focus:outline-none cursor-pointer"
          >
            <option value="all">All Categories ({products.length})</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.indentedLabel} ({counts.get(o.id)?.total ?? 0})
              </option>
            ))}
          </select>

          {/* Stock Filter Dropdown */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
            className="rounded-xl border border-[#cfe3d6] bg-white px-3 py-2 text-xs font-semibold text-[#112a1d] focus:border-[#1a663b] focus:outline-none cursor-pointer"
          >
            <option value="all">All Stock Levels</option>
            <option value="low">Low Stock (&le; 20 units)</option>
            <option value="out">Out of Stock (0 units)</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-3xl border border-[#dfece3] bg-white shadow-soft overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Package className="w-8 h-8" />}
              title="No products found"
              description="Adjust your search criteria or add a new grocery product to the catalog."
              actionLabel="Add Product"
              onAction={openAddModal}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e6f0e9] bg-[#f7faf8] text-[#5a7165]">
                  <th className="py-3.5 px-4 font-bold">Product</th>
                  <th className="py-3.5 px-3 font-bold">Category</th>
                  <th className="py-3.5 px-3 font-bold">Price (BDT)</th>
                  <th className="py-3.5 px-3 font-bold">Stock</th>
                  <th className="py-3.5 px-3 font-bold">Badges</th>
                  <th className="py-3.5 px-3 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f7f2]">
                {filteredProducts.map((p) => {
                  const outOfStock = p.stock <= 0;
                  const lowStock = !outOfStock && p.stock <= 20;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-[#f9fbf9] transition-colors ${
                        !p.active ? 'opacity-60 bg-gray-50/50' : ''
                      }`}
                    >
                      {/* Product Name & Image */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-12 h-12 rounded-xl object-cover bg-[#f0f7f2] border border-[#e2efe6] shrink-0"
                          />
                          <div>
                            <span className="font-bold text-[#112a1d] text-sm block line-clamp-1">
                              {p.name}
                            </span>
                            <span className="text-[11px] text-[#5a7165]">
                              {p.unit} · SKU: {p.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span
                          className="inline-block rounded-lg bg-[#f0f7f2] px-2.5 py-1 font-bold text-[#14522f]"
                          title={p.category}
                        >
                          {pathById.get(p.category) ?? p.category}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3 font-bold">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-extrabold text-[#1a663b]">
                            {formatBDT(p.price)}
                          </span>
                          {p.oldPrice && (
                            <span className="text-[10px] text-gray-400 line-through">
                              {formatBDT(p.oldPrice)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock with quick inline editor */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            defaultValue={p.stock}
                            onBlur={(e) => {
                              const newStock = Number(e.target.value);
                              if (!isNaN(newStock) && newStock !== p.stock) {
                                onQuickUpdate(p.id, newStock);
                              }
                            }}
                            className="w-16 rounded-lg border border-[#cfe3d6] px-2 py-1 text-xs font-bold text-[#112a1d] focus:border-[#1a663b] focus:outline-none"
                          />
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              outOfStock
                                ? 'bg-red-100 text-red-700'
                                : lowStock
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {outOfStock ? 'Out' : lowStock ? 'Low' : 'OK'}
                          </span>
                        </div>
                      </td>

                      {/* Badges / Featured */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {p.badge && (
                            <span className="rounded-full bg-[#fef3c7] text-[#78350f] px-2 py-0.5 text-[10px] font-bold">
                              {p.badge}
                            </span>
                          )}
                          <button
                            onClick={() => onToggleFeatured(p.id, !p.featured)}
                            title={p.featured ? 'Pinned to Featured' : 'Not Featured'}
                            className={`rounded-full p-1 transition cursor-pointer ${
                              p.featured
                                ? 'text-[#f5b82e] bg-[#fffbeb]'
                                : 'text-gray-300 hover:text-[#f5b82e]'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>
                      </td>

                      {/* Active Status Toggle */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => onToggleActive(p.id, !p.active)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                            p.active
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {p.active ? (
                            <>
                              <Eye className="w-3 h-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" />
                              Hidden
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            className="rounded-lg p-1.5 text-[#5a7165] hover:bg-[#e8f5ee] hover:text-[#1a663b] transition cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(p.id)}
                            className="rounded-lg p-1.5 text-[#5a7165] hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? 'Edit Grocery Item' : 'Add New Grocery Item'}
        subtitle="Manage details, Cloudinary image, stock, and pricing for this product."
        size="xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5a7165] mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formState.name}
                onChange={(e) =>
                  setFormState({ ...formState, name: e.target.value })
                }
                placeholder="e.g. Rajshahi Himsagar Mango"
                className="w-full rounded-xl border border-[#cfe3d6] px-3.5 py-2 text-xs focus:border-[#1a663b] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5a7165] mb-1">
                Category *
              </label>
              <select
                value={formState.category}
                onChange={(e) =>
                  setFormState({ ...formState, category: e.target.value })
                }
                className="w-full rounded-xl border border-[#cfe3d6] bg-white px-3.5 py-2 text-xs focus:border-[#1a663b] focus:outline-none cursor-pointer"
              >
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.path}
                  </option>
                ))}
                {formState.category && !pathById.has(formState.category) && (
                  <option value={formState.category}>{formState.category} (missing)</option>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5a7165] mb-1">
                Pack Unit *
              </label>
              <input
                type="text"
                required
                value={formState.unit}
                onChange={(e) =>
                  setFormState({ ...formState, unit: e.target.value })
                }
                placeholder="e.g. 1 kg, 1 dozen"
                className="w-full rounded-xl border border-[#cfe3d6] px-3.5 py-2 text-xs focus:border-[#1a663b] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5a7165] mb-1">
                Price (BDT) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formState.price}
                onChange={(e) =>
                  setFormState({ ...formState, price: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-[#cfe3d6] px-3.5 py-2 text-xs focus:border-[#1a663b] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5a7165] mb-1">
                Old Price (Optional)
              </label>
              <input
                type="number"
                min="0"
                value={formState.oldPrice || ''}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    oldPrice: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="Strike-through price"
                className="w-full rounded-xl border border-[#cfe3d6] px-3.5 py-2 text-xs focus:border-[#1a663b] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5a7165] mb-1">
                Initial Stock *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formState.stock}
                onChange={(e) =>
                  setFormState({ ...formState, stock: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-[#cfe3d6] px-3.5 py-2 text-xs focus:border-[#1a663b] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5a7165] mb-1">
                SKU Code *
              </label>
              <input
                type="text"
                required
                value={formState.sku}
                onChange={(e) =>
                  setFormState({ ...formState, sku: e.target.value })
                }
                placeholder="e.g. FR-005"
                className="w-full rounded-xl border border-[#cfe3d6] px-3.5 py-2 text-xs focus:border-[#1a663b] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5a7165] mb-1">
                Promotional Badge
              </label>
              <input
                type="text"
                value={formState.badge || ''}
                onChange={(e) =>
                  setFormState({ ...formState, badge: e.target.value })
                }
                placeholder="e.g. Seasonal, Best Seller, Organic"
                className="w-full rounded-xl border border-[#cfe3d6] px-3.5 py-2 text-xs focus:border-[#1a663b] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5a7165] mb-1">
                Farm Origin
              </label>
              <input
                type="text"
                value={formState.origin || ''}
                onChange={(e) =>
                  setFormState({ ...formState, origin: e.target.value })
                }
                placeholder="e.g. Rajshahi Orchards"
                className="w-full rounded-xl border border-[#cfe3d6] px-3.5 py-2 text-xs focus:border-[#1a663b] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5a7165] mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={formState.description || ''}
              onChange={(e) =>
                setFormState({ ...formState, description: e.target.value })
              }
              placeholder="Freshness details, aroma, best use in recipes..."
              className="w-full rounded-xl border border-[#cfe3d6] p-3 text-xs focus:border-[#1a663b] focus:outline-none"
            />
          </div>

          {/* Cloudinary Image Upload & Preview */}
          <ImageUploadField
            label="Product Image (Cloudinary or Direct URL)"
            value={formState.image || ''}
            onChange={(image) => setFormState((prev) => ({ ...prev, image }))}
          />

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-xs font-bold text-[#112a1d] cursor-pointer">
              <input
                type="checkbox"
                checked={formState.featured}
                onChange={(e) =>
                  setFormState({ ...formState, featured: e.target.checked })
                }
                className="w-4 h-4 rounded text-[#1a663b] focus:ring-[#1a663b]"
              />
              <span>Mark as Featured Product</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-[#112a1d] cursor-pointer">
              <input
                type="checkbox"
                checked={formState.active}
                onChange={(e) =>
                  setFormState({ ...formState, active: e.target.checked })
                }
                className="w-4 h-4 rounded text-[#1a663b] focus:ring-[#1a663b]"
              />
              <span>Publish in Active Storefront</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e6f0e9]">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={saving}
            >
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Product Deletion"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#5a7165]">
            Are you sure you want to remove this product from the inventory? This change will synchronize across both the admin and the public storefront.
          </p>
          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                if (deleteConfirmId) {
                  await onDeleteProduct(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

