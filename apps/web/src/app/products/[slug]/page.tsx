import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ProductDetail } from './product-detail';
import { API_BASE_URL } from '@/lib/api';
import type { ApiEnvelope, Product } from '@/lib/types';
import { productJsonLd, breadcrumbJsonLd } from '@/lib/schema';
import { JsonLd } from '@/components/json-ld';

async function getProduct(slug: string): Promise<Product | null> {
  // Network/5xx failures propagate to the error boundary (retryable);
  // only a real 404 means "product does not exist" → not-found page.
  const res = await fetch(`${API_BASE_URL}/products/${slug}`, {
    next: { revalidate: 60 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Product API error ${res.status}`);
  const json = (await res.json()) as ApiEnvelope<Product>;
  return json.data ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Sản phẩm' };

  const description =
    product.shortDescription ??
    product.description?.slice(0, 150) ??
    `${product.name} chính hãng tại HomeMart — giá tốt, giao hàng nhanh.`;

  const image = product.images?.find((img) => img.isPrimary) ?? product.images?.[0];

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.seoTitle ?? product.name,
      description: product.seoDescription ?? description,
      images: image ? [image.url] : undefined,
      type: 'website',
    },
    alternates: { canonical: `/products/${product.slug}` },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const initial = await getProduct(slug);
  // Unknown slug → proper 404 page (previously rendered a blank page).
  if (!initial) notFound();

  const availableStock = initial.inventory?.availableStock;
  const crumbs = breadcrumbJsonLd([
    { name: 'Trang chủ', href: '/' },
    { name: 'Sản phẩm', href: '/products' },
    ...(initial.category ? [{ name: initial.category.name, href: `/danh-muc/${initial.category.slug}` }] : []),
    { name: initial.name, href: `/products/${initial.slug}` },
  ]);

  return (
    <>
      <JsonLd data={crumbs} />
      <JsonLd
        data={productJsonLd({
          slug: initial.slug,
          name: initial.name,
          sku: initial.sku,
          shortDescription: initial.shortDescription,
          price: initial.price,
          compareAtPrice: initial.compareAtPrice,
          status: initial.status,
          ratingAvg: initial.ratingAvg,
          reviewCount: initial.reviewCount,
          brandName: initial.brand?.name ?? null,
          categoryName: initial.category?.name ?? null,
          images: initial.images,
          availableStock,
        })}
      />
      <ProductDetail slug={slug} initial={initial} />
    </>
  );
}
