import type { Metadata } from 'next';
import { ProductDetail } from './product-detail';
import { API_BASE_URL } from '@/lib/api';
import type { ApiEnvelope, Product } from '@/lib/types';

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ApiEnvelope<Product>;
    return json.data ?? null;
  } catch {
    return null;
  }
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
  return <ProductDetail slug={slug} initial={initial} />;
}
