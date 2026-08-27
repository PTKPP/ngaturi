import { daztoreInv1Assets } from "../assets";
import styles from "../styles.module.css";
import { ThemeIcon } from "./Icons";
import { Reveal } from "./Reveal";
import { ThemeImage } from "./ThemeImage";

export function GallerySection({ gallery, coupleNames }: { gallery: string[]; coupleNames: string }) {
  if (gallery.length === 0) return null;
  return <section className={styles.section} id="daztore-gallery" aria-labelledby="daztore-gallery-title"><Reveal className={styles.sectionIntro}><ThemeIcon name="photo" /><p className={styles.kicker}>Moments</p><h2 id="daztore-gallery-title">Galeri</h2><p>Potongan cerita dan momen berharga {coupleNames}.</p></Reveal><div className={styles.galleryGrid} data-count={Math.min(gallery.length, 3)} aria-label={`Galeri ${coupleNames}`}>{gallery.map((image, index) => <figure key={`${image}-${index}`}><ThemeImage src={image} fallback={daztoreInv1Assets.thumbnail} alt={`Momen ${coupleNames} ${index + 1}`} /><figcaption>Momen {index + 1}</figcaption></figure>)}</div></section>;
}
