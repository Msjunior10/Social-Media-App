using FluentValidation;
using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Validators;

public class UpdateUserProfileRequestValidator : AbstractValidator<UpdateUserProfileRequest>
{
    public UpdateUserProfileRequestValidator()
    {
        RuleFor(x => x.Bio)
            .MaximumLength(500)
            .WithMessage("Bio får inte vara längre än 500 tecken.");

        RuleFor(x => x.ProfileImageUrl)
            .MaximumLength(2048)
            .WithMessage("Profilbildens URL får inte vara längre än 2048 tecken.")
            .Must(BeAValidUrl)
            .When(x => !string.IsNullOrWhiteSpace(x.ProfileImageUrl))
            .WithMessage("Profilbildens URL måste vara en giltig http- eller https-adress.");
    }

    private static bool BeAValidUrl(string? url)
    {
        return Uri.TryCreate(url, UriKind.Absolute, out var parsedUri)
            && (parsedUri.Scheme == Uri.UriSchemeHttp || parsedUri.Scheme == Uri.UriSchemeHttps);
    }
}
