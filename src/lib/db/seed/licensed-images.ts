// Freely licensed images of Hearts2Hearts from Wikimedia Commons, hotlinked from upload.wikimedia.org (nothing copied).
// Each entry keeps what its licence requires us to show. Sources and licences are listed in docs/image-slots-audit.md.

export interface LicensedImage {
  src: string;
  alt: string;
  /** Author as named on the Commons file page. */
  author: string;
  license: string;
  /** Empty for public-domain files. */
  licenseUrl: string;
  /** Commons file page (source and full licence terms). */
  sourceUrl: string;
}

/** Group photo, SBS Radio commute, 5 Mar 2025. Wikipedia caption: "Hearts2Hearts in March 2025". CC BY 3.0: attribution required. */
export const GROUP_PHOTO: LicensedImage = {
  src: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/250305_%ED%95%98%EC%B8%A0%ED%88%AC%ED%95%98%EC%B8%A0_Hearts2Hearts_SBS_Radio_Commute.jpg/960px-250305_%ED%95%98%EC%B8%A0%ED%88%AC%ED%95%98%EC%B8%A0_Hearts2Hearts_SBS_Radio_Commute.jpg",
  alt: "The eight members of Hearts2Hearts standing in a row outside SBS, March 2025",
  author: "티비텐 (TV10) / K-POPIT 케이팝잇",
  license: "CC BY 3.0",
  licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:250305_%ED%95%98%EC%B8%A0%ED%88%AC%ED%95%98%EC%B8%A0_Hearts2Hearts_SBS_Radio_Commute.jpg",
};

/** Official wordmark. Public domain as a simple text logo ({{PD-textlogo}}); still a trademark of SM Entertainment. */
export const GROUP_LOGOTYPE: LicensedImage = {
  src: "https://upload.wikimedia.org/wikipedia/commons/8/82/Hearts2Hearts_logotype.svg",
  alt: "Hearts2Hearts logo",
  author: "SM Entertainment",
  license: "Public domain (text logo), trademark of SM Entertainment",
  licenseUrl: "",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Hearts2Hearts_logotype.svg",
};
