import type { Metadata } from 'next';
import { getCategoryTheme } from '@/lib/category-themes';
import { CategoryView } from './category-view';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const theme = getCategoryTheme(slug);
  return {
    title: `${theme.name} — ${theme.title}`,
    description: theme.description,
  };
}

export default async function CategoryLandingPage({ params }: Props) {
  const { slug } = await params;
  return <CategoryView slug={slug} />;
}
