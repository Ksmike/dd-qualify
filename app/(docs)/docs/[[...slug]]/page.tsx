import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLabelsForLocale } from "@/labels";
import { getAllDocs, getDocBySlug } from "@/lib/docs";
import { DocsShell } from "../DocsShell";

type DocsPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export async function generateStaticParams() {
  const docs = await getAllDocs();
  return [{ slug: [] }, ...docs.map((doc) => ({ slug: doc.routeSegments }))];
}

export async function generateMetadata({
  params,
}: DocsPageProps): Promise<Metadata> {
  const { slug = [] } = await params;
  const { labels } = getLabelsForLocale("en");

  if (slug.length === 0) {
    return {
      title: labels.docs.heading,
      description: labels.docs.description,
    };
  }

  const doc = await getDocBySlug(slug);
  if (!doc) {
    return {
      title: labels.docs.heading,
      description: labels.docs.description,
    };
  }

  return {
    title: `${doc.title} | ${labels.docs.heading}`,
    description: doc.summary || labels.docs.description,
  };
}

export default async function DocsPage({ params }: DocsPageProps) {
  const { slug = [] } = await params;
  const { labels } = getLabelsForLocale("en");
  const docs = await getAllDocs();

  if (docs.length === 0) {
    notFound();
  }

  const currentDoc = slug.length === 0 ? null : await getDocBySlug(slug);
  if (slug.length > 0 && !currentDoc) {
    notFound();
  }

  return <DocsShell currentDoc={currentDoc} docs={docs} labels={labels.docs} />;
}
