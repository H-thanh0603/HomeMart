import type { Metadata } from 'next';
import { getCategoryTheme } from '@/lib/category-themes';
import { CategoryView } from './category-view';

interface Props {
  params: { slug: string };
}

export function generateMetadata({ params }: Props): Metadata {
  const theme = getCategoryTheme(params.slug);
  return {
    title: `${theme.name} — ${theme.title}`,
    description: theme.description,
  };
}

export default function CategoryLandingPage({ params }: Props) {
  return <CategoryView slug={params.slug} />;
}
