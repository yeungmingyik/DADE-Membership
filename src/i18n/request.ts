import { getRequestConfig } from "next-intl/server";
import { isLocale } from "./config";
import { loadMessages } from "./messages";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isLocale(requested) ? requested : "en";
  return { locale, messages: await loadMessages(locale), timeZone: "Asia/Singapore" };
});
