<?php

namespace App\Support;

class PhoneNormalizer
{
    public static function digits(string $value): string
    {
        return preg_replace('/\D+/', '', $value) ?? '';
    }

    public static function isPhoneLike(string $value): bool
    {
        $digits = self::digits($value);
        if (strlen($digits) < 7) {
            return false;
        }

        // If it contains many letters, treat it as not-a-phone search.
        $letters = preg_match_all('/[a-zA-Z]/', $value) ?: 0;
        return $letters === 0;
    }

    /**
     * Normalize to a "local digits" format to reduce formatting differences:
     * - Egypt: 010xxxxxxxx
     * - KSA/UAE: 05xxxxxxxx
     */
    public static function normalize(string $raw, ?string $countryHint = null): string
    {
        $digits = self::digits($raw);
        if ($digits === '') {
            return '';
        }

        // Remove leading international call prefix "00"
        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        // Some users type a trunk "0" before the country code: 020..., 0966..., 0971...
        // Normalize that to the expected country-code format.
        foreach (['20', '966', '971'] as $cc) {
            if (str_starts_with($digits, '0' . $cc)) {
                $digits = substr($digits, 1);
                break;
            }
        }

        // Country-hint if provided
        $hintDigits = $countryHint ? self::digits($countryHint) : '';
        if ($hintDigits !== '') {
            if ($hintDigits === '20') {
                $egypt = self::normalizeEgypt($digits);
                if ($egypt !== '') {
                    return $egypt;
                }
            }
            if ($hintDigits === '966') {
                $ksa = self::normalizeGulf($digits, '966');
                if ($ksa !== '') {
                    return $ksa;
                }
            }
            if ($hintDigits === '971') {
                $uae = self::normalizeGulf($digits, '971');
                if ($uae !== '') {
                    return $uae;
                }
            }
        }

        // Infer from prefixes
        if (str_starts_with($digits, '20')) {
            $egypt = self::normalizeEgypt($digits);
            if ($egypt !== '') {
                return $egypt;
            }
        }
        if (str_starts_with($digits, '966')) {
            $ksa = self::normalizeGulf($digits, '966');
            if ($ksa !== '') {
                return $ksa;
            }
        }
        if (str_starts_with($digits, '971')) {
            $uae = self::normalizeGulf($digits, '971');
            if ($uae !== '') {
                return $uae;
            }
        }

        // Already-local cases
        if (strlen($digits) === 11 && str_starts_with($digits, '01')) {
            return $digits; // Egypt local
        }
        if (strlen($digits) === 10 && str_starts_with($digits, '05')) {
            return $digits; // Gulf local
        }

        // Egypt without leading 0 (10 digits starting with 1)
        if (strlen($digits) === 10 && str_starts_with($digits, '1')) {
            return '0' . $digits;
        }

        // Gulf without leading 0 (9 digits starting with 5)
        if (strlen($digits) === 9 && str_starts_with($digits, '5')) {
            return '0' . $digits;
        }

        return $digits;
    }

    public static function variantsForSearch(string $raw, ?string $countryHint = null): array
    {
        $raw = trim($raw);
        if ($raw === '') {
            return [];
        }

        $variants = [];
        $variants[] = $raw;

        $digits = self::digits($raw);
        if ($digits !== '') {
            $variants[] = $digits;
        }

        $norm = self::normalize($raw, $countryHint);
        if ($norm !== '') {
            $variants[] = $norm;
        }

        // Without the leading 0
        if ($norm !== '' && str_starts_with($norm, '0')) {
            $variants[] = substr($norm, 1);
        }

        // Egypt variants
        if ($norm !== '' && strlen($norm) === 11 && str_starts_with($norm, '01')) {
            $noZero = substr($norm, 1);
            $variants[] = '20' . $noZero;
            $variants[] = '0020' . $noZero;
            $variants[] = '+20' . $noZero;
        }

        // Gulf variants (KSA/UAE)
        if ($norm !== '' && strlen($norm) === 10 && str_starts_with($norm, '05')) {
            $noZero = substr($norm, 1); // 5xxxxxxxx
            foreach (['966', '971'] as $cc) {
                $variants[] = $cc . $noZero;
                $variants[] = '00' . $cc . $noZero;
                $variants[] = '+' . $cc . $noZero;
            }
        }

        // Normalize: unique, non-empty, trimmed
        $out = [];
        foreach ($variants as $v) {
            $v = trim((string) $v);
            if ($v === '') {
                continue;
            }
            $out[$v] = true;
        }
        return array_keys($out);
    }

    private static function normalizeEgypt(string $digits): string
    {
        // Expect digits starting with 20....
        if (str_starts_with($digits, '20')) {
            $rest = substr($digits, 2);
            if ($rest === '') {
                return '';
            }

            // If rest already starts with 0 (e.g., 20010...), remove that 0
            if (str_starts_with($rest, '0')) {
                $rest = substr($rest, 1);
            }

            // Mobile numbers commonly start with 1 and length is 10 (without leading 0)
            if (strlen($rest) === 10 && str_starts_with($rest, '1')) {
                return '0' . $rest; // 010xxxxxxxx
            }
        }

        return '';
    }

    private static function normalizeGulf(string $digits, string $countryCode): string
    {
        if (!str_starts_with($digits, $countryCode)) {
            return '';
        }

        $rest = substr($digits, strlen($countryCode));
        if ($rest === '') {
            return '';
        }

        // Some inputs may include a leading 0 after the country code (e.g., 96605...)
        if (str_starts_with($rest, '0')) {
            $rest = substr($rest, 1);
        }

        // Mobile numbers in KSA/UAE start with 5 and are 9 digits without leading 0
        if (strlen($rest) === 9 && str_starts_with($rest, '5')) {
            return '0' . $rest; // 05xxxxxxxx
        }

        return '';
    }
}
