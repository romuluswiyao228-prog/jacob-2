declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import i18n from "@/i18n/i18n";
import fr from "@/i18n/locales/fr.json";

i18n.addResourceBundle("fr", "translation", fr, true, true);
i18n.changeLanguage("fr");

export {};
