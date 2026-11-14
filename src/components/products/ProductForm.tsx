'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'motion/react';
import { ArrowLeft, ExternalLink, ImageIcon, Info, Leaf, Save, Store, Tags, Trash2, Wallet } from 'lucide-react';
import type { Category, Product } from '@/types/store';
import { slugify } from '@/lib/slug';
import { formatBDT } from '@/lib/format';
import { useStoreAction } from '@/lib/client/store-action';
import { useUnsavedChangesGuard } from '@/lib/client/use-unsaved-guard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Field, FormErrorSummary, Input, NumberInput, PriceInput, TagInput, Textarea } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Checkbox';
import { CategoryTreeSelect } from '@/components/ui/CategoryTreeSelect';
import { ImageGallery } from '@/components/ui/ImageGallery';
import { Button, buttonClass } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { riseChild, staggerParent } from '@/components/ui/motion';

const schema = z
  .object({
    name: z.string().trim().min(1, 'Product name is required.').max(200, 'Keep the name under 200 characters.'),
    category: z.string().min(1, 'Choose a category.'),
    unit: z.string().trim().min(1, 'Unit is required (e.g. 1 kg, 500 g, 12 pcs).').max(100),
    price: z.number({ error: 'Enter a price.' }).min(0, 'Price cannot be negative.').max(99_999_999, 'Price is too large.'),
    oldPrice: z.number().min(0).max(99_999_999).nullable(),
    stock: z.number({ error: 'Enter the stock.' }).int('Stock must be a whole number.').min(0, 'Stock cannot be negative.'),
    sku: z.string().trim().max(100),
    badge: z.string().trim().max(100),
    description: z.string().max(5000, 'Keep the description under 5000 characters.'),
    origin: z.string().trim().max(500),
    nutrition: z.string().max(2000),
    tags: z.array(z.string()).max(50),
    images: z.array(z.string()).max(8),
    featured: z.boolean(),
    active: z.boolean(),
    rating: z.number().min(0).max(5).nullable(),
  })
  .refine((v) => v.oldPrice === null || v.oldPrice > v.price, {
    path: ['oldPrice'],
    message: 'The old (crossed-out) price should be higher than the price.',
  });

type FormValues = z.infer<typeof schema>;

const LABELS: Partial<Record<keyof FormValues, string>> = {
  name: 'Name',
  category: 'Category',
  unit: 'Unit',
  price: 'Price',
  oldPrice: 'Old price',
  stock: 'Stock',
  description: 'Description',
};

function toValues(p: Product | null): FormValues {
  return {
    name: p?.name ?? '',
    category: p?.category ?? '',
    unit: p?.unit ?? '1 kg',
    price: p?.price ?? 0,
    oldPrice: p?.oldPrice ?? null,
    stock: p?.stock ?? 0,
    sku: p?.sku ?? '',
    badge: p?.badge ?? '',
    description: p?.description ?? '',
    origin: p?.origin ?? '',
    nutrition: p?.nutrition ?? '',
    tags: p?.tags ?? [],
    images: p ? [p.image, ...(p.images ?? [])].filter(Boolean) : [],
    featured: p?.featured ?? false,
    active: p?.active ?? true,
    rating: p ? null : 4.5,
  };
}

const TAG_SUGGESTIONS = ['organic', 'local', 'seasonal', 'imported', 'fresh', 'frozen', 'gluten-free', 'best seller'];

