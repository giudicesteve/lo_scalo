import { PublicPageWrapper } from "@/components/maintenance";
import HomePageClient from "./HomePageClient";

export const metadata = {
  title: "Lo Scalo - Craft Drinks by the Lake",
  description: "Cocktail bar by Lake Como",
};

export default function HomePage() {
  return (
    <PublicPageWrapper>
      <HomePageClient />
    </PublicPageWrapper>
  );
}
