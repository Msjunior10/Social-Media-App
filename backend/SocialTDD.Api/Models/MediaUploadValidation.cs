using Microsoft.AspNetCore.Http;

namespace SocialTDD.Api.Models;

internal static class MediaUploadValidation
{
    private static readonly Dictionary<string, HashSet<string>> AllowedContentTypesByExtension = new(StringComparer.OrdinalIgnoreCase)
    {
        [".jpg"] = new(StringComparer.OrdinalIgnoreCase) { "image/jpeg" },
        [".jpeg"] = new(StringComparer.OrdinalIgnoreCase) { "image/jpeg" },
        [".png"] = new(StringComparer.OrdinalIgnoreCase) { "image/png" },
        [".gif"] = new(StringComparer.OrdinalIgnoreCase) { "image/gif" },
        [".webp"] = new(StringComparer.OrdinalIgnoreCase) { "image/webp" },
        [".mp4"] = new(StringComparer.OrdinalIgnoreCase) { "video/mp4" },
        [".webm"] = new(StringComparer.OrdinalIgnoreCase) { "video/webm" },
        [".ogg"] = new(StringComparer.OrdinalIgnoreCase) { "video/ogg", "audio/ogg", "application/ogg" },
    };

    public static string? Validate(IFormFile media, IReadOnlySet<string> allowedExtensions, long maxMediaSizeBytes, string allowedTypesMessage)
    {
        if (media.Length <= 0)
        {
            return "Den uppladdade filen är tom.";
        }

        if (media.Length > maxMediaSizeBytes)
        {
            return $"Mediafilen får inte vara större än {maxMediaSizeBytes / (1024 * 1024)} MB.";
        }

        var extension = Path.GetExtension(media.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !allowedExtensions.Contains(extension))
        {
            return allowedTypesMessage;
        }

        if (!AllowedContentTypesByExtension.TryGetValue(extension, out var allowedContentTypes))
        {
            return allowedTypesMessage;
        }

        if (string.IsNullOrWhiteSpace(media.ContentType) || !allowedContentTypes.Contains(media.ContentType))
        {
            return "Filens MIME-typ matchar inte den uppladdade mediatypen.";
        }

        if (!HasKnownFileSignature(media, extension))
        {
            return "Filen matchar inte ett giltigt bild- eller videoformat.";
        }

        return null;
    }

    private static bool HasKnownFileSignature(IFormFile media, string extension)
    {
        var buffer = new byte[64];
        using var stream = media.OpenReadStream();
        var bytesRead = stream.Read(buffer, 0, buffer.Length);

        if (bytesRead == 0)
        {
            return false;
        }

        return extension.ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => bytesRead >= 3 && buffer[0] == 0xFF && buffer[1] == 0xD8 && buffer[2] == 0xFF,
            ".png" => bytesRead >= 8 && buffer[0] == 0x89 && buffer[1] == 0x50 && buffer[2] == 0x4E && buffer[3] == 0x47 && buffer[4] == 0x0D && buffer[5] == 0x0A && buffer[6] == 0x1A && buffer[7] == 0x0A,
            ".gif" => bytesRead >= 6 && buffer[0] == 0x47 && buffer[1] == 0x49 && buffer[2] == 0x46 && buffer[3] == 0x38 && (buffer[4] == 0x37 || buffer[4] == 0x39) && buffer[5] == 0x61,
            ".webp" => bytesRead >= 12 && MatchesAscii(buffer, 0, "RIFF") && MatchesAscii(buffer, 8, "WEBP"),
            ".mp4" => bytesRead >= 12 && MatchesAscii(buffer, 4, "ftyp"),
            ".webm" => bytesRead >= 4 && buffer[0] == 0x1A && buffer[1] == 0x45 && buffer[2] == 0xDF && buffer[3] == 0xA3,
            ".ogg" => bytesRead >= 4 && MatchesAscii(buffer, 0, "OggS"),
            _ => false,
        };
    }

    private static bool MatchesAscii(byte[] buffer, int offset, string expected)
    {
        if (buffer.Length < offset + expected.Length)
        {
            return false;
        }

        for (var index = 0; index < expected.Length; index++)
        {
            if (buffer[offset + index] != expected[index])
            {
                return false;
            }
        }

        return true;
    }
}