export function ProductForm({
  product,
  categories,
  categoryTotals,
  storefrontUrl,
}: {
  product: Product | null;
  categories: Category[];
  categoryTotals: Record<string, number>;
  storefrontUrl?: string;
}) {
  const router = useRouter();
  const isNew = !product;
  const { run, pending } = useStoreAction();
  const confirm = useConfirm();
  const topRef = useRef<HTMLDivElement>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    setFocus,
    watch,
    formState: { errors, isDirty, isSubmitted },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(product), mode: 'onTouched' });

  const guard = useUnsavedChangesGuard(isDirty && !pending);

  // After a successful save of an existing product, the server data changes:
  // reset the form to it so it is no longer "dirty".
  useEffect(() => {
    reset(toValues(product));
  }, [product, reset]);

  const name = watch('name');
  const price = watch('price');
  const oldPrice = watch('oldPrice');
  const errorList = Object.entries(errors).map(([field, e]) => ({
    field,
    message: `${LABELS[field as keyof FormValues] ?? field}: ${(e as { message?: string })?.message ?? 'Invalid value.'}`,
  }));

  const onValid = async (v: FormValues) => {
    const id = product ? product.id : slugify(v.name);
    const out = await run(
      'SAVE_PRODUCT',
      {
        id,
        isNew,
        name: v.name,
        category: v.category,
        unit: v.unit,
        price: v.price,
        oldPrice: v.oldPrice,
        stock: v.stock,
        sku: v.sku,
        badge: v.badge || null,
        description: v.description,
        origin: v.origin || null,
        nutrition: v.nutrition || null,
        tags: v.tags,
        image: v.images[0] ?? '',
        images: v.images.slice(1),
        featured: v.featured,
        active: v.active,
        rating: isNew ? v.rating : undefined,
      },
      { success: isNew ? 'Product created' : 'Changes saved', successDetail: v.name },
      { refresh: !isNew }
    );
    if (out.ok) {
      reset(v);
      if (isNew) {
        guard.allowNextNavigation();
        router.replace(`/products/${encodeURIComponent(out.result?.id ?? id)}`);
      }
    }
  };

  const onInvalid = (errs: FieldErrors<FormValues>) => {
    topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    const first = Object.keys(errs)[0] as keyof FormValues | undefined;
    if (first && first !== 'images' && first !== 'tags') window.setTimeout(() => setFocus(first), 250);
  };

  const remove = async () => {
    if (!product) return;
    const ok = await confirm({
      title: `Delete “${product.name}”?`,
      description: 'It disappears from the storefront and the catalog. Past orders keep their copy. This can’t be undone.',
      confirmLabel: 'Delete product',
      tone: 'danger',
    });
    if (!ok) return;
    const out = await run('DELETE_PRODUCT', { id: product.id }, { success: 'Product deleted' }, { refresh: false });
    if (out.ok) {
      guard.allowNextNavigation();
      router.replace('/products');
    }
  };

  const discount = oldPrice && price && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;

  return (
    <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate className="pb-24">
      <div ref={topRef} className="scroll-mt-24" />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link href="/products" className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> All products
          </Link>
          <h1 className="font-display truncate text-[28px] font-semibold leading-tight text-ink">{isNew ? 'New product' : product.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {isNew ? (
              <>
                Storefront link: <span className="tabular font-medium text-ink">/product/{slugify(name || '') || 'your-product-name'}</span>
              </>
            ) : (
              <>
                /product/{product.id} · {product.soldCount ?? 0} sold · rated {product.rating.toFixed(1)} from {product.reviewCount ?? 0} reviews
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isNew && storefrontUrl && (
            <a href={`${storefrontUrl.replace(/\/$/, '')}/product/${encodeURIComponent(product.id)}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-primary-600 transition hover:bg-mint">
              <Store className="h-4 w-4" /> View in store <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {!isNew && (
            <Button variant="danger-soft" onClick={remove} disabled={pending}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      {isSubmitted && errorList.length > 0 && (
        <div className="mb-6">
          <FormErrorSummary errors={errorList} onJump={(f) => f !== 'images' && f !== 'tags' && setFocus(f as keyof FormValues)} />
        </div>
      )}

      <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid grid-cols-1 gap-6 xl:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 xl:col-span-2">
          <motion.div variants={riseChild}>
            <Card>
              <CardHeader title="Basics" description="What customers see first." icon={<Info className="h-[18px] w-[18px]" />} />
              <div className="space-y-5 p-5">
                <Field label="Product name" required error={errors.name?.message} counter={{ value: name?.length ?? 0, max: 200 }}>
                  {({ id, describedBy, invalid }) => (
                    <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} placeholder="e.g. Himsagar Mango" {...register('name')} />
                  )}
                </Field>
                <Field label="Description" optional error={errors.description?.message} help="Shown on the product page. Plain text; line breaks are kept.">
                  {({ id, describedBy, invalid }) => (
                    <Controller
                      control={control}
                      name="description"
                      render={({ field }) => (
                        <Textarea
                          id={id}
                          aria-describedby={describedBy}
                          aria-invalid={invalid}
                          maxLength={5000}
                          minRows={4}
                          placeholder="Taste, freshness, how to store it…"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                  )}
                </Field>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={riseChild}>
            <Card>
              <CardHeader title="Images" description="The first image is the main photo." icon={<ImageIcon className="h-[18px] w-[18px]" />} />
              <div className="p-5">
                <Controller control={control} name="images" render={({ field }) => <ImageGallery value={field.value} onChange={field.onChange} error={errors.images?.message} />} />
              </div>
            </Card>
          </motion.div>

          <motion.div variants={riseChild}>
            <Card>
              <CardHeader title="Pricing & inventory" icon={<Wallet className="h-[18px] w-[18px]" />} />
              <div className="grid gap-5 p-5 sm:grid-cols-2">
                <Field label="Price" required error={errors.price?.message}>
                  {({ id, describedBy, invalid }) => (
                    <Controller
                      control={control}
                      name="price"
                      render={({ field }) => (
                        <PriceInput id={id} aria-describedby={describedBy} aria-invalid={invalid} value={field.value} onChange={(v) => field.onChange(v ?? 0)} onBlur={field.onBlur} />
                      )}
                    />
                  )}
                </Field>
                <Field
                  label="Old price"
                  optional
                  error={errors.oldPrice?.message}
                  help={discount ? `Shows as ${discount}% off (${formatBDT(oldPrice!)} crossed out).` : 'Set it to show a crossed-out price and a discount.'}
                >
                  {({ id, describedBy, invalid }) => (
                    <Controller
                      control={control}
                      name="oldPrice"
                      render={({ field }) => (
                        <PriceInput id={id} aria-describedby={describedBy} aria-invalid={invalid} allowEmpty placeholder="None" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                      )}
                    />
                  )}
                </Field>
                <Field label="Stock" required error={errors.stock?.message} help="Units available to sell right now.">
                  {({ id, describedBy, invalid }) => (
                    <Controller
                      control={control}
                      name="stock"
                      render={({ field }) => (
                        <NumberInput id={id} aria-describedby={describedBy} aria-invalid={invalid} min={0} max={1_000_000} value={field.value} onChange={(v) => field.onChange(v ?? 0)} suffix="units" />
                      )}
                    />
                  )}
                </Field>
                <Field label="Unit" required error={errors.unit?.message} help="How it is sold, e.g. 1 kg, 500 g, 1 dozen.">
                  {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} placeholder="1 kg" {...register('unit')} />}
                </Field>
                <Field label="SKU" optional error={errors.sku?.message}>
                  {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} placeholder="e.g. FRT-MNG-001" {...register('sku')} />}
                </Field>
                {isNew && (
                  <Field label="Starting rating" optional help="Used until real reviews arrive.">
                    {({ id, describedBy }) => (
                      <Controller
                        control={control}
                        name="rating"
                        render={({ field }) => (
                          <NumberInput id={id} aria-describedby={describedBy} min={0} max={5} step={0.1} decimals={1} allowEmpty value={field.value} onChange={field.onChange} suffix="/ 5" />
                        )}
                      />
                    )}
                  </Field>
                )}
              </div>
            </Card>
          </motion.div>

          <motion.div variants={riseChild}>
            <Card>
              <CardHeader title="Details" description="Extra information on the product page." icon={<Tags className="h-[18px] w-[18px]" />} />
              <div className="grid gap-5 p-5 sm:grid-cols-2">
                <Field label="Origin" optional error={errors.origin?.message}>
                  {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} placeholder="e.g. Rajshahi farms" {...register('origin')} />}
                </Field>
                <Field label="Nutrition / quality note" optional error={errors.nutrition?.message}>
                  {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} placeholder="e.g. Rich in vitamin C" {...register('nutrition')} />}
                </Field>
                <Field label="Tags" optional className="sm:col-span-2" help="Press Enter or comma to add. Used for search and filters.">
                  {({ id, describedBy }) => (
                    <Controller
                      control={control}
                      name="tags"
                      render={({ field }) => <TagInput id={id} aria-describedby={describedBy} value={field.value} onChange={field.onChange} suggestions={TAG_SUGGESTIONS} />}
                    />
                  )}
                </Field>
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <motion.div variants={riseChild}>
            <Card>
              <CardHeader title="Visibility" icon={<Store className="h-[18px] w-[18px]" />} />
              <div className="space-y-4 p-5">
                <Controller
                  control={control}
                  name="active"
                  render={({ field }) => (
                    <Switch label="Active on storefront" description="Customers can see and order it." checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                <div className="h-px bg-line" />
                <Controller
                  control={control}
                  name="featured"
                  render={({ field }) => (
                    <Switch
                      label={
                        <span className="inline-flex items-center gap-1.5">
                          <Leaf className="h-4 w-4 text-primary" /> Featured
                        </span>
                      }
                      description="Shown in the home page’s featured row."
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </Card>
          </motion.div>

          <motion.div variants={riseChild}>
            <Card>
              <CardHeader title="Organization" />
              <div className="space-y-5 p-5">
                <Field label="Category" required error={errors.category?.message} help="Any level of the tree. Parent pages include subcategory products.">
                  {({ id, describedBy, invalid }) => (
                    <Controller
                      control={control}
                      name="category"
                      render={({ field }) => (
                        <CategoryTreeSelect
                          id={id}
                          aria-describedby={describedBy}
                          aria-invalid={invalid}
                          categories={categories}
                          counts={new Map(Object.entries(categoryTotals))}
                          value={field.value || null}
                          onChange={(v) => field.onChange(v ?? '')}
                          name="category"
                          placeholder="Choose a category"
                          onCreateSubcategory={(parentId) => window.open(`/categories?add=${encodeURIComponent(parentId)}`, '_blank', 'noopener')}
                        />
                      )}
                    />
                  )}
                </Field>
                <Field label="Badge" optional error={errors.badge?.message} help="Short label on the product card, e.g. “Farm fresh”.">
                  {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} placeholder="e.g. Farm fresh" maxLength={100} {...register('badge')} />}
                </Field>
              </div>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/90 backdrop-blur-xl lg:left-[var(--sidebar-w)] lg:sidebar-collapsed:left-[var(--sidebar-w-collapsed)] print:hidden">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-[13px] text-muted" aria-live="polite">
            {pending ? 'Saving…' : isDirty ? (
              <span className="inline-flex items-center gap-2 font-medium text-[#7a4b06]">
                <span className="h-2 w-2 rounded-full bg-highlight" /> Unsaved changes
              </span>
            ) : isNew ? 'Fill in the details, then create the product.' : 'All changes saved.'}
          </p>
          <div className="flex gap-2">
            <Link href="/products" className={buttonClass('outline', 'md')} aria-disabled={pending}>
              Cancel
            </Link>
            <Button type="submit" loading={pending} disabled={!isDirty && !isNew}>
              <Save className="h-4 w-4" /> {isNew ? 'Create product' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
