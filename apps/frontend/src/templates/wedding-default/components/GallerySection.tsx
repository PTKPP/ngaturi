import { weddingDefaultAssets } from "../assets";
import styles from "../styles.module.css";
import { ThemeIcon } from "./Icons";
import { Reveal } from "./Reveal";
import { ThemeImage } from "./ThemeImage";
import type { TemplateMedia } from "@/templates/types";

export function GallerySection({ gallery, coupleNames, media }: { gallery: string[]; coupleNames: string; media: TemplateMedia[] }) {
  if (gallery.length === 0) return null;
  return <section className={styles.section} id="wedding-default-gallery" aria-labelledby="wedding-default-gallery-title"><Reveal className={styles.sectionIntro}><ThemeIcon name="photo" /><p className={styles.kicker}>Moments</p><h2 id="wedding-default-gallery-title">Galeri</h2><p>Potongan cerita dan momen berharga {coupleNames}.</p></Reveal><div className={styles.galleryGrid} data-count={Math.min(gallery.length, 3)} aria-label={`Galeri ${coupleNames}`}>{gallery.map((image, index) => { const metadata = media.find((item) => item.id === image); return <figure key={`${image}-${index}`}><ThemeImage src={image} fallback={weddingDefaultAssets.thumbnail} alt={metadata?.altText ?? `Momen ${coupleNames} ${index + 1}`} /><figcaption>{metadata?.altText ?? `Momen ${index + 1}`}</figcaption></figure>; })}</div></section>;
}
