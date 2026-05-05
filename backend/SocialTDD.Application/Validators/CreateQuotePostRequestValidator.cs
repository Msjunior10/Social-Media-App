using FluentValidation;
using SocialTDD.Application.DTOs;

namespace SocialTDD.Application.Validators;

public class CreateQuotePostRequestValidator : AbstractValidator<CreateQuotePostRequest>
{
    private const int MaxMessageLength = 500;
    private const int MinMessageLength = 1;

    public CreateQuotePostRequestValidator()
    {
        RuleFor(x => x.Message)
            .NotNull()
            .WithMessage("Citattext är obligatorisk.")
            .Must(message => !string.IsNullOrWhiteSpace(message))
            .WithMessage("Citattext får inte vara tom eller bara innehålla mellanslag.")
            .MinimumLength(MinMessageLength)
            .WithMessage($"Citattext måste vara minst {MinMessageLength} tecken.")
            .MaximumLength(MaxMessageLength)
            .WithMessage($"Citattext får inte vara längre än {MaxMessageLength} tecken.")
            .Must(message => message != null && message.Trim().Length >= MinMessageLength)
            .WithMessage($"Citattext måste vara minst {MinMessageLength} tecken efter borttagning av mellanslag.");
    }
}