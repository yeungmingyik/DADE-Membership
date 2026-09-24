import { parsePhoneNumberWithError, type CountryCode } from "libphonenumber-js/max";

export type { CountryCode } from "libphonenumber-js/max";

export type RegistrationPhone = {
  e164: string;
  country: CountryCode | null;
  callingCode: string;
  nationalNumber: string;
};

export function parseRegistrationPhone(
  input: string,
  country: CountryCode = "SG",
): RegistrationPhone | null {
  if (
    typeof input !== "string" ||
    input.length > 64 ||
    !/^[+\d\s().-]+$/.test(input) ||
    /[\r\n]/.test(input)
  ) {
    return null;
  }

  try {
    const phone = parsePhoneNumberWithError(input.trim(), {
      defaultCountry: country,
      extract: false,
    });

    if (!phone.isValid() || phone.ext) {
      return null;
    }

    return {
      e164: phone.number,
      country: phone.country ?? null,
      callingCode: phone.countryCallingCode,
      nationalNumber: phone.nationalNumber,
    };
  } catch {
    return null;
  }
}

export function normalizePhone(input: string, country: CountryCode = "SG") {
  return parseRegistrationPhone(input, country)?.e164 ?? null;
}
