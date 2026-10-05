import type { Metadata } from "next";
import { ModelPage } from "@/components/models/ModelPage";
import { getModel } from "@/config/models";

const model = getModel("sell-my-range-rover");

export const metadata: Metadata = {
  title: model.metaTitle,
  description: model.metaDescription,
  alternates: { canonical: `/${model.slug}` },
};

export default function Page() {
  return <ModelPage model={model} />;
}
