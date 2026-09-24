import type { AppLocale } from "./config";

export async function loadMessages(locale: AppLocale) {
  const [common, member, operations] = await Promise.all([
    import(`../messages/common-${locale}.json`),
    import(`../messages/member-${locale}.json`),
    import(`../messages/operations-${locale}.json`)
  ]);
  return { ...common.default, Member: member.default, Operations: operations.default };
}
